<!--
  标签云（Tailwind 自研，不用 el-tag）。
  Butterfly 的标志性细节是**字号随文章数权重变化**：这里把每个标签的数量在
  [min, max] 之间归一化，然后在最小/最大字号之间线性插值；颜色也从正文字色
  渐变到主题色（用 color-mix），保证亮 / 暗两种主题下都够清晰。

  归一化算法已抽到 `src/utils/taxonomy.ts`（标签总览页要用同一口径）；
  字号端点仍留在本文件 —— 侧边栏是窄卡，和整页总览的视觉本来就不该一样。
-->
<script setup lang="ts">
  import { computed } from 'vue';
  import { tags } from 'virtual:blog/taxonomy';

  import SidebarCard from '@/components/sidebar/SidebarCard.vue';
  import { interpolateRatios } from '@/utils/taxonomy';

  /** 最小 / 最大字号（rem）—— 插值的两端 */
  const MIN_SIZE = 0.8125;
  const MAX_SIZE = 1.25;

  const cloud = computed(() => {
    const ratios = interpolateRatios(tags.map(item => item.count));

    return tags.map((item, index) => {
      // 只有一个权重时取中值（`interpolateRatios` 已处理除零），避免字号全部跳到一端
      const ratio = ratios[index] ?? 0.5;
      return {
        name: item.name,
        count: item.count,
        fontSize: `${(MIN_SIZE + (MAX_SIZE - MIN_SIZE) * ratio).toFixed(3)}rem`,
        color: `color-mix(in srgb, var(--primary) ${Math.round(35 + 65 * ratio)}%, var(--font-color))`
      };
    });
  });
</script>

<template>
  <SidebarCard title="标签云" icon="tag">
    <p v-if="cloud.length === 0" class="text-xs text-font opacity-70">还没有标签。</p>

    <ul v-else class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <li v-for="tag in cloud" :key="tag.name">
        <RouterLink
          :to="`/tags/${tag.name}`"
          :style="{ fontSize: tag.fontSize, color: tag.color }"
          :title="`${tag.name}（${tag.count} 篇）`"
          class="leading-tight transition-opacity hover:opacity-75"
        >
          #{{ tag.name }}
        </RouterLink>
      </li>
    </ul>
  </SidebarCard>
</template>
