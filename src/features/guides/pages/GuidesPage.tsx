import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useAddPlace } from '@/features/places/AddPlaceContext'
import { listPlaces } from '@/features/places/services/placesService'
import type { Place } from '@/features/places/types'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { Icon } from '@/shared/ui/Icon/Icon'
import {
  createGuia,
  deleteGuia,
  listGuias,
  type Guia,
} from '../services/guidesService'
import styles from './GuidesPage.module.css'

const PRICE_SYMBOL: Record<number, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
}

function getPlaceNames(guia: Guia) {
  if (guia.lugares.length > 0) {
    return guia.lugares.map((lugar) => lugar.name).join(', ')
  }

  if (guia.lugar_ids.length > 0) {
    return `${guia.lugar_ids.length} lugares`
  }

  return 'Nenhum lugar ainda'
}

function getGuidePlaces(guia: Guia | undefined, places: Place[]) {
  if (!guia) return []
  if (guia.lugares.length > 0) return guia.lugares

  const byId = new Map(places.map((place) => [place.id, place]))
  return guia.lugar_ids.flatMap((placeId) => {
    const place = byId.get(placeId)
    return place ? [place] : []
  })
}

function getPriceLabel(price: number | null) {
  return price ? PRICE_SYMBOL[price] : '$'
}

function getLocation(place: Place) {
  return [place.neighborhood, place.city].filter(Boolean).join(' - ') || 'Localizacao pendente'
}

export function GuidesPage() {
  const { grupo } = useAuth()
  const { open: openAddPlace } = useAddPlace()
  const [guias, setGuias] = useState<Guia[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [link, setLink] = useState('')
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeGuiaId, setActiveGuiaId] = useState<string | null>(null)

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
        setActiveGuiaId((current) => current ?? loadedGuias[0]?.id ?? null)
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

  const canCreate = useMemo(
    () =>
      nome.trim().length >= 2 &&
      Boolean(grupo) &&
      Boolean(descricao.trim() || link.trim()),
    [descricao, grupo, link, nome],
  )

  const activeGuia = useMemo(
    () => guias.find((guia) => guia.id === activeGuiaId) ?? guias[0],
    [activeGuiaId, guias],
  )

  const guidePlaces = useMemo(() => getGuidePlaces(activeGuia, places), [activeGuia, places])
  const heroImage = guidePlaces.find((place) => place.image_url)?.image_url
  const topRatedPlace = guidePlaces
    .filter((place) => typeof place.rating === 'number')
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]

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
        link: link.trim() || undefined,
        lugar_ids: selectedPlaceIds,
        nome: nome.trim(),
      })
      setGuias((current) => [created, ...current])
      setActiveGuiaId(created.id)
      setNome('')
      setDescricao('')
      setLink('')
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
      setGuias((current) => {
        const next = current.filter((guia) => guia.id !== guiaId)
        if (activeGuiaId === guiaId) {
          setActiveGuiaId(next[0]?.id ?? null)
        }
        return next
      })
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Nao foi possivel remover o guia.'))
    }
  }

  return (
    <section className={styles.page}>
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.aiBadge}>
            <Icon name="sparkles" size={15} />
            Guia importado por IA
          </span>
          <h1>{activeGuia?.nome ?? 'Guias do grupo'}</h1>
          <p>
            {activeGuia?.descricao ??
              'Organize restaurantes em rankings, compare opcoes e decida o proximo rolê.'}
          </p>
          <div className={styles.heroMeta}>
            <span>
              <Icon name="bookmark" size={16} />
              {activeGuia?.total_lugares ?? 0} restaurantes
            </span>
            <span>
              <Icon name="users" size={16} />
              {grupo?.nome ?? 'Perfil ativo'}
            </span>
          </div>
        </div>

        <div className={styles.heroActions}>
          {activeGuia?.link ? (
            <a className={styles.secondaryAction} href={activeGuia.link} rel="noreferrer" target="_blank">
              <Icon name="external-link" size={16} />
              Abrir fonte
            </a>
          ) : null}
          <button className={styles.secondaryAction} onClick={() => openAddPlace()} type="button">
            <Icon name="plus" size={16} />
            Adicionar lugar
          </button>
        </div>

        <div className={styles.heroArt} aria-hidden="true">
          {heroImage ? <img alt="" src={heroImage} /> : <Icon name="utensils" size={46} />}
        </div>
      </section>

      <div className={styles.contentGrid}>
        <aside className={styles.sidebarPanel}>
          <form className={styles.form} onSubmit={handleCreate}>
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
              placeholder="Restaurantes que queremos testar. Opcional se voce enviar um link."
              rows={3}
              value={descricao}
            />
          </label>

          <label className="formField">
            <span className="formLabel">Link do guia</span>
            <input
              className="textInput"
              disabled={submitting}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://..."
              type="url"
              value={link}
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
                <article
                  key={guia.id}
                  className={`${styles.guideCard} ${guia.id === activeGuia?.id ? styles.guideCardActive : ''}`}
                >
                  <div className={styles.guideInitial} aria-hidden="true">
                    {guia.nome.slice(0, 1).toUpperCase()}
                  </div>
                  <div className={styles.guideBody}>
                    <button
                      className={styles.guideSelect}
                      onClick={() => setActiveGuiaId(guia.id)}
                      type="button"
                    >
                      <strong>{guia.nome}</strong>
                      <span>{guia.total_lugares} lugares</span>
                    </button>
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
        </aside>

        <main className={styles.guideExperience}>
          <section className={styles.highlights}>
            <header className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionIcon}>
                  <Icon name="sparkles" size={15} />
                </span>
                <h2>Destaques para o grupo</h2>
              </div>
              <p>Sugestoes inteligentes com base no guia criado.</p>
            </header>

            <div className={styles.highlightGrid}>
              <article className={styles.highlightCard}>
                <span className={styles.highlightIcon}>#1</span>
                <small>Primeiro da lista</small>
                <strong>{guidePlaces[0]?.name ?? 'Adicione um restaurante'}</strong>
                <p>{guidePlaces[0] ? getLocation(guidePlaces[0]) : 'Monte o guia para revelar a primeira opcao.'}</p>
              </article>

              <article className={styles.highlightCard}>
                <span className={styles.highlightIcon}>
                  <Icon name="star" size={16} />
                </span>
                <small>Melhor avaliado</small>
                <strong>{topRatedPlace?.name ?? 'Aguardando notas'}</strong>
                <p>
                  {topRatedPlace?.rating
                    ? `${topRatedPlace.rating.toFixed(1).replace('.', ',')} no Google`
                    : 'As avaliacoes aparecem quando vierem do Maps.'}
                </p>
              </article>

              <article className={styles.highlightCard}>
                <span className={styles.highlightIcon}>
                  <Icon name="pin" size={16} />
                </span>
                <small>Regiao mais facil</small>
                <strong>{guidePlaces[0]?.neighborhood ?? 'Sem bairro ainda'}</strong>
                <p>Use a ordem do guia para comparar onde vale ir primeiro.</p>
              </article>
            </div>
          </section>

          <section className={styles.restaurantsPanel}>
            <header className={styles.restaurantsHeader}>
              <div>
                <h2>Restaurantes do guia</h2>
                <p>Explore e compare os lugares em ordem crescente.</p>
              </div>
              <div className={styles.filterPills} aria-label="Filtros visuais do guia">
                <span className={styles.filterActive}>Todos</span>
                <span>Confirmadas</span>
                <span>Pendentes</span>
              </div>
            </header>

            {loading ? (
              <p className={styles.muted}>Carregando restaurantes...</p>
            ) : guidePlaces.length === 0 ? (
              <div className={styles.empty}>
                <strong>Nenhum restaurante nesse guia.</strong>
                <p>Selecione lugares no formulario ou cadastre um novo lugar para popular a lista.</p>
              </div>
            ) : (
              <div className={styles.restaurantGrid}>
                {guidePlaces.map((place, index) => (
                  <article key={place.id} className={styles.restaurantCard}>
                    <div className={styles.restaurantThumb}>
                      {place.image_url ? (
                        <img alt={place.name} loading="lazy" src={place.image_url} />
                      ) : (
                        <div className={styles.restaurantFallback}>
                          <Icon name="utensils" size={26} />
                        </div>
                      )}
                      <span className={styles.rankBadge}>#{index + 1}</span>
                      <button aria-label={`Favoritar ${place.name}`} className={styles.favoriteButton} type="button">
                        <Icon name={place.is_favorite ? 'heart-filled' : 'heart'} size={18} />
                      </button>
                    </div>

                    <div className={styles.restaurantBody}>
                      <h3>{place.name}</h3>
                      <p className={styles.restaurantMeta}>
                        {place.category ?? 'Restaurante'} · {getLocation(place)}
                      </p>
                      <div className={styles.restaurantStats}>
                        <span>
                          <Icon name="star" size={14} />
                          {place.rating ? place.rating.toFixed(1).replace('.', ',') : 'S/N'}
                          {place.user_rating_count ? ` (${place.user_rating_count})` : ''}
                        </span>
                        <span>{getPriceLabel(place.price_range)}</span>
                      </div>
                      {place.notes ? <p className={styles.restaurantNotes}>{place.notes}</p> : null}
                      <div className={styles.cardActions}>
                        <button type="button">
                          <Icon name="check" size={15} />
                          Confirmar
                        </button>
                        {place.link ? (
                          <a href={place.link} rel="noreferrer" target="_blank">
                            <Icon name="pin" size={15} />
                            Ver no Maps
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </section>
  )
}
