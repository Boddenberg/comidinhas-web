import { Link } from 'react-router-dom'
import styles from './FeatureCard.module.css'

type FeatureVariant = 'chat' | 'nearby'

interface FeatureCardProps {
  description: string
  items: string[]
  title: string
  to: string
  variant: FeatureVariant
}

export function FeatureCard({ description, items, title, to, variant }: FeatureCardProps) {
  const badgeLabel =
    variant === 'chat' ? 'IA + contexto' : 'Google Maps + geolocalizacao'

  const ctaLabel = variant === 'chat' ? 'Abrir conversa' : 'Explorar lugares'

  return (
    <article className={`surfaceCard ${styles.card}`} data-variant={variant}>
      <div className={styles.visual} data-variant={variant}>
        <span className={styles.badge}>{badgeLabel}</span>

        <div className={styles.visualStack}>
          <span className={styles.visualCardSmall} />
          <span className={styles.visualCardLarge} />
        </div>
      </div>

      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item} className={styles.listItem}>
            {item}
          </li>
        ))}
      </ul>

      <Link className={styles.link} to={to}>
        {ctaLabel}
      </Link>
    </article>
  )
}
