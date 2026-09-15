<!--
  首页 —— 完整 Butterfly 观感。

  结构：全屏 Banner（打字机 / 波浪 / 下滚箭头）→ 内容区（桌面两栏：卡片流 + 侧边栏）。
  页面声明 `fullBleed`，所以 DefaultLayout 不套 max-w 容器，Banner 才能真正铺满整屏；
  内容区自己用 mx-auto max-w-5xl 收回来。

  分页状态放在 URL 的 `?page=` 上：刷新、前进后退、分享链接都能还原。
-->
<script setup lang="ts">
  import { computed, nextTick } from 'vue';
  import { usePreferredReducedMotion } from '@vueuse/core';
  import { useRoute, useRouter } from 'vue-router';
  import { posts } from 'virtual:blog/posts';

  import PostCard from '@/components/blog/PostCard.vue';
  import PostPagination from '@/components/blog/PostPagination.vue';
  import HomeBanner from '@/components/home/HomeBanner.vue';
  import AnnouncementCard from '@/components/sidebar/AnnouncementCard.vue';
  import AuthorCard from '@/components/sidebar/AuthorCard.vue';
  import RecentPostsCard from '@/components/sidebar/RecentPostsCard.vue';
  import TagCloud from '@/components/sidebar/TagCloud.vue';
  import { siteConfig } from '@/config/site';

  definePage({ meta: { fullBleed: true } });

  /** 与 HomeBanner 里下滚箭头指向的锚点一致 */
  const CONTENT_ID = 'home-content';

  const route = useRoute();
  const router = useRouter();
  const reducedMotion = usePreferredReducedMotion();

  const perPage = siteConfig.postsPerPage;
  const totalPages = computed(() => Math.max(1, Math.ceil(posts.length / perPage)));

  /**
   * 分页只由 URL 派生（单一真相来源），没有本地 ref —— 这样前进 / 后退天然正确。
   * 越界或非法值（`?page=abc`、`?page=99`）一律夹到 [1, totalPages]。
   */
  const currentPage = computed(() => {
    const raw = Number(route.query.page);
    if (!Number.isFinite(raw)) return 1;
    return Math.min(Math.max(1, Math.trunc(raw)), totalPages.value);
  });

  const pagePosts = computed(() => {
    const start = (currentPage.value - 1) * perPage;
    return posts.slice(start, start + perPage);
  });

  async function handlePageChange(page: number): Promise<void> {
    const query = { ...route.query };
    if (page <= 1) delete query.page;
    else query.page = String(page);

    await router.push({ query });
    await nextTick();
    document.getElementById(CONTENT_ID)?.scrollIntoView({
      behavior: reducedMotion.value === 'reduce' ? 'auto' : 'smooth',
      block: 'start'
    });
  }
</script>

<template>
  <HomeBanner />

  <section :id="CONTENT_ID" class="mx-auto w-full max-w-5xl scroll-mt-16 px-4 py-8">
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <!-- 主内容 -->
      <div class="flex min-w-0 flex-1 flex-col gap-6">
        <h2 class="sr-only">文章列表</h2>

        <p
          v-if="pagePosts.length === 0"
          class="rounded-lg border border-border bg-card p-6 text-sm text-font opacity-70"
        >
          还没有文章。
        </p>

        <PostCard v-for="post in pagePosts" :key="post.slug" :post="post" />

        <PostPagination
          :total="posts.length"
          :page-size="perPage"
          :current-page="currentPage"
          @change="handlePageChange"
        />
      </div>

      <!--
        侧边栏：用 `lg:items-start`（而不是 `items-start`）—— flex-col 下 items-start
        会让子项宽度塌成内容宽，移动端卡片就不满宽了。桌面端子项变内容高，sticky 才有可动的空间。
      -->
      <aside class="flex w-full flex-col gap-4 lg:sticky lg:top-20 lg:w-72 lg:shrink-0">
        <AuthorCard />
        <AnnouncementCard v-if="siteConfig.announcement" :content="siteConfig.announcement" />
        <RecentPostsCard />
        <TagCloud />
      </aside>
    </div>
  </section>
</template>
