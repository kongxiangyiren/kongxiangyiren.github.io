<!-- 关于页 —— 本批只占位，完整内容（技能 / 时间线 / 站点统计）在下一批 -->
<script setup lang="ts">
import { siteConfig } from '@/config/site'
</script>

<template>
  <div class="flex flex-col gap-5">
    <h1 class="text-2xl font-semibold text-font">关于</h1>

    <div class="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <img
        :src="siteConfig.author.avatar"
        :alt="`${siteConfig.author.name} 的头像`"
        width="64"
        height="64"
        class="h-16 w-16 rounded-full"
      />
      <div class="flex flex-col gap-1">
        <p class="font-medium text-font">{{ siteConfig.author.name }}</p>
        <p class="text-sm text-font opacity-80">{{ siteConfig.author.bio }}</p>
      </div>
    </div>

    <p class="text-sm text-font opacity-70">{{ siteConfig.description }}</p>

    <p class="rounded-lg border border-dashed border-border p-4 text-sm text-font opacity-70">
      这一页的完整内容（技能、时间线、站点统计）安排在下一批。
    </p>
  </div>
</template>
