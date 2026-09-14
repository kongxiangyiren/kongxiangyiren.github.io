<!--
  文章版权卡（Butterfly 详情页底部那块）。

  最容易做错的一点：**原文链接必须在运行时取**。
  dev（localhost:5173）、preview（localhost:4173）、生产域名三者各不相同，构建期
  算出来的只会是其中一个的裸路径 —— 所以这里读 `window.location.href`。
  又因为 `[slug].vue` 在**同一条路由记录**里切 slug 时组件不会重建（只有参数变），
  必须在路由变化时重新读一次，否则从 A 篇翻到 B 篇，版权卡还印着 A 的链接。

  顺手去掉 hash：点 TOC 会往地址栏写 `#某章节`，那不是「原文」的一部分。
-->
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import { siteConfig } from '@/config/site'
import { formatPostDate } from '@/utils/date'

defineProps<{
  /** 发表日期（`YYYY-MM-DD HH:mm:ss` 字面量） */
  date: string
}>()

const route = useRoute()

/** 当前页面绝对地址。挂载前是空串，对应的那一行不渲染（不给读屏用户一个空链接） */
const pageUrl = ref('')

function syncPageUrl(): void {
  const url = new URL(window.location.href)
  url.hash = ''
  pageUrl.value = url.toString()
}

onMounted(syncPageUrl)

watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    syncPageUrl()
  },
)
</script>

<template>
  <section
    class="rounded-lg border border-border bg-card p-4"
    aria-labelledby="post-copyright-title"
  >
    <p id="post-copyright-title" class="mb-3 text-sm font-medium text-font">版权声明</p>

    <dl class="flex flex-col gap-1.5 text-xs leading-relaxed text-font">
      <div class="flex gap-1.5">
        <dt class="shrink-0 opacity-70">作者：</dt>
        <dd>{{ siteConfig.author.name }}</dd>
      </div>

      <div class="flex gap-1.5">
        <dt class="shrink-0 opacity-70">发表日期：</dt>
        <dd>{{ formatPostDate(date) }}</dd>
      </div>

      <!-- 协议名留空时整行不渲染（站点只想标注作者与链接就不填） -->
      <div v-if="siteConfig.license" class="flex gap-1.5">
        <dt class="shrink-0 opacity-70">版权协议：</dt>
        <dd>
          <a
            :href="siteConfig.licenseUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            {{ siteConfig.license }}
          </a>
        </dd>
      </div>

      <div v-if="pageUrl" class="flex gap-1.5">
        <dt class="flex shrink-0 items-center gap-1 opacity-70">
          <AppIcon name="link" class="h-3.5 w-3.5" />
          原文链接：
        </dt>
        <dd class="min-w-0">
          <!-- break-all：URL 是一整串无空格字符，不强制断行会把卡片撑破 -->
          <a :href="pageUrl" class="break-all text-primary hover:underline">{{ pageUrl }}</a>
        </dd>
      </div>
    </dl>
  </section>
</template>
