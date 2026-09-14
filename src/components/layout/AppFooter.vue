<!--
  页脚：运行时长实时计时 + 版权 + 备案占位 + 社交图标。
  站点信息全部来自 src/config/site.ts。

  计时与日期计算不在本组件里 —— 见 `useUptime()`（关于页也要显示运行时长），
  数学部分在 `src/utils/uptime.ts`。
-->
<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { siteConfig } from '@/config/site'
import { useUptime } from '@/composables/useUptime'

const { parts: uptime, copyrightYears } = useUptime()
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
