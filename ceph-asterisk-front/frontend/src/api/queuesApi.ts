import axiosInstance from './axiosConfig'
import type { QueueResponse, QueueCreate, QueueUpdate } from '@/types/queues'

export const queuesApi = {
  // Получить список очередей для инстанса
  async getQueues(instanceId: number): Promise<QueueResponse[]> {
    const response = await axiosInstance.get<QueueResponse[]>(
      `/instances/${instanceId}/queues/`
    )
    return response.data
  },

  // Создать очередь
  async createQueue(instanceId: number, data: QueueCreate): Promise<QueueResponse> {
    const response = await axiosInstance.post<QueueResponse>(
      `/instances/${instanceId}/queues/`,
      data
    )
    return response.data
  },

  // Получить детали очереди
  async getQueue(instanceId: number, queueName: string): Promise<QueueResponse> {
    const response = await axiosInstance.get<QueueResponse>(
      `/instances/${instanceId}/queues/${encodeURIComponent(queueName)}`
    )
    return response.data
  },

  // Обновить очередь
  async updateQueue(instanceId: number, queueName: string, data: QueueUpdate): Promise<QueueResponse> {
    const response = await axiosInstance.put<QueueResponse>(
      `/instances/${instanceId}/queues/${encodeURIComponent(queueName)}`,
      data
    )
    return response.data
  },

  // Удалить очередь (если эндпоинт есть, в спецификации DELETE описан)
  async deleteQueue(instanceId: number, queueName: string): Promise<void> {
    await axiosInstance.delete(`/instances/${instanceId}/queues/${encodeURIComponent(queueName)}`)
  },
}