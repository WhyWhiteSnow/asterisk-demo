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

function buildWsUrl(): string {
  const base = API_CONFIG.BASE_URL.replace(/^http/, 'ws')
  const token = localStorage.getItem('access_token')
  const url = `${base}/ws/instances`
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
