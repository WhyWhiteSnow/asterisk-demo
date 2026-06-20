import { onMounted, onUnmounted, ref } from 'vue'
import { API_CONFIG } from '@/config/api'
import type { VatsInstanceFromAPI } from '@/types/vats'

export type InstancesWsMessage =
  | { type: 'snapshot'; instances: VatsInstanceFromAPI[] }
  | { type: 'instance_updated'; instance: VatsInstanceFromAPI }
  | { type: 'instance_deleted'; instance_id: number }
  | { type: 'pong' }

type MessageHandler = (message: InstancesWsMessage) => void

const RECONNECT_DELAY_MS = 3000

function resolveWsBase(httpBase: string): string {
  const trimmed = httpBase.replace(/\/$/, '')

  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}`
  }
  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}`
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    if (!trimmed || trimmed.startsWith('/')) {
      return `${protocol}//${window.location.host}${trimmed}`
    }
    return `${protocol}//${trimmed}`
  }
  return `ws://${trimmed || '127.0.0.1:8000'}`
}

function getAccessToken(): string | null {
  return localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token')
}

function buildWsUrl(): string {
  const base = resolveWsBase(API_CONFIG.BASE_URL)
  const token = getAccessToken()
  const url = `${base}/instances/ws`
  if (token) {
    return `${url}?token=${encodeURIComponent(token)}`
  }
  return url
}

export function useInstancesWebSocket(onMessage: MessageHandler) {
  const isConnected = ref(false)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let shouldReconnect = true

  const connect = () => {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return
    }

    try {
      ws = new WebSocket(buildWsUrl())

      ws.onopen = () => {
        isConnected.value = true
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as InstancesWsMessage
          onMessage(data)
        } catch (error) {
          console.error('Ошибка разбора WebSocket-сообщения:', error)
        }
      }

      ws.onclose = () => {
        isConnected.value = false
        ws = null
        if (shouldReconnect) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    } catch (error) {
      console.error('Ошибка подключения WebSocket:', error)
      if (shouldReconnect) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }
  }

  const disconnect = () => {
    shouldReconnect = false
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws?.close()
    ws = null
    isConnected.value = false
  }

  onMounted(connect)
  onUnmounted(disconnect)

  return { isConnected, connect, disconnect }
}
