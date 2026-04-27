import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './FavoritesSection.module.css'

type FavoriteStatus = 'fomos' | 'quero_voltar' | 'ainda_nao_fomos'

type Favorite = {
  id: string
  name: string
  category: string
  price: string
  rating: number
  status: FavoriteStatus
  image: string
}

const favorites: Favorite[] = [
  {
    id: '1',
    name: 'Leggera Pizza',
    category: 'Pizza',
    price: '$$',
    rating: 4.8,
    status: 'fomos',
    image:
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '2',
    name: 'Tan Tan Sushi',
    category: 'Japonês',
    price: '$$',
    rating: 4.7,
    status: 'fomos',
    image:
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '3',
    name: 'Z Deli',
    category: 'Hambúrguer',
    price: '$$',
    rating: 4.6,
    status: 'quero_voltar',
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '4',
    name: 'Cantina 1020',
    category: 'Italiana',
    price: '$$',
    rating: 4.5,
    status: 'ainda_nao_fomos',
    image:
      'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?auto=format&fit=crop&w=600&q=80',
  },
]

const statusLabels: Record<FavoriteStatus, string> = {
  fomos: 'Fomos',
  quero_voltar: 'Quero voltar',
  ainda_nao_fomos: 'Ainda não fomos',
}

export function FavoritesSection() {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Nossos favoritos</h2>
          <span className={styles.count}>{favorites.length} lugares</span>
        </div>

        <div className={styles.headerActions}>
          <a className={styles.seeAll} href="#favoritos">
            Ver todos
          </a>
        </div>
      </header>

      <div className={styles.cardWrapper}>
        <ul className={styles.cards}>
          {favorites.map((item) => (
            <li key={item.id} className={`surfaceCard ${styles.card}`}>
              <div className={styles.cardImageWrap}>
                <img
                  alt={item.name}
                  className={styles.cardImage}
                  loading="lazy"
                  src={item.image}
                />
                <button aria-label="Favoritar" className={styles.heartButton} type="button">
                  <Icon name="heart" size={16} />
                </button>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{item.name}</h3>
                <p className={styles.cardMeta}>
                  {item.category} · {item.price}
                </p>
                <div className={styles.cardFooter}>
                  <span className={styles.rating}>
                    <Icon name="starFilled" size={13} />
                    {item.rating.toFixed(1).replace('.', ',')}
                  </span>
                  <span className={`${styles.statusTag} ${styles[`status_${item.status}`]}`}>
                    {statusLabels[item.status]}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <button aria-label="Próximos" className={styles.scrollButton} type="button">
          <Icon name="chevronRight" size={18} />
        </button>
      </div>
    </section>
  )
}
