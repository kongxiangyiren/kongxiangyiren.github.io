<!--
  页脚：运行时长实时计时 + 版权 + 备案占位 + 社交图标。
  站点信息全部来自 src/config/site.ts。
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { siteConfig } from '@/config/site'

/** 起算日按本地零点解析（不加 Z），避免时区偏移让天数差一天 */
const startedAt = new Date(`${siteConfig.footerStartDate}T00:00:00`).getTime()
const startYear = new Date(startedAt).getFullYear()

const now = ref(Date.now())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer)
})

const uptime = computed(() => {
  const totalSeconds = Math.max(0, Math.floor((now.value - startedAt) / 1000))
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
})

const currentYear = computed(() => new Date(now.value).getFullYear())

const copyrightYears = computed(() =>
  currentYear.value > startYear ? `${startYear} - ${currentYear.value}` : String(startYear),
)
</script>

<template>
  <footer class="mt-10 border-t border-border bg-card/60">
    <div
      class="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-center text-sm text-font"
    >
      <p>
        本博客已运行
        <span class="font-medium text-primary">
          {{ uptime.days }} 天 {{ uptime.hours }} 时 {{ uptime.minutes }} 分 {{ uptime.seconds }} 秒
        </span>
      </p>

      <ul class="flex items-center gap-2">
        <li v-for="social in siteConfig.socials" :key="social.label">
          <a
            :href="social.href"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-font transition-colors hover:bg-card-hover hover:text-primary"
            :aria-label="social.label"
            :title="social.label"
            rel="noopener noreferrer"
          >
            <AppIcon :name="social.icon" class="h-5 w-5" />
          </a>
        </li>
      </ul>

      <p>© {{ copyrightYears }} {{ siteConfig.author.name }} · 由 Vue + Vite 构建</p>

      <!-- 境外服务器无备案 → icp 为空字符串，整行不渲染 -->
      <p v-if="siteConfig.icp" class="text-xs">
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline"
        >
          {{ siteConfig.icp }}
        </a>
      </p>
    </div>
  </footer>
</template>
