<!--
  默认布局：顶栏 + 内容 + 页脚 + 全局浮层（阅读进度 / 回到顶部）。
  App.vue 套上它就等于全站都吃到了这套骨架。
-->
<script setup lang="ts">
import BackToTop from '@/components/common/BackToTop.vue'
import ReadingProgress from '@/components/common/ReadingProgress.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-global text-font">
    <ReadingProgress />

    <AppHeader />

    <!-- pt-20：给固定顶栏（h-14）留出空间，再多一点呼吸感 -->
    <main class="mx-auto w-full max-w-5xl flex-1 px-4 pt-20 pb-4">
      <slot />
    </main>

    <AppFooter />

    <BackToTop />
  </div>
</template>
