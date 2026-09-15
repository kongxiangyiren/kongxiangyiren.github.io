<!--
  文章链接列表（列表页 / 标签页 / 分类页 / 归档页共用）。
  刻意保持「无卡片」的朴素形态：文章卡片流视觉属于下一批，这一批只负责把内容层接通。
-->
<script setup lang="ts">
  import type { BlogPostPreview } from '@/types/blog';
  import { formatPostDate, toDateTimeAttr } from '@/utils/date';

  const props = defineProps<{ posts: BlogPostPreview[] }>();
</script>

<template>
  <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
    <li v-for="post in props.posts" :key="post.slug" class="flex flex-col gap-1.5 p-4">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <time class="font-mono text-xs text-font opacity-70" :datetime="toDateTimeAttr(post.date)">
          {{ formatPostDate(post.date) }}
        </time>
        <RouterLink
          :to="`/posts/${post.slug}`"
          class="text-base font-medium text-font transition-colors hover:text-primary"
        >
          {{ post.title }}
        </RouterLink>
        <span v-if="post.sticky > 0" class="text-xs font-medium text-primary">置顶</span>
      </div>

      <p v-if="post.description" class="line-clamp-2 text-sm text-font opacity-80">
        {{ post.description }}
      </p>

      <div class="flex flex-wrap items-center gap-2 text-xs">
        <RouterLink
          v-for="tag in post.tags"
          :key="tag"
          :to="`/tags/${tag}`"
          class="rounded border border-border px-1.5 py-0.5 text-primary transition-colors hover:bg-card-hover"
        >
          #{{ tag }}
        </RouterLink>
        <span class="text-font opacity-60">{{ post.readingTime }} 分钟</span>
      </div>
    </li>
  </ul>
</template>
