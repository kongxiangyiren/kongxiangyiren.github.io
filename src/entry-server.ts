/**
 * 预渲染入口（nitro 自动探测 `src/entry-server.(ts|js)`）。
 *
 * 它是**渲染器本身**，不是「只渲染 #app 里的字符串」：
 * nitro 的 `renderer.handler` 被指到 ssr-renderer（见 vite.config.ts），请求直接落到这里，
 * 由我们返回**完整的 HTML 文档**（含 <head>）。这么做的理由：
 *   nitro 自带的 `renderer.template` + `<!--ssr-outlet-->` 机制只能往 `#app` 里插字符串，
 *   `<head>` 是构建期固定的 —— 那样每页的 <title> 就只能是站点名，SEO 拿不到文章名。
 *
 * 与客户端的关系：这里渲染出的 DOM 必须与 `src/main.ts` 水合出来的树完全一致，
 * 所以两边共用 `src/app.ts` 的应用工厂与同一个路由表。
 *
 * 详情页的正文：`onServerPrefetch`（见 pages/posts/[slug].vue）在渲染前取到它，
 * 于是正文 HTML 直接进静态产物；同时这里再内联一份 JSON，供浏览器**水合前**同步读到 ——
 * 否则客户端首次渲染会先出一帧骨架屏，与预渲染的正文 DOM 不一致（水合警告 + 闪一下）。
 */
import { createHead, renderSSRHead } from '@unhead/vue/server';
import { renderToString } from 'vue/server-renderer';
import { createMemoryHistory } from 'vue-router';

import { INLINE_POST_BODY_ID, loadPostBody } from '@/api/post';
import { routeParam } from '@/utils/route';
import { createBlogApp } from './app';

import shellRaw from '../index.html?raw';
import clientAssets from './main.ts?assets=client';
import serverAssets from './entry-server.ts?assets=ssr';

import type { BlogPostBody } from '@/types/blog';

/**
 * 外壳去掉注释后再用。
 * 那些注释是给改外壳的人看的构建说明，没理由复制进 22 份产物里；而且注释里的
 * `<title>` / `<meta name=description>` 字样会干扰「产物里到底有几个标题」这类核对。
 * 两个占位符要留着（它们是注入点）。
 */
const shell = shellRaw.replace(/<!--(?!ssr-assets|app-outlet)[\s\S]*?-->/g, '');

/*
 * dev 下客户端 CSS 不在 client 清单里（Vite dev 靠 JS 注入样式），首屏要无样式闪烁
 * 得从 **ssr 模块图**里再收一份 <link>，所以 dev 合并两份清单（见 shellTemplate）。
 * 生产环境 client 清单已含全量 CSS（`cssCodeSplit: false`），再合并会把同一份 CSS
 * 以两个不同 hash 的 URL 各引一次（双份下载），故只取 client。
 */

/** 404 页面的产物路径。nginx 用 `error_page 404 /404.html` 指向它，它自己必须是 200 */
const NOT_FOUND_ARTIFACT = '/404.html';

/** 通配兜底页（`src/pages/[...all].vue`）的路由名，命中即真正的 404 */
const NOT_FOUND_ROUTE_NAME = '/[...all]';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const headInstance = createHead();
    const { app, router } = createBlogApp({ history: createMemoryHistory(), head: headInstance });

    await router.push(url.pathname + url.search);
    await router.isReady();

    const current = router.currentRoute.value;
    const isNotFound = current.name === NOT_FOUND_ROUTE_NAME;

    // 详情页：正文先取出来内联（渲染前拿到，与 onServerPrefetch 命中同一份缓存）
    const slug =
      current.name === '/posts/[slug]'
        ? routeParam((current.params as Record<string, unknown>)['slug'])
        : '';
    const inlineBody = slug ? await loadPostBody(slug).catch(() => null) : null;

    const appHtml = await renderToString(app);

    /*
     * 用 `renderSSRHead` 而不是 `transformHtmlTemplate`：后者会把外壳里已有的 head 标签
     * **抽出来再统一重排**（包括防 FOUC 那一段内联脚本），位置会被挪到 </head> 前面
     * —— 那样脚本可能排到样式表后面、被等待中的 CSS 拖住执行。这里改成只把 unhead
     * 渲染出的标签插进外壳，外壳自己的东西（ charset / 图标 / 防 FOUC 脚本 ）分毫不动。
     */
    const head = await renderSSRHead(headInstance);
    const html = shellTemplate(appHtml, head.headTags, head.bodyTags ?? '');

    /*
     * 软 404：`[...all].vue` 是通配兜底，任何路径都能匹配，所以「未匹配路由」这个判据用不了
     * （`matched.length` 永远 ≥ 1）。改判「是否命中通配页」，命中就真的返回 404 ——
     * 否则 `/nope` 会以 200 被搜索引擎当正常页面收录。
     * 例外：`/404.html` 是给 nginx 用的 404 页面产物本身，必须 200（nitro 不写非 200 的
     * 预渲染结果，且 `failOnError` 会让构建直接失败）。
     */
    const status = isNotFound && url.pathname !== NOT_FOUND_ARTIFACT ? 404 : 200;

    return new Response(injectInlinePostBody(html, inlineBody), {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }
};

/**
 * 把外壳填成完整文档：
 *   1. `<!--ssr-assets-->` → 真实资源标签（CSS 在前避免 FOUC → modulepreload → 入口脚本）
 *   2. `#app` → 服务端渲染出的 DOM
 *   3. unhead 产出的 head/body 标签 → 插在 `</head>` / `</body>` 之前
 *
 * 顺带在 dev 补一条 `/@vite/client`：Vite 只在**它自己处理的 HTML** 里注入这个 HMR 客户端，
 * 而这份 HTML 由我们生成 —— 不补的话 dev 下没有 HMR 与错误浮层。
 */
function shellTemplate(appHtml: string, headTags: string, bodyTags: string): string {
  const assets = import.meta.env.DEV ? clientAssets.merge(serverAssets) : clientAssets;

  const tags = [
    ...assets.css.map(attrs => tag('link', { rel: 'stylesheet', ...attrs })),
    ...assets.js
      .filter(attrs => attrs.href !== assets.entry)
      .map(attrs => tag('link', { rel: 'modulepreload', ...attrs })),
    import.meta.env.DEV ? tag('script', { type: 'module', src: '/@vite/client' }) : '',
    assets.entry ? tag('script', { type: 'module', src: assets.entry }) : ''
  ].filter(Boolean);

  return shell
    .replace('<!--ssr-assets-->', tags.join('\n    '))
    .replace('<!--app-outlet-->', appHtml)
    .replace('</head>', `${headTags}</head>`)
    .replace('</body>', `${bodyTags}</body>`);
}

/**
 * 首屏正文内联：客户端 `loadPostBody()` 在**水合前**同步读它（见 `src/api/post.ts`）。
 * 只内联当前这一篇；站内跳转仍走原来的 hash 资源 fetch，正文不会因此进浏览器 JS 包。
 *
 * ⚠️ 形状必须是 `Record<slug, BlogPostBody>` —— 读取方 `peekPostBody()` 做的是
 * `inlineBodies?.[slug]`（见 `src/api/post.ts` 的 `readInlineBodies`）。两边的形状
 * 曾经不一致（这里序列化的是单个 body），后果是浏览器侧 `peekPostBody()` **恒为 null**：
 * 详情页水合时客户端先渲染骨架屏、`toc` 为空，与预渲染出来的正文/TOC 对不上 → 水合不匹配。
 */
function injectInlinePostBody(html: string, body: BlogPostBody | null): string {
  if (!body) return html;

  // `</script>` 会把脚本提前关掉：JSON 里的 `<` 全部转义（JSON 合法，且不产生新转义序列）
  const json = JSON.stringify({ [body.slug]: body }).replace(/</g, '\\u003c');
  return html.replace(
    '</head>',
    `<script type="application/json" id="${INLINE_POST_BODY_ID}">${json}</script></head>`
  );
}

/**
 * HTML 的 **void 元素**：没有内容、也没有结束标签，只能写成 `<name ...>`。
 * 其余元素**必须成对输出**，理由见 `tag()`。
 */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

/**
 * 生成一个标签。
 *
 * ⚠️ 只有 void 元素可以省略结束标签。`<script>` / `<style>` 是 **raw-text 元素**：
 * 解析器在遇到 `</script>` 之前会把**其后整份文档**都当脚本文本吞掉 —— 缺一个
 * `</script>` 就能让整个页面变成白页（本仓 2026-09-15 的 P0 事故就是这个）。
 *
 * ⚠️ 也不能改用 HTML 的自闭合写法 `<script ... />`：HTML 解析器**忽略**那个斜杠，
 * `<script ... />` 与 `<script ...>` 等价，同样是致命的。必须输出成对的标签。
 */
function tag(name: string, attrs: Record<string, string>): string {
  const rendered = Object.entries(attrs)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ');
  return VOID_ELEMENTS.has(name) ? `<${name} ${rendered}>` : `<${name} ${rendered}></${name}>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
