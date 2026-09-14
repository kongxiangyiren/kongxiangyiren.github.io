<!--
  顶栏：固定顶部 + 半透明毛玻璃 + 下滑隐藏 / 上滑显示。
  导航、主题按钮、汉堡按钮、移动端抽屉**全部 Tailwind + 原生元素自研** —— el-menu /
  el-button / el-drawer 一个都不用。

  为什么连 el-drawer 也删（实测数据）：AppHeader 在 DefaultLayout 里，**每页都加载**，
  而 el-drawer 会把首页 entry chunk 从 76.63 kB 抬到 105.37 kB（+28.74 kB，gzip +10.21）。
  它帮我们做的事情由下面这几块补上（一件不少）：
    - 遮罩层 + 点击遮罩关闭
    - Esc 关闭
    - 焦点陷阱 / 打开时移入焦点 / 关闭后焦点归还 → `useFocusTrap`
    - body 滚动锁（见下方 watch）
    - `role="dialog"` + `aria-modal="true"` + `aria-label`
    - 右侧滑入的 transition，且尊重 reduce motion（`:css` 开关）
-->
<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useEventListener, useMediaQuery, usePreferredReducedMotion } from '@vueuse/core'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import { siteConfig } from '@/config/site'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useScrollLock } from '@/composables/useScrollLock'
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

// 路由切换时收起抽屉与搜索弹窗，否则点完链接浮层还挂着
watch(
  () => route.fullPath,
  () => {
    closeDrawer()
    closeSearch()
  },
)

// ---------------------------------------------------------------------------
// 移动端抽屉（自研）
// ---------------------------------------------------------------------------

const panel = ref<HTMLElement | null>(null)
const reducedMotion = usePreferredReducedMotion()

/** reduce 时连过渡都不要挂：`:css="false"` 让 Vue 直接跳过过渡检测 */
const motionEnabled = computed(() => reducedMotion.value !== 'reduce')

function closeDrawer(): void {
  drawerOpen.value = false
}

// 焦点陷阱 + Esc 关闭 + 关闭后把焦点还给汉堡按钮
useFocusTrap({ container: panel, open: drawerOpen, onClose: closeDrawer })

/*
 * 滚动锁：抽屉与详情页的 lightbox 共用 `useScrollLock`（引用计数 + 原值还原）。
 * 实现细节与「为什么不需要补偿滚动条宽度」见 src/composables/useScrollLock.ts。
 */
useScrollLock(drawerOpen)

// 拖到桌面宽度时抽屉被 `md:hidden` 藏起来，状态必须一起收掉，否则滚动锁会永久卡住
const isDesktop = useMediaQuery('(min-width: 768px)')
watch(isDesktop, (desktop) => {
  if (desktop) closeDrawer()
})

// ---------------------------------------------------------------------------
// 站内搜索（顶栏按钮 / Ctrl+K / Cmd+K）
// ---------------------------------------------------------------------------

/**
 * 弹窗组件本体**动态 import**：搜索 UI 与 fuse.js 都不进 entry chunk。
 *
 * 挂载与开屏刻意分成两步（和详情页 lightbox 同一手法）：先以 `open=false` 挂上，
 * 再翻转 `open`。`useFocusTrap` 是靠 `watch(open)` 的**翻转**来安装焦点陷阱、
 * 并记录「关闭后焦点归还给谁」的；如果挂载和 `open=true` 落在同一个 tick，
 * 那次翻转根本不存在，陷阱与焦点归还就都不会发生。
 */
type SearchDialogComponent = (typeof import('@/components/search/SearchDialog.vue'))['default']

const searchComponent = shallowRef<SearchDialogComponent | null>(null)
const searchOpen = ref(false)
/** 搜索按钮本身：用于 Ctrl+K 打开前“抢占焦点”（见下） */
const searchButton = ref<HTMLButtonElement | null>(null)

async function openSearch(): Promise<void> {
  // 抽屉开着时不叠弹窗：两个焦点陷阱叠在一起，键盘行为会变得难以理解
  if (drawerOpen.value) return

  /*
   * 先用按钮抢下焦点。
   * `useFocusTrap` 的“焦点归还”归还的是**打开前那个元素**；从键盘快捷键（Ctrl+K）
   * 打开时，用户可能根本没点过任何东西，那时 `document.activeElement` 就是 `<body>`
   * —— 归还给 body 等于没归还，关闭后键盘用户会失去焦点位置（实测到了这个现象）。
   * 焦在别处（比如用户 Tab 到某个链接后按 Ctrl+K）时不抢，照常归还给原来那个元素。
   */
  if (document.activeElement === document.body) searchButton.value?.focus()

  if (!searchComponent.value) {
    searchComponent.value = (await import('@/components/search/SearchDialog.vue')).default
    await nextTick()
  }

  searchOpen.value = true
}

function closeSearch(): void {
  searchOpen.value = false
}

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey) return
  // Firefox 里 Ctrl+K 是「聚焦地址栏并搜索」，必须拦掉，否则快捷键会被浏览器抢走
  event.preventDefault()
  if (searchOpen.value) closeSearch()
  else void openSearch()
})
</script>

<template>
  <!--
    抽屉必须是 <header> 的**兄弟节点**：header 上有 transform（滑入滑出），
    而 transform 会成为 fixed 定位的包含块，抽屉会被关在 header 的 56px 高度里。
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
        <!--
          搜索：只在此处出现一个按钮 + 一个快捷键；**弹窗本体与 fuse.js 都不在本 chunk 里**
          （`openSearch` 里那次 `import()`，见 src/components/search/SearchDialog.vue 顶部注释）。
        -->
        <button
          ref="searchButton"
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-font transition-colors hover:bg-card-hover hover:text-primary"
          aria-label="搜索文章（快捷键 Ctrl+K）"
          title="搜索（Ctrl+K）"
          aria-haspopup="dialog"
          :aria-expanded="searchOpen"
          @click="openSearch"
        >
          <AppIcon name="search" class="h-5 w-5" />
        </button>

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
          aria-controls="mobile-nav-drawer"
          aria-haspopup="dialog"
          @click="drawerOpen = !drawerOpen"
        >
          <AppIcon :name="drawerOpen ? 'close' : 'menu'" class="h-5 w-5" />
        </button>
      </div>
    </div>
  </header>

  <Transition :css="motionEnabled" name="drawer">
    <div v-if="drawerOpen" class="fixed inset-0 z-50 md:hidden">
      <!--
        遮罩：纯点击热区，语义由面板承担，所以 aria-hidden。
        用 div + @click 而不是 button —— 它是「菜单的一部分」，不该在 Tab 序列里
        再插一个无标签的按钮（键盘用户用 Esc 关闭）。
      -->
      <div class="absolute inset-0 bg-black/40" aria-hidden="true" @click="closeDrawer"></div>

      <div
        id="mobile-nav-drawer"
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="`${siteConfig.title} 移动端导航`"
        tabindex="-1"
        class="drawer-panel absolute inset-y-0 right-0 flex w-55 flex-col gap-1 bg-card p-4 shadow-xl"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium text-font">{{ siteConfig.title }}</span>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-font transition-colors hover:bg-card-hover hover:text-primary"
            aria-label="关闭菜单"
            @click="closeDrawer"
          >
            <AppIcon name="close" class="h-4 w-4" />
          </button>
        </div>

        <nav class="flex flex-col gap-1" aria-label="移动端导航">
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
      </div>
    </div>
  </Transition>

  <!--
    搜索弹窗：在用户第一次点搜索按钮 / 按 Ctrl+K 之前，这一行是 `undefined`，
    组件与其依赖（含 fuse.js）一个字节都不会下载。
  -->
  <component :is="searchComponent" v-if="searchComponent" :open="searchOpen" @close="closeSearch" />
</template>

<style lang="scss" scoped>
/*
 * 遮罩淡入 + 面板从右滑入。
 * Vue 的 Transition 只把类名挂在**根节点**（遮罩容器）上，而横向滑动必须只作用在面板上，
 * 否则遮罩会跟着一起横向滑、看起来像整页在动。所以这里自己写规则，
 * 用后代选择器把 transform 限定到 `.drawer-panel`。
 *
 * 这里只是过渡规则，没有重写间距 / 颜色，不违反「Sass 不重写 Tailwind 已覆盖的样式」。
 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;

  .drawer-panel {
    transition: transform 0.3s ease;
  }
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;

  .drawer-panel {
    transform: translateX(100%);
  }
}
</style>
