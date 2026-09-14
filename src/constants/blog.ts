/**
 * 构建期与运行时共用的常量。
 *
 * 放在 src/ 下而不是插件里，是为了让「产出方」（plugins/vite-plugin-blog-content.ts）
 * 与「消费方」（src/api/search.ts）引用同一个字面量，避免产物文件名漂移。
 */

/** 搜索索引产物文件名（相对站点根）。构建期由插件 emitFile 输出，运行时 fetch */
export const SEARCH_INDEX_FILE = 'blog-search-index.json'

/** 虚拟模块 id —— 与插件里的声明必须一致 */
export const VIRTUAL_POSTS_MODULE = 'virtual:blog/posts'
export const VIRTUAL_TAXONOMY_MODULE = 'virtual:blog/taxonomy'
