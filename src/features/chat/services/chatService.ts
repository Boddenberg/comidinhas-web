import { apiClient } from '@/shared/api/apiClient'
import type { ChatRequest, ChatResponse } from '../types'

export function sendChatMessage(payload: ChatRequest) {
  return apiClient.post<ChatResponse, ChatRequest>('/api/v1/chat', payload)
}
