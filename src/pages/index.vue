<!--
  首页 —— 本批只做「最小竖切」：证明 virtual:blog/posts 通了。
  Butterfly 首屏（Banner / 打字机 / 视差 / 波浪）与卡片流视觉在下一批。
-->
<script setup lang="ts">
import { posts } from 'virtual:blog/posts'

import PostLinkList from '@/components/blog/PostLinkList.vue'
import { siteConfig } from '@/config/site'
</script>

<template>
  <div class="flex flex-col gap-6">
    <section class="butterfly-fade-in">
      <h1 class="text-2xl font-semibold text-font">{{ siteConfig.title }}</h1>
      <p class="mt-1 text-sm text-font opacity-80">{{ siteConfig.subtitle }}</p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold text-font">文章（{{ posts.length }}）</h2>
      <PostLinkList :posts="posts" />
    </section>
  </div>
</template>
