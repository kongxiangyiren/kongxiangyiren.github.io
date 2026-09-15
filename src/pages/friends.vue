<!--
  友链页 —— 同样**配置驱动**（`siteConfig.friends` / `friendApplyNote` / `friendApplyRules`）。

  默认 `friends: []` 是刻意的：不虚构真实友链。空数组时显示友好空状态，
  但「申请友链」说明**照常显示**（页面的目的是招友链，不能因为还没友链就什么都不说）。
-->
<script setup lang="ts">
  import { siteConfig } from '@/config/site';
  import FriendCard from '@/components/friends/FriendCard.vue';
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold text-font">友链</h1>
      <p v-if="siteConfig.friends.length > 0" class="text-sm text-font opacity-70">
        共 {{ siteConfig.friends.length }} 位朋友
      </p>
    </header>

    <p
      v-if="siteConfig.friends.length === 0"
      class="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-font opacity-70"
    >
      还没有友链。如果你有一个持续更新的技术博客，欢迎来交换链接。
    </p>

    <ul v-else class="grid gap-4 sm:grid-cols-2">
      <FriendCard v-for="friend in siteConfig.friends" :key="friend.url" :friend="friend" />
    </ul>

    <!-- 申请说明：留空字符串则整块不渲染 -->
    <section v-if="siteConfig.friendApplyNote" class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold text-font">申请友链</h2>

      <div class="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
        <p class="text-sm leading-relaxed text-font opacity-80">{{ siteConfig.friendApplyNote }}</p>

        <ul
          v-if="siteConfig.friendApplyRules.length > 0"
          class="flex list-disc flex-col gap-1.5 pl-5 text-sm text-font opacity-80"
        >
          <li v-for="rule in siteConfig.friendApplyRules" :key="rule">{{ rule }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>
