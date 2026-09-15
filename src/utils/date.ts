/**
 * 日期格式化。
 *
 * 内容层给到的 date 已经是 `YYYY-MM-DD HH:mm:ss` 的**字面量**（构建期刻意避开了时区换算），
 * 所以这里直接切片，不做任何 Date 解析 —— 二次解析会把时区偏移再叠加一次。
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
 * 转成 ISO 8601（供 JSON-LD 的 `datePublished` / `dateModified`）。
 *
 * ⚠️ **必须用 UTC 语义**：内容层给到的 `YYYY-MM-DD HH:mm:ss` 是**无时区字面量**，
 * 而 js-yaml（gray-matter 的 YAML 引擎）把这类时间戳解析成 **UTC** Date
 * （`2026-09-14 10:00:00` → `2026-09-14T10:00:00Z`），插件再按 UTC 取回字面量。
 * 所以这里要按 UTC 还原，用 `Date.UTC` —— 若换成 local 解析（`new Date('2026-09-14 10:00:00')`
 * 或 local getter），东八区下会整体偏移 8 小时，`datePublished` 与 frontmatter 不再一致。
 * 解析不出的值返回空串，由调用方决定「不输出该字段」（宁缺勿错）。
 */
export function toIso8601(value: string): string {
  const match = DATE_TIME_RE.exec(value.trim());
  if (!match) return '';

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

  // 去掉毫秒：`2026-09-14T10:00:00Z` 比 `...:00.000Z` 更贴近 frontmatter 的字面量
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
