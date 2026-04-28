import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import { StatusSwitcher } from './StatusSwitcher'
import {
  autocompletePlaces,
  getGooglePlaceDetails,
  saveGooglePlace,
} from '../services/googleMapsService'
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
  initialQuery?: string
}

type GalleryPhoto = {
  id: string
  label: string
  source: 'backend' | 'local'
  url: string
  coverHint?: boolean
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

  function addPhoto(photo: GalleryPhoto) {
    if (seen.has(photo.url)) return
    seen.add(photo.url)
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

function formatOpenNow(openNow?: boolean | null) {
  if (openNow === true) return 'Aberto agora'
  if (openNow === false) return 'Fechado agora'
  return 'Horário indisponível'
}

export function GoogleSearchPanel({ initialQuery = '', onSaved }: GoogleSearchPanelProps) {
  const { grupo, perfil } = useAuth()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<GoogleAutocompleteSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [selected, setSelected] = useState<GooglePlaceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null)
  const [localPhotos, setLocalPhotos] = useState<GalleryPhoto[]>([])

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

  useEffect(() => {
    if (selected) return undefined

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
          included_primary_types: ['restaurant', 'food', 'cafe', 'bakery', 'bar'],
          session_token: sessionTokenRef.current,
          max_results: 6,
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
  }, [query, selected])

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
      const photos = normalizePhotos(detail, [])
      const firstCover = photos.find((photo) => photo.coverHint) ?? photos[0]

      setSelected(detail)
      setSuggestions([])
      setLocalPhotos([])
      setActivePhotoId(firstCover?.id ?? null)
      setCoverPhotoId(firstCover?.id ?? null)
      setFavorite(true)
      sessionTokenRef.current = crypto.randomUUID()
    } catch (err: unknown) {
      setSearchError(getErrorMessage(err, 'Não foi possível abrir esse lugar.'))
    } finally {
      setDetailLoading(false)
    }
  }

  function handleResetSelection() {
    setSelected(null)
    setQuery('')
    setSuggestions([])
    setNotes('')
    setStatus('quero_ir')
    setFavorite(true)
    setLocalPhotos([])
    setActivePhotoId(null)
    setCoverPhotoId(null)
  }

  function handleAddPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const photo: GalleryPhoto = {
      id: `local-${Date.now()}-${file.name}`,
      label: file.name,
      source: 'local',
      url,
    }

    localObjectUrlsRef.current.push(url)
    setLocalPhotos((current) => [...current, photo])
    setActivePhotoId(photo.id)
    if (!coverPhotoId) setCoverPhotoId(photo.id)
    event.target.value = ''
  }

  function handleSetCover() {
    if (!activePhoto) return
    setCoverPhotoId(activePhoto.id)
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
        added_by: perfil?.nome,
        cover_photo_uri: coverPhoto?.url,
        photo_uris: gallery.map((photo) => photo.url),
      })
      onSaved(saved)
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, 'Não foi possível salvar agora.'))
    } finally {
      setSaving(false)
    }
  }

  if (!selected) {
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
      <section className={styles.galleryColumn}>
        <div className={styles.heroPhoto}>
          {activePhoto ? (
            <img alt={selected.display_name} src={activePhoto.url} />
          ) : (
            <span className={styles.photoFallback}>{selected.display_name.slice(0, 1)}</span>
          )}

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

        <div className={styles.thumbRow}>
          {gallery.map((photo) => (
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
                  <Icon name="circle-check" size={21} />
                </span>
              ) : null}
            </button>
          ))}

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
            <Icon name="sparkles" size={12} />
          </p>
        ) : null}
      </section>

      <section className={styles.detailsColumn}>
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
          </span>
          <span className={styles.priceChip}>{formatPrice(selected)}</span>
          <span className={styles.openChip} data-open={selected.open_now === true}>
            <Icon name="clock" size={14} />
            {formatOpenNow(selected.open_now)}
          </span>
        </div>

        <div className={styles.divider} />

        <fieldset className={styles.fieldset}>
          <legend>Como esse lugar entra na nossa lista?</legend>
          <StatusSwitcher onChange={setStatus} value={status} />
        </fieldset>

        <div className={styles.divider} />

        <div className={styles.favoriteRow}>
          <span>
            <Icon name="heart" size={21} />
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
            placeholder="Observações opcionais..."
            value={notes}
          />
          <span>{notes.length}/300</span>
        </label>

        {saveError ? <p className={styles.error}>{saveError}</p> : null}

        <div className={styles.confirmActions}>
          <button className={styles.rejectButton} onClick={handleResetSelection} type="button">
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
