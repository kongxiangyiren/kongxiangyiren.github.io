<!--
  单个分类下的文章列表。
  与标签详情页同构（含未匹配兜底），只是图标 / 文案 / 返回入口不同；
  匹配逻辑共用 `src/utils/taxonomy.ts`。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { categories } from 'virtual:blog/taxonomy'

import PostLinkList from '@/components/blog/PostLinkList.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { routeParam } from '@/utils/route'
import { findTaxonomyItem } from '@/utils/taxonomy'

const route = useRoute()
const name = computed(() => routeParam(route.params.name))

const category = computed(() => findTaxonomyItem(categories, name.value))
</script>

<template>
  <div class="flex flex-col gap-5">
    <RouterLink
      to="/categories"
      class="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
    >
      <AppIcon name="arrow-up" class="h-4 w-4 -rotate-90" />
      全部分类
    </RouterLink>

    <header class="flex flex-col gap-1">
      <h1 class="flex items-center gap-2 text-2xl font-semibold text-font">
        <AppIcon name="folder" class="h-5 w-5 shrink-0 text-primary" />
        <span class="text-primary">{{ category?.name ?? name }}</span>
      </h1>
      <p v-if="category" class="text-sm text-font opacity-70">{{ category.count }} 篇文章</p>
    </header>

    <PostLinkList v-if="category" :posts="category.posts" />

    <div
      v-else
      class="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-6 text-sm text-font"
    >
      <p class="text-base font-medium">没有找到这个分类</p>
      <p class="opacity-70">
        分类「{{ name }}」不在本站的分类列表里，可能是链接过期或者名字写错了。
      </p>
      <RouterLink to="/categories" class="text-primary hover:underline">返回分类列表</RouterLink>
    </div>
  </div>
</template>
