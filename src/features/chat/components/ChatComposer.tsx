import type { FormEvent } from 'react'
import { Button } from '@/shared/ui/Button/Button'
import styles from './ChatComposer.module.css'

interface ChatComposerProps {
  draft: string
  hasMessages: boolean
  isSubmitting: boolean
  onClearConversation: () => void
  onDraftChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ChatComposer({
  draft,
  hasMessages,
  isSubmitting,
  onClearConversation,
  onDraftChange,
  onSubmit,
}: ChatComposerProps) {
  return (
    <form className={`surfaceCard ${styles.form}`} onSubmit={onSubmit}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Pedir recomendacao</h2>
          <p className={styles.description}>
            Conte o momento, o tipo de comida, restricoes ou bairro. A IA busca lugares salvos e
            pode trazer novas opcoes do Google.
          </p>
        </div>

        {hasMessages ? (
          <Button onClick={onClearConversation} variant="ghost">
            Limpar conversa
          </Button>
        ) : null}
      </div>

      <label className="formField">
        <span className="formLabel">Mensagem</span>
        <textarea
          className="textArea"
          disabled={isSubmitting}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Estou com vontade de comer arabe hoje."
          rows={6}
          value={draft}
        />
      </label>

      <div className={styles.actions}>
        <Button disabled={isSubmitting || draft.trim().length === 0} fullWidth type="submit">
          {isSubmitting ? 'Consultando IA...' : 'Buscar restaurantes'}
        </Button>
      </div>
    </form>
  )
}
