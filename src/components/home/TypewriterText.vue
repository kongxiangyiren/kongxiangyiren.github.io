<!--
  首屏副标题打字机。
  固定高度（h-12 / sm:h-8）是刻意留的：文字长短在变化，但盒子高度不参与计算，
  所以打字 / 退格过程中下方元素不会跳动。光标闪烁的 keyframes 在 butterfly.scss。
-->
<script setup lang="ts">
  import { computed } from 'vue';

  import { useTypewriter } from '@/composables/useTypewriter';

  const props = defineProps<{ text: string }>();

  const { display, isStatic } = useTypewriter(computed(() => props.text));
</script>

<template>
  <p
    class="flex h-12 items-center justify-center overflow-hidden px-2 text-center text-base leading-6 text-balance text-white/90 sm:h-8 sm:text-lg sm:leading-7"
  >
    <!-- 屏幕阅读器读完整文案；下面那个逐字变化的节点对 AT 隐藏，避免逐字播报 -->
    <span class="sr-only">{{ props.text }}</span>
    <span aria-hidden="true">{{ display }}</span>
    <span v-if="!isStatic" class="typewriter-caret" aria-hidden="true"></span>
  </p>
</template>
