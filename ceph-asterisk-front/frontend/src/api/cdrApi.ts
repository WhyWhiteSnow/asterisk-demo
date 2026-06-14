import axiosInstance from './axiosConfig'
import { API_CONFIG } from '@/config/api'
import type { CDRRecord, CDRResponse } from '@/types/cdr'

export const cdrApi = {
   async getCDR(params?: {
    limit?: number
    offset?: number
    instance_name?: string
    src?: string
    dst?: string
    date_from?: string
    date_to?: string
  }): Promise<CDRResponse> {
    const response = await axiosInstance.get<CDRResponse>(API_CONFIG.ENDPOINTS.CDR, { params })
    return response.data
  },

  async exportCDR(filters?: {
    searchQuery: string
    status: string
    date: string
  }) {
    const response = await axiosInstance.post(`${API_CONFIG.ENDPOINTS.CDR}/export`, {
      filters,
    })
    return response.data
  },
}