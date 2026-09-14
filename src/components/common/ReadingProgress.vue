<!--
  顶部阅读进度条。
  不引 nprogress：需要的只是「滚动比例 → 一条线的宽度」，引库反而多一份 CSS 和 DOM。
  用 scaleX 而不是 width：走合成层，不触发 layout。
-->
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useRoute } from 'vue-router'

const route = useRoute()
const progress = ref(0)

function update(): void {
  const doc = document.documentElement
  const scrollable = doc.scrollHeight - doc.clientHeight
  progress.value = scrollable > 0 ? Math.min(1, Math.max(0, doc.scrollTop / scrollable)) : 0
}

useEventListener(window, 'scroll', update, { passive: true })
useEventListener(window, 'resize', update, { passive: true })

onMounted(update)

// 路由切换后文档高度变了，进度要重新算一次
watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    update()
  },
)
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]" aria-hidden="true">
    <div
      class="h-full origin-left bg-primary transition-transform duration-150 ease-out"
      :style="{ transform: `scaleX(${progress})` }"
    ></div>
  </div>
</template>
