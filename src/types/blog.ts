/*
 * 博客内容层的数据契约。
 *
 * 这个文件是「构建期插件」与「运行时页面」之间唯一的真相来源：
 *   - plugins/vite-plugin-blog-content.ts 按这里的形状产出虚拟模块
 *   - src/pages/** 按这里的形状消费
 *
 * 只放类型（不 import 任何运行时依赖），这样被构建插件引用时不会把
 * markdown-it / shiki 之类的重依赖带进配置加载链路。
 */

/** 文章目录项，供详情页目录（TOC）使用 */
export interface TocItem {
  /** 已经 slug 化、且保证同文档内唯一的标题 id */
  id: string;
  /** 标题纯文本（已剥离行内 markdown 标记） */
  text: string;
  /** 2 | 3 | 4 */
  level: number;
}

/**
 * 列表 / 聚合场景用的文章摘要。
 *
 * 刻意**不含** `html` 与 `toc`：标签页、分类页、归档页会把同一篇文章挂到多个
 * 聚合项下，若聚合项里带渲染好的 HTML，同一篇文章的 HTML 会在模块里重复多份。
 */
export interface BlogPostPreview {
  /** 由文件名派生，详情页路由参数，如 `vue3-reactivity-internals` */
  slug: string;
  title: string;
  /** `YYYY-MM-DD HH:mm:ss`，与原 frontmatter 的字面量一致（无时区漂移） */
  date: string;
  /** 无 updated 时为 null */
  updated: string | null;
  tags: string[];
  categories: string[];
  cover: string | null;
  /** frontmatter 未提供时，从正文自动截取 */
  description: string;
  /** 置顶权重，越大越靠前；缺省 0 */
  sticky: number;
  /** 阅读时长（分钟，向上取整，最小 1） */
  readingTime: number;
  /** 中文字符数 + 英文单词数 */
  wordCount: number;
}

/**
 * 列表页拿到的文章元数据 —— `virtual:blog/posts` 导出的就是它。
 *
 * **不含** `html` / `toc`：正文体积不该拖累任何列表页。正文在独立资源里，
 * 用下面这个由构建插件算好的 URL 去取（页面不要自己拼路径）。
 */
export interface BlogPostMeta extends BlogPostPreview {
  /**
   * 正文资源 URL（已含 `import.meta.env.BASE_URL`）。
   * 形如 `/blog-posts/vue3-reactivity-internals-1a2b3c4d.json`，文件名带内容 hash，
   * 所以可以配 `immutable` 长缓存。由 plugins/vite-plugin-blog-content.ts 计算。
   */
  bodyUrl: string;
}

/** 单篇正文资源的内容形状（构建期 emit 的 JSON，运行时按需 fetch） */
export interface BlogPostBody {
  slug: string;
  toc: TocItem[];
  /** 构建期由 markdown-it + Shiki 渲染好的 HTML，运行时零解析 */
  html: string;
}

/** 元数据 + 正文：详情页最终拿到的完整文章 */
export type BlogPost = BlogPostMeta & BlogPostBody;

/** 标签 / 分类聚合项 */
export interface TaxonomyItem {
  name: string;
  count: number;
  /** 已按全站文章顺序（置顶优先，其次时间倒序）排好 */
  posts: BlogPostPreview[];
}

/** 归档：按年 → 月分组 */
export interface ArchiveMonth {
  /** 1 - 12 */
  month: number;
  count: number;
  posts: BlogPostPreview[];
}

export interface ArchiveYear {
  year: number;
  count: number;
  months: ArchiveMonth[];
}

export interface BlogTaxonomy {
  tags: TaxonomyItem[];
  categories: TaxonomyItem[];
  archives: ArchiveYear[];
}

/** 构建期产出的精简搜索索引条目（独立 JSON 文件，运行时按需 fetch） */
export interface SearchIndexEntry {
  slug: string;
  title: string;
  tags: string[];
  categories: string[];
  /** 纯文本正文片段 */
  text: string;
}
