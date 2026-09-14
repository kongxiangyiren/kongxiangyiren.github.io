<!--
  归档页 —— 最小可用版：按年 / 月分组。
  时间轴视觉（el-timeline）与折叠交互在下一批。
-->
<script setup lang="ts">
import { archives } from 'virtual:blog/taxonomy'

import PostLinkList from '@/components/blog/PostLinkList.vue'
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold text-font">归档</h1>

    <p v-if="archives.length === 0" class="text-sm text-font opacity-70">还没有文章。</p>

    <section v-for="year in archives" :key="year.year" class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold text-font">
        {{ year.year }}
        <span class="text-sm font-normal opacity-60">{{ year.count }} 篇</span>
      </h2>

      <div v-for="month in year.months" :key="month.month" class="flex flex-col gap-2">
        <h3 class="font-mono text-sm text-font opacity-70">
          {{ year.year }}-{{ String(month.month).padStart(2, '0') }}
        </h3>
        <PostLinkList :posts="month.posts" />
      </div>
    </section>
  </div>
</template>
