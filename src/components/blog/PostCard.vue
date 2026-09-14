<!--
  首页文章卡片（Tailwind 自研，不用 el-card）。

  两个容易踩的点：
   1. **整卡可点 + 封面可预览**：标题链接用 stretched link（`after:absolute after:inset-0`
      把伪元素铺满整张卡）实现「整卡可点」；封面容器抬到 z-10，所以点封面走 el-image
      的预览，点其他地方进详情，两者不打架。标签 / 分类链接同样要 `relative z-10`，
      否则会被那层伪元素盖住点不到。
   2. **入场动画与 hover 位移不能写在同一个元素上**：`.butterfly-reveal` 用的是
      `transform: translateY()`，Tailwind 的 `hover:-translate-y-1` 也用 transform，
      两者特异性接近、顺序不可控。所以外层包一个只负责 reveal 的 div，卡片本体负责 hover。
-->
<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { useReveal } from '@/composables/useReveal'
import type { BlogPostPreview } from '@/types/blog'
import { formatPostDate, toDateTimeAttr } from '@/utils/date'

const props = defineProps<{ post: BlogPostPreview }>()

const { target, revealed } = useReveal()
const postUrl = computed(() => `/posts/${props.post.slug}`)
</script>

<template>
  <div ref="target" class="butterfly-reveal" :class="{ 'is-revealed': revealed }">
    <article
      class="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <!--
        有封面：el-image 只负责懒加载。
        刻意**不开** `preview-src-list` —— el-image 的预览会把 EP 的 image-viewer
        整个拖进首页 chunk（实测 +120 kB）。「点击放大」属于批 2B，届时再单独按需引入。
      -->
      <div
        v-if="post.cover"
        class="relative z-10 aspect-video w-full overflow-hidden bg-card-hover"
      >
        <el-image
          :src="post.cover"
          :alt="`${post.title} 的封面`"
          fit="cover"
          lazy
          class="post-cover"
        >
          <template #placeholder>
            <div class="h-full w-full bg-card-hover"></div>
          </template>
          <template #error>
            <div
              class="flex h-full w-full items-center justify-center bg-card-hover text-xs text-font opacity-60"
            >
              封面加载失败
            </div>
          </template>
        </el-image>
      </div>

      <!-- 无封面：优雅降级 —— 用一条主题色渐变代替图片区，不留破图 -->
      <div
        v-else
        class="h-1.5 w-full bg-gradient-to-r from-primary via-primary/40 to-primary/10"
        aria-hidden="true"
      ></div>

      <div class="flex flex-1 flex-col gap-3 p-4">
        <h2 class="text-lg leading-snug font-semibold">
          <RouterLink
            :to="postUrl"
            class="text-font transition-colors after:absolute after:inset-0 group-hover:text-primary"
          >
            {{ post.title }}
          </RouterLink>
        </h2>

        <p v-if="post.description" class="line-clamp-3 text-sm text-font opacity-80">
          {{ post.description }}
        </p>

        <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span v-if="post.sticky > 0" class="rounded bg-primary px-1.5 py-0.5 text-white">
            置顶
          </span>

          <time
            class="inline-flex items-center gap-1 text-font opacity-70"
            :datetime="toDateTimeAttr(post.date)"
          >
            <AppIcon name="calendar" class="h-3.5 w-3.5" />
            {{ formatPostDate(post.date) }}
          </time>

          <RouterLink
            v-for="category in post.categories"
            :key="`c-${category}`"
            :to="`/categories/${category}`"
            class="relative z-10 inline-flex items-center gap-1 text-primary transition-opacity hover:opacity-75"
          >
            <AppIcon name="folder" class="h-3.5 w-3.5" />
            {{ category }}
          </RouterLink>

          <RouterLink
            v-for="tag in post.tags"
            :key="`t-${tag}`"
            :to="`/tags/${tag}`"
            class="relative z-10 rounded border border-border px-1.5 py-0.5 text-primary transition-colors hover:bg-card-hover"
          >
            #{{ tag }}
          </RouterLink>

          <span class="inline-flex items-center gap-1 text-font opacity-70">
            <AppIcon name="clock" class="h-3.5 w-3.5" />
            {{ post.readingTime }} 分钟
          </span>
        </div>
      </div>
    </article>
  </div>
</template>

<style lang="scss" scoped>
/*
 * el-image 的根元素默认是 inline-block 且宽高自适应，撑不满外层容器。
 * EP 样式未分层（ADR-002），工具类压不住它，所以这里用组件内 :deep()（不用 !important）。
 * 特异性：(0,2,0) > EP 的 `.el-image` (0,1,0)。
 * 注意 el-image 会把外部 class 合并到根元素上，所以 `.post-cover` 和 `.el-image` 是同一节点。
 */
:deep(.post-cover) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
