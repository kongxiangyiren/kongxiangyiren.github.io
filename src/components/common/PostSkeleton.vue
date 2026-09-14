<!--
  正文骨架屏（自研，替掉 el-skeleton）。

  纯静态灰块 + `animate-pulse`：宽度由行号决定，**不用随机数**，所以两次渲染的骨架
  完全一致，不会自己制造出新的布局抖动。`motion-reduce:animate-none` 尊重用户的
  减少动态效果偏好（无限循环的呼吸动画对前庭敏感用户不友好）。

  骨架本身对读屏器没有意义，所以整块 `aria-hidden`；无障碍播报由调用方（详情页）
  用 `sr-only` 文本 + `aria-busy` 承担。
-->
<script setup lang="ts">
withDefaults(defineProps<{ lines?: number }>(), { lines: 6 })
</script>

<template>
  <div class="flex flex-col gap-3" aria-hidden="true">
    <div
      v-for="line in lines"
      :key="line"
      class="h-4 animate-pulse rounded bg-card-hover motion-reduce:animate-none"
      :class="line === lines ? 'w-2/3' : 'w-full'"
    ></div>
  </div>
</template>
