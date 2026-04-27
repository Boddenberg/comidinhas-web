import { apiClient } from '@/shared/api/apiClient'
import type {
  CreatePlacePayload,
  LugarResponse,
  Place,
  PlaceListParams,
  PlaceListResponse,
  UpdatePlacePayload,
} from '../types'

type LugarListResponse = {
  items: LugarResponse[]
  pagina: number
  tamanho_pagina: number
  total: number
  tem_mais: boolean
}

const SORT_BY_MAP: Record<NonNullable<PlaceListParams['sort_by']>, string> = {
  created_at: 'criado_em',
  updated_at: 'atualizado_em',
  name: 'nome',
}

export function lugarToPlace(lugar: LugarResponse): Place {
  return {
    id: lugar.id,
    group_id: lugar.grupo_id,
    name: lugar.nome,
    category: lugar.categoria,
    neighborhood: lugar.bairro,
    city: lugar.cidade,
    price_range: lugar.faixa_preco,
    link: lugar.link,
    notes: lugar.notas,
    status: lugar.status,
    is_favorite: lugar.favorito,
    image_url: lugar.imagem_capa,
    rating: typeof lugar.extra?.rating === 'number' ? (lugar.extra.rating as number) : null,
    added_by: lugar.adicionado_por,
    created_at: lugar.criado_em,
    updated_at: lugar.atualizado_em,
    photos: lugar.fotos ?? [],
  }
}

function placePayloadToLugar(grupoId: string, payload: CreatePlacePayload) {
  const out: Record<string, unknown> = { grupo_id: grupoId, nome: payload.name }
  if (payload.category !== undefined) out.categoria = payload.category
  if (payload.neighborhood !== undefined) out.bairro = payload.neighborhood
  if (payload.city !== undefined) out.cidade = payload.city
  if (payload.price_range !== undefined) out.faixa_preco = payload.price_range
  if (payload.link !== undefined) out.link = payload.link
  if (payload.notes !== undefined) out.notas = payload.notes
  if (payload.status !== undefined) out.status = payload.status
  if (payload.is_favorite !== undefined) out.favorito = payload.is_favorite
  if (payload.added_by !== undefined) out.adicionado_por = payload.added_by
  return out
}

function updatePayloadToLugar(payload: UpdatePlacePayload) {
  const out: Record<string, unknown> = {}
  if (payload.name !== undefined) out.nome = payload.name
  if (payload.category !== undefined) out.categoria = payload.category
  if (payload.neighborhood !== undefined) out.bairro = payload.neighborhood
  if (payload.city !== undefined) out.cidade = payload.city
  if (payload.price_range !== undefined) out.faixa_preco = payload.price_range
  if (payload.link !== undefined) out.link = payload.link
  if (payload.notes !== undefined) out.notas = payload.notes
  if (payload.status !== undefined) out.status = payload.status
  if (payload.is_favorite !== undefined) out.favorito = payload.is_favorite
  if (payload.added_by !== undefined) out.adicionado_por = payload.added_by
  return out
}

function buildQuery(grupoId: string, params: PlaceListParams) {
  const search = new URLSearchParams()
  search.set('grupo_id', grupoId)
  if (params.page !== undefined) search.set('pagina', String(params.page))
  if (params.page_size !== undefined) search.set('tamanho_pagina', String(params.page_size))
  if (params.search) search.set('busca', params.search)
  if (params.category) search.set('categoria', params.category)
  if (params.neighborhood) search.set('bairro', params.neighborhood)
  if (params.status) search.set('status', params.status)
  if (params.is_favorite !== undefined) search.set('favorito', String(params.is_favorite))
  if (params.sort_by) search.set('ordenar_por', SORT_BY_MAP[params.sort_by])
  if (params.sort_order) search.set('direcao', params.sort_order)
  return search.toString()
}

export async function listPlaces(
  grupoId: string,
  params: PlaceListParams = {},
): Promise<PlaceListResponse> {
  const query = buildQuery(grupoId, params)
  const result = await apiClient.get<LugarListResponse>(`/api/v1/lugares/?${query}`)
  return {
    items: result.items.map(lugarToPlace),
    page: result.pagina,
    page_size: result.tamanho_pagina,
    total: result.total,
    has_more: result.tem_mais,
  }
}

export async function getPlace(id: string): Promise<Place> {
  const lugar = await apiClient.get<LugarResponse>(`/api/v1/lugares/${id}`)
  return lugarToPlace(lugar)
}

export async function createPlace(
  grupoId: string,
  payload: CreatePlacePayload,
): Promise<Place> {
  const lugar = await apiClient.post<LugarResponse, Record<string, unknown>>(
    '/api/v1/lugares/',
    placePayloadToLugar(grupoId, payload),
  )
  return lugarToPlace(lugar)
}

export async function updatePlace(id: string, payload: UpdatePlacePayload): Promise<Place> {
  const lugar = await apiClient.patch<LugarResponse, Record<string, unknown>>(
    `/api/v1/lugares/${id}`,
    updatePayloadToLugar(payload),
  )
  return lugarToPlace(lugar)
}

export function deletePlace(id: string) {
  return apiClient.delete<void>(`/api/v1/lugares/${id}`)
}
