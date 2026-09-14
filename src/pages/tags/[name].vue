<!-- 单个标签下的文章列表 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { tags } from 'virtual:blog/taxonomy'

import PostLinkList from '@/components/blog/PostLinkList.vue'
import { routeParam, safeDecode } from '@/utils/route'

const route = useRoute()
const name = computed(() => routeParam(route.params.name))

// 先精确匹配；中文标签经 URL 编解码后可能形态不同，再退到解码后比较
const tag = computed(
  () =>
    tags.find((item) => item.name === name.value) ??
    tags.find((item) => safeDecode(item.name) === name.value) ??
    null,
)
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold text-font">
        标签：<span class="text-primary">{{ tag?.name ?? name }}</span>
      </h1>
      <p v-if="tag" class="text-sm text-font opacity-70">{{ tag.count }} 篇文章</p>
    </header>

    <PostLinkList v-if="tag" :posts="tag.posts" />

    <div v-else class="flex flex-col items-start gap-3 text-sm text-font">
      <p>没有找到这个标签。</p>
      <RouterLink to="/tags" class="text-primary hover:underline">返回标签列表</RouterLink>
    </div>
  </div>
</template>
