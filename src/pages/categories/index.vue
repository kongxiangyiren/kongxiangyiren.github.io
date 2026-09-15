<!--
  分类总览 —— Butterfly 的分类页是**卡片网格**（不是标签云那种行内流）。

  为什么分类用卡片而不用云：分类是「几乎不增长」的有限集合（标签会越来越多），
  卡片网格能给每个分类留下足够的行高与点击面积，扫视成本比云更低。
  计数直接取 taxonomy 的 `count`（构建期算好），不在前端重算。
-->
<script setup lang="ts">
  import { categories } from 'virtual:blog/taxonomy';

  import AppIcon from '@/components/common/AppIcon.vue';
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold text-font">分类</h1>
      <p class="text-sm text-font opacity-70">共 {{ categories.length }} 个分类</p>
    </header>

    <p
      v-if="categories.length === 0"
      class="rounded-lg border border-border bg-card p-6 text-sm text-font opacity-70"
    >
      还没有分类。给文章加上 frontmatter 的 `categories` 就会出现。
    </p>

    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="category in categories" :key="category.name">
        <RouterLink
          :to="`/categories/${category.name}`"
          class="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <span
            class="flex items-center gap-2 text-base font-medium text-font group-hover:text-primary"
          >
            <AppIcon name="folder" class="h-4 w-4 shrink-0 text-primary" />
            <span class="truncate">{{ category.name }}</span>
          </span>
          <span class="text-xs text-font opacity-60">{{ category.count }} 篇文章</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
