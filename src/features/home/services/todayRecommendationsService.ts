import { apiClient } from '@/shared/api/apiClient'
import type { Place } from '@/features/places/types'

type TodayRecommendationRaw = Place & {
  formatted_address?: string | null
  google_place_id?: string | null
  recommendation_reason?: string | null
}

export type TodayRecommendation = Place & {
  formatted_address?: string | null
  google_place_id?: string | null
  recommendation_reason?: string | null
}

export type TodayRecommendationsRequest = {
  grupo_id: string
  perfil_id?: string
  latitude: number
  longitude: number
  limit?: number
  mood?: string
  radius_meters?: number
  weather?: string
}

type TodayRecommendationsResponse = {
  generated_at: string
  places: TodayRecommendationRaw[]
}

export async function fetchTodayRecommendations(
  payload: TodayRecommendationsRequest,
): Promise<TodayRecommendation[]> {
  const response = await apiClient.post<
    TodayRecommendationsResponse,
    TodayRecommendationsRequest
  >('/api/v1/recommendations/today', payload)

  return response.places
}
