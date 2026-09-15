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
 *   2. 无自闭合 `<script ... />`（HTML 解析器忽略该斜杠，与不闭合等价致命）
 *   3. 恰好 1 个 `<title>`，且内容非空
 *   4. `<body>` 存在且非空壳（`#app` 内有实际内容）
 *   5. `<div id="app">` 存在，且其内容长度 > 0、去标签后有实际文本
 *   6. 文档骨架完整：`<!doctype html>` / `<html>` / `<head>` / `</body>` / `</html>`
 *   7. `<meta charset>` 与 `<meta name="viewport">` 各**恰好 1 个**（外壳与 unhead 都声明过）
 *   8. JSON-LD 块能 `JSON.parse`、且内容里没有裸 `<`（同样会让 raw-text 元素提前闭合）
 *
 * 任何一项失败 → **exit 1**，并逐条打印「文件 / 校验项 / 期望 / 实际」。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  // 1. 标签配对
  for (const tag of PAIRED_ELEMENTS) {
    const open = countOpen(html, tag);
    const close = countClose(html, tag);
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
    const selfClosing = countMatches(html, `<${tag}(?=[\\s/>])[^>]*\\/>`, 'gi');
    if (selfClosing > 0) {
      fail(
        `自闭合 <${tag}>`,
        '非 void 元素不得写成自闭合',
        `出现 ${selfClosing} 个 <${tag} ... />（HTML 会忽略斜杠，等价于未闭合）`
      );
    }
  }

  // 3. 恰好 1 个 <title> 且内容非空
  const titleOpen = countOpen(html, 'title');
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
  if (countOpen(html, 'html') === 0) fail('<html>', '存在', '缺失');
  if (countOpen(html, 'head') === 0) fail('<head>', '存在', '缺失');
  if (countClose(html, 'body') === 0) fail('</body>', '存在', '缺失');
  if (countClose(html, 'html') === 0) fail('</html>', '存在', '缺失');
  if (visibleTextLength(html) === 0) fail('文档可见文本', '全文非空', '去标签后文本长度为 0');

  // 7. 文档级的 charset / viewport 各**恰好一份**
  //
  //    外壳 `index.html` 与 unhead 都声明过这两样（unhead 的 `createHead()` 默认塞
  //    `DEFAULT_INIT`），产物里曾各出现两次、且 `initial-scale` 一个 `1.0` 一个 `1`。
  //    `src/entry-server.ts` 已改 `disableDefaults: true` 让外壳独占，这里加一道防回归。
  //    用 `<meta charset[\\s=]` 卡边界（属性写法的 `=` 也算），避免误命中别的标签
  const charsetCount = countMatches(html, '<meta charset[\\s=]', 'gi');
  if (charsetCount !== 1) fail('<meta charset> 数量', '恰好 1 个', `${charsetCount} 个`);

  const viewportCount = countMatches(html, '<meta name="viewport"', 'gi');
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
    console.log(`✗ ${rel}`);
    for (const issue of issues) {
      console.log(`    · ${issue.item}`);
      console.log(`        期望：${issue.expected}`);
      console.log(`        实际：${issue.actual}`);
    }
    console.log('');
  }

  const passed = files.length - failed.length;
  console.log('─'.repeat(56));
  console.log(`汇总：通过 ${passed} / ${files.length} 个文件，失败 ${failed.length} 个`);
  if (failed.length > 0) {
    console.log(`失败文件：${failed.map(f => f.rel).join('、')}`);
    console.log('\n✗ 门禁未通过：产物结构不合法，**不要部署**。');
    process.exit(1);
  }

  console.log('✓ 门禁通过：全部产物标签配对、title 唯一且非空、#app 有内容。');
  console.log('  （另含：charset/viewport 去重后各 1 个、JSON-LD 可 JSON.parse 且无裸 `<`）');
  console.log('  提醒：结构校验不能替代真实浏览器验证（DOM / 水合警告才是权威）。');
}

main();
