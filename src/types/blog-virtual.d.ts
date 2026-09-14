/*
 * 虚拟模块的类型声明。
 *
 * 这两个模块由 plugins/vite-plugin-blog-content.ts 在构建期产出，
 * 运行时不落盘，所以需要在这里补环境声明，否则 `pnpm type-check` 会报找不到模块。
 */
declare module 'virtual:blog/posts' {
  import type { BlogPost } from '@/types/blog'

  /** 已排序：置顶权重降序，其次时间倒序 */
  export const posts: BlogPost[]
}

declare module 'virtual:blog/taxonomy' {
  import type { ArchiveYear, TaxonomyItem } from '@/types/blog'

  export const tags: TaxonomyItem[]
  export const categories: TaxonomyItem[]
  export const archives: ArchiveYear[]
}
