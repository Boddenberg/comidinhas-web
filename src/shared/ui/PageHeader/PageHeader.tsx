import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  action?: ReactNode
  description: string
  eyebrow: string
  title: string
}

export function PageHeader({ action, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>

      {action ? <div className={styles.action}>{action}</div> : null}
    </header>
  )
}
