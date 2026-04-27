import type { ReactNode } from 'react'
import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './AuthLayout.module.css'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ children, footer, subtitle, title }: AuthLayoutProps) {
  return (
    <div className={styles.shell}>
      <section className={styles.illustration}>
        <img alt="" aria-hidden="true" src="/casal-fundo.png" />
        <div className={styles.illustrationOverlay}>
          <span className={styles.brand}>
            <span className={styles.brandMark}>
              <Icon name="heart-filled" size={18} />
              <Icon name="heart-filled" size={18} />
            </span>
            comidinhas
          </span>
          <p>
            Decidam juntos onde comer hoje. Salve seus lugares favoritos, marque o que já visitaram
            e deixe a IA sugerir quando bater a dúvida.
          </p>
        </div>
      </section>

      <section className={styles.formArea}>
        <div className={styles.formWrap}>
          <header className={styles.header}>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>

          <div className={styles.body}>{children}</div>

          <footer className={styles.footer}>{footer}</footer>
        </div>
      </section>
    </div>
  )
}
