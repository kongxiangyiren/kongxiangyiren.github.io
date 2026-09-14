/**
 * 构建期博客内容插件。
 *
 * 职责：把 `content/posts/*.md` 编译成虚拟模块 + 若干独立资源文件。
 * **运行时零 Markdown 解析、零语法高亮**：页面拿到的 `html` 已经渲染完毕。
 *
 * 产出：
 *   - `virtual:blog/posts`        —— 全部文章的**元数据**（不含正文）
 *   - `virtual:blog/taxonomy`     —— 标签 / 分类 / 归档聚合
 *   - `blog-search-index.json`    —— 精简搜索索引（rollup asset）
 *   - `blog-posts/<slug>-<hash>.json` —— 每篇文章的正文 + TOC（rollup asset）
 *
 * 几个刻意的选择：
 *   0. **元数据与正文分离**：正文 HTML 单篇动辄几十 kB，若和元数据同处一个模块，
 *      首页光打开就得下载全站正文（50 篇会线性膨胀到几百 kB）。现在正文是
 *      「一篇一个带内容 hash 的文件」，列表页零成本，详情页只取自己那一篇，
 *      并且天然可配 `immutable` 长缓存。文件名的 hash 由我们自己对产物内容算，
 *      这样 dev 与 build 的 URL 完全一致（dev 靠 middleware 用同一套 URL 伺候）。
 *   1. frontmatter 用 gray-matter（YAML 引擎是 js-yaml）。无时区的时间戳会被
 *      js-yaml 按 UTC 解析成 Date，所以格式化时一律取 **UTC** 分量 —— 这样
 *      `2026-09-14 10:00:00` 原样还原，不会因构建机时区不同而漂移一天。
 *   2. Shiki 走 dual-theme + `defaultColor: false`：产物里**不写内联 color**，
 *      只写 `--shiki-light` / `--shiki-dark` 自定义属性。于是切主题只需要一条
 *      普通 CSS 规则，不需要 `!important`（内联样式没东西可压）。
 *   3. 语言按内容探测后动态加载，且必须在 `md.use()` 之前全部装好 ——
 *      @shikijs/markdown-it 在 setup 时就把已加载语言列表快照下来了。
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { fromHighlighter } from '@shikijs/markdown-it'
import { createHighlighter } from 'shiki'

import type { ServerResponse } from 'node:http'
import type { Token } from 'markdown-it'
import type { Plugin, ViteDevServer } from 'vite'

import {
  POST_BODY_DIR,
  SEARCH_INDEX_FILE,
  VIRTUAL_POSTS_MODULE,
  VIRTUAL_TAXONOMY_MODULE,
} from '../src/constants/blog.ts'
import { siteConfig } from '../src/config/site.ts'
import type {
  ArchiveMonth,
  ArchiveYear,
  BlogPostBody,
  BlogPostMeta,
  BlogPostPreview,
  BlogTaxonomy,
  SearchIndexEntry,
  TocItem,
  TaxonomyItem,
} from '../src/types/blog.ts'

export interface BlogContentPluginOptions {
  /** 相对项目根的内容目录 */
  dir?: string
}

const DEFAULT_CONTENT_DIR = 'content/posts'

/** 亮 / 暗双主题。改这两个名字时记得同步 src/styles/scss/markdown.scss 里的类名假设 */
const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const

/**
 * 常驻语言 —— 刻意保持极小。
 *
 * 真正决定加载哪些语法的是**内容本身**：buildContent 会先扫一遍所有 fence，
 * 再按需 loadLanguage()。这里只留几个高频项作为兜底（万一探测器漏掉某处，
 * 至少常见语言仍然是高亮的，不会退化成纯文本）。
 *
 * 一开始把五十多个语言都塞进来，构建里 1.4s 中的大部分都花在这 —— 而其中
 * 九十多个语法从未被用到。语言名的合法性已实测（未知名字走 PLAIN_TEXT 兜底）。
 */
const BASE_LANGS = ['text', 'ts', 'js', 'json', 'bash', 'html', 'css', 'vue', 'yaml', 'markdown']

/** 自动截取的摘要长度 */
const DESCRIPTION_LIMIT = 140
/** 搜索索引里每篇文章保留的纯文本长度 */
const SEARCH_TEXT_LIMIT = 800

/**
 * shiki 的「无语法」模式。
 *
 * 注意：'text' 是 shiki 的运行期特例（不加载任何语法，直接输出转义后的纯文本），
 * 但它**不在** BundledLanguage 联合类型里。所以这里不把它交给 shiki 的类型化选项
 * （defaultLanguage / fallbackLanguage），而是自己把 fence 的 info 归一化成它 ——
 * 语言可用性由我们探测，语义更明确，也免掉了一处类型断言。
 */
const PLAIN_TEXT = 'text'

const RESOLVED_POSTS = '\0' + VIRTUAL_POSTS_MODULE
const RESOLVED_TAXONOMY = '\0' + VIRTUAL_TAXONOMY_MODULE

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 剥掉 UTF-8 BOM，否则 frontmatter 的 `---` 不会被识别 */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/**
 * 统一成 `YYYY-MM-DD HH:mm:ss`（本地字面量语义，见文件头注释第 1 点）。
 * 无法识别的写法原样返回，保证构建不崩。
 */
function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return (
      `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())} ` +
      `${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(value.getUTCSeconds())}`
    )
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeDate(new Date(value))
  }
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return null
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
    if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]} 00:00:00`
    const full = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/.exec(raw)
    if (full) return `${full[1]} ${full[2]}:${full[3] ?? '00'}`
    return raw
  }
  return null
}

/** 数组 / 逗号分隔字符串 / 单值 都能接受；其余一律丢弃而不是崩 */
function toStringArray(value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }
  return []
}

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function toSticky(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

/** 标题 → 锚点 id。保留中文（HTML5 合法），重名追加序号，空标题兜底 section-N */
function slugifyHeading(text: string, index: number, used: Map<string, number>): string {
  let base = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    // 保留 Unicode 字母 / 数字（含 CJK）+ 连字符 + 下划线，其余（标点、emoji）丢掉
    .replace(/[^\p{L}\p{N}\-_]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!base) base = `section-${index + 1}`

  const seen = used.get(base) ?? 0
  used.set(base, seen + 1)
  return seen === 0 ? base : `${base}-${seen + 1}`
}

/** 取行内 token 的纯文本（去掉 `code` 反引号、链接语法等标记） */
function inlinePlainText(token: Token): string {
  if (!token.children || token.children.length === 0) return token.content.trim()
  return token.children
    .map((child) => (child.type === 'text' || child.type === 'code_inline' ? child.content : ''))
    .join('')
    .trim()
}

/** 中文 300 字/分钟、英文 200 词/分钟粗算 */
function measureReading(plainText: string): { wordCount: number; readingTime: number } {
  const cjkMatches = plainText.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)
  const cjkCount = cjkMatches ? cjkMatches.length : 0
  const latinPart = plainText.replace(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    ' ',
  )
  const latinMatches = latinPart.match(/[A-Za-z0-9][A-Za-z0-9'’_-]*/g)
  const latinCount = latinMatches ? latinMatches.length : 0

  const wordCount = cjkCount + latinCount

  return {
    wordCount,
    readingTime: Math.max(1, Math.ceil(cjkCount / 300 + latinCount / 200)),
  }
}

/**
 * 渲染后的 HTML → 纯文本。
 * 整段代码块直接丢弃（对摘要和搜索都是噪音），行内 code 只去标签保留内容。
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 序列化成可安全内联进 JS 模块的字面量（顺便挡掉 `</script>` 这类序列） */
function serialize(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/** 插进 HTML 属性 / 文本前的转义，避免站点配置里出现 & 或引号时破坏 index.html */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toPreview(post: BlogPostPreview): BlogPostPreview {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    updated: post.updated,
    tags: post.tags,
    categories: post.categories,
    cover: post.cover,
    description: post.description,
    sticky: post.sticky,
    readingTime: post.readingTime,
    wordCount: post.wordCount,
  }
}

// ---------------------------------------------------------------------------
// 聚合
// ---------------------------------------------------------------------------

function buildTaxonomy(posts: BlogPostPreview[]): BlogTaxonomy {
  const collect = (keyOf: (post: BlogPostPreview) => string[]): TaxonomyItem[] => {
    const buckets = new Map<string, BlogPostPreview[]>()
    for (const post of posts) {
      const preview = toPreview(post)
      for (const name of keyOf(post)) {
        const bucket = buckets.get(name)
        if (bucket) bucket.push(preview)
        else buckets.set(name, [preview])
      }
    }
    return [...buckets.entries()]
      .map(([name, items]) => ({ name, count: items.length, posts: items }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
  }

  const yearBuckets = new Map<number, Map<number, BlogPostPreview[]>>()
  for (const post of posts) {
    const year = Number(post.date.slice(0, 4))
    const month = Number(post.date.slice(5, 7))
    if (!Number.isFinite(year) || !Number.isFinite(month)) continue
    let months = yearBuckets.get(year)
    if (!months) {
      months = new Map()
      yearBuckets.set(year, months)
    }
    const bucket = months.get(month)
    const preview = toPreview(post)
    if (bucket) bucket.push(preview)
    else months.set(month, [preview])
  }

  const archives: ArchiveYear[] = [...yearBuckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => {
      const monthList: ArchiveMonth[] = [...months.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, items]) => ({ month, count: items.length, posts: items }))
      return {
        year,
        count: monthList.reduce((sum, item) => sum + item.count, 0),
        months: monthList,
      }
    })

  return {
    tags: collect((post) => post.tags),
    categories: collect((post) => post.categories),
    archives,
  }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

interface BuiltContent {
  /** 元数据（列表页消费），已按 置顶 → 时间 排好序 */
  posts: BlogPostMeta[]
  taxonomy: BlogTaxonomy
  searchIndex: SearchIndexEntry[]
  /** 每篇文章一个独立资源，build 时 emitFile，dev 时由 middleware 伺候 */
  bodies: PostBodyAsset[]
}

/** 渲染完但还没拆分成「元数据 + 正文资源」的中间态 */
interface RenderedPost extends BlogPostPreview {
  toc: TocItem[]
  html: string
}

/** 一篇正文资源：`fileName` 是相对站点根的路径（已含 hash），`source` 是 JSON 文本 */
interface PostBodyAsset {
  fileName: string
  source: string
}

/** 正文资源的文件名 hash 长度。8 位十六进制（32bit）对本场景足够，且文件名不至于太长 */
const BODY_HASH_LENGTH = 8

type BlogHighlighter = Awaited<ReturnType<typeof createHighlighter>>
type LoadableLanguage = Parameters<BlogHighlighter['loadLanguage']>[0]

let highlighterPromise: Promise<BlogHighlighter> | null = null

function getHighlighter(): Promise<BlogHighlighter> {
  // 单例：Shiki 内部有全局状态，重复 createHighlighter 会告警且浪费内存
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
      langs: BASE_LANGS,
    })
  }
  return highlighterPromise
}

/** 把内容里出现的语言全部装好 —— 必须在 md.use(fromHighlighter(...)) 之前完成 */
async function loadLanguages(langs: string[]): Promise<BlogHighlighter> {
  const highlighter = await getHighlighter()
  const loaded = new Set(highlighter.getLoadedLanguages())
  for (const lang of langs) {
    if (!lang || loaded.has(lang)) continue
    try {
      await highlighter.loadLanguage(lang as LoadableLanguage)
      loaded.add(lang)
    } catch {
      // 拼错的语言名 / 不存在的语言：交给 fallbackLanguage 渲染成纯文本
    }
  }
  return highlighter
}

function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort()
}

/** 从 fence token 的 info 里取语言名：```ts title="a" → ts */
function fenceLanguage(info: string): string {
  return info.trim().split(/\s+/)[0] ?? ''
}

async function buildContent(contentDir: string, base: string): Promise<BuiltContent> {
  const files = listMarkdownFiles(contentDir)
  const md = new MarkdownIt({ html: true, linkify: true })

  interface Pending {
    slug: string
    tokens: Token[]
    env: Record<string, unknown>
    toc: TocItem[]
    frontmatter: Record<string, unknown>
  }

  const pending: Pending[] = []
  const detectedLangs = new Set<string>()

  for (const file of files) {
    const slug = path.basename(file, path.extname(file))
    const raw = stripBom(fs.readFileSync(file, 'utf8'))

    let frontmatter: Record<string, unknown> = {}
    let body = raw
    try {
      const parsed = matter(raw)
      frontmatter = parsed.data as Record<string, unknown>
      body = parsed.content
    } catch (error) {
      // frontmatter 写坏了不能让整站构建失败：退化成「没有 frontmatter 的正文」
      console.warn(`[blog-content] frontmatter 解析失败，已忽略：${file}\n  ${String(error)}`)
    }

    // 这轮 parse 一次拿到三样东西：fence 语言（决定要加载哪些语法）、TOC（顺带写回
    // heading 的 id 属性）、以及后面渲染要用的 token。渲染放到语言全部加载完之后做。
    const env: Record<string, unknown> = {}
    const tokens = md.parse(body, env)

    const toc: TocItem[] = []
    const usedIds = new Map<string, number>()

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (!token) continue

      if (token.type === 'fence') {
        const lang = fenceLanguage(token.info)
        if (lang) detectedLangs.add(lang)
        continue
      }

      if (token.type !== 'heading_open') continue

      const level = Number(token.tag.slice(1))
      const inline = tokens[i + 1]
      // 只给 h2~h4 生成锚点并收进 TOC
      if (level < 2 || level > 4 || !inline || inline.type !== 'inline') continue

      const text = inlinePlainText(inline)
      const id = slugifyHeading(text, toc.length, usedIds)
      token.attrSet('id', id)
      toc.push({ id, text, level })
    }

    pending.push({ slug, tokens, env, toc, frontmatter })
  }

  const highlighter = await loadLanguages([...detectedLangs])
  const available = new Set(highlighter.getLoadedLanguages())

  // 归一化 fence 语言：加载不到的语言（拼错 / 不存在 / 留空）一律退化成无语法模式，
  // 保证构建和渲染都不会因为一个语言名而失败。
  for (const item of pending) {
    for (const token of item.tokens) {
      if (token.type !== 'fence') continue
      const lang = fenceLanguage(token.info)
      if (!lang || !available.has(lang)) token.info = PLAIN_TEXT
    }
  }

  md.use(
    fromHighlighter(highlighter, {
      themes: { light: SHIKI_THEMES.light, dark: SHIKI_THEMES.dark },
      // 关键：不写内联 color，只写 --shiki-light / --shiki-dark。
      // 于是暗色切换靠一条普通 CSS 规则即可，全站 0 个 !important。
      defaultColor: false,
    }),
  )

  const rendered: RenderedPost[] = pending.map((item) => {
    const html = md.renderer.render(item.tokens, md.options, item.env)
    const plainText = htmlToPlainText(html)
    const { wordCount, readingTime } = measureReading(plainText)
    const fm = item.frontmatter

    return {
      slug: item.slug,
      title: toOptionalString(fm.title) ?? item.slug,
      date: normalizeDate(fm.date) ?? '1970-01-01 00:00:00',
      updated: normalizeDate(fm.updated),
      tags: toStringArray(fm.tags),
      categories: toStringArray(fm.categories),
      cover: toOptionalString(fm.cover),
      description:
        toOptionalString(fm.description) ?? plainText.slice(0, DESCRIPTION_LIMIT).trim(),
      sticky: toSticky(fm.sticky),
      readingTime,
      wordCount,
      toc: item.toc,
      html,
    }
  })

  // 置顶优先，其次时间倒序（`YYYY-MM-DD HH:mm:ss` 定长格式可直接字面量比较）
  rendered.sort((a, b) => b.sticky - a.sticky || b.date.localeCompare(a.date))

  // -------------------------------------------------------------------------
  // 拆分：正文进独立资源（带内容 hash），元数据留在虚拟模块里
  // -------------------------------------------------------------------------
  const bodies: PostBodyAsset[] = []
  const posts: BlogPostMeta[] = rendered.map((post) => {
    const payload: BlogPostBody = { slug: post.slug, toc: post.toc, html: post.html }
    const source = JSON.stringify(payload)
    // 自己算 hash（而不是用 rollup 的 [hash]）：dev 与 build 的文件名才会一致，
    // 否则 dev 下的 bodyUrl 只能另起一套规则，页面/缓存策略会分成两套
    const hash = createHash('sha256').update(source).digest('hex').slice(0, BODY_HASH_LENGTH)
    const fileName = `${POST_BODY_DIR}/${post.slug}-${hash}.json`
    bodies.push({ fileName, source })

    return { ...toPreview(post), bodyUrl: `${base}${fileName}` }
  })

  const searchIndex: SearchIndexEntry[] = rendered.map((post) => ({
    slug: post.slug,
    title: post.title,
    tags: post.tags,
    categories: post.categories,
    text: htmlToPlainText(post.html).slice(0, SEARCH_TEXT_LIMIT),
  }))

  return { posts, taxonomy: buildTaxonomy(rendered), searchIndex, bodies }
}

// ---------------------------------------------------------------------------
// 插件
// ---------------------------------------------------------------------------

export function blogContent(options: BlogContentPluginOptions = {}): Plugin {
  const contentDirOption = options.dir ?? DEFAULT_CONTENT_DIR
  let contentDir = path.resolve(process.cwd(), contentDirOption)
  let isBuild = false
  let cache: BuiltContent | null = null

  /**
   * 站点部署前缀（`import.meta.env.BASE_URL` 的构建期对应物），带尾斜杠。
   *
   * 正文资源的 URL 必须是**绝对路径**：fetch 一个相对路径会跟着当前路由漂移
   * （详情页在 `/posts/xxx`，`blog-posts/a.json` 会解析成 `/posts/blog-posts/a.json`）。
   * 相对 base（`./`）没有安全的绝对形式，直接退回 `/`。
   */
  let base = '/'

  const getContent = async (): Promise<BuiltContent> => {
    if (!cache) cache = await buildContent(contentDir, base)
    return cache
  }

  const isContentMarkdown = (file: string): boolean => {
    if (!/\.md$/i.test(file)) return false
    // ctx.file 是 POSIX 风格，contentDir 是 Windows 风格，path.relative 能同时吃下
    const relative = path.relative(contentDir, file)
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  }

  /** 内容变更的唯一出口：清缓存 → 失效两个虚拟模块 → 整页刷新 */
  const refreshContent = (server: ViteDevServer): void => {
    cache = null
    for (const mod of server.moduleGraph.idToModuleMap.values()) {
      if (mod.id === RESOLVED_POSTS || mod.id === RESOLVED_TAXONOMY) {
        server.moduleGraph.invalidateModule(mod)
      }
    }
    server.ws.send({ type: 'full-reload' })
  }

  const sendJson = (res: ServerResponse, body: string): void => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(body)
  }

  /** 请求路径 → 正文资源。中文 slug 在 URL 里是百分号编码，这里容错解码后再比 */
  const matchBodyAsset = (pathname: string, bodies: PostBodyAsset[]): PostBodyAsset | undefined => {
    let decoded = pathname
    try {
      decoded = decodeURIComponent(pathname)
    } catch {
      // 含裸 `%` 的畸形路径：保持原样比较，不要抛 URIError
    }
    return bodies.find((body) => decoded.endsWith(`/${body.fileName}`))
  }

  return {
    name: 'blog:content',

    configResolved(config) {
      isBuild = config.command === 'build'
      contentDir = path.resolve(config.root, contentDirOption)
      base = config.base.startsWith('/')
        ? config.base.endsWith('/')
          ? config.base
          : `${config.base}/`
        : '/'
    },

    async buildStart() {
      if (!isBuild) return
      const { searchIndex, bodies } = await getContent()
      // 独立资源文件：不进 JS chunk、不落 public/，运行时按需 fetch
      this.emitFile({
        type: 'asset',
        fileName: SEARCH_INDEX_FILE,
        source: JSON.stringify(searchIndex),
      })
      // 每篇正文一个文件，文件名带内容 hash → 可以放心配 immutable 长缓存
      for (const body of bodies) {
        this.emitFile({ type: 'asset', fileName: body.fileName, source: body.source })
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_POSTS_MODULE) return RESOLVED_POSTS
      if (id === VIRTUAL_TAXONOMY_MODULE) return RESOLVED_TAXONOMY
      return null
    },

    async load(id) {
      if (id === RESOLVED_POSTS) {
        const { posts } = await getContent()
        return `export const posts = ${serialize(posts)}\n`
      }
      if (id === RESOLVED_TAXONOMY) {
        const { taxonomy } = await getContent()
        return (
          `export const tags = ${serialize(taxonomy.tags)}\n` +
          `export const categories = ${serialize(taxonomy.categories)}\n` +
          `export const archives = ${serialize(taxonomy.archives)}\n`
        )
      }
      return null
    },

    /**
     * index.html 的标题与描述也从 site config 注入。
     * 纯 SPA 的静态 HTML 没法 import TS，但构建期可以 —— 这样站点名只有一个来源，
     * 不会出现「改了 site.ts 忘了改 index.html」。SOURCE 里留空标签是刻意的。
     */
    transformIndexHtml(html) {
      return html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(siteConfig.title)}</title>`)
        .replace(
          /(<meta\s+name="description"\s+content=")[\s\S]*?(")/,
          `$1${escapeHtml(siteConfig.description)}$2`,
        )
    },

    /**
     * 开发期直接吐搜索索引与正文资源，保证 dev 与 build 行为一致
     * （都是「按一个 URL fetch 一份 JSON」，URL 也完全一致 —— 因为 hash 是我们自己算的）。
     */
    configureServer(server) {
      /*
       * Vite 8 只在 `type === 'update'` 时调用 handleHotUpdate —— 新建 / 删除文件
       * 走的是 onFileAddUnlink → onHMRUpdate('create' | 'delete')，那条路径不会
       * 调用这个（已标记为将来会被 hotUpdate 取代的）钩子。
       * 而「新建一篇文章」恰恰是写博客最高频的操作，所以这里自己补上 add/unlink。
       */
      const onAddUnlink = (file: string): void => {
        if (isContentMarkdown(file)) refreshContent(server)
      }
      server.watcher.on('add', onAddUnlink)
      server.watcher.on('unlink', onAddUnlink)

      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()
        const pathname = req.url.split('?')[0] ?? ''

        if (pathname.endsWith(`/${SEARCH_INDEX_FILE}`)) {
          getContent()
            .then(({ searchIndex }) => sendJson(res, JSON.stringify(searchIndex)))
            .catch(next)
          return
        }

        // 正文资源：dev 下没有 emitFile 的产物，只能在这里按同一套 URL 伺候
        if (!pathname.includes(`/${POST_BODY_DIR}/`)) return next()
        getContent()
          .then(({ bodies }) => {
            const asset = matchBodyAsset(pathname, bodies)
            if (asset) sendJson(res, asset.source)
            else next()
          })
          .catch(next)
      })
    },

    /**
     * 内容**修改**时触发（create / delete 见 configureServer 里的 watcher 监听）。
     *
     * 为什么用 full-reload 而不是保留状态的 HMR：这两个模块 id 带 `\0` 前缀，
     * 不在 Vite 的文件图里，走标准 HMR 传播不可靠；而且 Vite 8 对「无匹配模块」
     * 的非 HTML 文件不会自动刷新（只打一句 [no modules matched]），所以这次
     * ws.send 是必需的，不会和框架的默认行为重复。
     */
    handleHotUpdate(ctx) {
      if (!isContentMarkdown(ctx.file)) return
      refreshContent(ctx.server)
      return []
    },
  }
}

export default blogContent
