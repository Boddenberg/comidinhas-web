import { PLACE_STATUS_LABELS } from '@/features/places/types'
import { Icon } from '@/shared/ui/Icon/Icon'
import { FeedbackState } from '@/shared/ui/FeedbackState/FeedbackState'
import type { ChatConversationMessage, RecommendedRestaurant } from '../types'
import styles from './ChatMessageList.module.css'

interface ChatMessageListProps {
  isLoading: boolean
  messages: ChatConversationMessage[]
  onSaveGoogleRecommendation?: (restaurante: RecommendedRestaurant) => void
  savingRecommendationId?: string | null
}

function formatPrice(value: number | null) {
  return value ? '$'.repeat(value) : null
}

function formatRating(restaurante: RecommendedRestaurant) {
  if (restaurante.rating == null) return null
  const rating = restaurante.rating.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })
  return restaurante.user_rating_count ? `${rating} (${restaurante.user_rating_count})` : rating
}

function getLocation(restaurante: RecommendedRestaurant) {
  return [restaurante.bairro, restaurante.cidade].filter(Boolean).join(', ')
}

export function ChatMessageList({
  isLoading,
  messages,
  onSaveGoogleRecommendation,
  savingRecommendationId,
}: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <FeedbackState
        description="Peca algo como: estou com vontade de comer arabe hoje."
        title={isLoading ? 'A IA esta buscando opcoes...' : 'Sua conversa ainda esta vazia'}
        variant={isLoading ? 'loading' : 'empty'}
      />
    )
  }

  return (
    <div className={styles.wrapper}>
      {messages.map((message) => (
        <article key={message.id} className={styles.message} data-role={message.role}>
          <div className={styles.metaRow}>
            <span className={styles.roleLabel}>
              {message.role === 'user' ? 'Voce' : 'IA Comidinhas'}
            </span>

            {message.metadata?.provider || message.metadata?.model ? (
              <span className={styles.metadata}>
                {[message.metadata.provider, message.metadata.model].filter(Boolean).join(' - ')}
              </span>
            ) : null}
          </div>

          <p className={styles.content}>{message.content}</p>

          {message.recommendations?.length ? (
            <div className={styles.recommendations}>
              {message.recommendations.map((option) => {
                const restaurante = option.restaurante
                const price = formatPrice(restaurante.faixa_preco)
                const rating = formatRating(restaurante)
                const location = getLocation(restaurante)
                const isSaving = savingRecommendationId === restaurante.candidato_id
                const canSave =
                  restaurante.origem === 'google' &&
                  Boolean(restaurante.google_place_id) &&
                  Boolean(onSaveGoogleRecommendation)

                return (
                  <article className={styles.recommendationCard} key={restaurante.candidato_id}>
                    <div className={styles.recommendationImage}>
                      {restaurante.imagem_capa ? (
                        <img alt="" src={restaurante.imagem_capa} />
                      ) : (
                        <Icon name="utensils" size={24} />
                      )}
                    </div>

                    <div className={styles.recommendationBody}>
                      <header className={styles.recommendationHeader}>
                        <div>
                          <strong>{restaurante.nome}</strong>
                          <span>{[restaurante.categoria, location].filter(Boolean).join(' - ')}</span>
                        </div>
                        <span className={styles.originBadge} data-origin={restaurante.origem}>
                          {restaurante.origem === 'google' ? 'Google' : 'Comidinhas'}
                        </span>
                      </header>

                      <p className={styles.recommendationReason}>{option.motivo}</p>

                      <div className={styles.badgeRow}>
                        {restaurante.favorito ? <span>Favorito</span> : null}
                        {restaurante.ja_fomos ? <span>Ja fomos</span> : null}
                        {restaurante.novo_no_app ? <span>Novo</span> : null}
                        {restaurante.aberto_agora === true ? <span>Aberto agora</span> : null}
                        {restaurante.status ? (
                          <span>{PLACE_STATUS_LABELS[restaurante.status]}</span>
                        ) : null}
                        {price ? <span>{price}</span> : null}
                        {rating ? <span>{rating}</span> : null}
                      </div>

                      {option.pontos_fortes.length ? (
                        <ul className={styles.pointsList}>
                          {option.pontos_fortes.slice(0, 3).map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      ) : null}

                      <footer className={styles.recommendationActions}>
                        {restaurante.google_maps_uri ? (
                          <a href={restaurante.google_maps_uri} rel="noreferrer" target="_blank">
                            Ver mapa
                            <Icon name="external-link" size={14} />
                          </a>
                        ) : null}
                        {canSave ? (
                          <button
                            disabled={isSaving}
                            onClick={() => onSaveGoogleRecommendation?.(restaurante)}
                            type="button"
                          >
                            {isSaving ? 'Salvando...' : 'Salvar no Comidinhas'}
                          </button>
                        ) : restaurante.origem === 'comidinhas' ? (
                          <span className={styles.savedBadge}>Ja esta salvo</span>
                        ) : null}
                      </footer>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </article>
      ))}

      {isLoading ? (
        <article className={styles.message} data-role="assistant">
          <div className={styles.metaRow}>
            <span className={styles.roleLabel}>IA Comidinhas</span>
          </div>
          <p className={styles.typing}>A IA esta buscando restaurantes...</p>
        </article>
      ) : null}
    </div>
  )
}
