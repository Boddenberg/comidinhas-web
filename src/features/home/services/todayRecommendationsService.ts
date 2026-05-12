import { searchRestaurantBase } from '@/features/places/services/restaurantBaseService'
import type { Place, RestaurantBaseItem } from '@/features/places/types'

export type TodayRecommendation = Place & {
  base_restaurante_id?: string | null
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

function baseRestaurantToRecommendation(
  restaurant: RestaurantBaseItem,
  grupoId: string,
): TodayRecommendation {
  return {
    id: restaurant.id,
    group_id: grupoId,
    name: restaurant.nome,
    category: restaurant.tipo ?? restaurant.categoria,
    neighborhood: restaurant.bairro,
    city: restaurant.cidade,
    price_range: null,
    link: null,
    notes: restaurant.descricao,
    status: 'quero_ir',
    is_favorite: false,
    image_url: null,
    rating: null,
    user_rating_count: null,
    added_by: null,
    created_at: null,
    updated_at: null,
    photos: [],
    base_restaurante_id: restaurant.id,
    formatted_address: restaurant.endereco,
    google_place_id: null,
    recommendation_reason: restaurant.descricao ?? restaurant.distincao ?? null,
  }
}

export async function fetchTodayRecommendations(
  payload: TodayRecommendationsRequest,
): Promise<TodayRecommendation[]> {
  const query = [
    payload.mood,
    payload.weather,
    'restaurante São Paulo',
  ]
    .filter(Boolean)
    .join(' ')

  const response = await searchRestaurantBase({
    query,
    max_resultados: payload.limit ?? 3,
  })

  return response.items.map((item) =>
    baseRestaurantToRecommendation(item.restaurante, payload.grupo_id),
  )
}
