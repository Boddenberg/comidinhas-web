import { apiClient } from '@/shared/api/apiClient'
import type {
  ChatRequest,
  RecommendRequest,
  RecommendResponse,
  RecommendationLocation,
  RestaurantRecommendation,
} from '../types'

function buildConversationMessage(payload: ChatRequest) {
  const previousUserMessages =
    payload.history
      ?.filter((message) => message.role === 'user')
      .slice(-2)
      .map((message) => message.content)
      .join(' | ') ?? ''

  if (!previousUserMessages) {
    return payload.message
  }

  return `Pedido anterior: ${previousUserMessages}. Resposta do usuario: ${payload.message}`
}

function buildReply(response: RecommendResponse) {
  if (response.estado === 'opcoes') {
    return response.resumo ?? 'Encontrei algumas opcoes para esse pedido.'
  }

  return (
    response.pergunta_refinamento ??
    response.resumo ??
    'Me conta um pouco mais do que voces estao buscando.'
  )
}

function normalizeRecommendations(response: RecommendResponse): RestaurantRecommendation[] {
  return (response.opcoes ?? []).map((option) => ({
    restaurante: option.restaurante,
    motivo: option.motivo,
    pontos_fortes: option.pontos_fortes ?? [],
    ressalvas: option.ressalvas ?? [],
    confianca: option.confianca ?? null,
  }))
}

export async function recommendRestaurants(payload: RecommendRequest) {
  return apiClient.post<RecommendResponse, RecommendRequest>(
    '/api/v1/ia/recomendar-restaurantes',
    payload,
  )
}

export async function sendChatMessage(
  grupoId: string,
  payload: ChatRequest,
  options: {
    perfilId?: string
    localizacao?: RecommendationLocation
    permitirGoogle?: boolean
  } = {},
) {
  const response = await recommendRestaurants({
    grupo_id: grupoId,
    mensagem: buildConversationMessage(payload),
    perfil_id: options.perfilId,
    localizacao: options.localizacao,
    permitir_google: options.permitirGoogle ?? true,
    max_resultados: 6,
    max_candidatos_internos: 80,
    max_candidatos_google: 10,
  })

  return {
    estado: response.estado,
    model: response.modelo,
    provider: response.provider,
    recommendations: normalizeRecommendations(response),
    reply: buildReply(response),
  }
}
