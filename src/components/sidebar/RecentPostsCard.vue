<!--
  最近文章。
  注意：`virtual:blog/posts` 给的是「置顶优先」的顺序，公告栏要的是**纯时间倒序**，
  所以这里必须自己再排一次，不能直接 slice。
-->
<script setup lang="ts">
  import { computed } from 'vue';
  import { posts } from 'virtual:blog/posts';

  import SidebarCard from '@/components/sidebar/SidebarCard.vue';
  import { formatPostDate, toDateTimeAttr } from '@/utils/date';

  /** 最近 N 篇 */
  const LIMIT = 5;

  const recent = computed(() =>
    [...posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, LIMIT)
  );
</script>

<template>
  <SidebarCard v-if="recent.length > 0" title="最近文章" icon="clock">
    <ul class="flex flex-col gap-2.5">
      <li v-for="post in recent" :key="post.slug" class="flex flex-col gap-0.5">
        <RouterLink
          :to="`/posts/${post.slug}`"
          class="line-clamp-2 text-xs leading-relaxed text-font transition-colors hover:text-primary"
        >
          {{ post.title }}
        </RouterLink>
        <time class="text-[11px] text-font opacity-60" :datetime="toDateTimeAttr(post.date)">
          {{ formatPostDate(post.date) }}
        </time>
      </li>
    </ul>
  </SidebarCard>
</template>
