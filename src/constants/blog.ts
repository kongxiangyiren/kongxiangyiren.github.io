/**
 * 构建期与运行时共用的常量。
 *
 * 放在 src/ 下而不是插件里，是为了让「产出方」（plugins/vite-plugin-blog-content.ts）
 * 与「消费方」（src/api/search.ts）引用同一个字面量，避免产物文件名漂移。
 */

/** 搜索索引产物文件名（相对站点根）。构建期由插件 emitFile 输出，运行时 fetch */
export const SEARCH_INDEX_FILE = 'blog-search-index.json';

/**
 * 站点级元文件的产物文件名（相对站点根）。
 *
 * 与搜索索引同理：放在 src/ 下，让「产出方」（plugins/vite-plugin-blog-content.ts）
 * 与「消费方」（页脚 / 关于页的 RSS 链接、以及将来的部署脚本）引用同一个字面量。
 * 文件名本身就是 URL —— 页脚那个 `href: '/rss.xml'` 一度是死链，就是因为产出侧没有
 * 对应的常量、也没人核对两端。
 */
export const RSS_FILE = 'rss.xml';
export const SITEMAP_FILE = 'sitemap.xml';
export const ROBOTS_FILE = 'robots.txt';

/**
 * RSS feed 的条目上限。
 *
 * 刻意封顶：feed 全量输出会随文章数线性膨胀（50 篇 × 每篇几 kB 摘要），而 feed 读者
 * 只关心最近发布的内容。取 20 是常见惯例（Hexo 默认也是 20）。
 */
export const FEED_ITEM_LIMIT = 20;

/**
 * 单篇正文资源的输出目录（相对站点根，且**不含** BASE_URL）。
 *
 * 正文不再塞进 `virtual:blog/posts`，而是每篇一个独立 asset：
 * `blog-posts/<slug>-<内容hash8>.json`。带内容 hash 才能对这些文件下发
 * `immutable` 长缓存；文件里的具体 URL 由构建插件算好写进元数据（bodyUrl）。
 */
export const POST_BODY_DIR = 'blog-posts';

/** 虚拟模块 id —— 与插件里的声明必须一致 */
export const VIRTUAL_POSTS_MODULE = 'virtual:blog/posts';
export const VIRTUAL_TAXONOMY_MODULE = 'virtual:blog/taxonomy';

/**
 * `slug → 正文` 的虚拟模块。
 *
 * **只给服务端用**（预渲染时取正文），消费方用的是动态 import，所以它不会进浏览器包。
 * 理由见 `src/api/post.ts`：Node 里没有站点 base URL，fetch 相对路径会失败。
 */
export const VIRTUAL_POST_BODIES_MODULE = 'virtual:blog/post-bodies';
