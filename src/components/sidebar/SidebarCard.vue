<!--
  侧边栏卡片的统一外壳（Tailwind 自研，刻意不用 el-card）。
  标题左侧那道主题色小竖条是 Butterfly 侧栏卡的标志性细节。
-->
<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/types/ui'

defineProps<{ title: string; icon?: IconName }>()
</script>

<template>
  <section class="rounded-lg border border-border bg-card p-4 shadow-sm">
    <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-font">
      <span class="h-4 w-1 rounded-full bg-primary" aria-hidden="true"></span>
      <AppIcon v-if="icon" :name="icon" class="h-4 w-4 text-primary" />
      {{ title }}
    </h2>
    <slot />
  </section>
</template>
