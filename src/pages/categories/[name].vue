<!-- 单个分类下的文章列表 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { categories } from 'virtual:blog/taxonomy'

import PostLinkList from '@/components/blog/PostLinkList.vue'
import { routeParam, safeDecode } from '@/utils/route'

const route = useRoute()
const name = computed(() => routeParam(route.params.name))

const category = computed(
  () =>
    categories.find((item) => item.name === name.value) ??
    categories.find((item) => safeDecode(item.name) === name.value) ??
    null,
)
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold text-font">
        分类：<span class="text-primary">{{ category?.name ?? name }}</span>
      </h1>
      <p v-if="category" class="text-sm text-font opacity-70">{{ category.count }} 篇文章</p>
    </header>

    <PostLinkList v-if="category" :posts="category.posts" />

    <div v-else class="flex flex-col items-start gap-3 text-sm text-font">
      <p>没有找到这个分类。</p>
      <RouterLink to="/categories" class="text-primary hover:underline">返回分类列表</RouterLink>
    </div>
  </div>
</template>
