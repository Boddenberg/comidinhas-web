import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { Icon } from '@/shared/ui/Icon/Icon'
import { PlaceCard } from '../components/PlaceCard'
import { listPlaces } from '../services/placesService'
import {
  PLACE_STATUS_LABELS,
  type Place,
  type PlaceStatus,
} from '../types'
import styles from './PlacesListPage.module.css'

type Filter = 'all' | 'favorites' | PlaceStatus

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'quero_ir', label: PLACE_STATUS_LABELS.quero_ir },
  { id: 'fomos', label: PLACE_STATUS_LABELS.fomos },
  { id: 'quero_voltar', label: PLACE_STATUS_LABELS.quero_voltar },
  { id: 'nao_curti', label: PLACE_STATUS_LABELS.nao_curti },
]

export function PlacesListPage() {
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listPlaces({ page_size: 50 })
      .then((result) => {
        if (cancelled) return
        setPlaces(result.items)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(getErrorMessage(err, 'Não foi possível carregar seus lugares.'))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleUpdated(updated: Place) {
    setPlaces((current) => current?.map((p) => (p.id === updated.id ? updated : p)) ?? null)
  }

  const filtered = useMemo(() => {
    if (!places) return []
    let result = places
    if (filter === 'favorites') {
      result = result.filter((place) => place.is_favorite)
    } else if (filter !== 'all') {
      result = result.filter((place) => place.status === filter)
    }

    const term = search.trim().toLowerCase()
    if (term.length > 0) {
      result = result.filter((place) => {
        const haystack = [place.name, place.category, place.neighborhood, place.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(term)
      })
    }
    return result
  }, [filter, places, search])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Nossos lugares</h1>
          <p className={styles.subtitle}>
            {places ? `${places.length} cadastrados` : 'Carregando...'}
          </p>
        </div>
        <Link className={styles.addLink} to="/lugares/novo">
          <Icon name="plus" size={16} /> Cadastrar lugar
        </Link>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name="search" size={16} />
          <input
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, bairro, categoria..."
            type="search"
            value={search}
          />
        </label>

        <div className={styles.filters} role="tablist">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              aria-selected={filter === item.id}
              className={`${styles.filterChip} ${filter === item.id ? styles.filterActive : ''}`}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className={styles.errorState}>{error}</p>
      ) : loading ? (
        <p className={styles.muted}>Buscando seus lugares...</p>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <strong>Nenhum lugar por aqui ainda.</strong>
          <p>
            Que tal começar adicionando o primeiro? A IA pode até sugerir baseado no que cadastrar.
          </p>
          <Button onClick={() => (window.location.href = '/lugares/novo')} variant="primary">
            <Icon name="plus" size={16} /> Cadastrar primeiro lugar
          </Button>
        </div>
      ) : (
        <ul className={styles.grid}>
          {filtered.map((place) => (
            <li key={place.id}>
              <PlaceCard onUpdated={handleUpdated} place={place} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
