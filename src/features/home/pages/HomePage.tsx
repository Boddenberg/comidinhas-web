import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import type { Grupo, Perfil } from '@/features/auth/types'
import { useAddPlace } from '@/features/places/AddPlaceContext'
import {
  PLACE_STATUS_LABELS,
  type Place,
  type PlaceStatus,
} from '@/features/places/types'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import mapPreviewImage from '../../../../imagem horizontal maps.png'
import { fetchHome, type HomeDashboard } from '../services/homeService'
import styles from './HomePage.module.css'

const aiTiles = [
  {
    id: 'humor',
    label: 'Humor',
    value: 'Aventureiros',
    emoji: '😎',
    tone: 'purple',
  },
  {
    id: 'tipo',
    label: 'Tipo de comida',
    value: 'Qualquer',
    emoji: '🍕',
    tone: 'pink',
  },
  {
    id: 'clima',
    label: 'Clima',
    value: 'Fresco',
    emoji: '🍃',
    tone: 'blue',
  },
  {
    id: 'orcamento',
    label: 'Orçamento',
    value: 'Até R$120',
    emoji: '💵',
    tone: 'green',
  },
] as const

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

function isPersonalGroup(grupo: Grupo | null | undefined, perfil: Perfil | null) {
  if (!grupo) return false
  return grupo.tipo === 'individual' || grupo.id === perfil?.grupo_individual_id
}

function getProfileLabel(grupo: Grupo | null | undefined, perfil: Perfil | null) {
  if (!grupo) return 'Perfil selecionado'
  if (isPersonalGroup(grupo, perfil)) {
    return perfil?.nome?.trim() || grupo.nome || 'Meu perfil'
  }
  return grupo.nome || 'Grupo'
}

function formatRelativeTime(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months === 1) return 'há 1 mês'
  return `há ${months} meses`
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

export function HomePage() {
  const { perfil, grupo } = useAuth()
  const { open: openAddPlace, registerOnCreated } = useAddPlace()
  const navigate = useNavigate()

  const [home, setHome] = useState<HomeDashboard | null>(null)
  const [homeError, setHomeError] = useState<string | null>(null)
  const [homeLoading, setHomeLoading] = useState(true)
  const [paraVocesFilter, setParaVocesFilter] = useState<ParaVocesFilter>('todos')

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
    registerOnCreated(() => {
      if (!grupo) return
      fetchHome(grupo.id, 8)
        .then((result) => setHome(result))
        .catch(() => undefined)
    })
    return () => registerOnCreated(null)
  }, [grupo, registerOnCreated])

  function handleDecide() {
    navigate('/chat')
  }

  const allPlaces = useMemo(() => {
    if (!home) return []
    return uniquePlaces(home.latest_places, home.top_favorites, home.want_to_go, home.want_to_return)
  }, [home])

  const suggestions = useMemo(() => allPlaces.slice(0, 3), [allPlaces])

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

  const recentActivity = useMemo(() => {
    if (!home) return []
    return home.latest_places.slice(0, 3).map((place) => ({
      id: place.id,
      image: place.image_url,
      name: place.name,
      status: place.status,
      when: formatRelativeTime(place.updated_at ?? place.created_at ?? ''),
    }))
  }, [home])

  const activeProfileName = getProfileLabel(grupo, perfil)

  return (
    <div className={styles.layout}>
      {/* === Main column === */}
      <div className={styles.mainCol}>
        {/* Hero card */}
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>
              Qual vai ser{' '}
              <span className={styles.heroHearts} aria-hidden="true">
                <Icon name="heart-filled" size={26} />
              </span>
              <br />o rolê de hoje?
            </h1>
            <p className={styles.heroSubtitle}>
              Descobrimos lugares incríveis<br />com o seu gosto e o clima de agora.
            </p>
            <button
              type="button"
              className={styles.heroCta}
              onClick={handleDecide}
            >
              <Icon name="sparkles" size={15} />
              <span>Surpreenda a gente, IA!</span>
              <Icon name="arrow-right" size={15} />
            </button>
          </div>
          <div className={styles.heroIllustration} aria-hidden="true">
            {/* Placeholder for the central banner illustration */}
            <div className={styles.heroPlaceholder}>
              <span>Imagem do banner central</span>
            </div>
          </div>
          <span className={styles.heroSign} aria-hidden="true">
            <span className={styles.heroSignText}>
              boa <strong>comida</strong>
              <br />
              <em>bons momentos</em>
            </span>
          </span>
        </section>

        {/* Combina com hoje */}
        <section className={styles.suggestSection}>
          <header className={styles.suggestHeader}>
            <div className={styles.sectionLabel}>
              <span className={styles.sparkAccent}>
                <Icon name="sparkles" size={14} />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Combina com hoje</h2>
                <p className={styles.sectionMuted}>
                  Sugestões especiais para o clima e seu humor
                </p>
              </div>
            </div>
          </header>

          <div className={styles.suggestRow}>
            {homeLoading
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <article key={`sk-${idx}`} className={`${styles.suggestCard} ${styles.skeletonCard}`} aria-hidden="true">
                    <span className={styles.suggestThumb} />
                    <div className={styles.suggestBody}>
                      <span className={styles.skeletonLine} />
                      <span className={styles.skeletonLineShort} />
                    </div>
                  </article>
                ))
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
                    <SuggestionCard key={place.id} place={place} index={idx} />
                  ))}

            {suggestions.length > 0 ? (
              <button
                type="button"
                className={styles.suggestNext}
                aria-label="Ver mais sugestões"
                onClick={() => navigate('/lugares')}
              >
                <Icon name="chevron-right" size={18} />
              </button>
            ) : null}
          </div>

          <div className={styles.suggestFooter}>
            <Link to="/lugares" className={styles.sectionLink}>
              Ver todas
            </Link>
          </div>
        </section>

        {/* Para vocês */}
        <section className={styles.paraVocesSection}>
          <header className={styles.paraVocesHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                Para vocês <span className={styles.titleHeart} aria-hidden="true">💗</span>
              </h2>
              <p className={styles.sectionMuted}>
                Lugares que combinam com o perfil de vocês
              </p>
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
                Ver todos
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
                <ParaVocesCard key={place.id} place={place} index={idx} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* === Side column === */}
      <aside className={styles.sideCol}>
        {/* IA Decide para vocês */}
        <section className={styles.aiCard}>
          <header className={styles.aiCardHeader}>
            <span className={styles.aiCardTitle}>
              <span className={styles.sparkAccent}>
                <Icon name="sparkles" size={13} />
              </span>
              IA Decide para vocês
            </span>
            <Icon name="heart-filled" size={14} className={styles.aiCardHeart} />
          </header>

          <div className={styles.aiTilesGrid}>
            {aiTiles.map((tile) => (
              <div
                key={tile.id}
                className={`${styles.aiTile} ${styles[`aiTile_${tile.tone}`]}`}
              >
                <span className={styles.aiTileLabel}>{tile.label}</span>
                <span className={styles.aiTileValue}>
                  {tile.value} <span className={styles.aiTileEmoji}>{tile.emoji}</span>
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.aiCardButton}
            onClick={handleDecide}
          >
            <span>Decidir agora</span>
            <Icon name="sparkles" size={14} />
          </button>

          <p className={styles.aiCardFooter}>
            Baseado no perfil <strong>{activeProfileName}</strong>
          </p>
        </section>

        {/* Discover area */}
        <div className={styles.discoverGrid}>
          <section className={styles.mapCard}>
            <div className={styles.mapPreview} aria-hidden="true">
              <img className={styles.mapPreviewImage} alt="" src={mapPreviewImage} />
            </div>
            <div className={styles.mapBody}>
              <div className={styles.mapTitle}>
                <span className={styles.mapPinIcon}>
                  <Icon name="pin" size={14} />
                </span>
                <strong>Descubra por perto</strong>
              </div>
              <p className={styles.mapMuted}>Vila Madalena, Pinheiros e arredores</p>
              <button
                type="button"
                className={styles.mapButton}
                onClick={() => navigate('/explorar')}
              >
                Explorar no mapa <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </section>

          <section className={styles.weatherCard}>
            <span className={styles.weatherStars} aria-hidden="true">
              <span className={styles.weatherStarA} />
              <span className={styles.weatherStarB} />
              <span className={styles.weatherStarC} />
            </span>
            <span className={styles.weatherMoon} aria-hidden="true">
              {/* placeholder for moon image */}
              <div className={styles.moonPlaceholder}>
                <Icon name="moon" size={32} />
              </div>
            </span>
            <p className={styles.weatherLabel}>Clima agora em São Paulo</p>
            <strong className={styles.weatherTemp}>23°C</strong>
            <p className={styles.weatherDescription}>Céu limpo com<br />vento leve</p>
          </section>

          <section className={styles.googleMapsCard}>
            <div className={styles.googleMapsCopy}>
              <strong>Salvar no</strong>
              <strong>Google Maps</strong>
            </div>
            <span className={styles.googleMapsIcon} aria-hidden="true">
              <GoogleMapsPin />
            </span>
          </section>
        </div>

        {/* Atividade recente */}
        <section className={styles.activityCard}>
          <header className={styles.activityHeader}>
            <h2 className={styles.activityTitle}>Atividade recente</h2>
            <Link to="/lugares" className={styles.sectionLinkSmall}>
              Ver tudo <Icon name="arrow-right" size={12} />
            </Link>
          </header>

          {recentActivity.length === 0 ? (
            <p className={styles.activityEmpty}>
              Nenhuma atividade ainda. Comecem adicionando lugares.
            </p>
          ) : (
            <ul className={styles.activityList}>
              {recentActivity.map((item) => (
                <li key={item.id} className={styles.activityItem}>
                  <span className={styles.activityThumb} aria-hidden="true">
                    {item.image ? <img alt="" src={item.image} /> : null}
                  </span>
                  <div className={styles.activityBody}>
                    <span className={styles.activityText}>
                      {PLACE_STATUS_LABELS[item.status as PlaceStatus]} – {item.name}
                    </span>
                    <span className={styles.activityWhen}>{item.when}</span>
                  </div>
                  <span className={styles.activityIcon} aria-hidden="true">
                    <Icon
                      name={item.status === 'fomos' ? 'bookmark-filled' : 'heart-filled'}
                      size={14}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className={styles.activityButton}
            onClick={() => navigate('/lugares')}
          >
            Ver todas as atividades
          </button>
        </section>
      </aside>
    </div>
  )
}

function SuggestionCard({ place, index }: { place: Place; index: number }) {
  const tag = tagFor(index)
  const cuisine = place.category ?? 'Sem categoria'
  const price = priceLabel(place.price_range)
  const rating = formatRating(place.rating)
  const isBookmark = index === 2

  return (
    <article className={styles.suggestCard}>
      <div className={styles.suggestThumb}>
        {place.image_url ? (
          <img alt={place.name} loading="lazy" src={place.image_url} />
        ) : (
          <div className={styles.suggestThumbFallback}>
            <Icon name="utensils" size={26} />
          </div>
        )}
        <span className={`${styles.suggestTag} ${styles[`suggestTag_${tag.toLowerCase().replace('â', 'a').replace('ô', 'o')}`]}`}>
          {tag.toUpperCase()}
        </span>
        <button
          type="button"
          className={styles.suggestSave}
          aria-label={isBookmark ? 'Salvar' : 'Favoritar'}
        >
          <Icon
            name={isBookmark ? 'bookmark-filled' : 'heart-filled'}
            size={13}
          />
        </button>
      </div>
      <div className={styles.suggestBody}>
        <strong className={styles.suggestName}>{place.name}</strong>
        <div className={styles.suggestRow2}>
          <span className={styles.suggestMeta}>
            {cuisine} · {price}
          </span>
          <span className={styles.suggestRating}>
            <Icon name="star" size={11} className={styles.suggestStarIcon} />
            {rating}
          </span>
        </div>
      </div>
    </article>
  )
}

function ParaVocesCard({ place, index }: { place: Place; index: number }) {
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
            <Icon name="utensils" size={26} />
          </div>
        )}
        <button
          type="button"
          className={styles.placeFavorite}
          aria-label="Favoritar"
        >
          <Icon name={place.is_favorite ? 'heart-filled' : 'heart'} size={13} />
        </button>
      </div>
      <div className={styles.placeBody}>
        <strong className={styles.placeName}>{place.name}</strong>
        <div className={styles.placeRow}>
          <span className={styles.placeMeta}>
            {cuisine} · {price}
          </span>
          <span className={styles.placeRating}>
            <Icon name="star" size={11} className={styles.placeStarIcon} />
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
            {distanceLabel(index)} · {neighborhoodLabel(index)}
          </span>
        </div>
      </div>
    </article>
  )
}

function GoogleMapsPin() {
  return (
    <svg
      width="48"
      height="62"
      viewBox="0 0 48 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gmaps-pin" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ea4335" />
          <stop offset="1" stopColor="#bb2d23" />
        </linearGradient>
      </defs>
      <path
        d="M24 2c11 0 20 8.6 20 19.5 0 14.5-20 38.5-20 38.5S4 36 4 21.5C4 10.6 13 2 24 2Z"
        fill="url(#gmaps-pin)"
      />
      <circle cx="24" cy="21" r="9" fill="#fff" />
      <circle cx="24" cy="21" r="5.5" fill="#34a853" />
    </svg>
  )
}
