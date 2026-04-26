import type { FormEvent } from 'react'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { FeedbackState } from '@/shared/ui/FeedbackState/FeedbackState'
import { PageHeader } from '@/shared/ui/PageHeader/PageHeader'
import { NearbyRestaurantsForm } from '../components/NearbyRestaurantsForm'
import { RestaurantCard } from '../components/RestaurantCard'
import { searchNearbyRestaurants } from '../services/googleMapsService'
import type {
  NearbyRestaurantsFilters,
  NearbyRestaurantsRequest,
  RankPreference,
  RestaurantPlace,
} from '../types'
import styles from './NearbyRestaurantsPage.module.css'

const initialFilters: NearbyRestaurantsFilters = {
  latitude: '-23.55052',
  longitude: '-46.633308',
  maxResults: '5',
  radiusMeters: '1500',
  rankPreference: 'POPULARITY',
}

const presets: Array<{
  label: string
  patch: Partial<NearbyRestaurantsFilters>
}> = [
  {
    label: 'Centro SP',
    patch: {
      latitude: '-23.55052',
      longitude: '-46.633308',
      maxResults: '5',
      radiusMeters: '1500',
      rankPreference: 'POPULARITY',
    },
  },
  {
    label: 'Mais perto',
    patch: {
      maxResults: '4',
      radiusMeters: '900',
      rankPreference: 'DISTANCE',
    },
  },
  {
    label: 'Mais opcoes',
    patch: {
      maxResults: '8',
      radiusMeters: '2500',
      rankPreference: 'POPULARITY',
    },
  },
  {
    label: 'Popular agora',
    patch: {
      maxResults: '6',
      radiusMeters: '1800',
      rankPreference: 'POPULARITY',
    },
  },
]

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    })
  })
}

function formatRank(rankPreference: RankPreference) {
  return rankPreference === 'POPULARITY' ? 'Popularidade' : 'Distancia'
}

export function NearbyRestaurantsPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [places, setPlaces] = useState<RestaurantPlace[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function updateFilter<TField extends keyof NearbyRestaurantsFilters>(
    field: TField,
    value: NearbyRestaurantsFilters[TField],
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }))
  }

  function applyPreset(patch: Partial<NearbyRestaurantsFilters>) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...patch,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: NearbyRestaurantsRequest = {
      included_types: ['restaurant'],
      latitude: Number(filters.latitude),
      longitude: Number(filters.longitude),
      max_results: Number(filters.maxResults),
      radius_meters: Number(filters.radiusMeters),
      rank_preference: filters.rankPreference,
    }

    if (
      Number.isNaN(payload.latitude) ||
      Number.isNaN(payload.longitude) ||
      Number.isNaN(payload.radius_meters) ||
      Number.isNaN(payload.max_results)
    ) {
      setErrorMessage('Preencha latitude, longitude, raio e maximo de resultados com numeros validos.')
      return
    }

    setErrorMessage(null)
    setHasSearched(true)
    setIsLoading(true)

    try {
      const response = await searchNearbyRestaurants(payload)
      setPlaces(response.places)
    } catch (error: unknown) {
      setPlaces([])
      setErrorMessage(
        getErrorMessage(error, 'Nao foi possivel buscar restaurantes proximos agora.'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUseCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setErrorMessage('Seu navegador nao suporta geolocalizacao.')
      return
    }

    setErrorMessage(null)
    setIsLocating(true)

    try {
      const position = await getCurrentPosition()

      setFilters((currentFilters) => ({
        ...currentFilters,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
      }))
    } catch {
      setErrorMessage('Nao foi possivel obter sua localizacao atual.')
    } finally {
      setIsLocating(false)
    }
  }

  const shouldShowInitialEmpty = !hasSearched && !isLoading && !errorMessage
  const shouldShowSearchEmpty = hasSearched && !isLoading && places.length === 0 && !errorMessage

  return (
    <section className={styles.page}>
      <PageHeader
        action={<span className={styles.pageBadge}>Busca local pronta</span>}
        description="Use coordenadas reais ou a geolocalizacao do navegador para acionar a busca de restaurantes proximos com uma interface mais alinhada a um app de descoberta."
        eyebrow="Restaurantes proximos"
        title="Explore lugares perto de voce com uma busca mais viva e editorial."
      />

      <section className={`surfaceCard ${styles.spotlight}`}>
        <div className={styles.spotlightCopy}>
          <span className={styles.spotlightLabel}>Modos rapidos</span>
          <h2 className={styles.spotlightTitle}>Alterne entre cenarios comuns sem reconfigurar tudo a cada teste.</h2>
        </div>

        <div className={styles.presetRow}>
          {presets.map((preset) => (
            <button
              key={preset.label}
              className={styles.presetButton}
              onClick={() => applyPreset(preset.patch)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.layout}>
        <NearbyRestaurantsForm
          filters={filters}
          isLoading={isLoading}
          isLocating={isLocating}
          onChange={updateFilter}
          onSubmit={handleSubmit}
          onUseCurrentLocation={handleUseCurrentLocation}
        />

        <section className={`surfaceCard ${styles.resultsPanel}`}>
          <div className={styles.resultsHeader}>
            <div>
              <h2 className={styles.resultsTitle}>Resultados</h2>
              <p className={styles.resultsDescription}>
                A lista abaixo reflete exatamente o retorno do endpoint de nearby restaurants.
              </p>
            </div>

            {places.length > 0 ? (
              <span className="statusPill" data-tone="sage">
                {places.length} lugar(es)
              </span>
            ) : null}
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryPill}>Raio {filters.radiusMeters} m</span>
            <span className={styles.summaryPill}>Maximo {filters.maxResults}</span>
            <span className={styles.summaryPill}>Rank {formatRank(filters.rankPreference)}</span>
          </div>

          {errorMessage ? (
            <FeedbackState
              description={errorMessage}
              title="A busca nao foi concluida"
              variant="error"
            />
          ) : null}

          {isLoading ? (
            <FeedbackState
              description="Estamos consultando o backend e aguardando os lugares proximos."
              title="Buscando restaurantes"
              variant="loading"
            />
          ) : null}

          {shouldShowInitialEmpty ? (
            <FeedbackState
              description="Use os filtros ao lado para iniciar a busca. Os valores iniciais apontam para a regiao central de Sao Paulo."
              title="Pronto para procurar"
              variant="empty"
            />
          ) : null}

          {shouldShowSearchEmpty ? (
            <FeedbackState
              description="Nenhum restaurante foi encontrado com os parametros atuais. Tente aumentar o raio ou mudar as coordenadas."
              title="Nenhum resultado encontrado"
              variant="empty"
            />
          ) : null}

          {places.length > 0 && !isLoading ? (
            <div className={styles.resultsList}>
              {places.map((place) => (
                <RestaurantCard key={place.id} place={place} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}
