import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './ActivityPanel.module.css'

type ActivityIcon = 'check' | 'star'

type Activity = {
  id: string
  thumb: string
  title: string
  when: string
  icon: ActivityIcon
}

const activities: Activity[] = [
  {
    id: '1',
    thumb:
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=200&q=80',
    title: 'Visitamos Tan Tan Sushi',
    when: 'há 2 dias',
    icon: 'check',
  },
  {
    id: '2',
    thumb:
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=200&q=80',
    title: 'Adicionou Leggera Pizza aos favoritos',
    when: 'há 3 dias',
    icon: 'check',
  },
  {
    id: '3',
    thumb:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80',
    title: 'Quer voltar no Z Deli',
    when: 'há 5 dias',
    icon: 'star',
  },
]

export function ActivityPanel() {
  return (
    <section className={`surfaceCard ${styles.panel}`}>
      <header className={styles.header}>
        <h3 className={styles.title}>Atividade recente</h3>
        <a className={styles.seeAll} href="#atividades">
          Ver todo
        </a>
      </header>

      <ul className={styles.list}>
        {activities.map((activity) => (
          <li key={activity.id} className={styles.item}>
            <span className={styles.thumb}>
              <img alt="" loading="lazy" src={activity.thumb} />
            </span>

            <div className={styles.copy}>
              <strong>{activity.title}</strong>
              <span>{activity.when}</span>
            </div>

            <span className={`${styles.iconBadge} ${styles[`icon_${activity.icon}`]}`}>
              <Icon
                name={activity.icon === 'star' ? 'starFilled' : 'check'}
                size={14}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
