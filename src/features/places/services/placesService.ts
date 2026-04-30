import { apiClient } from '@/shared/api/apiClient'
import type {
  CreatePlacePayload,
  LugarFotoResponse,
  LugarResponse,
  Place,
  PlaceListParams,
  PlaceListResponse,
  PlacePhoto,
  PlaceStatus,
  UpdatePlacePayload,
} from '../types'

type LugarListResponse =
  | {
      items?: LugarResponse[]
      lugares?: LugarResponse[]
      pagina?: number
      page?: number
      tamanho_pagina?: number
      page_size?: number
      total?: number
      tem_mais?: boolean
      has_more?: boolean
    }
  | LugarResponse[]

const SORT_BY_MAP: Record<NonNullable<PlaceListParams['sort_by']>, string> = {
  created_at: 'criado_em',
  updated_at: 'atualizado_em',
  name: 'nome',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringOrNull(...values: unknown[]) {
  const value = values.find((item) => typeof item === 'string' && item.length > 0)
  return typeof value === 'string' ? value : null
}

function numberOrNull(...values: unknown[]) {
  const value = values.find((item) => typeof item === 'number' && Number.isFinite(item))
  return typeof value === 'number' ? value : null
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function statusValue(value: unknown): PlaceStatus {
  return value === 'fomos' ||
    value === 'quero_voltar' ||
    value === 'nao_curti' ||
    value === 'quero_ir'
    ? value
    : 'quero_ir'
}

export function normalizePlacePhoto(photo: LugarFotoResponse | PlacePhoto): PlacePhoto {
  const raw = photo as Record<string, unknown>
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    url: stringOrNull(raw.url, raw.public_url, raw.foto_url) ?? '',
    caminho: stringOrNull(raw.caminho, raw.storage_path),
    ordem: numberOrNull(raw.ordem, raw.sort_order) ?? 0,
    capa: booleanValue(raw.capa, booleanValue(raw.is_cover)),
  }
}

export function lugarToPlace(lugar: LugarResponse | Record<string, unknown>): Place {
  const raw = lugar as Record<string, unknown>
  const extra = isRecord(raw.extra) ? raw.extra : {}
  const photos = Array.isArray(raw.fotos)
    ? raw.fotos
    : Array.isArray(raw.photos)
      ? raw.photos
      : []
  const normalizedPhotos = photos.map((photo) =>
    normalizePlacePhoto(photo as LugarFotoResponse | PlacePhoto),
  )
  const coverPhotoUrl = normalizedPhotos.find((photo) => photo.capa)?.url

  return {
    id: String(raw.id),
    group_id: stringOrNull(raw.grupo_id, raw.group_id) ?? '',
    name: stringOrNull(raw.nome, raw.name) ?? 'Restaurante sem nome',
    category: stringOrNull(raw.categoria, raw.category),
    neighborhood: stringOrNull(raw.bairro, raw.neighborhood),
    city: stringOrNull(raw.cidade, raw.city),
    price_range: numberOrNull(raw.faixa_preco, raw.price_range),
    link: stringOrNull(raw.link, raw.google_maps_uri),
    notes: stringOrNull(raw.notas, raw.notes),
    status: statusValue(raw.status),
    is_favorite: booleanValue(raw.favorito, booleanValue(raw.is_favorite)),
    image_url: coverPhotoUrl ?? stringOrNull(raw.imagem_capa, raw.image_url, raw.photo_uri),
    rating: numberOrNull(raw.rating, extra.rating),
    user_rating_count: numberOrNull(raw.user_rating_count, extra.user_rating_count),
    added_by: stringOrNull(raw.adicionado_por, raw.added_by),
    created_at: stringOrNull(raw.criado_em, raw.created_at),
    updated_at: stringOrNull(raw.atualizado_em, raw.updated_at),
    photos: normalizedPhotos,
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
  if (payload.added_by_profile_id !== undefined) {
    out.adicionado_por_perfil_id = payload.added_by_profile_id
  }
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
  if (payload.added_by_profile_id !== undefined) {
    out.adicionado_por_perfil_id = payload.added_by_profile_id
  }
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
  if (params.price_range !== undefined) search.set('faixa_preco', String(params.price_range))
  if (params.price_range_min !== undefined) {
    search.set('faixa_preco_min', String(params.price_range_min))
  }
  if (params.price_range_max !== undefined) {
    search.set('faixa_preco_max', String(params.price_range_max))
  }
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
  const items = Array.isArray(result) ? result : result.items ?? result.lugares ?? []

  return {
    items: items.map(lugarToPlace),
    page: Array.isArray(result) ? params.page ?? 1 : result.pagina ?? result.page ?? 1,
    page_size: Array.isArray(result)
      ? params.page_size ?? items.length
      : result.tamanho_pagina ?? result.page_size ?? items.length,
    total: Array.isArray(result) ? items.length : result.total ?? items.length,
    has_more: Array.isArray(result) ? false : result.tem_mais ?? result.has_more ?? false,
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

export async function uploadPlacePhoto(
  lugarId: string,
  file: File,
  definirComoCapa = false,
) {
  const body = new FormData()
  body.append('file', file)
  const foto = await apiClient.post<LugarFotoResponse, FormData>(
    `/api/v1/lugares/${lugarId}/fotos?definir_como_capa=${String(definirComoCapa)}`,
    body,
  )
  return normalizePlacePhoto(foto)
}

export async function setPlacePhotoCover(lugarId: string, fotoId: string) {
  const foto = await apiClient.request<LugarFotoResponse>(
    `/api/v1/lugares/${lugarId}/fotos/${fotoId}/capa`,
    { method: 'PATCH' },
  )
  return normalizePlacePhoto(foto)
}

export async function reorderPlacePhotos(lugarId: string, fotoIds: string[]) {
  const fotos = await apiClient.patch<LugarFotoResponse[], Record<string, string[]>>(
    `/api/v1/lugares/${lugarId}/fotos/reordenar`,
    { foto_ids: fotoIds, photo_ids: fotoIds },
  )
  return fotos.map(normalizePlacePhoto)
}

export function deletePlacePhoto(lugarId: string, fotoId: string) {
  return apiClient.delete<void>(`/api/v1/lugares/${lugarId}/fotos/${fotoId}`)
}
