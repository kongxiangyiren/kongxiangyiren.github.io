/**
 * 站点级元文件：`rss.xml` / `sitemap.xml` / `robots.txt`。
 *
 * ## 为什么三者一起做
 * 它们是同一类东西 —— **构建期产出、运行时只被读、不参与客户端 JS** 的站点级文件，
 * 并且共用同一套 URL 生成逻辑（`@/utils/absolute-url` 的 `joinAbsoluteUrl`）。
 * 分开做要各自重写一遍转义、绝对地址拼接与「dev 也要能访问」的管道。
 *
 * ## 与页面 canonical 的一致性
 * `sitemap.xml` 里的 `<loc>` 必须与页面上 `rel="canonical"`（`useSeo.ts` → `absoluteUrl()`）
 * **逐字相同**，否则等于主动向搜索引擎提交一批「非规范地址」。所以这里不复用任何页面代码，
 * 而是复用**同一个编码实现**（`encodePath` / `joinAbsoluteUrl`）。
 *
 * ## 路由清单为什么不让本文件自己算
 * `buildPrerenderRoutes()`（在 `vite-plugin-blog-content.ts` 里）已经是「站内可索引页面」
 * 的单一真相来源。本文件通过入参接收它，而不是再算一遍 —— 两份路由清单一旦漂移，
 * 就会出现「预渲染了但 sitemap 漏了」这类**不报错**的偏差。
 *
 * ## ⚠️ 加载环境约束
 * 本文件在 `vite.config.ts` 的 import 链里被加载，Vite 用**配置打包器**处理这条链
 * （实测 Vite 8 的 `bundleConfigFile` 传的是 `tsconfig: false`）⇒ **不能写 `@/...` 别名**，
 * 只能写相对路径 + `.ts` 后缀。因此 `src/` 下那些 import 了别名的模块
 * （如 `utils/url.ts`）在这里**不能用**，`utils/absolute-url.ts` 正是为此而存在（零 import）。
 */
import { siteConfig } from '../src/config/site.ts';
import { FEED_ITEM_LIMIT, ROBOTS_FILE, RSS_FILE, SITEMAP_FILE } from '../src/constants/blog.ts';
import { joinAbsoluteUrl } from '../src/utils/absolute-url.ts';
import { formatPostDate, toRfc822 } from '../src/utils/date.ts';

import type { BlogPostMeta } from '../src/types/blog.ts';

/** 本站只有中文一种语言（不做 i18n 是已确认的范围外），与 `index.html` 的 `lang="zh-CN"` 对齐 */
const FEED_LANGUAGE = 'zh-CN';

/** feed 里标识产出软件。RSS 的 `<generator>` 是可选元素，这里给一个诚实的最小值 */
const FEED_GENERATOR = 'blog (Vite static build)';

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

export interface SiteFilesInput {
  /** 部署前缀（Vite 的 `base`，形如 `/` 或 `/blog/`）。构建期从 `configResolved` 拿 */
  base: string;
  /**
   * 可索引路径清单 —— **必须**是 `buildPrerenderRoutes()` 的返回值（预渲染共用同一份）。
   * 本文件负责剔除 `/404.html` 并把两个总览页规范化成 canonical 形态（见下）。
   */
  routes: readonly string[];
  posts: readonly BlogPostMeta[];
  /** RSS 的 `<lastBuildDate>`。由调用方注入，便于测试固定 */
  builtAt: Date;
}

export interface SiteFile {
  /** 相对站点根的产物路径（同时也是 URL，与 `src/constants/blog.ts` 里的常量同源） */
  fileName: string;
  source: string;
  /** dev middleware 直接拿它当 `Content-Type`，保证与 build 产物语义一致 */
  contentType: string;
}

// ---------------------------------------------------------------------------
// 转义
// ---------------------------------------------------------------------------

/**
 * 剔除 XML 1.0 里**不允许出现**的字符。
 *
 * XML 1.0 的 `Char` 产生式只允许：`#x9` / `#xA` / `#xD` / `[#x20-#xD7FF]` /
 * `[#xE000-#xFFFD]` / `[#x10000-#x10FFFF]` —— 其余（C0 控制符、`#xFFFE`/`#xFFFF`
 * 这类非字符）出现在文档里就是**不合法的 XML**。
 *
 * 为什么连这个都要处理：`description` 可能是从正文自动截取的，正文里混进一个
 * `\u0000` 这类字符就会让整份 feed 解析失败 —— 而解析器通常只报「Invalid byte」，
 * 不告诉你是哪一篇。
 *
 * 按码点逐个判断（而不是写一条含控制字符的字符类正则）：一来可读，二来
 * `no-control-regex` 这类 lint 规则会把正则字面量里的控制字符当成笔误。
 */
function stripInvalidXmlChars(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    const valid =
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0d ||
      (code >= 0x20 && code <= 0xd7ff) ||
      (code >= 0xe000 && code <= 0xfffd) ||
      code >= 0x10000;
    if (valid) out += char;
  }
  return out;
}

/**
 * XML 文本 / 属性值转义。**所有**插进 XML 的文本值都必须过这一道。
 *
 * ⚠️ 只转 `&` 与 `<` 是不够的：`"` / `'` 出现在**属性值**里同样会截断属性
 * （例：`href="a"b"`），`>` 虽非必须但转掉更安全、也更符合直觉。
 * `&` 必须最先替换，否则会把后面替换出来的实体再转一遍。
 */
export function escapeXml(value: string): string {
  return stripInvalidXmlChars(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------------------
// rss.xml
// ---------------------------------------------------------------------------

/**
 * feed 里的文章顺序：**纯日期倒序**，不沿用 `posts` 数组的「置顶优先」顺序。
 *
 * 理由：`sticky` 是**站内列表页**的编辑手段（让人为地把某篇顶上去），而 feed 的读者
 * 是「按发布时间聚合」的软件 —— 置顶会让某篇旧文的 `pubDate` 比它前面的条目还早，
 * 绝大多数阅读器会按收到的顺序 + `pubDate` 展示，出现「时间倒着走」的观感。
 * 首页列表要的是「编辑推荐」，feed 要的是「最新发布」，两者本就该不同。
 */
function feedPosts(posts: readonly BlogPostMeta[]): BlogPostMeta[] {
  return [...posts]
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
    .slice(0, FEED_ITEM_LIMIT);
}

/**
 * 条目的 `<category>`：标签 + 分类。
 *
 * 去重是必要的 —— 内容里 `前端` 既是标签又是分类（实测三篇里就有），
 * 不去重会输出两条一模一样的 `<category>前端</category>`。
 */
function itemCategories(post: BlogPostMeta): string[] {
  return [...new Set([...post.tags, ...post.categories])];
}

function buildRss(input: SiteFilesInput): string {
  const context = { origin: siteConfig.url, base: input.base };
  const siteUrl = joinAbsoluteUrl('/', context);
  const selfUrl = joinAbsoluteUrl(`/${RSS_FILE}`, context);

  const lines = [
    XML_DECLARATION,
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(siteConfig.title)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml(siteConfig.description)}</description>`,
    `    <language>${FEED_LANGUAGE}</language>`,
    `    <lastBuildDate>${input.builtAt.toUTCString()}</lastBuildDate>`,
    `    <generator>${escapeXml(FEED_GENERATOR)}</generator>`,
    // 标准推荐（RFC 5005 / feedvalidator）：在 feed 里声明自己的绝对地址
    `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>`
  ];

  for (const post of feedPosts(input.posts)) {
    const url = joinAbsoluteUrl(`/posts/${post.slug}`, context);
    const pubDate = toRfc822(post.date);

    lines.push('    <item>');
    lines.push(`      <title>${escapeXml(post.title)}</title>`);
    lines.push(`      <link>${escapeXml(url)}</link>`);
    lines.push(`      <guid isPermaLink="true">${escapeXml(url)}</guid>`);
    /*
     * `<pubDate>` 在 RSS 2.0 里是可选元素。frontmatter 的日期写法无法识别时
     * （`normalizeDate` 对认不出的写法会原样透传），`toRfc822` 返回空串 ——
     * 这时**宁可不输出**这个元素，也不要输出 `<pubDate></pubDate>`（那是非法值）。
     */
    if (pubDate) lines.push(`      <pubDate>${pubDate}</pubDate>`);
    lines.push(`      <description>${escapeXml(post.description)}</description>`);
    for (const name of itemCategories(post)) {
      lines.push(`      <category>${escapeXml(name)}</category>`);
    }
    lines.push('    </item>');
  }

  lines.push('  </channel>', '</rss>', '');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

/**
 * 预渲染清单里少数几条要改写成 **canonical 形态** 的路径。
 *
 * 标签 / 分类的总览页在预渲染清单里是 `/tags`（对齐站内导航链接），
 * 而 `useSeo.ts` 给它们的 canonical 是 `/tags/`（带尾斜杠，对齐目录式产物 `tags/index.html`）。
 * sitemap 提交的地址必须与 canonical 一致，所以这里做一次显式映射 ——
 * **不是**第二份路由清单，只是两条路径的规范化。
 */
const CANONICAL_OVERRIDES: Record<string, string> = {
  '/tags': '/tags/',
  '/categories': '/categories/'
};

function sitemapPaths(routes: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const route of routes) {
    // `/404.html` 是给 nginx `error_page 404 /404.html` 用的产物（它返回 200，是个能被抓到的
    // 真实文件），但它是**错误页**、不是可索引页面 —— 提交它只会让搜索结果里出现一份 404。
    if (route === '/404.html') continue;

    const path = CANONICAL_OVERRIDES[route] ?? route;
    if (seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }

  return out;
}

function buildSitemap(input: SiteFilesInput): string {
  const context = { origin: siteConfig.url, base: input.base };

  /*
   * 文章页的 `<lastmod>`：`updated ?? date`，取到**天**（`YYYY-MM-DD`）。
   * 选日期而非完整 ISO 的理由：lastmod 表达的是「内容最后改动的时刻」，
   * 而内容层的改动粒度就是天（`updated` 在 frontmatter 里本来就是 `YYYY-MM-DD`）；
   * 另外非文章页**不给** `<lastmod>` —— 那只能填构建时间，会让每次构建都产生差异，
   * 而「仓库里同一份内容构建出同一份 sitemap」对排查问题很有价值。
   */
  const lastmodByPath = new Map<string, string>();
  for (const post of input.posts) {
    lastmodByPath.set(`/posts/${post.slug}`, formatPostDate(post.updated ?? post.date));
  }

  const lines = [XML_DECLARATION, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

  for (const path of sitemapPaths(input.routes)) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(joinAbsoluteUrl(path, context))}</loc>`);
    const lastmod = lastmodByPath.get(path);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>', '');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

function buildRobots(input: SiteFilesInput): string {
  const lines = ['User-agent: *', 'Allow: /'];

  /*
   * 只排除 `/404.html`。这是唯一一个「是真实文件、能被抓取、但绝不该被收录」的路径
   * （`src/entry-server.ts` 刻意让它返回 200，否则 nginx 的 `error_page` 会套娃）。
   *
   * 刻意**不**排除 `/blog-posts/*.json` 与 `blog-search-index.json`：
   *   1. 它们不被任何 `<a href>` 链接，爬虫本来就不会发现
   *   2. 详情页正文是**服务端渲染进 HTML** 的，Google 渲染时不需要再取这些 JSON；
   *      但万一将来改成客户端取正文，`Disallow` 反而会把正文挡在渲染之外 ——
   *      这个风险的代价远高于「浪费一点抓取预算」
   */
  if (input.routes.includes('/404.html')) lines.push('Disallow: /404.html');

  /*
   * `siteConfig.url` 未配置（空串）时**整行省略**：`absoluteUrl` 会降级成根相对路径，
   * 而 robots 的 Sitemap 行按规范只能是绝对地址 —— 输出 `Sitemap: /sitemap.xml`
   * 是无效指令，输出 `undefined/...` 更糟。宁可少一行。
   */
  const sitemapUrl = joinAbsoluteUrl(`/${SITEMAP_FILE}`, {
    origin: siteConfig.url,
    base: input.base
  });
  if (/^https?:\/\//i.test(sitemapUrl)) {
    lines.push('', `Sitemap: ${sitemapUrl}`);
  }

  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 出口
// ---------------------------------------------------------------------------

/**
 * 产出三个站点级元文件。**build 与 dev 都用这一个函数** ——
 * 两个环境各写一份生成逻辑，就必然出现「dev 看着对、线上不一样」。
 */
export function buildSiteFiles(input: SiteFilesInput): SiteFile[] {
  return [
    {
      fileName: RSS_FILE,
      source: buildRss(input),
      contentType: 'application/rss+xml; charset=utf-8'
    },
    {
      fileName: SITEMAP_FILE,
      source: buildSitemap(input),
      contentType: 'application/xml; charset=utf-8'
    },
    {
      fileName: ROBOTS_FILE,
      source: buildRobots(input),
      contentType: 'text/plain; charset=utf-8'
    }
  ];
}
