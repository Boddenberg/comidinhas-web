import { useState } from 'react'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import { Button } from '@/shared/ui/Button/Button'
import { HeroBanner } from '../components/HeroBanner'
import { FavoritesSection } from '../components/FavoritesSection'
import { GuidesSection } from '../components/GuidesSection'
import { DecidePanel } from '../components/DecidePanel'
import { ActivityPanel } from '../components/ActivityPanel'
import { GroupPanel } from '../components/GroupPanel'
import { decideWhereToEat } from '../services/decideService'
import styles from './HomePage.module.css'

type DecideState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; reply: string; model: string; provider: string }

const defaultContext = {
  budget: 'R$ $$',
  weather: 'Ensolarado',
  dayOfWeek: 'Sábado',
  location: 'Próximo de nós',
  mood: 'Algo diferente',
}

export function HomePage() {
  const [decideState, setDecideState] = useState<DecideState>({ status: 'idle' })

  async function handleDecide() {
    setDecideState({ status: 'loading' })

    try {
      const response = await decideWhereToEat(defaultContext)
      setDecideState({
        status: 'success',
        reply: response.reply,
        model: response.model,
        provider: response.provider,
      })
    } catch (error: unknown) {
      setDecideState({
        status: 'error',
        message: getErrorMessage(error, 'Não foi possível consultar a IA agora.'),
      })
    }
  }

  function handleReset() {
    setDecideState({ status: 'idle' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <HeroBanner onDecide={handleDecide} loading={decideState.status === 'loading'} />

        {decideState.status === 'loading' ? (
          <section className={`surfaceCard ${styles.aiCard}`}>
            <div className={styles.aiHeader}>
              <span className={styles.aiBadge}>
                <Icon name="sparkle" size={14} />
                IA Decide
              </span>
              <strong>Pensando na melhor pedida pra vocês...</strong>
            </div>
            <div className={styles.aiSkeleton}>
              <span />
              <span />
              <span />
            </div>
          </section>
        ) : null}

        {decideState.status === 'success' ? (
          <section className={`surfaceCard ${styles.aiCard}`}>
            <div className={styles.aiHeader}>
              <span className={styles.aiBadge}>
                <Icon name="sparkle" size={14} />
                IA Decide
              </span>
              <strong>A escolha de hoje:</strong>
            </div>
            <p className={styles.aiReply}>{decideState.reply}</p>
            <div className={styles.aiFooter}>
              <span className={styles.aiMeta}>
                {decideState.provider} · {decideState.model}
              </span>
              <Button onClick={handleReset} type="button" variant="ghost">
                Pedir outra sugestão
              </Button>
            </div>
          </section>
        ) : null}

        {decideState.status === 'error' ? (
          <section className={`surfaceCard ${styles.aiCardError}`}>
            <div className={styles.aiHeader}>
              <span className={styles.aiBadge} data-tone="danger">
                <Icon name="x" size={14} />
                Ops
              </span>
              <strong>A IA não respondeu agora.</strong>
            </div>
            <p className={styles.aiReply}>{decideState.message}</p>
            <div className={styles.aiFooter}>
              <Button onClick={handleDecide} type="button" variant="ghost">
                Tentar novamente
              </Button>
            </div>
          </section>
        ) : null}

        <FavoritesSection />
        <GuidesSection />
      </div>

      <aside className={styles.right}>
        <DecidePanel
          context={defaultContext}
          loading={decideState.status === 'loading'}
          onDecide={handleDecide}
        />
        <ActivityPanel />
        <GroupPanel />
      </aside>
    </div>
  )
}
