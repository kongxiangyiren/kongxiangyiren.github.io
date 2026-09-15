#!/usr/bin/env node
/**
 * 构建后产物门禁：对 `.output/public/**\/*.html` 做**结构性**校验。
 *
 * ## 为什么需要它（2026-09-15 P0 事故的教训）
 * 预渲染产物曾在**所有真实浏览器里全白页**：`src/entry-server.ts` 的 `tag()` 从不输出闭合
 * 标签，于是入口脚本成了 `<script type="module" src="/assets/main-*.js">` —— 而 `<script>`
 * 是 raw-text 元素，解析器找不到 `</script>` 就把**其后整份文档**当脚本文本吞掉。
 *
 * 事故当时的验证全靠 `curl` + `grep`，**而它们不解析 HTML**：原始文本里 `<div id="app">`
 * 有内容、每页 `<title>` 也各不相同，看起来完美。⇒ 本脚本补上「不解析就必须能发现的
 * 结构性错误」这一层。
 *
 * ⚠️ 它**不能替代**真实浏览器验证（DOM 才是权威），只是把「标签配对」这类机械错误
 * 提前到构建产物落地时拦截。
 *
 * ## 校验项
 *   1. 标签配对：`<script` / `</script>`（事故直接指标）、`<style>`、`<div>`、`<title>` 等
 *      —— 每个非 void、且结束标签不可省略的元素，开合数量必须相等
 *      ⚠️ 计数在**摘掉属性值之后**的标记上做：unhead 渲染 `content="..."` 时不转义 `<`，
 *         文章标题里的 `<pre>` / `<code>` 会被朴素计数当成真标签 → 误报 → 阻断发布
 *      ⚠️ 但**正文里的裸** `<script>` / `<pre>` 仍必须命中（那正是 P0 的检测面）
 *   2. 无自闭合 `<script ... />`（HTML 解析器忽略该斜杠，与不闭合等价致命）
 *   2b. **属性引号配对**：每个标签内的 `"` / `'` 必须两两配对（扫描器还会直接报
 *      「引号未闭合到文档末尾」）—— 补上「摘属性值会掩盖引号未闭合」的假阴性
 *   3. 恰好 1 个 `<title>`，且内容非空
 *   4. `<body>` 存在且非空壳（`#app` 内有实际内容）
 *   5. `<div id="app">` 存在，且其内容长度 > 0、去标签后有实际文本
 *   6. 文档骨架完整：`<!doctype html>` / `<html>` / `<head>` / `</body>` / `</html>`
 *   7. `<meta charset>` 与 `<meta name="viewport">` 各**恰好 1 个**（外壳与 unhead 都声明过）
 *   8. JSON-LD 块能 `JSON.parse`、且内容里没有裸 `<`（同样会让 raw-text 元素提前闭合）
 *   9. 站点级元文件 `rss.xml` / `sitemap.xml` / `robots.txt` **存在**（页脚与关于页都渲染了
 *      `href: '/rss.xml'` 的链接；在补齐之前它是一个长期 404 的**用户可见死链**）
 *  10. 三个文件的 XML 结构自检：标签配对、属性必须带引号、文本节点无裸 `<`、**无裸 `&`**
 *  11. RSS：`<item>` 数在 `[1, FEED_ITEM_LIMIT]` 内；每条都有 title / 绝对 `link` /
 *      `guid isPermaLink="true"`；`<pubDate>` 是合法 RFC 1123 且**星期与日期自洽**
 *      （用 `toUTCString()` 反向核对，能抓出「星期写错」这类肉眼不看的错误）
 *  12. sitemap：`<loc>` 要么全绝对、要么全根相对（不许混），唯一，且**不含 404 产物**；
 *      robots：`Sitemap:` 行的绝对 / 相对形态必须与 sitemap 的 `<loc>` 形态一致
 *
 * 任何一项失败 → **exit 1**，并逐条打印「文件 / 校验项 / 期望 / 实际」。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Node 24 的类型擦除让我们能直接引用产物文件名的**单一真相来源** ——
// 门禁里再写一遍 'rss.xml' 这种字面量，就是把「漂移」重新引进来
import { FEED_ITEM_LIMIT, ROBOTS_FILE, RSS_FILE, SITEMAP_FILE } from '../src/constants/blog.ts';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC_DIR = join(ROOT, '.output', 'public');

/**
 * 参与配对检查的元素：**结束标签在 HTML 规范中不可省略**的那些。
 *
 * 刻意排除 `<p>` `<li>` `<td>` `<tr>` `<option>` `<dt>` `<dd>` 等「结束标签可省略」的元素
 * —— 省略在规范里是合法的，把它们算进来会产生**误报**，而一个会误报的门禁很快就会被关掉。
 */
const PAIRED_ELEMENTS = [
  'script',
  'style',
  'title',
  'div',
  'html',
  'head',
  'body',
  'main',
  'header',
  'footer',
  'nav',
  'aside',
  'section',
  'article',
  'form',
  'label',
  'textarea',
  'pre',
  'code',
  'blockquote',
  'ul',
  'ol',
  'button',
  'template'
];

/** 统计 `str` 中正则命中次数。每次都用新建的正则，避免 `lastIndex` 串味 */
function countMatches(str, source, flags) {
  const matches = str.match(new RegExp(source, flags));
  return matches ? matches.length : 0;
}

/** 开标签计数。用 `(?=[\s/>])` 卡边界，避免 `<dividend>` 被当成 `<div` */
function countOpen(html, tag, flags = 'gi') {
  return countMatches(html, `<${tag}(?=[\\s/>])`, flags);
}

/** 闭标签计数 */
function countClose(html, tag, flags = 'gi') {
  return countMatches(html, `</${tag}\\s*>`, flags);
}

/** 统计某个字符在字符串里的出现次数（用于引号配对） */
function countChar(str, char) {
  let count = 0;
  for (let i = 0; i < str.length; i += 1) {
    if (str[i] === char) count += 1;
  }
  return count;
}

/**
 * HTML 的 **raw-text / escapable-raw-text** 元素。
 *
 * 这些元素的内容按纯文本处理：`<script>` 里的 `if (a < b)`、`<style>` 里的 `a > b`
 * 都不是标记。扫描时遇到它们要一路跳到配对的那个结束标签，否则会把脚本 / 样式文本里的
 * `<` 误当成标签起点，连带把后续真实标签的配对关系算错。
 */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

/**
 * 扫描文档里**真正的标签**。
 *
 * ## 为什么不能用「直接数字符串里的 `<pre`」
 * 2026-09-15 实测：unhead 渲染 `content="..."` 时**只转义 `"`，不转义 `<`**
 * （HTML 规范允许带引号的属性值里出现裸 `<`，浏览器与爬虫都正常处理）。于是文章标题里
 * 写 `<pre>` / `<code>` 时，产物里会出现：
 *
 *     <meta property="og:title" content="测试 <pre> 与 <code> 标签">
 *
 * 直接数字符串会把这 2 个 `<pre>` / 2 个 `<code>` 当成真标签 → **配对计数误报、构建被拦下**。
 * 而技术博客的文章名里出现 `<pre>` 是很正常的事 —— 一个会误报的门禁很快就会被关掉。
 *
 * ## 为什么也不能用「无条件把 `="..."` 整段删掉」这种朴素做法
 * 属性值的引号可以**不闭合**（模板拼接出错时就是这样）。无条件删除会把「未闭合引号之后的
 * 整份文档」一起吃掉 → **真正的未闭合 `<script>` 反而漏检**（假阴性，比误报更危险）。
 * 所以这里按标签的真实语法逐字符扫描：只有**确实闭合**的引号区才被当成属性值跳过；
 * 引号没闭合 / 标签没有 `>` 结束，都在扫描期直接报错。
 *
 * 返回 `{ tags, issues }`：
 *   - `tags`：真实标签数组（`start` / `end` 是文档下标，`raw` 是标签原文）
 *   - `issues`：扫描期发现的硬错误（格式与其它校验一致）
 */
function scanTags(html) {
  const tags = [];
  const issues = [];
  const fail = (item, expected, actual) => issues.push({ item, expected, actual });
  const lowerHtml = html.toLowerCase();

  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;
    i = lt;

    // 注释 / doctype / 处理指令：不是元素，整段跳过
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const end = html.indexOf('>', lt + 2);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    const closing = html[lt + 1] === '/';
    const nameStart = lt + (closing ? 2 : 1);
    const nameMatch = /^[A-Za-z][^\s/>]*/.exec(html.slice(nameStart, nameStart + 64));
    if (!nameMatch) {
      // 文本里未转义的裸 `<`：不是标签起点，跳过这个字符
      i = lt + 1;
      continue;
    }

    const name = nameMatch[0].toLowerCase();
    let cursor = nameStart + nameMatch[0].length;
    let quote = null;
    let quoteAt = -1;
    let selfClosing = false;
    let terminated = false;

    // 逐字符走完这个标签：在引号里时无条件跳过（属性值里的 `<` / `>` 都不是标记）
    while (cursor < html.length) {
      const ch = html[cursor];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
        quoteAt = cursor;
      } else if (ch === '>') {
        selfClosing = html[cursor - 1] === '/';
        cursor += 1;
        terminated = true;
        break;
      }
      cursor += 1;
    }

    if (!terminated) {
      if (quote) {
        fail(
          '属性引号配对',
          '属性值的引号必须两两配对（未闭合的引号会把其后整段标记吃掉）',
          `<${name}> 从第 ${quoteAt} 个字符起的 ${quote} 引号在文档结束前没有闭合`
        );
      } else {
        fail(
          '标签未闭合（缺 `>`）',
          '每个标签都以 `>` 结束',
          `<${name}> 从第 ${lt} 个字符起没有找到结束的 ` > ``
        );
      }
    }

    const end = terminated ? cursor : html.length;
    tags.push({ start: lt, end, raw: html.slice(lt, end), name, closing, selfClosing });

    // raw-text 元素：内容里不解析标签 → 直接跳到配对的结束标签（让下一轮把它当闭标签收下）
    if (terminated && !closing && !selfClosing && RAW_TEXT_ELEMENTS.has(name)) {
      const closeIdx = lowerHtml.indexOf(`</${name}`, cursor);
      i = closeIdx === -1 ? html.length : closeIdx;
    } else {
      i = end;
    }
  }

  return { tags, issues };
}

/**
 * 摘掉每个真标签里**被引号包住的属性值**（`="..."` / `='...'`），其余字节原样保留。
 *
 * 之后所有「结构计数」都在这份文本上做：`content="测试 <pre> 与 <code> 标签"` 里的
 * `<pre>` / `<code>` 就不会再被数成标签。标签之外的内容一个字节都不动 ——
 * 正文里的**裸** `<script>` / `<pre>` 仍然会被计数命中（那正是 P0 的检测面）。
 */
function stripAttributeValues(html, tags) {
  let out = '';
  let cursor = 0;
  for (const tag of tags) {
    out += html.slice(cursor, tag.start);
    out += tag.raw.replace(/"[^"]*"|'[^']*'/g, quote => quote[0] + quote[quote.length - 1]);
    cursor = tag.end;
  }
  return out + html.slice(cursor);
}

/**
 * 属性引号配对（第二道）。
 *
 * 扫描器只在「引号一直没闭合到文档末尾」时报错；这里再逐个标签数一遍引号，
 * 兜住「引号数为奇数、却恰好被后文另一个引号凑成对」的形态。
 *
 * ⚠️ **刻意只数标签内部的引号，不数整份文档**（CTO 的原始表述是「双引号总数」）。
 * 文档级的计数会误报：`/` 与 `'` 在**正文文本**里是合法字符，而 markdown-it 只转义
 * `& < > "`，**不转义 `'`** —— 正文里写一句 `don't` 就会让单引号总数变成奇数。
 * 本仓产物还常驻 18 个单引号（`index.html` 里防 FOUC 的内联脚本：`'blog-theme'` 等），
 * 它们同样在标签之外。只数**属性区**既符合「属性引号配对」的原意，也不会误报。
 */
function verifyAttributeQuotes(tags) {
  const issues = [];
  for (const tag of tags) {
    for (const quote of ['"', "'"]) {
      const count = countChar(tag.raw, quote);
      if (count % 2 !== 0) {
        issues.push({
          item: '属性引号配对',
          expected: `每个标签内部的 ${quote} 引号两两配对`,
          actual: `<${tag.name}> 里有 ${count} 个 ${quote}（奇数）`
        });
      }
    }
  }
  return issues;
}

/** 去标签 / 去注释 / 解实体后的可见文本长度 */
function visibleTextLength(html) {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:lt|gt|amp|quot|#39|nbsp);/g, 'x')
    .replace(/&#?\w+;/g, 'x');
  return text.trim().length;
}

/**
 * 取 `<body>` 的内容。
 * ⚠️ 不能复用 `extractDivContent` —— body 的结束标签是 `</body>` 而不是 `</div>`，
 * 用 div 深度计数永远等不到 depth 归零（会误报「找不到 </body>」）。
 */
function extractBodyContent(html) {
  const open = /<body(?=[\s>])[^>]*>/i.exec(html);
  if (!open) return null;

  const closeIdx = html.lastIndexOf('</body>');
  if (closeIdx === -1 || closeIdx < open.index) return null;

  return html.slice(open.index + open[0].length, closeIdx);
}

/**
 * 取某个 **div** 元素的内容（用 div 深度计数定位配对的那个 `</div>`）。
 * 比「取最后一个 `</div>`」可靠：`#app` 后面还可能有别的兄弟节点。
 */
function extractDivContent(html, openTagRe) {
  const match = openTagRe.exec(html);
  if (!match) return null;

  const start = match.index + match[0].length;
  let depth = 1;
  const tagRe = /<(\/?)div(?=[\s/>])[^>]*>/gi;
  tagRe.lastIndex = start;

  let hit;
  while ((hit = tagRe.exec(html)) !== null) {
    if (hit[1] === '/') {
      depth -= 1;
      if (depth === 0) return html.slice(start, hit.index);
    } else if (!hit[0].endsWith('/>')) {
      depth += 1;
    }
  }
  return null;
}

/** 递归收集所有 `.html` 产物，返回仓库相对路径（正斜杠） */
function collectHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectHtmlFiles(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * 单个文件的全部校验。返回 issue 数组：
 * `{ item, expected, actual }`
 */
function verifyHtml(html) {
  const issues = [];
  const fail = (item, expected, actual) => issues.push({ item, expected, actual });

  // 0. 先扫出真标签，并据此得到「摘掉属性值」的标记文本。
  //    下面所有**结构计数**都在 `markup` 上做 —— 只看真正的标签区，属性值里的
  //    `<pre>` / `<code>` 这类文本不再参与计数。扫描期发现的硬错误（属性引号未闭合 /
  //    标签缺 `>`）直接并入 issues。
  const { tags, issues: scanIssues } = scanTags(html);
  issues.push(...scanIssues, ...verifyAttributeQuotes(tags));
  const markup = stripAttributeValues(html, tags);

  // 1. 标签配对
  for (const tag of PAIRED_ELEMENTS) {
    const open = countOpen(markup, tag);
    const close = countClose(markup, tag);
    if (open !== close) {
      fail(
        `标签配对 <${tag}>`,
        `<${tag}> 与 </${tag}> 数量相等`,
        // 缺闭标签时把「多出来的是哪个」说清楚，方便直接定位
        `开 ${open} 个 / 闭 ${close} 个（${open > close ? `缺 ${open - close} 个 </${tag}>` : `多 ${close - open} 个 </${tag}>`}）`
      );
    }
  }

  // 2. 自闭合的 script/style：HTML 解析器忽略该斜杠 → 与未闭合等价，同样致命
  for (const tag of ['script', 'style']) {
    const selfClosing = countMatches(markup, `<${tag}(?=[\\s/>])[^>]*\\/>`, 'gi');
    if (selfClosing > 0) {
      fail(
        `自闭合 <${tag}>`,
        '非 void 元素不得写成自闭合',
        `出现 ${selfClosing} 个 <${tag} ... />（HTML 会忽略斜杠，等价于未闭合）`
      );
    }
  }

  // 3. 恰好 1 个 <title> 且内容非空
  const titleOpen = countOpen(markup, 'title');
  if (titleOpen !== 1) fail('<title> 数量', '恰好 1 个', `${titleOpen} 个`);

  const titleContent = /<title(?=[\s>])[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!titleContent) {
    fail('<title> 内容', '存在且非空', '找不到 <title>...</title>（可能被 raw-text 元素吞掉了）');
  } else if (titleContent[1].trim().length === 0) {
    fail('<title> 内容', '非空', '内容为空白');
  }

  // 4. <body> 存在且非空壳
  const bodyContent = extractBodyContent(html);
  if (bodyContent === null) {
    fail('<body>', '存在且闭合', '找不到 <body>...</body>');
  } else {
    if (visibleTextLength(bodyContent) === 0) {
      fail(
        '<body> 内容',
        '有可见文本（非空壳）',
        `去标签后文本长度为 0（原始 ${bodyContent.trim().length} 字节）`
      );
    }
  }

  // 5. #app 存在且内容长度 > 0
  const appContent = extractDivContent(html, /<div[^>]*\bid="app"[^>]*>/i);
  if (appContent === null) {
    fail('<div id="app">', '存在且闭合', '找不到 <div id="app">...</div>');
  } else {
    const trimmed = appContent.trim();
    if (trimmed.length === 0) {
      fail('<div id="app"> 内容', '内容长度 > 0', '为空（客户端会闪一帧空白，预渲染收益为 0）');
    } else if (visibleTextLength(appContent) === 0) {
      fail(
        '<div id="app"> 内容',
        '有可见文本',
        `内容 ${trimmed.length} 字节但去标签后文本长度为 0`
      );
    }
  }

  // 6. 文档骨架完整
  if (!/^<!doctype html>/im.test(html)) fail('<!doctype html>', '文档以 doctype 开头', '缺失');
  if (countOpen(markup, 'html') === 0) fail('<html>', '存在', '缺失');
  if (countOpen(markup, 'head') === 0) fail('<head>', '存在', '缺失');
  if (countClose(markup, 'body') === 0) fail('</body>', '存在', '缺失');
  if (countClose(markup, 'html') === 0) fail('</html>', '存在', '缺失');
  if (visibleTextLength(html) === 0) fail('文档可见文本', '全文非空', '去标签后文本长度为 0');

  // 7. 文档级的 charset / viewport 各**恰好一份**
  //
  //    外壳 `index.html` 与 unhead 都声明过这两样（unhead 的 `createHead()` 默认塞
  //    `DEFAULT_INIT`），产物里曾各出现两次、且 `initial-scale` 一个 `1.0` 一个 `1`。
  //    `src/entry-server.ts` 已改 `disableDefaults: true` 让外壳独占，这里加一道防回归。
  //
  //    ⚠️ 这两项必须在**标签列表**上数，不能在 `markup` 上数字符串：
  //    `markup` 里的属性值已被清空（`<meta name="" content="">`），
  //    `name="viewport"` 这个字面量已经不存在了。按标签数反而更准 ——
  //    属性值里出现 `<meta name="viewport"` 这种文本不会被误命中。
  const metaTags = tags.filter(tag => !tag.closing && tag.name === 'meta');
  const charsetCount = metaTags.filter(tag => /^<meta\s+charset[\s=]/i.test(tag.raw)).length;
  if (charsetCount !== 1) fail('<meta charset> 数量', '恰好 1 个', `${charsetCount} 个`);

  const viewportCount = metaTags.filter(tag => /name\s*=\s*"viewport"/i.test(tag.raw)).length;
  if (viewportCount !== 1) fail('<meta name="viewport"> 数量', '恰好 1 个', `${viewportCount} 个`);

  // 8. JSON-LD（`<script type="application/ld+json">`）必须真的是合法 JSON，且内容里不能有裸 `<`
  //
  //    两条都源自同一个理由：`<script>` 是 raw-text 元素，JSON 里出现 `</script` 会让解析器
  //    **提前关闭脚本**（第 1 项的配对检查能抓到那种情况，但抓不到「JSON 被写坏」）。
  //    这里刻意**真的 JSON.parse 一遍**，而不是用正则目测 —— P0 的教训就是「只看文本看不出来」。
  const jsonLdBlocks =
    html.match(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/g) ?? [];
  for (const block of jsonLdBlocks) {
    const body = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');

    if (body.includes('<')) {
      fail('JSON-LD 裸 <', '内容里的 `<` 应转义成 \\u003c', '发现未转义的 `<`');
    }

    try {
      JSON.parse(body);
    } catch (error) {
      fail('JSON-LD 可解析', 'JSON.parse 成功', `解析失败：${error.message}`);
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 站点级元文件（rss.xml / sitemap.xml / robots.txt）
//
// ⚠️ 项目禁止新增依赖，所以这里**不引入 XML 解析库**，自己走一遍标签做结构校验。
// 它覆盖不了 DTD / 自定义实体 / 命名空间语义，但足以拦住「转义漏了、标签没闭合、
// 属性没加引号」这三类会真正把 feed 打坏的错误。
// ---------------------------------------------------------------------------

const SITE_FILES = [RSS_FILE, SITEMAP_FILE, ROBOTS_FILE];

/** `&` 之后必须是这几个实体之一，否则就是裸 `&`（XML 里非法） */
const XML_ENTITY_RE = /^&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/;

/** 找出所有不是合法实体的 `&`，返回可读片段（进「实际」一栏，便于直接定位） */
function findBareAmpersands(xml) {
  const hits = [];
  for (let i = 0; i < xml.length; i += 1) {
    if (xml.charCodeAt(i) !== 0x26 /* & */) continue;
    if (XML_ENTITY_RE.test(xml.slice(i, i + 12))) continue;
    hits.push(xml.slice(i, i + 40).split('\n')[0]);
  }
  return hits;
}

/** 属性段必须是 `name="value"` / `name='value'` 序列；值不带引号会被解析器截断 */
const XML_ATTRS_RE = /^(?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*\s*$/;

/**
 * XML 结构自检：标签配对 + 属性带引号 + 文本节点无裸 `<` + 无裸 `&`。
 * 返回 issue 数组（格式与 HTML 校验一致）。
 */
function verifyXmlStructure(xml) {
  const issues = [];
  const fail = (item, expected, actual) => issues.push({ item, expected, actual });

  const bare = findBareAmpersands(xml);
  if (bare.length > 0) {
    fail(
      '裸 `&`',
      '每个 `&` 都写成实体（&amp; / &lt; / &gt; / &quot; / &apos; / &#NN;）',
      `${bare.length} 处，例如 ${JSON.stringify(bare[0])}`
    );
  }

  // 声明 / 注释 / CDATA 都不是元素，先摘掉再扫标签
  const stripped = xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '');

  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  const stack = [];
  let cursor = 0;
  let match;
  let broken = false;

  while ((match = tagRe.exec(stripped)) !== null) {
    // 两个标签之间的文本里出现 `<` ⇒ 没转义（正常应写成 &lt;）
    const gap = stripped.slice(cursor, match.index);
    if (gap.includes('<')) {
      fail(
        '文本节点里的裸 `<`',
        '文本里的 `<` 应写成 &lt;',
        JSON.stringify(gap.trim().slice(0, 40))
      );
      broken = true;
      break;
    }
    cursor = tagRe.lastIndex;

    const [, closing, name, attrs, selfClosing] = match;

    if (!XML_ATTRS_RE.test(attrs)) {
      fail(
        `<${name}> 的属性形态`,
        '属性写成 name="value"（值必须带引号）',
        JSON.stringify(attrs.trim().slice(0, 60))
      );
      broken = true;
      break;
    }

    if (closing) {
      const opened = stack.pop();
      if (opened !== name) {
        fail(
          '标签配对',
          `</${name}> 应与栈顶的 <${opened ?? '(空)'}> 对应`,
          `遇到 </${name}> 时栈顶是 <${opened ?? '(空)'}>`
        );
        broken = true;
        break;
      }
    } else if (!selfClosing) {
      stack.push(name);
    }
  }

  if (!broken) {
    const tail = stripped.slice(cursor);
    if (tail.includes('<')) {
      fail('文本节点里的裸 `<`', '文本里的 `<` 应写成 &lt;', '文档尾部有未转义的 `<`');
    }
    if (stack.length > 0) {
      fail('未闭合标签', '所有开标签都有对应闭标签', `未闭合：${stack.join('、')}`);
    }
  }

  return issues;
}

/** 取 `<tag>...</tag>` 的内容（第一次出现）。没有则返回 null */
function firstTagContent(xml, tag) {
  const match = new RegExp(`<${tag}(?=[\\s>])[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? match[1] : null;
}

function verifyRss(xml) {
  const issues = [...verifyXmlStructure(xml)];
  const fail = (item, expected, actual) => issues.push({ item, expected, actual });

  if (!/<rss\s+[^>]*version="2\.0"/.test(xml)) {
    fail('<rss version="2.0">', '根元素是 RSS 2.0', '找不到 `<rss version="2.0">`');
  }
  if (!xml.includes('xmlns:atom="http://www.w3.org/2005/Atom"')) {
    fail('xmlns:atom', '声明 Atom 命名空间（`<atom:link>` 要用）', '缺失');
  }

  const channelCount = countMatches(xml, '<channel(?=[\\s>])', 'g');
  if (channelCount !== 1) fail('<channel> 数量', '恰好 1 个', `${channelCount} 个`);

  for (const tag of ['title', 'link', 'description', 'language', 'lastBuildDate']) {
    const content = firstTagContent(xml, tag);
    if (content === null) fail(`<channel><${tag}>`, '存在且非空', '缺失');
    else if (content.trim() === '') fail(`<channel><${tag}>`, '存在且非空', '内容为空白');
  }

  const selfLink = [...xml.matchAll(/<atom:link\s([^>]*)\/>/g)]
    .map(m => m[1])
    .find(attrs => /rel="self"/.test(attrs));
  if (!selfLink) {
    fail('<atom:link rel="self">', '存在（标准推荐：feed 声明自己的绝对地址）', '缺失');
  } else {
    if (!/type="application\/rss\+xml"/.test(selfLink)) {
      fail('<atom:link> 的 type', 'application/rss+xml', JSON.stringify(selfLink.slice(0, 60)));
    }
    const href = /href="([^"]*)"/.exec(selfLink)?.[1] ?? '';
    if (!href.endsWith(`/${RSS_FILE}`)) {
      fail('<atom:link> 的 href', `以 /${RSS_FILE} 结尾的地址`, JSON.stringify(href));
    }
  }

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
  if (items.length === 0) {
    fail('<item> 数量', `1 ~ ${FEED_ITEM_LIMIT} 条`, '0 条（feed 是空的）');
  } else if (items.length > FEED_ITEM_LIMIT) {
    fail('<item> 数量', `不超过 ${FEED_ITEM_LIMIT} 条`, `${items.length} 条`);
  }

  items.forEach((item, index) => {
    const at = `第 ${index + 1} 条 <item>`;

    const title = (firstTagContent(item, 'title') ?? '').trim();
    if (!title) fail(`${at} <title>`, '存在且非空', '缺失或为空白');

    const link = (firstTagContent(item, 'link') ?? '').trim();
    if (!/^https?:\/\//i.test(link)) {
      fail(`${at} <link>`, '绝对地址（http/https）', JSON.stringify(link) || '缺失');
    }

    const guidMatch = /<guid\s[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/.exec(item);
    if (!guidMatch) {
      fail(`${at} <guid isPermaLink="true">`, '存在', '缺失');
    } else if (guidMatch[1].trim() !== link) {
      fail(
        `${at} <guid> 与 <link>`,
        'isPermaLink="true" 时两者必须是同一个绝对地址',
        `guid=${JSON.stringify(guidMatch[1].trim())} / link=${JSON.stringify(link)}`
      );
    }

    const pubDate = (firstTagContent(item, 'pubDate') ?? '').trim();
    if (!pubDate) {
      fail(`${at} <pubDate>`, '存在', '缺失（frontmatter 的日期写法解析不出来？）');
    } else {
      const parsed = new Date(pubDate);
      if (Number.isNaN(parsed.getTime()) || parsed.toUTCString() !== pubDate) {
        fail(
          `${at} <pubDate>`,
          '合法 RFC 1123 且星期与日期自洽，如 `Mon, 14 Sep 2026 10:00:00 GMT`',
          JSON.stringify(pubDate)
        );
      }
    }
  });

  return issues;
}

function verifySitemap(xml) {
  const issues = [...verifyXmlStructure(xml)];
  const fail = (item, expected, actual) => issues.push({ item, expected, actual });

  if (!/<urlset\s+[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(xml)) {
    fail('<urlset xmlns="...">', 'sitemap 0.9 命名空间', '缺失或写错');
  }

  const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(m => m[1].trim());
  if (locs.length === 0) {
    fail('<loc> 数量', '> 0', '0 个（sitemap 是空的）');
    return { issues, hasAbsoluteLoc: false };
  }

  const absolute = locs.filter(loc => /^https?:\/\//i.test(loc));
  const rooted = locs.filter(loc => loc.startsWith('/'));
  const malformed = locs.filter(loc => !/^https?:\/\//i.test(loc) && !loc.startsWith('/'));
  const notRoutable = locs.filter(loc => loc.includes('undefined'));

  if (malformed.length > 0) {
    fail(
      '<loc> 形态',
      '绝对地址（`siteConfig.url` 已配置）或根相对路径（未配置时的降级形态）',
      `${malformed.length} 个非法：${JSON.stringify(malformed[0])}`
    );
  }
  if (absolute.length > 0 && rooted.length > 0) {
    fail(
      '<loc> 混用',
      '要么全是绝对地址、要么全是根相对路径（同一份 sitemap 里不能混）',
      `${absolute.length} 个绝对 / ${rooted.length} 个根相对`
    );
  }
  if (notRoutable.length > 0) {
    fail('<loc> 含 undefined', '路径里不应出现 `undefined`', JSON.stringify(notRoutable[0]));
  }

  const duplicated = [...new Set(locs.filter((loc, i) => locs.indexOf(loc) !== i))];
  if (duplicated.length > 0) {
    fail('<loc> 唯一性', '每个 URL 只出现一次', `重复 ${duplicated.length} 个：${duplicated[0]}`);
  }

  const notFoundEntry = locs.find(loc => loc.endsWith('/404.html'));
  if (notFoundEntry) {
    fail(
      '<loc> 不应包含 404 产物',
      '404 页是给 nginx `error_page` 用的，不是可索引页面',
      JSON.stringify(notFoundEntry)
    );
  }

  for (const match of xml.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/g)) {
    const value = match[1].trim();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    ) {
      fail('<lastmod> 形态', 'YYYY-MM-DD（或完整 ISO 8601）', JSON.stringify(value));
    }
  }

  return { issues, hasAbsoluteLoc: absolute.length > 0 };
}

function verifyRobots(text, sitemapHasAbsoluteLoc) {
  const issues = [];
  const fail = (item, expected, actual) => issues.push({ item, expected, actual });

  if (!/^User-agent:\s*\*/m.test(text)) {
    fail('`User-agent: *`', '存在（允许全站抓取）', '缺失');
  }
  if (!/^Allow:\s*\/\s*$/m.test(text)) {
    fail('`Allow: /`', '存在', '缺失');
  }

  const sitemapLines = [...text.matchAll(/^Sitemap:\s*(\S*)\s*$/gm)].map(m => m[1]);

  /*
   * `Sitemap:` 行与 sitemap 的 `<loc>` 形态**必须一致**：
   * 两者都取决于 `siteConfig.url` 是否配置（未配置 ⇒ `absoluteUrl` 降级成根相对路径，
   * 而 robots 的 Sitemap 按规范只能是绝对地址 ⇒ 那一行必须整行省略）。
   * 门禁不去解析 TS 配置，而是从产物本身反推这个前提 —— 更简单，也更接近真实行为。
   */
  if (sitemapHasAbsoluteLoc) {
    if (sitemapLines.length === 0) {
      fail(
        '`Sitemap:` 行',
        'sitemap 的 <loc> 是绝对地址 ⇒ robots 必须给出 Sitemap 行',
        '一条都没有'
      );
    } else if (!/^https?:\/\//i.test(sitemapLines[0])) {
      fail('`Sitemap:` 行', '绝对地址', JSON.stringify(sitemapLines[0]));
    } else if (!sitemapLines[0].endsWith(`/${SITEMAP_FILE}`)) {
      fail('`Sitemap:` 行', `指向 /${SITEMAP_FILE}`, JSON.stringify(sitemapLines[0]));
    }
  } else if (sitemapLines.length > 0 && !/^https?:\/\//i.test(sitemapLines[0])) {
    fail(
      '`Sitemap:` 行',
      'siteConfig.url 未配置时不应输出（或必须是绝对地址）',
      JSON.stringify(sitemapLines[0])
    );
  }

  return issues;
}

/** 统一输出格式：文件 + 逐条「校验项 / 期望 / 实际」 */
function reportFile(rel, issues) {
  console.log(`✗ ${rel}`);
  for (const issue of issues) {
    console.log(`    · ${issue.item}`);
    console.log(`        期望：${issue.expected}`);
    console.log(`        实际：${issue.actual}`);
  }
  console.log('');
}

function readSiteFile(name) {
  const full = join(PUBLIC_DIR, name);
  try {
    statSync(full);
  } catch {
    return null;
  }
  return readFileSync(full, 'utf8');
}

function main() {
  // ⚠️ `.output` 是构建产物目录：没构建过就直接失败，避免误判成「没有页面 = 通过」
  try {
    statSync(PUBLIC_DIR).isDirectory();
  } catch {
    console.error(`✗ 找不到产物目录 ${relative(ROOT, PUBLIC_DIR)}`);
    console.error('  先运行 `pnpm build-only`（或 `pnpm build`）生成产物，再跑本门禁。');
    process.exit(1);
  }

  const files = collectHtmlFiles(PUBLIC_DIR).sort();
  if (files.length === 0) {
    console.error(`✗ ${relative(ROOT, PUBLIC_DIR)} 下没有任何 .html 产物`);
    process.exit(1);
  }

  console.log('构建后产物门禁（HTML 结构校验）');
  console.log(`产物目录：${relative(ROOT, PUBLIC_DIR)}`);
  console.log(`发现 ${files.length} 个 HTML 产物\n`);

  const failed = [];

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const html = readFileSync(file, 'utf8');
    const issues = verifyHtml(html);

    if (issues.length === 0) continue;

    failed.push({ rel, issues });
    reportFile(rel, issues);
  }

  // ---- 站点级元文件 ----
  console.log('站点级元文件（rss.xml / sitemap.xml / robots.txt）\n');

  const siteFailed = [];
  const sitemapXml = readSiteFile(SITEMAP_FILE);

  // sitemap 先跑：robots 的 Sitemap 行要按它的 <loc> 形态判断
  let sitemapHasAbsoluteLoc = false;

  for (const name of SITE_FILES) {
    const content = name === SITEMAP_FILE ? sitemapXml : readSiteFile(name);

    if (content === null) {
      const issues = [
        {
          item: '文件存在',
          expected: `${name} 应作为静态资源产出到产物根目录`,
          actual: '找不到该文件（页脚 / 关于页的 RSS 链接会变成 404）'
        }
      ];
      siteFailed.push({ rel: name, issues });
      reportFile(name, issues);
      continue;
    }

    let issues = [];

    if (name === RSS_FILE) {
      issues = verifyRss(content);
    } else if (name === SITEMAP_FILE) {
      const result = verifySitemap(content);
      issues = result.issues;
      sitemapHasAbsoluteLoc = result.hasAbsoluteLoc;
    } else if (name === ROBOTS_FILE) {
      issues = verifyRobots(content, sitemapHasAbsoluteLoc);
    }

    if (issues.length === 0) {
      // 报**字节数**（Content-Length 的量纲），不是 JS 字符串长度 ——
      // 中文在 UTF-8 里占 3 字节，用 `.length` 会小三分之一，对不上 curl 的结果
      console.log(`✓ ${name}（${Buffer.byteLength(content)} 字节）`);
      continue;
    }

    siteFailed.push({ rel: name, issues });
    reportFile(name, issues);
  }

  const total = files.length + SITE_FILES.length;
  const failCount = failed.length + siteFailed.length;
  const passed = total - failCount;

  console.log('─'.repeat(56));
  console.log(`汇总：通过 ${passed} / ${total} 个文件，失败 ${failCount} 个`);
  if (failCount > 0) {
    const names = [...failed, ...siteFailed].map(f => f.rel);
    console.log(`失败文件：${names.join('、')}`);
    console.log('\n✗ 门禁未通过：产物不合法，**不要部署**。');
    process.exit(1);
  }

  console.log('✓ 门禁通过：全部产物标签配对、title 唯一且非空、#app 有内容。');
  console.log(
    '  （标签配对在**摘掉属性值**的标记上做：`content="测试 <pre> 标签"` 不会再误报；' +
      '正文里的裸 `<script>` / `<pre>` 仍会被命中）'
  );
  console.log('  （另含：属性引号两两配对、标签都以 `>` 结束）');
  console.log('  （另含：charset/viewport 去重后各 1 个、JSON-LD 可 JSON.parse 且无裸 `<`）');
  console.log(
    '  （另含：rss.xml / sitemap.xml / robots.txt 存在且 XML 结构、转义、日期、绝对地址均合法）'
  );
  console.log('  提醒：结构校验不能替代真实浏览器验证（DOM / 水合警告才是权威）。');
}

main();
