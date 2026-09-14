<!--
  首屏 Banner（Butterfly 的标志性区块）。

  几个刻意的决定：
   - `min-h-screen`：正好一屏。用 100vh 而不是 100vw 那套宽度花招，所以不会产生横向滚动。
   - 页面是「全出血」的（index.vue 通过 route meta 让 DefaultLayout 去掉 max-w / px 容器），
     否则 100% 宽在 max-w-5xl 的容器里根本铺不开。
   - 背景图自己造的 SVG（public/images/banner.svg），不引外链；图片比容器高 40%，
     平移时才不会在上下边缘露底。
   - 视差只用 transform（走合成层），并且 `prefers-reduced-motion: reduce` 下完全不启用。
   - 波浪用 --global-bg 填充，所以亮 / 暗两种主题都能和下方内容区无缝接上。
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core'

import AppIcon from '@/components/common/AppIcon.vue'
import TypewriterText from '@/components/home/TypewriterText.vue'
import { siteConfig } from '@/config/site'

const BANNER_IMAGE = `${import.meta.env.BASE_URL}images/banner.svg`
/** 视差只在前 320px 滚动里生效，再往下 Banner 已经出屏了 */
const PARALLAX_RANGE = 320
const PARALLAX_SHIFT = 0.18
/** 与 index.vue 里内容区块的 id 对应 */
const CONTENT_ID = 'home-content'

const reducedMotion = usePreferredReducedMotion()
const scrolled = ref(0)

useEventListener(
  window,
  'scroll',
  () => {
    if (reducedMotion.value === 'reduce') return
    scrolled.value = Math.min(window.scrollY, PARALLAX_RANGE)
  },
  { passive: true },
)

const backgroundStyle = computed(() =>
  reducedMotion.value === 'reduce'
    ? undefined
    : { transform: `translate3d(0, ${scrolled.value * PARALLAX_SHIFT}px, 0)` },
)

function scrollToContent(): void {
  document.getElementById(CONTENT_ID)?.scrollIntoView({
    behavior: reducedMotion.value === 'reduce' ? 'auto' : 'smooth',
    block: 'start',
  })
}
</script>

<template>
  <section
    class="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden"
  >
    <!-- 背景图 + 深色遮罩：白色文字在两种主题下都能保证对比度 -->
    <img
      :src="BANNER_IMAGE"
      alt=""
      aria-hidden="true"
      class="absolute inset-x-0 -top-[20%] h-[140%] w-full object-cover"
      :style="backgroundStyle"
    />
    <div
      class="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/70"
      aria-hidden="true"
    ></div>

    <div class="relative z-10 flex w-full flex-col items-center px-6 text-center">
      <h1
        class="butterfly-fade-in text-3xl font-semibold tracking-wide text-white drop-shadow-sm sm:text-4xl md:text-5xl"
      >
        {{ siteConfig.title }}
      </h1>

      <TypewriterText class="mt-3 w-full max-w-xl" :text="siteConfig.subtitle" />
    </div>

    <button
      type="button"
      class="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full p-2 text-white/80 transition-colors hover:text-white"
      aria-label="向下滚动到正文"
      @click="scrollToContent"
    >
      <AppIcon name="arrow-down" class="butterfly-bounce h-6 w-6" />
    </button>

    <!-- 底部波浪：fill 用内容区背景令牌，切换到内容区时无缝 -->
    <svg
      class="absolute -bottom-px left-0 h-[60px] w-full"
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,64 C120,96 240,32 360,32 C480,32 600,96 720,96 C840,96 960,32 1080,32 C1200,32 1320,80 1440,72 L1440,100 L0,100 Z"
        fill="var(--global-bg)"
      />
    </svg>
  </section>
</template>
