import { createApp } from 'vue';
import '@/global/style.css';
import App from './App.vue';
import router from './router';
import vueWechatTitle from 'vue-wechat-title';
// 点击效果
import { clicker } from 'my_effect';
//鼠标点击
clicker(false, true);
// 默哀
let year = new Date().getFullYear(); //年

const app = createApp(App);
app.use(router).use(vueWechatTitle);

app.mount('#app');

import VConsole from 'vconsole';
if (import.meta.env.DEV) {
  new VConsole({ maxLogNumber: 1000 });
}
