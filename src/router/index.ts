import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import { siteConfig } from '@/config/site'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * 文档标题也从 site config 派生，避免页面里出现硬编码的站点名。
 * 详情页等需要自定义标题时，用 `definePage({ meta: { title: '…' } })` 覆盖即可。
 * （纯 SPA 下 index.html 里的静态标题由构建插件从同一份配置注入。）
 */
router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = title ? `${title} - ${siteConfig.title}` : siteConfig.title
})

export default router
