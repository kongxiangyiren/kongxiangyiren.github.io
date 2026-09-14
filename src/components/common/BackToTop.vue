<!--
  回到顶部（自研，替掉 el-backtop —— 它也在 DefaultLayout 里，每页都加载）。

  行为对齐 el-backtop：滚动超过 200px 出现、圆形、right/bottom 24px、点击平滑滚到顶。
  观感沿用现成的 Butterfly 观感：--primary 文字色 / --card-bg 底 / --border-color 描边 /
  `0 2px 8px rgb(0 0 0 / 10%)` 阴影 / hover 反色。改造前这些是靠 scoped `:deep()` 压 EP，
  现在直接就是 Tailwind 工具类，不再需要跟 EP 内部比特异性。

  三处细节：
   - 滚动监听 `passive: true`（不阻塞滚动），`onUnmounted` 里摘掉，不留泄漏。
   - `usePreferredReducedMotion` 为 reduce 时 `behavior: 'auto'`，不做平滑滚动。
   - 过渡用 `:css` 开关整体关掉，而不是把时长设成 0 —— reduce 时连过渡类都不挂。
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

import AppIcon from '@/components/common/AppIcon.vue'

/** 与 el-backtop 的 `visibility-height` 对齐 */
const VISIBILITY_HEIGHT = 200

const visible = ref(false)
const reducedMotion = usePreferredReducedMotion()

/** reduce 时连 CSS 过渡都不要挂（`:css="false"` 让 Vue 直接跳过过渡检测） */
const motionEnabled = computed(() => reducedMotion.value !== 'reduce')

function syncVisible(): void {
  visible.value = window.scrollY > VISIBILITY_HEIGHT
}

function scrollToTop(): void {
  window.scrollTo({
    top: 0,
    behavior: motionEnabled.value ? 'smooth' : 'auto',
  })
}

onMounted(() => {
  // 初值也要算：带着滚动位置刷新、或直接进 `/#锚点` 时不能等第一次 scroll 才出现
  syncVisible()
  window.addEventListener('scroll', syncVisible, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', syncVisible)
})
</script>

<template>
  <Transition :css="motionEnabled" name="back-to-top">
    <button
      v-if="visible"
      type="button"
      class="fixed right-6 bottom-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-colors hover:border-primary hover:bg-primary hover:text-white"
      aria-label="回到顶部"
      title="回到顶部"
      @click="scrollToTop"
    >
      <AppIcon name="arrow-up" class="h-4 w-4" />
    </button>
  </Transition>
</template>

<style lang="scss" scoped>
/*
 * 过渡只影响「出现 / 消失」这一下，不做位移（`translate` 在 fixed 元素上会引入新的包含块，
 * 也没必要），只做 opacity + 轻微缩放。
 */
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
