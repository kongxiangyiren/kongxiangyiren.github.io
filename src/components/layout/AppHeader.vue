<!--
  顶栏：固定顶部 + 半透明毛玻璃 + 下滑隐藏 / 上滑显示。
  视觉元素（导航、主题按钮、汉堡按钮）全部 Tailwind 自研 —— 不用 el-menu / el-button。
  只有移动端抽屉用 el-drawer（EP 只保留功能性组件）。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import { siteConfig } from '@/config/site'
import { useTheme } from '@/composables/useTheme'

/** 越过这个距离才允许收起，避免刚滚动一点点就闪 */
const HIDE_AFTER = 80
/** 位移小于这个值视为抖动，不改变显隐 */
const JITTER = 6

const route = useRoute()
const { theme, toggleTheme } = useTheme()

const hidden = ref(false)
const drawerOpen = ref(false)
let lastScrollY = 0

const themeActionLabel = computed(() =>
  theme.value === 'dark' ? '切换到亮色模式' : '切换到暗色模式',
)

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

useEventListener(
  window,
  'scroll',
  () => {
    const y = window.scrollY
    const delta = y - lastScrollY
    if (Math.abs(delta) < JITTER) return
    hidden.value = delta > 0 && y > HIDE_AFTER
    lastScrollY = y
  },
  { passive: true },
)

// 路由切换时收起抽屉，否则点完链接抽屉还挂着
watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)
</script>

<template>
  <!--
    el-drawer 必须放在 <header> 之外：header 上有 transform（滑入滑出），
    而 transform 会成为 fixed 定位的包含块，抽屉会被关在 header 的 56px 里。
  -->
  <header
    class="fixed inset-x-0 top-0 z-40 border-b border-border bg-card/70 backdrop-blur-md transition-transform duration-300"
    :class="hidden ? '-translate-y-full' : 'translate-y-0'"
  >
    <div class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
      <RouterLink to="/" class="flex min-w-0 items-center gap-2">
        <img
          :src="siteConfig.author.avatar"
          alt=""
          width="28"
          height="28"
          class="h-7 w-7 shrink-0 rounded-full"
        />
        <span class="truncate text-lg font-semibold text-primary">{{ siteConfig.title }}</span>
      </RouterLink>

      <nav class="hidden items-center gap-1 md:flex" aria-label="主导航">
        <RouterLink
          v-for="item in siteConfig.nav"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-card-hover hover:text-primary"
          :class="isActive(item.to) ? 'font-medium text-primary' : 'text-font'"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-font transition-colors hover:bg-card-hover hover:text-primary"
          :aria-label="themeActionLabel"
          :title="themeActionLabel"
          @click="toggleTheme"
        >
          <!-- 显示的是「点了会变成什么」，不是当前状态 -->
          <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" class="h-5 w-5" />
        </button>

        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-font transition-colors hover:bg-card-hover hover:text-primary md:hidden"
          :aria-label="drawerOpen ? '关闭菜单' : '打开菜单'"
          :aria-expanded="drawerOpen"
          @click="drawerOpen = !drawerOpen"
        >
          <AppIcon :name="drawerOpen ? 'close' : 'menu'" class="h-5 w-5" />
        </button>
      </div>
    </div>
  </header>

  <el-drawer v-model="drawerOpen" direction="rtl" size="220px" :with-header="false">
    <nav class="flex flex-col gap-1" aria-label="移动端导航">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-font">{{ siteConfig.title }}</span>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-full text-font transition-colors hover:bg-card-hover hover:text-primary"
          aria-label="关闭菜单"
          @click="drawerOpen = false"
        >
          <AppIcon name="close" class="h-4 w-4" />
        </button>
      </div>

      <RouterLink
        v-for="item in siteConfig.nav"
        :key="item.to"
        :to="item.to"
        class="rounded-md px-3 py-2 text-sm transition-colors hover:bg-card-hover hover:text-primary"
        :class="isActive(item.to) ? 'font-medium text-primary' : 'text-font'"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </el-drawer>
</template>
