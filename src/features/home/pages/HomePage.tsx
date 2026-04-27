import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './HomePage.module.css'

type FavoriteStatus = 'visited' | 'comeback' | 'pending'

const favorites: Array<{
  cuisine: string
  name: string
  price: string
  rating: number
  status: FavoriteStatus
  tone: 'pizza' | 'sushi' | 'burger' | 'pasta'
}> = [
  { cuisine: 'Pizza', name: 'Leggera Pizza', price: '$$', rating: 4.8, status: 'visited', tone: 'pizza' },
  { cuisine: 'Japonês', name: 'Tan Tan Sushi', price: '$$', rating: 4.7, status: 'visited', tone: 'sushi' },
  { cuisine: 'Hambúrguer', name: 'Z Deli', price: '$$', rating: 4.6, status: 'comeback', tone: 'burger' },
  { cuisine: 'Italiana', name: 'Cantina 1020', price: '$$', rating: 4.5, status: 'pending', tone: 'pasta' },
]

const statusLabels: Record<FavoriteStatus, string> = {
  visited: 'Fomos',
  comeback: 'Quero voltar',
  pending: 'Ainda não fomos',
}

const guides: Array<{
  current: number
  title: string
  tone: 'burger' | 'pizza' | 'sushi' | 'trophy'
  total: number
}> = [
  { current: 7, title: 'Guia do Hambúrguer', tone: 'burger', total: 20 },
  { current: 5, title: 'Guia da Pizza', tone: 'pizza', total: 15 },
  { current: 3, title: 'Guia do Sushi', tone: 'sushi', total: 12 },
  { current: 12, title: 'Desafio Comer, marcou!', tone: 'trophy', total: 30 },
]

const aiCriteria = [
  { icon: 'wallet', label: 'Orçamento', value: 'R$ $$' },
  { icon: 'cloud-sun', label: 'Clima', value: 'Ensolarado' },
  { icon: 'calendar', label: 'Dia da semana', value: 'Sábado' },
  { icon: 'pin', label: 'Localização', value: 'Próximo de nós' },
  { icon: 'heart', label: 'Vontade', value: 'Algo diferente' },
] as const

const recentActivity: Array<{
  detail: string
  done: boolean
  text: string
  tone: 'sushi' | 'pizza' | 'burger'
}> = [
  { detail: 'há 2 dias', done: true, text: 'Visitamos Tan Tan Sushi', tone: 'sushi' },
  { detail: 'há 3 dias', done: true, text: 'Adicionou Leggera Pizza aos favoritos', tone: 'pizza' },
  { detail: 'há 5 dias', done: false, text: 'Quer voltar no Z Deli', tone: 'burger' },
]

export function HomePage() {
  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>
              Bora decidir
              <br />
              onde <span className={styles.heroAccent}>comer</span> hoje?
              <Icon name="heart-filled" size={22} className={styles.heroHeart} />
            </h1>
            <p className={styles.heroDescription}>
              Deixa com a IA! Ela vai escolher o lugar
              <br />
              perfeito pra gente hoje.
            </p>
            <button type="button" className={styles.heroButton}>
              <Icon name="sparkles" size={18} />
              Deixar a IA decidir
            </button>
          </div>

          <div className={styles.heroIllustration} aria-label="Ilustração do casal" role="img">
            <span className={styles.heroFloatingHeart} data-position="top" aria-hidden="true">
              <Icon name="heart" size={20} />
            </span>
            <span className={styles.heroFloatingHeart} data-position="bottom" aria-hidden="true">
              <Icon name="heart-filled" size={16} />
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <h2>Nossos favoritos</h2>
              <span className={styles.sectionBadge}>8 lugares</span>
            </div>
            <a className={styles.sectionLink} href="#favoritos">
              Ver todos
            </a>
          </header>

          <div className={styles.favoriteGrid}>
            {favorites.map((item) => (
              <article key={item.name} className={styles.favoriteCard}>
                <div className={styles.favoriteThumb} data-tone={item.tone}>
                  <button type="button" className={styles.favoriteHeart} aria-label="Favoritar">
                    <Icon name="heart" size={16} />
                  </button>
                </div>
                <div className={styles.favoriteBody}>
                  <strong>{item.name}</strong>
                  <span className={styles.favoriteMeta}>
                    {item.cuisine} <span className={styles.dot} aria-hidden="true">•</span> {item.price}
                  </span>
                  <div className={styles.favoriteFooter}>
                    <span className={styles.rating}>
                      <Icon name="star" size={14} className={styles.ratingStar} />
                      {item.rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                    </span>
                    <span className={styles.statusChip} data-status={item.status}>
                      {statusLabels[item.status]}
                    </span>
                  </div>
                </div>
              </article>
            ))}
            <button type="button" className={styles.scrollButton} aria-label="Ver próximos favoritos">
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <h2>Guias em andamento</h2>
            </div>
            <a className={styles.sectionLink} href="#guias">
              Ver todos
            </a>
          </header>

          <div className={styles.guidesGrid}>
            {guides.map((guide) => {
              const progress = Math.round((guide.current / guide.total) * 100)
              return (
                <article key={guide.title} className={styles.guideCard} data-tone={guide.tone}>
                  <div className={styles.guideIcon} aria-hidden="true" />
                  <strong className={styles.guideTitle}>{guide.title}</strong>
                  <span className={styles.guideProgressLabel}>
                    {guide.current} / {guide.total}
                  </span>
                  <div className={styles.guideProgressBar} aria-hidden="true">
                    <div className={styles.guideProgressFill} style={{ width: `${progress}%` }} />
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>

      <aside className={styles.rail}>
        <section className={`${styles.railCard} ${styles.aiCard}`}>
          <header className={styles.aiHeader}>
            <Icon name="sparkles" size={18} className={styles.aiSparkles} />
            <h2>IA Decide</h2>
          </header>

          <div className={styles.aiBubble}>
            <span className={styles.aiAvatar} aria-hidden="true">
              <Icon name="robot" size={22} />
            </span>
            <p>
              Eu analiso tudo pra escolher o melhor lugar pra gente hoje!{' '}
              <Icon name="heart-filled" size={11} className={styles.brandHeart} />
            </p>
          </div>

          <ul className={styles.aiCriteria}>
            {aiCriteria.map((item) => (
              <li key={item.label}>
                <span className={styles.aiCriteriaLabel}>
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </span>
                <span className={styles.aiCriteriaValue}>
                  {item.label === 'Clima' ? (
                    <>
                      <Icon name="sun" size={14} className={styles.aiSunIcon} /> {item.value}
                    </>
                  ) : item.label === 'Localização' ? (
                    <>
                      <Icon name="pin" size={14} /> {item.value}
                    </>
                  ) : item.label === 'Vontade' ? (
                    <>
                      <Icon name="heart" size={14} /> {item.value}
                    </>
                  ) : (
                    item.value
                  )}
                </span>
              </li>
            ))}
          </ul>

          <button type="button" className={styles.aiButton}>
            Deixar a IA decidir <Icon name="sparkles" size={16} />
          </button>
        </section>

        <section className={styles.railCard}>
          <header className={styles.railHeader}>
            <h2>Atividade recente</h2>
            <a className={styles.sectionLink} href="#atividade">
              Ver todo
            </a>
          </header>

          <ul className={styles.activityList}>
            {recentActivity.map((item) => (
              <li key={item.text} className={styles.activityItem}>
                <span className={styles.activityThumb} data-tone={item.tone} aria-hidden="true" />
                <div className={styles.activityBody}>
                  <span className={styles.activityText}>{item.text}</span>
                  <span className={styles.activityDetail}>{item.detail}</span>
                </div>
                <span
                  className={`${styles.activityIcon} ${
                    item.done ? styles.activityIconDone : styles.activityIconStar
                  }`}
                >
                  {item.done ? <Icon name="check" size={14} /> : <Icon name="star" size={14} />}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.railCard}>
          <header className={styles.railHeader}>
            <h2>Nosso grupo</h2>
            <button type="button" className={styles.groupAddButton} aria-label="Adicionar pessoa ao grupo">
              <Icon name="plus" size={16} />
            </button>
          </header>

          <div className={styles.groupMembers}>
            <span className={styles.groupAvatar} data-tone="filipe" aria-label="Filipe" />
            <span className={styles.groupAvatar} data-tone="victor" aria-label="Victor" />
            <button type="button" className={styles.groupInvite} aria-label="Convidar amigo">
              <Icon name="plus" size={18} />
            </button>
          </div>
        </section>
      </aside>
    </div>
  )
}
