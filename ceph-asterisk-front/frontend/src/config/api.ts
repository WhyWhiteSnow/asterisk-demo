function normalizeApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw === undefined || raw === null) {
    return 'http://127.0.0.1:8000'
  }
  if (raw.trim() === '') {
    return '/api'
  }
  return raw
}

export const API_CONFIG = {
  BASE_URL: normalizeApiBaseUrl(),
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '5000'),
  ENDPOINTS: {
    INSTANCES: '/instances/',
    CDR: '/cdr/',
  },
} as const

export function buildWsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '')

  if (base.startsWith('http://') || base.startsWith('https://')) {
    const wsOrigin = base.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws'))
    return `${wsOrigin}${normalizedPath}`
  }

  if (typeof window === 'undefined') {
    return `${base}${normalizedPath}`
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProtocol}//${window.location.host}${base}${normalizedPath}`
}
