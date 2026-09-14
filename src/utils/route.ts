/**
 * 路由参数工具。
 *
 * `route.params.x` 的类型是 `string | string[]`（重复参数会是数组），
 * 页面里到处写类型守卫太啰嗦，统一收在这里。
 */

/** 取第一个参数值；缺席或类型不对时返回空串 */
export function routeParam(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const first: unknown = value[0]
    return typeof first === 'string' ? first : ''
  }
  return ''
}

/** 容错解码：已经是解码态（或含裸 `%`）时原样返回，而不是抛 URIError */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
