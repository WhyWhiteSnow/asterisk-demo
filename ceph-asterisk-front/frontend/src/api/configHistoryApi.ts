import axiosInstance from './axiosConfig'
import type {
  ConfigHistoryListResponse,
  ConfigHistoryVersionContent,
  ConfigRollbackRequest,
  ConfigRollbackResponse,
  ConfigTypesResponse,
} from '@/types/configHistory'

export const configHistoryApi = {
  async getConfigTypes(instanceId: number): Promise<ConfigTypesResponse> {
    const response = await axiosInstance.get<ConfigTypesResponse>(
      `/instances/${instanceId}/config/types`
    )
    return response.data
  },

  async getHistory(instanceId: number, configType: string): Promise<ConfigHistoryListResponse> {
    const response = await axiosInstance.get<ConfigHistoryListResponse>(
      `/instances/${instanceId}/config/${configType}/history`
    )
    return response.data
  },

  async getVersionContent(
    instanceId: number,
    configType: string,
    version: number
  ): Promise<ConfigHistoryVersionContent> {
    const response = await axiosInstance.get<ConfigHistoryVersionContent>(
      `/instances/${instanceId}/config/${configType}/history/${version}`
    )
    return response.data
  },

  async getCurrentConfig(instanceId: number, configType: string): Promise<string> {
    const response = await axiosInstance.get(`/instances/${instanceId}/config/${configType}`)
    return response.data as string
  },

  async rollback(
    instanceId: number,
    configType: string,
    data: ConfigRollbackRequest
  ): Promise<ConfigRollbackResponse> {
    const response = await axiosInstance.post<ConfigRollbackResponse>(
      `/instances/${instanceId}/config/${configType}/rollback`,
      data
    )
    return response.data
  },
}