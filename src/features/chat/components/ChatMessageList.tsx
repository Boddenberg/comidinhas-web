import { FeedbackState } from '@/shared/ui/FeedbackState/FeedbackState'
import type { ChatConversationMessage } from '../types'
import styles from './ChatMessageList.module.css'

interface ChatMessageListProps {
  isLoading: boolean
  messages: ChatConversationMessage[]
}

export function ChatMessageList({ isLoading, messages }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <FeedbackState
        description="Comece a conversa com uma pergunta sobre refeicoes, restaurantes ou qualquer outro fluxo que voce queira validar no backend."
        title={isLoading ? 'Gerando a primeira resposta...' : 'Sua conversa ainda esta vazia'}
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
              {message.role === 'user' ? 'Usuario' : 'Assistente'}
            </span>

            {message.metadata ? (
              <span className={styles.metadata}>
                {message.metadata.provider} - {message.metadata.model}
              </span>
            ) : null}
          </div>

          <p className={styles.content}>{message.content}</p>
        </article>
      ))}

      {isLoading ? (
        <article className={styles.message} data-role="assistant">
          <div className={styles.metaRow}>
            <span className={styles.roleLabel}>Assistente</span>
          </div>
          <p className={styles.typing}>Escrevendo resposta...</p>
        </article>
      ) : null}
    </div>
  )
}
