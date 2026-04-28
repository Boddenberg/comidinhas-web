import { apiClient } from '@/shared/api/apiClient'
import { lugarToPlace } from '@/features/places/services/placesService'
import type { LugarResponse, Place } from '@/features/places/types'

export type Guia = {
  id: string
  grupo_id: string
  nome: string
  descricao: string | null
  lugar_ids: string[]
  lugares: Place[]
  total_lugares: number
  criado_em?: string | null
  atualizado_em?: string | null
}

type GuiaRaw = {
  id: string
  grupo_id?: string
  group_id?: string
  nome?: string
  name?: string
  descricao?: string | null
  description?: string | null
  lugar_ids?: string[]
  place_ids?: string[]
  lugares?: LugarResponse[]
  places?: LugarResponse[]
  total_lugares?: number
  quantidade_lugares?: number
  total_places?: number
  criado_em?: string | null
  atualizado_em?: string | null
}

type GuiaListResponse =
  | {
      items?: GuiaRaw[]
      guias?: GuiaRaw[]
      total?: number
    }
  | GuiaRaw[]

export type CreateGuiaPayload = {
  grupo_id: string
  nome: string
  descricao?: string
  lugar_ids?: string[]
}

function normalizeGuia(raw: GuiaRaw): Guia {
  const lugaresRaw = raw.lugares ?? raw.places ?? []
  const lugarIds = raw.lugar_ids ?? raw.place_ids ?? lugaresRaw.map((lugar) => lugar.id)

  return {
    id: raw.id,
    grupo_id: raw.grupo_id ?? raw.group_id ?? '',
    nome: raw.nome ?? raw.name ?? 'Guia sem nome',
    descricao: raw.descricao ?? raw.description ?? null,
    lugar_ids: lugarIds,
    lugares: lugaresRaw.map(lugarToPlace),
    total_lugares:
      raw.total_lugares ??
      raw.quantidade_lugares ??
      raw.total_places ??
      lugaresRaw.length ??
      lugarIds.length,
    criado_em: raw.criado_em ?? null,
    atualizado_em: raw.atualizado_em ?? null,
  }
}

function normalizeGuiaList(response: GuiaListResponse) {
  const items = Array.isArray(response) ? response : response.items ?? response.guias ?? []
  return items.map(normalizeGuia)
}

export async function listGuias(grupoId: string) {
  const query = new URLSearchParams({ grupo_id: grupoId })
  const response = await apiClient.get<GuiaListResponse>(`/api/v1/guias/?${query}`)
  return normalizeGuiaList(response)
}

export async function createGuia(payload: CreateGuiaPayload) {
  const guia = await apiClient.post<GuiaRaw, CreateGuiaPayload>('/api/v1/guias/', payload)
  return normalizeGuia(guia)
}

export async function addLugarToGuia(guiaId: string, lugarId: string) {
  const guia = await apiClient.post<GuiaRaw, { lugar_id: string }>(
    `/api/v1/guias/${guiaId}/lugares`,
    { lugar_id: lugarId },
  )
  return normalizeGuia(guia)
}

export async function reorderGuiaLugares(guiaId: string, lugarIds: string[]) {
  const guia = await apiClient.patch<GuiaRaw, { lugar_ids: string[] }>(
    `/api/v1/guias/${guiaId}/lugares/reordenar`,
    { lugar_ids: lugarIds },
  )
  return normalizeGuia(guia)
}

export function removeLugarFromGuia(guiaId: string, lugarId: string) {
  return apiClient.delete<void>(`/api/v1/guias/${guiaId}/lugares/${lugarId}`)
}

export function deleteGuia(guiaId: string) {
  return apiClient.delete<void>(`/api/v1/guias/${guiaId}`)
}
