<!--
  首页分页。
  el-pagination 属于允许清单里的「功能性组件」，但 EP 样式未分层（ADR-002），
  Tailwind 工具类压不住它内部，所以外观微调一律走 scoped `:deep()`，全程不用 !important。
  特异性已核对：`[data-v-x] .el-pagination.is-background .el-pager li` = (0,4,1)，
  EP 自己的 =.el-pagination.is-background .el-pager li` = (0,3,1)，我们稳赢。
-->
<script setup lang="ts">
const props = defineProps<{
  total: number
  pageSize: number
  currentPage: number
}>()

const emit = defineEmits<{ change: [page: number] }>()
</script>

<template>
  <div class="pagination-host flex justify-center pt-2">
    <el-pagination
      background
      layout="prev, pager, next"
      :total="props.total"
      :page-size="props.pageSize"
      :current-page="props.currentPage"
      :pager-count="5"
      hide-on-single-page
      @current-change="(page: number) => emit('change', page)"
    />
  </div>
</template>

<style lang="scss" scoped>
.pagination-host {
  :deep(.el-pagination.is-background .el-pager li),
  :deep(.el-pagination.is-background .btn-prev),
  :deep(.el-pagination.is-background .btn-next) {
    color: var(--font-color);
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    transition: all 0.25s ease;
  }

  :deep(.el-pagination.is-background .el-pager li:not(.is-disabled):hover),
  :deep(.el-pagination.is-background .btn-prev:not(:disabled):hover),
  :deep(.el-pagination.is-background .btn-next:not(:disabled):hover) {
    color: var(--primary);
  }

  :deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
    color: #fff;
    background-color: var(--primary);
    border-color: var(--primary);
  }

  :deep(.el-pagination.is-background .el-pager li.is-disabled),
  :deep(.el-pagination.is-background .btn-prev:disabled),
  :deep(.el-pagination.is-background .btn-next:disabled) {
    color: var(--font-color);
    background-color: var(--card-hover-bg);
    border-color: var(--border-color);
    opacity: 0.6;
  }
}
</style>
