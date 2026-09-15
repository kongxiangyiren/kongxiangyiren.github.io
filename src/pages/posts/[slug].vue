<!--
  文章详情。
  元数据（标题 / 日期 / 标签）来自 `virtual:blog/posts`，正文 HTML + TOC 是**独立资源**，
  进页面后才按需 fetch（`src/api/post.ts` 里带缓存）。加载态用自研 `PostSkeleton`。

  批 2B-2 补上的四块视觉：
    1. TOC 滚动高亮 + 桌面浮动定位 → `PostToc` + `useTocHighlight`
    2. 上下篇导航 → `PostNav`
    3. 版权卡（原文链接运行时取）→ `PostCopyright`
    4. 图片放大 → `ImageLightbox`，**只在第一次点图片时才 import()**，
       在此之前一个字节都不会下载（本批的性能硬门禁）。

  EP 零依赖继续维持：本页没有任何 Element Plus 组件（连 lightbox 也是自研的），
  所以源码里的 Element Plus 标签计数仍然是 0。
-->
<script setup lang="ts">
  import { computed, nextTick, onServerPrefetch, ref, shallowRef, watch } from 'vue';
  import { useRoute } from 'vue-router';
  import { posts } from 'virtual:blog/posts';

  import { loadPostBody, peekPostBody } from '@/api/post';
  import AppIcon from '@/components/common/AppIcon.vue';
  import PostSkeleton from '@/components/common/PostSkeleton.vue';
  import PostCopyright from '@/components/post/PostCopyright.vue';
  import PostNav from '@/components/post/PostNav.vue';
  import PostToc from '@/components/post/PostToc.vue';
  import { useTocHighlight } from '@/composables/useTocHighlight';
  import type { BlogPostBody } from '@/types/blog';
  import { formatPostDate, toDateTimeAttr } from '@/utils/date';
  import { routeParam } from '@/utils/route';

  // 传路由键只是给 vue-router 的泛型做**类型收窄**（运行时实现是 `inject(routeLocationKey)`，
  // 参数完全不被使用）。启用 typed routes 后 `route.params` 是所有路由参数的联合，
  // 不传键就取不到 `slug`。
  const route = useRoute('/posts/[slug]');

  const slug = computed(() => routeParam(route.params.slug));
  /** 在 `virtual:blog/posts` 数组顺序（置顶优先，其次时间倒序）里的下标；-1 表示不存在 */
  const currentIndex = computed(() => posts.findIndex(item => item.slug === slug.value));
  const meta = computed(() => posts[currentIndex.value] ?? null);

  /**
   * 上下篇严格按**数组顺序**取邻居 —— 和首页列表的相邻关系同一个口径。
   * 边界天然成立：下标 0 没有 prev，最后一个没有 next，模板里对应的一侧就不渲染。
   */
  const prevPost = computed(() =>
    currentIndex.value > 0 ? (posts[currentIndex.value - 1] ?? null) : null
  );
  const nextPost = computed(() => {
    const index = currentIndex.value;
    return index >= 0 && index < posts.length - 1 ? (posts[index + 1] ?? null) : null;
  });

  /**
   * 首帧就有的正文：浏览器上命中「预渲染内联数据」时**同步**有值（服务端为 null，
   * 交给下面的 onServerPrefetch 预取）。
   * 必须同步初始化：详情页首帧就得是正文，否则客户端首次渲染会先出骨架屏，
   * 与预渲染出来的 DOM 不一致（水合警告 + 闪一下）。
   */
  const body = ref<BlogPostBody | null>(peekPostBody(routeParam(route.params.slug)));
  const loading = ref(body.value === null);
  const failed = ref(false);

  watch(
    slug,
    async value => {
      if (!value || !posts.some(item => item.slug === value)) {
        body.value = null;
        loading.value = false;
        return;
      }

      // 已经有本篇正文（首帧内联数据 / 刚刚加载过）→ 不重置，
      // 否则水合时会把已经渲染好的正文换成一帧骨架屏
      if (body.value?.slug === value) {
        loading.value = false;
        return;
      }

      body.value = null;
      failed.value = false;
      loading.value = true;

      try {
        const loaded = await loadPostBody(value);
        // 快速连点两篇文章时，别让先到的响应覆盖后到的
        if (slug.value === value) body.value = loaded;
      } catch {
        if (slug.value === value) failed.value = true;
      } finally {
        if (slug.value === value) loading.value = false;
      }
    },
    { immediate: true }
  );

  /**
   * 预渲染：渲染前就把正文取到（Vue 的 SSR 会等这个 Promise 完成再渲染本组件），
   * 这是详情页能把**正文**写进静态 HTML 的关键。
   * 浏览器上是 no-op（那边由上面的 watcher 负责）；两者命中同一份缓存，不会重复取。
   */
  onServerPrefetch(async () => {
    const value = slug.value;
    if (!value) return;

    try {
      body.value = await loadPostBody(value);
    } catch {
      failed.value = true;
    } finally {
      loading.value = false;
    }
  });

  // 标题与描述由 unhead 统一产出（src/composables/useSeo.ts），本页不再手写 document.title

  // ---------------------------------------------------------------------------
  // 目录：高亮状态由 composable 统一算，桌面浮动卡与移动折叠卡共用同一份
  // ---------------------------------------------------------------------------
  const toc = computed(() => body.value?.toc ?? []);
  const { activeId, scrollTo } = useTocHighlight({ items: toc });

  // ---------------------------------------------------------------------------
  // 图片放大：动态加载
  // ---------------------------------------------------------------------------

  /**
   * 首次点击后才被 import() 赋值。
   * 类型直接用模块的 default 导出（`typeof import()` 是纯类型引用，不会产生运行时导入），
   * 比 Vue 那个包罗万象的 `Component` 别名精确，也更好读。
   * `shallowRef` 足够：组件定义对象本身不需要深层响应式追踪。
   */
  type ImageLightboxComponent = (typeof import('@/components/post/ImageLightbox.vue'))['default'];

  const lightboxComponent = shallowRef<ImageLightboxComponent | null>(null);
  const lightboxOpen = ref(false);
  const lightboxSrc = ref('');
  const lightboxAlt = ref('');

  async function openLightbox(image: HTMLImageElement): Promise<void> {
    if (!lightboxComponent.value) {
      lightboxComponent.value = (await import('@/components/post/ImageLightbox.vue')).default;
      /*
       * 先让 lightbox 以 `open=false` 挂载完成，再翻 `open`。
       * `useFocusTrap` 靠 `watch(open)` 的**翻转**来装焦点陷阱（并顺手记住
       * 当前焦点元素用于归还）；若挂载与 open=true 落在同一个 tick 里，
       * 那次翻转根本不存在，陷阱不会被装上。
       */
      await nextTick();
    }

    lightboxSrc.value = image.currentSrc || image.src;
    lightboxAlt.value = image.alt;
    lightboxOpen.value = true;
  }

  function closeLightbox(): void {
    lightboxOpen.value = false;
  }

  /**
   * 正文图片用**事件委托**：整个 `.markdown-body` 上只有一个 click 监听，
   * 命中 `<img>` 才处理。不给每张图单独绑（图片数量由内容决定），
   * 也不用 el-image（它静态依赖整套 ElImageViewer）。
   */
  function onContentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;

    // 图片被显式包在链接里时（`[![alt](img)](url)`）让链接说话，不抢它的点击
    if (target.closest('a')) return;

    /*
     * 让 <img> 能接住焦点：`tabindex="-1"` 不进 Tab 序列（不会让长文里
     * 每张图都变成一个 Tab 站点），但 `focus()` 可用 —— lightbox 的焦点陷阱
     * 关闭时才有东西可归还，否则焦点会掉回 <body>。
     */
    target.setAttribute('tabindex', '-1');
    target.focus();

    void openLightbox(target);
  }
</script>

<template>
  <div v-if="meta" class="flex flex-col gap-6 lg:flex-row lg:items-start">
    <!--
      两栏只在本页面内做，**不动 DefaultLayout 的全局 max-w-5xl**：
      列表页、归档页、关于页都是单栏，为了详情页把全站改成两栏是一次
      「一页需求换来全站回归」的改动。这里复用的还是布局给的 992px 内容宽
      （1024 − 左右各 16px padding），自己切成「文章列 + 浮动目录」。

      文章列 `lg:max-w-184`（46rem = 736px）是可读性上限；实际宽度由 flex 分
      （992 − 240 目录 − 24 gap = 728px），上限只在将来容器变宽时才会咬住。

      `lg:items-start` 是 sticky 的前提：flex 行里子项默认 stretch，
      不加它 aside 会被拉到与文章等高，`sticky` 就没有可动空间（首页侧边栏
      踩过同一个坑）。
    -->
    <article class="flex min-w-0 flex-1 flex-col gap-6 lg:max-w-184">
      <header class="flex flex-col gap-3">
        <h1 class="text-2xl font-semibold text-font">{{ meta.title }}</h1>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-font opacity-80">
          <time :datetime="toDateTimeAttr(meta.date)">
            发表于 {{ formatPostDate(meta.date, true) }}
          </time>
          <span v-if="meta.updated">更新于 {{ formatPostDate(meta.updated, true) }}</span>
          <span>{{ meta.wordCount }} 字 · 约 {{ meta.readingTime }} 分钟</span>
        </div>

        <div class="flex flex-wrap gap-2 text-xs">
          <RouterLink
            v-for="category in meta.categories"
            :key="category"
            :to="`/categories/${category}`"
            class="rounded border border-border px-1.5 py-0.5 text-font transition-colors hover:text-primary"
          >
            {{ category }}
          </RouterLink>
          <RouterLink
            v-for="tag in meta.tags"
            :key="tag"
            :to="`/tags/${tag}`"
            class="rounded border border-border px-1.5 py-0.5 text-primary transition-colors hover:bg-card-hover"
          >
            #{{ tag }}
          </RouterLink>
        </div>
      </header>

      <!-- 移动端目录：文章顶部的折叠卡（默认收起）；桌面那侧由右下方的 aside 接管 -->
      <PostToc
        v-if="toc.length > 0"
        variant="mobile"
        :items="toc"
        :active-id="activeId"
        class="lg:hidden"
        @select="scrollTo"
      />

      <!-- 加载态：正文是独立资源，网络慢时用骨架屏兜住高度 -->
      <div v-if="loading" class="flex flex-col gap-5" aria-busy="true" aria-live="polite">
        <span class="sr-only">正在加载正文…</span>
        <PostSkeleton :lines="8" />
        <PostSkeleton :lines="6" />
      </div>

      <div
        v-else-if="failed"
        class="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-6 text-sm text-font"
      >
        <p>正文加载失败了，可能是网络问题。</p>
        <RouterLink to="/" class="text-primary hover:underline">回到首页</RouterLink>
      </div>

      <!--
        构建期产物，来源是本仓库 content/ 下的 Markdown（单作者可信内容），
        运行时不接受任何用户输入，所以 v-html 是安全的。

        `@click` 是**事件委托**：整个正文容器只有一个监听，命中 <img> 才走
        「动态 import lightbox → 打开」，见上面的 onContentClick。
      -->
      <div v-else-if="body" class="markdown-body" v-html="body.html" @click="onContentClick"></div>

      <PostNav :prev="prevPost" :next="nextPost" />

      <PostCopyright :date="meta.date" />

      <footer class="border-t border-border pt-4">
        <RouterLink
          to="/"
          class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <AppIcon name="arrow-up" class="h-4 w-4 -rotate-90" />
          返回首页
        </RouterLink>
      </footer>
    </article>

    <!-- 桌面端目录：浮动在文章右侧并 sticky，滚动时跟着高亮 -->
    <aside v-if="toc.length > 0" class="hidden lg:sticky lg:top-20 lg:block lg:w-60 lg:shrink-0">
      <PostToc variant="desktop" :items="toc" :active-id="activeId" @select="scrollTo" />
    </aside>
  </div>

  <div v-else class="flex flex-col items-start gap-3 py-10 text-font">
    <p class="text-lg font-medium">没有找到这篇文章</p>
    <p class="text-sm opacity-70">slug：{{ slug }}</p>
    <RouterLink to="/" class="text-sm text-primary hover:underline">回到首页</RouterLink>
  </div>

  <!--
    lightbox 由 `openLightbox` 里的 `import()` 赋给 lightboxComponent。
    在这一行渲染出来之前，`open` 一直是 false，组件本身也不会发出任何请求 ——
    没点过图片的访客（含所有首页访客）不会下载它。
  -->
  <component
    :is="lightboxComponent"
    v-if="lightboxComponent"
    :open="lightboxOpen"
    :src="lightboxSrc"
    :alt="lightboxAlt"
    @close="closeLightbox"
  />
</template>
