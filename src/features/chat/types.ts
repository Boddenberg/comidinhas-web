export type ChatRole = 'assistant' | 'user'

export interface ChatHistoryMessage {
  content: string
  role: ChatRole
}

export interface ChatRequest {
  history?: ChatHistoryMessage[]
  message: string
  system_prompt?: string
}

export interface ChatResponse {
  model: string
  provider: string
  reply: string
}

export interface ChatConversationMessage extends ChatHistoryMessage {
  id: string
  metadata?: Pick<ChatResponse, 'model' | 'provider'>
}
