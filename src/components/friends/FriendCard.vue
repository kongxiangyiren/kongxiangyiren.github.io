<!--
  友链页的一张卡片（Tailwind 自研）。

  两个细节：
   1. **整卡可点**：名称是一条 stretched link（`after:absolute after:inset-0`）。
      外链必须带 `target="_blank"` + `rel="noopener noreferrer"`：
      前者是产品要求，后者防 `window.opener` 反向控制本页（老浏览器 / 同源策略放松时的经典坑）。
   2. **头像加载失败**：退化成「名称首字」占位块。用组件内的 `ref` 而不是全局 Set ——
      卡片是 `v-for` 里按 url `:key` 渲染的，换数据就重新挂载，flag 天然跟着重置。
-->
<script setup lang="ts">
  import { ref } from 'vue';

  import type { FriendLink } from '@/config/site';

  const props = defineProps<{ friend: FriendLink }>();

  const avatarFailed = ref(false);
</script>

<template>
  <li
    class="relative flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
  >
    <img
      v-if="!avatarFailed"
      :src="props.friend.avatar"
      :alt="`${props.friend.name} 的头像`"
      width="48"
      height="48"
      loading="lazy"
      decoding="async"
      class="h-12 w-12 shrink-0 rounded-full bg-card-hover object-cover"
      @error="avatarFailed = true"
    />

    <span
      v-else
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card-hover text-base font-medium text-font opacity-70"
      aria-hidden="true"
    >
      {{ props.friend.name.slice(0, 1) }}
    </span>

    <div class="flex min-w-0 flex-col gap-1">
      <a
        :href="props.friend.url"
        target="_blank"
        rel="noopener noreferrer"
        class="truncate text-sm font-medium text-font transition-colors after:absolute after:inset-0 hover:text-primary"
      >
        {{ props.friend.name }}
      </a>
      <p class="line-clamp-2 text-xs leading-relaxed text-font opacity-70">
        {{ props.friend.description }}
      </p>
    </div>
  </li>
</template>
