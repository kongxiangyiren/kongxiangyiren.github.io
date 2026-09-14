// 样式引入顺序有意义：EP 变量覆盖 → EP 暗色 css-vars → Tailwind → 自研动画 → 正文排版
import './styles/element/index.scss'
import './styles/element/dark.scss'
import './styles/tailwind.css'
import './styles/scss/butterfly.scss'
import './styles/scss/markdown.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
