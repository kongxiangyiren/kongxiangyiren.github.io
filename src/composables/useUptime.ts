/**
 * 「已运行多久」的响应式外壳。
 *
 * 数学在 `src/utils/uptime.ts`（纯函数，可直接对着数字断言）；这里只负责
 * 「每秒读一次 `Date.now()`」这一件副作用。页脚与关于页共用同一实现，
 * 不各写一份计时器。
 *
 * 计时器在 `onMounted` 里挂、`onBeforeUnmount` 里摘：SSR/预渲染时不会去碰 `window`。
 */
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef } from 'vue';

import { siteConfig } from '@/config/site';
import {
  formatUptime,
  resolveCopyrightYears,
  resolveStartTimestamp,
  splitUptime,
  type UptimeParts
} from '@/utils/uptime';

export interface UseUptimeReturn {
  /** 天 / 时 / 分 / 秒，模板里按需取（页脚要四段，关于页只要天数） */
  parts: ComputedRef<UptimeParts>;
  /** 一整句文本形态，供 `title` / `aria-label` 使用 */
  text: ComputedRef<string>;
  /** 版权年份区间 */
  copyrightYears: ComputedRef<string>;
}

export function useUptime(): UseUptimeReturn {
  const startedAt = resolveStartTimestamp(siteConfig.footerStartDate);

  /*
   * ⚠️ 初值必须是**两端相同的常量**，不能是 `Date.now()`：
   * 服务端渲染与浏览器水合必然差若干毫秒（乃至几天），页脚「已运行 X 天 Y 时 Z 分 S 秒」
   * 会逐位不同 → 水合不一致。
   * 用**本次构建的启动时间戳**（vite define 注入，客户端/服务端拿的是同一个值）：
   * 既保证两端一致，静态产物里的数字也是真实的（而不是 0 天 0 时这种占位）。
   * 真正的实时计时由下面的 interval 在挂载后接管。
   */
  const now = ref(__BUILD_TIMESTAMP__);
  let timer: number | undefined;

  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });

  onBeforeUnmount(() => {
    if (timer !== undefined) window.clearInterval(timer);
  });

  const parts = computed(() => splitUptime(now.value, startedAt));

  return {
    parts,
    text: computed(() => formatUptime(parts.value)),
    copyrightYears: computed(() => resolveCopyrightYears(now.value, startedAt))
  };
}
