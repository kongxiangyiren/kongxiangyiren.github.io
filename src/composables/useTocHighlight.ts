/**
 * 文章目录（TOC）的滚动高亮 + 锚点跳转。
 *
 * 刻意拆成两半：
 *   - `resolveActiveIndex()` 是**纯函数**（只吃一个滚动快照，返回下标），
 *     没有 DOM、没有监听、没有全局状态，可以直接对着数字写断言；
 *   - `useTocHighlight()` 只负责副作用：采集标题元素、在 scroll/resize 上
 *     按帧节流地读一次几何、把结果写进 `activeId`。
 *
 * 这样「算法对不对」和「监听挂没挂对」是两个可以分开验证的问题。
 */

import { nextTick, onScopeDispose, ref, watch, type Ref } from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';

import { useWindowEvent } from '@/composables/useWindowEvent';

import type { TocItem } from '@/types/blog';

/**
 * 判定「当前章节」的视口顶线（px）。
 * 与正文标题的 `scroll-margin-top: 5rem`（80px，见 markdown.scss）对齐，
 * 再留一点余量：标题滚到这条线以上就算「已经进入该章节」。
 */
const ACTIVE_LINE = 96;

/**
 * 判定「滚到底」的容差（px）。
 * `scrollTop` / `scrollHeight` 都是取整过的整数，1px 的误差不该让最后一节漏判。
 */
const BOTTOM_EPSILON = 2;

/** 一次滚动快照。全是数字，方便单测直接构造 */
export interface TocScrollSnapshot {
  /** 各标题相对**视口顶部**的距离（`getBoundingClientRect().top`），顺序与 TOC 一致 */
  tops: readonly number[];
  /** 视口高度（`documentElement.clientHeight`） */
  viewportHeight: number;
  /** 文档总高（`documentElement.scrollHeight`） */
  documentHeight: number;
  /** 当前滚动位置（`documentElement.scrollTop`） */
  scrollY: number;
  /** 判定线，默认 {@link ACTIVE_LINE} */
  activeLine?: number;
}

/**
 * 纯函数：从一次滚动快照算出该高亮第几节，没有可高亮的项时返回 -1。
 *
 * **算法：「触底优先」+「最后一个越线者」**，两步都是必需的：
 *
 *   1. **触底优先**：`scrollY >= scrollable - 2` 时直接判定**最后一节**。
 *      这是那个经典边界的解法 —— 末尾章节的高度往往不到一屏，它在页面滚到底时
 *      仍然停在判定线**下方**，于是「最后一个 `top <= 阈值`」的常规算法会稳稳地
 *      停在倒数第二节：用户已经看完全文了，目录却还指着上一节。
 *      只在底部单独兜一次底，比去猜「还剩多少算快到底了」可靠得多，也不会误伤
 *      正常位置的判定。
 *   2. 否则取**最后一个 `top <= activeLine`** 的标题。一个都没越线时归到第 0 节 ——
 *      保证任何时刻都有且仅有一个高亮项，不会出现「无高亮」的空状态。
 *
 * 顺带处理一个坑：页面本身**不可滚**时 `scrollable <= 0`，第 1 步会被误判（0 >= -2），
 * 所以触底判定额外要求 `scrollable > BOTTOM_EPSILON`。
 */
export function resolveActiveIndex({
  tops,
  viewportHeight,
  documentHeight,
  scrollY,
  activeLine = ACTIVE_LINE
}: TocScrollSnapshot): number {
  if (tops.length === 0) return -1;

  const scrollable = documentHeight - viewportHeight;
  if (scrollable > BOTTOM_EPSILON && scrollY >= scrollable - BOTTOM_EPSILON) {
    return tops.length - 1;
  }

  let active = 0;
  for (let i = 0; i < tops.length; i += 1) {
    if ((tops[i] ?? Number.POSITIVE_INFINITY) > activeLine) break;
    active = i;
  }
  return active;
}

export interface UseTocHighlightOptions {
  /** TOC 数据。正文是异步加载的，所以传 Ref，加载完成后会自动重新采集标题 */
  items: Ref<TocItem[]>;
  /** 判定线覆盖，默认 {@link ACTIVE_LINE} */
  activeLine?: number;
}

export interface UseTocHighlightReturn {
  /** 当前高亮项 id；空串表示还没有可高亮的项 */
  activeId: Ref<string>;
  /** 当前高亮下标（-1 表示无），测试与调试用 */
  activeIndex: Ref<number>;
  /** 平滑滚动到某个锚点并修正 URL hash */
  scrollTo: (id: string) => void;
}

export function useTocHighlight({
  items,
  activeLine = ACTIVE_LINE
}: UseTocHighlightOptions): UseTocHighlightReturn {
  const activeId = ref('');
  const activeIndex = ref(-1);
  const reducedMotion = usePreferredReducedMotion();

  /** 已采集的标题元素，顺序与 `items` 一一对应 */
  let headings: HTMLElement[] = [];
  /** 待执行的 rAF 句柄，0 表示没有排队中的帧 */
  let frame = 0;

  /** 预渲染（Node）里没有 DOM：这几个函数都只能空转，不能抛错 */
  const hasDom = typeof document !== 'undefined';

  function collect(): void {
    if (!hasDom) return;
    headings = items.value
      .map(item => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
  }

  function update(): void {
    frame = 0;
    if (!hasDom || headings.length === 0) return;

    const doc = document.documentElement;
    const index = resolveActiveIndex({
      tops: headings.map(el => el.getBoundingClientRect().top),
      viewportHeight: doc.clientHeight,
      documentHeight: doc.scrollHeight,
      scrollY: doc.scrollTop,
      activeLine
    });
    if (index < 0) return;

    activeIndex.value = index;
    activeId.value = items.value[index]?.id ?? '';
  }

  /** scroll 事件每帧可能来好几次，用 rAF 合并成每帧最多算一次 */
  function schedule(): void {
    if (frame !== 0 || !hasDom) return;
    frame = requestAnimationFrame(update);
  }

  // 正文异步到达 → items 变化 → 等 DOM 更新完再采集标题
  watch(
    items,
    async () => {
      await nextTick();
      collect();
      update();
    },
    { immediate: true }
  );

  useWindowEvent('scroll', schedule, { passive: true });
  useWindowEvent('resize', schedule, { passive: true });

  onScopeDispose(() => {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
  });

  function scrollTo(id: string): void {
    const target = document.getElementById(id);
    if (!target) return;

    // 尊重 reduce motion：不做平滑滚动。
    // 竖直偏移交给正文标题自己的 `scroll-margin-top`，不用手算固定顶栏的高度。
    target.scrollIntoView({
      behavior: reducedMotion.value === 'reduce' ? 'auto' : 'smooth',
      block: 'start'
    });

    /*
     * 只改 URL 的 hash，**不新增历史记录**。
     * 不用 `router.push({ hash })`：那会往历史里塞一条记录（返回键要走两次才离开本页），
     * 也会让 vue-router 的导航流程再跑一遍（本项目没配 scrollBehavior，等于白跑）。
     * `replaceState` 传相对 URL，路径与 query 原样保留。
     */
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);

    /*
     * 平滑滚动要几百毫秒，期间 scroll 事件会一节一节地把高亮推过去。
     * 先立刻切到目标项，点击反馈才不滞后于手指。
     */
    activeId.value = id;
  }

  return { activeId, activeIndex, scrollTo };
}
