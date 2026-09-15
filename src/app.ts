/**
 * 客户端 / 服务端共享的应用工厂。
 *
 * 两个入口都从这里建应用，保证「预渲染出来的 HTML」与「浏览器水合出来的树」结构完全一致：
 *   - `src/main.ts`        客户端入口（index.html 引的 /src/main.ts）
 *   - `src/entry-server.ts` 预渲染入口（nitro 自动探测）
 *
 * 用 `createSSRApp` 而不是 `createApp`：客户端挂载时必须走 **水合**（复用已有 DOM），
 * 否则会把预渲染出来的内容整段丢掉重渲染（首屏白一下 + 丢失 SSR 的意义）。
 * `createSSRApp(...).mount()` 在容器非空时自动水合，页面是纯 SPA 打开时（容器空）照常挂载。
 *
 * 样式在此统一引入：客户端的 CSS 由这里进图，服务端的 CSS 也从这里进 SSR 模块图 ——
 * nitro 在 dev 下靠 SSR 图收集 CSS 链接（`?assets=ssr`），样式只有一处声明才不会漏。
 */
import { createPinia } from 'pinia';
import { createSSRApp } from 'vue';

import App from './App.vue';
import { createBlogRouter } from './router';

import type { Plugin } from 'vue';
import type { RouterHistory } from 'vue-router';

// 样式引入顺序有意义：EP 变量覆盖 → EP 暗色 css-vars → Tailwind → 自研动画 → 正文排版
import './styles/element/index.scss';
import './styles/element/dark.scss';
import './styles/tailwind.css';
import './styles/scss/butterfly.scss';
import './styles/scss/markdown.scss';

export interface CreateBlogAppOptions {
  /** 缺省 = createWebHistory（客户端）；预渲染传 createMemoryHistory() */
  history?: RouterHistory;
  /** unhead 实例。客户端用 `@unhead/vue/client`，预渲染用 `@unhead/vue/server` —— 两边入口不同，
   *  所以由调用方注入，避免把服务端实现打进浏览器包（反之亦然）。 */
  head?: Plugin;
}

export function createBlogApp(options: CreateBlogAppOptions = {}) {
  const app = createSSRApp(App);
  const router = createBlogRouter(options.history);

  app.use(createPinia());
  app.use(router);
  if (options.head) app.use(options.head);

  return { app, router };
}
