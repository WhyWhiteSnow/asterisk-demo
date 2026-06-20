import axiosInstance from './axiosConfig'
import type {
  IncomingRoute,
  IncomingRouteCreate,
  IncomingRouteUpdate,
} from '@/types/incomingRoutes'
import type { FeatureCodesSettings, FeatureCodesUpdate } from '@/types/featureCodes'

export const incomingRoutesApi = {
  async getRoutes(instanceId: number): Promise<IncomingRoute[]> {
    const response = await axiosInstance.get<IncomingRoute[]>(
      `/instances/${instanceId}/incoming-routes`
    )
    return response.data
  },

  async createRoute(instanceId: number, data: IncomingRouteCreate): Promise<IncomingRoute> {
    const response = await axiosInstance.post<IncomingRoute>(
      `/instances/${instanceId}/incoming-routes`,
      data
    )
    return response.data
  },

  async updateRoute(
    instanceId: number,
    routeId: number,
    data: IncomingRouteUpdate
  ): Promise<IncomingRoute> {
    const response = await axiosInstance.put<IncomingRoute>(
      `/instances/${instanceId}/incoming-routes/${routeId}`,
      data
    )
    return response.data
  },

  async deleteRoute(instanceId: number, routeId: number): Promise<void> {
    await axiosInstance.delete(`/instances/${instanceId}/incoming-routes/${routeId}`)
  },
}

export const featureCodesApi = {
  async getSettings(instanceId: number): Promise<FeatureCodesSettings> {
    const response = await axiosInstance.get<FeatureCodesSettings>(
      `/instances/${instanceId}/feature-codes`
    )
    return response.data
  },

  async updateSettings(
    instanceId: number,
    data: FeatureCodesUpdate
  ): Promise<FeatureCodesSettings> {
    const response = await axiosInstance.put<FeatureCodesSettings>(
      `/instances/${instanceId}/feature-codes`,
      data
    )
    return response.data
  },
}
