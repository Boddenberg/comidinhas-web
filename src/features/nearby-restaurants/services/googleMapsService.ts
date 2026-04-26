import { apiClient } from '@/shared/api/apiClient'
import type { NearbyRestaurantsRequest, NearbyRestaurantsResponse } from '../types'

export function searchNearbyRestaurants(payload: NearbyRestaurantsRequest) {
  return apiClient.post<NearbyRestaurantsResponse, NearbyRestaurantsRequest>(
    '/api/v1/google-maps/restaurants/nearby',
    payload,
  )
}
