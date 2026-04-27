import { Icon } from '@/shared/ui/Icon/Icon'
import { useState } from 'react'
import { updatePlace } from '../services/placesService'
import { PLACE_STATUS_LABELS, type Place, type PlaceStatus } from '../types'
import { StatusSwitcher } from './StatusSwitcher'
import styles from './PlaceCard.module.css'

type PlaceCardProps = {
  place: Place
  onUpdated?: (place: Place) => void
}

const PRICE_SYMBOL: Record<number, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
}

const STATUS_TONE: Record<PlaceStatus, string> = {
  quero_ir: styles.tone_quero_ir,
  fomos: styles.tone_fomos,
  quero_voltar: styles.tone_quero_voltar,
  nao_curti: styles.tone_nao_curti,
}

export function PlaceCard({ onUpdated, place }: PlaceCardProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [favorite, setFavorite] = useState(place.is_favorite)
  const [status, setStatus] = useState<PlaceStatus>(place.status)

  async function handleStatusChange(next: PlaceStatus) {
    if (busy || next === status) return
    setStatus(next)
    setBusy(true)
    try {
      const updated = await updatePlace(place.id, { status: next })
      onUpdated?.(updated)
    } catch {
      setStatus(place.status)
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleFavorite() {
    if (busy) return
    const next = !favorite
    setFavorite(next)
    setBusy(true)
    try {
      const updated = await updatePlace(place.id, { is_favorite: next })
      onUpdated?.(updated)
    } catch {
      setFavorite(!next)
    } finally {
      setBusy(false)
    }
  }

  const cuisine = place.category ?? 'Sem categoria'
  const price = place.price_range ? PRICE_SYMBOL[place.price_range] : '—'

  return (
    <article className={styles.card}>
      <div className={styles.thumb}>
        {place.image_url ? (
          <img alt={place.name} loading="lazy" src={place.image_url} />
        ) : (
          <div className={styles.thumbFallback}>
            <Icon name="bookmark" size={24} />
          </div>
        )}
        <button
          aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={`${styles.favoriteButton} ${favorite ? styles.favoriteActive : ''}`}
          disabled={busy}
          onClick={handleToggleFavorite}
          type="button"
        >
          <Icon name={favorite ? 'heart-filled' : 'heart'} size={16} />
        </button>
      </div>

      <div className={styles.body}>
        <header className={styles.head}>
          <strong className={styles.name}>{place.name}</strong>
          <span className={styles.meta}>
            {cuisine} · {price}
          </span>
        </header>

        <div className={styles.footer}>
          {place.rating ? (
            <span className={styles.rating}>
              <Icon name="star" size={13} className={styles.ratingIcon} />
              {place.rating.toFixed(1).replace('.', ',')}
            </span>
          ) : (
            <span className={styles.rating}>—</span>
          )}
          <button
            className={`${styles.statusChip} ${STATUS_TONE[status]}`}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {PLACE_STATUS_LABELS[status]}
          </button>
        </div>

        {open ? (
          <div className={styles.statusPanel}>
            <span className={styles.statusPanelLabel}>Atualizar como:</span>
            <StatusSwitcher
              disabled={busy}
              onChange={(next) => {
                handleStatusChange(next)
                setOpen(false)
              }}
              size="sm"
              value={status}
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}
