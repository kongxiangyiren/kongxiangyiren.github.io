import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vitePrerender from 'vite-plugin-prerender';
import { join, resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import svgLoader from 'vite-svg-loader';
import viteCompression from 'vite-plugin-compression';
import CopyPlugin from 'vite-copy-plugin';

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
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    }),
    svgLoader(),
    viteCompression({
      disable: false, // 是否禁用
      verbose: true, // 是否在控制台输出压缩结果
      filter: /.(js|css)$/i, // 压缩文件的过滤规则
      threshold: 10240, // 文件大小阈值，以字节为单位
      algorithm: 'gzip', // 压缩算法,可选 [ 'gzip' , 'brotliCompress' ,'deflate' , 'deflateRaw']
      ext: '.gz', // 	生成的压缩包后缀
      compressionOptions: {
        // 压缩选项
        level: 9 // 压缩等级，范围1-9,越小压缩效果越差，但是越大处理越慢，所以一般取中间值;
      },
      deleteOriginFile: true // 是否删除原始文件
    }),
    vitePrerender({
      // Required - The path to the vite-outputted app to prerender.
      staticDir: join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: ['/', '/home', '/download', '/404']
    })
    // CopyPlugin([{ from: './node_modules/live2d-widget-model-koharu', to: 'dist/live2d-widget-model-koharu' }])
  ],
  server: {
    host: '0.0.0.0'
  },
  build: {
    outDir: './dist',
    assetsDir: 'assets',
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
