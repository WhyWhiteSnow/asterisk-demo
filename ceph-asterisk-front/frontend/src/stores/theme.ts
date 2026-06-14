import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<'light' | 'dark'>('light')
  let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null
  let userHasChosen = false

  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const setTheme = (theme: 'light' | 'dark') => {
    currentTheme.value = theme
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('app-theme', theme)
    userHasChosen = true
  }

  const toggleTheme = () => {
    const newTheme = currentTheme.value === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('app-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const systemTheme = getSystemTheme()
      setTheme(systemTheme)
      startWatchingSystemTheme()
    }
  }

  const startWatchingSystemTheme = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeListener = (e: MediaQueryListEvent) => {
      if (!userHasChosen) {
        const newSystemTheme = e.matches ? 'dark' : 'light'
        setTheme(newSystemTheme)
      }
    }
    mediaQuery.addEventListener('change', systemThemeListener)
  }

  const stopWatchingSystemTheme = () => {
    if (systemThemeListener) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.removeEventListener('change', systemThemeListener)
      systemThemeListener = null
    }
  }

  return {
    currentTheme,
    toggleTheme,
    initializeTheme,
    stopWatchingSystemTheme,
  }
})