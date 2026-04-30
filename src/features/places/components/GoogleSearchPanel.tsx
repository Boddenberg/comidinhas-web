import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import { StatusSwitcher } from './StatusSwitcher'
import {
  autocompletePlaces,
  getGooglePlaceDetails,
  saveGooglePlace,
} from '../services/googleMapsService'
import { getPlace, setPlacePhotoCover, uploadPlacePhoto } from '../services/placesService'
import {
  type GoogleAutocompleteSuggestion,
  type GooglePlaceDetail,
  type GooglePlacePhoto,
  type Place,
  type PlaceStatus,
} from '../types'
import styles from './AddPlace.module.css'

type GoogleSearchPanelProps = {
  onSaved: (place: Place) => void
  initialPlaceId?: string
  initialQuery?: string
  onSelectionChange?: (hasSelection: boolean) => void
}

type GalleryPhoto = {
  id: string
  label: string
  source: 'backend' | 'local'
  url: string
  backendIndex?: number
  coverHint?: boolean
  file?: File
}

function getPhotoUrl(photo: GooglePlacePhoto | string) {
  if (typeof photo === 'string') return photo
  return photo.url ?? photo.uri ?? photo.photo_uri ?? null
}

function getPhotoId(photo: GooglePlacePhoto | string, index: number, url: string) {
  if (typeof photo !== 'string' && photo.id) return photo.id
  return `google-photo-${index}-${url}`
}

function normalizePhotos(detail: GooglePlaceDetail, localPhotos: GalleryPhoto[]) {
  const seen = new Set<string>()
  const photos: GalleryPhoto[] = []
  let backendIndex = 0

  function addPhoto(photo: GalleryPhoto) {
    if (seen.has(photo.url)) return
    seen.add(photo.url)
    if (photo.source === 'backend') {
      photos.push({ ...photo, backendIndex })
      backendIndex += 1
      return
    }
    photos.push(photo)
  }

  ;[detail.cover_photo_uri, detail.photo_uri].forEach((url, index) => {
    if (!url) return
    addPhoto({
      id: index === 0 ? 'cover-photo-uri' : 'legacy-photo-uri',
      label: 'Foto do Google Maps',
      source: 'backend',
      url,
      coverHint: index === 0,
    })
  })

  detail.photos?.forEach((photo, index) => {
    const url = getPhotoUrl(photo)
    if (!url) return
    addPhoto({
      id: getPhotoId(photo, index, url),
      label: `Foto ${index + 1}`,
      source: 'backend',
      url,
      coverHint: typeof photo !== 'string' ? Boolean(photo.capa ?? photo.is_cover) : false,
    })
  })

  localPhotos.forEach(addPhoto)

  return photos
}

function comparablePhotoUrl(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.split('?')[0].split('#')[0]
  }
}

function resolvePersistedCoverPhoto(coverPhoto: GalleryPhoto | undefined, place: Place) {
  if (!coverPhoto) return null

  const persistedPhotos = place.photos.filter((photo) => photo.url)
  const comparableCoverUrl = comparablePhotoUrl(coverPhoto.url)

  return (
    persistedPhotos.find((photo) => photo.id === coverPhoto.id) ??
    persistedPhotos.find((photo) => photo.url === coverPhoto.url) ??
    persistedPhotos.find((photo) => comparablePhotoUrl(photo.url) === comparableCoverUrl) ??
    (coverPhoto.backendIndex !== undefined ? persistedPhotos[coverPhoto.backendIndex] : undefined) ??
    null
  )
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
  return `${count.toLocaleString('pt-BR')} avaliações`
}

function formatOpenNow(openNow?: boolean | null) {
  if (openNow === true) return 'Aberto agora'
  if (openNow === false) return 'Fechado agora'
  return 'Horário indisponível'
}

export function GoogleSearchPanel({
  initialPlaceId,
  initialQuery = '',
  onSaved,
  onSelectionChange,
}: GoogleSearchPanelProps) {
  const { grupo, perfil } = useAuth()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<GoogleAutocompleteSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [selected, setSelected] = useState<GooglePlaceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pendingPlaceId, setPendingPlaceId] = useState(initialPlaceId ?? null)

  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null)
  const [localPhotos, setLocalPhotos] = useState<GalleryPhoto[]>([])
  const [thumbStartIndex, setThumbStartIndex] = useState(0)

  const [status, setStatus] = useState<PlaceStatus>('quero_ir')
  const [favorite, setFavorite] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sessionTokenRef = useRef<string>(crypto.randomUUID())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localObjectUrlsRef = useRef<string[]>([])

  const gallery = selected ? normalizePhotos(selected, localPhotos) : []
  const hintedCoverPhoto = gallery.find((photo) => photo.coverHint)
  const coverPhoto =
    gallery.find((photo) => photo.id === coverPhotoId) ?? hintedCoverPhoto ?? gallery[0]
  const activePhoto = gallery.find((photo) => photo.id === activePhotoId) ?? coverPhoto
  const activePhotoIndex = activePhoto ? gallery.findIndex((photo) => photo.id === activePhoto.id) : -1
  const canCycleThumbs = gallery.length > 4
  const visibleThumbs = canCycleThumbs
    ? Array.from({ length: 4 }, (_, offset) => gallery[(thumbStartIndex + offset) % gallery.length])
    : gallery
  const reviewCount = selected ? formatReviewCount(selected.user_rating_count) : null

  const applySelectedDetail = useCallback((detail: GooglePlaceDetail) => {
    const photos = normalizePhotos(detail, [])
    const firstCover = photos.find((photo) => photo.coverHint) ?? photos[0]

    setSelected(detail)
    setSuggestions([])
    setLocalPhotos([])
    setActivePhotoId(firstCover?.id ?? null)
    setCoverPhotoId(firstCover?.id ?? null)
    setThumbStartIndex(0)
    setFavorite(true)
    setStatus('quero_ir')
    setNotes('')
  }, [])

  useEffect(() => {
    onSelectionChange?.(Boolean(selected) || Boolean(pendingPlaceId))
  }, [onSelectionChange, pendingPlaceId, selected])

  useEffect(() => {
    if (!pendingPlaceId) return undefined

    let cancelled = false
    setDetailLoading(true)
    setSearchError(null)

    getGooglePlaceDetails(pendingPlaceId)
      .then((detail) => {
        if (cancelled) return
        applySelectedDetail(detail)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSearchError(getErrorMessage(err, 'Não foi possível abrir esse lugar.'))
      })
      .finally(() => {
        if (cancelled) return
        setDetailLoading(false)
        setPendingPlaceId(null)
      })

    return () => {
      cancelled = true
    }
  }, [applySelectedDetail, pendingPlaceId])

  useEffect(() => {
    if (gallery.length <= 4) {
      setThumbStartIndex(0)
      return
    }

    setThumbStartIndex((current) => current % gallery.length)
  }, [gallery.length])

  useEffect(() => {
    if (selected || pendingPlaceId) return undefined

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmedQuery = query.trim()

    debounceRef.current = setTimeout(async () => {
      if (trimmedQuery.length < 2) {
        setSuggestions([])
        setLoading(false)
        setSearchError(null)
        return
      }

      setLoading(true)
      setSearchError(null)
      try {
        const result = await autocompletePlaces({
          input: trimmedQuery,
          included_primary_types: ['restaurant', 'food', 'cafe', 'bar'],
          included_region_codes: ['br'],
          session_token: sessionTokenRef.current,
          max_results: 5,
          include_query_predictions: false,
        })
        setSuggestions(result.suggestions ?? [])
      } catch (err: unknown) {
        setSearchError(getErrorMessage(err, 'Não foi possível buscar agora.'))
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, trimmedQuery.length < 2 ? 0 : 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [pendingPlaceId, query, selected])

  useEffect(
    () => () => {
      localObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  async function handlePickSuggestion(suggestion: GoogleAutocompleteSuggestion) {
    if (!suggestion.place_id) return
    setDetailLoading(true)
    setSearchError(null)
    try {
      const detail = await getGooglePlaceDetails(suggestion.place_id)
      applySelectedDetail(detail)
      sessionTokenRef.current = crypto.randomUUID()
    } catch (err: unknown) {
      setSearchError(getErrorMessage(err, 'Não foi possível abrir esse lugar.'))
    } finally {
      setDetailLoading(false)
    }
  }

  function handleResetSelection(nextQuery = '') {
    setPendingPlaceId(null)
    setSelected(null)
    setQuery(nextQuery)
    setSuggestions([])
    setNotes('')
    setStatus('quero_ir')
    setFavorite(true)
    setLocalPhotos([])
    setActivePhotoId(null)
    setCoverPhotoId(null)
    setThumbStartIndex(0)
  }

  function handleEditSelection() {
    handleResetSelection(selected?.display_name ?? query)
  }

  function handleAddPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const photo: GalleryPhoto = {
      file,
      id: `local-${Date.now()}-${file.name}`,
      label: file.name,
      source: 'local',
      url,
    }

    localObjectUrlsRef.current.push(url)
    setLocalPhotos((current) => [...current, photo])
    setActivePhotoId(photo.id)
    setThumbStartIndex(gallery.length)
    if (!coverPhotoId) setCoverPhotoId(photo.id)
    event.target.value = ''
  }

  function handleSetCover() {
    if (!activePhoto) return
    setCoverPhotoId(activePhoto.id)
  }

  function handleThumbStep(direction: -1 | 1) {
    if (!canCycleThumbs) return
    const nextIndex = (thumbStartIndex + direction + gallery.length) % gallery.length
    setThumbStartIndex(nextIndex)
    setActivePhotoId(gallery[nextIndex]?.id ?? null)
  }

  async function handleSave() {
    if (!selected || !grupo) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveGooglePlace(grupo.id, {
        place_id: selected.place_id,
        status,
        is_favorite: favorite,
        notes: notes.trim() || undefined,
        added_by_profile_id: perfil?.id,
      })
      const localUploads = gallery.filter((photo) => photo.source === 'local' && photo.file)

      if (localUploads.length > 0) {
        await Promise.all(
          localUploads.map((photo) =>
            uploadPlacePhoto(saved.id, photo.file as File, photo.id === coverPhoto?.id),
          ),
        )
      }

      let hydratedPlace = await getPlace(saved.id)
      const selectedPersistedCover = resolvePersistedCoverPhoto(coverPhoto, hydratedPlace)

      if (selectedPersistedCover && !selectedPersistedCover.capa) {
        await setPlacePhotoCover(saved.id, selectedPersistedCover.id)
        hydratedPlace = await getPlace(saved.id)
      }

      onSaved(hydratedPlace)
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, 'Não foi possível salvar agora.'))
    } finally {
      setSaving(false)
    }
  }

  if (!selected) {
    if (detailLoading || pendingPlaceId) {
      return (
        <div className={styles.placeLoading}>
          <span className={styles.placeLoadingIcon}>
            <Icon name="sparkles" size={22} />
          </span>
          <div>
            <strong>Abrindo detalhes do restaurante</strong>
            <p>Estamos trazendo fotos, endereço e sinais do Google Maps.</p>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.panel}>
        <label className={styles.searchField}>
          <Icon name="search" size={18} />
          <input
            autoFocus
            className={styles.searchInput}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar restaurante, bar, café..."
            type="search"
            value={query}
          />
        </label>

        {searchError ? <p className={styles.error}>{searchError}</p> : null}
        {loading ? <p className={styles.loadingText}>Buscando...</p> : null}

        {suggestions.length > 0 ? (
          <ul className={styles.suggestions}>
            {suggestions
              .filter((item) => item.type === 'place' && item.place_id)
              .map((item) => (
                <li key={item.place_id}>
                  <button
                    className={styles.suggestionItem}
                    disabled={detailLoading}
                    onClick={() => handlePickSuggestion(item)}
                    type="button"
                  >
                    <span className={styles.suggestionMain}>
                      {item.main_text?.text ?? item.text?.text}
                    </span>
                    <span className={styles.suggestionSub}>
                      {item.secondary_text?.text ?? ''}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        ) : null}

        {!loading && query.trim().length >= 2 && suggestions.length === 0 && !searchError ? (
          <p className={styles.emptyText}>Nada encontrado por aqui.</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.placeConfirm}>
      <section className={styles.galleryColumn} aria-label="Fotos do restaurante">
        <div className={styles.heroPhoto}>
          {activePhoto ? (
            <img alt={selected.display_name} src={activePhoto.url} />
          ) : (
            <span className={styles.photoFallback}>{selected.display_name.slice(0, 1)}</span>
          )}

          <div className={styles.heroPhotoShade} aria-hidden="true" />

          {gallery.length > 0 ? (
            <span className={styles.photoCounter}>
              {activePhotoIndex + 1} / {gallery.length}
            </span>
          ) : null}

          {activePhoto ? (
            <button className={styles.coverButton} onClick={handleSetCover} type="button">
              <Icon name="star" size={15} />
              {activePhoto.id === coverPhoto?.id ? 'Foto de capa' : 'Definir como capa'}
            </button>
          ) : null}
        </div>

        <div className={styles.thumbStrip}>
          <div className={styles.thumbCarousel}>
            {canCycleThumbs ? (
              <button
                aria-label="Fotos anteriores"
                className={`${styles.thumbStep} ${styles.thumbStepPrev}`}
                onClick={() => handleThumbStep(-1)}
                type="button"
              >
                <Icon name="chevron-left" size={16} />
              </button>
            ) : null}

            <div className={styles.thumbRow}>
              {visibleThumbs.map((photo) => (
                <button
                  aria-label={`Ver ${photo.label}`}
                  className={styles.thumbButton}
                  data-active={photo.id === activePhoto?.id}
                  key={photo.id}
                  onClick={() => setActivePhotoId(photo.id)}
                  type="button"
                >
                  <img alt="" src={photo.url} />
                  {photo.id === coverPhoto?.id ? (
                    <span className={styles.thumbCheck}>
                      <Icon name="circle-check" size={18} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {canCycleThumbs ? (
              <button
                aria-label="Próximas fotos"
                className={`${styles.thumbStep} ${styles.thumbStepNext}`}
                onClick={() => handleThumbStep(1)}
                type="button"
              >
                <Icon name="chevron-right" size={16} />
              </button>
            ) : null}
          </div>

          <label className={styles.addPhotoButton}>
            <Icon name="image-plus" size={21} />
            <span>Adicionar foto</span>
            <input accept="image/*" onChange={handleAddPhoto} type="file" />
          </label>
        </div>

        {coverPhoto ? (
          <p className={styles.coverHint}>
            <Icon name="sparkles" size={12} />
            Esta será a foto de capa do lugar
          </p>
        ) : null}
      </section>

      <section className={styles.detailsColumn}>
        <div className={styles.confirmToolbar}>
          <span className={styles.sourceChip}>
            <img alt="" src="/btn-google-maps.png" />
            Google Maps
          </span>
          <button className={styles.editPlaceButton} onClick={handleEditSelection} type="button">
            <Icon name="pencil" size={15} />
            Editar
          </button>
        </div>

        <header className={styles.confirmHeader}>
          <h3>{selected.display_name}</h3>
          <p>
            <Icon name="pin" size={16} />
            {selected.formatted_address ?? 'Endereço indisponível'}
          </p>
        </header>

        <div className={styles.detailMeta}>
          <span>
            <Icon name="utensils" size={15} />
            {formatCategory(selected)}
          </span>
          <span>
            <Icon name="star" size={14} />
            {formatRating(selected.rating)}
            {reviewCount ? <small>{reviewCount}</small> : null}
          </span>
          <span className={styles.priceChip}>{formatPrice(selected)}</span>
          <span className={styles.openChip} data-open={selected.open_now === true}>
            <Icon name="clock" size={14} />
            {formatOpenNow(selected.open_now)}
          </span>
        </div>

        <section className={styles.decisionPanel}>
          <div>
            <span className={styles.panelEyebrow}>Decisão do casal</span>
            <h4>Como esse lugar entra na nossa lista?</h4>
          </div>
          <StatusSwitcher onChange={setStatus} value={status} />
        </section>

        <section className={styles.couplePanel}>
          <div className={styles.favoriteRow}>
            <span>
              <Icon name={favorite ? 'heart-filled' : 'heart'} size={21} />
              Favorito do casal
            </span>

            <button
              aria-checked={favorite}
              className={styles.favoriteToggle}
              data-active={favorite}
              onClick={() => setFavorite((current) => !current)}
              role="switch"
              type="button"
            >
              <span />
            </button>
          </div>

          <label className={styles.notesField}>
            <textarea
              maxLength={300}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observações opcionais para vocês dois..."
              value={notes}
            />
            <span>{notes.length}/300</span>
          </label>
        </section>

        {saveError ? <p className={styles.error}>{saveError}</p> : null}

        <div className={styles.confirmActions}>
          <button className={styles.rejectButton} onClick={() => handleResetSelection()} type="button">
            <Icon name="x" size={17} />
            Não é esse
          </button>

          {selected.google_maps_uri ? (
            <a
              className={styles.mapsLink}
              href={selected.google_maps_uri}
              rel="noreferrer"
              target="_blank"
            >
              Ver no Google Maps
              <Icon name="external-link" size={16} />
            </a>
          ) : (
            <span className={styles.mapsLinkDisabled}>Ver no Google Maps</span>
          )}

          <button
            className={styles.confirmButton}
            disabled={saving || !grupo}
            onClick={handleSave}
            type="button"
          >
            {saving ? 'Salvando...' : 'Sim, adicionar lugar'}
            <Icon name="sparkles" size={16} />
          </button>
        </div>
      </section>
    </div>
  )
}
