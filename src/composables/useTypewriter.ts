/**
 * 首屏副标题的打字机效果。
 *
 * 设计要点（都是硬约束）：
 *   1. 多句循环：传入的文案按句号类标点切成短句，逐句「打字 → 停顿 → 退格」。
 *   2. **不参与尺寸计算**：这里只吐字符串，固定高度由组件的 Tailwind 类负责，
 *      所以文字长短变化不会让下方元素跳动。
 *   3. 尊重 `prefers-reduced-motion: reduce`：直接静态显示第一句，不播动画。
 *      用户中途改系统偏好也要立刻生效（watch 了媒体查询）。
 *   4. 用「代数令牌」而不是布尔开关来终止循环：`start()` 每调用一次就自增 token，
 *      旧的异步循环即使被定时器唤醒也会立刻退出，不会出现两条循环同时改值。
 */
import { computed, onScopeDispose, ref, toValue, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

import type { MaybeRefOrGetter } from 'vue'

/** 每个字符的输入间隔（ms） */
const TYPE_INTERVAL = 110
/** 退格的间隔，比输入快一些，手感更像人打字 */
const ERASE_INTERVAL = 55
/** 整句打完后停顿多久再退格 */
const HOLD_TYPED = 1800
/** 退格清空后停顿多久再打下一句 */
const HOLD_ERASED = 400

/** 按中英文句末标点切句，保留标点本身 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function useTypewriter(text: MaybeRefOrGetter<string>) {
  const list = computed(() => splitSentences(toValue(text)))
  const reducedMotion = usePreferredReducedMotion()
  const isStatic = computed(() => reducedMotion.value === 'reduce')

  const display = ref('')
  /** 代数令牌：自增即代表「旧循环作废」 */
  let token = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      timer = setTimeout(resolve, ms)
    })

  async function run(gen: number): Promise<void> {
    let cursor = 0
    while (gen === token) {
      const items = list.value
      const current = items[cursor % items.length] ?? ''

      for (let i = 1; i <= current.length; i++) {
        if (gen !== token) return
        display.value = current.slice(0, i)
        await wait(TYPE_INTERVAL)
      }
      if (gen !== token) return
      await wait(HOLD_TYPED)

      for (let i = current.length - 1; i >= 0; i--) {
        if (gen !== token) return
        display.value = current.slice(0, i)
        await wait(ERASE_INTERVAL)
      }
      if (gen !== token) return
      await wait(HOLD_ERASED)

      cursor++
    }
  }

  function start(): void {
    clearTimer()
    token++
    const items = list.value
    if (items.length === 0) {
      display.value = ''
      return
    }
    // 静态模式：只显示第一句，不播放任何动画
    if (isStatic.value) {
      display.value = items[0] ?? ''
      return
    }
    const gen = token
    void run(gen)
  }

  watch([list, isStatic], start, { immediate: true })
  onScopeDispose(() => {
    token++
    clearTimer()
  })

  return { display, isStatic }
}
