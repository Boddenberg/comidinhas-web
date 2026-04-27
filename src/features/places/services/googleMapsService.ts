import { apiClient } from '@/shared/api/apiClient'
import type {
  GoogleAutocompleteRequest,
  GoogleAutocompleteResponse,
  GooglePlaceDetail,
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

export function saveGooglePlace(payload: SaveGooglePlacePayload) {
  return apiClient.post<Place, SaveGooglePlacePayload>(
    '/api/v1/google-maps/places/save',
    payload,
  )
}
