/**
 * 模态焦点陷阱 —— 这是 el-drawer 帮我们做、自研抽屉必须自己补上的那部分。
 *
 * 它负责三件事，缺一件键盘用户就会被卡住：
 *   1. 打开时把焦点移进容器（否则焦点还在背后被遮住的页面上，Tab 一下就跑到看不见的地方）
 *   2. `Tab` / `Shift+Tab` 在容器内循环，不会漏出去
 *   3. 关闭时把焦点**归还**给打开它的那个元素（否则焦点掉回 `<body>`，键盘用户彻底失联）
 *
 * Esc 只是顺手在这里处理（同一个 keydown 监听，没必要再挂一个）。
 *
 * 监听器只在 `open === true` 期间挂在 `document` 上，关闭即摘 —— 不为了一个偶尔用的
 * 抽屉常驻全局监听。
 */
import { nextTick, onScopeDispose, watch, type Ref } from 'vue';

/**
 * 可聚焦元素选择器。
 * `[tabindex]:not([tabindex="-1"])` 排除掉只为「程序化聚焦」而存在的容器本身。
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export interface UseFocusTrapOptions {
  /** 陷阱边界容器（抽屉面板），需带 `tabindex="-1"` 作为无子元素时的兜底焦点目标 */
  container: Ref<HTMLElement | null>;
  open: Ref<boolean>;
  /** 按下 Esc 时调用（通常是关闭） */
  onClose: () => void;
}

export function useFocusTrap({ container, open, onClose }: UseFocusTrapOptions): void {
  /** 打开前的焦点所在元素，关闭时还给它 */
  let restoreTo: HTMLElement | null = null;

  /**
   * 只取**真正可见**的元素。
   * 特意不用 `offsetParent !== null`：那是个经典陷阱 —— 祖先里有 `position: fixed`
   * 时 `offsetParent` 恒为 `null`，会把全部合法元素误判为不可见（抽屉面板就是 fixed 的子节点）。
   */
  function focusables(): HTMLElement[] {
    const root = container.value;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      el => el.getClientRects().length > 0
    );
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];

    if (!first || !last) {
      // 容器里没有可聚焦元素：宁可什么都不做，也不能让焦点漏到背景页面上
      event.preventDefault();
      return;
    }

    const active = document.activeElement;
    const inside = container.value?.contains(active) ?? false;

    if (event.shiftKey) {
      if (active === first || !inside) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last || !inside) {
      event.preventDefault();
      first.focus();
    }
  }

  watch(open, async isOpen => {
    if (!isOpen) {
      document.removeEventListener('keydown', onKeydown);
      restoreTo?.focus();
      restoreTo = null;
      return;
    }

    restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.addEventListener('keydown', onKeydown);

    // 等 Transition 把面板挂进 DOM 再聚焦
    await nextTick();
    const items = focusables();
    (items[0] ?? container.value)?.focus();
  });

  // 组件在打开状态下被卸载（例如整体切走）也不能留下全局监听
  onScopeDispose(() => document.removeEventListener('keydown', onKeydown));
}
