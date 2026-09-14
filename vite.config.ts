import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import router from 'vue-router/vite'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// 显式带 .ts 后缀：Vite 8 的 configLoader: 'native'（将来的默认值）要求扩展名齐全
import { blogContent } from './plugins/vite-plugin-blog-content.ts'

// 用 import.meta.url 而非 __dirname：本项目 type: module，配置以 ESM 加载。
// 反斜杠要换成 /，否则 Windows 绝对路径进 Sass 字符串会被当成转义序列。
const EP_VARS = fileURLToPath(new URL('./src/styles/element/index.scss', import.meta.url)).replace(
  /\\/g,
  '/',
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    router(),
    vue(),
    vueDevTools(),
    // 构建期把 content/posts/*.md 编译成虚拟模块。
    // 放在 router() 之后：它不参与路由生成，只要在 vue() 之前/之后都可，
    // 但必须早于任何消费 virtual:blog/* 的模块被 transform。
    blogContent(),
    Components({
      dts: 'src/types/components.d.ts',
      resolvers: [ElementPlusResolver({ importStyle: 'sass' })],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 只对 EP 自己的文件注入变量覆盖。
        // additionalData 会对每一次 scss 编译生效，若不按 filename 过滤会污染我们自己的
        // 组件样式块 —— 每个块都要重新解析 EP 的 var.scss（内含大 map deep-merge），HMR 变慢。
        additionalData: (source: string, filename: string) =>
          filename.includes('element-plus') ? `@use "${EP_VARS}" as *;\n${source}` : source,
      },
    },
  },
})
