/**
 * 页面滚动锁 —— 全站唯一实现。
 *
 * 以前这段逻辑内联在 `AppHeader.vue` 里（移动端抽屉用）。批 2B-2 的 lightbox
 * 也需要同一件事，所以抽出来给两边共用 —— 与其复制两份、各自踩一遍坑，不如
 * 让「什么情况下锁、什么时候解」只有一处定义。
 *
 * 几个刻意的设计：
 *  1. **引用计数**。抽屉（`md:hidden`）与 lightbox 理论上可能同时打开，
 *     后开的先关时不能把锁提前放掉，否则底层页面会在浮层还开着的时候能滚。
 *  2. **保存并还原原值**，而不是解锁时无脑写空串 —— 万一将来有别的代码在
 *     body 上设了 overflow，我们不该把它冲掉。
 *  3. **`overflow: hidden` 写在 body 上**。html 的 overflow 为 `visible` 时，
 *     body 的 overflow 会**传播到视口**，所以它锁得住整页滚动，又不像
 *     `position: fixed` 那套会把页面弹回顶部。
 *     不做 padding 补偿也不会抖：html 上有 `scrollbar-gutter: stable`
 *     （见 src/styles/tailwind.css），滚动条位置一直是预留的。
 */

import { onScopeDispose, watch, type Ref } from 'vue';

/** 当前持有锁的浮层数量 */
let holders = 0;
/** 第一次加锁前的内联值，最后一个解锁者负责还原 */
let previousOverflow = '';

function acquire(): void {
  if (holders === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  holders += 1;
}

function release(): void {
  if (holders === 0) return;
  holders -= 1;
  if (holders === 0) document.body.style.overflow = previousOverflow;
}

/**
 * 让 `locked` 的真假直接决定整页能不能滚。
 *
 * @param locked 为 `true` 期间锁住滚动；组件卸载时若仍持有锁会自动释放
 */
export function useScrollLock(locked: Ref<boolean>): void {
  let held = false;

  watch(
    locked,
    value => {
      if (value === held) return;
      held = value;
      if (value) acquire();
      else release();
    },
    { immediate: true }
  );

  // 打开状态下组件被卸载（例如整体切走），不能把锁留在页面上
  onScopeDispose(() => {
    if (!held) return;
    held = false;
    release();
  });
}
