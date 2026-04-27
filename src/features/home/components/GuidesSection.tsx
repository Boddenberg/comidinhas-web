import styles from './GuidesSection.module.css'

type GuideTone = 'orange' | 'pink' | 'blue' | 'purple'

type Guide = {
  id: string
  title: string
  emoji: string
  current: number
  total: number
  tone: GuideTone
}

const guides: Guide[] = [
  { id: '1', title: 'Hambúrguer', emoji: '🍔', current: 7, total: 20, tone: 'orange' },
  { id: '2', title: 'Pizza', emoji: '🍕', current: 5, total: 15, tone: 'pink' },
  { id: '3', title: 'Sushi', emoji: '🍣', current: 3, total: 12, tone: 'blue' },
  { id: '4', title: 'Comer, marcou!', emoji: '🏆', current: 12, total: 30, tone: 'purple' },
]

export function GuidesSection() {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>Guias em andamento</h2>
        <a className={styles.seeAll} href="#guias">
          Ver todos
        </a>
      </header>

      <ul className={styles.cards}>
        {guides.map((guide) => {
          const percent = Math.round((guide.current / guide.total) * 100)
          const isChallenge = guide.title === 'Comer, marcou!'

          return (
            <li
              key={guide.id}
              className={`${styles.card} ${styles[`tone_${guide.tone}`]}`}
            >
              <div className={styles.cardHeader}>
                <span className={styles.iconBubble} aria-hidden="true">
                  {guide.emoji}
                </span>
                <div>
                  <span className={styles.cardLabel}>
                    {isChallenge ? 'Desafio' : 'Guia da'}
                  </span>
                  <strong>{isChallenge ? guide.title : `Guia do ${guide.title}`}</strong>
                </div>
              </div>

              <div className={styles.progress}>
                <span className={styles.progressLabel}>
                  {guide.current} / {guide.total}
                </span>
                <div className={styles.progressBar}>
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
