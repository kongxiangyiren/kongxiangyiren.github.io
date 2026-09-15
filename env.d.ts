/// <reference types="vite/client" />
/// <reference types="nitro/vite/types" />

/**
 * `vite.config.ts` 的 `define` 注入：本次构建的启动时间戳（毫秒）。
 *
 * 用途：`useUptime` 的初值。预渲染出来的「已运行 X 天 Y 时 Z 分 S 秒」必须与浏览器
 * 首次渲染（水合）算出来的字符串完全一致，否则报水合不一致 —— 两端只能用**同一个常量**。
 * 用构建时间而不是 `Date.now()`，既保证两端一致，又能让静态产物里的等待回话有意义
 * （不是「0 天 0 时」这种占位）。
 */
declare const __BUILD_TIMESTAMP__: number;
