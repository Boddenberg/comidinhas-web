import { useEffect, useState } from 'react'
import { env } from '@/shared/config/env'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { PageHeader } from '@/shared/ui/PageHeader/PageHeader'
import { FeatureCard } from '../components/FeatureCard'
import { checkBackendHealth } from '../services/healthService'
import styles from './HomePage.module.css'

type HealthState =
  | { message: string; status: 'healthy' }
  | { message: string; status: 'loading' }
  | { message: string; status: 'unhealthy' }

const featureCards = [
  {
    description:
      'Converse com a IA do Comidinhas, envie historico opcional e mantenha o fluxo pronto para futuras evolucoes do produto.',
    items: [
      'Integracao com POST /api/v1/chat',
      'Mensagens persistidas na sessao da pagina',
      'Feedback de loading, erro e estado vazio',
    ],
    title: 'Chat com IA',
    to: '/chat',
    variant: 'chat' as const,
  },
  {
    description:
      'Procure restaurantes proximos usando latitude, longitude, raio e prioridade de ranking com uma interface clara e responsiva.',
    items: [
      'Integracao com POST /api/v1/google-maps/restaurants/nearby',
      'Suporte a geolocalizacao do navegador',
      'Cards com endereco, nota, links e status de abertura',
    ],
    title: 'Busca de restaurantes proximos',
    to: '/restaurantes-proximos',
    variant: 'nearby' as const,
  },
]

const flavorTags = ['IA acolhedora', 'Busca local', 'Paleta quente', 'Visual mobile-first']

const highlightCards = [
  {
    description: 'Creme, laranja, amarelo e verde em uma composicao mais leve e apetitiva.',
    title: 'Identidade quente',
  },
  {
    description: 'Cards arredondados, brilho suave e destaque forte para acoes principais.',
    title: 'Cara de produto',
  },
  {
    description: 'Componentes pequenos e organizados para evoluir sem virar um arquivo gigante.',
    title: 'Base facil de crescer',
  },
]

const palette = ['#ff6b00', '#ffb703', '#4caf50', '#1f2937', '#fff8ee']

const showcaseList = [
  { name: 'Bolo de cenoura fit', meta: '4.8 - 50 min' },
  { name: 'Lamen rapido', meta: '4.7 - Liberdade' },
  { name: 'Jantar leve', meta: 'IA + historico' },
]

export function HomePage() {
  const [healthState, setHealthState] = useState<HealthState>({
    message: 'Verificando conectividade com o BFF local...',
    status: 'loading',
  })

  useEffect(() => {
    let ignore = false

    checkBackendHealth()
      .then((result) => {
        if (!ignore) {
          setHealthState({
            message: result.message,
            status: 'healthy',
          })
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setHealthState({
            message: getErrorMessage(error, 'Nao foi possivel conectar ao BFF local.'),
            status: 'unhealthy',
          })
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  const statusTone =
    healthState.status === 'healthy'
      ? 'sage'
      : healthState.status === 'unhealthy'
        ? 'danger'
        : 'accent'

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <PageHeader
            action={<span className={styles.heroBadge}>Primeira versao pronta para validar</span>}
            description="Uma home inspirada na identidade da marca, com visual mais acolhedor, blocos fortes e linguagem de app de comida."
            eyebrow="Comidinhas Web"
            title="Sua fome pede quais comidinhas?"
          />

          <div className={styles.heroMeta}>
            <span className="statusPill" data-tone={statusTone}>
              {healthState.status === 'healthy'
                ? 'BFF online'
                : healthState.status === 'unhealthy'
                  ? 'BFF indisponivel'
                  : 'Testando conexao'}
            </span>

            <span className="statusPill" data-tone="accent">
              Base URL: {env.apiBaseUrl}
            </span>
          </div>

          <p className={styles.healthMessage}>{healthState.message}</p>

          <div className={styles.flavorRow}>
            {flavorTags.map((tag) => (
              <span key={tag} className={styles.flavorPill}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <aside className={`surfaceCard ${styles.showcase}`}>
          <div className={styles.showcaseHeader}>
            <div>
              <span className={styles.showcaseLabel}>Identidade visual</span>
              <h2 className={styles.showcaseTitle}>Quente, amigavel e com cara de produto mobile.</h2>
            </div>

            <div className={styles.paletteRow}>
              {palette.map((color) => (
                <span key={color} className={styles.paletteSwatch} style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          <div className={styles.mockupGrid}>
            <article className={`${styles.mockupCard} ${styles.mockupPrimary}`}>
              <span className={styles.mockupLabel}>Sugestao da IA</span>
              <h3 className={styles.mockupTitle}>Descubra novos sabores perto de voce</h3>

              <div className={styles.mockupChipRow}>
                <span className={styles.mockupChip}>Quero algo doce</span>
                <span className={styles.mockupChip}>Opcoes rapidas</span>
              </div>

              <div className={styles.mockupBubble}>O que vamos comer hoje?</div>
            </article>

            <article className={`${styles.mockupCard} ${styles.mockupSecondary}`}>
              <div className={styles.mockupListHeader}>
                <span className={styles.mockupListLabel}>Perto de voce</span>
                <span className={styles.mockupListMeta}>3 ideias</span>
              </div>

              <div className={styles.mockupList}>
                {showcaseList.map((item) => (
                  <div key={item.name} className={styles.mockupItem}>
                    <span className={styles.mockupThumb} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.meta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </aside>
      </div>

      <div className={styles.highlights}>
        {highlightCards.map((item) => (
          <article key={item.title} className={`surfaceCard ${styles.highlightCard}`}>
            <span className={styles.highlightAccent} />
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className={styles.cardGrid}>
        {featureCards.map((feature) => (
          <FeatureCard
            key={feature.title}
            description={feature.description}
            items={feature.items}
            title={feature.title}
            to={feature.to}
            variant={feature.variant}
          />
        ))}
      </div>
    </section>
  )
}
