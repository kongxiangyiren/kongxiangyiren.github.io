/**
 * 单篇正文的运行时加载。
 *
 * 内容层把「元数据」与「正文」拆开了：元数据在 `virtual:blog/posts` 里（含 bodyUrl），
 * 正文是构建期 emit 的独立资源（`blog-posts/<slug>-<hash>.json`，带内容 hash）。
 *
 * 三条取数路径，按环境 / 时机分流：
 *   1. **预渲染（Node）**：构建期数据里就有正文（`virtual:blog/post-bodies`），
 *      不能也不该 fetch —— Node 里没有站点 base URL，相对路径 fetch 直接失败。
 *   2. **浏览器 + 预渲染产物首屏**：`src/entry-server.ts` 把当前这篇内联进了 HTML，
 *      这里**同步**读到它。这条路径是水合正确性的前提：详情页首帧就必须有正文，
 *      否则客户端首次渲染会先出骨架屏，与静态 HTML 不一致（水合警告 + 闪一下）。
 *   3. **浏览器内站内跳转**：没有内联数据，照旧 fetch 本篇的 hash 资源（原设计不变）。
 *
 * **这是唯一的解耦点**：将来若改成别的取数方式，只改这个文件，页面一行都不用动。
 * 风格刻意对齐 src/api/search.ts。
 */
import { posts } from 'virtual:blog/posts';

import type { BlogPostBody } from '@/types/blog';

/**
 * 内联首屏正文的 `<script type="application/json">` 的 id。
 * 写入方是 `src/entry-server.ts`，两边共用这个常量，改一处即可。
 */
export const INLINE_POST_BODY_ID = 'blog-post-body';

/** slug → 进行中 / 已完成的 Promise（同一会话里重复进同一篇不会重复下载） */
const pending = new Map<string, Promise<BlogPostBody>>();

/** 内联数据解析结果（只读一次） */
let inlineBodies: Record<string, BlogPostBody> | null = null;

/** 读预渲染产物里内联的首屏正文。非预渲染产物 / 非详情页 → null */
function readInlineBodies(): Record<string, BlogPostBody> | null {
  if (inlineBodies) return inlineBodies;
  if (typeof document === 'undefined') return null;

  const element = document.getElementById(INLINE_POST_BODY_ID);
  if (!element?.textContent) return null;

  try {
    inlineBodies = JSON.parse(element.textContent) as Record<string, BlogPostBody>;
  } catch {
    // 内联数据被破坏（极少见）：退回 fetch，不让页面因此打不开
    return null;
  }
  return inlineBodies;
}

/**
 * 「此刻就能同步拿到的正文」—— 水合的探针。
 *
 * 服务端返回 null（走 onServerPrefetch 的异步预取）；浏览器上只有**当前这一篇**
 * 会命中预渲染内联数据，站内跳转时同样是 null（走 fetch + 骨架屏，与改造前一致）。
 * 页面用它决定首帧是「直接渲染正文」还是「先渲染骨架屏」。
 */
export function peekPostBody(slug: string): BlogPostBody | null {
  return readInlineBodies()?.[slug] ?? null;
}

/** 预渲染（Node）分支：正文在构建期数据里，动态 import 以免它被拖进浏览器包 */
async function loadFromBuildContent(slug: string): Promise<BlogPostBody> {
  const { postBodies } = await import('virtual:blog/post-bodies');
  const body = postBodies[slug];
  if (!body) throw new Error(`没有找到文章：${slug}`);
  return body;
}

/** 浏览器分支：内联数据优先，否则 fetch 本篇的 hash 资源 */
function loadFromAsset(slug: string): Promise<BlogPostBody> {
  const inline = peekPostBody(slug);
  if (inline) return Promise.resolve(inline);

  const meta = posts.find(item => item.slug === slug);
  if (!meta) return Promise.reject(new Error(`没有找到文章：${slug}`));

  return fetch(meta.bodyUrl).then(response => {
    if (!response.ok) {
      throw new Error(`正文加载失败：HTTP ${response.status}`);
    }
    return response.json() as Promise<BlogPostBody>;
  });
}

export function loadPostBody(slug: string): Promise<BlogPostBody> {
  const cached = pending.get(slug);
  if (cached) return cached;

  // `import.meta.env.SSR` 是编译期常量：浏览器包里这条分支连同上面的动态 import 一起消失，
  // 正文不会因此回到客户端 JS 包（正文分离的成果必须保住）。
  const request = import.meta.env.SSR ? loadFromBuildContent(slug) : loadFromAsset(slug);

  const guarded = request.catch((error: unknown) => {
    // 失败要清掉缓存，否则一次网络抖动会把失败结果永久钉住
    pending.delete(slug);
    throw error;
  });

  pending.set(slug, guarded);
  return guarded;
}

/** 供测试 / 手动重试用：丢掉某篇（或全部）已缓存的结果 */
export function clearPostBodyCache(slug?: string): void {
  if (slug === undefined) pending.clear();
  else pending.delete(slug);
}
