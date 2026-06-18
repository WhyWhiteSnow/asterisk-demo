import axios from 'axios'
import { translateApiDetail } from '@/utils/apiErrorMessages'

export function parseApiError(error: unknown, defaultMessage: string): string {
  if (axios.isCancel(error)) return 'Запрос отменён.'

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status
      const detail = error.response.data?.detail ?? error.response.data?.message
      const translated = translateApiDetail(detail)

      if (status >= 500) {
        return (
          translated ||
          `Внутренняя ошибка сервера (код ${status}). Подробности см. в ответе API.`
        )
      }
      if (status === 404) {
        return translated || 'Данные не найдены (404).'
      }
      if (status === 403 || status === 401) {
        return translated || `Ошибка доступа (код ${status}).`
      }
      if (status === 400) {
        return translated || 'Некорректный запрос (400).'
      }

      return translated || detail || `Ошибка сервера (код ${status}).`
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
