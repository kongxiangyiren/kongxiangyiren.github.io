<!--
  分类索引 —— 最小可用版。
  「分类 → 子分类」的树形展示在下一批，这里先拍平。
-->
<script setup lang="ts">
import { categories } from 'virtual:blog/taxonomy'
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold text-font">分类</h1>
    <p class="text-sm text-font opacity-70">共 {{ categories.length }} 个分类</p>

    <ul class="flex flex-wrap gap-2">
      <li v-for="category in categories" :key="category.name">
        <RouterLink
          :to="`/categories/${category.name}`"
          class="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-sm text-font transition-colors hover:text-primary"
        >
          <span>{{ category.name }}</span>
          <span class="text-xs opacity-60">{{ category.count }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
