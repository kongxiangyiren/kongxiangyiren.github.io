<!--
  单个标签下的文章列表。

  「未匹配」是这一页的正经分支而不是意外：URL 里写了个不存在的标签（手改地址栏、
  旧链接失效）时要给一句人话 + 返回入口，**不白屏**。
  匹配逻辑（含中文百分号编码的兜底）在 `src/utils/taxonomy.ts`，与分类页共用一份。
-->
<script setup lang="ts">
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { tags } from 'virtual:blog/taxonomy';

  import PostLinkList from '@/components/blog/PostLinkList.vue';
  import AppIcon from '@/components/common/AppIcon.vue';
  import { routeParam } from '@/utils/route';
  import { findTaxonomyItem } from '@/utils/taxonomy';

  // 传路由键只是给 vue-router 的泛型做**类型收窄**（运行时实现是 `inject(routeLocationKey)`，
  // 参数完全不被使用）。启用 typed routes 后 `route.params` 是所有路由参数的联合，
  // 不传键就取不到 `name`。
  const route = useRoute('/tags/[name]');
  const name = computed(() => routeParam(route.params.name));

  const tag = computed(() => findTaxonomyItem(tags, name.value));
</script>

<template>
  <div class="flex flex-col gap-5">
    <RouterLink
      to="/tags"
      class="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
    >
      <AppIcon name="arrow-up" class="h-4 w-4 -rotate-90" />
      全部标签
    </RouterLink>

    <header class="flex flex-col gap-1">
      <h1 class="flex items-center gap-2 text-2xl font-semibold text-font">
        <AppIcon name="tag" class="h-5 w-5 shrink-0 text-primary" />
        <span class="text-primary">{{ tag?.name ?? name }}</span>
      </h1>
      <p v-if="tag" class="text-sm text-font opacity-70">{{ tag.count }} 篇文章</p>
    </header>

    <PostLinkList v-if="tag" :posts="tag.posts" />

    <div
      v-else
      class="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-6 text-sm text-font"
    >
      <p class="text-base font-medium">没有找到这个标签</p>
      <p class="opacity-70">
        标签「{{ name }}」不在本站的标签列表里，可能是链接过期或者名字写错了。
      </p>
      <RouterLink to="/tags" class="text-primary hover:underline">返回标签列表</RouterLink>
    </div>
  </div>
</template>
