import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { AddPlaceProvider, useAddPlace } from '@/features/places/AddPlaceContext'
import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './AppShell.module.css'

const navigation = [
  { icon: 'home', label: 'Início', to: '/' },
  { icon: 'heart', label: 'Favoritos', to: '/favoritos' },
  { icon: 'sparkles', label: 'IA Decide', to: '/chat' },
  { icon: 'search', label: 'Explorar', to: '/explorar' },
  { icon: 'user', label: 'Nosso perfil', to: '/perfil' },
] as const

export function AppShell() {
  return (
    <AddPlaceProvider>
      <Shell />
    </AddPlaceProvider>
  )
}

function Shell() {
  const { perfil, grupo, signOut } = useAuth()
  const { open: openAddPlace } = useAddPlace()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

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

        <div className={styles.coupleCard}>
          <div className={styles.coupleHeartBadge} aria-hidden="true">
            <Icon name="heart-filled" size={12} />
          </div>
          <div className={styles.coupleAvatar} aria-label="Foto do casal" role="img">
            <img alt={displayName} src="/casal-fv.png" />
          </div>
          <div className={styles.coupleInfo}>
            <strong>{displayName}</strong>
            <span>
              {grupo?.tipo === 'casal' ? 'nosso casal' : 'nosso grupo'}{' '}
              <Icon name="heart-filled" size={11} className={styles.brandHeart} />
            </span>
          </div>
        </div>
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

            <button type="button" className={styles.iconButton} aria-label="Notificações">
              <Icon name="bell" size={18} />
              <span className={styles.bellBadge} aria-hidden="true">
                3
              </span>
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
