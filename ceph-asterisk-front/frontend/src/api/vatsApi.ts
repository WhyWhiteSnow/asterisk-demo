import axiosInstance from './axiosConfig'
import type { AxiosRequestConfig } from 'axios'

import type {
  SIPUserCreateRequest,
  SIPUserUpdateRequest,
  VatsInstanceFromAPI,
  SIPUserFromAPI,
  VatsCreateRequest,
  AsteriskInstanceUpdate,
} from '@/types/vats'
import { API_CONFIG } from '@/config/api'

export const vatsApi = {
  async getVatsList(): Promise<VatsInstanceFromAPI[]> {
    const response = await axiosInstance.get<VatsInstanceFromAPI[]>(API_CONFIG.ENDPOINTS.INSTANCES)
    return response.data
  },

  async getInstanceDetails(instanceId: number): Promise<VatsInstanceFromAPI> {
    const response = await axiosInstance.get<VatsInstanceFromAPI>(
      `${API_CONFIG.ENDPOINTS.INSTANCES}${instanceId}`
    )
    return response.data
  },

  async updateVats(id: string, updateData: AsteriskInstanceUpdate): Promise<VatsInstanceFromAPI> {
    const response = await axiosInstance.put<VatsInstanceFromAPI>(
      `${API_CONFIG.ENDPOINTS.INSTANCES}${id}`,
      updateData
    )
    return response.data
  },

  async sendCommand(instanceName: string, command: string): Promise<unknown> {
    const response = await axiosInstance.post(
      `${API_CONFIG.ENDPOINTS.INSTANCES}send_comand/${instanceName}?comand=${encodeURIComponent(command)}`
    )
    return response.data
  },

  async reloadInstance(instanceId: number): Promise<void> {
    await axiosInstance.post(`${API_CONFIG.ENDPOINTS.INSTANCES}${instanceId}/reload`)
  },

  async recreateContainer(instanceId: number): Promise<void> {
    await axiosInstance.post(
      `${API_CONFIG.ENDPOINTS.INSTANCES}${instanceId}/recreate-container`
    )
  },

  async deleteVats(id: string): Promise<void> {
    await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.INSTANCES}${id}`)
  },

  async getVatsUsers(instanceId: number): Promise<SIPUserFromAPI[]> {
    const response = await axiosInstance.get<SIPUserFromAPI[]>(
      `${API_CONFIG.ENDPOINTS.INSTANCES}${instanceId}/users/`
    )
    return response.data
  },

  async createVatsUser(instanceId: number, userData: SIPUserCreateRequest): Promise<SIPUserFromAPI> {
    const response = await axiosInstance.post<SIPUserFromAPI>(
      `${API_CONFIG.ENDPOINTS.INSTANCES}${instanceId}/users/`,
      userData
    )
    return response.data
  },

  async deleteVatsUser(instanceId: number, endpointId: string): Promise<void> {
    await axiosInstance.delete(
      `${API_CONFIG.ENDPOINTS.INSTANCES}${instanceId}/users/delete/${endpointId}`
    )
  },

  async updateVatsUser(
    instanceId: number,
    endpointId: string,
    updateData: SIPUserUpdateRequest
  ): Promise<SIPUserFromAPI> {
    const response = await axiosInstance.put<SIPUserFromAPI>(
      `${API_CONFIG.ENDPOINTS.INSTANCES}${instanceId}/users/${endpointId}`,
      updateData
    )
    return response.data
  },

  async createVatsFull(
    data: VatsCreateRequest,
    createTestUsers: boolean = false,
    config?: AxiosRequestConfig
  ): Promise<VatsInstanceFromAPI> {
    const response = await axiosInstance.post<VatsInstanceFromAPI>(
      `${API_CONFIG.ENDPOINTS.INSTANCES}?create_test_users=${createTestUsers}`,
      {
        name: data.name,
        sip_port: data.sip_port,
        http_port: data.http_port,
        ami_port: data.ami_port,
        rtp_port_start: data.rtp_port_start,
        rtp_port_end: data.rtp_port_end,
        transport_type: data.transport_type,
      },
      config
    )
    return response.data
  },
}