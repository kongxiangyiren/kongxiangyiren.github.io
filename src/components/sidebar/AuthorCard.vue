<!--
  作者卡（Tailwind 自研）。
  统计数字来自内容层：文章数用 virtual:blog/posts，标签/分类数用 virtual:blog/taxonomy ——
  都是元数据，不含正文，所以这张卡不会把任何文章的 HTML 拖进首页。
-->
<script setup lang="ts">
  import { computed } from 'vue';
  import { posts } from 'virtual:blog/posts';
  import { categories, tags } from 'virtual:blog/taxonomy';

  import AppIcon from '@/components/common/AppIcon.vue';
  import SidebarCard from '@/components/sidebar/SidebarCard.vue';
  import { siteConfig } from '@/config/site';

  const stats = computed(() => [
    { label: '文章', value: posts.length },
    { label: '标签', value: tags.length },
    { label: '分类', value: categories.length }
  ]);
</script>

<template>
  <SidebarCard title="关于我" icon="link">
    <div class="flex flex-col items-center gap-3">
      <img
        :src="siteConfig.author.avatar"
        :alt="`${siteConfig.author.name} 的头像`"
        width="80"
        height="80"
        loading="lazy"
        decoding="async"
        class="h-20 w-20 rounded-full border border-border object-cover"
      />

      <p class="font-medium text-font">{{ siteConfig.author.name }}</p>
      <p class="text-center text-xs leading-relaxed text-font opacity-75">
        {{ siteConfig.author.bio }}
      </p>

      <ul class="flex items-center gap-1">
        <li v-for="social in siteConfig.socials" :key="social.label">
          <a
            :href="social.href"
            :aria-label="social.label"
            :title="social.label"
            rel="noopener noreferrer"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-font transition-colors hover:bg-card-hover hover:text-primary"
          >
            <AppIcon :name="social.icon" class="h-4 w-4" />
          </a>
        </li>
      </ul>

      <ul class="mt-1 grid w-full grid-cols-3 gap-2 text-center">
        <li v-for="item in stats" :key="item.label" class="rounded-md bg-card-hover px-2 py-1.5">
          <p class="text-sm font-semibold text-primary">{{ item.value }}</p>
          <p class="text-xs text-font opacity-70">{{ item.label }}</p>
        </li>
      </ul>
    </div>
  </SidebarCard>
</template>
