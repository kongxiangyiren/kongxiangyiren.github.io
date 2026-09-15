/**
 * 日期格式化。
 *
 * 内容层给到的 date 已经是 `YYYY-MM-DD HH:mm:ss` 的**字面量**（构建期刻意避开了时区换算），
 * 所以 `formatPostDate` / `toDateTimeAttr` 直接切片，不做任何 Date 解析 ——
 * 二次解析会把时区偏移再叠加一次。需要机器可读格式（ISO 8601 / RFC 822）时，
 * 一律走下面**唯一**的 UTC 解析入口 `parseUtcLiteral`。
 */
export function formatPostDate(value: string, withTime = false): string {
  return withTime ? value.slice(0, 16) : value.slice(0, 10);
}

/** 供 <time datetime="..."> 使用 */
export function toDateTimeAttr(value: string): string {
  return value.slice(0, 10);
}

/** `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm(:ss)`（内容层的两种形态） */
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * 内容层字面量 → **UTC** Date。`toIso8601` 与 `toRfc822` 共用的唯一解析入口。
 *
 * ⚠️ **必须用 UTC 语义**：内容层给到的 `YYYY-MM-DD HH:mm:ss` 是**无时区字面量**，
 * 而 js-yaml（gray-matter 的 YAML 引擎）把这类时间戳解析成 **UTC** Date
 * （`2026-09-14 10:00:00` → `2026-09-14T10:00:00Z`），插件再按 UTC 取回字面量。
 * 所以这里要按 UTC 还原，用 `Date.UTC` —— 若换成 local 解析（`new Date('2026-09-14 10:00:00')`
 * 或 local getter），东八区下会整体偏移 8 小时，产物里的日期与 frontmatter 不再一致。
 *
 * 解析不出时返回 null，由调用方决定「不输出该字段」（宁缺勿错）。
 * 只此一处解析：再写第二份正则 + `Date.UTC` 就是给自己埋时区漂移。
 */
function parseUtcLiteral(value: string): Date | null {
  const match = DATE_TIME_RE.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 转成 ISO 8601（供 JSON-LD 的 `datePublished` / `dateModified`，以及 sitemap 的 `<lastmod>`）。
 *
 * 去掉毫秒：`2026-09-14T10:00:00Z` 比 `...:00.000Z` 更贴近 frontmatter 的字面量。
 * 解析不出的值返回空串。
 */
export function toIso8601(value: string): string {
  const date = parseUtcLiteral(value);
  return date ? date.toISOString().replace(/\.\d{3}Z$/, 'Z') : '';
}

/**
 * 转成 RFC 822 / RFC 1123 格式（RSS 2.0 的 `<pubDate>` 要求）。
 *
 * 例：`2026-09-14 10:00:00` → `Mon, 14 Sep 2026 10:00:00 GMT`。
 * 与 `toIso8601` **共用同一个解析入口**，所以两处的时区语义不可能漂移；
 * `toUTCString()` 输出的就是 RFC 1123（RFC 822 的修订版，RSS 2.0 允许）。
 * 解析不出的值返回空串。
 */
export function toRfc822(value: string): string {
  const date = parseUtcLiteral(value);
  return date ? date.toUTCString() : '';
}
