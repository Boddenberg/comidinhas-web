import type { ReactNode } from 'react'
import styles from './FeedbackState.module.css'

type FeedbackVariant = 'empty' | 'error' | 'loading'

interface FeedbackStateProps {
  action?: ReactNode
  description: string
  title: string
  variant: FeedbackVariant
}

const labels: Record<FeedbackVariant, string> = {
  empty: 'Nenhum conteúdo ainda',
  error: 'Algo saiu do trilho',
  loading: 'Buscando informações',
}

export function FeedbackState({
  action,
  description,
  title,
  variant,
}: FeedbackStateProps) {
  return (
    <div className={styles.wrapper} data-variant={variant}>
      <div className={styles.icon} aria-hidden="true">
        {variant === 'loading' ? <span className={styles.spinner} /> : labels[variant].slice(0, 1)}
      </div>

      <div className={styles.content}>
        <strong className={styles.title}>{title}</strong>
        <p className={styles.description}>{description}</p>
      </div>

      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}
