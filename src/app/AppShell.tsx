import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import {
  listSolicitacoesGrupo,
  type SolicitacaoEntradaGrupo,
} from '@/features/auth/services/authService'
import type { Grupo, Perfil } from '@/features/auth/types'
import { resolveGroupBackgroundUrl } from '@/features/groups/lib/groupBackgrounds'
import { AddPlaceProvider, useAddPlace } from '@/features/places/AddPlaceContext'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './AppShell.module.css'

const navigation = [
  { icon: 'home', label: 'Início', to: '/' },
  { icon: 'users', label: 'Grupos', to: '/grupos' },
  { icon: 'pin', label: 'Lugares', to: '/lugares' },
  { icon: 'bookmark', label: 'Guias', to: '/guias' },
  { icon: 'sparkles', label: 'IA Decide', to: '/chat', badge: 'novo' },
  { icon: 'search', label: 'Explorar', to: '/explorar' },
  { icon: 'user', label: 'Nosso perfil', to: '/perfil' },
] as const

const REQUESTS_REFRESH_MS = 30_000

type PendingGroupRequest = {
  group: Grupo
  request: SolicitacaoEntradaGrupo
}

function sameProfile(member: Grupo['membros'][number], perfil: Perfil) {
  if (member.perfil_id && member.perfil_id === perfil.id) return true
  if (!member.email || !perfil.email) return false
  return member.email.toLowerCase() === perfil.email.toLowerCase()
}

function canReviewJoinRequests(group: Grupo, perfil: Perfil | null) {
  if (!perfil || group.tipo === 'individual') return false
  if (group.dono_perfil_id === perfil.id) return true
  if (group.dono_perfil_id) return false

  return group.membros.some((member) => sameProfile(member, perfil))
}

function isPersonalGroup(group: Grupo | null | undefined, perfil: Perfil | null) {
  if (!group) return false
  return group.tipo === 'individual' || group.id === perfil?.grupo_individual_id
}

function getProfileLabel(group: Grupo | null | undefined, perfil: Perfil | null) {
  if (!group) return 'Perfil selecionado'
  if (isPersonalGroup(group, perfil)) {
    return perfil?.nome?.trim() || group.nome || 'Meu perfil'
  }
  return group.nome || 'Grupo'
}

function getProfileKindLabel(group: Grupo, perfil: Perfil | null) {
  if (isPersonalGroup(group, perfil)) return 'Pessoal'
  if (group.tipo === 'casal') return 'Casal'
  return 'Grupo'
}

function getProfileInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'P'
}

function getProfilePhotoUrl(group: Grupo, perfil: Perfil | null) {
  if (isPersonalGroup(group, perfil)) {
    return perfil?.foto_url || (group.foto_url ? resolveGroupBackgroundUrl(group.foto_url) : null)
  }
  return group.foto_url ? resolveGroupBackgroundUrl(group.foto_url) : null
}

function getMemberCountLabel(group: Grupo) {
  const total = group.membros.length
  return `${total} ${total === 1 ? 'membro' : 'membros'}`
}

function orderProfileGroups(groups: Grupo[], activeGroup: Grupo | null, perfil: Perfil | null) {
  const byId = new Map<string, Grupo>()
  groups.forEach((item) => byId.set(item.id, item))
  if (activeGroup) byId.set(activeGroup.id, activeGroup)

  const items = Array.from(byId.values())
  const personal = items.find((item) => isPersonalGroup(item, perfil))
  if (!personal) return items

  return [personal, ...items.filter((item) => item.id !== personal.id)]
}

export function AppShell() {
  return (
    <AddPlaceProvider>
      <Shell />
    </AddPlaceProvider>
  )
}

function Shell() {
  const { perfil, grupo, grupos, selectGrupo, signOut } = useAuth()
  const { open: openAddPlace } = useAddPlace()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingGroupRequest[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [switchingGrupoId, setSwitchingGrupoId] = useState<string | null>(null)
  const [profileSwitchError, setProfileSwitchError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const fetchPendingRequests = useCallback(async () => {
    if (!perfil) {
      setPendingRequests([])
      return
    }

    const reviewableGroups = grupos.filter((item) => canReviewJoinRequests(item, perfil))
    if (reviewableGroups.length === 0) {
      setPendingRequests([])
      return
    }

    setNotificationsLoading(true)
    try {
      const results = await Promise.allSettled(
        reviewableGroups.map(async (item) => {
          const response = await listSolicitacoesGrupo(item.id, perfil.id, 'pendente')
          return response.items.map((request) => ({ group: item, request }))
        }),
      )

      setPendingRequests(
        results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
      )
    } finally {
      setNotificationsLoading(false)
    }
  }, [grupos, perfil])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    void fetchPendingRequests()
    const timer = window.setInterval(() => {
      void fetchPendingRequests()
    }, REQUESTS_REFRESH_MS)

    function refresh() {
      void fetchPendingRequests()
    }

    window.addEventListener('comidinhas:group-requests-updated', refresh)
    window.addEventListener('focus', refresh)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('comidinhas:group-requests-updated', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [fetchPendingRequests])

  useEffect(() => {
    if (!menuOpen) return
    function handle(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  const displayName = grupo?.nome || perfil?.nome || 'Comidinhas'
  const profileOptions = useMemo(
    () => orderProfileGroups(grupos, grupo, perfil),
    [grupo, grupos, perfil],
  )
  const pendingCount = pendingRequests.length

  async function handleSelectProfile(nextGrupo: Grupo) {
    if (nextGrupo.id === grupo?.id || switchingGrupoId) return

    setSwitchingGrupoId(nextGrupo.id)
    setProfileSwitchError(null)

    try {
      await selectGrupo(nextGrupo.id)
    } catch (err: unknown) {
      setProfileSwitchError(getErrorMessage(err, 'Nao foi possivel trocar o perfil.'))
    } finally {
      setSwitchingGrupoId(null)
    }
  }

  function handleNotificationsClick() {
    const first = pendingRequests[0]
    if (!first) {
      navigate('/grupos')
      return
    }

    navigate(`/grupos?grupo=${encodeURIComponent(first.group.id)}&solicitacoes=pendentes`)
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <NavLink className={styles.brand} to="/">
          <BrandLogo />
          <span className={styles.brandCopy}>
            <strong>comidinhas</strong>
            <span className={styles.brandTagline}>
              nossas escolhas, nossos rolês{' '}
              <Icon name="heart-filled" size={10} className={styles.brandHeart} />
            </span>
          </span>
        </NavLink>

        <nav aria-label="Navegação principal" className={styles.nav}>
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              end={item.to === '/'}
              to={item.to}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <Icon name={item.icon} size={19} className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
              {'badge' in item && item.badge ? (
                <span className={styles.navBadge}>{item.badge}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <section className={styles.profilePanel} aria-label="Perfis ativos">
          <header className={styles.profilePanelHeader}>
            <span className={styles.profileEyebrow}>Perfis ativos</span>
            <Icon name="users" size={14} className={styles.profileEyebrowIcon} />
          </header>

          {profileSwitchError ? (
            <span className={styles.profileError}>{profileSwitchError}</span>
          ) : null}

          <div className={styles.profileList}>
            {profileOptions.map((option) => {
              const isActive = option.id === grupo?.id
              const label = getProfileLabel(option, perfil)
              const kind = getProfileKindLabel(option, perfil)
              const photoUrl = getProfilePhotoUrl(option, perfil)
              const personal = isPersonalGroup(option, perfil)
              const subtitle = personal ? kind : `${kind} · ${getMemberCountLabel(option)}`

              return (
                <button
                  aria-pressed={isActive}
                  className={`${styles.profileOption} ${
                    isActive ? styles.profileOptionActive : ''
                  }`}
                  disabled={Boolean(switchingGrupoId)}
                  key={option.id}
                  onClick={() => handleSelectProfile(option)}
                  type="button"
                >
                  <span
                    className={`${styles.profileAvatar} ${
                      photoUrl ? '' : personal ? styles.profileAvatarPersonal : styles.profileAvatarGroup
                    }`}
                    aria-hidden="true"
                  >
                    {photoUrl ? <img alt="" src={photoUrl} /> : getProfileInitial(label)}
                  </span>
                  <span className={styles.profileOptionText}>
                    <strong>{label}</strong>
                    <small>{subtitle}</small>
                  </span>
                  {isActive ? <span className={styles.profileActiveDot} aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>
        </section>

        <section className={styles.aiTipCard} aria-label="Dica da IA">
          <header className={styles.aiTipHeader}>
            <span className={styles.aiTipTitle}>
              <Icon name="sparkles" size={13} />
              Dica da IA
            </span>
            <span className={styles.aiTipBadge}>Hoje</span>
          </header>
          <p className={styles.aiTipText}>
            Noite fresca combina com comida italiana e lugares aconchegantes.
          </p>
          <button
            type="button"
            className={styles.aiTipButton}
            onClick={() => navigate('/chat')}
          >
            Ver sugestões
            <Icon name="sparkles" size={12} />
          </button>
          <span className={styles.aiTipMascot} aria-hidden="true">
            <AiMascot />
          </span>
        </section>
      </aside>

      <div className={styles.body}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <Icon name="search" size={17} className={styles.searchIcon} />
            <input
              type="search"
              placeholder="Buscar restaurantes, pratos, tipos de comida..."
              className={styles.searchInput}
            />
            <span className={styles.searchHint} aria-hidden="true">
              ⌘K
            </span>
          </label>

          <div className={styles.topbarMeta}>
            <span className={styles.location}>
              <Icon name="pin" size={15} />
              <span>São Paulo, SP</span>
            </span>

            <span className={styles.weather}>
              <Icon name="cloud-sun" size={16} className={styles.weatherIcon} />
              <span>23°C</span>
            </span>

            <button
              type="button"
              className={`${styles.iconButton} ${pendingCount > 0 ? styles.iconButtonActive : ''}`}
              aria-label={
                pendingCount > 0
                  ? `${pendingCount} solicitacoes pendentes`
                  : notificationsLoading
                    ? 'Verificando notificacoes'
                    : 'Notificacoes'
              }
              onClick={handleNotificationsClick}
            >
              <Icon name="bell" size={17} />
              {pendingCount > 0 ? (
                <span className={styles.bellBadge} aria-hidden="true">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              ) : null}
            </button>

            <div className={styles.userMenuWrap} ref={menuRef}>
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Abrir menu do usuário"
                className={styles.userMenu}
                onClick={() => setMenuOpen((v) => !v)}
                type="button"
              >
                <span className={styles.userAvatar} aria-hidden="true">
                  <img alt="" src="/casal-fv.png" />
                </span>
                <Icon name="chevron-down" size={13} className={styles.userChevron} />
              </button>

              {menuOpen ? (
                <div className={styles.userDropdown} role="menu">
                  <div className={styles.userDropdownHeader}>
                    <strong>{perfil?.nome ?? displayName}</strong>
                    <span>{perfil?.email ?? ''}</span>
                  </div>
                  <button
                    className={styles.userDropdownItem}
                    onClick={() => navigate('/perfil')}
                    role="menuitem"
                    type="button"
                  >
                    <Icon name="user" size={16} /> Editar perfil
                  </button>
                  <button
                    className={styles.userDropdownItem}
                    onClick={() => openAddPlace()}
                    role="menuitem"
                    type="button"
                  >
                    <Icon name="plus" size={16} /> Adicionar lugar
                  </button>
                  <button
                    className={`${styles.userDropdownItem} ${styles.userDropdownItemDanger}`}
                    onClick={signOut}
                    role="menuitem"
                    type="button"
                  >
                    Sair da conta
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function BrandLogo() {
  return (
    <svg
      aria-hidden="true"
      className={styles.brandMark}
      height="38"
      viewBox="0 0 38 38"
      width="38"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="comid-brand-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ff8a6c" />
          <stop offset="1" stopColor="#f06b8c" />
        </linearGradient>
      </defs>
      <rect x="3" y="9" width="32" height="26" rx="9" fill="url(#comid-brand-bg)" />
      <path d="M11 13 L13.5 9 H17 L19 13 H27 a3 3 0 0 1 3 3 v11 a3 3 0 0 1 -3 3 H11 a3 3 0 0 1 -3 -3 V16 a3 3 0 0 1 3 -3 Z" fill="url(#comid-brand-bg)" />
      <circle cx="19" cy="22" r="5.4" fill="#fff" opacity="0.95" />
      <circle cx="19" cy="22" r="3.2" fill="url(#comid-brand-bg)" />
      <circle cx="27" cy="16.5" r="1.1" fill="#fff" opacity="0.85" />
      <path
        d="M13.5 5.5c1 0 1.8.6 1.8 1.6s-1.8 2.4-1.8 2.4-1.8-1.4-1.8-2.4 .8-1.6 1.8-1.6Z"
        fill="#f06b8c"
      />
      <path
        d="M17.5 4c1 0 1.8.6 1.8 1.6s-1.8 2.4-1.8 2.4-1.8-1.4-1.8-2.4 .8-1.6 1.8-1.6Z"
        fill="#f06b8c"
      />
    </svg>
  )
}

function AiMascot() {
  return (
    <svg
      width="74"
      height="74"
      viewBox="0 0 74 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mascot-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7e6dd9" />
          <stop offset="1" stopColor="#5a4dba" />
        </linearGradient>
      </defs>
      <ellipse cx="58" cy="64" rx="14" ry="3" fill="#000" opacity="0.08" />
      <path
        d="M35 47c0-9 7-16 16-16s16 7 16 16v9c0 5-3 8-8 8H43c-5 0-8-3-8-8v-9Z"
        fill="url(#mascot-body)"
      />
      <path d="M48 31v-6" stroke="url(#mascot-body)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="48" cy="22" r="3" fill="#fbd13d" />
      <circle cx="46" cy="46" r="2.6" fill="#fff" />
      <circle cx="56" cy="46" r="2.6" fill="#fff" />
      <circle cx="46.5" cy="46.5" r="1.3" fill="#1f2937" />
      <circle cx="56.5" cy="46.5" r="1.3" fill="#1f2937" />
      <path
        d="M48 53c1.5 1 4.5 1 6 0"
        stroke="#1f2937"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <ellipse cx="42" cy="51.5" rx="2" ry="1.4" fill="#f06b8c" opacity="0.5" />
      <ellipse cx="60" cy="51.5" rx="2" ry="1.4" fill="#f06b8c" opacity="0.5" />
      <path
        d="M30 38c-2 1-3 4-2 7l4-1"
        stroke="url(#mascot-body)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="28" cy="35" r="3.5" fill="#fbd13d" />
      <path
        d="M27 33.5c-.4-.4-1-.4-1.4 0M29 33.5c-.4-.4-1-.4-1.4 0"
        stroke="#1f2937"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}
