import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { StatusSwitcher } from './StatusSwitcher'
import { createPlace } from '../services/placesService'
import { type Place, type PlaceStatus } from '../types'
import styles from './AddPlace.module.css'

const PRICE_OPTIONS = [
  { value: 1, label: '$ — Bem em conta' },
  { value: 2, label: '$$ — Médio' },
  { value: 3, label: '$$$ — Caro' },
  { value: 4, label: '$$$$ — Bem caro' },
]

type ManualPlaceFormProps = {
  onSaved: (place: Place) => void
}

export function ManualPlaceForm({ onSaved }: ManualPlaceFormProps) {
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
      const created = await createPlace(grupo.id, {
        name: name.trim(),
        category: category.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        price_range: priceRange,
        link: link.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        is_favorite: favorite,
        added_by_profile_id: perfil?.id,
      })
      onSaved(created)
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
