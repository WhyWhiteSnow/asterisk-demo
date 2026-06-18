import { createRouter, createWebHistory } from 'vue-router'
import VatsView from '@/views/VatsView.vue'
import { useAuthStore } from '@/stores/auth'
import { useActiveInstanceStore } from '@/stores/activeInstance'

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
      path: '/constructor',
      name: 'constructor',
      component: () => import('@/views/ConstructorView.vue'),
      meta: { requiresAuth: true, requiresActiveInstance: true },
    },
    {
      path: '/config-history',
      name: 'config-history',
      component: () => import('@/views/ConfigHistoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/queues',
      name: 'queues',
      component: () => import('@/views/QueuesView.vue'),
      meta: { requiresAuth: true, requiresActiveInstance: true },
    },
    {
      path: '/voicemail',
      name: 'voicemail',
      component: () => import('@/views/VoicemailView.vue'),
      meta: { requiresAuth: true, requiresActiveInstance: true },
    }
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

  if (to.meta.requiresActiveInstance) {
    const hasQueryInstance = to.query.instanceId != null && to.query.instanceId !== ''
    if (!hasQueryInstance) {
      const activeStore = useActiveInstanceStore()
      if (!activeStore.hasSelection) {
        return {
          path: '/',
          query: { needInstance: '1', from: to.fullPath },
        }
      }
    }
  }

  return true
})

export default router