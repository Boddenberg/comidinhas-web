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
  { icon: 'heart', label: 'Lugares', to: '/lugares' },
  { icon: 'bookmark', label: 'Guias', to: '/guias' },
  { icon: 'sparkles', label: 'IA Decide', to: '/chat' },
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
  const activeProfileName = getProfileLabel(grupo, perfil)
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
              <Icon name="heart-filled" size={11} className={styles.brandHeart} />
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
              <Icon name={item.icon} size={20} className={styles.navIcon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <section className={styles.profilePanel} aria-label="Selecionar perfil ativo">
          <span className={styles.profileEyebrow}>Perfil ativo</span>
          <strong className={styles.profileActiveName}>{activeProfileName}</strong>
          <p>Lugares, guias e IA acompanham o perfil selecionado aqui.</p>

          {profileSwitchError ? (
            <span className={styles.profileError}>{profileSwitchError}</span>
          ) : null}

          <div className={styles.profileList}>
            {profileOptions.map((option) => {
              const isActive = option.id === grupo?.id
              const label = getProfileLabel(option, perfil)
              const kind = getProfileKindLabel(option, perfil)
              const photoUrl = getProfilePhotoUrl(option, perfil)

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
                  <span className={styles.profileAvatar} aria-hidden="true">
                    {photoUrl ? <img alt="" src={photoUrl} /> : getProfileInitial(label)}
                  </span>
                  <span className={styles.profileOptionText}>
                    <strong>{label}</strong>
                    <small>
                      {kind}
                      {isPersonalGroup(option, perfil) ? '' : ` - ${getMemberCountLabel(option)}`}
                    </small>
                  </span>
                  {isActive ? <span className={styles.profileActiveDot} /> : null}
                </button>
              )
            })}
          </div>
        </section>
      </aside>

      <div className={styles.body}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <Icon name="search" size={18} className={styles.searchIcon} />
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
            <button
              className={styles.addPlaceCTA}
              onClick={() => openAddPlace()}
              type="button"
            >
              <Icon name="plus" size={16} />
              <span>Adicionar lugar</span>
            </button>

            <span className={styles.weather}>
              <Icon name="cloud-sun" size={18} className={styles.weatherIcon} />
              <span>23°C</span>
            </span>

            <span className={styles.location}>
              <Icon name="pin" size={16} />
              <span>São Paulo, SP</span>
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
              <Icon name="bell" size={18} />
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
                <Icon name="chevron-down" size={14} className={styles.userChevron} />
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
      height="44"
      viewBox="0 0 44 44"
      width="44"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="comid-brand" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#5b8def" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="comid-heart" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f37291" />
          <stop offset="1" stopColor="#c4456a" />
        </linearGradient>
      </defs>
      {/* hearts */}
      <path
        d="M14 6c1.6 0 2.9 1.1 2.9 2.7 0 1.5-2.9 4-2.9 4s-2.9-2.5-2.9-4C11.1 7.1 12.4 6 14 6Z"
        fill="url(#comid-heart)"
      />
      <path
        d="M22 4c1.6 0 2.9 1.1 2.9 2.7 0 1.5-2.9 4-2.9 4s-2.9-2.5-2.9-4C19.1 5.1 20.4 4 22 4Z"
        fill="url(#comid-heart)"
      />
      {/* main glyph: rounded square + droplet */}
      <path
        d="M22 14c5.5 0 10 4.5 10 10v4a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4v-4c0-5.5 4.5-10 10-10Z"
        fill="url(#comid-brand)"
      />
      <path
        d="M22 19.5c2.4 0 4.4 1.7 4.4 4.4 0 2.4-2.4 4.4-4.4 4.4s-4.4-2-4.4-4.4c0-2.7 2-4.4 4.4-4.4Z"
        fill="#fff"
      />
      <circle cx="22" cy="23.5" r="1.6" fill="url(#comid-brand)" />
    </svg>
  )
}
