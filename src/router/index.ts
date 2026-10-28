import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { brandName } from '@/env';
import StatusPage from '@/views/StatusPage.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'status', component: StatusPage, meta: { title: null } },
  {
    path: '/services/:id(\\d+)',
    name: 'service',
    component: () => import('@/views/ServiceDetail.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { title: 'Service' },
  },
  { path: '/admin', name: 'admin', component: () => import('@/views/AdminPage.vue'), meta: { title: 'Admin' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue'), meta: { title: 'Page not found' } },
];

/** App router in HTML5 history mode; the web server must fall back to `index.html`. */
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
});

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : null;
  document.title = title ? `${title} · ${brandName}` : brandName;
});

/** Sets the page title from a view (e.g. a service name once it has loaded). */
export function setPageTitle(title: string | null): void {
  document.title = title ? `${title} · ${brandName}` : brandName;
}
