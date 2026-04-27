import { apiClient } from '@/shared/api/apiClient'
import type {
  CreatePlacePayload,
  Place,
  PlaceListParams,
  PlaceListResponse,
  UpdatePlacePayload,
} from '../types'

function buildQuery(params: PlaceListParams) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function listPlaces(params: PlaceListParams = {}) {
  return apiClient.get<PlaceListResponse>(`/api/v1/places/${buildQuery(params)}`)
}

export function getPlace(id: string) {
  return apiClient.get<Place>(`/api/v1/places/${id}`)
}

export function createPlace(payload: CreatePlacePayload) {
  return apiClient.post<Place, CreatePlacePayload>('/api/v1/places/', payload)
}

export function updatePlace(id: string, payload: UpdatePlacePayload) {
  return apiClient.patch<Place, UpdatePlacePayload>(`/api/v1/places/${id}`, payload)
}

export function deletePlace(id: string) {
  return apiClient.delete<void>(`/api/v1/places/${id}`)
}
