/**
 * 每页的 <title> / <meta name="description">（unhead）。
 *
 * 为什么集中在这里而不是各页面自己 useHead：
 *   1. 标题**必须**在预渲染时进 HTML —— 客户端写 `document.title` 在 Node 里直接没有，
 *      所以标题的唯一实现只能走 head 管理器（unhead）。
 *   2. 判定依据全部能从「当前路由 + 构建期文章元数据」推出来（纯派生，无需等待异步数据），
 *      所以放在 App.vue 一处求值，客户端/服务端结果必然一致，不存在优先级打架或写两份的问题。
 *      （将来某页要自定标题，优先走 `definePage({ meta: { title } })`，仍由这里统一消费。）
 *
 * 站点名后缀与旧 `router.afterEach` 的格式逐字一致（`标题 - 站点名`），不改变用户观感。
 */
import { useHead } from '@unhead/vue';
import { useRoute } from 'vue-router';
import { posts } from 'virtual:blog/posts';

import { siteConfig } from '@/config/site';
import { routeParam } from '@/utils/route';

/** 路由名 → 静态页标题（与 src/pages 下的文件路由一一对应，注意总览页带尾斜杠） */
const STATIC_TITLES: Record<string, string> = {
  '/archives': '归档',
  '/tags/': '标签',
  '/categories/': '分类',
  '/about': '关于',
  '/friends': '友链',
  '/[...all]': '页面不存在'
};

/** typed routes 下 `route.params` 是所有路由参数的联合类型，用 unknown 收口后再取键 */
function readParam(params: unknown, key: string): string {
  if (typeof params !== 'object' || params === null) return '';
  return routeParam((params as Record<string, unknown>)[key]);
}

function withSiteName(title: string): string {
  return title ? `${title} - ${siteConfig.title}` : siteConfig.title;
}

/**
 * 路由 → SEO 文案。刻意保持**不编造内容**：
 * 文章页用 frontmatter 里的标题/摘要；其余页面用 fixed 短标题 + 站点自身的描述。
 */
function resolveSeo(name: unknown, params: unknown): { title: string; description: string } {
  if (name === '/posts/[slug]') {
    const slug = readParam(params, 'slug');
    const post = posts.find(item => item.slug === slug);
    if (post) return { title: withSiteName(post.title), description: post.description };
  }

  if (name === '/tags/[name]') {
    return {
      title: withSiteName(`#${readParam(params, 'name')}`),
      description: siteConfig.description
    };
  }

  if (name === '/categories/[name]') {
    return { title: withSiteName(readParam(params, 'name')), description: siteConfig.description };
  }

  const fixed = typeof name === 'string' ? STATIC_TITLES[name] : undefined;
  return fixed !== undefined
    ? { title: withSiteName(fixed), description: siteConfig.description }
    : { title: withSiteName(''), description: siteConfig.description };
}

export function useSeo(): void {
  const route = useRoute();

  useHead(() => {
    // `definePage({ meta: { title } })` 可以覆盖派生标题（保留旧 router.afterEach 的契约）
    const metaTitle = typeof route.meta.title === 'string' ? route.meta.title : '';
    const seo = resolveSeo(route.name, route.params);

    return {
      title: metaTitle ? withSiteName(metaTitle) : seo.title,
      meta: [{ name: 'description', content: seo.description }]
    };
  });
}
