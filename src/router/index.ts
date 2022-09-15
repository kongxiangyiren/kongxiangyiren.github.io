import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/HomeView.vue';
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'home',
    component: Home,
    meta: {
      title: '首页|空巷'
    }
  },
  {
    path: '/download',
    name: 'download',
    component: () => import('@/views/DownView.vue'),
    meta: {
      title: '资源下载|空巷'
    }
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/404.vue'),
    meta: {
      title: '404|空巷'
    }
  },
  {
    path: '/:pathMatch(.*)',
    redirect: '/404'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title as string;
  } else {
    document.title = '空巷';
  }
  next();
});

export default router;
