/**
 * 站点绝对地址拼接（canonical / og:url / og:image 共用）。
 *
 * 存在的理由：SEO 标签要求**绝对地址**，而站内路径有两种来源（写死的常量、路由参数），
 * 中文标签名还必须按 URL 规范做百分号编码。把这三点分散在各页面就会漂 ——
 * 这里保证「同一个站内路径 → 同一个字符串」。
 *
 * ⚠️ 本文件**不访问 window / document**：预渲染在 Node 里跑，浏览器水合时同一份逻辑
 * 必须算出完全相同的值，否则客户端接管后会把服务端渲染出来的 canonical 改掉。
 *
 * （百分号编码与拼接的实现在 `@/utils/absolute-url` —— 零 import 的纯函数模块，
 * 构建期的博客插件也 import 它，产 `sitemap.xml` 时才能与这里的 canonical 共用同一套规则。）
 */
import { siteConfig } from '@/config/site';
import { joinAbsoluteUrl } from '@/utils/absolute-url';

/**
 * 把站内路径拼成绝对地址。
 *
 * - 前导斜杠可有可无（`posts/x` 与 `/posts/x` 等价）；会带上 `import.meta.env.BASE_URL`
 * - 中文 / 空格等按段编码：`/tags/前端` → `https://example.com/tags/%E5%89%8D%E7%AB%AF`
 * - 入参已经是绝对地址（外链封面、CDN）时原样返回
 * - **降级策略**：`siteConfig.url` 未配置（空串）时返回**根相对路径**（`/tags/...`），
 *   而不是拼出 `undefined/tags/...` 或 `//tags/...`。根相对地址在「站点就挂在域名根」
 *   这一常见情形下仍可用；真要上线，请把 `siteConfig.url` 填成真实域名。
 *
 * 编码 / 拼接的**实现在 `@/utils/absolute-url`**（零 import 的纯函数模块）——
 * 那里构建期的博客插件也要用：`sitemap.xml` 的 `<loc>` 必须与页面 canonical 逐字相同。
 * 本文件只负责在运行时补上「站点根 + 部署前缀」这两个上下文。
 */
export function absoluteUrl(path = '/'): string {
  return joinAbsoluteUrl(path, {
    origin: siteConfig.url,
    base: import.meta.env.BASE_URL || '/'
  });
}
