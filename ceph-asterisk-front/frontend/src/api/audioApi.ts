import axiosInstance from './axiosConfig'
import type { AudioFileSchema } from '@/types/audio'

export const audioApi = {
  // Получить список аудиофайлов
  async getFiles(): Promise<AudioFileSchema[]> {
    const response = await axiosInstance.get<AudioFileSchema[]>('/audio_files/get_files')
    return response.data
  },

  async getFileBlob(fileId: number): Promise<string> {
    const response = await axiosInstance.get(`/audio_files/get_file/${fileId}`, {
      responseType: 'blob',
    })
    return URL.createObjectURL(response.data)
  },

  // Загрузить аудиофайл
  async uploadFile(file: File): Promise<AudioFileSchema> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await axiosInstance.post<AudioFileSchema>('/audio_files/upload_audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Удалить файл по id
  async deleteFile(fileId: number): Promise<void> {
    await axiosInstance.delete(`/audio_files/delete_file/${fileId}`)
  },
}