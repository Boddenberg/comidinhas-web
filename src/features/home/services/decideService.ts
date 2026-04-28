import { apiClient } from '@/shared/api/apiClient'
import type { LugarResponse } from '@/features/places/types'

export type DecideScope = 'todos' | 'favoritos' | 'quero_ir' | 'guia'

export type DecideCriteria = Partial<{
  dia_semana: string
  clima: string
  mood: string
  ocasiao: string
  orcamento_max: 1 | 2 | 3 | 4
  orcamento_texto: string
  quantidade_pessoas: number
  preferencias: string[]
  restricoes: string[]
  observacoes: string
  priorizar_novidade: boolean
  surpreender: boolean
}>

export type DecideRestaurantRequest = {
  grupo_id: string
  escopo: DecideScope
  guia_id?: string
  criterios?: DecideCriteria
  evitar_lugar_ids?: string[]
  max_candidatos?: number
}

export type DecidedLugar = Partial<LugarResponse> & {
  id: string
  nome?: string | null
  name?: string | null
}

export type DecideRestaurantOption = {
  lugar: DecidedLugar
  motivo: string
  pontos_fortes?: string[]
  ressalvas?: string[]
  confianca?: number
}

export type DecideRestaurantResponse = {
  grupo_id: string
  escopo: DecideScope
  guia_id: string | null
  escolha: DecideRestaurantOption
  alternativas?: DecideRestaurantOption[]
  total_candidatos: number
  criterios_usados?: Record<string, unknown>
  modelo: string
  provider: string
}

type DecideContext = {
  budget: string
  budgetLevel?: 1 | 2 | 3 | 4
  weather: string
  dayOfWeek: string
  location: string
  mood: string
}

export function getDecidedLugarName(lugar: DecidedLugar) {
  return lugar.nome ?? lugar.name ?? 'Restaurante escolhido'
}

export function formatDecisionReply(response: DecideRestaurantResponse) {
  const choice = response.escolha
  const lines = [
    `Eu escolheria ${getDecidedLugarName(choice.lugar)}.`,
    choice.motivo,
  ]

  if (choice.pontos_fortes && choice.pontos_fortes.length > 0) {
    lines.push(`Pontos fortes: ${choice.pontos_fortes.join(', ')}.`)
  }

  if (choice.ressalvas && choice.ressalvas.length > 0) {
    lines.push(`Ressalvas: ${choice.ressalvas.join(', ')}.`)
  }

  return lines.filter(Boolean).join('\n')
}

export function decideRestaurant(payload: DecideRestaurantRequest) {
  return apiClient.post<DecideRestaurantResponse, DecideRestaurantRequest>(
    '/api/v1/ia/decidir-restaurante',
    payload,
  )
}

export function decideWhereToEat(
  grupoId: string,
  context: DecideContext,
  evitarLugarIds: string[] = [],
) {
  return decideRestaurant({
    grupo_id: grupoId,
    escopo: 'todos',
    criterios: {
      clima: context.weather,
      dia_semana: context.dayOfWeek,
      mood: context.mood,
      observacoes: `Localizacao: ${context.location}.`,
      orcamento_max: context.budgetLevel,
      orcamento_texto: context.budget,
      quantidade_pessoas: 2,
      surpreender: true,
    },
    evitar_lugar_ids: evitarLugarIds.length > 0 ? evitarLugarIds : undefined,
    max_candidatos: 80,
  })
}
