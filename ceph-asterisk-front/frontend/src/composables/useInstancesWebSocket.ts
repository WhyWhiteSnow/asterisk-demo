import { onMounted, onUnmounted, ref } from 'vue'
import { buildWsUrl } from '@/config/api'
import type { VatsInstanceFromAPI } from '@/types/vats'

const WS_PATH = '/ws/instances'
const PING_INTERVAL_MS = 30_000
const CONNECT_TIMEOUT_MS = 5_000
const INITIAL_RECONNECT_MS = 1_000
const MAX_RECONNECT_MS = 30_000
const WS_POLICY_VIOLATION = 1008

type InstanceWsMessage =
  | { type: 'snapshot'; instances: VatsInstanceFromAPI[] }
  | { type: 'instance_updated'; instance: VatsInstanceFromAPI }
  | { type: 'instance_deleted'; instance_id: number }
  | { type: 'pong' }

export interface UseInstancesWebSocketOptions {
  onSnapshot: (instances: VatsInstanceFromAPI[]) => void
  onInstanceUpdated: (instance: VatsInstanceFromAPI) => void
  onInstanceDeleted: (instanceId: number) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

function getAccessToken(): string | null {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
}

export function useInstancesWebSocket(options: UseInstancesWebSocketOptions) {
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)

  let ws: WebSocket | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelayMs = INITIAL_RECONNECT_MS
  let intentionalClose = false
  let hasConnectedOnce = false

  const clearPingTimer = () => {
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  const clearConnectTimeout = () => {
    if (connectTimeoutTimer) {
      clearTimeout(connectTimeoutTimer)
      connectTimeoutTimer = null
    }
  }

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (intentionalClose) return
    clearReconnectTimer()
    reconnectTimer = setTimeout(() => {
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_MS)
      connect()
    }, reconnectDelayMs)
  }

  const handleMessage = (event: MessageEvent<string>) => {
    let payload: InstanceWsMessage
    try {
      payload = JSON.parse(event.data) as InstanceWsMessage
    } catch {
      return
    }

    switch (payload.type) {
      case 'snapshot':
        options.onSnapshot(payload.instances)
        break
      case 'instance_updated':
        options.onInstanceUpdated(payload.instance)
        break
      case 'instance_deleted':
        options.onInstanceDeleted(payload.instance_id)
        break
      case 'pong':
        break
    }
  }

  const connect = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const token = getAccessToken()
    if (!token) {
      connectionError.value = 'missing token'
      options.onDisconnected?.()
      return
    }

    connectionError.value = null
    const url = `${buildWsUrl(WS_PATH)}?token=${encodeURIComponent(token)}`
    ws = new WebSocket(url)

    clearConnectTimeout()
    connectTimeoutTimer = setTimeout(() => {
      if (ws?.readyState !== WebSocket.OPEN) {
        connectionError.value = 'connection timeout'
        ws?.close()
        options.onDisconnected?.()
        scheduleReconnect()
      }
    }, CONNECT_TIMEOUT_MS)

    ws.onopen = () => {
      clearConnectTimeout()
      reconnectDelayMs = INITIAL_RECONNECT_MS
      isConnected.value = true
      hasConnectedOnce = true
      connectionError.value = null

      clearPingTimer()
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, PING_INTERVAL_MS)

      options.onConnected?.()
    }

    ws.onmessage = handleMessage

    ws.onerror = () => {
      connectionError.value = 'websocket error'
      if (!hasConnectedOnce) {
        options.onDisconnected?.()
      }
    }

    ws.onclose = (event) => {
      clearConnectTimeout()
      clearPingTimer()
      isConnected.value = false
      ws = null

      if (event.code === WS_POLICY_VIOLATION) {
        intentionalClose = true
        connectionError.value = event.reason || 'auth rejected'
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return
      }

      options.onDisconnected?.()
      scheduleReconnect()
    }
  }

  const disconnect = () => {
    intentionalClose = true
    clearConnectTimeout()
    clearReconnectTimer()
    clearPingTimer()
    if (ws) {
      ws.close()
      ws = null
    }
    isConnected.value = false
  }

  const handleLogout = () => {
    disconnect()
  }

  onMounted(() => {
    intentionalClose = false
    connect()
    window.addEventListener('auth:logout', handleLogout)
  })

  onUnmounted(() => {
    window.removeEventListener('auth:logout', handleLogout)
    disconnect()
  })

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
  }
}
