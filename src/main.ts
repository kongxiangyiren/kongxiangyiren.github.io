import { createApp } from 'vue';
import '@/global/style.css';
import App from './App.vue';
import router from './router';
import vueWechatTitle from 'vue-wechat-title';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@/global/clicker.js';

const app = createApp(App);
app.use(router).use(vueWechatTitle);

app.mount('#app');

document.oncontextmenu = function () {
  if (!import.meta.env.DEV) {
    return false;
  }
}; // 禁止右键功能,单击右键将无任何反应
