<!-- 404 —— 文件路由的 catch-all（`[...all].vue`） -->
<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-16 text-center">
    <p class="text-6xl font-bold text-primary">404</p>
    <p class="font-normal text-font">
      找不到
      <code class="rounded border border-border px-1.5 py-0.5 font-mono text-sm">{{
        route.fullPath
      }}</code>
      这个页面
    </p>
    <RouterLink
      to="/"
      class="rounded-md border border-border px-4 py-2 text-sm text-primary transition-colors hover:bg-card-hover"
    >
      回到首页
    </RouterLink>
  </div>
</template>
