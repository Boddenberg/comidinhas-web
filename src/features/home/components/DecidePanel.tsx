import { Button } from '@/shared/ui/Button/Button'
import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './DecidePanel.module.css'

type Context = {
  budget: string
  weather: string
  dayOfWeek: string
  location: string
  mood: string
}

type DecidePanelProps = {
  context: Context
  loading: boolean
  onDecide: () => void
}

export function DecidePanel({ context, loading, onDecide }: DecidePanelProps) {
  return (
    <section className={`surfaceCard ${styles.panel}`}>
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <Icon name="sparkle" size={16} />
        </span>
        <h3 className={styles.title}>IA Decide</h3>
      </header>

      <div className={styles.bubble}>
        <span className={styles.bubbleAvatar} aria-hidden="true">
          <BotFace />
        </span>
        <p className={styles.bubbleText}>
          Eu analiso tudo pra escolher o melhor lugar pra gente hoje! <span className={styles.heart}>♥</span>
        </p>
      </div>

      <ul className={styles.factors}>
        <Factor icon="wallet" label="Orçamento" value={context.budget} />
        <Factor icon="cloud" label="Clima" valueIcon="sun" valueIconTone="yellow" value={context.weather} />
        <Factor icon="calendar" label="Dia da semana" value={context.dayOfWeek} />
        <Factor
          icon="mapPin"
          label="Localização"
          valueIcon="mapPin"
          valueIconTone="pink"
          value={context.location}
        />
        <Factor
          icon="heart"
          label="Vontade"
          valueIcon="heart"
          valueIconTone="pink"
          value={context.mood}
        />
      </ul>

      <Button disabled={loading} fullWidth onClick={onDecide} type="button" variant="secondary">
        {loading ? 'Pensando...' : 'Deixar a IA decidir'}
        {!loading ? <Icon name="sparkle" size={14} /> : null}
      </Button>
    </section>
  )
}

type FactorProps = {
  icon: 'wallet' | 'cloud' | 'calendar' | 'mapPin' | 'heart'
  label: string
  value: string
  valueIcon?: 'sun' | 'mapPin' | 'heart'
  valueIconTone?: 'yellow' | 'pink'
}

function Factor({ icon, label, value, valueIcon, valueIconTone }: FactorProps) {
  return (
    <li className={styles.factor}>
      <span className={styles.factorIcon} aria-hidden="true">
        <Icon name={icon} size={16} />
      </span>
      <span className={styles.factorLabel}>{label}</span>
      <span className={styles.factorValue}>
        {valueIcon ? (
          <span
            aria-hidden="true"
            className={`${styles.factorValueIcon} ${
              valueIconTone === 'pink' ? styles.iconPink : styles.iconYellow
            }`}
          >
            <Icon name={valueIcon} size={13} />
          </span>
        ) : null}
        {value}
      </span>
    </li>
  )
}

function BotFace() {
  return (
    <svg
      aria-hidden="true"
      height="36"
      viewBox="0 0 40 40"
      width="36"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bot-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e0d4f7" />
          <stop offset="1" stopColor="#c4afe9" />
        </linearGradient>
      </defs>
      <rect fill="url(#bot-bg)" height="40" rx="20" width="40" />
      <rect fill="#fff" height="14" rx="4" width="20" x="10" y="14" />
      <circle cx="15.5" cy="21" fill="#1f2937" r="1.6" />
      <circle cx="24.5" cy="21" fill="#1f2937" r="1.6" />
      <path d="M17 25.5h6" stroke="#1f2937" strokeLinecap="round" strokeWidth="1.4" />
      <rect fill="#a187d2" height="2" rx="1" width="6" x="17" y="10" />
      <circle cx="20" cy="9" fill="#a187d2" r="1.5" />
    </svg>
  )
}
