import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './Topbar.module.css'

export function Topbar() {
  return (
    <header className={styles.topbar}>
      <label className={styles.search}>
        <Icon name="search" size={18} />
        <input
          aria-label="Buscar"
          placeholder="Buscar restaurantes, pratos, tipos de comida..."
          type="search"
        />
      </label>

      <div className={styles.actions}>
        <span className={styles.weather}>
          <Icon name="sun" size={18} />
          <span>23°C</span>
        </span>

        <span className={styles.location}>
          <Icon name="mapPin" size={18} />
          <span>São Paulo, SP</span>
        </span>

        <button aria-label="Notificações" className={styles.iconButton} type="button">
          <Icon name="bell" size={20} />
          <span className={styles.badgeDot} aria-hidden="true" />
        </button>

        <button className={styles.profile} type="button">
          <span className={styles.avatar}>
            <img alt="Filipe e Victor" src="/casal-fv.png" />
          </span>
          <Icon name="chevronDown" size={16} />
        </button>
      </div>
    </header>
  )
}
