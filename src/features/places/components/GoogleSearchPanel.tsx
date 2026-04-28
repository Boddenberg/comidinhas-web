import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
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
  type Place,
  type PlaceStatus,
} from '../types'
import styles from './AddPlace.module.css'

type GoogleSearchPanelProps = {
  onSaved: (place: Place) => void
  initialQuery?: string
}

export function GoogleSearchPanel({ initialQuery = '', onSaved }: GoogleSearchPanelProps) {
  const { grupo, perfil } = useAuth()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<GoogleAutocompleteSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [selected, setSelected] = useState<GooglePlaceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [status, setStatus] = useState<PlaceStatus>('quero_ir')
  const [favorite, setFavorite] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sessionTokenRef = useRef<string>(crypto.randomUUID())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (selected) return
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setSearchError(null)
      try {
        const result = await autocompletePlaces({
          input: query.trim(),
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
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selected])

  async function handlePickSuggestion(suggestion: GoogleAutocompleteSuggestion) {
    if (!suggestion.place_id) return
    setDetailLoading(true)
    setSearchError(null)
    try {
      const detail = await getGooglePlaceDetails(suggestion.place_id)
      setSelected(detail)
      setSuggestions([])
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
    setFavorite(false)
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
            onChange={(e) => setQuery(e.target.value)}
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
    <div className={styles.detail}>
      {selected.photo_uri ? (
        <img alt={selected.display_name} className={styles.detailPhoto} src={selected.photo_uri} />
      ) : null}

      <div className={styles.detailBody}>
        <header className={styles.detailHeader}>
          <strong>{selected.display_name}</strong>
          <span>{selected.formatted_address}</span>
          <div className={styles.detailMeta}>
            {selected.primary_type_display_name ? (
              <span>{selected.primary_type_display_name}</span>
            ) : null}
            {selected.rating ? (
              <span>
                <Icon name="star" size={12} /> {selected.rating.toFixed(1)}
              </span>
            ) : null}
            {selected.price_range ? <span>{'$'.repeat(selected.price_range)}</span> : null}
            {selected.open_now != null ? (
              <span>{selected.open_now ? 'Aberto agora' : 'Fechado agora'}</span>
            ) : null}
          </div>
        </header>

        <fieldset className={styles.fieldset}>
          <legend>Status</legend>
          <StatusSwitcher onChange={setStatus} value={status} />
        </fieldset>

        <label className={styles.checkboxField}>
          <input
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
            type="checkbox"
          />
          Marcar como favorito do casal
        </label>

        <label className={styles.field}>
          <span>Observações (opcional)</span>
          <textarea
            className="textArea"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicação do Victor, melhor depois das 19h..."
            value={notes}
          />
        </label>

        {saveError ? <p className={styles.error}>{saveError}</p> : null}

        <div className={styles.actionRow}>
          <Button onClick={handleResetSelection} type="button" variant="ghost">
            Trocar lugar
          </Button>
          <Button disabled={saving} onClick={handleSave} type="button" variant="primary">
            {saving ? 'Salvando...' : 'Salvar lugar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
