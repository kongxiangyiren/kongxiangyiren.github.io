<!--
  公告卡。内容来自 site.config.announcement；父组件在它为空时不渲染整张卡，
  这里再做一次兜底判断，避免被别处引用时出现空壳。
-->
<script setup lang="ts">
  import SidebarCard from '@/components/sidebar/SidebarCard.vue';

  const props = defineProps<{ content: string }>();
</script>

<template>
  <SidebarCard v-if="props.content.trim()" title="公告" icon="bell">
    <p class="text-xs leading-relaxed whitespace-pre-line text-font opacity-80">
      {{ props.content }}
    </p>
  </SidebarCard>
</template>
