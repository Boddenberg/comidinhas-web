import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import type { Grupo, Membro, Perfil } from '@/features/auth/types'
import { resolveGroupBackgroundUrl } from '@/features/groups/lib/groupBackgrounds'
import { listGuias, type Guia } from '@/features/guides/services/guidesService'
import { useAddPlace } from '@/features/places/AddPlaceContext'
import { PlaceCard } from '@/features/places/components/PlaceCard'
import { QuickAddBar } from '@/features/places/components/QuickAddBar'
import {
  PLACE_STATUS_LABELS,
  type Place,
  type PlaceStatus,
} from '@/features/places/types'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import {
  decideRestaurant,
  getDecidedLugarName,
  type DecideRestaurantRequest,
  type DecideRestaurantResponse,
  type DecideScope,
} from '../services/decideService'
import { fetchHome, type HomeDashboard } from '../services/homeService'
import styles from './HomePage.module.css'

type DecideState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; decision: DecideRestaurantResponse }

const DECIDE_CONTEXT = {
  budget: 'ate uns R$ 120 por pessoa',
  budgetLevel: 3 as const,
  weather: 'ensolarado',
  dayOfWeek: 'sexta-feira',
  location: 'perto de nos',
  mood: 'algo diferente, mas sem ser pesado',
}

const aiCriteria = [
  { icon: 'wallet', label: 'Orcamento', value: DECIDE_CONTEXT.budget },
  { icon: 'cloud-sun', label: 'Clima', value: DECIDE_CONTEXT.weather },
  { icon: 'calendar', label: 'Dia', value: DECIDE_CONTEXT.dayOfWeek },
  { icon: 'pin', label: 'Regiao', value: DECIDE_CONTEXT.location },
  { icon: 'heart', label: 'Mood', value: DECIDE_CONTEXT.mood },
] as const

const AI_SCOPE_OPTIONS: Array<{ id: DecideScope; label: string; hint: string }> = [
  { id: 'todos', label: 'Qualquer', hint: 'todos os lugares' },
  { id: 'favoritos', label: 'Favoritos', hint: 'favoritos do perfil' },
  { id: 'quero_ir', label: 'Novos', hint: 'status quero ir' },
  { id: 'guia', label: 'Guia', hint: 'dentro de um guia' },
]

const fallbackGuides: Array<{
  emoji: string
  meta: string
  title: string
  tone: 'burger' | 'pizza' | 'sushi' | 'trophy'
}> = [
  { emoji: 'H', meta: 'sem lugares', title: 'Guia do Hamburguer', tone: 'burger' },
  { emoji: 'P', meta: 'sem lugares', title: 'Guia da Pizza', tone: 'pizza' },
  { emoji: 'S', meta: 'sem lugares', title: 'Guia do Sushi', tone: 'sushi' },
  { emoji: 'D', meta: 'novo guia', title: 'Desafio Comer, marcou', tone: 'trophy' },
]

function getGuideCount(guia: Guia) {
  return guia.total_lugares ?? guia.lugares.length ?? guia.lugar_ids.length ?? 0
}

function getGuideInitial(nome: string) {
  return nome.trim().slice(0, 1).toUpperCase() || '#'
}

function getProfileInitial(nome: string) {
  return nome.trim().slice(0, 1).toUpperCase() || 'P'
}

function memberKey(membro: Membro, index: number) {
  return membro.perfil_id ?? membro.email ?? `${membro.nome}-${index}`
}

function isPersonalGroup(grupo: Grupo | null | undefined, perfil: Perfil | null) {
  if (!grupo) return false
  return grupo.tipo === 'individual' || grupo.id === perfil?.grupo_individual_id
}

function getProfileLabel(grupo: Grupo | null | undefined, perfil: Perfil | null) {
  if (!grupo) return 'Perfil selecionado'
  if (isPersonalGroup(grupo, perfil)) {
    return perfil?.nome?.trim() || grupo.nome || 'Meu perfil'
  }
  return grupo.nome || 'Grupo'
}

function getProfileKindLabel(grupo: Grupo | null | undefined, perfil: Perfil | null) {
  if (!grupo || isPersonalGroup(grupo, perfil)) return 'Perfil pessoal'
  if (grupo.tipo === 'casal') return 'Casal'
  return 'Grupo'
}

function getProfileMembers(grupo: Grupo | null | undefined, perfil: Perfil | null): Membro[] {
  if (grupo?.membros?.length) return grupo.membros
  return [
    {
      email: perfil?.email ?? null,
      nome: perfil?.nome ?? 'Perfil',
      perfil_id: perfil?.id ?? 'perfil-ativo',
    },
  ]
}

function getMemberCountLabel(total: number) {
  return `${total} ${total === 1 ? 'membro' : 'membros'}`
}

function getProfilePhotoUrl(grupo: Grupo, perfil: Perfil | null) {
  if (isPersonalGroup(grupo, perfil)) {
    return perfil?.foto_url || (grupo.foto_url ? resolveGroupBackgroundUrl(grupo.foto_url) : null)
  }
  return grupo.foto_url ? resolveGroupBackgroundUrl(grupo.foto_url) : null
}

function orderProfileGroups(grupos: Grupo[], activeGrupo: Grupo | null, perfil: Perfil | null) {
  const byId = new Map<string, Grupo>()
  grupos.forEach((item) => byId.set(item.id, item))
  if (activeGrupo) byId.set(activeGrupo.id, activeGrupo)

  const items = Array.from(byId.values())
  const personal = items.find((item) => isPersonalGroup(item, perfil))
  if (!personal) return items

  return [personal, ...items.filter((item) => item.id !== personal.id)]
}

function formatRelativeTime(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ha 1 dia'
  if (days < 30) return `ha ${days} dias`
  const months = Math.floor(days / 30)
  if (months === 1) return 'ha 1 mes'
  return `ha ${months} meses`
}

function uniquePlaces(...lists: Place[][]) {
  const seen = new Set<string>()
  const out: Place[] = []

  lists.flat().forEach((place) => {
    if (seen.has(place.id)) return
    seen.add(place.id)
    out.push(place)
  })

  return out
}

function replacePlaceInHome(home: HomeDashboard, updated: Place): HomeDashboard {
  const replace = (items: Place[]) =>
    items.map((place) => (place.id === updated.id ? updated : place))

  return {
    ...home,
    latest_places: replace(home.latest_places),
    top_favorites: replace(home.top_favorites),
    want_to_go: replace(home.want_to_go),
    want_to_return: replace(home.want_to_return),
  }
}

function prependPlaceToHome(home: HomeDashboard, place: Place): HomeDashboard {
  return {
    ...home,
    counters: {
      ...home.counters,
      total_favorites: home.counters.total_favorites + (place.is_favorite ? 1 : 0),
      total_places: home.counters.total_places + 1,
      total_visited: home.counters.total_visited + (place.status === 'fomos' ? 1 : 0),
      total_want_to_go: home.counters.total_want_to_go + (place.status === 'quero_ir' ? 1 : 0),
      total_want_to_return:
        home.counters.total_want_to_return + (place.status === 'quero_voltar' ? 1 : 0),
    },
    latest_places: uniquePlaces([place], home.latest_places).slice(0, 5),
    top_favorites: place.is_favorite
      ? uniquePlaces([place], home.top_favorites).slice(0, 5)
      : home.top_favorites,
    want_to_go:
      place.status === 'quero_ir'
        ? uniquePlaces([place], home.want_to_go).slice(0, 5)
        : home.want_to_go,
    want_to_return:
      place.status === 'quero_voltar'
        ? uniquePlaces([place], home.want_to_return).slice(0, 5)
        : home.want_to_return,
  }
}

export function HomePage() {
  const { perfil, grupo, grupos, selectGrupo } = useAuth()
  const { open: openAddPlace, registerOnCreated } = useAddPlace()

  const [decideState, setDecideState] = useState<DecideState>({ status: 'idle' })
  const [decideScope, setDecideScope] = useState<DecideScope>('todos')
  const [selectedGuiaId, setSelectedGuiaId] = useState('')
  const [switchingGrupoId, setSwitchingGrupoId] = useState<string | null>(null)
  const [profileSwitchError, setProfileSwitchError] = useState<string | null>(null)
  const [home, setHome] = useState<HomeDashboard | null>(null)
  const [homeError, setHomeError] = useState<string | null>(null)
  const [homeLoading, setHomeLoading] = useState(true)
  const [guias, setGuias] = useState<Guia[] | null>(null)
  const [guidesError, setGuidesError] = useState<string | null>(null)
  const [guidesLoading, setGuidesLoading] = useState(false)

  useEffect(() => {
    if (!grupo) {
      setHomeLoading(false)
      return
    }

    let cancelled = false
    setHomeLoading(true)
    fetchHome(grupo.id, 5)
      .then((result) => {
        if (cancelled) return
        setHome(result)
        setHomeError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setHomeError(getErrorMessage(err, 'Nao foi possivel carregar a home.'))
      })
      .finally(() => {
        if (cancelled) return
        setHomeLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [grupo])

  useEffect(() => {
    if (!grupo) {
      setGuidesLoading(false)
      return
    }

    let cancelled = false
    setGuidesLoading(true)
    listGuias(grupo.id)
      .then((result) => {
        if (cancelled) return
        setGuias(result)
        setGuidesError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setGuidesError(getErrorMessage(err, 'Nao foi possivel carregar seus guias.'))
      })
      .finally(() => {
        if (cancelled) return
        setGuidesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [grupo])

  useEffect(() => {
    if (!guias?.length) {
      setSelectedGuiaId('')
      return
    }

    if (!selectedGuiaId || !guias.some((guia) => guia.id === selectedGuiaId)) {
      setSelectedGuiaId(guias[0].id)
    }
  }, [guias, selectedGuiaId])

  useEffect(() => {
    registerOnCreated((newPlace) => {
      setHome((current) => (current ? prependPlaceToHome(current, newPlace) : current))
    })
    return () => registerOnCreated(null)
  }, [registerOnCreated])

  function handlePlaceUpdated(updated: Place) {
    setHome((current) => (current ? replacePlaceInHome(current, updated) : current))
  }

  async function handleSelectPerfil(nextGrupo: Grupo) {
    if (nextGrupo.id === grupo?.id || switchingGrupoId) return

    setSwitchingGrupoId(nextGrupo.id)
    setProfileSwitchError(null)
    setDecideState({ status: 'idle' })

    try {
      await selectGrupo(nextGrupo.id)
    } catch (err: unknown) {
      setProfileSwitchError(getErrorMessage(err, 'Nao foi possivel trocar o perfil.'))
    } finally {
      setSwitchingGrupoId(null)
    }
  }

  async function handleDecide(evitarLugarIds: string[] = []) {
    setDecideState({ status: 'loading' })

    try {
      if (!grupo) {
        throw new Error('Selecione um perfil antes de pedir uma escolha da IA.')
      }
      if (decideScope === 'guia' && !selectedGuiaId) {
        throw new Error('Escolha um guia antes de pedir uma decisao dentro dele.')
      }

      const payload: DecideRestaurantRequest = {
        grupo_id: grupo.id,
        escopo: decideScope,
        guia_id: decideScope === 'guia' ? selectedGuiaId : undefined,
        criterios: {
          clima: DECIDE_CONTEXT.weather,
          dia_semana: DECIDE_CONTEXT.dayOfWeek,
          mood: DECIDE_CONTEXT.mood,
          observacoes: `Localizacao: ${DECIDE_CONTEXT.location}.`,
          orcamento_max: DECIDE_CONTEXT.budgetLevel,
          orcamento_texto: DECIDE_CONTEXT.budget,
          quantidade_pessoas: grupo.tipo === 'casal' ? 2 : undefined,
          priorizar_novidade: decideScope === 'quero_ir',
          surpreender: true,
        },
        evitar_lugar_ids: evitarLugarIds.length > 0 ? evitarLugarIds : undefined,
        max_candidatos: 80,
      }

      const response = await decideRestaurant(payload)
      setDecideState({
        status: 'success',
        decision: response,
      })
    } catch (error: unknown) {
      setDecideState({
        status: 'error',
        message: getErrorMessage(error, 'Nao foi possivel consultar a IA agora.'),
      })
    }
  }

  const isLoading = decideState.status === 'loading'
  const chosenPlaceId =
    decideState.status === 'success' ? decideState.decision.escolha.lugar.id : null

  const places = useMemo(() => {
    if (!home) return []
    return uniquePlaces(home.latest_places, home.top_favorites, home.want_to_go).slice(0, 4)
  }, [home])

  const recentActivity = useMemo(() => {
    if (!home) return []
    return home.latest_places.slice(0, 3).map((place) => ({
      id: place.id,
      image: place.image_url,
      name: place.name,
      status: place.status,
      when: formatRelativeTime(place.updated_at ?? place.created_at ?? ''),
    }))
  }, [home])

  const guideCards = useMemo(() => {
    if (guias) {
      return guias.slice(0, 4).map((guia, index) => {
        const total = getGuideCount(guia)
        return {
          emoji: getGuideInitial(guia.nome),
          meta: `${total} ${total === 1 ? 'lugar' : 'lugares'}`,
          title: guia.nome,
          tone: fallbackGuides[index % fallbackGuides.length].tone,
        }
      })
    }

    return fallbackGuides
  }, [guias])

  const greeting = perfil?.nome?.split(' ')[0]?.toLowerCase() ?? 'gente'
  const profileOptions = useMemo(
    () => orderProfileGroups(grupos, grupo, perfil),
    [grupo, grupos, perfil],
  )
  const activeProfileName = getProfileLabel(grupo, perfil)
  const activeProfileKind = getProfileKindLabel(grupo, perfil)
  const activeMembers = getProfileMembers(grupo, perfil)
  const totalPlaces = home?.counters.total_places ?? places.length
  const selectedScopeLabel =
    AI_SCOPE_OPTIONS.find((option) => option.id === decideScope)?.label ?? 'Qualquer'
  const selectedGuia = guias?.find((guia) => guia.id === selectedGuiaId)

  const stats = [
    { label: 'Lugares', value: totalPlaces },
    { label: 'Visitados', value: home?.counters.total_visited ?? 0 },
    { label: 'Favoritos', value: home?.counters.total_favorites ?? 0 },
    { label: 'Quero ir', value: home?.counters.total_want_to_go ?? 0 },
  ]

  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        <section className={styles.profileSwitcher} aria-label="Selecionar perfil">
          <header className={styles.profileSwitcherHeader}>
            <div>
              <span className={styles.profileEyebrow}>Perfil ativo</span>
              <h2>{activeProfileName}</h2>
              <p>
                Lugares, guias e IA acompanham o perfil selecionado aqui.
              </p>
            </div>
            <Link className={styles.profileEditLink} to="/perfil">
              <Icon name="pencil" size={14} />
              Editar
            </Link>
          </header>

          {profileSwitchError ? (
            <p className={styles.profileSwitchError}>{profileSwitchError}</p>
          ) : null}

          <div className={styles.profileGrid}>
            {profileOptions.map((option) => {
              const isActive = option.id === grupo?.id
              const label = getProfileLabel(option, perfil)
              const kind = getProfileKindLabel(option, perfil)
              const members = getProfileMembers(option, perfil)
              const photoUrl = getProfilePhotoUrl(option, perfil)

              return (
                <button
                  aria-pressed={isActive}
                  className={`${styles.profileCard} ${
                    isActive ? styles.profileCardActive : ''
                  }`}
                  disabled={Boolean(switchingGrupoId)}
                  key={option.id}
                  onClick={() => handleSelectPerfil(option)}
                  type="button"
                >
                  <span className={styles.profilePhoto} aria-hidden="true">
                    {photoUrl ? <img alt="" src={photoUrl} /> : getProfileInitial(label)}
                  </span>
                  <span className={styles.profileBody}>
                    <strong>{label}</strong>
                    <small>
                      {kind} - {getMemberCountLabel(members.length)}
                    </small>
                  </span>
                  <span className={styles.profileMemberStack} aria-hidden="true">
                    {members.slice(0, 3).map((membro, index) => (
                      <span key={memberKey(membro, index)}>
                        {getProfileInitial(membro.nome)}
                      </span>
                    ))}
                  </span>
                  {isActive ? (
                    <span className={styles.profileActiveIcon} aria-hidden="true">
                      <Icon name="check" size={14} />
                    </span>
                  ) : null}
                  {switchingGrupoId === option.id ? (
                    <span className={styles.profileLoading}>Abrindo...</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <section className={styles.hero}>
          <img alt="" aria-hidden="true" className={styles.heroImage} src="/casal-fundo.png" />
          <div className={styles.heroSparkle} aria-hidden="true">
            <Icon name="sparkles" size={20} />
          </div>
          <div className={styles.heroOverlay} />

          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>
              Bora decidir
              <br />
              onde <span className={styles.heroAccent}>comer</span> hoje?
              <span className={styles.heroHeart} aria-hidden="true">
                +
              </span>
            </h1>
            <p className={styles.heroDescription}>
              Oi, {greeting}! A IA decide com base no perfil {activeProfileName}.
            </p>
            <button
              className={styles.heroButton}
              disabled={isLoading}
              onClick={() => handleDecide()}
              type="button"
            >
              <Icon name="sparkles" size={16} />
              {isLoading ? 'A IA esta escolhendo...' : `IA decide: ${selectedScopeLabel}`}
            </button>
          </div>
        </section>

        <QuickAddBar />

        <section className={styles.statsGrid} aria-label="Resumo do perfil">
          {stats.map((stat) => (
            <article className={styles.statCard} key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </section>

        {decideState.status === 'loading' ? (
          <section className={styles.aiResultCard}>
            <header className={styles.aiResultHeader}>
              <span className={styles.aiResultBadge}>
                <Icon name="sparkles" size={14} /> IA Decide
              </span>
              <strong>A IA esta escolhendo...</strong>
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
              <strong>
                A escolha de hoje: {getDecidedLugarName(decideState.decision.escolha.lugar)}
              </strong>
            </header>
            <p className={styles.aiResultReply}>{decideState.decision.escolha.motivo}</p>
            {decideState.decision.escolha.pontos_fortes?.length ? (
              <ul className={styles.aiResultList}>
                {decideState.decision.escolha.pontos_fortes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {decideState.decision.alternativas?.length ? (
              <p className={styles.aiResultMeta}>
                Alternativas:{' '}
                {decideState.decision.alternativas
                  .slice(0, 2)
                  .map((item) => getDecidedLugarName(item.lugar))
                  .join(', ')}
              </p>
            ) : null}
            <footer className={styles.aiResultFooter}>
              <span className={styles.aiResultMeta}>
                {decideState.decision.total_candidatos} candidatos -{' '}
                {decideState.decision.provider} - {decideState.decision.modelo}
              </span>
              <button
                className={styles.aiResultRetry}
                onClick={() => handleDecide(chosenPlaceId ? [chosenPlaceId] : [])}
                type="button"
              >
                Decidir de novo
              </button>
            </footer>
          </section>
        ) : null}

        {decideState.status === 'error' ? (
          <section className={`${styles.aiResultCard} ${styles.aiResultError}`}>
            <header className={styles.aiResultHeader}>
              <strong>A IA nao respondeu agora.</strong>
            </header>
            <p className={styles.aiResultReply}>{decideState.message}</p>
            <footer className={styles.aiResultFooter}>
              <button className={styles.aiResultRetry} onClick={() => handleDecide()} type="button">
                Tentar novamente
              </button>
            </footer>
          </section>
        ) : null}

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <h2>Nossos lugares</h2>
              {home ? (
                <span className={styles.sectionBadge}>
                  {totalPlaces} {totalPlaces === 1 ? 'lugar' : 'lugares'}
                </span>
              ) : null}
            </div>
            <Link className={styles.sectionLink} to="/lugares">
              Ver todos
            </Link>
          </header>

          {homeError ? (
            <p className={styles.emptyState}>{homeError}</p>
          ) : homeLoading ? (
            <div className={styles.placeGrid}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <article key={idx} className={styles.skeletonCard} aria-hidden="true">
                  <span className={styles.skeletonThumb} />
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonLineShort} />
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.placeCarouselWrap}>
              {places.length === 0 ? (
                <p className={styles.emptyState}>Nenhum lugar criado neste perfil ainda.</p>
              ) : null}
              <div className={styles.placeGrid}>
                {places.map((place) => (
                  <PlaceCard key={place.id} onUpdated={handlePlaceUpdated} place={place} />
                ))}
                <button
                  aria-label="Adicionar lugar pelo Google Maps"
                  className={styles.addPlaceCard}
                  onClick={() => openAddPlace()}
                  type="button"
                >
                  <img alt="" aria-hidden="true" src="/btn-google-maps.png" />
                  <span className={styles.addPlaceThumbSpacer} aria-hidden="true" />
                  <span className={styles.addPlaceBodySpacer} aria-hidden="true">
                    <span className={styles.addPlaceSpacerHead}>
                      <strong>Adicionar lugar</strong>
                      <small>Google Maps</small>
                    </span>
                    <span className={styles.addPlaceSpacerFooter}>
                      <span>0,0</span>
                      <span>Quero ir</span>
                    </span>
                  </span>
                </button>
              </div>

              {totalPlaces > 4 ? (
                <Link aria-label="Ver mais lugares" className={styles.scrollButton} to="/lugares">
                  <Icon name="chevron-right" size={18} />
                </Link>
              ) : null}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <h2>Guias</h2>
            </div>
            <Link className={styles.sectionLink} to="/guias">
              Ver todos
            </Link>
          </header>

          {guidesError ? (
            <p className={styles.emptyState}>{guidesError}</p>
          ) : guidesLoading ? (
            <p className={styles.muted}>Carregando guias...</p>
          ) : guideCards.length === 0 ? (
            <p className={styles.emptyState}>Nenhum guia criado neste perfil ainda.</p>
          ) : (
            <div className={styles.guidesGrid}>
              {guideCards.map((guide) => (
                <article key={guide.title} className={styles.guideCard} data-tone={guide.tone}>
                  <span className={styles.guideEmoji} aria-hidden="true">
                    {guide.emoji}
                  </span>
                  <div className={styles.guideText}>
                    <strong className={styles.guideTitle}>{guide.title}</strong>
                    <span className={styles.guideMeta}>{guide.meta}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className={styles.rail}>
        <section className={`${styles.railCard} ${styles.aiCard}`}>
          <header className={styles.aiHeader}>
            <Icon name="sparkles" size={16} className={styles.aiSparkles} />
            <h2>IA Decide</h2>
          </header>

          <div className={styles.aiBubble}>
            <span className={styles.aiAvatar} aria-hidden="true">
              <Icon name="robot" size={20} />
            </span>
            <p>Escolho usando o perfil ativo, seus filtros e os restaurantes salvos.</p>
          </div>

          <div className={styles.scopePicker} role="radiogroup" aria-label="Escopo da IA">
            {AI_SCOPE_OPTIONS.map((option) => (
              <button
                aria-checked={decideScope === option.id}
                className={styles.scopeButton}
                data-active={decideScope === option.id}
                key={option.id}
                onClick={() => setDecideScope(option.id)}
                role="radio"
                type="button"
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>

          {decideScope === 'guia' ? (
            <label className={styles.guideSelect}>
              <span>Guia</span>
              <select
                className="selectInput"
                disabled={!guias?.length}
                onChange={(event) => setSelectedGuiaId(event.target.value)}
                value={selectedGuiaId}
              >
                {(guias ?? []).map((guia) => (
                  <option key={guia.id} value={guia.id}>
                    {guia.nome}
                  </option>
                ))}
              </select>
              {!selectedGuia ? <small>Crie um guia para usar este escopo.</small> : null}
            </label>
          ) : null}

          <ul className={styles.aiCriteria}>
            {aiCriteria.map((item) => (
              <li key={item.label}>
                <span className={styles.aiCriteriaLabel}>
                  <Icon name={item.icon} size={15} />
                  {item.label}
                </span>
                <span className={styles.aiCriteriaValue}>{item.value}</span>
              </li>
            ))}
          </ul>

          <button
            className={styles.aiButton}
            disabled={isLoading}
            onClick={() => handleDecide()}
            type="button"
          >
            {isLoading ? 'A IA esta escolhendo...' : 'Deixar a IA decidir'}{' '}
            <Icon name="sparkles" size={14} />
          </button>
        </section>

        <section className={styles.railCard}>
          <header className={styles.railHeader}>
            <h2>Atividade recente</h2>
            <Link className={styles.sectionLink} to="/lugares">
              Ver tudo
            </Link>
          </header>

          {recentActivity.length === 0 ? (
            <p className={styles.muted}>
              Nenhuma atividade ainda. Comecem adicionando lugares.
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
                      {PLACE_STATUS_LABELS[item.status as PlaceStatus]} - {item.name}
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
            <h2>{activeProfileName}</h2>
            <Link aria-label="Editar perfil" className={styles.groupAddButton} to="/perfil">
              <Icon name="pencil" size={14} />
            </Link>
          </header>

          <div className={styles.groupMembers}>
            {activeMembers.slice(0, 4).map((membro, index) => (
              <span
                className={`${styles.groupAvatarPhoto} ${styles.groupAvatarInitial}`}
                key={memberKey(membro, index)}
                title={membro.nome}
              >
                {getProfileInitial(membro.nome)}
              </span>
            ))}
          </div>
          <p className={styles.muted}>
            {activeProfileKind} - {getMemberCountLabel(activeMembers.length)}
          </p>
        </section>
      </aside>
    </div>
  )
}
