import { Button } from '@/shared/ui/Button/Button'
import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './HeroBanner.module.css'

type HeroBannerProps = {
  loading: boolean
  onDecide: () => void
}

export function HeroBanner({ loading, onDecide }: HeroBannerProps) {
  return (
    <section className={styles.banner}>
      <img alt="" aria-hidden="true" className={styles.bannerImage} src="/casal-fundo.png" />

      <div className={styles.bannerOverlay} />

      <div className={styles.bannerContent}>
        <h1 className={styles.title}>
          Bora decidir
          <br />
          onde <span className={styles.titleAccent}>comer</span> hoje?
          <span className={styles.heart} aria-hidden="true">
            ♡
          </span>
        </h1>

        <p className={styles.description}>
          Deixa com a IA! Ela vai escolher o lugar
          <br />
          perfeito pra gente hoje.
        </p>

        <Button disabled={loading} onClick={onDecide} type="button" variant="primary">
          <Icon name="sparkle" size={16} />
          {loading ? 'Pensando...' : 'Deixar a IA decidir'}
        </Button>
      </div>
    </section>
  )
}
