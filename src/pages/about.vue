<!--
  关于页 —— 结构完整、**内容全部由 `src/config/site.ts` 驱动**。

  为什么不是硬编码：站长的真实经历 / 公司 / 学历只有站长知道，写死在这里就等于编造。
  所以本页只负责「有什么就渲染什么」：
    - 头像 / 昵称 / 简介 / 社交链接：复用 `siteConfig.author` 与 `socials`
    - 站点统计：文章数、标签数、分类数、总字数从虚拟模块现算；运行时长走
      `useUptime()`（与页脚**同一份实现**，不是复制一遍算法）
    - 技能 / 兴趣、个人时间线：`skills` / `timeline` 为空数组时**整块不渲染**
-->
<script setup lang="ts">
  import { computed } from 'vue';
  import { posts } from 'virtual:blog/posts';
  import { categories, tags } from 'virtual:blog/taxonomy';

  import AppIcon from '@/components/common/AppIcon.vue';
  import { siteConfig } from '@/config/site';
  import { useUptime } from '@/composables/useUptime';

  const { parts: uptime } = useUptime();

  /** 总字数取构建期算好的 `wordCount` 求和 —— 与文章卡片上显示的「N 字」同一口径 */
  const totalWords = computed(() => posts.reduce((sum, post) => sum + post.wordCount, 0));

  const stats = computed(() => [
    { label: '文章', value: String(posts.length) },
    { label: '标签', value: String(tags.length) },
    { label: '分类', value: String(categories.length) },
    { label: '总字数', value: totalWords.value.toLocaleString('en-US') },
    { label: '已运行', value: `${uptime.value.days} 天` }
  ]);
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold text-font">关于</h1>

    <!-- 名片：头像 + 昵称 + 简介 + 社交链接（全部来自配置） -->
    <section
      class="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center"
    >
      <img
        :src="siteConfig.author.avatar"
        :alt="`${siteConfig.author.name} 的头像`"
        width="80"
        height="80"
        class="h-20 w-20 shrink-0 rounded-full bg-card-hover object-cover"
      />

      <div class="flex min-w-0 flex-col gap-2">
        <p class="text-lg font-semibold text-font">{{ siteConfig.author.name }}</p>
        <p class="text-sm text-font opacity-80">{{ siteConfig.author.bio }}</p>

        <ul v-if="siteConfig.socials.length > 0" class="mt-1 flex flex-wrap items-center gap-2">
          <li v-for="social in siteConfig.socials" :key="social.label">
            <a
              :href="social.href"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-font transition-colors hover:border-primary hover:text-primary"
            >
              <AppIcon :name="social.icon" class="h-3.5 w-3.5" />
              {{ social.label }}
            </a>
          </li>
        </ul>
      </div>
    </section>

    <!-- 站点简介 -->
    <section class="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
      <h2 class="text-sm font-semibold text-font">关于本站</h2>
      <p class="text-sm leading-relaxed text-font opacity-80">{{ siteConfig.description }}</p>
    </section>

    <!-- 站点统计 -->
    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold text-font">站点统计</h2>
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <li
          v-for="item in stats"
          :key="item.label"
          class="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 text-center"
        >
          <span class="text-lg font-semibold text-primary">{{ item.value }}</span>
          <span class="text-xs text-font opacity-70">{{ item.label }}</span>
        </li>
      </ul>
    </section>

    <!-- 技能 / 兴趣：`siteConfig.skills` 为空数组 => 整块不渲染 -->
    <section v-if="siteConfig.skills.length > 0" class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold text-font">技能与兴趣</h2>
      <ul class="flex flex-wrap gap-2">
        <li
          v-for="skill in siteConfig.skills"
          :key="skill"
          class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-font"
        >
          {{ skill }}
        </li>
      </ul>
    </section>

    <!-- 个人时间线：同样空数组即不渲染 -->
    <section v-if="siteConfig.timeline.length > 0" class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold text-font">时间线</h2>
      <ol class="flex flex-col gap-4 border-l-2 border-border pl-5">
        <li
          v-for="entry in siteConfig.timeline"
          :key="`${entry.date}-${entry.title}`"
          class="relative"
        >
          <span
            class="absolute top-1.5 -left-6.75 h-3 w-3 rounded-full border-2 border-primary bg-global"
            aria-hidden="true"
          ></span>
          <p class="font-mono text-xs text-font opacity-70">{{ entry.date }}</p>
          <p class="mt-0.5 text-sm font-medium text-font">{{ entry.title }}</p>
          <p v-if="entry.description" class="mt-0.5 text-sm text-font opacity-80">
            {{ entry.description }}
          </p>
        </li>
      </ol>
    </section>
  </div>
</template>
