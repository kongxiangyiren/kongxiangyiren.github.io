<!--
  文章目录（TOC）—— Butterfly 观感：左侧竖线 + 主题色 + 字重变化标记当前章节。

  纯展示组件：高亮状态由页面上的 `useTocHighlight` 统一算好传下来（`activeId`），
  点击只 `emit('select')`，滚动与 URL hash 修正都在那个 composable 里。
  这样同一份 TOC 无论渲染成桌面浮动卡还是移动端折叠卡，高亮永远只有一个真相来源。

  `variant` 只决定**形态**，不决定可见性 —— 谁在桌面显示、谁在移动端显示，由页面
  用 `lg:hidden` / `hidden lg:block` 控制（布局是页面的职责，不是目录的）。

  移动端刻意不用 `<details>`：这里需要 `aria-expanded` + `aria-controls` 的
  disclosure 模式，而 `<details>` 的 `open` 属性一旦被 Vue 绑定就会和用户点击
  互相打架（Vue 不会因为用户点了 summary 而重新渲染）。用 button 驱动更可控。
-->
<script setup lang="ts">
import { computed, ref, useId } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import type { TocItem } from '@/types/blog'

const props = withDefaults(
  defineProps<{
    items: TocItem[]
    /** 当前高亮项的 id */
    activeId?: string
    variant?: 'desktop' | 'mobile'
  }>(),
  { activeId: '', variant: 'desktop' },
)

const emit = defineEmits<{ select: [id: string] }>()

/** 移动端默认折叠（Butterfly 详情页的目录是收起的） */
const expanded = ref(false)

/**
 * `aria-controls` 要指向一个稳定 id，而两种 variant 可能同时在 DOM 里
 * （一个 `display:none`），所以不能写死 —— 用 `useId()` 取进程内唯一值。
 */
const listId = `post-toc-${useId()}`

const isMobile = computed(() => props.variant === 'mobile')
/** 桌面端永远展开；移动端听 `expanded`。`v-show` 用 `display:none` → 收起时不在无障碍树里 */
const showList = computed(() => !isMobile.value || expanded.value)
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-4">
    <button
      v-if="isMobile"
      type="button"
      class="flex w-full items-center justify-between gap-2 text-sm font-medium text-font"
      :aria-expanded="expanded"
      :aria-controls="listId"
      @click="expanded = !expanded"
    >
      <span>目录</span>
      <AppIcon
        name="arrow-down"
        class="toc-chevron h-4 w-4"
        :class="expanded ? 'toc-chevron--open text-primary' : ''"
      />
    </button>
    <p v-else class="mb-2 text-sm font-medium text-font">目录</p>

    <!--
      层级缩进沿用 (level - 2) * 12px。
      竖线做在 <a> 上（而不是 <li>）是为了让 hover/focus 的可点区域连成一条，
      未激活项用 `border-transparent` 占位，避免高亮时整行左右跳动。
    -->
    <nav
      v-show="showList"
      aria-label="文章目录"
      :class="
        isMobile ? 'mt-3 border-t border-border pt-3' : 'max-h-[calc(100vh-7rem)] overflow-y-auto'
      "
    >
      <ul :id="isMobile ? listId : undefined" class="flex flex-col">
        <li
          v-for="item in items"
          :key="item.id"
          :style="{ paddingLeft: `${(item.level - 2) * 12}px` }"
        >
          <a
            :href="`#${item.id}`"
            class="block border-l-2 py-1 pl-3 text-sm transition-colors"
            :class="
              item.id === activeId
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-font opacity-80 hover:border-primary hover:text-primary hover:opacity-100'
            "
            :aria-current="item.id === activeId ? 'location' : undefined"
            @click.prevent="emit('select', item.id)"
          >
            {{ item.text }}
          </a>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
/*
 * 折叠箭头。`aria-expanded` 已经表达了状态，这里只是把状态画出来 ——
 * 用 Sass 而不是 Tailwind 的 `group-open:` 之类的变体，是因为这里的开关
 * 来自组件状态（expanded ref），一条两行的规则比拼可读性更好。
 */
.toc-chevron {
  transition: transform 0.2s ease;

  &--open {
    transform: rotate(180deg);
  }
}
</style>
