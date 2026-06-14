import axiosInstance from './axiosConfig'
import type {
  DialplanResponse,
  DialplanUpdate,
  DialplanContextUpdate,
} from '@/types/dialplan'

export const dialplanApi = {
  // Получить весь диалплан (extensions.conf)
  async getDialplan(
    instanceId: number,
    filename: string = 'extensions.conf'
  ): Promise<DialplanResponse> {
    const response = await axiosInstance.get<DialplanResponse>(
      `/instances/${instanceId}/dialplan`,
      { params: { filename } }
    )
    return response.data
  },

  // Получить список контекстов (категорий)
  async getContexts(
    instanceId: number,
    filename: string = 'extensions.conf'
  ): Promise<string[]> {
    const response = await axiosInstance.get<string[]>(
      `/instances/${instanceId}/dialplan/contexts`,
      { params: { filename } }
    )
    return response.data
  },

  // Получить один контекст
  async getContext(
    instanceId: number,
    contextName: string,
    filename: string = 'extensions.conf'
  ): Promise<DialplanResponse> {
    const response = await axiosInstance.get<DialplanResponse>(
      `/instances/${instanceId}/dialplan/${encodeURIComponent(contextName)}`,
      { params: { filename } }
    )
    return response.data
  },

  // Обновить весь диалплан
  async updateDialplan(
    instanceId: number,
    data: DialplanUpdate
  ): Promise<Record<string, unknown>> {
    const response = await axiosInstance.put(
      `/instances/${instanceId}/dialplan`,
      data
    )
    return response.data as Record<string, unknown>
  },

  // Обновить один контекст
  async updateContext(
    instanceId: number,
    contextName: string,
    data: DialplanContextUpdate
  ): Promise<Record<string, unknown>> {
    const response = await axiosInstance.put(
      `/instances/${instanceId}/dialplan/${encodeURIComponent(contextName)}`,
      data
    )
    return response.data as Record<string, unknown>
  },
}