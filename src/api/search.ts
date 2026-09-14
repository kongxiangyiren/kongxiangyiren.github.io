/**
 * 搜索索引的运行时加载。
 *
 * 索引由构建插件 emitFile 成独立资源（不是 public/ 里的静态文件，也不在主包里），
 * 所以这里按需 fetch，并且做一次进程内缓存 —— 同一会话里切换页面不会重复下载。
 */
import { SEARCH_INDEX_FILE } from '@/constants/blog'
import type { SearchIndexEntry } from '@/types/blog'

const SEARCH_INDEX_URL = `${import.meta.env.BASE_URL}${SEARCH_INDEX_FILE}`

let pending: Promise<SearchIndexEntry[]> | null = null

export function loadSearchIndex(): Promise<SearchIndexEntry[]> {
  pending ??= fetch(SEARCH_INDEX_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`搜索索引加载失败：HTTP ${response.status}`)
      }
      return response.json() as Promise<SearchIndexEntry[]>
    })
    .catch((error: unknown) => {
      // 失败要清掉缓存，否则一次网络抖动会把失败结果永久钉住
      pending = null
      throw error
    })

  return pending
}
