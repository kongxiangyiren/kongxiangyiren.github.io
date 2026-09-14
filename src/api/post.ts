/**
 * 单篇正文的运行时加载。
 *
 * 内容层把「元数据」与「正文」拆开了：元数据在 `virtual:blog/posts` 里（含 bodyUrl），
 * 正文是构建期 emit 的独立资源（`blog-posts/<slug>-<hash>.json`，带内容 hash）。
 *
 * 页面只给 slug，剩下的事全收在这里：
 *   查 bodyUrl → fetch → 解析 → 进程内缓存；失败清缓存（一次网络抖动不该把失败钉死）。
 *
 * **这是唯一的解耦点**：将来若要从 fetch 换成动态 `import()`（或者在有数据加载器的
 * 框架里做预取 / 预渲染内联），只改这个文件，页面一行都不用动。
 * 风格刻意对齐 src/api/search.ts。
 */
import { posts } from 'virtual:blog/posts'

import type { BlogPostBody } from '@/types/blog'

/** slug → 进行中 / 已完成的 Promise（同一会话里重复进同一篇不会重复下载） */
const pending = new Map<string, Promise<BlogPostBody>>()

export function loadPostBody(slug: string): Promise<BlogPostBody> {
  const cached = pending.get(slug)
  if (cached) return cached

  const meta = posts.find((item) => item.slug === slug)

  const request: Promise<BlogPostBody> = meta
    ? fetch(meta.bodyUrl).then((response) => {
        if (!response.ok) {
          throw new Error(`正文加载失败：HTTP ${response.status}`)
        }
        return response.json() as Promise<BlogPostBody>
      })
    : Promise.reject(new Error(`没有找到文章：${slug}`))

  const guarded = request.catch((error: unknown) => {
    // 失败要清掉缓存，否则一次网络抖动会把失败结果永久钉住
    pending.delete(slug)
    throw error
  })

  pending.set(slug, guarded)
  return guarded
}

/** 供测试 / 手动重试用：丢掉某篇（或全部）已缓存的结果 */
export function clearPostBodyCache(slug?: string): void {
  if (slug === undefined) pending.clear()
  else pending.delete(slug)
}
