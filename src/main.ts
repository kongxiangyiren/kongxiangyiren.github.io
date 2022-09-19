import { createApp } from 'vue';
import '@/global/style.css';
import App from './App.vue';
import router from './router';
import vueWechatTitle from 'vue-wechat-title';
// // 点击效果
import { clicker } from 'my_effect';
clicker(false, true);

const app = createApp(App);
app.use(router).use(vueWechatTitle);

app.mount('#app');

document.oncontextmenu = function () {
  if (!import.meta.env.DEV) {
    return false;
  }
}; // 禁止右键功能,单击右键将无任何反应
