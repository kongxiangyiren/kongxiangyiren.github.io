<!--
  首页分页 —— 纯 Tailwind 自研，首页 EP 零依赖（架构档案「EP 使用边界 v2」的裁定）。

  为什么必须删掉 el-pagination：它一个组件就带出 ElSelect / ElOptionGroup / ElTooltip /
  ElPopper 全家桶（实测首页 chunk 因此膨胀 100 kB 量级），而分页是用户盯着看的**可见 UI**，
  按既定边界本就该自研，不是"功能性组件"就能免责。

  改自研后不再需要 scoped `:deep()` 跟 EP 内部比特异性，观感直接用 Tailwind 工具类表达：
  圆角 6px（rounded-md）/ --card-bg 底 / --border-color 描边 / hover 变 --primary 文字色 /
  当前页 --primary 实底白字 / 禁用态 opacity-60。

  页码算法不在这里写死，走 `src/utils/pagination.ts` 的纯函数 —— 它逐行对齐了 EP
  `pager-count=5` 的行为，所以页码序列与改造前一模一样（不是"看着差不多"）。

  无障碍：`<nav>` + 真实 `<button>`（EP 用的是带 tabindex 的 `<li>`），
  当前页 `aria-current="page"`，禁用态用真实 `disabled` 属性，键盘 Tab / Enter 直接可用。
-->
<script setup lang="ts">
  import { computed } from 'vue';

  import AppIcon from '@/components/common/AppIcon.vue';
  import { DEFAULT_PAGER_COUNT, PAGER_JUMP_STEP, buildPagerItems } from '@/utils/pagination';

  const props = defineProps<{
    total: number;
    pageSize: number;
    currentPage: number;
  }>();

  const emit = defineEmits<{ change: [page: number] }>();

  /**
   * 按钮类名常量。
   *
   * 为什么用「基础 + 状态」两组字符串而不是在模板里堆 `:class`：
   * 当前页和普通页都需要 `border-*` / `bg-*` / `text-*`，而**同级工具类的胜负由 CSS 里的
   * 出现顺序决定，不由 class 属性的书写顺序决定** —— 靠"后面的类覆盖前面的类"是赌运气。
   * 拆成互斥的两组，同一时刻只有一个类存在，就不存在覆盖问题。
   *
   * （Tailwind 4 是扫源码文本找候选类的，模板字符串里的字面量一样能被扫到。）
   */
  const BTN =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60';
  /** 未选中 / 上一页下一页：--card-bg 底、--border-color 描边，hover 变 --primary 文字色 */
  const BTN_IDLE = 'border-border bg-card text-font enabled:hover:text-primary';
  /** 当前页：--primary 实底白字 */
  const BTN_ACTIVE = 'border-primary bg-primary font-medium text-white';

  /**
   * 兜底成 1 页：`pageSize` 为 0 时 `Math.ceil(total / 0)` 是 Infinity，
   * 会让页码算法算出一串无限页号。
   */
  const pageCount = computed(() =>
    props.pageSize > 0 ? Math.max(1, Math.ceil(props.total / props.pageSize)) : 1
  );

  /** 越界值（`?page=99`）夹回区间，跟 index.vue 的处理保持一致 */
  const current = computed(() => Math.min(Math.max(1, props.currentPage), pageCount.value));

  const items = computed(() =>
    buildPagerItems(pageCount.value, current.value, DEFAULT_PAGER_COUNT)
  );

  function go(page: number): void {
    if (page === current.value || page < 1 || page > pageCount.value) return;
    emit('change', page);
  }
</script>

<template>
  <!-- 保留 el-pagination 的 hide-on-single-page 行为：只有一页时整块不渲染 -->
  <nav v-if="pageCount > 1" class="flex justify-center pt-2" aria-label="分页导航">
    <ul class="flex items-center gap-2">
      <li>
        <button
          type="button"
          :class="[BTN, BTN_IDLE]"
          :disabled="current <= 1"
          aria-label="上一页"
          @click="go(current - 1)"
        >
          <AppIcon name="arrow-up" class="h-4 w-4 -rotate-90" />
        </button>
      </li>

      <li v-for="item in items" :key="item.type === 'page' ? `p-${item.page}` : item.key">
        <button
          v-if="item.type === 'page'"
          type="button"
          :class="[BTN, item.page === current ? BTN_ACTIVE : BTN_IDLE]"
          :aria-current="item.page === current ? 'page' : undefined"
          :aria-label="`第 ${item.page} 页`"
          @click="go(item.page)"
        >
          {{ item.page }}
        </button>

        <!-- 省略号是**可点**的（等价 el-pagination 的 quick-prev / quick-next，跳 PAGER_JUMP_STEP 页） -->
        <button
          v-else
          type="button"
          :class="[BTN, BTN_IDLE]"
          :aria-label="
            item.key === 'prev-more'
              ? `向前跳 ${PAGER_JUMP_STEP} 页`
              : `向后跳 ${PAGER_JUMP_STEP} 页`
          "
          @click="go(item.target)"
        >
          …
        </button>
      </li>

      <li>
        <button
          type="button"
          :class="[BTN, BTN_IDLE]"
          :disabled="current >= pageCount"
          aria-label="下一页"
          @click="go(current + 1)"
        >
          <AppIcon name="arrow-up" class="h-4 w-4 rotate-90" />
        </button>
      </li>
    </ul>
  </nav>
</template>
