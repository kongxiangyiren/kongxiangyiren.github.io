import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);

app.mount('#app');

document.oncontextmenu = function () {
  return false;
}; // 禁止右键功能,单击右键将无任何反应
