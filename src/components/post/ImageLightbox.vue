<!--
  图片放大（lightbox）—— **只在第一次点正文图片时被 `import()` 拉进来**。

  这是批 2B-2 的性能硬门禁，所以刻意不用 `el-image`：
  `el-image` 静态依赖整套 `ElImageViewer`（缩放 / 旋转 / 翻页工具栏），
  给「点开看大图」这件事用属于严重超配，且会把体积压在首页 chunk 上。

  自研的部分一件不少：
    - 遮罩 + 居中显示，图片超出视口时按 `max-h` / `max-w` 等比缩下来（`object-contain`）
    - 三种关闭方式：点遮罩、点关闭按钮、Esc（Esc 由 useFocusTrap 代劳）
    - 焦点陷阱 / 打开时移入焦点 / 关闭后归还原元素 → `useFocusTrap`
    - 滚动锁 → `useScrollLock`（与 AppHeader 的移动端抽屉共用同一份实现）
  刻意**不做**的：旋转、缩放滑块、多图翻页。那是 el-image-viewer 超配的根源，
  也不是这个博客会用到的东西。

  已知取舍（如实记录）：放大入口是**指针操作**，键盘用户没有等价入口。
  不给正文图片加 `tabindex="0"` / `role="button"` 的原因是一篇长文里的每张图
  都会变成 Tab 站点，对键盘用户的伤害大于收益；图片的 `alt` 与原始 URL 仍在
  无障碍树里可达（读屏能读到图，也能从 DOM 里取到 `src`）。
-->
<script setup lang="ts">
  import { computed, ref, toRef } from 'vue';
  import { usePreferredReducedMotion } from '@vueuse/core';

  import AppIcon from '@/components/common/AppIcon.vue';
  import { useFocusTrap } from '@/composables/useFocusTrap';
  import { useScrollLock } from '@/composables/useScrollLock';

  const props = defineProps<{
    /** 由页面持有：组件会先以 open=false 挂载完，再翻成 true（见 [slug].vue 的 openLightbox） */
    open: boolean;
    src: string;
    alt?: string;
  }>();

  const emit = defineEmits<{ close: [] }>();

  const panel = ref<HTMLElement | null>(null);
  const open = toRef(props, 'open');
  const reducedMotion = usePreferredReducedMotion();

  /** reduce 时连过渡都不挂：`:css="false"` 让 Vue 直接跳过过渡检测 */
  const motionEnabled = computed(() => reducedMotion.value !== 'reduce');

  function close(): void {
    emit('close');
  }

  // Esc / Tab 循环 / 焦点归还
  useFocusTrap({ container: panel, open, onClose: close });
  // 打开期间禁止背景滚动（与移动端抽屉共用一个引用计数锁）
  useScrollLock(open);
</script>

<template>
  <Transition :css="motionEnabled" name="lightbox">
    <!--
      面板本身就是整屏遮罩：`@click.self` 命中「点到图以外的地方」→ 关闭。
      把它做成焦点陷阱容器（而不是把按钮放在容器外），是因为 `useFocusTrap` 的
      Tab 循环只看容器内部，按钮在外就会找不到可聚焦元素、把 Tab 全部吃掉。
    -->
    <div
      v-if="open"
      ref="panel"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      tabindex="-1"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4"
      @click.self="close"
    >
      <img :src="src" :alt="alt ?? ''" class="max-h-full max-w-full object-contain" />

      <button
        type="button"
        class="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
        aria-label="关闭图片预览"
        @click="close"
      >
        <AppIcon name="close" class="h-5 w-5" />
      </button>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
  /* 只做淡入淡出，不做位移 —— 图片已经在做等比缩放，再加动效会很吵 */
  .lightbox-enter-active,
  .lightbox-leave-active {
    transition: opacity 0.2s ease;
  }

  .lightbox-enter-from,
  .lightbox-leave-to {
    opacity: 0;
  }
</style>
