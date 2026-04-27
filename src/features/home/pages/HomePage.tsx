import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { PlaceCard } from '@/features/places/components/PlaceCard'
import { listPlaces } from '@/features/places/services/placesService'
import {
  PLACE_STATUS_LABELS,
  type Place,
  type PlaceStatus,
} from '@/features/places/types'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import { decideWhereToEat } from '../services/decideService'
import styles from './HomePage.module.css'

type DecideState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; reply: string; model: string; provider: string }

const DECIDE_CONTEXT = {
  budget: 'R$ $$',
  weather: 'Ensolarado',
  dayOfWeek: 'Sábado',
  location: 'Próximo de nós',
  mood: 'Algo diferente',
}

const aiCriteria = [
  { icon: 'wallet', label: 'Orçamento', value: DECIDE_CONTEXT.budget },
  { icon: 'cloud-sun', label: 'Clima', value: DECIDE_CONTEXT.weather },
  { icon: 'calendar', label: 'Dia da semana', value: DECIDE_CONTEXT.dayOfWeek },
  { icon: 'pin', label: 'Localização', value: DECIDE_CONTEXT.location },
  { icon: 'heart', label: 'Vontade', value: DECIDE_CONTEXT.mood },
] as const

const guides: Array<{
  current: number
  title: string
  tone: 'burger' | 'pizza' | 'sushi' | 'trophy'
  total: number
}> = [
  { current: 0, title: 'Guia do Hambúrguer', tone: 'burger', total: 20 },
  { current: 0, title: 'Guia da Pizza', tone: 'pizza', total: 15 },
  { current: 0, title: 'Guia do Sushi', tone: 'sushi', total: 12 },
  { current: 0, title: 'Desafio Comer, marcou!', tone: 'trophy', total: 30 },
]

function formatRelativeTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months === 1) return 'há 1 mês'
  return `há ${months} meses`
}

export function HomePage() {
  const { perfil, grupo } = useAuth()
  const [decideState, setDecideState] = useState<DecideState>({ status: 'idle' })
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placesError, setPlacesError] = useState<string | null>(null)
  const [placesLoading, setPlacesLoading] = useState(true)

  useEffect(() => {
    if (!grupo) {
      setPlacesLoading(false)
      return
    }
    let cancelled = false
    listPlaces(grupo.id, { page_size: 20, sort_by: 'updated_at', sort_order: 'desc' })
      .then((result) => {
        if (cancelled) return
        setPlaces(result.items)
        setPlacesError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPlacesError(getErrorMessage(err, 'Não foi possível carregar seus lugares.'))
      })
      .finally(() => {
        if (cancelled) return
        setPlacesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [grupo])

  function handlePlaceUpdated(updated: Place) {
    setPlaces((current) => current?.map((p) => (p.id === updated.id ? updated : p)) ?? null)
  }

  async function handleDecide() {
    setDecideState({ status: 'loading' })

    try {
      const response = await decideWhereToEat(DECIDE_CONTEXT)
      setDecideState({
        status: 'success',
        reply: response.reply,
        model: response.model,
        provider: response.provider,
      })
    } catch (error: unknown) {
      setDecideState({
        status: 'error',
        message: getErrorMessage(error, 'Não foi possível consultar a IA agora.'),
      })
    }
  }

  const isLoading = decideState.status === 'loading'

  const favorites = useMemo(() => {
    if (!places) return []
    const onlyFav = places.filter((p) => p.is_favorite)
    return (onlyFav.length > 0 ? onlyFav : places).slice(0, 4)
  }, [places])

  const recentActivity = useMemo(() => {
    if (!places) return []
    return places
      .slice()
      .sort((a, b) => {
        const tA = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        const tB = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
        return tB - tA
      })
      .slice(0, 3)
      .map((place) => ({
        id: place.id,
        name: place.name,
        status: place.status,
        when: formatRelativeTime(place.updated_at ?? place.created_at ?? ''),
        image: place.image_url,
      }))
  }, [places])

  const greeting = perfil?.nome?.split(' ')[0] ?? 'gente'

  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <img alt="" aria-hidden="true" className={styles.heroBackdrop} src="/casal-fundo.png" />
          <div className={styles.heroOverlay} />

          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>
              Bora decidir
              <br />
              onde <span className={styles.heroAccent}>comer</span> hoje?
              <Icon name="heart-filled" size={22} className={styles.heroHeart} />
            </h1>
            <p className={styles.heroDescription}>
              {`Oi ${greeting}! Deixa com a IA — ela escolhe o lugar perfeito pra gente hoje.`}
            </p>
            <button
              className={styles.heroButton}
              disabled={isLoading}
              onClick={handleDecide}
              type="button"
            >
              <Icon name="sparkles" size={18} />
              {isLoading ? 'Pensando...' : 'Deixar a IA decidir'}
            </button>
          </div>
        </section>

        {decideState.status === 'loading' ? (
          <section className={styles.aiResultCard}>
            <header className={styles.aiResultHeader}>
              <span className={styles.aiResultBadge}>
                <Icon name="sparkles" size={14} /> IA Decide
              </span>
              <strong>Pensando na melhor pedida pra vocês...</strong>
            </header>
            <div className={styles.aiSkeleton} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
        ) : null}

        {decideState.status === 'success' ? (
          <section className={styles.aiResultCard}>
            <header className={styles.aiResultHeader}>
              <span className={styles.aiResultBadge}>
                <Icon name="sparkles" size={14} /> IA Decide
              </span>
              <strong>A escolha de hoje:</strong>
            </header>
            <p className={styles.aiResultReply}>{decideState.reply}</p>
            <footer className={styles.aiResultFooter}>
              <span className={styles.aiResultMeta}>
                {decideState.provider} · {decideState.model}
              </span>
              <button
                className={styles.aiResultRetry}
                onClick={handleDecide}
                type="button"
              >
                Pedir outra sugestão
              </button>
            </footer>
          </section>
        ) : null}

        {decideState.status === 'error' ? (
          <section className={`${styles.aiResultCard} ${styles.aiResultError}`}>
            <header className={styles.aiResultHeader}>
              <strong>A IA não respondeu agora.</strong>
            </header>
            <p className={styles.aiResultReply}>{decideState.message}</p>
            <footer className={styles.aiResultFooter}>
              <button className={styles.aiResultRetry} onClick={handleDecide} type="button">
                Tentar novamente
              </button>
            </footer>
          </section>
        ) : null}

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <h2>Nossos favoritos</h2>
              {places ? (
                <span className={styles.sectionBadge}>
                  {favorites.length} {favorites.length === 1 ? 'lugar' : 'lugares'}
                </span>
              ) : null}
            </div>
            <Link className={styles.sectionLink} to="/favoritos">
              Ver todos
            </Link>
          </header>

          {placesError ? (
            <p className={styles.emptyState}>{placesError}</p>
          ) : placesLoading ? (
            <p className={styles.emptyState}>Carregando seus lugares...</p>
          ) : favorites.length === 0 ? (
            <div className={styles.emptyCard}>
              <strong>Nenhum lugar cadastrado ainda.</strong>
              <p>Cadastrem o primeiro restaurante pra começar a montar a lista de vocês.</p>
              <Link className={styles.primaryLink} to="/lugares/novo">
                <Icon name="plus" size={16} /> Cadastrar primeiro lugar
              </Link>
            </div>
          ) : (
            <div className={styles.favoriteGrid}>
              {favorites.map((place) => (
                <PlaceCard key={place.id} onUpdated={handlePlaceUpdated} place={place} />
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <h2>Guias em andamento</h2>
            </div>
            <a className={styles.sectionLink} href="#guias">
              Ver todos
            </a>
          </header>

          <div className={styles.guidesGrid}>
            {guides.map((guide) => {
              const progress = Math.round((guide.current / guide.total) * 100)
              return (
                <article key={guide.title} className={styles.guideCard} data-tone={guide.tone}>
                  <div className={styles.guideIcon} aria-hidden="true" />
                  <strong className={styles.guideTitle}>{guide.title}</strong>
                  <span className={styles.guideProgressLabel}>
                    {guide.current} / {guide.total}
                  </span>
                  <div className={styles.guideProgressBar} aria-hidden="true">
                    <div className={styles.guideProgressFill} style={{ width: `${progress}%` }} />
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>

      <aside className={styles.rail}>
        <section className={`${styles.railCard} ${styles.aiCard}`}>
          <header className={styles.aiHeader}>
            <Icon name="sparkles" size={18} className={styles.aiSparkles} />
            <h2>IA Decide</h2>
          </header>

          <div className={styles.aiBubble}>
            <span className={styles.aiAvatar} aria-hidden="true">
              <Icon name="robot" size={22} />
            </span>
            <p>
              Eu analiso tudo pra escolher o melhor lugar pra gente hoje!{' '}
              <Icon name="heart-filled" size={11} className={styles.brandHeart} />
            </p>
          </div>

          <ul className={styles.aiCriteria}>
            {aiCriteria.map((item) => (
              <li key={item.label}>
                <span className={styles.aiCriteriaLabel}>
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </span>
                <span className={styles.aiCriteriaValue}>
                  {item.label === 'Clima' ? (
                    <>
                      <Icon name="sun" size={14} className={styles.aiSunIcon} /> {item.value}
                    </>
                  ) : item.label === 'Localização' ? (
                    <>
                      <Icon name="pin" size={14} /> {item.value}
                    </>
                  ) : item.label === 'Vontade' ? (
                    <>
                      <Icon name="heart" size={14} /> {item.value}
                    </>
                  ) : (
                    item.value
                  )}
                </span>
              </li>
            ))}
          </ul>

          <button
            className={styles.aiButton}
            disabled={isLoading}
            onClick={handleDecide}
            type="button"
          >
            {isLoading ? 'Pensando...' : 'Deixar a IA decidir'}{' '}
            <Icon name="sparkles" size={16} />
          </button>
        </section>

        <section className={styles.railCard}>
          <header className={styles.railHeader}>
            <h2>Atividade recente</h2>
            <Link className={styles.sectionLink} to="/favoritos">
              Ver todo
            </Link>
          </header>

          {recentActivity.length === 0 ? (
            <p className={styles.muted}>
              Nenhuma atividade ainda. Comece adicionando lugares aos favoritos.
            </p>
          ) : (
            <ul className={styles.activityList}>
              {recentActivity.map((item) => (
                <li key={item.id} className={styles.activityItem}>
                  <span className={styles.activityThumb} aria-hidden="true">
                    {item.image ? <img alt="" src={item.image} /> : null}
                  </span>
                  <div className={styles.activityBody}>
                    <span className={styles.activityText}>
                      {PLACE_STATUS_LABELS[item.status as PlaceStatus]} · {item.name}
                    </span>
                    <span className={styles.activityDetail}>{item.when}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.railCard}>
          <header className={styles.railHeader}>
            <h2>Nosso grupo</h2>
            <Link
              aria-label="Editar perfil"
              className={styles.groupAddButton}
              to="/perfil"
            >
              <Icon name="settings" size={16} />
            </Link>
          </header>

          <div className={styles.groupMembers}>
            <span className={styles.groupAvatarPhoto} aria-label={perfil?.nome ?? 'Membro'}>
              <img alt="" src="/casal-fv.png" />
            </span>
            <Link aria-label="Convidar amigo" className={styles.groupInvite} to="/perfil">
              <Icon name="plus" size={18} />
            </Link>
          </div>
        </section>
      </aside>
    </div>
  )
}
