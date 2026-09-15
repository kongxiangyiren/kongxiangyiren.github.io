/**
 * 标签 / 分类的共用纯函数。
 *
 * 抽出来的唯一理由是「标签总览页」与首页侧边栏的「标签云」需要**同一个权重口径**：
 * 之前那套归一化写在 `TagCloud.vue` 里，标签页要么照抄一份、要么就和侧边栏不一致。
 * 这里只抽**算法**，两端各自决定字号/颜色的端点 —— 侧边栏是窄卡、总览页是整页，
 * 视觉本来就不该一样（也就是不硬耦合）。
 */
import type { TaxonomyItem } from '@/types/blog';
import { safeDecode } from '@/utils/route';

/**
 * 把一串「文章数」归一化成 `[0, 1]` 的权重（纯函数）。
 *
 *  - 只有一种权重时（所有标签文章数相同）一律取 `0.5`，避免除零；
 *  - 空数组返回空数组。
 *
 * 返回值与入参**下标一一对应**。
 */
export function interpolateRatios(counts: readonly number[]): number[] {
  if (counts.length === 0) return [];

  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const count of counts) {
    if (count < min) min = count;
    if (count > max) max = count;
  }

  return counts.map(count => (max === min ? 0.5 : (count - min) / (max - min)));
}

/**
 * 按名字查标签 / 分类。
 *
 * 先精确匹配，再退到「解码后比较」：中文名在 URL 里是百分号编码，
 * 不同来源（`route.params`、手写的 `RouterLink`、外部链接）拿到的形态可能不同。
 * 两条都走不通时返回 `null`，由页面渲染「没有找到」而不是白屏。
 */
export function findTaxonomyItem(items: TaxonomyItem[], rawName: string): TaxonomyItem | null {
  return (
    items.find(item => item.name === rawName) ??
    items.find(item => safeDecode(item.name) === rawName) ??
    null
  );
}
