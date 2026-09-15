<!--
  上下篇导航。

  顺序用 `virtual:blog/posts` 的**数组顺序**（构建期已按 置顶 + 时间倒序 排好），
  和首页文章列表的口径完全一致 —— 用户在列表里看到的相邻关系，在详情页底部
  看到的是同一个，不会出现「列表里它在上面，详情页却叫它下一篇」的错位。

  边界：第一篇只有「下一篇」，最后一篇只有「上一篇」，中间篇两侧都有。
  布局用 `grid sm:grid-cols-2` + 给「下一篇」写死 `sm:col-start-2`：
  少了任何一侧时，剩下那张卡会自己留在正确的列上（左侧 / 右侧），不需要条件类。
-->
<script setup lang="ts">
  import AppIcon from '@/components/common/AppIcon.vue';
  import type { BlogPostMeta } from '@/types/blog';

  defineProps<{
    /** 数组顺序上的前一篇；已经是最新一篇时为 null */
    prev: BlogPostMeta | null;
    /** 数组顺序上的后一篇；已经是最旧一篇时为 null */
    next: BlogPostMeta | null;
  }>();
</script>

<template>
  <nav class="grid gap-3 sm:grid-cols-2" aria-label="上下篇导航">
    <RouterLink
      v-if="prev"
      :to="`/posts/${prev.slug}`"
      rel="prev"
      class="group flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
    >
      <span class="flex items-center gap-1.5 text-xs text-font opacity-70">
        <AppIcon name="arrow-left" class="h-3.5 w-3.5" />
        上一篇
      </span>
      <span
        class="line-clamp-2 text-sm font-medium text-font transition-colors group-hover:text-primary"
      >
        {{ prev.title }}
      </span>
    </RouterLink>

    <RouterLink
      v-if="next"
      :to="`/posts/${next.slug}`"
      rel="next"
      class="group flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary sm:col-start-2"
    >
      <span class="flex items-center gap-1.5 text-xs text-font opacity-70">
        下一篇
        <AppIcon name="arrow-right" class="h-3.5 w-3.5" />
      </span>
      <span
        class="line-clamp-2 text-sm font-medium text-font transition-colors group-hover:text-primary"
      >
        {{ next.title }}
      </span>
    </RouterLink>
  </nav>
</template>
