<!-- 404 —— 文件路由的 catch-all（`[...all].vue`） -->
<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue';
  import { useRoute } from 'vue-router';

  const route = useRoute();

  /**
   * 用户实际访问的路径。**必须挂载后才渲染**。
   *
   * `404.html` 只有**一份**静态产物：nginx 用 `error_page 404 /404.html` 把**所有**未知路径
   * 都指到它，所以预渲染时它只知道 `/404.html`，而浏览器里的地址是任意值 ——
   * 首帧直接输出 `route.fullPath` 必然与静态产物不一致（实测：1 条水合不匹配）。
   * 挂载后再填：首帧两端都是空串、水合干净，用户仍能看到自己输错的路径。
   *
   * `watch` 是为了覆盖**客户端**跳到未知路径的情况（同一个组件实例不会重新挂载）。
   */
  const attemptedPath = ref('');
  const syncPath = (): void => {
    attemptedPath.value = route.fullPath;
  };

  onMounted(syncPath);
  watch(() => route.fullPath, syncPath);
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-16 text-center">
    <p class="text-6xl font-bold text-primary">404</p>
    <p class="font-normal text-font">
      找不到
      <code class="rounded border border-border px-1.5 py-0.5 font-mono text-sm">
        {{ attemptedPath }}
      </code>
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
