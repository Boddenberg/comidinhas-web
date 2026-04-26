import { NavLink, Outlet } from 'react-router-dom'
import styles from './AppShell.module.css'

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Chat com IA', to: '/chat' },
  { label: 'Restaurantes', to: '/restaurantes-proximos' },
]

export function AppShell() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink className={styles.brand} to="/">
            <span className={styles.brandMark} aria-hidden="true">
              <span className={styles.brandSeed} />
              <span className={styles.brandLeaf} />
              <span className={styles.brandLeafAlt} />
              <span className={styles.brandFork} />
            </span>

            <div className={styles.brandCopy}>
              <strong>comidinhas</strong>
              <span className={styles.brandTagline}>sua fome pede quais comidinhas?</span>
            </div>
          </NavLink>

          <div className={styles.headerSide}>
            <span className={styles.headerBadge}>BFF local ativo</span>

            <nav aria-label="Principal" className={styles.nav}>
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                  }
                  end={item.to === '/'}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
