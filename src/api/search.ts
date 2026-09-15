/**
 * 搜索索引的运行时加载 + Fuse.js 检索引擎。
 *
 * 索引由构建插件 emitFile 成独立资源（不是 public/ 里的静态文件，也不在主包里），
 * 所以这里按需 fetch，并且做一次进程内缓存 —— 同一会话里切换页面不会重复下载。
 *
 * ## 为什么 fuse.js 必须是 `import()`
 * fuse 的 dist 有 20+ kB。搜索弹窗本身只在用户按下 Ctrl+K / 点搜索按钮时才需要，
 * 用静态 `import` 会把它拖进 entry chunk —— 也就是**每个首页访客都要为它付费**。
 * 这里用 `await import('fuse.js')`，产物里 fuse 会是一个独立 chunk，
 * 只有真正打开搜索时才下载（验证手法见交付报告：读 `.map` 的 `sources`）。
 *
 * ## 为什么是「两趟检索」而不是一套带权重的 keys
 * 直觉方案是给一套 keys 配权重（title 0.7 / tags 0.2 / text 0.1），实测**行不通**：
 * Fuse 的 `threshold` 是对「多字段加权后的综合分」生效的，而权重低的字段一旦成为
 * 唯一的命中来源，综合分必然被抬到阈值之上。用 fuse.js 7.5.0 实测（三篇样本）：
 *
 *   | 配置 | 查询 | 结果 |
 *   |---|---|---|
 *   | 加权 keys + threshold 0.4 | `brotli`（只命中正文） | **空** |
 *   | 四键等权 + threshold 0.4 | `brotli` | `0.579` → **被阈值滤掉** |
 *   | 仅 text + threshold 0.3 | `brotli` | `0.113` ✓ |
 *
 * 也就是说：想同时（a）召回正文命中、且（b）让标题命中排在前面，单趟检索做不到。
 * 所以这里跑**两趟**：先 `title/tags/categories`（标题优先），再 `text` 补足，
 * 按 slug 去重、标题趟的结果永远在前。权重取舍就是「标题 > 标签 > 分类 > 正文」，
 * 而「标题命中排前面」不再依赖分数，而是由两趟的顺序**结构性地**保证。
 *
 * 另外两个必须开的选项：
 *   - `ignoreLocation: true`：Fuse 默认只在一个「前 60 字符左右」的窗口里找，
 *     正文索引有 800 字，关掉它等于只搜开头一段；
 *   - `includeMatches: true`：结果项要展示命中位置附近的片段，需要它给的 `indices`。
 */
import { SEARCH_INDEX_FILE } from '@/constants/blog';
import type { SearchIndexEntry } from '@/types/blog';
import {
  buildSnippet,
  headSnippet,
  resolveTextHitRange,
  type SearchMatchLike,
  type Snippet
} from '@/utils/search';

const SEARCH_INDEX_URL = `${import.meta.env.BASE_URL}${SEARCH_INDEX_FILE}`;

/** 结果上限：弹窗里能舒服扫读的量级，再多也没人往下看 */
const MAX_RESULTS = 8;

/** 一条搜索结果 */
export interface SearchResult {
  slug: string;
  title: string;
  tags: readonly string[];
  categories: readonly string[];
  /** 正文命中片段（标题命中时退化为正文开头） */
  snippet: Snippet;
}

/** Fuse 结果里我们真正用到的部分（结构类型，避免引入 fuse 的类型） */
interface FuseHitLike {
  item: SearchIndexEntry;
  matches?: readonly SearchMatchLike[];
}

interface SearchEngine {
  search(pattern: string): readonly FuseHitLike[];
}

let pending: Promise<SearchIndexEntry[]> | null = null;

export function loadSearchIndex(): Promise<SearchIndexEntry[]> {
  pending ??= fetch(SEARCH_INDEX_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error(`搜索索引加载失败：HTTP ${response.status}`);
      }
      return response.json() as Promise<SearchIndexEntry[]>;
    })
    .catch((error: unknown) => {
      // 失败要清掉缓存，否则一次网络抖动会把失败结果永久钉住
      pending = null;
      throw error;
    });

  return pending;
}

/** 已构建好的引擎；`null` 表示还没就绪（`searchPosts` 这时一律返回空数组） */
let engine: { title: SearchEngine; body: SearchEngine } | null = null;
let preparing: Promise<void> | null = null;

/**
 * 加载索引并构建引擎。**幂等**：重复调用只会下载 / 构建一次。
 * 失败时清掉缓存状态，让用户重开弹窗能重试。
 */
export function prepareSearch(): Promise<void> {
  preparing ??= (async () => {
    const [{ default: FuseConstructor }, entries] = await Promise.all([
      import('fuse.js'),
      loadSearchIndex()
    ]);

    engine = {
      title: new FuseConstructor(entries, {
        includeMatches: true,
        ignoreLocation: true,
        threshold: 0.4,
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'tags', weight: 0.2 },
          { name: 'categories', weight: 0.1 }
        ]
      }),
      body: new FuseConstructor(entries, {
        includeMatches: true,
        ignoreLocation: true,
        threshold: 0.3,
        keys: ['text']
      })
    };
  })().catch((error: unknown) => {
    preparing = null;
    engine = null;
    throw error;
  });

  return preparing;
}

/** 引擎是否已就绪（组件用它决定还要不要显示 loading） */
export function isSearchReady(): boolean {
  return engine !== null;
}

function toResult(hit: FuseHitLike): SearchResult {
  const { item } = hit;
  const range = resolveTextHitRange(hit.matches, 'text');

  return {
    slug: item.slug,
    title: item.title,
    tags: item.tags,
    categories: item.categories,
    snippet: range ? buildSnippet(item.text, range.index, range.length) : headSnippet(item.text)
  };
}

/**
 * **同步**检索（引擎未就绪时返回空数组）。
 *
 * 之所以是同步的：索引与引擎先用 `prepareSearch()` 备好，之后每次输入都只是一次
 * 纯计算 —— 配合输入防抖，不必为每条结果过一遍异步状态机。组件里的「loading 态」
 * 只属于「引擎还没就绪」这一段。
 */
export function searchPosts(query: string, limit: number = MAX_RESULTS): SearchResult[] {
  const pattern = query.trim();
  if (!engine || pattern.length === 0) return [];

  const primary = engine.title.search(pattern);
  const seen = new Set(primary.map(hit => hit.item.slug));
  const secondary = engine.body.search(pattern).filter(hit => !seen.has(hit.item.slug));

  return [...primary, ...secondary].slice(0, limit).map(toResult);
}
