import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vitePrerender from 'vite-plugin-prerender';
import { join } from 'path';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vitePrerender({
      // Required - The path to the vite-outputted app to prerender.
      staticDir: join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: ['/', '/home']
    })
  ]
});
