/**
 * 「进入视口时淡入上移」的小工具。
 *
 * 三条底线：
 *   1. `prefers-reduced-motion: reduce` → 直接可见，不观察、不动画。
 *   2. 浏览器没有 IntersectionObserver → 直接可见（宁可不动画，也不能留下看不见的内容）。
 *   3. 观察一次就断开，不为了一个一次性的入场动画常驻监听。
 */
import { onMounted, onScopeDispose, ref } from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';

/** 元素要露出约 10% 才触发，避免刚碰到下边缘就播动画 */
const DEFAULT_ROOT_MARGIN = '0px 0px -10% 0px';

export function useReveal(rootMargin: string = DEFAULT_ROOT_MARGIN) {
  const target = ref<HTMLElement | null>(null);
  const revealed = ref(false);
  const reducedMotion = usePreferredReducedMotion();

  let observer: IntersectionObserver | undefined;

  const stopObserving = (): void => {
    observer?.disconnect();
    observer = undefined;
  };

  onMounted(() => {
    if (reducedMotion.value === 'reduce' || !target.value) {
      revealed.value = true;
      return;
    }
    // 老浏览器 / 非浏览器环境：没有这个 API 就退化成「立刻可见」
    if (typeof IntersectionObserver === 'undefined') {
      revealed.value = true;
      return;
    }

    observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        revealed.value = true;
        stopObserving();
      },
      { rootMargin }
    );
    observer.observe(target.value);
  });

  onScopeDispose(stopObserving);

  return { target, revealed };
}
