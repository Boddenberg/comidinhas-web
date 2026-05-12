import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import { StatusSwitcher } from './StatusSwitcher'
import {
  saveBaseRestaurant,
  searchRestaurantBase,
} from '../services/restaurantBaseService'
import type {
  Place,
  PlaceStatus,
  RestaurantBaseItem,
  RestaurantBaseResult,
} from '../types'
import styles from './AddPlace.module.css'

type KnowledgeBaseSearchPanelProps = {
  onSaved: (place: Place) => void
  initialBaseRestaurantId?: string
  initialQuery?: string
  onSelectionChange?: (hasSelection: boolean) => void
  isAiPick?: boolean
  aiMotivo?: string | null
  onTryAgain?: () => void
  onClose?: () => void
}

function getResultLabel(result: RestaurantBaseResult) {
  const restaurant = result.restaurante
  return [restaurant.tipo, restaurant.bairro].filter(Boolean).join(' · ')
}

export function KnowledgeBaseSearchPanel({
  aiMotivo,
  initialBaseRestaurantId,
  initialQuery = '',
  isAiPick = false,
  onClose,
  onSaved,
  onSelectionChange,
  onTryAgain,
}: KnowledgeBaseSearchPanelProps) {
  const { grupo, perfil } = useAuth()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<RestaurantBaseResult[]>([])
  const [selected, setSelected] = useState<RestaurantBaseItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [status, setStatus] = useState<PlaceStatus>('quero_ir')
  const [favorite, setFavorite] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialSelectionDoneRef = useRef(false)

  const canSearch = query.trim().length >= 2
  const selectedDescription = useMemo(
    () => selected?.descricao ?? selected?.distincao ?? selected?.tipo ?? null,
    [selected],
  )

  useEffect(() => {
    onSelectionChange?.(Boolean(selected))
  }, [onSelectionChange, selected])

  useEffect(() => {
    if (initialSelectionDoneRef.current || !initialBaseRestaurantId || !initialQuery.trim()) {
      return
    }

    initialSelectionDoneRef.current = true
    setLoading(true)
    setSearchError(null)
    searchRestaurantBase({
      query: initialQuery,
      max_resultados: 12,
    })
      .then((response) => {
        const match =
          response.items.find((item) => item.restaurante.id === initialBaseRestaurantId) ??
          response.items[0]
        if (match) {
          setSelected(match.restaurante)
          setResults([])
        }
      })
      .catch((error: unknown) => {
        setSearchError(getErrorMessage(error, 'Nao foi possivel abrir esse restaurante.'))
      })
      .finally(() => setLoading(false))
  }, [initialBaseRestaurantId, initialQuery])

  useEffect(() => {
    if (selected) return undefined
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (!canSearch) {
        setResults([])
        setLoading(false)
        setSearchError(null)
        return
      }

      setLoading(true)
      setSearchError(null)
      try {
        const response = await searchRestaurantBase({
          query: query.trim(),
          max_resultados: 8,
        })
        setResults(response.items)
      } catch (error: unknown) {
        setSearchError(getErrorMessage(error, 'Nao foi possivel buscar na base agora.'))
        setResults([])
      } finally {
        setLoading(false)
      }
    }, canSearch ? 280 : 0)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [canSearch, query, selected])

  function handlePick(result: RestaurantBaseResult) {
    setSelected(result.restaurante)
    setResults([])
    setFavorite(false)
    setStatus('quero_ir')
    setNotes(result.restaurante.descricao ?? '')
  }

  function handleResetSelection(nextQuery = '') {
    setSelected(null)
    setQuery(nextQuery)
    setResults([])
    setNotes('')
    setStatus('quero_ir')
    setFavorite(false)
    setSaveError(null)
  }

  async function handleSave() {
    if (!selected || !grupo) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveBaseRestaurant(grupo.id, {
        restaurante_id: selected.id,
        status,
        is_favorite: favorite,
        notes: notes.trim() || undefined,
        added_by_profile_id: perfil?.id,
      })
      onSaved(saved)
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, 'Nao foi possivel salvar agora.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleAiQuickSave() {
    if (!selected || !grupo) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveBaseRestaurant(grupo.id, {
        restaurante_id: selected.id,
        status: 'quero_ir',
        is_favorite: false,
        added_by_profile_id: perfil?.id,
      })
      onSaved(saved)
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, 'Nao foi possivel salvar agora.'))
    } finally {
      setSaving(false)
    }
  }

  if (isAiPick && loading && !selected) {
    return (
      <div className={styles.aiPickLoading} aria-live="polite">
        <span className={styles.aiPickLoadingHalo} aria-hidden="true" />
        <span className={styles.aiPickLoadingIcon}>
          <Icon name="sparkles" size={26} />
        </span>
        <div>
          <strong>A IA está abrindo a escolha</strong>
          <p>Consultando a base própria do Comidinhas.</p>
        </div>
      </div>
    )
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
            placeholder="Buscar restaurante, cozinha, bairro..."
            type="search"
            value={query}
          />
        </label>

        {searchError ? <p className={styles.error}>{searchError}</p> : null}
        {loading ? <p className={styles.loadingText}>Buscando na base...</p> : null}

        {results.length > 0 ? (
          <ul className={styles.suggestions}>
            {results.map((result) => (
              <li key={result.restaurante.id}>
                <button
                  className={styles.suggestionItem}
                  disabled={loading}
                  onClick={() => handlePick(result)}
                  type="button"
                >
                  <span className={styles.suggestionMain}>{result.restaurante.nome}</span>
                  <span className={styles.suggestionSub}>{getResultLabel(result)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && canSearch && results.length === 0 && !searchError ? (
          <p className={styles.emptyText}>Nada encontrado por aqui.</p>
        ) : null}
      </div>
    )
  }

  if (isAiPick) {
    return (
      <div className={styles.aiBasePick}>
        <button className={styles.closeButton} onClick={onClose} type="button" aria-label="Fechar">
          <Icon name="x" size={18} />
        </button>
        <span className={styles.aiBaseIcon}>
          <Icon name="sparkles" size={24} />
        </span>
        <span className={styles.sourceChip}>
          <Icon name="book-open" size={15} />
          Base Comidinhas
        </span>
        <h3>{selected.nome}</h3>
        <p>{aiMotivo ?? selectedDescription ?? 'A IA escolheu este restaurante da base.'}</p>
        <div className={styles.detailMeta}>
          <span>
            <Icon name="utensils" size={15} />
            {selected.tipo ?? selected.categoria}
          </span>
          {selected.bairro ? (
            <span>
              <Icon name="pin" size={14} />
              {selected.bairro}
            </span>
          ) : null}
        </div>
        {saveError ? <p className={styles.error}>{saveError}</p> : null}
        <div className={styles.confirmActions}>
          <button
            className={styles.rejectButton}
            onClick={() => {
              onClose?.()
              onTryAgain?.()
            }}
            type="button"
          >
            <Icon name="x" size={17} />
            Tentar outra
          </button>
          <button
            className={styles.confirmButton}
            disabled={saving || !grupo}
            onClick={handleAiQuickSave}
            type="button"
          >
            {saving ? 'Salvando...' : 'Adicionar à lista'}
            <Icon name="sparkles" size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.placeConfirm}>
      <section className={styles.galleryColumn} aria-label="Prévia do restaurante">
        <div className={styles.knowledgePlaceholder}>
          <Icon name="utensils" size={42} />
          <strong>{selected.nome.slice(0, 1)}</strong>
        </div>
        <p className={styles.coverHint}>
          <Icon name="camera" size={12} />
          Fotos entram no próximo passo
        </p>
      </section>

      <section className={styles.detailsColumn}>
        <div className={styles.confirmToolbar}>
          <span className={styles.sourceChip}>
            <Icon name="book-open" size={15} />
            Base Comidinhas
          </span>
          <button
            className={styles.editPlaceButton}
            onClick={() => handleResetSelection(selected.nome)}
            type="button"
          >
            <Icon name="pencil" size={15} />
            Trocar
          </button>
        </div>

        <header className={styles.confirmHeader}>
          <h3>{selected.nome}</h3>
          <p>
            <Icon name="pin" size={16} />
            {selected.endereco ?? selected.bairro ?? 'Endereço ainda não informado'}
          </p>
        </header>

        <div className={styles.detailMeta}>
          <span>
            <Icon name="utensils" size={15} />
            {selected.tipo ?? selected.categoria}
          </span>
          {selected.distincao ? (
            <span>
              <Icon name="star" size={14} />
              {selected.distincao}
            </span>
          ) : null}
          <span>
            <Icon name="globe" size={14} />
            São Paulo
          </span>
        </div>

        {selectedDescription ? (
          <p className={styles.descriptionBox}>{selectedDescription}</p>
        ) : null}

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
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas opcionais para vocês dois..."
              value={notes}
            />
            <span>{notes.length}/500</span>
          </label>
        </section>

        {saveError ? <p className={styles.error}>{saveError}</p> : null}

        <div className={styles.confirmActions}>
          <button className={styles.rejectButton} onClick={() => handleResetSelection()} type="button">
            <Icon name="x" size={17} />
            Não é esse
          </button>
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
