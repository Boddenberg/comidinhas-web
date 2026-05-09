import { useEffect, useState } from 'react'
import { Icon } from '@/shared/ui/Icon/Icon'
import type { GooglePlaceDetail, GooglePlacePhoto } from '../types'
import styles from './AiPickReveal.module.css'

type AiPickRevealProps = {
  detail: GooglePlaceDetail
  motivo?: string | null
  onSave: () => void | Promise<void>
  onTryAgain?: () => void
  onClose: () => void
  saving?: boolean
  saveError?: string | null
}

function getPhotoUrl(photo: GooglePlacePhoto | string) {
  if (typeof photo === 'string') return photo
  return photo.url ?? photo.uri ?? photo.photo_uri ?? null
}

function buildGallery(detail: GooglePlaceDetail): string[] {
  const seen = new Set<string>()
  const urls: string[] = []
  function add(url: string | null | undefined) {
    if (!url || seen.has(url)) return
    seen.add(url)
    urls.push(url)
  }
  add(detail.cover_photo_uri)
  add(detail.photo_uri)
  detail.photos?.forEach((photo) => add(getPhotoUrl(photo)))
  return urls
}

function formatCategory(detail: GooglePlaceDetail) {
  const raw = detail.primary_type_display_name ?? detail.primary_type
  if (!raw) return 'Restaurante'
  if (raw.toLowerCase() === 'restaurant') return 'Restaurante'
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatPrice(detail: GooglePlaceDetail) {
  if (detail.price_range) return '$'.repeat(detail.price_range)
  if (!detail.price_level) return '$$$'
  if (detail.price_level.includes('INEXPENSIVE')) return '$$'
  if (detail.price_level.includes('MODERATE')) return '$$$'
  if (detail.price_level.includes('EXPENSIVE')) return '$$$$'
  return '$$$'
}

function formatRating(rating?: number | null) {
  if (rating == null) return 'Sem nota'
  return rating.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })
}

function formatReviewCount(count?: number | null) {
  if (!count) return null
  return count.toLocaleString('pt-BR')
}

function getOpenStatus(detail: GooglePlaceDetail) {
  if (detail.open_now === true) return { label: 'Aberto agora', open: true }
  if (detail.open_now === false) return { label: 'Fechado agora', open: false }
  return { label: 'Sem horário', open: null as boolean | null }
}

function buildMatchScore(detail: GooglePlaceDetail) {
  const ratingScore = Math.min(100, Math.round(((detail.rating ?? 4) / 5) * 100))
  const reviewBoost = Math.min(8, Math.floor((detail.user_rating_count ?? 0) / 250))
  const score = Math.max(72, Math.min(99, ratingScore + reviewBoost))
  return score
}

export function AiPickReveal({
  detail,
  motivo,
  onSave,
  onTryAgain,
  onClose,
  saving,
  saveError,
}: AiPickRevealProps) {
  const gallery = buildGallery(detail)
  const [activeIdx, setActiveIdx] = useState(0)
  const photo = gallery[activeIdx] ?? null
  const cuisine = formatCategory(detail)
  const price = formatPrice(detail)
  const rating = formatRating(detail.rating)
  const reviewCount = formatReviewCount(detail.user_rating_count)
  const openStatus = getOpenStatus(detail)
  const matchScore = buildMatchScore(detail)

  useEffect(() => {
    if (gallery.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveIdx((current) => (current + 1) % gallery.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [gallery.length])

  return (
    <div className={styles.reveal}>
      <div className={styles.cinematic}>
        {photo ? (
          <img
            alt={detail.display_name}
            className={styles.cinematicPhoto}
            key={photo}
            src={photo}
          />
        ) : (
          <div className={styles.cinematicFallback}>
            <Icon name="utensils" size={64} />
          </div>
        )}

        <span className={styles.cinematicShade} aria-hidden="true" />
        <span className={styles.cinematicAura} aria-hidden="true" />
        <span className={styles.cinematicGrid} aria-hidden="true" />
        <span className={styles.cinematicBeam} aria-hidden="true" />

        <div className={styles.cinematicHeader}>
          <span className={styles.aiChip}>
            <span className={styles.aiChipDot} aria-hidden="true" />
            ESCOLHA DA IA
          </span>
          <div className={styles.cinematicHeaderRight}>
            <span className={styles.matchScore} aria-label={`Match de ${matchScore} por cento`}>
              <Icon name="sparkles" size={12} />
              {matchScore}% match
            </span>
            <button
              aria-label="Fechar"
              className={styles.closeFloat}
              onClick={onClose}
              type="button"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        <div className={styles.cinematicFoot}>
          <span className={styles.revealEyebrow}>
            ✨ A gente analisou e escolheu este aqui
          </span>
          <h2 className={styles.cinematicName}>{detail.display_name}</h2>
          <p className={styles.cinematicAddress}>
            <Icon name="pin" size={14} />
            {detail.formatted_address ?? 'Endereço indisponível'}
          </p>
        </div>

        {gallery.length > 1 ? (
          <div className={styles.cinematicDots} role="tablist" aria-label="Foto">
            {gallery.slice(0, 6).map((url, idx) => (
              <button
                aria-label={`Foto ${idx + 1}`}
                aria-selected={idx === activeIdx}
                className={`${styles.cinematicDot} ${
                  idx === activeIdx ? styles.cinematicDotActive : ''
                }`}
                key={url}
                onClick={() => setActiveIdx(idx)}
                role="tab"
                type="button"
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.statsRow}>
        <span className={`${styles.stat} ${styles.statCuisine}`}>
          <Icon name="utensils" size={14} />
          <span>
            <small>Cozinha</small>
            <strong>{cuisine}</strong>
          </span>
        </span>
        <span className={`${styles.stat} ${styles.statRating}`}>
          <Icon name="star" size={14} />
          <span>
            <small>Avaliação</small>
            <strong>
              {rating}
              {reviewCount ? <em>· {reviewCount}</em> : null}
            </strong>
          </span>
        </span>
        <span className={`${styles.stat} ${styles.statPrice}`}>
          <Icon name="wallet" size={14} />
          <span>
            <small>Faixa</small>
            <strong>{price}</strong>
          </span>
        </span>
        <span
          className={`${styles.stat} ${styles.statOpen}`}
          data-open={openStatus.open === true}
          data-closed={openStatus.open === false}
        >
          <Icon name="clock" size={14} />
          <span>
            <small>Status</small>
            <strong>{openStatus.label}</strong>
          </span>
        </span>
      </div>

      {motivo ? (
        <article className={styles.reasonCard}>
          <header>
            <span className={styles.reasonBadge}>
              <Icon name="sparkles" size={12} />
              POR QUE ESSA ESCOLHA?
            </span>
          </header>
          <p>“{motivo}”</p>
        </article>
      ) : null}

      {gallery.length > 1 ? (
        <div className={styles.thumbStrip} aria-hidden="true">
          {gallery.slice(0, 8).map((url, idx) => (
            <button
              className={`${styles.thumb} ${idx === activeIdx ? styles.thumbActive : ''}`}
              key={url}
              onClick={() => setActiveIdx(idx)}
              type="button"
              aria-label={`Foto ${idx + 1}`}
            >
              <img alt="" src={url} />
            </button>
          ))}
        </div>
      ) : null}

      {saveError ? <p className={styles.error}>{saveError}</p> : null}

      <div className={styles.actions}>
        {onTryAgain ? (
          <button
            className={styles.tryAgain}
            disabled={saving}
            onClick={onTryAgain}
            type="button"
          >
            <Icon name="sparkles" size={14} />
            <span>Outra ideia</span>
          </button>
        ) : null}
        <button
          className={styles.save}
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          <Icon name="bookmark-filled" size={14} />
          <span>{saving ? 'Salvando…' : 'Salvar pra depois'}</span>
        </button>
        {detail.google_maps_uri ? (
          <a
            className={styles.cta}
            href={detail.google_maps_uri}
            rel="noreferrer"
            target="_blank"
          >
            <span className={styles.ctaCopy}>
              <strong>Bora pra lá!</strong>
              <small>Abre rota no Google Maps</small>
            </span>
            <Icon name="arrow-right" size={18} className={styles.ctaArrow} />
          </a>
        ) : (
          <span className={styles.ctaDisabled}>
            <span className={styles.ctaCopy}>
              <strong>Sem rota disponível</strong>
              <small>O Google Maps não retornou link</small>
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
