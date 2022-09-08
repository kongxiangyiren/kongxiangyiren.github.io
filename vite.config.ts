import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vitePrerender from 'vite-plugin-prerender';
import { join, resolve } from 'path';
// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('src')
    }
  },
  plugins: [
    vue(),
    vitePrerender({
      // Required - The path to the vite-outputted app to prerender.
      staticDir: join(__dirname, 'dist'),
      outputDir: join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: ['/', '/home']
      // {
      //   route: String, // 输出文件将在哪里结束(相对于outputDir)
      //   originalRoute: String, // 在重定向之前传递到渲染器的路由。
      //   html: String, // 此路由的渲染HTML。
      //   outputPath: String // 呈现的HTML将被写入的路径。
      // }
    })
  ]
});
