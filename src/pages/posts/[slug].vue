<!--
  文章详情。
  正文是构建期渲染好的 HTML，这里只负责摆位置。
  TOC 滚动高亮、上下篇导航、评论位属于下一批，这一批给出朴素的锚点列表，
  用来验证内容层输出的 TOC 结构确实可用（不靠运行时抓 DOM）。
-->
<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { posts } from 'virtual:blog/posts'

import AppIcon from '@/components/common/AppIcon.vue'
import { siteConfig } from '@/config/site'
import { formatPostDate, toDateTimeAttr } from '@/utils/date'
import { routeParam } from '@/utils/route'

const route = useRoute()

const slug = computed(() => routeParam(route.params.slug))
const post = computed(() => posts.find((item) => item.slug === slug.value) ?? null)

watchEffect(() => {
  // 让浏览器标签页显示文章名；离开时由 router.afterEach 复位
  if (post.value) document.title = `${post.value.title} - ${siteConfig.title}`
})
</script>

<template>
  <article v-if="post" class="flex flex-col gap-6">
    <header class="flex flex-col gap-3">
      <h1 class="text-2xl font-semibold text-font">{{ post.title }}</h1>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-font opacity-80">
        <time :datetime="toDateTimeAttr(post.date)">
          发表于 {{ formatPostDate(post.date, true) }}
        </time>
        <span v-if="post.updated">更新于 {{ formatPostDate(post.updated, true) }}</span>
        <span>{{ post.wordCount }} 字 · 约 {{ post.readingTime }} 分钟</span>
      </div>

      <div class="flex flex-wrap gap-2 text-xs">
        <RouterLink
          v-for="category in post.categories"
          :key="category"
          :to="`/categories/${category}`"
          class="rounded border border-border px-1.5 py-0.5 text-font transition-colors hover:text-primary"
        >
          {{ category }}
        </RouterLink>
        <RouterLink
          v-for="tag in post.tags"
          :key="tag"
          :to="`/tags/${tag}`"
          class="rounded border border-border px-1.5 py-0.5 text-primary transition-colors hover:bg-card-hover"
        >
          #{{ tag }}
        </RouterLink>
      </div>
    </header>

    <nav v-if="post.toc.length > 0" class="rounded-lg border border-border bg-card p-4">
      <p class="mb-2 text-sm font-medium text-font">目录</p>
      <ul class="flex flex-col gap-1 text-sm">
        <li v-for="item in post.toc" :key="item.id" :style="{ paddingLeft: `${(item.level - 2) * 12}px` }">
          <a :href="`#${item.id}`" class="text-font transition-colors hover:text-primary">
            {{ item.text }}
          </a>
        </li>
      </ul>
    </nav>

    <!--
      构建期产物，来源是本仓库 content/ 下的 Markdown（单作者可信内容），
      运行时不接受任何用户输入，所以 v-html 是安全的。
    -->
    <div class="markdown-body" v-html="post.html"></div>

    <footer class="border-t border-border pt-4">
      <RouterLink to="/" class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <AppIcon name="arrow-up" class="h-4 w-4 -rotate-90" />
        返回首页
      </RouterLink>
    </footer>
  </article>

  <div v-else class="flex flex-col items-start gap-3 py-10 text-font">
    <p class="text-lg font-medium">没有找到这篇文章</p>
    <p class="text-sm opacity-70">slug：{{ slug }}</p>
    <RouterLink to="/" class="text-sm text-primary hover:underline">回到首页</RouterLink>
  </div>
</template>
