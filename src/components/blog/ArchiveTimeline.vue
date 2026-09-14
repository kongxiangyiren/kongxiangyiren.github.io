<!--
  归档时间线（Butterfly 观感，**不用 el-timeline**）。

  DOM 方案：一条绝对定位的竖轴（`absolute inset-y-1 left-1.5 w-0.5`）+ 每「月」一个
  绝对定位的节点圆点，其余内容全部靠 `padding-left` 排在轴右侧。刻意没有用
  「`border-left` 挂在 <ul> 上」那套，因为那样年（大分组）与月（节点）会落在两条
  不同的左边线上，视觉上会错开。

  - 层级：年（大标题）→ 月（节点 + 圆点）→ 文章列表（复用 `PostLinkList`）
  - 计数：年与月各带 `X 篇`（沿用改造前的口径，数据来自 `virtual:blog/taxonomy`）
  - 圆点在 `left-0`、直径 14px（h-3.5 w-3.5），轴在 `left-1.5`、宽 2px
    → 圆心正好落在轴心（6px + 1px = 7px = 圆的一半），不需要魔法数字
  - 375px 不横向滚动：整块只有 `padding-left`，没有任何定宽/负 margin
-->
<script setup lang="ts">
import type { ArchiveYear } from '@/types/blog'

import PostLinkList from '@/components/blog/PostLinkList.vue'

const props = defineProps<{ years: ArchiveYear[] }>()
</script>

<template>
  <div class="relative">
    <!-- 竖轴：纯装饰（圆点与文字已表达全部信息），所以 aria-hidden -->
    <span
      class="absolute inset-y-1 left-1.5 w-0.5 rounded-full bg-border"
      aria-hidden="true"
    ></span>

    <div class="flex flex-col gap-7">
      <section
        v-for="year in props.years"
        :key="year.year"
        class="flex flex-col gap-4"
        :aria-label="`${year.year} 年`"
      >
        <h2 class="flex items-baseline gap-2 pl-7 text-lg font-semibold text-font">
          {{ year.year }} 年
          <span class="text-xs font-normal text-font opacity-60">{{ year.count }} 篇</span>
        </h2>

        <ul class="flex flex-col gap-6">
          <li v-for="month in year.months" :key="month.month" class="relative pl-7">
            <!-- 节点圆点：主题色描边 + 底色填充，正好压住竖轴 -->
            <span
              class="absolute top-1.5 left-0 h-3.5 w-3.5 rounded-full border-2 border-primary bg-global"
              aria-hidden="true"
            ></span>

            <h3 class="mb-2 flex items-baseline gap-2 text-sm font-medium text-font">
              {{ year.year }} 年 {{ month.month }} 月
              <span class="text-xs font-normal opacity-60">{{ month.count }} 篇</span>
            </h3>

            <PostLinkList :posts="month.posts" />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
