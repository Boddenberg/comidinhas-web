export type PriceLevel =
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE'

export type RankPreference = 'DISTANCE' | 'POPULARITY'

export interface NearbyRestaurantsRequest {
  included_types: string[]
  latitude: number
  longitude: number
  max_results: number
  radius_meters: number
  rank_preference: RankPreference
}

export interface RestaurantLocation {
  latitude: number
  longitude: number
}

export interface PhotoAttribution {
  display_name: string
  photo_uri?: string | null
  uri?: string | null
}

export interface RestaurantPlace {
  display_name: string
  formatted_address?: string | null
  google_maps_uri?: string | null
  id: string
  location: RestaurantLocation
  open_now?: boolean | null
  phone_number?: string | null
  photo_attributions: PhotoAttribution[]
  photo_uri?: string | null
  price_level?: PriceLevel | null
  primary_type?: string | null
  rating?: number | null
  user_rating_count?: number | null
  website_uri?: string | null
}

export interface NearbyRestaurantsResponse {
  places: RestaurantPlace[]
}

export interface NearbyRestaurantsFilters {
  latitude: string
  longitude: string
  maxResults: string
  radiusMeters: string
  rankPreference: RankPreference
}
