import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';
import vueWechatTitle from 'vue-wechat-title';

const app = createApp(App);
app.use(router).use(vueWechatTitle);

app.mount('#app');

document.oncontextmenu = function () {
  return false;
}; // 禁止右键功能,单击右键将无任何反应
