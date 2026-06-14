import axiosInstance from './axiosConfig'
import type { VoicemailBox } from '@/types/voicemail'

/** Ящик по SIP-пользователю; 404 — пользователь не привязан (без ошибки в консоли). */
export async function getVoicemailBoxByUserId(
  instanceId: number,
  userId: string,
): Promise<VoicemailBox | null> {
  const response = await axiosInstance.get<VoicemailBox>(
    `/instances/${instanceId}/voicemail/by-user/${userId}`,
    { validateStatus: (status) => status === 200 || status === 404 },
  )
  if (response.status === 404) return null
  return response.data
}
