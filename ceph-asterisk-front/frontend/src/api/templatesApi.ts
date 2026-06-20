import axiosInstance from './axiosConfig'
import type {
  ApplyTemplateRequest,
  ApplyTemplateResult,
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
}
