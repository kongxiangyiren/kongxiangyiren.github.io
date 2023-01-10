import { createApp } from 'vue';
import '@/global/style.css';
import App from './App.vue';
import router from './router';
import vueWechatTitle from 'vue-wechat-title';
// 点击效果
import clicker from 'my-clicker';
//鼠标点击
clicker(false, true, false, false);

const app = createApp(App);
app.use(router).use(vueWechatTitle);

app.mount('#app');

import VConsole from 'vconsole';
if (import.meta.env.DEV) {
  new VConsole({ maxLogNumber: 1000 });
}
