/**
 * 运行时长 / 版权年份的**纯计算**。
 *
 * 这批任务之前，这段算法内联在 `AppFooter.vue` 里；关于页也要显示「已运行 N 天」，
 * 与其复制一份（然后两边慢慢漂移），不如把数学部分收在这里：
 *   - 这里是纯函数：只吃数字与字符串，不碰 DOM、不持有时钟；
 *   - 计时器（每秒 tick）留在 `src/composables/useUptime.ts`。
 * 和 `src/composables/useTocHighlight.ts` 的「纯函数 / 副作用分离」是同一个范式。
 */

/** 已经拆好的时长，供模板按需取用（页脚要 天/时/分/秒，关于页只要 天） */
export interface UptimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * 把配置里的起算日（`YYYY-MM-DD`）解析成时间戳。
 *
 * **刻意按本地零点解析**（不加 `Z`）：`new Date('2026-01-01')` 会被当成 UTC 零点，
 * 在东八区就变成 1 月 1 日 08:00 —— 天数的起点整整差 8 小时。
 *
 * 非法日期返回「现在」，等价于运行时长 0，页面上不会出现 `NaN 天`。
 */
export function resolveStartTimestamp(dateText: string): number {
  const parsed = new Date(`${dateText}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/**
 * 拆分运行时长。
 * `startMs` 在未来（配置写错）时返回全 0，而不是负数。
 */
export function splitUptime(nowMs: number, startMs: number): UptimeParts {
  const totalSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

/** 文本形态的时长，供 `title` / 无障碍描述一类只需要一整句的地方使用 */
export function formatUptime(parts: UptimeParts): string {
  return `${parts.days} 天 ${parts.hours} 时 ${parts.minutes} 分 ${parts.seconds} 秒`;
}

/** 版权年份区间：起算年与当前年相同则只显示一年（`2026`，而不是 `2026 - 2026`） */
export function resolveCopyrightYears(nowMs: number, startMs: number): string {
  const startYear = new Date(startMs).getFullYear();
  const currentYear = new Date(nowMs).getFullYear();
  return currentYear > startYear ? `${startYear} - ${currentYear}` : String(startYear);
}
