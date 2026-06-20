import axiosInstance from './axiosConfig'
import type {
  ApplyTemplateRequest,
  ApplyTemplateResult,
  SyncRoutingResult,
  TemplateInfo,
} from '@/types/templates'

export const templatesApi = {
  async getCatalog(): Promise<TemplateInfo[]> {
    const response = await axiosInstance.get<TemplateInfo[]>('/templates')
    return response.data
  },

  async applyTemplate(
    instanceId: number,
    data: ApplyTemplateRequest
  ): Promise<ApplyTemplateResult> {
    const response = await axiosInstance.post<ApplyTemplateResult>(
      `/instances/${instanceId}/apply-template`,
      data
    )
    return response.data
  },

  async syncRouting(
    instanceId: number,
    reloadAsterisk = true
  ): Promise<SyncRoutingResult> {
    const response = await axiosInstance.post<SyncRoutingResult>(
      `/instances/${instanceId}/sync-routing`,
      { change_author: 'ui', reload_asterisk: reloadAsterisk }
    )
    return response.data
  },
}
