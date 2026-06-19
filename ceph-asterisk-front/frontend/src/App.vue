<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import { onMounted, onBeforeUnmount } from 'vue'
import Toast from '@/components/UI/AppToast.vue'
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue'

const themeStore = useThemeStore()
const authStore = useAuthStore()

onMounted(async () => {
  await authStore.checkAuth()
  themeStore.initializeTheme()
})

onBeforeUnmount(() => {
  themeStore.stopWatchingSystemTheme()
})
</script>

<template>
  <div class="app-layout">
    <NavBar v-if="$route.path !== '/login'" class="navigation" />
    <main class="main-content" :class="{ 'full-width': $route.path === '/login' }">
      <RouterView />
    </main>
    <Toast />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.navigation {
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  overflow: auto;
}
</style>