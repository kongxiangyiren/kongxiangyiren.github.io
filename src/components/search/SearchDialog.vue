<!--
  站内搜索弹窗（自研，Tailwind + 原生元素）。

  它由 `AppHeader` 在**第一次需要时**才 `import()` —— 也就是说：
    - 不进 entry / 首页首屏 chunk（本批的性能硬门禁）；
    - fuse.js 也只在首次打开时下载（见 src/api/search.ts 的注释）。
  为了把这条约束钉死，props 只有 `open`，父组件必须在「已 import 但 open=false」
  的状态下先挂载一次，再翻转 `open`（跟 lightbox 同一手法）—— 因为 `useFocusTrap`
  靠 `watch(open)` 的**翻转**安装陷阱并记录「关闭后焦点归还给谁」。

  复用而不是重写：
    - 焦点陷阱 / Esc / Tab 循环 / 焦点归还 → `useFocusTrap`
    - body 滚动锁（引用计数）            → `useScrollLock`
    - 索引懒加载 + 进程内缓存            → `src/api/search.ts`

  无障碍走标准 combobox 模式：输入框 `role="combobox"` + `aria-activedescendant`
  指向当前高亮项，列表 `role="listbox"` / 选项 `role="option"`。
  焦点**始终留在输入框**里，方向键只移动高亮 —— 键盘用户不必在输入框与列表间来回 Tab。
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRef, useId, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { useRouter } from 'vue-router'

import { isSearchReady, prepareSearch, searchPosts, type SearchResult } from '@/api/search'
import AppIcon from '@/components/common/AppIcon.vue'
import SearchResultItem from '@/components/search/SearchResultItem.vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useScrollLock } from '@/composables/useScrollLock'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

/**
 * 输入防抖。3 篇文章的索引就算每击键都重算也感觉不到，但索引会随文章数增长：
 * 两趟 Fuse 检索是 O(文章数)，没有这个闸门，打字越快越卡。
 */
const DEBOUNCE_MS = 180

const router = useRouter()
const reducedMotion = usePreferredReducedMotion()

/** 同一页可能有多个弹窗实例（理论上），用 useId 保证 listbox / option 的 id 不撞车 */
const uid = useId()

const open = toRef(props, 'open')
const panel = ref<HTMLElement | null>(null)
const query = ref('')
const results = ref<SearchResult[]>([])
const activeIndex = ref(0)

/** `error` = 索引拿不到（离线 / 404），此时给一句人话而不是空列表 */
const status = ref<'loading' | 'ready' | 'error'>('loading')

const listboxId = `search-listbox-${uid}`
const optionId = (index: number): string => `search-option-${uid}-${index}`

/** 只在真的有结果时挂 `aria-activedescendant`，否则会指向不存在的 id */
const activeOptionId = computed(() =>
  results.value.length > 0 ? optionId(activeIndex.value) : undefined,
)

const showEmptyHint = computed(() => status.value === 'ready' && query.value.trim().length === 0)
const showNoResult = computed(
  () => status.value === 'ready' && query.value.trim().length > 0 && results.value.length === 0,
)

/** 给屏幕阅读器播报的状态（结果数变化 / 加载中 / 失败都要说一声） */
const liveMessage = computed(() => {
  if (status.value === 'loading') return '正在加载搜索索引'
  if (status.value === 'error') return '搜索索引加载失败'
  if (query.value.trim().length === 0) return ''
  return results.value.length > 0 ? `找到 ${results.value.length} 篇文章` : '没有找到匹配的文章'
})

/** reduce motion 时连过渡都不挂（`:css="false"` 让 Vue 跳过过渡检测） */
const motionEnabled = computed(() => reducedMotion.value !== 'reduce')

function close(): void {
  emit('close')
}

// 焦点陷阱 + Esc 关闭 + 关闭后把焦点还给顶栏那颗搜索按钮
useFocusTrap({ container: panel, open, onClose: close })
useScrollLock(open)

function applyQuery(value: string): void {
  results.value = searchPosts(value)
  activeIndex.value = 0
}

let timer: number | undefined

function clearTimer(): void {
  if (timer === undefined) return
  window.clearTimeout(timer)
  timer = undefined
}

async function start(): Promise<void> {
  if (isSearchReady()) {
    status.value = 'ready'
    applyQuery(query.value)
    return
  }

  status.value = 'loading'
  try {
    await prepareSearch()
    status.value = 'ready'
    // 索引在路上时用户可能已经敲了字：就绪后补搜一次，不用再敲
    applyQuery(query.value)
  } catch {
    status.value = 'error'
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  clearTimer()
  query.value = ''
  results.value = []
  activeIndex.value = 0
  void start()
})

// 输入即搜（防抖）；索引没就绪时不搜，等 start() 里那次补搜
watch(query, (value) => {
  if (status.value !== 'ready') return
  clearTimer()
  timer = window.setTimeout(() => {
    timer = undefined
    applyQuery(value)
  }, DEBOUNCE_MS)
})

onBeforeUnmount(clearTimer)

function move(step: number): void {
  const count = results.value.length
  if (count === 0) return

  activeIndex.value = (activeIndex.value + step + count) % count

  /*
   * 把高亮项滚进可视区。
   * `behavior: 'instant'` 是必须的：全站开了 `scroll-behavior: smooth`
   * （src/styles/scss/butterfly.scss），不显式写死的话，连按方向键会变成
   * 一串互相打断的平滑滚动动画，看起来像卡住了。
   */
  void nextTick(() => {
    document
      .getElementById(optionId(activeIndex.value))
      ?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  })
}

function go(result: SearchResult | undefined): void {
  if (!result) return
  close()
  void router.push(`/posts/${result.slug}`)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    go(results.value[activeIndex.value])
  }
  // Esc 不在这里处理：`useFocusTrap` 已经在 document 上监听并回调 onClose
}
</script>

<template>
  <Teleport to="body">
    <!--
      过渡用 Tailwind 的 class 属性表达（而不是 `name` + 一个 style 块）：
      少一个样式文件，且 `:css="false"`（reduce motion）时 Vue 直接跳过整套过渡检测。
    -->
    <Transition
      :css="motionEnabled"
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="open" class="fixed inset-0 z-60 flex items-start justify-center px-4 pt-20">
        <!-- 遮罩：纯点击热区，语义由面板承担，所以 aria-hidden -->
        <div class="absolute inset-0 bg-black/40" aria-hidden="true" @click="close"></div>

        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-label="站内搜索"
          tabindex="-1"
          class="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        >
          <div class="flex items-center gap-2 border-b border-border px-4 py-3">
            <AppIcon name="search" class="h-4 w-4 shrink-0 text-font opacity-60" />

            <input
              v-model="query"
              type="search"
              role="combobox"
              aria-label="搜索文章"
              aria-autocomplete="list"
              aria-expanded="true"
              :aria-controls="listboxId"
              :aria-activedescendant="activeOptionId"
              placeholder="搜索标题、标签或正文…"
              autocomplete="off"
              spellcheck="false"
              enterkeyhint="search"
              class="min-w-0 flex-1 bg-transparent text-sm text-font outline-none placeholder:text-font placeholder:opacity-50"
              @keydown="onKeydown"
            />

            <button
              type="button"
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-font transition-colors hover:bg-card-hover hover:text-primary"
              aria-label="关闭搜索"
              @click="close"
            >
              <AppIcon name="close" class="h-4 w-4" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-2">
            <p
              v-if="status === 'loading'"
              class="px-3 py-6 text-center text-sm text-font opacity-70"
            >
              正在加载搜索索引…
            </p>

            <!-- 降级：索引拿不到（离线 / 404）时给一句人话 + 出口，不留白屏 -->
            <div
              v-else-if="status === 'error'"
              class="flex flex-col items-center gap-2 px-3 py-6 text-center text-sm text-font"
            >
              <p>搜索索引没能加载出来，可能是网络问题。</p>
              <RouterLink to="/archives" class="text-primary hover:underline" @click="close">
                去归档页翻一翻
              </RouterLink>
            </div>

            <p v-else-if="showEmptyHint" class="px-3 py-6 text-center text-sm text-font opacity-70">
              输入关键词开始搜索
            </p>

            <p v-else-if="showNoResult" class="px-3 py-6 text-center text-sm text-font opacity-70">
              没有找到与「{{ query.trim() }}」相关的文章
            </p>

            <ul v-else :id="listboxId" role="listbox" aria-label="搜索结果" class="flex flex-col">
              <SearchResultItem
                v-for="(result, index) in results"
                :id="optionId(index)"
                :key="result.slug"
                :result="result"
                :active="index === activeIndex"
                @select="go(result)"
                @activate="activeIndex = index"
              />
            </ul>
          </div>

          <div
            class="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-[11px] text-font opacity-60"
          >
            <span v-if="status === 'ready' && results.length > 0">{{ results.length }} 条结果</span>
            <span v-else class="truncate">支持标题、标签、分类与正文</span>
            <span class="shrink-0 font-mono">↑↓ 选择 · Enter 打开 · Esc 关闭</span>
          </div>

          <!-- 无障碍播报：视觉上不可见，但状态一变就会读出来 -->
          <p class="sr-only" aria-live="polite">{{ liveMessage }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
