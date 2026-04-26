import { formatOpenNow, formatPriceLevel } from '../lib/placeFormatters'
import type { RestaurantPlace } from '../types'
import styles from './RestaurantCard.module.css'

interface RestaurantCardProps {
  place: RestaurantPlace
}

function formatPrimaryTypeLabel(primaryType?: string | null) {
  return (primaryType ?? 'restaurant').replace(/_/g, ' ')
}

function formatReviewCount(reviewCount?: number | null) {
  if (reviewCount === undefined || reviewCount === null) {
    return 'Sem reviews'
  }

  return `${new Intl.NumberFormat('pt-BR').format(reviewCount)} avaliacoes`
}

export function RestaurantCard({ place }: RestaurantCardProps) {
  const primaryAttribution = place.photo_attributions[0]

  return (
    <article className={`surfaceCard ${styles.card}`}>
      <div
        aria-hidden="true"
        className={styles.cover}
        style={place.photo_uri ? { backgroundImage: `url(${place.photo_uri})` } : undefined}
      >
        <div className={styles.coverTop}>
          <span className={styles.typeBadge}>{formatPrimaryTypeLabel(place.primary_type)}</span>

          {place.rating !== undefined && place.rating !== null ? (
            <span className={styles.ratingBadge}>★ {place.rating.toFixed(1)}</span>
          ) : null}
        </div>

        <span className={styles.coverHint}>{formatOpenNow(place.open_now)}</span>

        {!place.photo_uri ? (
          <span className={styles.fallbackBadge}>{place.display_name[0]}</span>
        ) : null}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>{place.display_name}</h2>
          <p className={styles.address}>{place.formatted_address ?? 'Endereco indisponivel'}</p>
        </div>

        <div className={styles.metaGrid}>
          <span className={styles.metaPill}>{formatPriceLevel(place.price_level)}</span>
          <span className={styles.metaPill}>{formatReviewCount(place.user_rating_count)}</span>
          <span className={styles.metaPill}>
            {place.location.latitude.toFixed(2)}, {place.location.longitude.toFixed(2)}
          </span>
        </div>

        {primaryAttribution ? (
          <div className={styles.attribution}>
            {primaryAttribution.uri ? (
              <a
                className={styles.attributionLink}
                href={primaryAttribution.uri}
                rel="noreferrer"
                target="_blank"
              >
                Foto por {primaryAttribution.display_name}
              </a>
            ) : (
              <span className={styles.attributionText}>Foto por {primaryAttribution.display_name}</span>
            )}
          </div>
        ) : null}

        <div className={styles.actions}>
          {place.google_maps_uri ? (
            <a className={styles.link} href={place.google_maps_uri} rel="noreferrer" target="_blank">
              Ver no Google Maps
            </a>
          ) : null}

          {place.website_uri ? (
            <a className={styles.linkSecondary} href={place.website_uri} rel="noreferrer" target="_blank">
              Abrir site
            </a>
          ) : null}

          {place.phone_number ? <span className={styles.phone}>{place.phone_number}</span> : null}
        </div>
      </div>
    </article>
  )
}
