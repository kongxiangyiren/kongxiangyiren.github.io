<!--
  标签索引 —— 最小可用版。
  标签云（字号权重 / 随机色）属于下一批，这里只做数量排序。
-->
<script setup lang="ts">
import { tags } from 'virtual:blog/taxonomy'
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold text-font">标签</h1>
    <p class="text-sm text-font opacity-70">共 {{ tags.length }} 个标签</p>

    <ul class="flex flex-wrap gap-2">
      <li v-for="tag in tags" :key="tag.name">
        <RouterLink
          :to="`/tags/${tag.name}`"
          class="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-sm text-font transition-colors hover:text-primary"
        >
          <span>#{{ tag.name }}</span>
          <span class="text-xs opacity-60">{{ tag.count }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
