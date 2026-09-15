<!--
  搜索弹窗内的单条结果。

  语义：父级是 `role="listbox"`，本项是 `role="option"`。所以
    - `aria-selected` 跟着**键盘高亮**走（不是"选中的那一个"，listbox 的语义如此）；
    - `id` 由父级生成，供输入框的 `aria-activedescendant` 指过来 —— 焦点始终留在输入框里，
      不需要把焦点搬到选项上（这是 combobox 模式相对"焦点在列表里"更省事的地方）；
    - 整块可点（`@click`），鼠标移入会被父级记成当前高亮项，保证「键盘高亮」与
      「鼠标悬停」不会各说各话。
-->
<script setup lang="ts">
  import type { SearchResult } from '@/api/search';
  import AppIcon from '@/components/common/AppIcon.vue';

  const props = defineProps<{
    result: SearchResult;
    id: string;
    /** 是否是当前键盘高亮项 */
    active: boolean;
  }>();

  const emit = defineEmits<{ select: []; activate: [] }>();
</script>

<template>
  <li
    :id="props.id"
    role="option"
    :aria-selected="props.active"
    class="cursor-pointer rounded-md px-3 py-2 transition-colors"
    :class="props.active ? 'bg-card-hover' : ''"
    @click="emit('select')"
    @mouseenter="emit('activate')"
  >
    <p class="truncate text-sm font-medium" :class="props.active ? 'text-primary' : 'text-font'">
      {{ props.result.title }}
    </p>

    <!--
      命中片段：`prefix / hit / suffix` 三段插值（命中部分包在 <mark> 里）。
      刻意不用 v-html —— 索引内容虽然是构建期产物（可信），但少一个注入面总是好的。
    -->
    <p
      v-if="props.result.snippet.hit"
      class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-font opacity-80"
    >
      {{ props.result.snippet.prefix }}
      <mark class="rounded-xs bg-primary/25 px-0.5 text-font">{{ props.result.snippet.hit }}</mark>
      {{ props.result.snippet.suffix }}
    </p>
    <p
      v-else-if="props.result.snippet.suffix"
      class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-font opacity-80"
    >
      {{ props.result.snippet.suffix }}
    </p>

    <!-- 分类 / 标签：也解释了「为什么这篇会被搜出来」（标题没命中但标签命中时） -->
    <div
      v-if="props.result.categories.length > 0 || props.result.tags.length > 0"
      class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-font opacity-60"
    >
      <span
        v-for="category in props.result.categories"
        :key="`c-${category}`"
        class="inline-flex items-center gap-1"
      >
        <AppIcon name="folder" class="h-3 w-3" />
        {{ category }}
      </span>
      <span
        v-for="tag in props.result.tags"
        :key="`t-${tag}`"
        class="inline-flex items-center gap-1"
      >
        <AppIcon name="tag" class="h-3 w-3" />
        {{ tag }}
      </span>
    </div>
  </li>
</template>
