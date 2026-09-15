/**
 * 分页页码计算 —— 纯函数，便于单测（本项目暂无测试框架，读代码即可验证）。
 *
 * 为什么逐行复刻 Element Plus `ElPaginationPager` 的算法（而不是自己发明一个
 * "当前页 ±1" 的简化版）：这样换成自研渲染后**页码序列与改造前完全一致**，
 * 不是"看起来差不多"。`pagerCount = 5` 时 EP 的分支结果如下（pages=10）：
 *
 *   current=1  → 1 2 3 4 … 10
 *   current=4  → 1 2 3 4 … 10
 *   current=5  → 1 … 4 5 6 … 10
 *   current=10 → 1 … 7 8 9 10
 *
 * 两处与 EP 不同、且**是我们主动改的**：
 *   1. EP 的 `aria-current` 是布尔值（渲染成 `aria-current="true"`），这里输出规范的
 *      `"page"`，非当前页则不输出该属性。
 *   2. EP 的省略号是带 `tabindex` 的 `<li>`（靠 `keyup.enter` 触发），这里渲染成真实
 *      `<button>` 并带可读的 `aria-label`。
 */

/** 与改造前 el-pagination 的 `pager-count` 对齐 */
export const DEFAULT_PAGER_COUNT = 5;

/** 一个省略号按钮点击后越过多少页（EP 里是 `pagerCount - 2`） */
export const PAGER_JUMP_STEP = DEFAULT_PAGER_COUNT - 2;

export type PagerItem =
  | { readonly type: 'page'; readonly page: number }
  | {
      readonly type: 'jump';
      readonly key: 'prev-more' | 'next-more';
      /** 点一下就跳到第几页 */
      readonly target: number;
    };

/**
 * 生成页码序列（含首尾页与省略号）。
 *
 * @param pageCount    总页数，<= 0 时返回空数组
 * @param currentPage  当前页，越界会被夹到 `[1, pageCount]`
 * @param pagerCount   同 EP，窗口宽度（奇数）；省略号跳步 = `pagerCount - 2`
 */
export function buildPagerItems(
  pageCount: number,
  currentPage: number,
  pagerCount: number = DEFAULT_PAGER_COUNT
): PagerItem[] {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return [];

  const count = Math.trunc(pageCount);
  const current = Math.min(Math.max(1, Math.trunc(currentPage) || 1), count);
  const half = (pagerCount - 1) / 2;

  // pageCount <= pagerCount 时 EP 两个开关恒为 false，会走最后那个「展开全部」分支
  const showPrevMore = count > pagerCount && current > pagerCount - half;
  const showNextMore = count > pagerCount && current < count - half;

  const middle: number[] = [];
  if (showPrevMore && !showNextMore) {
    // 贴右端：补满 pagerCount - 2 个页号（首尾各占一个）
    const startPage = count - (pagerCount - 2);
    for (let i = startPage; i < count; i += 1) middle.push(i);
  } else if (!showPrevMore && showNextMore) {
    // 贴左端
    for (let i = 2; i < pagerCount; i += 1) middle.push(i);
  } else if (showPrevMore && showNextMore) {
    // 居中：当前页两侧各 Math.floor(pagerCount / 2) - 1 = 1 个
    const offset = Math.floor(pagerCount / 2) - 1;
    for (let i = current - offset; i <= current + offset; i += 1) middle.push(i);
  } else {
    for (let i = 2; i < count; i += 1) middle.push(i);
  }

  const jumpStep = pagerCount - 2;

  const items: PagerItem[] = [{ type: 'page', page: 1 }];

  if (showPrevMore) {
    items.push({ type: 'jump', key: 'prev-more', target: Math.max(1, current - jumpStep) });
  }
  for (const page of middle) items.push({ type: 'page', page });
  if (showNextMore) {
    items.push({ type: 'jump', key: 'next-more', target: Math.min(count, current + jumpStep) });
  }

  // EP 在 pageCount === 1 时不会渲染末页（否则会出现两个 "1"）
  if (count > 1) items.push({ type: 'page', page: count });

  return items;
}
