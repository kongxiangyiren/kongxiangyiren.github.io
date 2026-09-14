/**
 * 站点配置的单一入口。
 *
 * 所有页面（含 Header / Footer / meta）只能从这里读站点信息，不要在组件里硬编码。
 * 这些值会在运行时被读取，所以放在 src/ 下而不是 *.env —— 内容是配置，不是密钥。
 */

import type { IconName } from '@/types/ui'

export interface SocialLink {
  /** AppIcon 的图标名 */
  icon: IconName
  /** 无障碍标签 / 悬浮提示 */
  label: string
  href: string
}

export interface NavLink {
  label: string
  /** 与文件路由对齐的路径 */
  to: string
}

export interface SiteAuthor {
  name: string
  avatar: string
  bio: string
}

export interface SiteConfig {
  title: string
  /** 首屏打字机用的副标题（可含多个句号分隔的短句，会循环播放） */
  subtitle: string
  description: string
  author: SiteAuthor
  nav: NavLink[]
  socials: SocialLink[]
  /** 首页侧边栏公告卡内容。留空字符串则整张卡不渲染 */
  announcement: string
  /**
   * 首页每页文章数。
   * 注意：本站目前只有 3 篇文章，这里刻意设成 2 以便分页在开发期可见可测；
   * 文章多起来之后改成 10 更接近 Butterfly 默认观感。
   */
  postsPerPage: number
  /** 页脚「已运行 X 天 Y 时 Z 分 S 秒」的起算日（YYYY-MM-DD） */
  footerStartDate: string
  /** 备案号。境外服务器无备案 → 留空，页脚整行不渲染 */
  icp: string
  /** 文章版权协议名。留空则版权卡只显示作者与链接，不显示协议 */
  license: string
  /** 协议详情链接 */
  licenseUrl: string
}

export const siteConfig: SiteConfig = {
  title: '空巷一人',
  subtitle: '记录技术与生活的零散想法。写代码，也写字。',
  description: '前端开发笔记、工程杂谈与零散记录。',
  author: {
    name: '空巷一人',
    avatar: '/images/avatar.svg',
    bio: '前端开发者，写代码也写字。',
  },
  nav: [
    { label: '首页', to: '/' },
    { label: '归档', to: '/archives' },
    { label: '标签', to: '/tags' },
    { label: '分类', to: '/categories' },
    { label: '关于', to: '/about' },
    { label: '友链', to: '/friends' },
  ],
  socials: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/' },
    { icon: 'mail', label: 'Email', href: 'mailto:1530688385@qq.com' },
    { icon: 'rss', label: 'RSS', href: '/rss.xml' },
  ],
  announcement:
    '这个博客刚重新起步，文章会一篇篇补上。这里主要写前端工程、构建工具与偶尔的生活记录。',
  postsPerPage: 2,
  footerStartDate: '2026-01-01',
  icp: '',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
}
