import type { PlaceStatus } from '@/features/places/types'

export type ChatRole = 'assistant' | 'user'

export interface ChatHistoryMessage {
  content: string
  role: ChatRole
}

export interface ChatRequest {
  history?: ChatHistoryMessage[]
  message: string
}

export type RecommendationLocation = {
  latitude?: number
  longitude?: number
  cidade?: string
  bairro?: string
  raio_metros?: number
}

export type RecommendRequest = {
  grupo_id: string
  mensagem: string
  perfil_id?: string
  localizacao?: RecommendationLocation
  permitir_google?: boolean
  max_resultados?: number
  max_candidatos_internos?: number
  max_candidatos_google?: number
}

export type RecommendationOrigin = 'comidinhas' | 'google'

export type RecommendedRestaurant = {
  candidato_id: string
  origem: RecommendationOrigin
  lugar_id: string | null
  google_place_id: string | null
  nome: string
  categoria: string | null
  bairro: string | null
  cidade: string | null
  endereco: string | null
  faixa_preco: number | null
  rating: number | null
  user_rating_count: number | null
  status: PlaceStatus | null
  favorito: boolean
  ja_fomos: boolean
  novo_no_app: boolean
  aberto_agora: boolean | null
  imagem_capa: string | null
  fotos?: unknown[]
  link: string | null
  google_maps_uri: string | null
  website_uri: string | null
  telefone: string | null
}

export type RestaurantRecommendation = {
  restaurante: RecommendedRestaurant
  motivo: string
  pontos_fortes: string[]
  ressalvas: string[]
  confianca: number | null
}

export type RecommendResponseState = 'opcoes' | 'precisa_refinar' | 'fora_escopo'

export type RecommendResponse = {
  grupo_id: string
  estado: RecommendResponseState
  mensagem: string
  resumo?: string | null
  pergunta_refinamento?: string | null
  opcoes?: RestaurantRecommendation[]
  total_candidatos?: number
  fontes_usadas?: string[]
  modelo?: string
  provider?: string
}

export interface ChatResponse {
  model?: string
  provider?: string
  reply: string
  estado: RecommendResponseState
  recommendations: RestaurantRecommendation[]
}

export interface ChatConversationMessage extends ChatHistoryMessage {
  id: string
  metadata?: Pick<ChatResponse, 'model' | 'provider'>
  recommendations?: RestaurantRecommendation[]
}
