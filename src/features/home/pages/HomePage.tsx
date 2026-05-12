import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { recommendRestaurants } from '@/features/chat/services/chatService'
import type { RestaurantRecommendation } from '@/features/chat/types'
import { useAddPlace } from '@/features/places/AddPlaceContext'
import { saveBaseRestaurant } from '@/features/places/services/restaurantBaseService'
import { updatePlace } from '@/features/places/services/placesService'
import type { Place } from '@/features/places/types'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import { fetchHome, type HomeDashboard } from '../services/homeService'
import {
  fetchTodayRecommendations,
  type TodayRecommendation,
} from '../services/todayRecommendationsService'
import styles from './HomePage.module.css'

const heroBannerImageModules = import.meta.glob<string>(
  '../../../../fotos banner principal/*.{png,jpg,jpeg,webp}',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
)

const heroBannerImages = Object.values(heroBannerImageModules)

const aiMenus = [
  {
    id: 'humor',
    label: 'Humor',
    tone: 'purple',
    options: [
      { id: 'qualquer', label: 'Qualquer', emoji: '✨' },
      { id: 'aventureiros', label: 'Aventureiros', emoji: '😎' },
      { id: 'confortavel', label: 'Confortável', emoji: '🫶' },
      { id: 'romantico', label: 'Romântico', emoji: '💕' },
      { id: 'animado', label: 'Animado', emoji: '🎉' },
      { id: 'tranquilo', label: 'Tranquilo', emoji: '🌿' },
      { id: 'sem_esforco', label: 'Sem esforço', emoji: '🛋️' },
      { id: 'surpresa', label: 'Me surpreenda', emoji: '🎲' },
    ],
  },
  {
    id: 'tipo',
    label: 'Tipo de comida',
    tone: 'pink',
    options: [
      { id: 'qualquer', label: 'Qualquer', emoji: '🍕' },
      { id: 'brasileira', label: 'Brasileira', emoji: '🍛' },
      { id: 'italiana', label: 'Italiana', emoji: '🍝' },
      { id: 'japonesa', label: 'Japonesa', emoji: '🍣' },
      { id: 'arabe', label: 'Árabe', emoji: '🧆' },
      { id: 'mexicana', label: 'Mexicana', emoji: '🌮' },
      { id: 'burger', label: 'Burger', emoji: '🍔' },
      { id: 'cafe_brunch', label: 'Café/Brunch', emoji: '☕' },
      { id: 'barzinho', label: 'Barzinho', emoji: '🍸' },
      { id: 'doces', label: 'Doces', emoji: '🍰' },
    ],
  },
  {
    id: 'lugar',
    label: 'Lugar',
    tone: 'place',
    options: [
      { id: 'qualquer', label: 'Qualquer', emoji: '📍' },
      { id: 'curtidos', label: 'Curtidos', emoji: '❤️' },
      { id: 'nunca_fomos', label: 'Nunca fomos', emoji: '🆕' },
      { id: 'ja_fomos', label: 'Já fomos', emoji: '✅' },
      { id: 'quero_ir', label: 'Quero ir', emoji: '🔖' },
      { id: 'perto_daqui', label: 'Perto daqui', emoji: '🧭' },
      { id: 'dos_guias', label: 'Dos guias', emoji: '📚' },
      { id: 'bem_avaliado', label: 'Bem avaliado', emoji: '⭐' },
    ],
  },
  {
    id: 'clima',
    label: 'Clima',
    tone: 'blue',
    options: [
      { id: 'qualquer', label: 'Qualquer', emoji: '🌈' },
      { id: 'fresco', label: 'Fresco', emoji: '🍃' },
      { id: 'calor', label: 'Calor', emoji: '☀️' },
      { id: 'friozinho', label: 'Friozinho', emoji: '🧥' },
      { id: 'chuva', label: 'Chuva', emoji: '🌧️' },
      { id: 'noite_boa', label: 'Noite boa', emoji: '🌙' },
      { id: 'almoco', label: 'Almoço', emoji: '🌤️' },
      { id: 'pos_trampo', label: 'Pós-trampo', emoji: '🌆' },
    ],
  },
  {
    id: 'orcamento',
    label: 'Orçamento',
    tone: 'budget',
    options: [
      { id: 'qualquer', label: 'Qualquer', emoji: '💵' },
      { id: 'ate_100', label: 'Até R$100', emoji: '💵' },
      { id: 'ate_200', label: 'Até R$200', emoji: '💵' },
      { id: 'ate_300', label: 'Até R$300', emoji: '💳' },
      { id: 'ate_400', label: 'Até R$400', emoji: '💳' },
      { id: 'ate_500', label: 'Até R$500', emoji: '👑' },
      { id: 'sem_limite', label: 'Sem limite', emoji: '✨' },
    ],
  },
  {
    id: 'distancia',
    label: 'Distância',
    tone: 'distance',
    options: [
      { id: 'qualquer', label: 'Qualquer', emoji: '🚶' },
      { id: 'pertinho', label: 'Pertinho', emoji: '🚶' },
      { id: 'ate_1km', label: 'Até 1 km', emoji: '📍' },
      { id: 'ate_3km', label: 'Até 3 km', emoji: '🚲' },
      { id: 'ate_5km', label: 'Até 5 km', emoji: '🚗' },
      { id: 'vale_uber', label: 'Vale Uber', emoji: '🚕' },
      { id: 'qualquer_canto', label: 'Qualquer canto', emoji: '🗺️' },
      { id: 'no_caminho', label: 'No caminho', emoji: '🧭' },
    ],
  },
] as const

type AiMenuId = (typeof aiMenus)[number]['id']
type AiSelections = Record<AiMenuId, string>

const initialAiSelections: AiSelections = {
  humor: 'aventureiros',
  tipo: 'qualquer',
  lugar: 'qualquer',
  clima: 'fresco',
  orcamento: 'ate_100',
  distancia: 'pertinho',
}

const PARA_VOCES_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'novos', label: 'Novos' },
  { id: 'romanticos', label: 'Românticos' },
  { id: 'barzinhos', label: 'Barzinhos' },
  { id: 'budget', label: 'Até R$120' },
] as const

type ParaVocesFilter = (typeof PARA_VOCES_FILTERS)[number]['id']

const PRICE_SYMBOL: Record<number, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
}

const SUGGESTION_TAGS = ['Romântico', 'Barzinho', 'Aconchegante'] as const

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DEFAULT_LOCATION = {
  latitude: -23.55052,
  longitude: -46.633308,
}

function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return { label: 'Bom dia', icon: 'sun' as const }
  if (hour >= 12 && hour < 18) return { label: 'Boa tarde', icon: 'cloud-sun' as const }
  return { label: 'Boa noite', icon: 'moon' as const }
}

function getDayLabel(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function getAiOptionLabel(menuId: AiMenuId, optionId: string) {
  const menu = aiMenus.find((item) => item.id === menuId)
  const option = menu?.options.find((item) => item.id === optionId)
  return option ? `${option.label} ${option.emoji}` : optionId
}

function getAiPlainOptionLabel(menuId: AiMenuId, optionId: string) {
  const menu = aiMenus.find((item) => item.id === menuId)
  const option = menu?.options.find((item) => item.id === optionId)
  return option?.label ?? optionId
}

function buildAiDecisionMessage(selections: AiSelections) {
  return [
    'Escolha 1 restaurante real para o casal com estes filtros:',
    `Humor: ${getAiOptionLabel('humor', selections.humor)}`,
    `Comida: ${getAiOptionLabel('tipo', selections.tipo)}`,
    `Lugar: ${getAiOptionLabel('lugar', selections.lugar)}`,
    `Clima: ${getAiOptionLabel('clima', selections.clima)}`,
    `Orcamento: ${getAiOptionLabel('orcamento', selections.orcamento)}`,
    `Distancia: ${getAiOptionLabel('distancia', selections.distancia)}`,
    'Priorize resultado da base_conhecimento quando o restaurante ainda nao estiver salvo.',
  ].join('\n')
}

function getAiBaseRecommendation(recommendations: RestaurantRecommendation[]) {
  return recommendations.find((option) => option.restaurante.base_restaurante_id)
}

function getRecommendationName(recommendation: RestaurantRecommendation | undefined) {
  return recommendation?.restaurante.nome?.trim() ?? ''
}

function isOpenAiTimeout(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('timeout') && normalized.includes('openai')
}

function buildFallbackBaseQuery(
  selections: AiSelections,
  city: string | null | undefined,
  favoritePlaceName?: string,
) {
  if (selections.lugar === 'curtidos' && favoritePlaceName) return favoritePlaceName

  const parts = ['restaurante']
  const food = getAiPlainOptionLabel('tipo', selections.tipo)
  const mood = getAiPlainOptionLabel('humor', selections.humor)

  if (food !== 'Qualquer') parts.push(food)
  if (mood !== 'Qualquer' && mood !== 'Me surpreenda') parts.push(mood)
  parts.push(city?.trim() || 'São Paulo')

  return parts.join(' ')
}

function uniquePlaces(...lists: Place[][]) {
  const seen = new Set<string>()
  const out: Place[] = []
  lists.flat().forEach((place) => {
    if (seen.has(place.id)) return
    seen.add(place.id)
    out.push(place)
  })
  return out
}

function mergeCreatedPlace(home: HomeDashboard, place: Place): HomeDashboard {
  function upsert(list: Place[]) {
    const withoutPlace = list.filter((item) => item.id !== place.id)
    return [place, ...withoutPlace].slice(0, Math.max(list.length, 1))
  }

  return {
    ...home,
    latest_places: upsert(home.latest_places),
    top_favorites: place.is_favorite ? upsert(home.top_favorites) : home.top_favorites,
    want_to_go: place.status === 'quero_ir' ? upsert(home.want_to_go) : home.want_to_go,
    want_to_return:
      place.status === 'quero_voltar' ? upsert(home.want_to_return) : home.want_to_return,
  }
}

function replacePlace(list: Place[], place: Place) {
  return list.map((item) => (item.id === place.id ? place : item))
}

function upsertPlace(list: Place[], place: Place) {
  const withoutPlace = list.filter((item) => item.id !== place.id)
  return [place, ...withoutPlace].slice(0, Math.max(list.length, 1))
}

function syncHomePlace(home: HomeDashboard, updated: Place, previous?: Place): HomeDashboard {
  const favoriteDelta =
    previous && previous.is_favorite !== updated.is_favorite
      ? updated.is_favorite
        ? 1
        : -1
      : 0

  return {
    ...home,
    counters: {
      ...home.counters,
      total_favorites: Math.max(0, home.counters.total_favorites + favoriteDelta),
    },
    latest_places: replacePlace(home.latest_places, updated),
    top_favorites: updated.is_favorite
      ? upsertPlace(home.top_favorites, updated)
      : home.top_favorites.filter((item) => item.id !== updated.id),
    want_to_go: updated.status === 'quero_ir'
      ? upsertPlace(replacePlace(home.want_to_go, updated), updated)
      : home.want_to_go.filter((item) => item.id !== updated.id),
    want_to_return: updated.status === 'quero_voltar'
      ? upsertPlace(replacePlace(home.want_to_return, updated), updated)
      : home.want_to_return.filter((item) => item.id !== updated.id),
  }
}

function isSavedPlaceId(id: string) {
  return UUID_PATTERN.test(id)
}

function priceLabel(range: number | null) {
  if (!range) return '—'
  return PRICE_SYMBOL[range] ?? '$$'
}

function formatRating(rating: number | null | undefined) {
  if (!rating) return '—'
  return rating.toFixed(1).replace('.', ',')
}

function tagFor(index: number) {
  return SUGGESTION_TAGS[index % SUGGESTION_TAGS.length]
}

function distanceLabel(index: number) {
  const samples = ['450 m', '600 m', '1,2 km', '900 m']
  return samples[index % samples.length]
}

function neighborhoodLabel(index: number) {
  const samples = ['Vila Madalena', 'Pinheiros', 'Vila Madalena', 'Pinheiros']
  return samples[index % samples.length]
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 1000 * 60 * 15,
      timeout: 10000,
    })
  })
}

export function HomePage() {
  const { perfil, grupo } = useAuth()
  const { open: openAddPlace, registerOnCreated } = useAddPlace()
  const navigate = useNavigate()

  const tasteRef = useRef<HTMLElement | null>(null)

  const [home, setHome] = useState<HomeDashboard | null>(null)
  const [homeError, setHomeError] = useState<string | null>(null)
  const [homeLoading, setHomeLoading] = useState(true)
  const [todaySuggestions, setTodaySuggestions] = useState<TodayRecommendation[]>([])
  const [todaySuggestionsError, setTodaySuggestionsError] = useState<string | null>(null)
  const [todaySuggestionsLoading, setTodaySuggestionsLoading] = useState(true)
  const [paraVocesFilter, setParaVocesFilter] = useState<ParaVocesFilter>('todos')
  const [greeting, setGreeting] = useState(getGreeting)
  const [aiSelections, setAiSelections] = useState<AiSelections>(initialAiSelections)
  const [openAiMenu, setOpenAiMenu] = useState<AiMenuId | null>(null)
  const [aiDecideLoading, setAiDecideLoading] = useState(false)
  const [aiDecideError, setAiDecideError] = useState<string | null>(null)
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setGreeting(getGreeting())
    }, 1000 * 60)

    return () => window.clearInterval(intervalId)
  }, [])

  const hasFavoritePlaces = (home?.counters.total_favorites ?? 0) > 0 || (home?.top_favorites.length ?? 0) > 0

  useEffect(() => {
    if (hasFavoritePlaces || aiSelections.lugar !== 'curtidos') return
    setAiSelections((current) => ({
      ...current,
      lugar: 'qualquer',
    }))
  }, [aiSelections.lugar, hasFavoritePlaces])

  useEffect(() => {
    if (!grupo) {
      setHomeLoading(false)
      return
    }

    let cancelled = false
    setHomeLoading(true)
    fetchHome(grupo.id, 8)
      .then((result) => {
        if (cancelled) return
        setHome(result)
        setHomeError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setHomeError(getErrorMessage(err, 'Não foi possível carregar a home.'))
      })
      .finally(() => {
        if (cancelled) return
        setHomeLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [grupo])

  useEffect(() => {
    registerOnCreated((place) => {
      if (!grupo) return
      fetchHome(grupo.id, 8)
        .then((result) => setHome(mergeCreatedPlace(result, place)))
        .catch(() => undefined)
    })
    return () => registerOnCreated(null)
  }, [grupo, registerOnCreated])

  useEffect(() => {
    if (!grupo) {
      setTodaySuggestions([])
      setTodaySuggestionsLoading(false)
      return
    }

    const activeGrupoId = grupo.id
    const activePerfilId = perfil?.id
    let cancelled = false
    setTodaySuggestionsLoading(true)
    setTodaySuggestionsError(null)

    async function loadTodaySuggestions() {
      let coords = DEFAULT_LOCATION

      if ('geolocation' in navigator) {
        try {
          const position = await getCurrentPosition()
          coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        } catch {
          coords = DEFAULT_LOCATION
        }
      }

      const places = await fetchTodayRecommendations({
        grupo_id: activeGrupoId,
        perfil_id: activePerfilId,
        latitude: coords.latitude,
        limit: 3,
        longitude: coords.longitude,
        mood: 'descoberta leve para hoje',
        radius_meters: 2500,
      })

      if (cancelled) return
      setTodaySuggestions(places)
    }

    loadTodaySuggestions()
      .catch((err: unknown) => {
        if (cancelled) return
        setTodaySuggestions([])
        setTodaySuggestionsError(
          getErrorMessage(err, 'Nao foi possivel carregar sugestoes da IA agora.'),
        )
      })
      .finally(() => {
        if (cancelled) return
        setTodaySuggestionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [grupo, perfil])

  async function handleAiDecide() {
    if (!grupo) {
      setAiDecideError('Selecione um perfil antes de pedir a escolha da IA.')
      return
    }

    setAiDecideLoading(true)
    setAiDecideError(null)

    try {
      const coords = await getCurrentPosition()
        .then((position) => ({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }))
        .catch(() => DEFAULT_LOCATION)

      const response = await recommendRestaurants({
        grupo_id: grupo.id,
        mensagem: buildAiDecisionMessage(aiSelections),
        perfil_id: perfil?.id,
        localizacao: {
          ...coords,
          cidade: perfil?.cidade ?? 'São Paulo',
          raio_metros: 8000,
        },
        permitir_base_conhecimento: true,
        permitir_google: false,
        max_resultados: 1,
        max_candidatos_internos: 24,
        max_candidatos_base_conhecimento: 12,
      })
      const recommendation = getAiBaseRecommendation(response.opcoes ?? [])
      const baseRestaurantId = recommendation?.restaurante.base_restaurante_id

      if (!baseRestaurantId) {
        const firstRecommendation = response.opcoes?.[0]
        const recommendationName = getRecommendationName(firstRecommendation)

        if (!recommendationName) {
          throw new Error('A IA não encontrou uma opção real para esses filtros. Tente abrir um pouco as escolhas.')
        }

        openAddPlace({
          initialMode: 'base',
          initialQuery: recommendationName,
          isAiPick: true,
          aiMotivo:
            firstRecommendation?.motivo || 'A IA escolheu este nome. Confirme o resultado na base antes de salvar.',
          subtitleOverride:
            firstRecommendation?.motivo || 'A IA escolheu este nome. Confirme o resultado na base antes de salvar.',
          titleOverride: 'Escolha da IA',
          onTryAgain: () => {
            void handleAiDecide()
          },
        })
        return
      }

      openAddPlace({
        initialMode: 'base',
        initialBaseRestaurantId: baseRestaurantId,
        initialQuery: recommendation?.restaurante.nome,
        isAiPick: true,
        aiMotivo: recommendation?.motivo || 'A IA bateu seus critérios e elegeu este lugar para o casal.',
        subtitleOverride: recommendation?.motivo || 'Confira os detalhes antes de adicionar ao casal.',
        titleOverride: 'Escolha da IA',
        onTryAgain: () => {
          void handleAiDecide()
        },
      })
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Não foi possível decidir um restaurante agora.')

      if (isOpenAiTimeout(errorMessage)) {
        openAddPlace({
          initialMode: 'base',
          initialQuery: buildFallbackBaseQuery(
            aiSelections,
            perfil?.cidade,
            home?.top_favorites[0]?.name,
          ),
          subtitleOverride:
            'A IA demorou para responder, então deixei uma busca pronta na base com os filtros escolhidos.',
          titleOverride: 'Escolha da IA',
          onTryAgain: () => {
            void handleAiDecide()
          },
        })
        return
      }

      setAiDecideError(errorMessage)
    } finally {
      setAiDecideLoading(false)
    }
  }

  function handleAiSelection(menuId: AiMenuId, optionId: string) {
    setAiSelections((current) => ({
      ...current,
      [menuId]: optionId,
    }))
    setOpenAiMenu(null)
  }

  function handleScrollToTaste() {
    tasteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleToggleFavorite(place: Place) {
    if (favoriteBusyId) return
    if (!grupo) {
      setFavoriteError('Selecione um perfil antes de favoritar.')
      return
    }

    setFavoriteBusyId(place.id)
    setFavoriteError(null)

    try {
      const baseRestaurantId = (place as Partial<TodayRecommendation>).base_restaurante_id ?? null
      const shouldSaveFromBase = Boolean(baseRestaurantId) && !isSavedPlaceId(place.id) && !place.is_favorite
      const updated = shouldSaveFromBase
        ? await saveBaseRestaurant(grupo.id, {
            added_by_profile_id: perfil?.id,
            is_favorite: true,
            restaurante_id: baseRestaurantId || place.id,
            status: place.status ?? 'quero_ir',
          })
        : await updatePlace(place.id, { is_favorite: !place.is_favorite })
      setHome((current) => (current ? syncHomePlace(current, updated, place) : current))
      setTodaySuggestions((current) =>
        current.map((item) =>
          item.id === place.id || item.id === updated.id
            ? { ...item, ...updated, base_restaurante_id: baseRestaurantId || item.base_restaurante_id }
            : item,
        ),
      )
    } catch (err) {
      setFavoriteError(getErrorMessage(err, 'Nao foi possivel atualizar o favorito.'))
    } finally {
      setFavoriteBusyId(null)
    }
  }

  const suggestions = todaySuggestions
  const counters = home?.counters
  const profileName = grupo?.nome ?? perfil?.nome ?? 'por aí'
  const cityName = perfil?.cidade?.trim() || 'São Paulo'
  const dayLabel = getDayLabel()

  const paraVocesPlaces = useMemo(() => {
    if (!home) return []
    let pool: Place[]
    switch (paraVocesFilter) {
      case 'favoritos':
        pool = home.top_favorites
        break
      case 'novos':
        pool = home.want_to_go
        break
      case 'romanticos':
      case 'barzinhos':
      case 'budget':
        pool = uniquePlaces(home.latest_places, home.top_favorites, home.want_to_go)
        break
      case 'todos':
      default:
        pool = uniquePlaces(home.latest_places, home.top_favorites, home.want_to_go, home.want_to_return)
        break
    }
    return pool.slice(0, 4)
  }, [home, paraVocesFilter])

  return (
    <div className={styles.layout}>
      {/* === Ambient context strip === */}
      <section className={styles.ambient} aria-label="Contexto de hoje">
        <div className={styles.ambientGreeting}>
          <span className={styles.ambientEyebrow}>
            <Icon name={greeting.icon} size={14} />
            {greeting.label}, {profileName}
          </span>
          <p className={styles.ambientHint}>
            Vamos resolver o "onde a gente come hoje?"
            <Icon name="heart-filled" size={12} className={styles.ambientHintHeart} />
          </p>
        </div>
        <div className={styles.ambientMetrics}>
          <span className={styles.ambientChip}>
            <Icon name="pin" size={13} />
            {cityName}
          </span>
          <span className={styles.ambientChip}>
            <Icon name="cloud-sun" size={13} className={styles.ambientChipWeather} />
            23°C · céu limpo
          </span>
          <span className={`${styles.ambientChip} ${styles.ambientChipDate}`}>
            <Icon name="calendar" size={13} />
            {dayLabel}
          </span>
        </div>
      </section>

      {/* === Decision hero === */}
      <section className={styles.hero} aria-label="Decida o rolê de hoje">
        <div className={styles.heroBannerPhotos} aria-hidden="true">
          {heroBannerImages.map((src, index) => (
            <img
              key={src}
              alt=""
              className={styles.heroBannerPhoto}
              src={src}
              style={
                {
                  animationDelay: `${index * 4}s`,
                  animationDuration: `${Math.max(heroBannerImages.length, 1) * 4}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <span className={styles.heroAurora} aria-hidden="true" />
        <span className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} />
            IA Decide · powered by Comidinhas
          </span>
          <h1 className={styles.heroTitle}>
            O que vai ser{' '}
            <span className={styles.heroAccent}>
              hoje
              <Icon name="heart-filled" size={32} className={styles.heroHeart} />
            </span>
            ?
          </h1>
          <p className={styles.heroLead}>
            A gente escolhe um restaurante real para vocês em segundos, com base no humor,
            no clima e no jeito do casal.
          </p>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.heroPrimary}
              disabled={aiDecideLoading}
              onClick={handleAiDecide}
            >
              <Icon name="sparkles" size={16} />
              <span>{aiDecideLoading ? 'Decidindo…' : 'Surpreender com IA'}</span>
              <Icon name="arrow-right" size={16} className={styles.heroPrimaryArrow} />
            </button>
            <button
              type="button"
              className={styles.heroSecondary}
              onClick={handleScrollToTaste}
            >
              <span>Ajustar critérios</span>
              <Icon name="chevron-down" size={14} />
            </button>
          </div>
          {aiDecideError ? (
            <p className={styles.heroError}>{aiDecideError}</p>
          ) : null}
          <dl className={styles.heroStats} aria-label="Resumo dos lugares salvos">
            <div className={styles.heroStat}>
              <dt>Lugares salvos</dt>
              <dd>{counters?.total_places ?? '—'}</dd>
            </div>
            <span className={styles.heroStatDivider} aria-hidden="true" />
            <div className={styles.heroStat}>
              <dt>Favoritos</dt>
              <dd>
                {counters?.total_favorites ?? '—'}
                <Icon name="heart-filled" size={14} className={styles.heroStatIcon} />
              </dd>
            </div>
            <span className={styles.heroStatDivider} aria-hidden="true" />
            <div className={styles.heroStat}>
              <dt>Quero ir</dt>
              <dd>
                {counters?.total_want_to_go ?? '—'}
                <Icon name="bookmark-filled" size={13} className={styles.heroStatIcon} />
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* === Taste / IA Decide filters (styled in next commit) === */}
      <section
        className={styles.tasteSection}
        aria-label="Critérios da IA"
        ref={tasteRef}
      >
        <header className={styles.tasteHeader}>
          <div className={styles.tasteHeaderText}>
            <span className={styles.sectionEyebrow}>
              <Icon name="sparkles" size={12} />
              Critérios
            </span>
            <h2 className={styles.sectionTitle}>Diga pra IA o que combina hoje</h2>
            <p className={styles.sectionMuted}>
              Toque em qualquer card para ajustar — quanto mais aberto, mais sugestões.
            </p>
          </div>
        </header>

        <div className={styles.aiTilesGrid}>
          {aiMenus.map((menu) => {
            const visibleOptions =
              menu.id === 'lugar' && !hasFavoritePlaces
                ? menu.options.filter((option) => option.id !== 'curtidos')
                : menu.options
            const selectedOption =
              visibleOptions.find((option) => option.id === aiSelections[menu.id]) ??
              visibleOptions[0]
            const isOpen = openAiMenu === menu.id

            return (
              <div
                key={menu.id}
                className={`${styles.aiMenu} ${styles[`aiMenu_${menu.tone}`]} ${
                  isOpen ? styles.aiMenuOpen : ''
                }`}
              >
                <button
                  type="button"
                  className={styles.aiMenuButton}
                  aria-expanded={isOpen}
                  onClick={() => setOpenAiMenu(isOpen ? null : menu.id)}
                >
                  <span className={styles.aiTileLabel}>{menu.label}</span>
                  <span className={styles.aiTileValue}>
                    {selectedOption.label}{' '}
                    <span className={styles.aiTileEmoji}>{selectedOption.emoji}</span>
                  </span>
                  <Icon name="chevron-down" size={14} className={styles.aiMenuChevron} />
                </button>

                {isOpen ? (
                  <div className={styles.aiOptionsPanel}>
                    {visibleOptions.map((option) => {
                      const isSelected = option.id === selectedOption.id

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`${styles.aiOptionChip} ${
                            isSelected ? styles.aiOptionChipSelected : ''
                          }`}
                          aria-pressed={isSelected}
                          onClick={() => handleAiSelection(menu.id, option.id)}
                        >
                          {isSelected ? (
                            <Icon name="check" size={11} className={styles.aiOptionCheck} />
                          ) : null}
                          <span>{option.label}</span>
                          <span className={styles.aiOptionEmoji}>{option.emoji}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className={styles.tasteFooter}>
          <span className={styles.tasteFooterHint}>
            <Icon name="bolt" size={13} />
            Resposta em <kbd>~3s</kbd> com base nos critérios escolhidos
          </span>
          <div className={styles.tasteFooterActions}>
            {aiDecideError ? (
              <span className={styles.tasteError}>{aiDecideError}</span>
            ) : null}
            <button
              type="button"
              className={styles.tasteCta}
              disabled={aiDecideLoading}
              onClick={handleAiDecide}
            >
              <Icon name="sparkles" size={14} />
              <span>{aiDecideLoading ? 'Decidindo…' : 'Decidir agora'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* === Combina com hoje === */}
      <section className={styles.suggestSection} aria-label="Sugestões de hoje">
        <header className={styles.suggestHeader}>
          <div className={styles.suggestHeaderText}>
            <span className={styles.sectionEyebrow}>
              <Icon name="sparkles" size={12} />
              Combina com hoje
            </span>
            <h2 className={styles.sectionTitle}>
              Selecionados para o clima e seu humor
            </h2>
            <p className={styles.sectionMuted}>
              Atualizamos a cada hora com base em onde vocês estão e o que combina agora.
            </p>
          </div>
          <div className={styles.suggestHeaderMeta}>
            <span className={styles.suggestPulse} aria-hidden="true">
              <span className={styles.suggestPulseDot} />
              ao vivo
            </span>
            <Link to="/lugares" className={styles.sectionLink}>
              Ver todas <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </header>

        <div className={styles.suggestRow}>
          {todaySuggestionsLoading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <article
                  key={`sk-${idx}`}
                  className={`${styles.suggestCard} ${styles.skeletonCard}`}
                  aria-hidden="true"
                >
                  <span className={styles.suggestThumb} />
                  <div className={styles.suggestBody}>
                    <span className={styles.skeletonLine} />
                    <span className={styles.skeletonLineShort} />
                  </div>
                </article>
              ))
            : todaySuggestionsError
              ? (
                  <p className={styles.suggestEmpty}>
                    {todaySuggestionsError}
                  </p>
                )
              : suggestions.length === 0
              ? (
                  <button
                    type="button"
                    className={styles.suggestEmpty}
                    onClick={() => openAddPlace()}
                  >
                    <Icon name="plus" size={18} />
                    Adicionar o primeiro lugar
                  </button>
                )
              : suggestions.map((place, idx) => (
                  <SuggestionCard
                    busy={favoriteBusyId === place.id}
                    key={place.id}
                    onToggleFavorite={handleToggleFavorite}
                    place={place}
                    index={idx}
                  />
                ))}
        </div>
        {favoriteError ? <p className={styles.inlineError}>{favoriteError}</p> : null}
      </section>

      {/* === Atalhos rápidos === */}
      <section className={styles.shortcutsSection} aria-label="Atalhos rápidos">
        <header className={styles.shortcutsHeader}>
          <div>
            <span className={styles.sectionEyebrow}>
              <Icon name="bolt" size={11} />
              Atalhos
            </span>
            <h2 className={styles.sectionTitle}>Outras formas de decidir</h2>
          </div>
        </header>
        <div className={styles.shortcutsGrid}>
          <button
            type="button"
            className={`${styles.shortcutCard} ${styles.shortcutCard_explore}`}
            onClick={() => navigate('/explorar')}
          >
            <span className={styles.shortcutIcon}>
              <Icon name="compass" size={20} />
            </span>
            <span className={styles.shortcutBody}>
              <strong>Explorar base</strong>
              <span>Restaurantes curados de Sao Paulo</span>
            </span>
            <span className={styles.shortcutArrow}>
              <Icon name="arrow-right" size={14} />
            </span>
          </button>

          <button
            type="button"
            className={`${styles.shortcutCard} ${styles.shortcutCard_favorites}`}
            onClick={() => navigate('/favoritos')}
          >
            <span className={styles.shortcutIcon}>
              <Icon name="heart-filled" size={20} />
            </span>
            <span className={styles.shortcutBody}>
              <strong>Favoritos</strong>
              <span>Os que vocês mais curtiram</span>
            </span>
            <span className={styles.shortcutArrow}>
              <Icon name="arrow-right" size={14} />
            </span>
          </button>

          <button
            type="button"
            className={`${styles.shortcutCard} ${styles.shortcutCard_wishlist}`}
            onClick={() => navigate('/lugares')}
          >
            <span className={styles.shortcutIcon}>
              <Icon name="bookmark-filled" size={20} />
            </span>
            <span className={styles.shortcutBody}>
              <strong>Quero ir</strong>
              <span>Lista de desejos do casal</span>
            </span>
            <span className={styles.shortcutArrow}>
              <Icon name="arrow-right" size={14} />
            </span>
          </button>

          <button
            type="button"
            className={`${styles.shortcutCard} ${styles.shortcutCard_chat}`}
            onClick={() => navigate('/chat')}
          >
            <span className={styles.shortcutIcon}>
              <Icon name="robot" size={20} />
            </span>
            <span className={styles.shortcutBody}>
              <strong>Conversar com a IA</strong>
              <span>Decida em formato de chat</span>
            </span>
            <span className={styles.shortcutArrow}>
              <Icon name="arrow-right" size={14} />
            </span>
          </button>
        </div>
      </section>

      {/* === Para vocês === */}
      <section className={styles.paraVocesSection} aria-label="Lugares para vocês">
        <header className={styles.paraVocesHeader}>
          <div>
            <span className={styles.sectionEyebrow}>
              <Icon name="heart-filled" size={11} />
              Para vocês
            </span>
            <h2 className={styles.sectionTitle}>Lugares que combinam com o perfil</h2>
          </div>
          <div className={styles.paraVocesControls}>
            <div className={styles.filterTabs} role="tablist">
              {PARA_VOCES_FILTERS.map((option) => (
                <button
                  key={option.id}
                  role="tab"
                  type="button"
                  aria-selected={paraVocesFilter === option.id}
                  className={`${styles.filterTab} ${
                    paraVocesFilter === option.id ? styles.filterTabActive : ''
                  }`}
                  onClick={() => setParaVocesFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Link to="/lugares" className={styles.sectionLink}>
              Ver todos <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </header>

        {homeError ? (
          <p className={styles.emptyState}>{homeError}</p>
        ) : homeLoading ? (
          <div className={styles.placesGrid}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <article
                key={`sk-pv-${idx}`}
                className={`${styles.placeCard} ${styles.skeletonCard}`}
                aria-hidden="true"
              >
                <span className={styles.placeThumb} />
                <div className={styles.placeBody}>
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonLineShort} />
                </div>
              </article>
            ))}
          </div>
        ) : paraVocesPlaces.length === 0 ? (
          <p className={styles.emptyState}>
            Nenhum lugar criado neste perfil ainda.
          </p>
        ) : (
          <div className={styles.placesGrid}>
            {paraVocesPlaces.map((place, idx) => (
              <ParaVocesCard
                busy={favoriteBusyId === place.id}
                key={place.id}
                onToggleFavorite={handleToggleFavorite}
                place={place}
                index={idx}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SuggestionCard({
  busy,
  index,
  onToggleFavorite,
  place,
}: {
  busy: boolean
  index: number
  onToggleFavorite: (place: Place) => void
  place: Place
}) {
  const tag = tagFor(index)
  const cuisine = place.category ?? 'Sem categoria'
  const price = priceLabel(place.price_range)
  const rating = formatRating(place.rating)
  const distance = distanceLabel(index)
  const matchScore = 92 - index * 4

  return (
    <article className={styles.suggestCard}>
      <div className={styles.suggestThumb}>
        {place.image_url ? (
          <img alt={place.name} loading="lazy" src={place.image_url} />
        ) : (
          <div className={styles.suggestThumbFallback}>
            <Icon name="utensils" size={32} />
          </div>
        )}
        <span className={styles.suggestThumbShade} aria-hidden="true" />
        <span
          className={`${styles.suggestTag} ${
            styles[`suggestTag_${tag.toLowerCase().replace('â', 'a').replace('ô', 'o')}`]
          }`}
        >
          {tag}
        </span>
        <span className={styles.suggestMatch} aria-label={`Match de ${matchScore} por cento`}>
          <Icon name="sparkles" size={11} />
          {matchScore}%
        </span>
        <button
          type="button"
          className={`${styles.suggestSave} ${
            place.is_favorite ? styles.suggestSaveActive : ''
          }`}
          aria-label={place.is_favorite ? 'Remover dos favoritos' : 'Favoritar'}
          aria-pressed={place.is_favorite}
          disabled={busy}
          onClick={() => onToggleFavorite(place)}
        >
          <Icon name={place.is_favorite ? 'heart-filled' : 'heart'} size={14} />
        </button>
      </div>
      <div className={styles.suggestBody}>
        <strong className={styles.suggestName}>{place.name}</strong>
        <div className={styles.suggestRow2}>
          <span className={styles.suggestMeta}>
            {cuisine} · {price}
          </span>
          <span className={styles.suggestRating}>
            <Icon name="star" size={12} className={styles.suggestStarIcon} />
            {rating}
          </span>
        </div>
        <div className={styles.suggestFooter}>
          <span className={styles.suggestDistance}>
            <Icon name="pin" size={11} />
            {distance}
          </span>
          <span className={styles.suggestArrow} aria-hidden="true">
            <Icon name="arrow-right" size={13} />
          </span>
        </div>
      </div>
    </article>
  )
}

function ParaVocesCard({
  busy,
  index,
  onToggleFavorite,
  place,
}: {
  busy: boolean
  index: number
  onToggleFavorite: (place: Place) => void
  place: Place
}) {
  const cuisine = place.category ?? 'Sem categoria'
  const price = priceLabel(place.price_range)
  const rating = formatRating(place.rating)
  const tags = (() => {
    if (index === 0) return ['Romântico']
    if (index === 1) return ['Novo', 'Barzinho']
    if (index === 2) return ['Aconchegante', 'Novo']
    return ['Barzinho', 'Romântico']
  })()

  return (
    <article className={styles.placeCard}>
      <div className={styles.placeThumb}>
        {place.image_url ? (
          <img alt={place.name} loading="lazy" src={place.image_url} />
        ) : (
          <div className={styles.placeThumbFallback}>
            <Icon name="utensils" size={28} />
          </div>
        )}
        <span className={styles.placeThumbShade} aria-hidden="true" />
        <button
          type="button"
          className={`${styles.placeFavorite} ${
            place.is_favorite ? styles.placeFavoriteActive : ''
          }`}
          aria-label={place.is_favorite ? 'Remover dos favoritos' : 'Favoritar'}
          aria-pressed={place.is_favorite}
          disabled={busy}
          onClick={() => onToggleFavorite(place)}
        >
          <Icon name={place.is_favorite ? 'heart-filled' : 'heart'} size={14} />
        </button>
        {place.is_favorite ? (
          <span className={styles.placeFavBadge}>
            <Icon name="heart-filled" size={10} />
            Favorito
          </span>
        ) : null}
      </div>
      <div className={styles.placeBody}>
        <strong className={styles.placeName}>{place.name}</strong>
        <div className={styles.placeRow}>
          <span className={styles.placeMeta}>
            {cuisine} · {price}
          </span>
          <span className={styles.placeRating}>
            <Icon name="star" size={12} className={styles.placeStarIcon} />
            {rating}
          </span>
        </div>
        <div className={styles.placeFooter}>
          <div className={styles.placeTags}>
            {tags.map((tag) => (
              <span
                key={tag}
                className={`${styles.placeTag} ${
                  styles[`placeTag_${tag.toLowerCase().replace('â', 'a').replace('ô', 'o')}`] ?? ''
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <span className={styles.placeDistance}>
            <Icon name="pin" size={10} />
            {distanceLabel(index)} · {neighborhoodLabel(index)}
          </span>
        </div>
      </div>
    </article>
  )
}
