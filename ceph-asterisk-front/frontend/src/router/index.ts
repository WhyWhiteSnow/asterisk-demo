import { createRouter, createWebHistory } from 'vue-router'
import VatsView from '@/views/VatsView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'home',
      component: VatsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/details',
      name: 'details',
      component: () => import('@/views/CdrView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('@/views/LogsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/audio',
      name: 'audio',
      component: () => import('@/views/AudioView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/config-history',
      name: 'config-history',
      component: () => import('@/views/ConfigHistoryView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      const isAuthed = await authStore.checkAuth()
      if (!isAuthed) {
        return '/login'
      }
    }
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    return '/'
  }

  return true
})

export default router