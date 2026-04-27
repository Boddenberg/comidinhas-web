import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { Icon } from '@/shared/ui/Icon/Icon'
import { StatusSwitcher } from '../components/StatusSwitcher'
import {
  autocompletePlaces,
  getGooglePlaceDetails,
  saveGooglePlace,
} from '../services/googleMapsService'
import { createPlace } from '../services/placesService'
import {
  type GoogleAutocompleteSuggestion,
  type GooglePlaceDetail,
  type PlaceStatus,
} from '../types'
import styles from './AddPlacePage.module.css'

type Mode = 'google' | 'manual'

export function AddPlacePage() {
  const [mode, setMode] = useState<Mode>('google')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cadastrar lugar</h1>
        <p className={styles.subtitle}>
          Buscar no Google Maps preenche endereço, foto e categoria automaticamente. Se preferir,
          dá pra cadastrar tudo manualmente.
        </p>
      </header>

      <div className={styles.modeRow} role="tablist">
        <button
          aria-selected={mode === 'google'}
          className={`${styles.modeTab} ${mode === 'google' ? styles.modeActive : ''}`}
          onClick={() => setMode('google')}
          role="tab"
          type="button"
        >
          <Icon name="search" size={16} /> Buscar no Google Maps
        </button>
        <button
          aria-selected={mode === 'manual'}
          className={`${styles.modeTab} ${mode === 'manual' ? styles.modeActive : ''}`}
          onClick={() => setMode('manual')}
          role="tab"
          type="button"
        >
          <Icon name="bookmark" size={16} /> Cadastro manual
        </button>
      </div>

      {mode === 'google' ? <GoogleSearchPanel /> : <ManualForm />}
    </div>
  )
}

/* ------------------------------------------------------ Google search */

function GoogleSearchPanel() {
  const navigate = useNavigate()
  const { grupo, perfil } = useAuth()
  const [query, setQuery] = useState('')
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
      navigate(`/favoritos`, { state: { savedId: saved.id } })
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, 'Não foi possível salvar agora.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.panel}>
      {!selected ? (
        <>
          <label className={styles.searchField}>
            <Icon name="search" size={18} />
            <input
              autoFocus
              className={styles.searchInput}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar restaurante, bar, café... no Google Maps"
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
        </>
      ) : (
        <div className={styles.detail}>
          {selected.photo_uri ? (
            <img
              alt={selected.display_name}
              className={styles.detailPhoto}
              src={selected.photo_uri}
            />
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
                {selected.price_range ? (
                  <span>{'$'.repeat(selected.price_range)}</span>
                ) : null}
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
      )}
    </section>
  )
}

/* ------------------------------------------------------ Manual form */

const PRICE_OPTIONS = [
  { value: 1, label: '$ — Bem em conta' },
  { value: 2, label: '$$ — Médio' },
  { value: 3, label: '$$$ — Caro' },
  { value: 4, label: '$$$$ — Bem caro' },
]

function ManualForm() {
  const navigate = useNavigate()
  const { grupo, perfil } = useAuth()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [priceRange, setPriceRange] = useState<number>(2)
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<PlaceStatus>('quero_ir')
  const [favorite, setFavorite] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => name.trim().length >= 2, [name])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !grupo) return
    setError(null)
    setSubmitting(true)
    try {
      await createPlace(grupo.id, {
        name: name.trim(),
        category: category.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        price_range: priceRange,
        link: link.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        is_favorite: favorite,
        added_by: perfil?.nome,
      })
      navigate('/favoritos')
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível salvar agora.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit}>
      <div className={styles.gridFields}>
        <label className={styles.field}>
          <span>Nome*</span>
          <input
            autoFocus
            className="textInput"
            disabled={submitting}
            minLength={2}
            onChange={(e) => setName(e.target.value)}
            placeholder="Restaurante Koi"
            required
            type="text"
            value={name}
          />
        </label>

        <label className={styles.field}>
          <span>Categoria</span>
          <input
            className="textInput"
            disabled={submitting}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Japonês, Italiano, Hambúrguer..."
            type="text"
            value={category}
          />
        </label>

        <label className={styles.field}>
          <span>Bairro</span>
          <input
            className="textInput"
            disabled={submitting}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Liberdade"
            type="text"
            value={neighborhood}
          />
        </label>

        <label className={styles.field}>
          <span>Cidade</span>
          <input
            className="textInput"
            disabled={submitting}
            onChange={(e) => setCity(e.target.value)}
            placeholder="São Paulo"
            type="text"
            value={city}
          />
        </label>

        <label className={styles.field}>
          <span>Faixa de preço</span>
          <select
            className="selectInput"
            disabled={submitting}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            value={priceRange}
          >
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Link (opcional)</span>
          <input
            className="textInput"
            disabled={submitting}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            type="url"
            value={link}
          />
        </label>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>Status</legend>
        <StatusSwitcher onChange={setStatus} value={status} />
      </fieldset>

      <label className={styles.checkboxField}>
        <input
          checked={favorite}
          disabled={submitting}
          onChange={(e) => setFavorite(e.target.checked)}
          type="checkbox"
        />
        Marcar como favorito do casal
      </label>

      <label className={styles.field}>
        <span>Notas (opcional)</span>
        <textarea
          className="textArea"
          disabled={submitting}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ótimo temaki, mas caro na sexta..."
          value={notes}
        />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actionRow}>
        <Button disabled={!canSubmit || submitting} type="submit" variant="primary">
          {submitting ? 'Salvando...' : 'Salvar lugar'}
        </Button>
      </div>
    </form>
  )
}
