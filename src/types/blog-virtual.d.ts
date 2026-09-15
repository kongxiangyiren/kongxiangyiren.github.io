/*
 * 虚拟模块的类型声明。
 *
 * 这两个模块由 plugins/vite-plugin-blog-content.ts 在构建期产出，
 * 运行时不落盘，所以需要在这里补环境声明，否则 `pnpm type-check` 会报找不到模块。
 */
declare module 'virtual:blog/posts' {
  import type { BlogPostMeta } from '@/types/blog';

  /**
   * 已排序：置顶权重降序，其次时间倒序。
   * 只有元数据（含 bodyUrl）—— 正文在独立的 `blog-posts/*.json` 资源里。
   */
  export const posts: BlogPostMeta[];
}

declare module 'virtual:blog/taxonomy' {
  import type { ArchiveYear, TaxonomyItem } from '@/types/blog';

  export const tags: TaxonomyItem[];
  export const categories: TaxonomyItem[];
  export const archives: ArchiveYear[];
}

/**
 * slug → 正文（HTML + TOC）。
 *
 * **只给服务端用**：预渲染时 Node 里没有站点 base URL，fetch 相对路径会失败，所以
 * 正文直接从构建期数据取（见 `src/api/post.ts`）。消费方是动态 import，所以它不会进
 * 浏览器包 —— 客户端仍然只拿得到元数据 + 按篇 fetch 的正文资源。
 */
declare module 'virtual:blog/post-bodies' {
  import type { BlogPostBody } from '@/types/blog';

  export const postBodies: Record<string, BlogPostBody>;
}
