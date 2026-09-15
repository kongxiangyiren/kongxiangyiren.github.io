/**
 * 客户端入口（`index.html` 里的 `<script type="module" src="/src/main.ts">`，
 * 预渲染产物的 `<script type="module" src="{assets.entry}">` 也是它）。
 *
 * 这里只做三件事：建 head → 建应用 → 挂载（自动水合，见 src/app.ts 的注释）。
 * 应用装配本身在 `src/app.ts`，与预渲染入口共用同一份。
 */
import { createHead } from '@unhead/vue/client';

import { createBlogApp } from './app';
import { initTheme } from './composables/useTheme';

const { app, router } = createBlogApp({ head: createHead() });

/*
 * ⚠️ 必须等**首次导航解析完**再 mount（vue-router 官方 SSR 指引的做法）。
 *
 * router 的首次导航是**异步**的：路由组件是动态 import，`currentRoute` 在导航完成前仍是
 * 初始状态。此时立刻 mount，客户端会把「路由还没就绪」的树拿去水合 ——
 *   - `<RouterView>` 只能渲染一个注释占位（服务端那边是真实页面 DOM）
 *   - 导航项按初始路径算高亮，与预渲染产物相反
 * 两者都是水合不匹配（实测：服务端渲染 /tags 时 `/tags` 为 active，客户端算出的是 `/` active）。
 * 预渲染的意义就是复用服务端 DOM，所以必须等 `isReady()` 再挂载。
 *
 * 注意别改成 `await`：入口会变成异步模块，模块求值时机被推迟到动态 import 之后，
 * 徒增不必要的语义变化；`.then()` 表达的是同一件事。
 */
void router.isReady().then(() => {
  app.mount('#app');

  // 水合完成后再同步真实主题：在那之前 Vue 侧状态必须与预渲染产物一致（见 useTheme.ts）
  initTheme();
});
