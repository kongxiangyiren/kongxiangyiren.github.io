/**
 * 全站**唯一**的 SEO 入口（unhead）：
 * `<title>` / `<meta name="description">` / Open Graph / Twitter Card / `rel="canonical"` / JSON-LD。
 *
 * 为什么集中在这里而不是各页面自己 useHead：
 *   1. 这些标签**必须**在预渲染时进 HTML —— 微信 / Twitter / Facebook 的抓取器**都不执行 JS**，
 *      客户端写 `document.title` 在 Node 里根本不存在。这正是当初选「预渲染」而不是
 *      「只做客户端 meta」的全部理由，所以只能走 head 管理器（unhead）。
 *   2. 判定依据全部能从「当前路由 + 构建期文章元数据」推出来（纯派生，无需等待异步数据），
 *      所以放在 App.vue 一处求值，客户端/服务端结果必然一致，不存在优先级打架或写两份的问题。
 *      （将来某页要自定标题，优先走 `definePage({ meta: { title } })`，仍由这里统一消费。）
 *
 * 站点名后缀与旧 `router.afterEach` 的格式逐字一致（`标题 - 站点名`），不改变用户观感。
 * 但 `og:title` / `twitter:title` **不带**后缀：卡片上紧挨着就会显示域名，再挂一次站点名
 * 是重复信息 —— 站点名交给 `og:site_name`（这才是 OG 协议里放站点名的字段）。
 *
 * ## 各页策略
 *
 * | 页面                      | og:type   | canonical / og:url | og:image                       |
 * |---------------------------|-----------|--------------------|--------------------------------|
 * | 首页                      | `website` | 站点根             | `siteConfig.ogImage`           |
 * | 文章详情                  | `article` | 该文章             | 封面（位图）优先，否则 ogImage |
 * | 标签 / 分类（总览与详情） | `website` | 该页               | `siteConfig.ogImage`           |
 * | 归档 / 关于 / 友链        | `website` | 该页               | `siteConfig.ogImage`           |
 * | 404、以及「文章不存在」   | 整套 canonical / og / twitter / JSON-LD **全不输出** |
 *
 * ## 为什么「无图」时不输出一个空 `og:image`
 * 抓取器拿到坏地址会**整张卡片没图**，比不声明更糟（不声明时平台还能自己决定怎么排）。
 * 所以 `siteConfig.ogImage` 留空 ⇒ 整套 `og:image` 不输出，`twitter:card` 同步降级为 `summary`。
 */
import { useHead } from '@unhead/vue';
import { useRoute } from 'vue-router';
import { posts } from 'virtual:blog/posts';

import { siteConfig } from '@/config/site';
import { toIso8601 } from '@/utils/date';
import { routeParam } from '@/utils/route';
import { absoluteUrl } from '@/utils/url';

// 用 unhead 的**标签形态**类型（`Meta` / `Link` / `Script`），不是 `MetaFlat`：
// `MetaFlat` 是 `useSeoMeta` 的扁平键值形态（`ogTitle: '...'`），与这里的
// `<meta property="og:title">` 数组形态不是一回事
import type { Link, Meta, Script } from '@unhead/vue';
import type { BlogPostMeta } from '@/types/blog';

/**
 * 静态页对照表：路由名 → 标题与 canonical 路径。
 *
 * `path: null` 表示**该页没有唯一规范地址**，整套可索引标签都不输出。
 * 通配兜底页 `[...all]` 服务**所有**未知路径（nginx 的 `error_page 404 /404.html` 只推一份
 * 静态产物），它那份产物的 `route` 永远是 `/404.html`，与访客真实地址无关 ⇒ 给它 canonical
 * 只会把别的 URL 指错，所以这里必须是 null。
 *
 * ⚠️ 总览页的路由名带尾斜杠（文件路由 `tags/index.vue`），详情页是 `tags/[name]`，两者的
 * canonical 必须分开，否则某个标签的 canonical 会撞成标签总览。
 */
const STATIC_PAGES: Record<string, { title: string; path: string | null }> = {
  '/': { title: '', path: '/' },
  '/archives': { title: '归档', path: '/archives' },
  '/tags/': { title: '标签', path: '/tags/' },
  '/categories/': { title: '分类', path: '/categories/' },
  '/about': { title: '关于', path: '/about' },
  '/friends': { title: '友链', path: '/friends' },
  '/[...all]': { title: '页面不存在', path: null }
};

/** `og:locale`。本站只有中文一种语言（不做 i18n 是已确认的范围外），写死即可 */
const OG_LOCALE = 'zh_CN';

/**
 * 默认分享图（`siteConfig.ogImage`）的尺寸契约，必须与 `public/images/og-default.png`
 * 的实际像素一致 —— 元数据与图片不符会被抓取器判为无效图。
 *
 * ⚠️ 只对**我们自己的**这张图声明宽高：文章封面尺寸不受控（内容层只登记一个路径），
 * 给它硬套 1200×630 就是在声明假数据。
 */
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

/**
 * 抓取器认得的位图扩展名。
 *
 * Twitter / Facebook / 微信**都不解析 SVG**（拿不到像素就整张卡片没图），所以封面是 svg 时
 * 宁可退回站点默认图，也不交一个必然抓不到图的地址。当前内容层 3 篇的封面恰好都是 svg。
 */
const RASTER_IMAGE_RE = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i;

interface SeoImage {
  url: string;
  alt: string;
  /** 仅当尺寸已知且受我们控制时才有值 */
  width?: number;
  height?: number;
}

interface SeoContext {
  /** **不带**站点名后缀 —— `og:title` / `twitter:title` 用 */
  headline: string;
  /** 带 `标题 - 站点名` 后缀 —— `<title>` 用 */
  title: string;
  description: string;
  /** 规范化站内路径。**空串 = 该页不输出 canonical / og / twitter / JSON-LD** */
  path: string;
  ogType: 'website' | 'article';
  image: SeoImage | null;
  jsonLd: Record<string, unknown> | null;
}

/** typed routes 下 `route.params` 是所有路由参数的联合类型，用 unknown 收口后再取键 */
function readParam(params: unknown, key: string): string {
  if (typeof params !== 'object' || params === null) return '';
  return routeParam((params as Record<string, unknown>)[key]);
}

function findPost(params: unknown): BlogPostMeta | null {
  const slug = readParam(params, 'slug');
  return posts.find(item => item.slug === slug) ?? null;
}

function withSiteName(title: string): string {
  return title ? `${title} - ${siteConfig.title}` : siteConfig.title;
}

/** 站点默认分享图。`siteConfig.ogImage` 留空 ⇒ null（整套 og:image 不输出） */
function defaultImage(): SeoImage | null {
  const path = siteConfig.ogImage.trim();
  if (!path) return null;

  return {
    url: absoluteUrl(path),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: `${siteConfig.title}：${siteConfig.subtitle}`
  };
}

/** 文章分享图：封面优先（**只认位图**），否则退回站点默认图 */
function postImage(post: BlogPostMeta): SeoImage | null {
  const cover = post.cover?.trim() ?? '';
  if (!cover || !RASTER_IMAGE_RE.test(cover)) return defaultImage();

  return { url: absoluteUrl(cover), alt: `《${post.title}》的封面图` };
}

/**
 * 「不可索引」页面（404、文章不存在）：整套 canonical / og / twitter / JSON-LD 都不输出。
 *
 * 保留 `<title>` 与 `description` —— 它们是页面级文案，与「要不要被收录」无关；而 canonical
 * 是**认领规范地址**的声明，这些页面根本没有唯一地址，输出它等于把错的 URL 指给别人。
 */
function notIndexable(titlePart: string): SeoContext {
  return {
    headline: titlePart || siteConfig.title,
    title: withSiteName(titlePart),
    description: siteConfig.description,
    path: '',
    ogType: 'website',
    image: null,
    jsonLd: null
  };
}

/** 聚合 / 静态页（og:type 恒为 website、图恒用站点默认图、无 JSON-LD） */
function plainPage(headline: string, path: string): SeoContext {
  return {
    headline: headline || siteConfig.title,
    title: withSiteName(headline),
    description: siteConfig.description,
    path,
    ogType: 'website',
    image: defaultImage(),
    jsonLd: null
  };
}

/**
 * JSON-LD 序列化。
 *
 * ⚠️ **必须把 `<` 转义成 `\u003c`**（两者在 JSON 字符串里等价）。`<script>` 是 raw-text
 * 元素：内容里出现 `</script` 会让解析器**提前关闭脚本**，其后整份文档被当脚本文本吞掉。
 * 本仓 2026-09-15 刚因为一个未闭合的 `<script>` 出过「全站白页」的 P0，不在同一天踩第二次。
 */
function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * 文章详情页的 `BlogPosting`。
 *
 * 取不到的字段**省略**而不是填空串（空 `datePublished` 会被富结果校验判为无效），所以日期
 * 先过 `toIso8601`，返回空串就不放进 JSON。
 */
function articleJsonLd(post: BlogPostMeta, canonical: string, image: SeoImage | null) {
  const published = toIso8601(post.date);
  // 没有 `updated` 时退回发布日期：`dateModified` 缺失比等于发布时间更糟（富结果会降级）
  const modified = toIso8601(post.updated ?? post.date);

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
    ...(image ? { image: [image.url] } : {}),
    author: { '@type': 'Person', name: siteConfig.author.name },
    // 单作者博客：publisher 用站点本身（不编造机构），名字取站点名
    publisher: { '@type': 'Organization', name: siteConfig.title },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }
  };
}

/**
 * 首页的 `WebSite`。
 *
 * **刻意不加 `SearchAction`**：本站没有服务端搜索接口（搜索索引是全量下载后在浏览器里搜），
 * 声明一个不存在的 `potentialAction` 等于给搜索引擎喂假数据。
 */
function websiteJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.title,
    url: canonical,
    description: siteConfig.description
  };
}

/**
 * 路由 → SEO 上下文。刻意保持**不编造内容**：
 * 文章页用 frontmatter 里的标题/摘要；其余页面用固定短标题 + 站点自身的描述。
 */
function resolveSeo(name: unknown, params: unknown, metaTitle: string): SeoContext {
  const explicit = metaTitle.trim();

  if (name === '/posts/[slug]') {
    const post = findPost(params);
    // 「文章不存在」与 404 同策：不输出整套可索引标签
    if (!post) return notIndexable(explicit);

    const headline = explicit || post.title;
    const path = `/posts/${post.slug}`;
    const image = postImage(post);

    return {
      headline,
      title: withSiteName(headline),
      description: post.description,
      path,
      ogType: 'article',
      image,
      jsonLd: articleJsonLd(post, absoluteUrl(path), image)
    };
  }

  if (name === '/tags/[name]') {
    const tag = readParam(params, 'name');
    return plainPage(explicit || `#${tag}`, `/tags/${tag}`);
  }

  if (name === '/categories/[name]') {
    const category = readParam(params, 'name');
    return plainPage(explicit || category, `/categories/${category}`);
  }

  const page = typeof name === 'string' ? STATIC_PAGES[name] : undefined;
  // 认不出的路由（理论上不会发生）：给站点默认文案，不猜 canonical
  if (!page) return notIndexable(explicit);
  if (!page.path) return notIndexable(explicit || page.title);

  const title = explicit || page.title;
  return {
    // 首页的标题部分是空串 ⇒ headline 退回站点名，`og:title` 不会成为空值
    headline: title || siteConfig.title,
    title: withSiteName(title),
    description: siteConfig.description,
    path: page.path,
    ogType: 'website',
    image: defaultImage(),
    jsonLd: page.path === '/' ? websiteJsonLd(absoluteUrl(page.path)) : null
  };
}

export function useSeo(): void {
  const route = useRoute();

  useHead(() => {
    // `definePage({ meta: { title } })` 可以覆盖派生标题（保留旧 router.afterEach 的契约）
    const metaTitle = typeof route.meta.title === 'string' ? route.meta.title : '';
    const seo = resolveSeo(route.name, route.params, metaTitle);

    const meta: Meta[] = [{ name: 'description', content: seo.description }];
    const link: Link[] = [];
    const script: Script[] = [];

    if (seo.path) {
      const canonical = absoluteUrl(seo.path);

      link.push({ rel: 'canonical', href: canonical });

      // OG 用 `property`、Twitter 用 `name` —— 两套是不同的命名空间，别写混
      meta.push(
        { property: 'og:title', content: seo.headline },
        { property: 'og:description', content: seo.description },
        { property: 'og:url', content: canonical },
        { property: 'og:type', content: seo.ogType },
        { property: 'og:site_name', content: siteConfig.title },
        { property: 'og:locale', content: OG_LOCALE },
        // 有图才用大图卡：无图时声明 `summary_large_image` 会渲染成一张空白大卡
        { name: 'twitter:card', content: seo.image ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: seo.headline },
        { name: 'twitter:description', content: seo.description }
      );

      if (seo.image) {
        meta.push(
          { property: 'og:image', content: seo.image.url },
          { property: 'og:image:alt', content: seo.image.alt },
          { name: 'twitter:image', content: seo.image.url },
          { name: 'twitter:image:alt', content: seo.image.alt }
        );

        // 宽高只在这张图**尺寸已知**时输出（见 OG_IMAGE_WIDTH 的注释）
        const { width, height } = seo.image;
        if (width !== undefined && height !== undefined) {
          meta.push(
            { property: 'og:image:width', content: String(width) },
            { property: 'og:image:height', content: String(height) }
          );
        }
      }

      if (seo.jsonLd) {
        script.push({ type: 'application/ld+json', textContent: serializeJsonLd(seo.jsonLd) });
      }
    }

    return { title: seo.title, meta, link, script };
  });
}
