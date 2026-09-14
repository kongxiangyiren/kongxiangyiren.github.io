/**
 * 日期格式化。
 *
 * 内容层给到的 date 已经是 `YYYY-MM-DD HH:mm:ss` 的**字面量**（构建期刻意避开了时区换算），
 * 所以这里直接切片，不做任何 Date 解析 —— 二次解析会把时区偏移再叠加一次。
 */
export function formatPostDate(value: string, withTime = false): string {
  return withTime ? value.slice(0, 16) : value.slice(0, 10)
}

/** 供 <time datetime="..."> 使用 */
export function toDateTimeAttr(value: string): string {
  return value.slice(0, 10)
}
