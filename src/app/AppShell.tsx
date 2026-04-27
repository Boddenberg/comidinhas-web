import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './AppShell.module.css'

const navigation = [
  { icon: 'home', label: 'Início', to: '/' },
  { icon: 'heart', label: 'Favoritos', to: '/favoritos' },
  { icon: 'plus', label: 'Cadastrar lugar', to: '/lugares/novo' },
  { icon: 'sparkles', label: 'IA Decide', to: '/chat' },
  { icon: 'search', label: 'Explorar', to: '/explorar' },
  { icon: 'user', label: 'Nosso perfil', to: '/perfil' },
] as const

export function AppShell() {
  const { perfil, grupo, signOut } = useAuth()
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
  const tagline = grupo?.tipo === 'casal' ? 'casal' : 'grupo'

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <NavLink className={styles.brand} to="/">
          <svg className={styles.brandMark} viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M20 6c2.4 0 4.4 1.7 4.4 4.4 0 1-.3 1.9-.8 2.6 1.7-.5 3.6.4 4.4 2.2.8 1.8 0 3.9-1.6 5 1.7.5 2.7 2.3 2.3 4.2-.4 1.9-2.2 3.1-4 2.9-.5 1.6-2 2.7-3.7 2.7s-3.2-1.1-3.7-2.7c-1.8.2-3.6-1-4-2.9-.4-1.9.6-3.7 2.3-4.2-1.6-1.1-2.4-3.2-1.6-5 .8-1.8 2.7-2.7 4.4-2.2-.5-.7-.8-1.6-.8-2.6 0-2.7 2-4.4 4.4-4.4Z"
              fill="#3b82f6"
            />
            <path
              d="M20 9c1.4 0 2.6 1 2.6 2.6 0 1.4-1.2 2.6-2.6 2.6s-2.6-1.2-2.6-2.6C17.4 10 18.6 9 20 9Z"
              fill="#1d4ed8"
            />
            <path d="M19 26h2v8h-2z" fill="#1d4ed8" />
          </svg>
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
              {tagline === 'casal' ? 'nosso casal' : 'nosso grupo'}{' '}
              <Icon name="heart-filled" size={11} className={styles.brandHeart} />
            </span>
          </div>
        </div>
      </aside>

      <div className={styles.body}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <Icon name="search" size={20} className={styles.searchIcon} />
            <input
              type="search"
              placeholder="Buscar restaurantes, pratos, tipos de comida..."
              className={styles.searchInput}
            />
          </label>

          <div className={styles.topbarMeta}>
            <Link className={styles.addPlaceLink} to="/lugares/novo">
              <Icon name="plus" size={16} />
              <span>Cadastrar lugar</span>
            </Link>

            <span className={styles.weather}>
              <Icon name="cloud-sun" size={20} className={styles.weatherIcon} />
              23°C
            </span>
            <span className={styles.location}>
              <Icon name="pin" size={18} />
              São Paulo, SP
            </span>
            <button type="button" className={styles.iconButton} aria-label="Notificações">
              <Icon name="bell" size={20} />
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
                <Icon name="chevron-down" size={16} className={styles.userChevron} />
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
                    onClick={() => navigate('/lugares/novo')}
                    role="menuitem"
                    type="button"
                  >
                    <Icon name="plus" size={16} /> Cadastrar lugar
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
