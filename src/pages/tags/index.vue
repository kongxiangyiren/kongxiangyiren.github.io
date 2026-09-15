<!--
  标签总览 —— Butterfly 的标签云。

  与首页侧边栏的 `TagCloud.vue` 共用同一个权重口径（`src/utils/taxonomy.ts` 的
  `interpolateRatios`），但**两端各自决定字号/颜色的端点**：侧边栏是窄卡
  （0.81 → 1.25rem），整页有更多空间（0.95 → 1.6rem）。
  这就是「复用算法、不硬耦合视觉」的边界。
-->
<script setup lang="ts">
  import { computed } from 'vue';
  import { tags } from 'virtual:blog/taxonomy';

  import { interpolateRatios } from '@/utils/taxonomy';

  /** 字号插值两端（rem）。整页比侧边栏放得开，所以两头都更大 */
  const MIN_SIZE = 0.95;
  const MAX_SIZE = 1.6;

  const cloud = computed(() => {
    const ratios = interpolateRatios(tags.map(item => item.count));

    return tags.map((item, index) => {
      const ratio = ratios[index] ?? 0.5;
      return {
        name: item.name,
        count: item.count,
        fontSize: `${(MIN_SIZE + (MAX_SIZE - MIN_SIZE) * ratio).toFixed(3)}rem`,
        // 从正文字色渐变到主题色，亮 / 暗两种主题下都够清晰（与侧边栏同一套 color-mix）
        color: `color-mix(in srgb, var(--primary) ${Math.round(35 + 65 * ratio)}%, var(--font-color))`
      };
    });
  });
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold text-font">标签</h1>
      <p class="text-sm text-font opacity-70">
        共 {{ tags.length }} 个标签，字号与颜色随文章数变化
      </p>
    </header>

    <p
      v-if="cloud.length === 0"
      class="rounded-lg border border-border bg-card p-6 text-sm text-font opacity-70"
    >
      还没有标签。给文章加上 frontmatter 的 `tags` 就会出现。
    </p>

    <ul
      v-else
      class="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-border bg-card p-5"
    >
      <li v-for="tag in cloud" :key="tag.name">
        <RouterLink
          :to="`/tags/${tag.name}`"
          :style="{ fontSize: tag.fontSize, color: tag.color }"
          :title="`${tag.name}（${tag.count} 篇）`"
          class="inline-flex items-baseline leading-tight transition-opacity hover:opacity-75"
        >
          #{{ tag.name }}
          <span class="ml-1 text-[0.6em] opacity-70">{{ tag.count }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
