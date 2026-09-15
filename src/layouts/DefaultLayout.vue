<!--
  默认布局：顶栏 + 内容 + 页脚 + 全局浮层（阅读进度 / 回到顶部）。
  App.vue 套上它就等于全站都吃到了这套骨架。

  全出血：首页首屏 Banner 必须铺满整屏，但 `<main>` 上有 max-w-5xl + px-4 的容器，
  里面的元素无论怎么写都不可能超出这个宽度（`w-screen` 那套会因为 100vw 含滚动条
  而产生横向滚动）。所以容器本身要能按页面切换 —— 由 `route.meta.fullBleed` 决定，
  页面自己用 `definePage({ meta: { fullBleed: true } })` 声明。
-->
<script setup lang="ts">
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';

  import BackToTop from '@/components/common/BackToTop.vue';
  import ReadingProgress from '@/components/common/ReadingProgress.vue';
  import AppFooter from '@/components/layout/AppFooter.vue';
  import AppHeader from '@/components/layout/AppHeader.vue';

  const route = useRoute();

  /** 只认严格 `true`，meta 里写别的值一律当普通页面处理 */
  const fullBleed = computed(() => route.meta.fullBleed === true);
</script>

<template>
  <div class="flex min-h-screen flex-col bg-global text-font">
    <ReadingProgress />

    <AppHeader />

    <!-- 全出血页面自己负责与顶栏的距离（首页 Banner 本来就要压在顶栏下面） -->
    <main v-if="fullBleed" class="flex-1">
      <slot />
    </main>

    <!-- pt-20：给固定顶栏（h-14）留出空间，再多一点呼吸感 -->
    <main v-else class="mx-auto w-full max-w-5xl flex-1 px-4 pt-20 pb-4">
      <slot />
    </main>

    <AppFooter />

    <BackToTop />
  </div>
</template>
