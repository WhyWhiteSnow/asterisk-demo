import axiosInstance from './axiosConfig'
import type {
  VoicemailBox,
  VoicemailCreate,
  VoicemailUpdate,
  VoicemailRecording,
  VoicemailUserBindingRequest,
  VoicemailUserBindingResponse,
  VoicemailUserUnbindRequest,
  VoicemailUserUnbindResponse,
} from '@/types/voicemail'

export const voicemailApi = {
  // Получить список ящиков
  async getBoxes(instanceId: number): Promise<VoicemailBox[]> {
    const response = await axiosInstance.get<VoicemailBox[]>(
      `/instances/${instanceId}/voicemail/`
    )
    return response.data
  },

  // Создать ящик
  async createBox(instanceId: number, data: VoicemailCreate): Promise<VoicemailBox> {
    const response = await axiosInstance.post<VoicemailBox>(
      `/instances/${instanceId}/voicemail/`,
      data
    )
    return response.data
  },

  // Получить ящик по номеру
  async getBox(instanceId: number, mailbox: string, context: string = 'default'): Promise<VoicemailBox> {
    const response = await axiosInstance.get<VoicemailBox>(
      `/instances/${instanceId}/voicemail/${mailbox}`,
      { params: { context } }
    )
    return response.data
  },

  // Получить ящик по ID пользователя (SIP-номер)
  async getBoxByUserId(instanceId: number, userId: string): Promise<VoicemailBox> {
    const response = await axiosInstance.get<VoicemailBox>(
      `/instances/${instanceId}/voicemail/by-user/${userId}`
    )
    return response.data
  },

  // Обновить ящик
  async updateBox(
    instanceId: number,
    mailbox: string,
    data: VoicemailUpdate,
    context: string = 'default'
  ): Promise<VoicemailBox> {
    const response = await axiosInstance.put<VoicemailBox>(
      `/instances/${instanceId}/voicemail/${mailbox}`,
      data,
      { params: { context } }
    )
    return response.data
  },

  // Удалить ящик
  async deleteBox(instanceId: number, mailbox: string, context: string = 'default'): Promise<void> {
    await axiosInstance.delete(`/instances/${instanceId}/voicemail/${mailbox}`, {
      params: { context },
    })
  },

  // Получить список записей для ящика
  async getRecordings(instanceId: number, mailbox: string): Promise<VoicemailRecording[]> {
    const response = await axiosInstance.get<VoicemailRecording[]>(
      `/instances/${instanceId}/voicemail/${mailbox}/recordings`
    )
    return response.data
  },

  // Получить URL аудиофайла записи
  async getRecordingUrl(
    instanceId: number,
    mailbox: string,
    filename: string,
    folder: string = 'INBOX',
    context: string = 'default'
  ): Promise<string> {
    // Извлекаем только имя файла (удаляем возможный путь)
    const cleanFilename = filename.split('/').pop() || filename
    const url = `/instances/${instanceId}/voicemail/${mailbox}/recordings/file/${cleanFilename}?folder=${folder}&context=${context}`
    // Для воспроизведения через blob лучше вернуть полный URL с базовым адресом
    return `${axiosInstance.defaults.baseURL}${url}`
  },

  // Привязать пользователя к ящику
  async bindUser(
    instanceId: number,
    data: VoicemailUserBindingRequest
  ): Promise<VoicemailUserBindingResponse> {
    const response = await axiosInstance.post<VoicemailUserBindingResponse>(
      `/instances/${instanceId}/voicemail/bind-user`,
      data
    )
    return response.data
  },

  // Отвязать пользователя от ящика
  async unbindUser(
    instanceId: number,
    data: VoicemailUserUnbindRequest
  ): Promise<VoicemailUserUnbindResponse> {
    const response = await axiosInstance.post<VoicemailUserUnbindResponse>(
      `/instances/${instanceId}/voicemail/unbind-user`,
      data
    )
    return response.data
  },
}