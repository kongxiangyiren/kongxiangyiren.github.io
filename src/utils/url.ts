/**
 * 站点绝对地址拼接（canonical / og:url / og:image 共用）。
 *
 * 存在的理由：SEO 标签要求**绝对地址**，而站内路径有两种来源（写死的常量、路由参数），
 * 中文标签名还必须按 URL 规范做百分号编码。把这三点分散在各页面就会漂 ——
 * 这里保证「同一个站内路径 → 同一个字符串」。
 *
 * ⚠️ 本文件**不访问 window / document**：预渲染在 Node 里跑，浏览器水合时同一份逻辑
 * 必须算出完全相同的值，否则客户端接管后会把服务端渲染出来的 canonical 改掉。
 */
import { siteConfig } from '@/config/site';
import { safeDecode } from '@/utils/route';

/** 已经是绝对地址（`https:` / `mailto:` / `//cdn...`）时原样返回，不再拼站点根 */
const ABSOLUTE_RE = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/**
 * `import.meta.env.BASE_URL`（Vite 保证以 `/` 结尾）去掉尾斜杠，便于与以 `/` 开头的路径拼接。
 * 默认 `'/'` → 返回 `''`，于是拼接结果就是路径本身（不产生 `//posts`）。
 */
function basePrefix(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/**
 * 逐段做百分号编码，且对**已编码**的输入幂等。
 *
 * 幂等是硬要求：同一页面在服务端与客户端可能拿到不同形态的路径
 * （预渲染时来自请求 URL，已编码；客户端点击站内链接时是未编码的字面量）。
 * 两端必须算出同一个 canonical，否则水合后标签会被改写。
 * 例：`/tags/前端` 与 `/tags/%E5%89%8D%E7%AB%AF` 都得到 `/tags/%E5%89%8D%E7%AB%AF`。
 */
function encodePath(path: string): string {
  return path
    .split('/')
    .map(segment => (segment === '' ? '' : encodeURIComponent(safeDecode(segment))))
    .join('/');
}

/**
 * 把站内路径拼成绝对地址。
 *
 * - 前导斜杠可有可无（`posts/x` 与 `/posts/x` 等价）；会带上 `import.meta.env.BASE_URL`
 * - 中文 / 空格等按段编码：`/tags/前端` → `https://example.com/tags/%E5%89%8D%E7%AB%AF`
 * - 入参已经是绝对地址（外链封面、CDN）时原样返回
 * - **降级策略**：`siteConfig.url` 未配置（空串）时返回**根相对路径**（`/tags/...`），
 *   而不是拼出 `undefined/tags/...` 或 `//tags/...`。根相对地址在「站点就挂在域名根」
 *   这一常见情形下仍可用；真要上线，请把 `siteConfig.url` 填成真实域名。
 */
export function absoluteUrl(path = '/'): string {
  if (ABSOLUTE_RE.test(path)) return path;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const encoded = encodePath(`${basePrefix()}${normalized}`) || '/';
  const origin = siteConfig.url.trim().replace(/\/+$/, '');

  return origin ? `${origin}${encoded}` : encoded;
}
