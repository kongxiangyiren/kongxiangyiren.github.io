import { readonly, ref } from 'vue';

export type Theme = 'light' | 'dark';

/** 与 index.html 的防 FOUC 内联脚本共用同一个 key，改动时必须两边同步 */
export const THEME_STORAGE_KEY = 'blog-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    // 隐私模式 / localStorage 被禁用
    return null;
  }
}

function readSystemTheme(): Theme {
  try {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function writeStoredTheme(value: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // 写不进去就算了，内存态仍然正确
  }
}

/**
 * 同时喂两边钩子，少一个就会出现「一半亮一半暗」：
 *   - `data-theme` → Butterfly 令牌变量 + Tailwind 的 `dark:` 变体
 *   - `.dark`      → Element Plus 的暗色 css-vars（html.dark { ... }）
 *   - `color-scheme` → 原生滚动条 / 表单控件的配色
 */
function applyTheme(value: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = value;
  root.classList.toggle('dark', value === 'dark');
  root.style.colorScheme = value;
}

// 模块级单例：全站共享同一份主题状态。
//
// ⚠️ 初值故意写死 `'light'`，**不能**在这里读 localStorage / matchMedia：
//   - 预渲染在 Node 里跑，没有这两个 API，也不该去读（静态产物是给所有人用的同一份）；
//   - 浏览器首次渲染（水合）必须与预渲染出来的 DOM 逐字一致，所以两端只能用同一个常量。
// 真实主题在挂载后由 `initTheme()` 补上。页面的**配色**不受影响：index.html 的内联脚本
// 在首屏绘制前就把 `data-theme` / `.dark` 定好了，这里补的是 Vue 侧状态（主题按钮的图标与文案）。
const theme = ref<Theme>('light');

/**
 * 挂载后同步真实主题（本地存储优先，其次系统偏好）。
 * 由 `src/main.ts` 在水合完成后调用一次 —— 在那之前 Vue 侧状态必须与预渲染结果一致。
 */
export function initTheme(): void {
  const resolved = readStoredTheme() ?? readSystemTheme();
  theme.value = resolved;
  applyTheme(resolved);
}

export function setTheme(value: Theme): void {
  theme.value = value;
  applyTheme(value);
  writeStoredTheme(value);
}

export function toggleTheme(): void {
  setTheme(theme.value === 'dark' ? 'light' : 'dark');
}

// 多标签页同步（不同 tab 各自持有模块实例，靠 storage 事件对齐）
try {
  window.addEventListener('storage', event => {
    if (event.key !== THEME_STORAGE_KEY) return;
    if (event.newValue !== 'light' && event.newValue !== 'dark') return;
    theme.value = event.newValue;
    applyTheme(event.newValue);
  });
} catch {
  // 无 window 环境（预渲染时）：不需要多标签同步
}

export function useTheme() {
  return {
    /** 只读：改主题请走 setTheme / toggleTheme，避免 DOM 钩子不同步 */
    theme: readonly(theme),
    setTheme,
    toggleTheme
  };
}
