import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useAddPlace } from '@/features/places/AddPlaceContext'
import { listPlaces } from '@/features/places/services/placesService'
import type { Place } from '@/features/places/types'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { Icon } from '@/shared/ui/Icon/Icon'
import { PageHeader } from '@/shared/ui/PageHeader/PageHeader'
import {
  createGuia,
  deleteGuia,
  listGuias,
  type Guia,
} from '../services/guidesService'
import styles from './GuidesPage.module.css'

function getPlaceNames(guia: Guia) {
  if (guia.lugares.length > 0) {
    return guia.lugares.map((lugar) => lugar.name).join(', ')
  }

  if (guia.lugar_ids.length > 0) {
    return `${guia.lugar_ids.length} lugares`
  }

  return 'Nenhum lugar ainda'
}

export function GuidesPage() {
  const { grupo } = useAuth()
  const { open: openAddPlace } = useAddPlace()
  const [guias, setGuias] = useState<Guia[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!grupo) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([listGuias(grupo.id), listPlaces(grupo.id, { page_size: 80 })])
      .then(([loadedGuias, loadedPlaces]) => {
        if (cancelled) return
        setGuias(loadedGuias)
        setPlaces(loadedPlaces.items)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(getErrorMessage(err, 'Nao foi possivel carregar os guias.'))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [grupo])

  const canCreate = useMemo(() => nome.trim().length >= 2 && Boolean(grupo), [grupo, nome])

  function togglePlace(placeId: string) {
    setSelectedPlaceIds((current) =>
      current.includes(placeId)
        ? current.filter((item) => item !== placeId)
        : [...current, placeId],
    )
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate || !grupo) return

    setSubmitting(true)
    setError(null)
    try {
      const created = await createGuia({
        descricao: descricao.trim() || undefined,
        grupo_id: grupo.id,
        lugar_ids: selectedPlaceIds,
        nome: nome.trim(),
      })
      setGuias((current) => [created, ...current])
      setNome('')
      setDescricao('')
      setSelectedPlaceIds([])
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Nao foi possivel criar o guia.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(guiaId: string) {
    setError(null)
    try {
      await deleteGuia(guiaId)
      setGuias((current) => current.filter((guia) => guia.id !== guiaId))
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Nao foi possivel remover o guia.'))
    }
  }

  return (
    <section className={styles.page}>
      <PageHeader
        action={
          <button className={styles.headerAction} onClick={() => openAddPlace()} type="button">
            <Icon name="plus" size={16} />
            Adicionar lugar
          </button>
        }
        description="Crie colecoes por perfil para organizar restaurantes e usar o escopo de guia na IA."
        eyebrow="Guias"
        title="Organize lugares em listas do grupo."
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.layout}>
        <form className={`surfaceCard ${styles.form}`} onSubmit={handleCreate}>
          <div>
            <h2>Novo guia</h2>
            <p>O guia nasce no perfil ativo: {grupo?.nome ?? 'perfil individual'}.</p>
          </div>

          <label className="formField">
            <span className="formLabel">Nome</span>
            <input
              className="textInput"
              disabled={submitting}
              minLength={2}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Guia Arabe"
              required
              type="text"
              value={nome}
            />
          </label>

          <label className="formField">
            <span className="formLabel">Descricao</span>
            <textarea
              className="textArea"
              disabled={submitting}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Restaurantes que queremos testar."
              rows={3}
              value={descricao}
            />
          </label>

          <div className={styles.placePicker}>
            <span className={styles.pickerLabel}>Lugares</span>
            {places.length === 0 ? (
              <p>Nenhum lugar cadastrado ainda.</p>
            ) : (
              <div className={styles.placeOptions}>
                {places.slice(0, 12).map((place) => (
                  <label key={place.id} className={styles.placeOption}>
                    <input
                      checked={selectedPlaceIds.includes(place.id)}
                      disabled={submitting}
                      onChange={() => togglePlace(place.id)}
                      type="checkbox"
                    />
                    <span>{place.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Button disabled={!canCreate || submitting} type="submit" variant="primary">
            {submitting ? 'Criando...' : 'Criar guia'}
          </Button>
        </form>

        <section className={styles.guidesPanel}>
          <header className={styles.panelHeader}>
            <h2>Guias do perfil</h2>
            <span>{guias.length} guias</span>
          </header>

          {loading ? (
            <p className={styles.muted}>Carregando guias...</p>
          ) : guias.length === 0 ? (
            <div className={styles.empty}>
              <strong>Nenhum guia ainda.</strong>
              <p>Crie uma lista para separar vontades, favoritos ou roteiros.</p>
            </div>
          ) : (
            <div className={styles.guidesGrid}>
              {guias.map((guia) => (
                <article key={guia.id} className={styles.guideCard}>
                  <div className={styles.guideInitial} aria-hidden="true">
                    {guia.nome.slice(0, 1).toUpperCase()}
                  </div>
                  <div className={styles.guideBody}>
                    <header>
                      <strong>{guia.nome}</strong>
                      <span>{guia.total_lugares} lugares</span>
                    </header>
                    {guia.descricao ? <p>{guia.descricao}</p> : null}
                    <small>{getPlaceNames(guia)}</small>
                  </div>
                  <button
                    aria-label={`Remover ${guia.nome}`}
                    className={styles.deleteButton}
                    onClick={() => handleDelete(guia.id)}
                    type="button"
                  >
                    <Icon name="x" size={15} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
