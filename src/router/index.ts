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
    component: Home
  },
  {
    path: '/test',
    name: 'test',
    component: () => import('@/views/TestView.vue')
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/404.vue')
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

export default router;
