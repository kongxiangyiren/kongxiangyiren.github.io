<!--
  首页文章卡片（Tailwind 自研，不用 el-card）。

  三个容易踩的点：
   1. **整卡可点**：标题链接用 stretched link（`after:absolute after:inset-0` 把伪元素铺满
      整张卡）实现「整卡可点」。标签 / 分类链接必须 `relative z-10`，否则会被那层伪元素
      盖住点不到。
   2. **封面不再是点击热区**：封面以前用 el-image 承载「点击放大预览」，所以刻意抬到 z-10
      压住 stretched link。现在封面只是张图、点击放大已移到详情页正文的 lightbox
      （批 2B-2，动态 import，不进首页 chunk），所以**必须去掉 z-10** —— 留着会变成
      一块点不动的死区（伪元素被压在下面点不到，而默认 `after:` 层级在封面之上）。
   3. **入场动画与 hover 位移不能写在同一个元素上**：`.butterfly-reveal` 用的是
      `transform: translateY()`，Tailwind 的 `hover:-translate-y-1` 也用 transform，
      两者特异性接近、顺序不可控。所以外层包一个只负责 reveal 的 div，卡片本体负责 hover。
-->
<script setup lang="ts">
  import { computed, ref } from 'vue';

  import AppIcon from '@/components/common/AppIcon.vue';
  import { useReveal } from '@/composables/useReveal';
  import type { BlogPostPreview } from '@/types/blog';
  import { formatPostDate, toDateTimeAttr } from '@/utils/date';

  const props = defineProps<{ post: BlogPostPreview }>();

  const { target, revealed } = useReveal();
  const postUrl = computed(() => `/posts/${props.post.slug}`);

  /**
   * 封面加载失败 → 换成占位块。
   * 特意用 Vue 的 `@error` 而不是内联 `onerror` 字符串：后者在 CSP 下会被拦，
   * 而且拿不到组件作用域。卡片是 `v-for` 里按 slug `:key` 渲染的，切文章会重新挂载，
   * 所以不需要额外 watch 重置这个 flag。
   */
  const coverFailed = ref(false);
</script>

<template>
  <div ref="target" class="butterfly-reveal" :class="{ 'is-revealed': revealed }">
    <article
      class="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <!--
        有封面：原生 <img>。
        防 CLS 的两道保险：外层容器 `aspect-video`（16:9）先占好位，`width`/`height`
        属性再给浏览器一个内在宽高比。两者一致，所以图片解码前后盒子尺寸完全相同。
        加载中不需要额外占位图 —— 容器自带 `bg-card-hover` 底色，图片没来就是一块灰色。
        `loading="lazy"` + `decoding="async"` 让首屏不为卡片图阻塞。
      -->
      <div v-if="post.cover" class="aspect-video w-full overflow-hidden bg-card-hover">
        <img
          v-if="!coverFailed"
          :src="post.cover"
          :alt="`${post.title} 的封面`"
          width="640"
          height="360"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover"
          @error="coverFailed = true"
        />

        <div
          v-else
          class="flex h-full w-full items-center justify-center text-xs text-font opacity-60"
        >
          封面加载失败
        </div>
      </div>

      <!-- 无封面：优雅降级 —— 用一条主题色渐变代替图片区，不留破图 -->
      <div
        v-else
        class="h-1.5 w-full bg-gradient-to-r from-primary via-primary/40 to-primary/10"
        aria-hidden="true"
      ></div>

      <div class="flex flex-1 flex-col gap-3 p-4">
        <h2 class="text-lg leading-snug font-semibold">
          <RouterLink
            :to="postUrl"
            class="text-font transition-colors group-hover:text-primary after:absolute after:inset-0"
          >
            {{ post.title }}
          </RouterLink>
        </h2>

        <p v-if="post.description" class="line-clamp-3 text-sm text-font opacity-80">
          {{ post.description }}
        </p>

        <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span v-if="post.sticky > 0" class="rounded bg-primary px-1.5 py-0.5 text-white">
            置顶
          </span>

          <time
            class="inline-flex items-center gap-1 text-font opacity-70"
            :datetime="toDateTimeAttr(post.date)"
          >
            <AppIcon name="calendar" class="h-3.5 w-3.5" />
            {{ formatPostDate(post.date) }}
          </time>

          <RouterLink
            v-for="category in post.categories"
            :key="`c-${category}`"
            :to="`/categories/${category}`"
            class="relative z-10 inline-flex items-center gap-1 text-primary transition-opacity hover:opacity-75"
          >
            <AppIcon name="folder" class="h-3.5 w-3.5" />
            {{ category }}
          </RouterLink>

          <RouterLink
            v-for="tag in post.tags"
            :key="`t-${tag}`"
            :to="`/tags/${tag}`"
            class="relative z-10 rounded border border-border px-1.5 py-0.5 text-primary transition-colors hover:bg-card-hover"
          >
            #{{ tag }}
          </RouterLink>

          <span class="inline-flex items-center gap-1 text-font opacity-70">
            <AppIcon name="clock" class="h-3.5 w-3.5" />
            {{ post.readingTime }} 分钟
          </span>
        </div>
      </div>
    </article>
  </div>
</template>
