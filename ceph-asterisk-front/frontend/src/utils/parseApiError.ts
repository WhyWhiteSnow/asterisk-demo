import axios from 'axios'
import { translateApiCode, translateApiDetail } from '@/utils/apiErrorMessages'

function extractErrorPayload(data: unknown): { detail: unknown; code: string | null } {
  if (!data || typeof data !== 'object') {
    return { detail: null, code: null }
  }
  const payload = data as { detail?: unknown; message?: unknown; code?: unknown }
  const detail = payload.detail ?? payload.message ?? null
  const code = typeof payload.code === 'string' ? payload.code : null
  return { detail, code }
}

export function parseApiError(error: unknown, defaultMessage: string): string {
  if (axios.isCancel(error)) return 'Запрос отменён.'

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status
      const { detail, code } = extractErrorPayload(error.response.data)

      if (typeof detail === 'string' && detail.trim()) {
        return translateApiDetail(detail) || detail
      }

      if (code) {
        const fromCode = translateApiCode(code)
        if (fromCode) return fromCode
      }

      const translated = translateApiDetail(detail)
      if (translated) return translated

      if (status === 503) {
        return 'Сервис временно недоступен (503).'
      }
      if (status >= 500) {
        return `Внутренняя ошибка сервера (код ${status}).`
      }
      if (status === 404) {
        return 'Данные не найдены (404).'
      }
      if (status === 403 || status === 401) {
        return `Ошибка доступа (код ${status}).`
      }
      if (status === 400) {
        return 'Некорректный запрос (400).'
      }

      return typeof detail === 'string' ? detail : `Ошибка сервера (код ${status}).`
    }
    if (error.request) {
      return 'Нет ответа от сервера. Проверьте подключение и адрес API.'
    }
    return `Ошибка при настройке запроса: ${error.message}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return defaultMessage
}
