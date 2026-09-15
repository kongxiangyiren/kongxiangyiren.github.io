<script setup lang="ts">
  import DefaultLayout from '@/layouts/DefaultLayout.vue';
  import { useSeo } from '@/composables/useSeo';

  // 每页的 <title> / description 由 unhead 统一产出（预渲染时进静态 HTML，客户端接管导航切换）
  useSeo();
</script>

<template>
  <DefaultLayout>
    <RouterView />
  </DefaultLayout>
</template>
