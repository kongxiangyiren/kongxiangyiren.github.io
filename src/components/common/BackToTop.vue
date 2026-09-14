<!--
  回到顶部。
  EP 的样式未分层（ADR-002），工具类压不住它内部的 .el-backtop，
  所以这里用组件内 scoped `:deep()` 对齐 Butterfly 观感（圆形 / 主题色 / hover 反色），
  全程不用 !important。
-->
<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
</script>

<template>
  <!-- 外层宿主是 :deep() 的锚点：:deep 编译成 [data-v-x] .el-backtop，需要真实祖先节点 -->
  <div class="back-to-top-host">
    <el-backtop :right="24" :bottom="24" :visibility-height="200">
      <AppIcon name="arrow-up" class="h-4 w-4" />
    </el-backtop>
  </div>
</template>

<style lang="scss" scoped>
.back-to-top-host {
  // 特异性 (0,4,0) > EP 自己的 .el-backtop / .el-backtop:hover (0,2,0)
  :deep(.el-backtop) {
    color: var(--primary);
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
    transition:
      color 0.25s ease,
      background-color 0.25s ease,
      border-color 0.25s ease;

    &:hover {
      color: #fff;
      background-color: var(--primary);
      border-color: var(--primary);
    }
  }
}
</style>
