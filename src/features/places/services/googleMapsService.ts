import { apiClient } from '@/shared/api/apiClient'
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

  const lugar = await apiClient.post<LugarResponse, SaveFromGoogleRequest>(
    '/api/v1/google-maps/places/save',
    body,
  )
  return lugarToPlace(lugar)
}
