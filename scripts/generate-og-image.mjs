#!/usr/bin/env node
/**
 * 生成默认社交分享图 `public/images/og-default.png`（1200×630）。
 *
 * ## 为什么要有这个脚本（而不是只放一张图）
 * `og:image` **必须是真实存在的位图**：Twitter / Facebook / 微信的抓取器都不解析 SVG，
 * 拿不到像素就整张卡片没图。而本项目**禁止新增依赖**（pnpm store 里 sass-embedded 的副本
 * 是坏的，`pnpm install` 会让构建假死），装不了 sharp / canvas 之类的图形库。
 *
 * 所以这里用 Node 内置的 `node:zlib` 手写一个最小 PNG 编码器：PNG 无非是
 * `IHDR + IDAT(zlib 压缩的扫描线) + IEND` 三个块，每块自带 CRC32。
 *
 * ## 图里是什么
 * 与 `public/images/banner.svg` 同一套配色与构图（深蓝对角渐变 + 主题色 `#49b1f5` 光晕 +
 * 紫色辅光 + 斜向细线 + 柔和光斑 + 中部高光带），只是重排到 1200×630 的卡片比例。
 *
 * ⚠️ **图里没有文字**：本机没有可用的字体文件，也没有栅格化字体的手段（无依赖可用）。
 * 所以这是一张「品牌感的抽象底图」，不是带站点名的设计稿。想换成带文字的卡片，请用设计
 * 工具另做一张 1200×630 的 PNG/JPG 覆盖同名文件即可（`siteConfig.ogImage` 与
 * `src/composables/useSeo.ts` 里的 1200×630 声明无需改动）。
 *
 * 用法：`node scripts/generate-og-image.mjs`（**不要**接进 `pnpm build`，否则每次构建都
 * 重写这个二进制文件、给 git 制造噪声）。生成后会自检一遍：块 CRC、IHDR、IDAT 解压长度。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'images',
  'og-default.png'
);

/** 分享卡片的尺寸契约，与 `src/composables/useSeo.ts` 的 OG_IMAGE_* 必须一致 */
const WIDTH = 1200;
const HEIGHT = 630;
/** 每像素字节数（RGB，无 alpha：分享图不需要透明） */
const BPP = 3;

/* ------------------------------------------------------------------ 构图数据 */

/** 对角渐变（与 banner.svg 的 `bg` 同色标） */
const STOPS = [
  { at: 0, color: [0x0b, 0x1b, 0x2b] },
  { at: 0.45, color: [0x12, 0x32, 0x4b] },
  { at: 1, color: [0x1d, 0x4b, 0x63] }
];

/** 两团径向光晕：主题色 + 紫色辅光（`glow-a` / `glow-b`） */
const GLOWS = [
  { cx: 0.22, cy: 0.28, r: 0.62, color: [0x49, 0xb1, 0xf5], alpha: 0.55 },
  { cx: 0.82, cy: 0.78, r: 0.55, color: [0x7f, 0x5a, 0xf0], alpha: 0.45 }
];

/** 斜向细线：给大面积渐变一点纹理（banner.svg 里那四条 path，按 1200×630 重排） */
const LINES = [
  [-75, 574, 675, -42],
  [45, 630, 795, 14],
  [180, 644, 930, 28],
  [1065, 658, 1215, 532]
];

/** 柔和光斑（三个 circle 的去色版本，用白色低透明度叠出来） */
const DOTS = [
  { cx: 885, cy: 154, r: 98, alpha: 0.05 },
  { cx: 990, cy: 231, r: 50, alpha: 0.05 },
  { cx: 225, cy: 490, r: 126, alpha: 0.04 }
];

/** 中部高光带（banner.svg 的 `streak`：竖向 430→550 的横条，左右淡出） */
const STREAK = { top: 301, height: 84, alpha: 0.16 };

/* ------------------------------------------------------------------ 绘制 */

const clamp01 = value => (value < 0 ? 0 : value > 1 ? 1 : value);

/** 在两点之间取色（线性插值，模拟 SVG 的 multi-stop 渐变） */
function sampleStops(t) {
  const x = clamp01(t);
  for (let i = 0; i < STOPS.length - 1; i += 1) {
    const from = STOPS[i];
    const to = STOPS[i + 1];
    if (x <= to.at) {
      const k = (x - from.at) / (to.at - from.at);
      return [
        from.color[0] + (to.color[0] - from.color[0]) * k,
        from.color[1] + (to.color[1] - from.color[1]) * k,
        from.color[2] + (to.color[2] - from.color[2]) * k
      ];
    }
  }
  const last = STOPS[STOPS.length - 1];
  return [...last.color];
}

/** source-over 合成（只关心 RGB，图不透明） */
function over(base, color, alpha) {
  const a = clamp01(alpha);
  return [
    base[0] + (color[0] - base[0]) * a,
    base[1] + (color[1] - base[1]) * a,
    base[2] + (color[2] - base[2]) * a
  ];
}

/** 点到线段的最短距离（画斜线用） */
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : clamp01(((px - x1) * dx + (py - y1) * dy) / lengthSq);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** 渲染成**未过滤**的 RGB 像素数据（行过滤在 `filterRows` 里做） */
function render() {
  const raw = Buffer.alloc(HEIGHT * WIDTH * BPP);
  const white = [255, 255, 255];
  // 光晕的竖向距离按高度归一化，避免在 16:9 变成椭圆
  const yScale = HEIGHT / WIDTH;
  const halfStroke = 1.1;

  for (let y = 0; y < HEIGHT; y += 1) {
    const v = y / (HEIGHT - 1);
    let offset = y * WIDTH * BPP;

    for (let x = 0; x < WIDTH; x += 1) {
      const u = x / (WIDTH - 1);

      let rgb = sampleStops((u + v) / 2);

      for (const glow of GLOWS) {
        const d = Math.hypot(u - glow.cx, (v - glow.cy) * yScale) / glow.r;
        if (d < 1) rgb = over(rgb, glow.color, glow.alpha * (1 - d));
      }

      for (const dot of DOTS) {
        const coverage = clamp01(dot.r + 0.5 - Math.hypot(x - dot.cx, y - dot.cy));
        if (coverage > 0) rgb = over(rgb, white, dot.alpha * coverage);
      }

      for (const [x1, y1, x2, y2] of LINES) {
        const coverage = clamp01(halfStroke + 0.5 - distanceToSegment(x, y, x1, y1, x2, y2));
        if (coverage > 0) rgb = over(rgb, white, 0.06 * coverage);
      }

      const streakEnd = STREAK.top + STREAK.height;
      if (y >= STREAK.top && y < streakEnd) {
        // 左右各淡出一半，中间最亮
        const fade = u <= 0.5 ? u * 2 : (1 - u) * 2;
        rgb = over(rgb, white, STREAK.alpha * fade);
      }

      raw[offset] = Math.round(rgb[0]);
      raw[offset + 1] = Math.round(rgb[1]);
      raw[offset + 2] = Math.round(rgb[2]);
      offset += BPP;
    }
  }

  return raw;
}

/* ------------------------------------------------------------------ PNG 编码 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** 一个 PNG 块：`长度(4) + 类型(4) + 数据 + CRC32(4)`，CRC 覆盖「类型 + 数据」 */
function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 2; // 颜色类型 2 = truecolor RGB
  ihdr[10] = 0; // 压缩方法（只有 0 = deflate）
  ihdr[11] = 0; // 过滤方法（只有 0）
  ihdr[12] = 0; // 非隔行

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG 签名
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(filterRows(pixels), { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

/* ------------------------------------------------------------------ 行过滤 */

/**
 * Paeth 预测器（PNG 规范 9.4 节的定义）。
 *
 * ⚠️ 注意这是**逐字节**的：PNG 里"左边/上边"的单位都是字节，通道交错不影响这个算法
 * （`bpp` 只决定回看几个字节）。
 */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * 逐行挑过滤方式（PNG 允许每行不同），判据是规范推荐的最小绝对差和。
 *
 * 这张图是「对角渐变 + 两团径向光晕 + 少量细线」的混合内容：渐变行适合 Sub、
 * 纯色行适合 Up、径向渐变适合 Paeth。固定选一种会白白丢掉可观压缩率
 * （实测固定 Sub 236.8 KB，逐行自适应 **119.9 KB**，省一半）。
 */
function filterRows(pixels) {
  const stride = WIDTH * BPP;
  const candidates = [0, 1, 2, 3, 4].map(type => ({ type, row: Buffer.alloc(stride) }));
  const raw = Buffer.alloc(HEIGHT * (1 + stride));

  for (let y = 0; y < HEIGHT; y += 1) {
    const current = y * stride;
    const above = current - stride;

    for (const candidate of candidates) {
      const { type, row } = candidate;
      let score = 0;

      for (let i = 0; i < stride; i += 1) {
        const left = i >= BPP ? pixels[current + i - BPP] : 0;
        const up = y > 0 ? pixels[above + i] : 0;
        const upLeft = y > 0 && i >= BPP ? pixels[above + i - BPP] : 0;
        const value = pixels[current + i];

        let filtered;
        if (type === 0) filtered = value;
        else if (type === 1) filtered = value - left;
        else if (type === 2) filtered = value - up;
        else if (type === 3) filtered = value - ((left + up) >> 1);
        else filtered = value - paeth(left, up, upLeft);

        filtered &= 0xff;
        row[i] = filtered;
        // 规范建议的启发式：按「有符号字节的绝对值」求和，越小越好
        score += filtered < 128 ? filtered : 256 - filtered;
      }

      candidate.score = score;
    }

    const best = candidates.reduce((a, b) => (b.score < a.score ? b : a));
    const start = y * (1 + stride);
    raw[start] = best.type;
    best.row.copy(raw, start + 1);
  }

  return raw;
}

/* ------------------------------------------------------------------ 自检 */

/** 把刚写出的文件重新解析一遍：块 CRC、IHDR、IDAT 解压长度。任一项不符就抛错 */
function verify(file) {
  const buffer = readFileSync(file);
  const signature = buffer.subarray(0, 8).toString('latin1');
  if (signature !== '\x89PNG\r\n\x1a\n') throw new Error('PNG 签名不正确');

  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('latin1');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const expected = buffer.readUInt32BE(offset + 8 + length);
    const actual = crc32(buffer.subarray(offset + 4, offset + 8 + length));
    if (expected !== actual) {
      throw new Error(`块 ${type} 的 CRC32 不匹配（期望 ${expected}，实际 ${actual}）`);
    }
    chunks.push({ type, data });
    offset += 12 + length;
  }

  const ihdr = chunks.find(c => c.type === 'IHDR');
  if (!ihdr) throw new Error('缺少 IHDR');
  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  if (width !== WIDTH || height !== HEIGHT) {
    throw new Error(`尺寸不符：${width}×${height}，期望 ${WIDTH}×${HEIGHT}`);
  }
  if (ihdr.data[8] !== 8 || ihdr.data[9] !== 2) {
    throw new Error(`IHDR 参数不符：位深 ${ihdr.data[8]} / 颜色类型 ${ihdr.data[9]}`);
  }

  const idat = chunks.filter(c => c.type === 'IDAT');
  if (idat.length === 0) throw new Error('缺少 IDAT');
  const inflated = inflateSync(Buffer.concat(idat.map(c => c.data)));
  const expectedLength = HEIGHT * (1 + WIDTH * BPP);
  if (inflated.length !== expectedLength) {
    throw new Error(`IDAT 解压后 ${inflated.length} 字节，期望 ${expectedLength}`);
  }

  return {
    bytes: buffer.length,
    chunkTypes: chunks.map(c => c.type).join(' ')
  };
}

/* ------------------------------------------------------------------ 入口 */

const png = encodePng(render());
writeFileSync(OUT, png);

const report = verify(OUT);
console.log(
  `[og] 已生成 ${OUT}\n[og] ${WIDTH}×${HEIGHT} RGB / ${(report.bytes / 1024).toFixed(1)} KB / 块 ${report.chunkTypes}`
);
console.log(`[og] 自检通过：签名 + 各块 CRC32 + IHDR + IDAT 解压长度`);
if (!existsSync(OUT)) throw new Error('文件未落盘');
