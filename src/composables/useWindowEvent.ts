/**
 * `window` 事件监听的 SSR 安全包装。
 *
 * 直接写 `useEventListener(window, 'scroll', …)` 在预渲染时会**当场抛错**：
 * 参数 `window` 在求值那一刻就要被读到，而 Node 里没有这个全局（`ReferenceError`）。
 * 这里先判环境再注册，服务端直接跳过 —— 反正服务端没有滚动、也没有交互。
 *
 * VueUse 的 `useEventListener` 本身对「目标是 null / undefined」是安全的
 * （内部会把空目标过滤掉），问题只在于**实参求值**这一步，所以守卫必须在这里。
 */
import { useEventListener } from '@vueuse/core';

export function useWindowEvent<K extends keyof WindowEventMap>(
  event: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
): void {
  if (typeof window === 'undefined') return;
  useEventListener(window, event, listener, options);
}
