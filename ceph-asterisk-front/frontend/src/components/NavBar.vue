<template>
  <div class="navbar-wrapper">
    <button class="mobile-menu-toggle" @click="toggleMobileMenu" aria-label="Открыть меню">
      <svg v-if="!isMobileMenuOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>

      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <div v-if="isMobileMenuOpen" class="mobile-overlay" @click="toggleMobileMenu"></div>

    <nav class="navbar" :class="{ 'mobile-open': isMobileMenuOpen }" @click.stop>
      <div class="navbar-header">
        <div class="navbar-header-icon">
          <svg class="asterisk-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="M300-720q-25 0-42.5 17.5T240-660q0 25 17.5 42.5T300-600q25 0 42.5-17.5T360-660q0-25-17.5-42.5T300-720Zm0 400q-25 0-42.5 17.5T240-260q0 25 17.5 42.5T300-200q25 0 42.5-17.5T360-260q0-25-17.5-42.5T300-320ZM160-840h640q17 0 28.5 11.5T840-800v280q0 17-11.5 28.5T800-480H160q-17 0-28.5-11.5T120-520v-280q0-17 11.5-28.5T160-840Zm40 80v200h560v-200H200Zm-40 320h640q17 0 28.5 11.5T840-400v280q0 17-11.5 28.5T800-80H160q-17 0-28.5-11.5T120-120v-280q0-17 11.5-28.5T160-440Zm40 80v200h560v-200H200Zm0-400v200-200Zm0 400v200-200Z"/>
          </svg>
        </div>
        <div class="navbar-titles">
          <h1 class="navbar-title">Asterisk BATC</h1>
          <div class="navbar-subtitle">Управление</div>
        </div>
      </div>

      <ul class="navbar-menu">
        <li class="navbar-section-label">ВАТС</li>
        <li
          v-for="item in vatsSubItems"
          :key="item.id"
          class="navbar-item navbar-item--sub"
          :class="{ 'navbar-item--active': isActive(item.route) }"
          @click="navigateTo(item)"
        >
          <span class="navbar-item__main">{{ item.main }}</span>
          <span v-if="item.sub" class="navbar-item__sub">{{ item.sub }}</span>
        </li>

        <li class="navbar-divider" aria-hidden="true"></li>

        <li
          v-for="item in globalMenuItems"
          :key="item.id"
          class="navbar-item"
          :class="{ 'navbar-item--active': isActive(item.route) }"
          @click="navigateTo(item)"
        >
          <span class="navbar-item__main">{{ item.main }}</span>
          <span v-if="item.sub" class="navbar-item__sub">{{ item.sub }}</span>
        </li>
      </ul>

      <div class="navbar-footer">
        <div class="navbar-admin">
          <span class="navbar-admin__label">
            {{ authStore.user?.name || authStore.user?.login || 'Администратор' }}
          </span>
          <div class="admin-actions">
            <button class="theme-toggle" @click="themeStore.toggleTheme()" aria-label="Переключить тему">
              <svg v-if="themeStore.currentTheme === 'light'" class="theme-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 1V3M12 21V23M23 12H21M3 12H1M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M19.07 19.07L17.66 17.66M6.34 6.34L4.93 4.93" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <svg v-else class="theme-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="logout-button" @click="handleLogout" aria-label="Выйти">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 17L21 12L16 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { useActiveInstanceStore } from '@/stores/activeInstance'

interface MenuItem {
  id: string
  main: string
  sub: string
  route: string
  requiresInstance?: boolean
}

const router = useRouter()
const route = useRoute()
const isMobileMenuOpen = ref(false)
const isMobileView = ref(false)
const authStore = useAuthStore()
const themeStore = useThemeStore()
const activeInstanceStore = useActiveInstanceStore()

/** Per-VATC разделы — временно подпункты «ВАТС»; позже возможен перенос в модалку редактирования */
const vatsSubItems: MenuItem[] = [
  { id: 'vats-list', main: 'Список ВАТС', sub: '', route: '/' },
  { id: 'audio', main: 'Аудиофайлы', sub: '', route: '/audio' },
  { id: 'queues', main: 'Очереди', sub: '', route: '/queues', requiresInstance: true },
  { id: 'voicemail', main: 'Голосовая почта', sub: '', route: '/voicemail', requiresInstance: true },
  { id: 'constructor', main: 'Конструктор', sub: '', route: '/constructor', requiresInstance: true },
]

const globalMenuItems: MenuItem[] = [
  { id: 'cdr', main: 'Детализация', sub: '(CDR)', route: '/details' },
  { id: 'logs', main: 'Логи', sub: '', route: '/logs' },
  { id: 'config-history', main: 'История конфигов', sub: '', route: '/config-history' },
]

// Проверка размера экрана
const checkMobileView = () => {
  isMobileView.value = window.innerWidth <= 768
  // Закрываем меню при переходе на десктоп
  if (!isMobileView.value) {
    isMobileMenuOpen.value = false
    document.body.style.overflow = ''
  }
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  // Блокируем скролл страницы при открытом меню
  document.body.style.overflow = isMobileMenuOpen.value ? 'hidden' : ''
}

const isActive = (menuRoute: string): boolean => {
  return route.path === menuRoute
}

const navigateTo = (item: MenuItem): void => {
  if (item.requiresInstance && !activeInstanceStore.hasSelection) {
    router.push({ path: '/', query: { needInstance: '1', from: item.route } })
  } else if (item.requiresInstance && activeInstanceStore.instanceId) {
    router.push({
      path: item.route,
      query: { instanceId: String(activeInstanceStore.instanceId) },
    })
  } else {
    router.push(item.route)
  }
  if (isMobileView.value) {
    isMobileMenuOpen.value = false
    document.body.style.overflow = ''
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

// Слушатель изменения размера окна
onMounted(() => {
  checkMobileView()
  window.addEventListener('resize', checkMobileView)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobileView)
  document.body.style.overflow = '' // Восстанавливаем скролл
})
</script>

<style scoped>
.navbar-wrapper {
  position: relative;
}

.mobile-menu-toggle {
  display: none;
  position: fixed;
  top: 15px;
  right: 15px;
  z-index: 1100;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  color: var(--color-text);
  transition: all 0.3s ease;
}

.mobile-menu-toggle:hover {
  background: var(--color-background-mute);
  transform: scale(1.05);
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Основные стили навигации */
.navbar {
  height: 100vh;
  width: 280px;
  min-width: 280px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  font-family: Arial, sans-serif;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  left: 0;
  align-self: flex-start;
  overflow-y: auto;
  z-index: var(--z-nav-bar);
  transition: transform 0.3s ease;
}

.navbar-header {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background-color: var(--color-background-soft);
  z-index: 10;
  flex-shrink: 0;
  padding: 15px;
}

.asterisk-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  color: var(--color-heading);
  transition: color var(--transition-fast);
}

.navbar-titles {
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.navbar-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--color-heading);
  line-height: 1.2;
  margin-bottom: 2px;
}

.navbar-subtitle {
  font-size: 0.8rem;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
}

.navbar-menu {
  list-style: none;
  padding: 10px 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.navbar-item {
  padding: 14px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.navbar-item:hover {
  background-color: var(--color-surface-hover);
}

.navbar-item--active {
  background-color: var(--color-primary);
  border-left-color: var(--color-primary-dark);
}

.navbar-item__main {
  font-size: 1rem;
  font-weight: 500;
}

.navbar-item__sub {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  opacity: 0.9;
}

.navbar-section-label {
  padding: 12px 20px 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  opacity: 0.85;
  list-style: none;
}

.navbar-item--sub {
  padding-left: 28px;
}

.navbar-divider {
  height: 1px;
  margin: 8px 16px;
  background: var(--color-border);
  list-style: none;
}

.navbar-footer {
  padding: 20px;
  border-top: 1px solid var(--color-border);
  position: sticky;
  bottom: 0;
  background-color: var(--color-background-soft);
  z-index: 10;
  flex-shrink: 0;
}

.navbar-admin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.admin-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.navbar-admin__label {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Стили для скроллбара */
.navbar::-webkit-scrollbar,
.navbar-menu::-webkit-scrollbar {
  width: 4px;
}

.navbar::-webkit-scrollbar-track,
.navbar-menu::-webkit-scrollbar-track {
  background: transparent;
}

.navbar::-webkit-scrollbar-thumb,
.navbar-menu::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.navbar::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.theme-toggle,
.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  line-height: 1;
}

.theme-toggle:hover,
.logout-button:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: scale(1.05);
}

.theme-toggle:active,
.logout-button:active {
  transform: scale(0.95);
}


.theme-icon {
  display: block;
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
  transition: stroke var(--transition-fast);
}

/* ===== АДАПТИВНОСТЬ ===== */

/* Планшеты и небольшие ноутбуки */
@media (max-width: 1024px) {
  .navbar {
    width: 240px;
    min-width: 240px;
  }

  .navbar-title {
    font-size: 1.1rem;
  }

  .navbar-item {
    padding: 12px 16px;
  }
}

/* Мобильные устройства */
@media (max-width: 768px) {
  .mobile-menu-toggle {
    display: block;
    right: 15px;
  }

  .theme-icon {
    width: 18px;
    height: 18px;
  }

  .theme-toggle,
  .logout-button {
    padding: 4px;
  }

  .admin-actions {
    gap: 4px;
  }

  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    transform: translateX(-100%);
    height: 100vh;
    height: 100dvh;
    width: 280px;
    min-width: 280px;
    box-shadow: 5px 0 15px rgba(0, 0, 0, 0.2);
    z-index: 1001;
  }

  .navbar.mobile-open {
    transform: translateX(0);
  }

  .navbar-header {
    padding-top: 15px;
  }

  .asterisk-icon {
    width: 40px;
    height: 40px;
  }

  .navbar-title {
    font-size: 1.2rem;
  }

  .navbar-subtitle {
    font-size: 0.8rem;
  }
}

/* Очень маленькие мобильные */
@media (max-width: 480px) {
  .navbar {
    width: 100%;
    max-width: 320px;
  }

  .navbar-item {
    padding: 16px 20px;
  }

  .navbar-item__main {
    font-size: 1.1rem;
  }

  .mobile-menu-toggle {
    top: 10px;
    right: 10px; /* Уменьшен отступ для маленьких экранов */
    padding: 8px; /* Уменьшен padding */
  }

  .hamburger {
    width: 20px; /* Уменьшен размер гамбургера */
  }
}

/* Для очень широких экранов можно сделать кнопку более заметной */
@media (min-width: 769px) and (max-width: 1200px) {
  .mobile-menu-toggle {
    display: none; /* Скрываем на планшетах/ноутбуках */
  }
}
</style>