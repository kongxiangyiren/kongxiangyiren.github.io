<!--
  内联图标。
  刻意不引图标库：全站只需要不到十个图标，一个组件换来零运行时依赖、零字体加载、
  以及 `currentColor` 天然跟随主题色。
-->
<script setup lang="ts">
import type { IconName } from '@/types/ui'

const props = defineProps<{ name: IconName }>()
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <g v-if="props.name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </g>

    <g v-else-if="props.name === 'moon'">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </g>

    <g v-else-if="props.name === 'menu'">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </g>

    <g v-else-if="props.name === 'close'">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </g>

    <g v-else-if="props.name === 'arrow-up'">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </g>

    <g v-else-if="props.name === 'arrow-down'">
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </g>

    <g v-else-if="props.name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 11h18" />
    </g>

    <g v-else-if="props.name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </g>

    <g v-else-if="props.name === 'folder'">
      <path d="M4 6a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    </g>

    <g v-else-if="props.name === 'tag'">
      <path
        d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"
      />
      <circle cx="7.5" cy="7.5" r="0.6" fill="currentColor" />
    </g>

    <g v-else-if="props.name === 'bell'">
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </g>

    <g v-else-if="props.name === 'mail'">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </g>

    <g v-else-if="props.name === 'rss'">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </g>

    <!-- GitHub 官方 mark 是填充图形，单独覆盖描边属性 -->
    <g v-else-if="props.name === 'github'" fill="currentColor" stroke="none">
      <path
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.72c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9v2.82c0 .27.18.6.69.49A10.05 10.05 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </g>

    <g v-else>
      <path d="M10.6 13.4a4 4 0 0 0 5.66 0l3.1-3.1a4 4 0 0 0-5.66-5.66l-1.2 1.2" />
      <path d="M13.4 10.6a4 4 0 0 0-5.66 0l-3.1 3.1a4 4 0 0 0 5.66 5.66l1.2-1.2" />
    </g>
  </svg>
</template>
