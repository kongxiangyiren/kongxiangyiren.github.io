/**
 * 站点配置的单一入口。
 *
 * 所有页面（含 Header / Footer / meta）只能从这里读站点信息，不要在组件里硬编码。
 * 这些值会在运行时被读取，所以放在 src/ 下而不是 *.env —— 内容是配置，不是密钥。
 */

import type { IconName } from '@/types/ui';

export interface SocialLink {
  /** AppIcon 的图标名 */
  icon: IconName;
  /** 无障碍标签 / 悬浮提示 */
  label: string;
  href: string;
}

export interface NavLink {
  label: string;
  /** 与文件路由对齐的路径 */
  to: string;
}

export interface SiteAuthor {
  name: string;
  avatar: string;
  bio: string;
}

/** 关于页「个人时间线」的一条 */
export interface TimelineEntry {
  /** `YYYY-MM` 或 `YYYY-MM-DD`，**原样展示**（不做 Date 解析，避免时区漂移） */
  date: string;
  title: string;
  /** 可选，一两句话说明 */
  description?: string;
}

/** 友链页的一张卡片 */
export interface FriendLink {
  name: string;
  /** 头像图片地址（本地 `/images/...` 或外链均可）；加载失败时退化成首字占位块 */
  avatar: string;
  description: string;
  url: string;
}

export interface SiteConfig {
  /**
   * 站点根地址，**不带尾斜杠**（如 `https://blog.example.com`）。
   *
   * ⚠️ **上线前必须改成真实域名**：canonical / og:url / og:image / JSON-LD 全靠它拼绝对地址。
   * 留在示例域名上会让搜索引擎把「真正的规范地址」指到别人的域，是自伤式的 SEO 错误。
   * 留空字符串则退化为根相对路径（降级规则见 `src/utils/url.ts#absoluteUrl`）。
   */
  url: string;
  title: string;
  /** 首屏打字机用的副标题（可含多个句号分隔的短句，会循环播放） */
  subtitle: string;
  description: string;
  author: SiteAuthor;
  nav: NavLink[];
  socials: SocialLink[];
  /** 首页侧边栏公告卡内容。留空字符串则整张卡不渲染 */
  announcement: string;
  /**
   * 首页每页文章数。
   * 注意：本站目前只有 3 篇文章，这里刻意设成 2 以便分页在开发期可见可测；
   * 文章多起来之后改成 10 更接近 Butterfly 默认观感。
   */
  postsPerPage: number;
  /** 页脚「已运行 X 天 Y 时 Z 分 S 秒」的起算日（YYYY-MM-DD） */
  footerStartDate: string;
  /** 备案号。境外服务器无备案 → 留空，页脚整行不渲染 */
  icp: string;
  /** 文章版权协议名。留空则版权卡只显示作者与链接，不显示协议 */
  license: string;
  /** 协议详情链接 */
  licenseUrl: string;
  /**
   * 默认社交分享图（`og:image` 兜底）。
   *
   * ⚠️ **必须是 1200×630 的 PNG / JPG**：Twitter / Facebook / 微信的抓取器普遍**不认 SVG**，
   * 拿不到像素就整张卡片没图，所以这里不能填 `public/images/` 下的 svg。
   * 换成别的尺寸时，`src/composables/useSeo.ts` 里输出的 `og:image:width/height` 也要跟着改
   * （元数据与实际图片不符会被抓取器判定为无效图）。
   *
   * 留空字符串 ⇒ **完全不输出** `og:image` 系列标签（而不是输出一个坏地址）；
   * 此时 `twitter:card` 会自动降级为 `summary`。
   *
   * 当前值指向的 `public/images/og-default.png` 是**生成出来的**（配色沿用 banner.svg 的
   * 深蓝渐变 + 主题色光晕，图里没有文字），生成脚本见 `scripts/generate-og-image.mjs`。
   * 想换成带站点名的正式设计稿：用设计工具做一张 1200×630 的 PNG/JPG 覆盖同名文件即可，
   * 这里的路径与 useSeo.ts 里的尺寸声明都不用改。
   */
  ogImage: string;
  /**
   * 关于页的「技能 / 兴趣」标签。
   *
   * ⚠️ **空数组（默认）时整个区块不渲染** —— 这里刻意留空，因为站点信息只有站长自己
   * 知道，任何预填值都是编造。条目形状见文件末尾的注释示例。
   */
  skills: string[];
  /**
   * 关于页的「个人时间线」。
   *
   * ⚠️ 同上：默认空数组 = 该区块不渲染。**不要填你没经历过的事**。
   */
  timeline: TimelineEntry[];
  /**
   * 友链列表。空数组时友链页显示「还没有友链」的空状态（申请说明照常显示）。
   *
   * ⚠️ 默认空数组是为了不虚构真实友链；形状见文件末尾的注释示例。
   */
  friends: FriendLink[];
  /**
   * 「申请友链」区块的说明文案。
   *
   * 这里给了一句中性的默认文案（没有涉及任何个人信息），站长可以改成自己的联系方式。
   * 留空字符串则整块不渲染。
   */
  friendApplyNote: string;
  /** 申请要求清单。空数组则该列表不渲染（说明文案仍会显示） */
  friendApplyRules: string[];
}

export const siteConfig: SiteConfig = {
  // GitHub Pages 用户主页仓库（仓库名必须是 kongxiangyiren.github.io），站点挂在域名根，故无子路径
  url: 'https://kongxiangyiren.github.io',
  title: '空巷一人',
  subtitle: '记录技术与生活的零散想法。写代码，也写字。',
  description: '前端开发笔记、工程杂谈与零散记录。',
  author: {
    name: '空巷一人',
    avatar: '/images/avatar.svg',
    bio: '前端开发者，写代码也写字。'
  },
  nav: [
    { label: '首页', to: '/' },
    { label: '归档', to: '/archives' },
    { label: '标签', to: '/tags' },
    { label: '分类', to: '/categories' },
    { label: '关于', to: '/about' },
    { label: '友链', to: '/friends' }
  ],
  socials: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/' },
    { icon: 'mail', label: 'Email', href: 'mailto:1530688385@qq.com' },
    { icon: 'rss', label: 'RSS', href: '/rss.xml' }
  ],
  announcement:
    '这个博客刚重新起步，文章会一篇篇补上。这里主要写前端工程、构建工具与偶尔的生活记录。',
  postsPerPage: 2,
  footerStartDate: '2026-01-01',
  icp: '',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  ogImage: '/images/og-default.png',

  /*
   * ⚠️ 下面是给站长填的占位。默认全部留空 —— 编造个人经历/友链比留白糟糕得多。
   * 填上就会自动多出对应区块，留空则该区块整块不渲染（不是渲染成空白块）。
   *
   * skills: ['TypeScript', 'Vue', 'Node.js', '构建工具', '摄影'],
   *
   * timeline: [
   *   { date: '2026-09', title: '博客重新开张', description: '决定把自己写的东西留下来。' },
   * ],
   *
   * friends: [
   *   {
   *     name: '示例友链',
   *     avatar: 'https://example.com/avatar.png',
   *     description: '一句话介绍这位朋友在写什么',
   *     url: 'https://example.com',
   *   },
   * ],
   *
   * 另外两项不是「区块开关」，但同样需要站长确认：
   *
   * url: 'https://你的域名',            // 不带尾斜杠；canonical / og:url 的根基，**上线前必改**
   * ogImage: '/images/og-default.png',  // 1200×630 的 PNG/JPG；留空则整套 og:image 标签不输出
   */
  skills: [],
  timeline: [],
  friends: [],

  friendApplyNote:
    '欢迎交换友链。把下面的信息发我一份（名称、头像地址、一句话简介、站点地址），我加好后会去回访。',
  friendApplyRules: [
    '站点有个性化的原创内容，且能持续更新',
    '已添加本站友链，或同意互访后再加',
    '页面整洁，无自动播放音频与弹窗'
  ]
};
