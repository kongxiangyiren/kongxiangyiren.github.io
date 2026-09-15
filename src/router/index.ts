import { createRouter, createWebHistory } from 'vue-router';
import { routes } from 'vue-router/auto-routes';

import type { RouterHistory } from 'vue-router';

/**
 * 路由工厂 —— 客户端与预渲染共用。
 *
 * 为什么不做单例默认导出：预渲染要的是 `createMemoryHistory()`，而 `createWebHistory()`
 * 内部会读 `document`/`window`（Node 里直接抛错）。做成工厂后「用哪种 history」由调用方决定：
 *   - `src/main.ts`（客户端入口）→ 缺省参数 = createWebHistory
 *   - `src/entry-server.ts`（预渲染）→ createMemoryHistory
 *
 * ⚠️ 标题不再由这里写 `document.title`：那样服务端渲染时标题进不了 HTML（`document` 不存在）。
 * 现在统一交给 unhead —— 见 `src/composables/useSeo.ts`，它按 `to.meta.title` 与文章元数据
 * 算出标题，客户端/服务端同一份逻辑，预渲染产物里就能带每页各自的 <title>。
 */
export function createBlogRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL)
) {
  return createRouter({ history, routes });
}
