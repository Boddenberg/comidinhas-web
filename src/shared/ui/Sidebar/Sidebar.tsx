import { NavLink } from 'react-router-dom'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { Icon, type IconName } from '@/shared/ui/Icon/Icon'
import styles from './Sidebar.module.css'

type NavItem = {
  icon: IconName
  label: string
  to: string
  end?: boolean
}

const navigation: NavItem[] = [
  { icon: 'home', label: 'Início', to: '/', end: true },
  { icon: 'search', label: 'Explorar', to: '/explorar' },
  { icon: 'heart', label: 'Favoritos', to: '/favoritos' },
  { icon: 'bookmark', label: 'Guias', to: '/guias' },
  { icon: 'sparkle', label: 'IA Decide', to: '/chat' },
  { icon: 'trophy', label: 'Desafios', to: '/desafios' },
  { icon: 'clock', label: 'Histórico', to: '/historico' },
  { icon: 'user', label: 'Perfil', to: '/perfil' },
  { icon: 'settings', label: 'Configurações', to: '/configuracoes' },
]

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <NavLink className={styles.brand} to="/">
        <BrandLogo size={48} />
        <div className={styles.brandCopy}>
          <strong>comidinhas</strong>
          <span>
            nossas escolhas, nossos rolês <span className={styles.brandHeart}>♥</span>
          </span>
        </div>
      </NavLink>

      <nav aria-label="Principal" className={styles.nav}>
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
            }
            end={item.end}
            to={item.to}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.coupleCard}>
        <div className={styles.coupleHeart} aria-hidden="true">
          <Icon name="heartFilled" size={14} />
        </div>
        <div className={styles.couplePhoto}>
          <img alt="Filipe e Victor" src="/casal-fv.png" />
        </div>
        <div className={styles.coupleCopy}>
          <strong>Filipe &amp; Victor</strong>
          <span>
            juntos desde 2023 <span className={styles.coupleHeartInline}>♥</span>
          </span>
        </div>
      </div>
    </aside>
  )
}
