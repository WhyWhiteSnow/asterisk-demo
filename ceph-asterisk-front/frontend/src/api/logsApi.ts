import axiosInstance from './axiosConfig'
import type { LogsModel } from '@/types/logs'

export interface LogsQueryParams {
  page?: number
  limit?: number
  level?: string | null
  pbx_id?: string | null
  text?: string | null
}

export const logsApi = {
  async getLogs(params: LogsQueryParams = {}): Promise<LogsModel> {
    const response = await axiosInstance.get<LogsModel>('/logs/', { params })
    return response.data
  },
}