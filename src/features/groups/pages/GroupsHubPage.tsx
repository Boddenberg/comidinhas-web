import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as QRCode from 'qrcode'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import type { Grupo, Membro, Perfil } from '@/features/auth/types'
import {
  aceitarSolicitacaoGrupo,
  buildGrupoInviteFromCodigo,
  createGrupo,
  fetchGrupoInvite,
  listSolicitacoesGrupo,
  listGrupos,
  updateGrupo,
  type GrupoInvite,
  type GrupoCreatePayload,
  type SolicitacaoEntradaGrupo,
} from '@/features/auth/services/authService'
import {
  DEFAULT_GROUP_BACKGROUND_URL,
  GROUP_BACKGROUND_OPTIONS,
  getGroupBackgroundValue,
  pickRandomGroupBackgroundValue,
  resolveGroupBackgroundUrl,
  type GroupBackgroundOption,
} from '@/features/groups/lib/groupBackgrounds'
import { listGuias, type Guia } from '@/features/guides/services/guidesService'
import { fetchHome, type HomeDashboard } from '@/features/home/services/homeService'
import { listPlaces } from '@/features/places/services/placesService'
import { PLACE_STATUS_LABELS, type Place } from '@/features/places/types'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './GroupsHubPage.module.css'

type GroupFilter = 'todos' | 'casal' | 'amigos' | 'familia' | 'viagem'
type GroupTone = Exclude<GroupFilter, 'todos'>
type CreateKind = Exclude<GroupTone, 'casal'>

type DetailsState = {
  home: HomeDashboard | null
  guias: Guia[]
  places: Place[]
  totalPlaces: number
  loading: boolean
  error: string | null
}

const FILTERS: Array<{ id: GroupFilter; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { id: 'todos', label: 'Todos', icon: 'grid' },
  { id: 'casal', label: 'Casal', icon: 'heart' },
  { id: 'amigos', label: 'Amigos', icon: 'users' },
  { id: 'familia', label: 'Familia', icon: 'home' },
  { id: 'viagem', label: 'Viagem', icon: 'pin' },
]

const TONE_META: Record<
  GroupTone,
  { label: string; icon: Parameters<typeof Icon>[0]['name']; accent: string }
> = {
  casal: { label: 'Casal', icon: 'heart', accent: 'pink' },
  amigos: { label: 'Amigos', icon: 'users', accent: 'blue' },
  familia: { label: 'Familia', icon: 'home', accent: 'orange' },
  viagem: { label: 'Viagem', icon: 'pin', accent: 'violet' },
}

const CREATE_KINDS: Array<{ id: CreateKind; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { id: 'amigos', label: 'Amigos', icon: 'users' },
  { id: 'familia', label: 'Familia', icon: 'home' },
  { id: 'viagem', label: 'Viagem', icon: 'pin' },
]

const DEFAULT_DESCRIPTIONS: Record<CreateKind, string> = {
  amigos: 'Espaco para salvar lugares e decidir os proximos roles com a turma.',
  familia: 'Um cantinho para organizar almocos, favoritos e descobertas em familia.',
  viagem: 'Lista compartilhada para planejar restaurantes, bares e paradas da viagem.',
}

const EMPTY_DETAILS: DetailsState = {
  home: null,
  guias: [],
  places: [],
  totalPlaces: 0,
  loading: false,
  error: null,
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function groupText(group: Grupo) {
  return normalizeText(`${group.nome} ${group.descricao ?? ''} ${group.tipo}`)
}

function getGroupTone(group: Grupo): GroupTone {
  const text = groupText(group)

  if (group.tipo === 'casal' || text.includes('casal')) return 'casal'
  if (text.includes('familia')) return 'familia'
  if (
    text.includes('viagem') ||
    text.includes('viajar') ||
    text.includes('role') ||
    text.includes('roles')
  ) {
    return 'viagem'
  }

  return 'amigos'
}

function getGroupDescription(group: Grupo) {
  const description = group.descricao?.trim()
  if (description) return description

  const tone = getGroupTone(group)
  if (tone === 'casal') {
    return 'Nosso espaco para salvar lugares, decidir o proximo date e organizar favoritos.'
  }
  return DEFAULT_DESCRIPTIONS[tone]
}

function getMembers(group: Grupo, perfil: Perfil | null) {
  const members = (group.membros ?? []).filter(Boolean)
  if (members.length > 0) return members

  if (!perfil) return []
  return [{ perfil_id: perfil.id, nome: perfil.nome, email: perfil.email, papel: 'dono' }]
}

function memberInitial(member: Membro) {
  return member.nome?.trim().slice(0, 1).toUpperCase() || '?'
}

function personInitial(name?: string | null, email?: string | null) {
  return name?.trim().slice(0, 1).toUpperCase() || email?.trim().slice(0, 1).toUpperCase() || '?'
}

function memberMatchesPerfil(member: Membro, perfil: Perfil) {
  if (member.perfil_id && member.perfil_id === perfil.id) return true
  if (!member.email || !perfil.email) return false
  return member.email.toLowerCase() === perfil.email.toLowerCase()
}

function canReviewJoinRequests(group: Grupo, perfil: Perfil | null) {
  if (!perfil || group.tipo === 'individual') return false
  if (group.dono_perfil_id === perfil.id) return true
  if (group.dono_perfil_id) return false

  return (group.membros ?? []).some((member) => memberMatchesPerfil(member, perfil))
}

function formatDate(value?: string | null) {
  if (!value) return 'sem data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatRelativeTime(value?: string | null) {
  if (!value) return 'agora'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'agora'

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 60) return minutes <= 1 ? 'agora' : `ha ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'ha 1 hora' : `ha ${hours} horas`

  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? 'ontem' : `ha ${days} dias`

  const months = Math.floor(days / 30)
  return months === 1 ? 'ha 1 mes' : `ha ${months} meses`
}

function placeImage(place?: Place) {
  return place?.image_url ?? place?.photos.find((photo) => photo.url)?.url ?? DEFAULT_GROUP_BACKGROUND_URL
}

function priceLabel(place: Place) {
  if (!place.price_range) return '$$'
  return '$'.repeat(Math.max(1, Math.min(place.price_range, 4)))
}

function mergeGroups(primary: Grupo[] | null, fallback: Grupo[]) {
  const seen = new Set<string>()
  const output: Grupo[] = []

  ;[...(primary ?? []), ...fallback].forEach((group) => {
    if (!group?.id || seen.has(group.id)) return
    seen.add(group.id)
    output.push(group)
  })

  return output
}

function upsertGroup(groups: Grupo[] | null, updatedGroup: Grupo) {
  if (!groups?.length) return [updatedGroup]

  let replaced = false
  const nextGroups = groups.map((group) => {
    if (group.id !== updatedGroup.id) return group
    replaced = true
    return { ...group, ...updatedGroup }
  })

  return replaced ? nextGroups : [updatedGroup, ...nextGroups]
}

function BackgroundPicker({
  currentValue,
  disabled,
  onSelect,
}: {
  currentValue?: string | null
  disabled?: boolean
  onSelect: (option: GroupBackgroundOption) => void | Promise<void>
}) {
  if (GROUP_BACKGROUND_OPTIONS.length === 0) {
    return <p className={styles.muted}>Nenhuma foto disponivel.</p>
  }

  const normalizedValue = getGroupBackgroundValue(currentValue)

  return (
    <div className={styles.backgroundPicker}>
      {GROUP_BACKGROUND_OPTIONS.map((option) => {
        const selected = normalizedValue === option.value

        return (
          <button
            aria-pressed={selected}
            className={`${styles.backgroundOption} ${selected ? styles.backgroundOptionActive : ''}`}
            disabled={disabled}
            key={option.value}
            onClick={() => onSelect(option)}
            type="button"
          >
            <img alt="" src={option.url} />
            <span>{option.label}</span>
            {selected ? (
              <span className={styles.backgroundCheck}>
                <Icon name="check" size={14} />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function GroupsHubPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { perfil, grupo, grupos, selectGrupo } = useAuth()
  const [remoteGroups, setRemoteGroups] = useState<Grupo[] | null>(null)
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState(grupo?.id ?? '')
  const [filter, setFilter] = useState<GroupFilter>('todos')
  const [search, setSearch] = useState('')
  const [details, setDetails] = useState<DetailsState>(EMPTY_DETAILS)
  const [switchingGroup, setSwitchingGroup] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createKind, setCreateKind] = useState<CreateKind>('amigos')
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createBackground, setCreateBackground] = useState(() => pickRandomGroupBackgroundValue())
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [backgroundOpen, setBackgroundOpen] = useState(false)
  const [backgroundSaving, setBackgroundSaving] = useState(false)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState<GrupoInvite | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const [joinRequests, setJoinRequests] = useState<SolicitacaoEntradaGrupo[]>([])
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false)
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null)
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null)

  const queryGroupId = searchParams.get('grupo') ?? ''
  const shouldOpenRequests = searchParams.get('solicitacoes') === 'pendentes'

  const allGroups = useMemo(() => mergeGroups(remoteGroups, grupos), [grupos, remoteGroups])

  const selectedGroup = useMemo(() => {
    return (
      allGroups.find((item) => item.id === selectedGroupId) ??
      allGroups.find((item) => item.id === grupo?.id) ??
      allGroups[0] ??
      null
    )
  }, [allGroups, grupo?.id, selectedGroupId])
  const canReviewSelectedRequests = selectedGroup
    ? canReviewJoinRequests(selectedGroup, perfil)
    : false

  useEffect(() => {
    if (!perfil) {
      setGroupsLoading(false)
      return
    }

    let cancelled = false
    setGroupsLoading(true)
    listGrupos(perfil.id)
      .then((result) => {
        if (cancelled) return
        setRemoteGroups(result)
        setGroupsError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setGroupsError(getErrorMessage(err, 'Nao foi possivel carregar todos os grupos.'))
      })
      .finally(() => {
        if (cancelled) return
        setGroupsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [perfil])

  useEffect(() => {
    if (allGroups.length === 0) {
      setSelectedGroupId('')
      return
    }

    if (selectedGroupId && allGroups.some((item) => item.id === selectedGroupId)) return
    const currentGroup = grupo?.id && allGroups.some((item) => item.id === grupo.id)
    setSelectedGroupId(currentGroup ? grupo.id : allGroups[0].id)
  }, [allGroups, grupo?.id, selectedGroupId])

  useEffect(() => {
    if (!queryGroupId || selectedGroupId === queryGroupId) return
    if (!allGroups.some((item) => item.id === queryGroupId)) return
    setSelectedGroupId(queryGroupId)
  }, [allGroups, queryGroupId, selectedGroupId])

  useEffect(() => {
    if (!selectedGroup) {
      setDetails(EMPTY_DETAILS)
      return
    }

    let cancelled = false
    setDetails((current) => ({ ...current, loading: true, error: null }))

    Promise.allSettled([
      fetchHome(selectedGroup.id, 6),
      listGuias(selectedGroup.id),
      listPlaces(selectedGroup.id, { page_size: 9, sort_by: 'updated_at', sort_order: 'desc' }),
    ]).then(([homeResult, guiasResult, placesResult]) => {
      if (cancelled) return

      const rejected = [homeResult, guiasResult, placesResult].filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      )

      setDetails({
        home: homeResult.status === 'fulfilled' ? homeResult.value : null,
        guias: guiasResult.status === 'fulfilled' ? guiasResult.value : [],
        places: placesResult.status === 'fulfilled' ? placesResult.value.items : [],
        totalPlaces: placesResult.status === 'fulfilled' ? placesResult.value.total : 0,
        loading: false,
        error:
          rejected.length === 3
            ? getErrorMessage(rejected[0].reason, 'Nao foi possivel carregar o resumo do grupo.')
            : null,
      })
    })

    return () => {
      cancelled = true
    }
  }, [selectedGroup])

  useEffect(() => {
    setInvite(null)
    setInviteError(null)
    setInviteCopied(null)
    setQrImage(null)
    setBackgroundOpen(false)
    setBackgroundError(null)
    setJoinRequests([])
    setJoinRequestsError(null)
    setAcceptingRequestId(null)
  }, [selectedGroup?.id])

  useEffect(() => {
    if (!invite?.qrCodePayload) {
      setQrImage(null)
      return
    }

    let cancelled = false
    QRCode.toDataURL(invite.qrCodePayload, {
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
      margin: 2,
      width: 240,
    })
      .then((dataUrl) => {
        if (cancelled) return
        setQrImage(dataUrl)
      })
      .catch(() => {
        if (cancelled) return
        setQrImage(null)
      })

    return () => {
      cancelled = true
    }
  }, [invite?.qrCodePayload])

  useEffect(() => {
    if (!selectedGroup || !perfil || !canReviewSelectedRequests) {
      setJoinRequests([])
      setJoinRequestsLoading(false)
      if (requestsOpen) setRequestsOpen(false)
      return
    }

    let cancelled = false
    setJoinRequestsLoading(true)
    setJoinRequestsError(null)

    listSolicitacoesGrupo(selectedGroup.id, perfil.id, 'pendente')
      .then((response) => {
        if (cancelled) return
        setJoinRequests(response.items)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setJoinRequests([])
        setJoinRequestsError(getErrorMessage(err, 'Nao foi possivel carregar solicitacoes.'))
      })
      .finally(() => {
        if (cancelled) return
        setJoinRequestsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canReviewSelectedRequests, perfil, requestsOpen, selectedGroup])

  useEffect(() => {
    if (!shouldOpenRequests || !selectedGroup) return
    if (queryGroupId && selectedGroup.id !== queryGroupId) return
    setRequestsOpen(true)
  }, [queryGroupId, selectedGroup, shouldOpenRequests])

  const filteredGroups = useMemo(() => {
    const term = normalizeText(search.trim())

    return allGroups.filter((item) => {
      const tone = getGroupTone(item)
      if (filter !== 'todos' && tone !== filter) return false
      if (!term) return true
      return groupText(item).includes(term)
    })
  }, [allGroups, filter, search])

  const selectedMembers = selectedGroup ? getMembers(selectedGroup, perfil) : []
  const selectedTone = selectedGroup ? getGroupTone(selectedGroup) : 'amigos'
  const selectedMeta = TONE_META[selectedTone]
  const isActiveGroup = Boolean(selectedGroup && grupo?.id === selectedGroup.id)
  const pendingJoinRequestCount = joinRequests.filter((request) => request.status === 'pendente').length
  const totalPlaces = details.home?.counters.total_places ?? details.totalPlaces
  const totalFavorites =
    details.home?.counters.total_favorites ?? details.places.filter((place) => place.is_favorite).length
  const recentPlaces = details.home?.latest_places.length ?? details.places.length
  const heroImage = resolveGroupBackgroundUrl(selectedGroup?.foto_url)
  const inviteWhatsAppUrl = invite
    ? `https://wa.me/?text=${encodeURIComponent(invite.message)}`
    : undefined
  const inviteMailUrl =
    invite && selectedGroup
      ? `mailto:?subject=${encodeURIComponent(`Convite para ${selectedGroup.nome}`)}&body=${encodeURIComponent(invite.message)}`
      : undefined
  const canShareInvite = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function handleSelectActiveGroup() {
    if (!selectedGroup || isActiveGroup) return
    setSwitchingGroup(true)
    setNotice(null)

    try {
      await selectGrupo(selectedGroup.id)
      setNotice('Grupo ativo atualizado.')
    } catch (err: unknown) {
      setNotice(getErrorMessage(err, 'Nao foi possivel entrar nesse grupo.'))
    } finally {
      setSwitchingGroup(false)
    }
  }

  async function copyInviteValue(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      setInviteCopied(successMessage)
      setNotice(successMessage)
    } catch {
      setInviteCopied(value)
      setNotice(value)
    }
  }

  async function handleOpenInvite() {
    if (!selectedGroup || !perfil) return

    setInviteOpen(true)
    setInviteCopied(null)

    if (invite && !inviteError) return

    const localInvite = buildGrupoInviteFromCodigo(selectedGroup)
    if (localInvite) {
      setInvite(localInvite)
      setInviteError(null)
      return
    }

    setInviteLoading(true)
    setInviteError(null)

    try {
      const result = await fetchGrupoInvite(selectedGroup.id, perfil.id)
      setInvite(result)
    } catch (err: unknown) {
      setInviteError(getErrorMessage(err, 'Nao foi possivel gerar o convite agora.'))
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleCopyInviteLink() {
    if (!invite) return
    await copyInviteValue(invite.url, 'Link do convite copiado.')
  }

  async function handleCopyInviteMessage() {
    if (!invite) return
    await copyInviteValue(invite.message, 'Mensagem do convite copiada.')
  }

  async function handleShareInvite() {
    if (!invite || !selectedGroup || typeof navigator.share !== 'function') return

    try {
      await navigator.share({
        text: invite.message,
        title: `Convite para ${selectedGroup.nome}`,
        url: invite.url,
      })
      setInviteCopied('Convite compartilhado.')
    } catch {
      setInviteCopied(null)
    }
  }

  async function handleAcceptJoinRequest(requestId: string) {
    if (!selectedGroup || !perfil) return

    setAcceptingRequestId(requestId)
    setJoinRequestsError(null)

    try {
      const updated = await aceitarSolicitacaoGrupo(selectedGroup.id, requestId, perfil.id)

      setRemoteGroups((current) => upsertGroup(current ?? allGroups, updated))
      setJoinRequests((current) => current.filter((item) => item.id !== requestId))
      setSelectedGroupId(updated.id)
      await selectGrupo(updated.id).catch(() => undefined)
      setRequestsOpen(false)
      setNotice('Solicitacao aceita. Grupo aberto.')
      setSearchParams({ grupo: updated.id })
      window.dispatchEvent(new Event('comidinhas:group-requests-updated'))
    } catch (err: unknown) {
      setJoinRequestsError(getErrorMessage(err, 'Nao foi possivel aceitar a solicitacao.'))
    } finally {
      setAcceptingRequestId(null)
    }
  }

  function openCreateGroup() {
    setCreateBackground(pickRandomGroupBackgroundValue())
    setCreateError(null)
    setCreateOpen(true)
  }

  async function handleUpdateBackground(option: GroupBackgroundOption) {
    if (!selectedGroup || !perfil) return

    const currentBackground = getGroupBackgroundValue(selectedGroup.foto_url)
    if (currentBackground === option.value) {
      setBackgroundOpen(false)
      return
    }

    setBackgroundSaving(true)
    setBackgroundError(null)

    try {
      const updated = await updateGrupo(selectedGroup.id, {
        foto_url: option.value,
        responsavel_perfil_id: perfil.id,
      })
      const nextGroup = { ...selectedGroup, ...updated, foto_url: updated.foto_url ?? option.value }

      setRemoteGroups((current) => upsertGroup(current ?? allGroups, nextGroup))
      setNotice('Fundo do grupo atualizado.')
      setBackgroundOpen(false)
    } catch (err: unknown) {
      setBackgroundError(getErrorMessage(err, 'Nao foi possivel atualizar o fundo do grupo.'))
    } finally {
      setBackgroundSaving(false)
    }
  }

  function handleRandomCreateBackground() {
    setCreateBackground(pickRandomGroupBackgroundValue())
  }

  async function handleRandomUpdateBackground() {
    const randomValue = pickRandomGroupBackgroundValue()
    const option = GROUP_BACKGROUND_OPTIONS.find((item) => item.value === randomValue)
    if (!option) return
    await handleUpdateBackground(option)
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!perfil) return

    const nome = createName.trim()
    if (!nome) {
      setCreateError('Informe um nome para o grupo.')
      return
    }

    const payload: GrupoCreatePayload = {
      nome,
      tipo: 'grupo',
      descricao: createDescription.trim() || DEFAULT_DESCRIPTIONS[createKind],
      foto_url: createBackground || undefined,
      dono_perfil_id: perfil.id,
      membros: [{ perfil_id: perfil.id }],
    }

    setCreating(true)
    setCreateError(null)

    try {
      const created = await createGrupo(payload)
      const createdWithBackground = {
        ...created,
        foto_url: created.foto_url ?? createBackground,
      }

      setRemoteGroups((current) => mergeGroups([createdWithBackground], current ?? allGroups))
      setSelectedGroupId(createdWithBackground.id)
      await selectGrupo(createdWithBackground.id)
      setCreateOpen(false)
      setCreateName('')
      setCreateDescription('')
      setCreateKind('amigos')
      setCreateBackground(pickRandomGroupBackgroundValue())
      setNotice('Grupo criado e selecionado.')
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, 'Nao foi possivel criar o grupo.'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Seus grupos</h1>
          <p className={styles.subtitle}>
            Escolha um espaco para decidir, salvar lugares e planejar roles.
          </p>
        </div>

        <button className={styles.primaryAction} onClick={openCreateGroup} type="button">
          <Icon name="plus" size={18} />
          <span>Criar grupo</span>
        </button>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name="search" size={18} />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar grupo..."
            type="search"
            value={search}
          />
        </label>

        <div className={styles.filters} role="tablist">
          {FILTERS.map((item) => (
            <button
              aria-selected={filter === item.id}
              className={`${styles.filterChip} ${filter === item.id ? styles.filterChipActive : ''}`}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {groupsError && allGroups.length > 0 ? (
        <p className={styles.inlineNotice}>{groupsError}</p>
      ) : null}

      {groupsLoading && allGroups.length === 0 ? (
        <p className={styles.loading}>Buscando seus grupos...</p>
      ) : allGroups.length === 0 ? (
        <section className={styles.emptyState}>
          <Icon name="users" size={28} />
          <strong>Nenhum grupo encontrado.</strong>
          <p>Crie um grupo para comecar a organizar lugares com outras pessoas.</p>
          <button className={styles.primaryAction} onClick={openCreateGroup} type="button">
            <Icon name="plus" size={18} />
            <span>Criar grupo</span>
          </button>
        </section>
      ) : (
        <div className={styles.hub}>
          <aside className={styles.groupPanel} aria-label="Lista de grupos">
            <div className={styles.panelHeader}>
              <div>
                <strong>{filteredGroups.length} grupos</strong>
                <span>{filter === 'todos' ? 'todos os espacos' : TONE_META[filter].label}</span>
              </div>
              <button
                aria-label="Criar grupo"
                className={styles.iconButton}
                onClick={openCreateGroup}
                type="button"
              >
                <Icon name="plus" size={18} />
              </button>
            </div>

            <div className={styles.groupList}>
              {filteredGroups.map((item) => {
                const tone = getGroupTone(item)
                const meta = TONE_META[tone]
                const members = getMembers(item, perfil)
                const selected = selectedGroup?.id === item.id
                const active = grupo?.id === item.id

                return (
                  <button
                    className={`${styles.groupCard} ${selected ? styles.groupCardSelected : ''}`}
                    key={item.id}
                    onClick={() => setSelectedGroupId(item.id)}
                    type="button"
                  >
                    <span className={styles.groupCardCover}>
                      <img alt="" src={resolveGroupBackgroundUrl(item.foto_url)} />
                      <span className={`${styles.tonePill} ${styles[meta.accent]}`}>
                        <Icon name={meta.icon} size={14} />
                        {meta.label}
                      </span>
                      {active ? (
                        <span className={styles.activeBadge} aria-label="Grupo ativo">
                          <Icon name="check" size={14} />
                        </span>
                      ) : null}
                    </span>

                    <span className={styles.groupCardBody}>
                      <strong>{item.nome}</strong>
                      <span className={styles.groupMetaLine}>
                        <span className={styles.avatarStack}>
                          {members.slice(0, 3).map((member, index) => (
                            <span key={`${member.email ?? member.nome}-${index}`}>
                              {memberInitial(member)}
                            </span>
                          ))}
                        </span>
                        <span>{members.length || 1} membros</span>
                      </span>
                      <span className={styles.groupFoot}>
                        Atualizado {formatRelativeTime(item.atualizado_em ?? item.criado_em)}
                        <Icon name="chevron-right" size={16} />
                      </span>
                    </span>
                  </button>
                )
              })}

              <button
                className={`${styles.groupCard} ${styles.createGroupCard}`}
                onClick={openCreateGroup}
                type="button"
              >
                <span className={styles.createGroupIcon}>
                  <Icon name="plus" size={26} />
                </span>
                <span className={styles.createGroupCopy}>
                  <strong>Criar novo grupo</strong>
                  <span>Monte um espaco para salvar lugares com outras pessoas.</span>
                </span>
                <Icon name="chevron-right" size={17} />
              </button>
            </div>
          </aside>

          {selectedGroup ? (
            <section className={styles.details}>
              <div className={styles.hero}>
                <img alt="" className={styles.heroImage} src={heroImage} />
                <div className={styles.heroOverlay} />
                <div className={styles.heroContent}>
                  <span className={`${styles.tonePill} ${styles[selectedMeta.accent]}`}>
                    <Icon name={selectedMeta.icon} size={15} />
                    {selectedMeta.label}
                  </span>
                  <h2>{selectedGroup.nome}</h2>
                  <p>{getGroupDescription(selectedGroup)}</p>

                  <div className={styles.statStrip}>
                    <span>
                      <Icon name="bookmark" size={18} />
                      <strong>{totalPlaces}</strong>
                      lugares
                    </span>
                    <span>
                      <Icon name="book-open" size={18} />
                      <strong>{details.guias.length}</strong>
                      guias
                    </span>
                    <span>
                      <Icon name="users" size={18} />
                      <strong>{selectedMembers.length || 1}</strong>
                      membros
                    </span>
                    <span>
                      <Icon name="heart" size={18} />
                      <strong>{totalFavorites}</strong>
                      favoritos
                    </span>
                  </div>
                </div>

                <div className={styles.heroActions}>
                  <button
                    className={styles.enterButton}
                    disabled={isActiveGroup || switchingGroup}
                    onClick={handleSelectActiveGroup}
                    type="button"
                  >
                    <span>{isActiveGroup ? 'Grupo ativo' : 'Entrar no grupo'}</span>
                    {isActiveGroup ? <Icon name="check" size={18} /> : <Icon name="arrow-right" size={18} />}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    disabled={!perfil}
                    onClick={handleOpenInvite}
                    type="button"
                  >
                    <Icon name="mail" size={17} />
                    <span>Convidar</span>
                  </button>
                  {canReviewSelectedRequests ? (
                    <button
                      className={`${styles.secondaryButton} ${styles.requestActionButton}`}
                      onClick={() => setRequestsOpen(true)}
                      type="button"
                    >
                      <Icon name="bell" size={17} />
                      <span>Solicitacoes</span>
                      {pendingJoinRequestCount > 0 ? (
                        <span className={styles.actionBadge}>{pendingJoinRequestCount}</span>
                      ) : null}
                    </button>
                  ) : null}
                  <button
                    className={styles.secondaryButton}
                    disabled={!perfil || GROUP_BACKGROUND_OPTIONS.length === 0}
                    onClick={() => setBackgroundOpen(true)}
                    type="button"
                  >
                    <Icon name="image-plus" size={17} />
                    <span>Trocar fundo</span>
                  </button>
                  <button
                    aria-label="Ajustar perfil"
                    className={styles.squareButton}
                    onClick={() => navigate('/perfil')}
                    type="button"
                  >
                    <Icon name="settings" size={18} />
                  </button>
                </div>
              </div>

              {notice ? <p className={styles.inlineNotice}>{notice}</p> : null}
              {details.error ? <p className={styles.errorNotice}>{details.error}</p> : null}

              <div className={styles.detailGrid}>
                <section className={styles.block}>
                  <div className={styles.blockHeader}>
                    <h3>Membros</h3>
                    <span>{selectedMembers.length || 1} no grupo</span>
                  </div>
                  <div className={styles.members}>
                    {selectedMembers.slice(0, 5).map((member, index) => (
                      <span className={styles.member} key={`${member.email ?? member.nome}-${index}`}>
                        <span className={styles.memberAvatar}>{memberInitial(member)}</span>
                        <strong>{member.nome}</strong>
                      </span>
                    ))}
                    <button className={styles.addMember} disabled={!perfil} onClick={handleOpenInvite} type="button">
                      <Icon name="plus" size={20} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </section>

                <section className={styles.block}>
                  <div className={styles.blockHeader}>
                    <h3>Sobre o grupo</h3>
                  </div>
                  <dl className={styles.aboutList}>
                    <div>
                      <dt>Criado em</dt>
                      <dd>{formatDate(selectedGroup.criado_em)}</dd>
                    </div>
                    <div>
                      <dt>Tipo</dt>
                      <dd>{selectedMeta.label}</dd>
                    </div>
                    <div>
                      <dt>Codigo</dt>
                      <dd>{selectedGroup.codigo ?? 'privado'}</dd>
                    </div>
                  </dl>
                </section>

                <section className={`${styles.block} ${styles.aiBlock}`}>
                  <div className={styles.blockHeader}>
                    <h3>Proxima decisao</h3>
                    <span>IA do grupo</span>
                  </div>
                  <p>Deixe a IA sugerir um lugar com base nos favoritos e no momento de voces.</p>
                  <button className={styles.aiButton} onClick={() => navigate('/chat')} type="button">
                    <Icon name="sparkles" size={18} />
                    <span>Deixar a IA decidir</span>
                  </button>
                </section>
              </div>

              <div className={styles.bottomGrid}>
                <section className={styles.block}>
                  <div className={styles.blockHeader}>
                    <h3>Guias compartilhados</h3>
                    <Link to="/guias">Ver todos</Link>
                  </div>
                  <div className={styles.guideList}>
                    {details.loading ? (
                      <p className={styles.muted}>Carregando guias...</p>
                    ) : details.guias.length === 0 ? (
                      <p className={styles.muted}>Nenhum guia nesse grupo ainda.</p>
                    ) : (
                      details.guias.slice(0, 3).map((guia) => (
                        <article className={styles.guideCard} key={guia.id}>
                          <img alt="" src={placeImage(guia.lugares[0])} />
                          <strong>{guia.nome}</strong>
                          <span>{guia.total_lugares} lugares</span>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className={styles.block}>
                  <div className={styles.blockHeader}>
                    <h3>Atividade recente</h3>
                    <Link to="/lugares">Ver tudo</Link>
                  </div>
                  <div className={styles.activityList}>
                    {details.loading ? (
                      <p className={styles.muted}>Carregando atividade...</p>
                    ) : details.places.length === 0 ? (
                      <p className={styles.muted}>Nada recente por aqui ainda.</p>
                    ) : (
                      details.places.slice(0, 4).map((place) => (
                        <article className={styles.activityItem} key={place.id}>
                          <img alt="" src={placeImage(place)} />
                          <span>
                            <strong>{place.added_by ?? selectedMembers[0]?.nome ?? 'Alguem'}</strong>{' '}
                            salvou {place.name}
                            <small>{formatRelativeTime(place.updated_at ?? place.created_at)}</small>
                          </span>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className={styles.block}>
                  <div className={styles.blockHeader}>
                    <h3>Lugares em destaque</h3>
                    <Link to="/lugares">Ver todos</Link>
                  </div>
                  <div className={styles.placeList}>
                    {details.loading ? (
                      <p className={styles.muted}>Carregando lugares...</p>
                    ) : details.places.length === 0 ? (
                      <p className={styles.muted}>Salve o primeiro lugar desse grupo.</p>
                    ) : (
                      details.places.slice(0, 3).map((place) => (
                        <article className={styles.placeCard} key={place.id}>
                          <img alt="" src={placeImage(place)} />
                          <strong>{place.name}</strong>
                          <span>
                            {priceLabel(place)} · {place.category ?? PLACE_STATUS_LABELS[place.status]}
                          </span>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className={styles.quickSummary}>
                <span>
                  <Icon name="clock" size={17} />
                  {recentPlaces} movimentacoes recentes
                </span>
                <span>
                  <Icon name="bookmark" size={17} />
                  {totalPlaces} lugares salvos
                </span>
                <span>
                  <Icon name="heart" size={17} />
                  {totalFavorites} favoritos
                </span>
              </div>
            </section>
          ) : null}
        </div>
      )}

      {requestsOpen && selectedGroup ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="requests-title"
            aria-modal="true"
            className={`${styles.modal} ${styles.requestsModal}`}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="requests-title">Solicitacoes de entrada</h2>
                <p>{selectedGroup.nome}</p>
              </div>
              <button
                aria-label="Fechar"
                className={styles.squareButton}
                onClick={() => setRequestsOpen(false)}
                type="button"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {!canReviewSelectedRequests ? (
              <p className={styles.errorNotice}>
                Apenas o dono do grupo pode aceitar solicitacoes.
              </p>
            ) : joinRequestsLoading ? (
              <p className={styles.muted}>Carregando solicitacoes...</p>
            ) : joinRequestsError ? (
              <p className={styles.errorNotice}>{joinRequestsError}</p>
            ) : joinRequests.length === 0 ? (
              <p className={styles.muted}>Nenhuma solicitacao pendente por aqui.</p>
            ) : (
              <div className={styles.requestList}>
                {joinRequests.map((request) => (
                  <article className={styles.requestItem} key={request.id}>
                    <span className={styles.requestAvatar}>
                      {personInitial(request.nome, request.email)}
                    </span>
                    <div className={styles.requestBody}>
                      <strong>{request.nome ?? request.email ?? 'Novo membro'}</strong>
                      {request.email ? <span>{request.email}</span> : null}
                      <small>Solicitado em {formatDate(request.solicitado_em)}</small>
                      {request.mensagem ? (
                        <p className={styles.requestMessage}>{request.mensagem}</p>
                      ) : null}
                    </div>
                    <button
                      className={styles.enterButton}
                      disabled={acceptingRequestId !== null}
                      onClick={() => handleAcceptJoinRequest(request.id)}
                      type="button"
                    >
                      <span>{acceptingRequestId === request.id ? 'Aceitando...' : 'Aceitar'}</span>
                      <Icon name="check" size={18} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {backgroundOpen && selectedGroup ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="background-title"
            aria-modal="true"
            className={`${styles.modal} ${styles.backgroundModal}`}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="background-title">Fundo do grupo</h2>
                <p>{selectedGroup.nome}</p>
              </div>
              <button
                aria-label="Fechar"
                className={styles.squareButton}
                onClick={() => setBackgroundOpen(false)}
                type="button"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className={styles.backgroundHeader}>
              <span>Escolha uma foto</span>
              <button
                className={styles.randomBackgroundButton}
                disabled={backgroundSaving || !perfil || GROUP_BACKGROUND_OPTIONS.length === 0}
                onClick={handleRandomUpdateBackground}
                type="button"
              >
                <Icon name="sparkles" size={16} />
                <span>Aleatorio</span>
              </button>
            </div>

            <BackgroundPicker
              currentValue={selectedGroup.foto_url}
              disabled={backgroundSaving}
              onSelect={handleUpdateBackground}
            />

            {backgroundError ? <p className={styles.errorNotice}>{backgroundError}</p> : null}
          </section>
        </div>
      ) : null}

      {inviteOpen && selectedGroup ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="invite-title"
            aria-modal="true"
            className={`${styles.modal} ${styles.inviteModal}`}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="invite-title">Convidar para {selectedGroup.nome}</h2>
                <p>Compartilhe por link, mensagem ou QR code.</p>
              </div>
              <button
                aria-label="Fechar"
                className={styles.squareButton}
                onClick={() => setInviteOpen(false)}
                type="button"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {inviteLoading ? (
              <p className={styles.muted}>Gerando convite...</p>
            ) : inviteError ? (
              <>
                <p className={styles.errorNotice}>{inviteError}</p>
                <button className={styles.enterButton} onClick={handleOpenInvite} type="button">
                  <span>Tentar de novo</span>
                  <Icon name="arrow-right" size={18} />
                </button>
              </>
            ) : invite ? (
              <>
                <div className={styles.inviteContent}>
                  <div className={styles.qrPanel}>
                    {qrImage ? (
                      <img alt="QR code do convite" src={qrImage} />
                    ) : (
                      <div className={styles.qrPlaceholder}>QR</div>
                    )}
                    <span>Escaneie para abrir o convite</span>
                  </div>

                  <div className={styles.inviteDetails}>
                    <label className={styles.field}>
                      <span>Link</span>
                      <input readOnly value={invite.url} />
                    </label>

                    <label className={styles.field}>
                      <span>Mensagem</span>
                      <textarea readOnly value={invite.message} />
                    </label>
                  </div>
                </div>

                <div className={styles.inviteActions}>
                  <button className={styles.shareButton} onClick={handleCopyInviteLink} type="button">
                    <Icon name="link" size={17} />
                    <span>Copiar link</span>
                  </button>
                  <button className={styles.shareButton} onClick={handleCopyInviteMessage} type="button">
                    <Icon name="copy" size={17} />
                    <span>Copiar mensagem</span>
                  </button>
                  {canShareInvite ? (
                    <button className={styles.shareButton} onClick={handleShareInvite} type="button">
                      <Icon name="share" size={17} />
                      <span>Compartilhar</span>
                    </button>
                  ) : null}
                  {inviteWhatsAppUrl ? (
                    <a
                      className={styles.shareButton}
                      href={inviteWhatsAppUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Icon name="external-link" size={17} />
                      <span>WhatsApp</span>
                    </a>
                  ) : null}
                  {inviteMailUrl ? (
                    <a className={styles.shareButton} href={inviteMailUrl}>
                      <Icon name="mail" size={17} />
                      <span>E-mail</span>
                    </a>
                  ) : null}
                </div>

                {inviteCopied ? <p className={styles.inlineNotice}>{inviteCopied}</p> : null}
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {createOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <form className={styles.modal} onSubmit={handleCreateGroup}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Criar grupo</h2>
                <p>Um novo espaco compartilhado.</p>
              </div>
              <button
                aria-label="Fechar"
                className={styles.squareButton}
                onClick={() => setCreateOpen(false)}
                type="button"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className={styles.kindPicker} role="group" aria-label="Tipo do grupo">
              {CREATE_KINDS.map((kind) => (
                <button
                  aria-pressed={createKind === kind.id}
                  className={createKind === kind.id ? styles.kindActive : ''}
                  key={kind.id}
                  onClick={() => setCreateKind(kind.id)}
                  type="button"
                >
                  <Icon name={kind.icon} size={17} />
                  <span>{kind.label}</span>
                </button>
              ))}
            </div>

            <label className={styles.field}>
              <span>Nome</span>
              <input
                autoFocus
                maxLength={80}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Ex: Amigos do sabado"
                value={createName}
              />
            </label>

            <label className={styles.field}>
              <span>Descricao</span>
              <textarea
                maxLength={180}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder={DEFAULT_DESCRIPTIONS[createKind]}
                value={createDescription}
              />
            </label>

            <div className={styles.backgroundField}>
              <div className={styles.backgroundHeader}>
                <span>Fundo</span>
                <button
                  className={styles.randomBackgroundButton}
                  disabled={creating || GROUP_BACKGROUND_OPTIONS.length === 0}
                  onClick={handleRandomCreateBackground}
                  type="button"
                >
                  <Icon name="sparkles" size={16} />
                  <span>Aleatorio</span>
                </button>
              </div>

              <BackgroundPicker
                currentValue={createBackground}
                disabled={creating}
                onSelect={(option) => setCreateBackground(option.value)}
              />
            </div>

            {createError ? <p className={styles.errorNotice}>{createError}</p> : null}

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setCreateOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className={styles.enterButton} disabled={creating} type="submit">
                <span>{creating ? 'Criando...' : 'Criar grupo'}</span>
                <Icon name="arrow-right" size={18} />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
