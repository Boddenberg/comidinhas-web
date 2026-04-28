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
  url: string
  caminho: string
  ordem: number
  capa: boolean
}

/** Frontend-friendly place shape. Mapped from BFF LugarResponse (pt). */
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
  added_by: string | null
  created_at: string | null
  updated_at: string | null
  photos: PlacePhoto[]
}

/** Raw BFF response shape (pt). */
export type LugarResponse = {
  id: string
  grupo_id: string
  nome: string
  categoria: string | null
  bairro: string | null
  cidade: string | null
  faixa_preco: number | null
  link: string | null
  notas: string | null
  status: PlaceStatus
  favorito: boolean
  imagem_capa: string | null
  fotos: PlacePhoto[]
  adicionado_por: string | null
  extra: Record<string, unknown>
  criado_em: string | null
  atualizado_em: string | null
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
  neighborhood?: string
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
  added_by?: string
}

export type UpdatePlacePayload = Partial<CreatePlacePayload>

export type GoogleAutocompleteSuggestion = {
  type: 'place' | 'query'
  place_id?: string
  text?: { text: string; matches?: Array<{ start_offset: number; end_offset: number }> }
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
  formatted_address: string | null
  location: { latitude: number; longitude: number } | null
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
  cover_photo_uri?: string | null
  photo_uri?: string | null
  photos?: Array<GooglePlacePhoto | string> | null
  types?: string[]
}

export type GooglePlacePhoto = {
  id?: string | null
  name?: string | null
  url?: string | null
  uri?: string | null
  photo_uri?: string | null
  width?: number | null
  height?: number | null
  capa?: boolean | null
  is_cover?: boolean | null
}

export type SaveGooglePlacePayload = {
  place_id: string
  status?: PlaceStatus
  is_favorite?: boolean
  notes?: string
  added_by?: string
  cover_photo_uri?: string
  photo_uris?: string[]
}
