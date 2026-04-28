import { apiClient } from '@/shared/api/apiClient'
import type { Grupo } from '@/features/auth/types'
import { lugarToPlace } from '@/features/places/services/placesService'
import type { LugarResponse, Place } from '@/features/places/types'

type HomeCountersRaw = Record<string, unknown>

type HomeRaw = {
  grupo?: Grupo
  group?: Grupo
  counters?: HomeCountersRaw
  contadores?: HomeCountersRaw
  top_favorites?: LugarResponse[]
  favoritos?: LugarResponse[]
  latest_places?: LugarResponse[]
  recentes?: LugarResponse[]
  ultimos?: LugarResponse[]
  want_to_go?: LugarResponse[]
  quero_ir?: LugarResponse[]
  want_to_return?: LugarResponse[]
  quero_voltar?: LugarResponse[]
}

export type HomeCounters = {
  total_places: number
  total_visited: number
  total_favorites: number
  total_want_to_go: number
  total_want_to_return: number
}

export type HomeDashboard = {
  grupo: Grupo | null
  counters: HomeCounters
  top_favorites: Place[]
  latest_places: Place[]
  want_to_go: Place[]
  want_to_return: Place[]
}

function numberFrom(raw: HomeCountersRaw | undefined, keys: string[]) {
  if (!raw) return 0
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return 0
}

function normalizeList(...lists: Array<LugarResponse[] | undefined>) {
  return (lists.find((list) => Array.isArray(list)) ?? []).map(lugarToPlace)
}

export async function fetchHome(grupoId: string, limite = 5): Promise<HomeDashboard> {
  const query = new URLSearchParams({ grupo_id: grupoId, limite: String(limite) })
  const raw = await apiClient.get<HomeRaw>(`/api/v1/home/?${query}`)
  const counters = raw.contadores ?? raw.counters

  return {
    grupo: raw.grupo ?? raw.group ?? null,
    counters: {
      total_places: numberFrom(counters, ['total_lugares', 'total_places', 'total']),
      total_visited: numberFrom(counters, ['visitados', 'total_visitados', 'total_visited']),
      total_favorites: numberFrom(counters, ['favoritos', 'total_favoritos', 'total_favorites']),
      total_want_to_go: numberFrom(counters, ['quero_ir', 'total_quero_ir', 'total_want_to_go']),
      total_want_to_return: numberFrom(counters, [
        'quero_voltar',
        'total_quero_voltar',
        'total_want_to_return',
      ]),
    },
    top_favorites: normalizeList(raw.favoritos, raw.top_favorites),
    latest_places: normalizeList(raw.recentes, raw.ultimos, raw.latest_places),
    want_to_go: normalizeList(raw.quero_ir, raw.want_to_go),
    want_to_return: normalizeList(raw.quero_voltar, raw.want_to_return),
  }
}
