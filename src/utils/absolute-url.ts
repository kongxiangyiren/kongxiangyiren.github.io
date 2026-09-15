/**
 * 绝对地址拼接与路径的百分号编码。
 *
 * ## 为什么单独一个文件（而不是都塞在 `utils/url.ts` 里）
 *
 * 这里面的逻辑**构建期也要用**：`plugins/vite-plugin-blog-content.ts` 产出
 * `sitemap.xml` 时，`<loc>` 必须与页面 canonical 用**同一套编码规则** —— 否则
 * 「`/tags/前端` 在页面上是 `%E5%89%8D%E7%AB%AF`、在 sitemap 里是别的形态」这类
 * 偏差根本查不出来（两份编码实现漂移是最难查的一类 bug）。
 *
 * ⚠️ **本文件刻意零 import**。原因：它会被 `vite.config.ts` 的 import 链加载，
 * 而 Vite 用**配置打包器**处理这条链（实测 Vite 8 源码 `bundleConfigFile` 传了
 * `tsconfig: false`）⇒ `@/` 别名不可用、`import.meta.env` 也不存在。
 * 所以不能 import 任何东西（连 `@/utils/route` 都会把别名带进去）。
 *
 * 副作用：`safeDecode` 从 `utils/route.ts` 搬到了这里（它正是 `encodePath` 的解码对偶），
 * `utils/route.ts` 只留路由参数工具。
 */

/** 已经是绝对地址（`https:` / `mailto:` / `//cdn...`）时原样返回，不再拼站点根 */
const ABSOLUTE_RE = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/** 容错解码：已经是解码态（或含裸 `%`）时原样返回，而不是抛 URIError */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 逐段做百分号编码，且对**已编码**的输入幂等。
 *
 * 幂等是硬要求：同一页面在服务端与客户端可能拿到不同形态的路径
 * （预渲染时来自请求 URL，已编码；客户端点击站内链接时是未编码的字面量）。
 * 两端必须算出同一个 canonical，否则水合后标签会被改写。
 * 例：`/tags/前端` 与 `/tags/%E5%89%8D%E7%AB%AF` 都得到 `/tags/%E5%89%8D%E7%AB%AF`。
 *
 * 按段编码（而不是整体 `encodeURI`）是为了让 `/` 保持分隔语义 ——
 * 否则中文路径会被整条编码成一个段。
 */
export function encodePath(path: string): string {
  return path
    .split('/')
    .map(segment => (segment === '' ? '' : encodeURIComponent(safeDecode(segment))))
    .join('/');
}

export interface AbsoluteUrlContext {
  /** 站点根地址（如 `https://blog.example.com`），**不带**尾斜杠。空串 ⇒ 退化为根相对路径 */
  origin: string;
  /**
   * 部署前缀（Vite 的 `base`），形如 `/` 或 `/blog/`。
   * 构建期由 `configResolved(config).base` 提供；运行时由 `import.meta.env.BASE_URL` 提供。
   */
  base: string;
}

/**
 * 把站内路径拼成绝对地址（显式上下文版）。
 *
 * - 前导斜杠可有可无（`posts/x` 与 `/posts/x` 等价）；会带上 `base`
 * - 中文 / 空格等按段编码：`/tags/前端` → `https://example.com/tags/%E5%89%8D%E7%AB%AF`
 * - 入参已经是绝对地址（外链封面、CDN）时原样返回
 * - **降级策略**：`origin` 为空串时返回**根相对路径**（`/tags/...`），而不是拼出
 *   `undefined/tags/...` 或 `//tags/...`。根相对地址在「站点就挂在域名根」这一常见
 *   情形下仍可用；真要上线，请把 `siteConfig.url` 填成真实域名。
 */
export function joinAbsoluteUrl(path: string, context: AbsoluteUrlContext): string {
  if (ABSOLUTE_RE.test(path)) return path;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Vite 保证 BASE_URL 前后都有斜杠；这里只在形态意外时退化成「挂在域名根」，不抛错
  const prefix =
    context.base.startsWith('/') && context.base.endsWith('/') ? context.base.slice(0, -1) : '';
  const encoded = encodePath(`${prefix}${normalized}`) || '/';
  const origin = context.origin.trim().replace(/\/+$/, '');

  return origin ? `${origin}${encoded}` : encoded;
}
