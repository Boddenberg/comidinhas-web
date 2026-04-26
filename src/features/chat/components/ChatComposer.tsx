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
  onSystemPromptChange: (value: string) => void
  systemPrompt: string
}

export function ChatComposer({
  draft,
  hasMessages,
  isSubmitting,
  onClearConversation,
  onDraftChange,
  onSubmit,
  onSystemPromptChange,
  systemPrompt,
}: ChatComposerProps) {
  return (
    <form className={`surfaceCard ${styles.form}`} onSubmit={onSubmit}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Enviar mensagem</h2>
          <p className={styles.description}>
            O payload segue o contrato do BFF, com historico da conversa e `system_prompt`
            opcional.
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
          placeholder="Quero uma sugestao de jantar leve para hoje."
          rows={5}
          value={draft}
        />
        <span className="formHint">
          Escreva como o usuario final falaria com a IA. O componente envia o historico
          acumulado automaticamente.
        </span>
      </label>

      <label className="formField">
        <span className="formLabel">System prompt opcional</span>
        <textarea
          className="textArea"
          disabled={isSubmitting}
          onChange={(event) => onSystemPromptChange(event.target.value)}
          placeholder="Exemplo: responda com foco em refeicoes equilibradas."
          rows={4}
          value={systemPrompt}
        />
      </label>

      <div className={styles.actions}>
        <Button disabled={isSubmitting || draft.trim().length === 0} fullWidth type="submit">
          {isSubmitting ? 'Consultando IA...' : 'Enviar para o chat'}
        </Button>
      </div>
    </form>
  )
}
