import { ApiError, apiClient } from '@/shared/api/apiClient'
import { lugarToPlace } from './placesService'
import type {
  GoogleAutocompleteRequest,
  GoogleAutocompleteResponse,
  GooglePlaceDetail,
  LugarResponse,
  Place,
  SaveGooglePlacePayload,
} from '../types'

export function autocompletePlaces(payload: GoogleAutocompleteRequest) {
  return apiClient.post<GoogleAutocompleteResponse, GoogleAutocompleteRequest>(
    '/api/v1/google-maps/places/autocomplete',
    payload,
  )
}

export function getGooglePlaceDetails(placeId: string) {
  return apiClient.get<GooglePlaceDetail>(
    `/api/v1/google-maps/places/${encodeURIComponent(placeId)}`,
  )
}

type SaveFromGoogleRequest = {
  place_id: string
  grupo_id: string
  status?: string
  favorito?: boolean
  notas?: string
  adicionado_por?: string
  foto_capa_url?: string
  fotos_urls?: string[]
}

export async function saveGooglePlace(
  grupoId: string,
  payload: SaveGooglePlacePayload,
): Promise<Place> {
  const body: SaveFromGoogleRequest = {
    place_id: payload.place_id,
    grupo_id: grupoId,
  }
  if (payload.status) body.status = payload.status
  if (payload.is_favorite !== undefined) body.favorito = payload.is_favorite
  if (payload.notes !== undefined) body.notas = payload.notes
  if (payload.added_by !== undefined) body.adicionado_por = payload.added_by
  if (payload.cover_photo_uri !== undefined) body.foto_capa_url = payload.cover_photo_uri
  if (payload.photo_uris !== undefined) body.fotos_urls = payload.photo_uris

  let lugar: LugarResponse
  try {
    lugar = await apiClient.post<LugarResponse, SaveFromGoogleRequest>(
      '/api/v1/google-maps/places/save',
      body,
    )
  } catch (error) {
    const canRetryWithoutPhotoFields =
      error instanceof ApiError &&
      (error.status === 400 || error.status === 422) &&
      (body.foto_capa_url !== undefined || body.fotos_urls !== undefined)

    if (!canRetryWithoutPhotoFields) {
      throw error
    }

    const fallbackBody: SaveFromGoogleRequest = {
      place_id: body.place_id,
      grupo_id: body.grupo_id,
      status: body.status,
      favorito: body.favorito,
      notas: body.notas,
      adicionado_por: body.adicionado_por,
    }
    lugar = await apiClient.post<LugarResponse, SaveFromGoogleRequest>(
      '/api/v1/google-maps/places/save',
      fallbackBody,
    )
  }

  return lugarToPlace(lugar)
}
