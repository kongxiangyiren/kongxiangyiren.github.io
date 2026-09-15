import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import router from 'vue-router/vite';
import tailwindcss from '@tailwindcss/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { runtimeDir } from 'nitro/meta';
import { nitro } from 'nitro/vite';
// 显式带 .ts 后缀：Vite 8 的 configLoader: 'native'（将来的默认值）要求扩展名齐全
import { blogContent } from './plugins/vite-plugin-blog-content.ts';

// 用 import.meta.url 而非 __dirname：本项目 type: module，配置以 ESM 加载。
// 反斜杠要换成 /，否则 Windows 绝对路径进 Sass 字符串会被当成转义序列。
const EP_VARS = fileURLToPath(new URL('./src/styles/element/index.scss', import.meta.url)).replace(
  /\\/g,
  '/'
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    router(),
    tailwindcss(),
    vue(),
    vueDevTools(),
    // 构建期把 content/posts/*.md 编译成虚拟模块。
    // 放在 router() 之后：它不参与路由生成，只要在 vue() 之前/之后都可，
    // 但必须早于任何消费 virtual:blog/* 的模块被 transform。
    blogContent(),
    Components({
      dts: 'src/types/components.d.ts',
      resolvers: [ElementPlusResolver({ importStyle: 'sass' })]
    }),
    nitro()
  ],
  /*
   * 客户端环境的入口是 `src/main.ts`，**不是 index.html**。
   *
   * index.html 在本批里降级为「预渲染的 HTML 外壳」：由 src/entry-server.ts 用 `?raw` 读入。
   * 不能把 index.html 继续当客户端入口 —— 客户端构建会把带 hash 资源的 index.html 直接写进
   * `.output/public/`，而预渲染时的静态文件中间件会**用它盖住 `/`**（实测：预渲染出来的首页
   * 就是那个空 `#app` 的客户端外壳），SSR 根本跑不到。
   *
   * 另外 nitro 的 `clientBuildFallback` 是关的，不给 input 客户端环境会被整体跳过。
   */
  environments: {
    client: {
      build: {
        rollupOptions: { input: './src/main.ts' },
        // 全部 CSS 合成一个文件：预渲染出的每一页只要引它，就不会有「路由级 CSS 还没到」
        // 的样式闪烁；同时 cssCodeSplit 关闭后各路由 chunk 不再各自带一份样式。
        cssCodeSplit: false
      }
    },
    ssr: {
      build: {
        /*
         * ⚠️ input 必须显式写。nitro 的 SSR 服务探测有个「非此即彼」的分支：
         * 只要用户配置里出现了 `environments.ssr`，它就**不再**自动探测 `src/entry-server.ts`，
         * 而是从这里的 input 取入口。只写 build 选项不写 input，SSR 环境会直接不被构建
         * （表现为所有路由预渲染返回 404、产物只剩空壳）。
         */
        rollupOptions: { input: './src/entry-server.ts' },
        // 服务端构建的 CSS 与客户端合并成同名同 hash 的单文件：两边内容一致时文件名也一致，
        // 会被覆盖而不会在 .output/public/assets 里多留一份 40 kB 的副本
        //（dev 下仍需 ssr 模块图收集 CSS，那是运行时行为，由 `?assets=ssr` 提供）。
        cssCodeSplit: false
      }
    }
  },
  define: {
    // 本次构建的启动时间戳，客户端与服务端拿到的是同一个值 ——
    // 见 src/composables/useUptime.ts（水合一致性），以及 env.d.ts 的声明。
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now())
  },
  nitro: {
    // 预渲染全部路由，产物是纯静态文件（不含 server bundle）
    preset: 'static',
    prerender: {
      crawlLinks: true,
      // 默认 false：预渲染失败会被静默跳过，产物缺页却构建成功。必须打开。
      failOnError: true,
      routes: ['/', '/404.html']
    },
    /*
     * 关掉 nitro 的「HTML 模板 + `<!--ssr-outlet-->`」渲染路径，改由 src/entry-server.ts
     * 直接返回完整 HTML 文档。理由：模板机制只能往 outlet 里注入字符串（`#app` 的内容），
     * `<head>` 是构建期固定的 —— 那样每页的 <title> 就只能是站点名，SEO 拿不到文章名。
     * handler 一旦设置，nitro 就不再注册模板 handler，模板仅用于客户端构建的 input。
     */
    renderer: { handler: join(runtimeDir, 'internal/vite/ssr-renderer') }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 只对 EP 自己的文件注入变量覆盖。
        // additionalData 会对每一次 scss 编译生效，若不按 filename 过滤会污染我们自己的
        // 组件样式块 —— 每个块都要重新解析 EP 的 var.scss（内含大 map deep-merge），HMR 变慢。
        additionalData: (source: string, filename: string) =>
          filename.includes('element-plus') ? `@use "${EP_VARS}" as *;\n${source}` : source
      }
    }
  }
});
