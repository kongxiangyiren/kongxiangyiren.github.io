<!--
  文章详情。
  元数据（标题 / 日期 / 标签 / TOC 之外的摘要信息）来自 `virtual:blog/posts`，
  正文 HTML + TOC 是**独立资源**，进页面后才按需 fetch（`src/api/post.ts` 里带缓存）。

  加载态用自研的 `PostSkeleton`（已删 el-skeleton，首页 EP 零依赖）。

  TOC 滚动高亮、上下篇导航、版权卡、图片放大（lightbox）属于批 2B-2，
  本批只为 lightbox 留了接入点（见正文下方注释），不写任何实现，更不能让相关代码
  进首页 chunk。
-->
<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { posts } from 'virtual:blog/posts'

import { loadPostBody } from '@/api/post'
import AppIcon from '@/components/common/AppIcon.vue'
import PostSkeleton from '@/components/common/PostSkeleton.vue'
import { siteConfig } from '@/config/site'
import type { BlogPostBody } from '@/types/blog'
import { formatPostDate, toDateTimeAttr } from '@/utils/date'
import { routeParam } from '@/utils/route'

const route = useRoute()

const slug = computed(() => routeParam(route.params.slug))
const meta = computed(() => posts.find((item) => item.slug === slug.value) ?? null)

const body = ref<BlogPostBody | null>(null)
const loading = ref(false)
const failed = ref(false)

watch(
  slug,
  async (value) => {
    body.value = null
    failed.value = false

    if (!value || !posts.some((item) => item.slug === value)) {
      loading.value = false
      return
    }

    loading.value = true
    try {
      const loaded = await loadPostBody(value)
      // 快速连点两篇文章时，别让先到的响应覆盖后到的
      if (slug.value === value) body.value = loaded
    } catch {
      if (slug.value === value) failed.value = true
    } finally {
      if (slug.value === value) loading.value = false
    }
  },
  { immediate: true },
)

watchEffect(() => {
  // 让浏览器标签页显示文章名；离开时由 router.afterEach 复位
  if (meta.value) document.title = `${meta.value.title} - ${siteConfig.title}`
})
</script>

<template>
  <article v-if="meta" class="flex flex-col gap-6">
    <header class="flex flex-col gap-3">
      <h1 class="text-2xl font-semibold text-font">{{ meta.title }}</h1>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-font opacity-80">
        <time :datetime="toDateTimeAttr(meta.date)">
          发表于 {{ formatPostDate(meta.date, true) }}
        </time>
        <span v-if="meta.updated">更新于 {{ formatPostDate(meta.updated, true) }}</span>
        <span>{{ meta.wordCount }} 字 · 约 {{ meta.readingTime }} 分钟</span>
      </div>

      <div class="flex flex-wrap gap-2 text-xs">
        <RouterLink
          v-for="category in meta.categories"
          :key="category"
          :to="`/categories/${category}`"
          class="rounded border border-border px-1.5 py-0.5 text-font transition-colors hover:text-primary"
        >
          {{ category }}
        </RouterLink>
        <RouterLink
          v-for="tag in meta.tags"
          :key="tag"
          :to="`/tags/${tag}`"
          class="rounded border border-border px-1.5 py-0.5 text-primary transition-colors hover:bg-card-hover"
        >
          #{{ tag }}
        </RouterLink>
      </div>
    </header>

    <!-- 加载态：正文是独立资源，网络慢时用骨架屏兜住高度 -->
    <div v-if="loading" class="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span class="sr-only">正在加载正文…</span>
      <PostSkeleton :lines="8" />
      <PostSkeleton :lines="6" />
    </div>

    <div
      v-else-if="failed"
      class="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-6 text-sm text-font"
    >
      <p>正文加载失败了，可能是网络问题。</p>
      <RouterLink to="/" class="text-primary hover:underline">回到首页</RouterLink>
    </div>

    <template v-else-if="body">
      <nav v-if="body.toc.length > 0" class="rounded-lg border border-border bg-card p-4">
        <p class="mb-2 text-sm font-medium text-font">目录</p>
        <ul class="flex flex-col gap-1 text-sm">
          <li
            v-for="item in body.toc"
            :key="item.id"
            :style="{ paddingLeft: `${(item.level - 2) * 12}px` }"
          >
            <a :href="`#${item.id}`" class="text-font transition-colors hover:text-primary">
              {{ item.text }}
            </a>
          </li>
        </ul>
      </nav>

      <!--
        构建期产物，来源是本仓库 content/ 下的 Markdown（单作者可信内容），
        运行时不接受任何用户输入，所以 v-html 是安全的。

        ［批 2B-2 接入点 —— 图片放大 lightbox］
        自研 lightbox 必须 `import()` 动态加载，**绝不能进首页 chunk**。
        计划在这里用**事件委托**（在 markdown-body 上监听 click，命中 `img` 才
        动态 import 并打开），而不是给每张图绑监听，也不是用 el-image ——
        el-image 静态依赖整个 ElImageViewer。本批不实现，只留这个接缝。
      -->
      <div class="markdown-body" v-html="body.html"></div>
    </template>

    <footer class="border-t border-border pt-4">
      <RouterLink
        to="/"
        class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
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
