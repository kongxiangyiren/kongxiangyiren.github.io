import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vitePrerender from 'vite-plugin-prerender';
import { join, resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import svgLoader from 'vite-svg-loader';

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
    vitePrerender({
      // Required - The path to the vite-outputted app to prerender.
      staticDir: join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: ['/', '/home', '/test', '/404']
    })
  ]
});
