import axiosInstance from './axiosConfig'
import type {
  ExtensionForwardingListResponse,
  ExtensionForwardingUpdate,
  ForwardingRuleResponse,
} from '@/types/forwarding'

export const forwardingApi = {
  async getForwarding(
    instanceId: number,
    extension: string
  ): Promise<ExtensionForwardingListResponse> {
    const response = await axiosInstance.get<ExtensionForwardingListResponse>(
      `/instances/${instanceId}/users/${encodeURIComponent(extension)}/forwarding`
    )
    return response.data
  },

  async updateForwarding(
    instanceId: number,
    extension: string,
    data: ExtensionForwardingUpdate
  ): Promise<ForwardingRuleResponse[]> {
    const response = await axiosInstance.put<ForwardingRuleResponse[]>(
      `/instances/${instanceId}/users/${encodeURIComponent(extension)}/forwarding`,
      data
    )
    return response.data
  },
}
