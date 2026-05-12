import { apiClient } from '@/shared/api/apiClient'
import { lugarToPlace } from './placesService'
import type {
  LugarResponse,
  Place,
  RestaurantBaseSearchResponse,
  SaveBaseRestaurantPayload,
} from '../types'

type SaveBaseRestaurantRequest = {
  restaurante_id: string
  grupo_id: string
  status?: string
  favorito?: boolean
  notas?: string
  adicionado_por_perfil_id?: string
}

export function searchRestaurantBase(params: {
  query: string
  categoria?: string
  bairro?: string
  max_resultados?: number
  incluir_markdown?: boolean
}) {
  const search = new URLSearchParams()
  search.set('query', params.query)
  if (params.categoria) search.set('categoria', params.categoria)
  if (params.bairro) search.set('bairro', params.bairro)
  if (params.max_resultados) search.set('max_resultados', String(params.max_resultados))
  if (params.incluir_markdown !== undefined) {
    search.set('incluir_markdown', String(params.incluir_markdown))
  }

  return apiClient.get<RestaurantBaseSearchResponse>(
    `/api/v1/restaurantes-base/buscar?${search.toString()}`,
  )
}

export async function saveBaseRestaurant(
  grupoId: string,
  payload: SaveBaseRestaurantPayload,
): Promise<Place> {
  const body: SaveBaseRestaurantRequest = {
    restaurante_id: payload.restaurante_id,
    grupo_id: grupoId,
  }
  if (payload.status) body.status = payload.status
  if (payload.is_favorite !== undefined) body.favorito = payload.is_favorite
  if (payload.notes !== undefined) body.notas = payload.notes
  if (payload.added_by_profile_id !== undefined) {
    body.adicionado_por_perfil_id = payload.added_by_profile_id
  }

  const lugar = await apiClient.post<LugarResponse, SaveBaseRestaurantRequest>(
    '/api/v1/restaurantes-base/salvar',
    body,
  )

  return lugarToPlace(lugar)
}
