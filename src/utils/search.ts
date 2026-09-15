/**
 * 搜索结果的**纯展示逻辑**（无 DOM、无 fetch、无 fuse.js）。
 *
 * 抽出来的原因和 `useTocHighlight` 一样：「命中片段怎么截」是个可以脱离浏览器
 * 直接喂字符串验证的问题，不该和「Fuse 怎么配」「索引怎么加载」搅在一起。
 *
 * 这里刻意**不从 fuse.js 引入类型**：整个搜索链路对 fuse 的依赖只有
 * `src/api/search.ts` 里那一个 `import('fuse.js')`（动态）。用结构类型描述
 * 我们真正用到的那几个字段，就不需要为了让类型对上而写一行会被误读成
 * 「静态依赖 fuse」的类型导入。
 */

/** Fuse 的 `indices` 是 `[start, end]` **闭区间**（end 含） */
export type SearchHitRange = readonly [number, number];

/** 只取我们用得到的部分：命中的字段名 + 命中区间 */
export interface SearchMatchLike {
  key?: string;
  indices?: readonly SearchHitRange[];
}

/** 文本命中位置 */
export interface TextHitRange {
  index: number;
  /** 命中长度（字符数） */
  length: number;
}

/** 一段带命中高亮的文本：`prefix` + **命中部分** + `suffix` */
export interface Snippet {
  prefix: string;
  hit: string;
  suffix: string;
}

/** 片段两侧各留多少个字符的上下文 */
const SNIPPET_CONTEXT = 36;

/** 没有命中时，正文摘要最多展示多少个字符 */
const HEAD_LENGTH = 80;

const ELLIPSIS = '…';

/**
 * 从 Fuse 的 `matches` 里取出某个字段的**第一处**命中的位置。
 *
 * Fuse 的区间是闭区间（`[2, 7]` 表示 6 个字符），所以长度要 `end - start + 1` ——
 * 少加这个 1 就会把命中片段截掉最后一个字。
 *
 * 找不到（没开 `includeMatches`、字段没命中、区间形状异常）时返回 `null`，
 * 由调用方退化成「展示正文开头」。
 */
export function resolveTextHitRange(
  matches: readonly SearchMatchLike[] | undefined,
  key: string
): TextHitRange | null {
  const match = matches?.find(item => item.key === key);
  const first = match?.indices?.[0];
  if (!first) return null;

  const [start, end] = first;
  if (typeof start !== 'number' || typeof end !== 'number' || end < start) return null;

  return { index: start, length: end - start + 1 };
}

/**
 * 以命中位置为中心截一段上下文，两端按需补省略号。
 *
 * 返回值拆成三段而不是一整串：结果项要用 `<mark>` 把命中部分标出来，
 * 拆好之后模板里直接插值即可，**不需要 `v-html`**（少一个 XSS 面）。
 */
export function buildSnippet(
  text: string,
  index: number,
  length: number,
  context: number = SNIPPET_CONTEXT
): Snippet {
  const start = Math.max(0, index - context);
  const end = Math.min(text.length, index + length + context);

  return {
    prefix: (start > 0 ? ELLIPSIS : '') + text.slice(start, index),
    hit: text.slice(index, index + length),
    suffix: text.slice(index + length, end) + (end < text.length ? ELLIPSIS : '')
  };
}

/**
 * 没有命中正文时的兜底摘要：取开头一段。
 *
 * 标题命中的结果也需要一点上下文（否则结果项只有一行标题），
 * 这时它显示的就不是「命中片段」而是「正文开头」，所以 `hit` 为空串。
 */
export function headSnippet(text: string, limit: number = HEAD_LENGTH): Snippet {
  return {
    prefix: '',
    hit: '',
    suffix: text.length > limit ? `${text.slice(0, limit)}${ELLIPSIS}` : text
  };
}
