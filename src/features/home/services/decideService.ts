import { apiClient } from '@/shared/api/apiClient'
import type { ChatRequest, ChatResponse } from '@/features/chat/types'

const SYSTEM_PROMPT = `Voce e a IA do app Comidinhas. Ajude o casal Filipe e Victor a decidir onde comer hoje.
Considere o orcamento, o clima, o dia da semana, a localizacao e a vontade informados.
Responda de forma curta e objetiva (no maximo 5 frases), sugerindo um tipo de cozinha,
um exemplo de prato e o porque dessa escolha. Use um tom acolhedor, em portugues do Brasil.`

type DecideContext = {
  budget: string
  weather: string
  dayOfWeek: string
  location: string
  mood: string
}

export function buildDecidePrompt({ budget, weather, dayOfWeek, location, mood }: DecideContext) {
  return [
    'Bora decidir onde comer hoje?',
    `Orcamento: ${budget}.`,
    `Clima: ${weather}.`,
    `Dia da semana: ${dayOfWeek}.`,
    `Localizacao: ${location}.`,
    `Vontade: ${mood}.`,
    'Sugira um lugar / tipo de comida que combine com esse contexto.',
  ].join(' ')
}

export function decideWhereToEat(context: DecideContext) {
  const payload: ChatRequest = {
    message: buildDecidePrompt(context),
    system_prompt: SYSTEM_PROMPT,
  }

  return apiClient.post<ChatResponse, ChatRequest>('/api/v1/chat', payload)
}
