import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vitePrerender from 'vite-plugin-prerender';
import { join, resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import svgLoader from 'vite-svg-loader';
import CopyPlugin from 'vite-copy-plugin';
import progress from 'vite-plugin-progress';
import colors from 'picocolors';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': resolve('src')
    }
  },
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router'],
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    }),
    svgLoader(),
    vitePrerender({
      // Required - The path to the vite-outputted app to prerender.
      staticDir: join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: ['/', '/home', '/download', '/message', '/404']
    }),
    CopyPlugin([
      { from: './node_modules/live2d-widget-model-koharu', to: 'dist/live2d-widget-model-koharu' }
    ]),
    progress({
      format: `${colors.green(colors.bold('正在打包'))} ${colors.cyan(
        '[:bar]'
      )} :percent | 用时: :elapseds | 预计完成: :etas`
    })
  ],
  server: {
    host: '0.0.0.0'
  },

  build: {
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
    outDir: './dist',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 移除log
    minify: 'terser',
    terserOptions: {
      compress: {
        //生产环境时移除console.log()
        drop_console: true,
        //生产环境时移除debugger
        drop_debugger: false
      }
    }
  }
});
