<!--
  归档页 —— Butterfly 的时间线观感。
  视觉与 DOM 方案都在 `src/components/blog/ArchiveTimeline.vue` 里；本页只负责
  「取数据 + 空状态 + 页头计数」。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { archives } from 'virtual:blog/taxonomy'

import ArchiveTimeline from '@/components/blog/ArchiveTimeline.vue'

const total = computed(() => archives.reduce((sum, year) => sum + year.count, 0))
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold text-font">归档</h1>
      <p v-if="total > 0" class="text-sm text-font opacity-70">
        共 {{ archives.length }} 年 · {{ total }} 篇文章
      </p>
    </header>

    <p
      v-if="archives.length === 0"
      class="rounded-lg border border-border bg-card p-6 text-sm text-font opacity-70"
    >
      还没有文章，先去写一篇吧。
    </p>

    <ArchiveTimeline v-else :years="archives" />
  </div>
</template>
