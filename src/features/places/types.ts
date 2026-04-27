export type PlaceStatus = 'quero_ir' | 'fomos' | 'quero_voltar' | 'nao_curti'

export const PLACE_STATUSES: PlaceStatus[] = [
  'quero_ir',
  'fomos',
  'quero_voltar',
  'nao_curti',
]

export const PLACE_STATUS_LABELS: Record<PlaceStatus, string> = {
  quero_ir: 'Quero ir',
  fomos: 'Fomos',
  quero_voltar: 'Quero voltar',
  nao_curti: 'Não voltaremos',
}

export type PlacePhoto = {
  id: string
  place_id: string
  group_id: string
  public_url: string
  storage_path: string
  is_cover: boolean
  sort_order: number
  created_by: string
  created_at: string
}

export type Place = {
  id: string
  group_id: string
  name: string
  category: string | null
  neighborhood: string | null
  city: string | null
  price_range: number | null
  link: string | null
  notes: string | null
  status: PlaceStatus
  is_favorite: boolean
  image_url: string | null
  rating?: number | null
  created_at: string
  updated_at?: string
  photos?: PlacePhoto[]
}

export type PlaceListResponse = {
  items: Place[]
  page: number
  page_size: number
  total: number
  has_more: boolean
}

export type PlaceListParams = {
  page?: number
  page_size?: number
  search?: string
  status?: PlaceStatus
  is_favorite?: boolean
  category?: string
  sort_by?: 'created_at' | 'updated_at' | 'name'
  sort_order?: 'asc' | 'desc'
}

export type CreatePlacePayload = {
  name: string
  category?: string
  neighborhood?: string
  city?: string
  price_range?: number
  link?: string
  notes?: string
  status?: PlaceStatus
  is_favorite?: boolean
}

export type UpdatePlacePayload = Partial<CreatePlacePayload>

export type GoogleAutocompleteSuggestion = {
  type: 'place' | 'query'
  place_id?: string
  text?: { text: string }
  main_text?: { text: string; matches?: Array<{ start_offset: number; end_offset: number }> }
  secondary_text?: { text: string }
  types?: string[]
  distance_meters?: number
}

export type GoogleAutocompleteResponse = {
  suggestions: GoogleAutocompleteSuggestion[]
}

export type GoogleAutocompleteRequest = {
  input: string
  location_bias?: {
    latitude: number
    longitude: number
    radius_meters: number
  }
  included_primary_types?: string[]
  session_token?: string
  max_results?: number
  include_query_predictions?: boolean
}

export type GooglePlaceDetail = {
  place_id: string
  display_name: string
  formatted_address: string
  location: { latitude: number; longitude: number }
  neighborhood?: string | null
  city?: string | null
  rating?: number | null
  user_rating_count?: number | null
  price_level?: string | null
  price_range?: number | null
  primary_type?: string | null
  primary_type_display_name?: string | null
  google_maps_uri?: string | null
  website_uri?: string | null
  phone_number?: string | null
  open_now?: boolean | null
  photo_uri?: string | null
  types?: string[]
}

export type SaveGooglePlacePayload = {
  place_id: string
  status?: PlaceStatus
  is_favorite?: boolean
  notes?: string
}
