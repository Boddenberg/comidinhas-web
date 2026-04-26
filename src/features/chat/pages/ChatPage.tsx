import type { FormEvent } from 'react'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { FeedbackState } from '@/shared/ui/FeedbackState/FeedbackState'
import { PageHeader } from '@/shared/ui/PageHeader/PageHeader'
import { ChatComposer } from '../components/ChatComposer'
import { ChatMessageList } from '../components/ChatMessageList'
import { sendChatMessage } from '../services/chatService'
import type { ChatConversationMessage, ChatHistoryMessage } from '../types'
import styles from './ChatPage.module.css'

const quickPrompts = [
  'Quero uma sugestao de jantar leve para hoje',
  'Quero algo doce para o fim da tarde',
  'Me sugira uma refeicao rapida e barata',
  'Surpreenda-me com uma ideia diferente',
]

const helpItems = [
  'Historico enviado automaticamente a cada nova pergunta.',
  'System prompt opcional para testar diferentes tons de resposta.',
  'Camadas separadas entre UI, servico HTTP e tipos TypeScript.',
]

function createMessageId() {
  return crypto.randomUUID()
}

export function ChatPage() {
  const [draft, setDraft] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [messages, setMessages] = useState<ChatConversationMessage[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedMessage = draft.trim()

    if (trimmedMessage.length === 0) {
      return
    }

    const history: ChatHistoryMessage[] = messages.map(({ content, role }) => ({ content, role }))
    const nextUserMessage: ChatConversationMessage = {
      content: trimmedMessage,
      id: createMessageId(),
      role: 'user',
    }

    setErrorMessage(null)
    setIsSubmitting(true)
    setMessages((currentMessages) => [...currentMessages, nextUserMessage])
    setDraft('')

    try {
      const response = await sendChatMessage({
        history: history.length > 0 ? history : undefined,
        message: trimmedMessage,
        system_prompt: systemPrompt.trim().length > 0 ? systemPrompt.trim() : undefined,
      })

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          content: response.reply,
          id: createMessageId(),
          metadata: {
            model: response.model,
            provider: response.provider,
          },
          role: 'assistant',
        },
      ])
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Nao foi possivel obter resposta do chat agora.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClearConversation() {
    setMessages([])
    setErrorMessage(null)
  }

  return (
    <section className={styles.page}>
      <PageHeader
        action={<span className={styles.pageBadge}>IA pronta para testar</span>}
        description="Uma experiencia mais alinhada ao produto, com atalhos de conversa, bolhas mais amigaveis e um composer visualmente mais forte."
        eyebrow="Chat com IA"
        title="Converse com a IA do Comidinhas em um fluxo mais vivo e acolhedor."
      />

      <section className={`surfaceCard ${styles.spotlight}`}>
        <div className={styles.spotlightCopy}>
          <span className={styles.spotlightLabel}>Sugestoes rapidas</span>
          <h2 className={styles.spotlightTitle}>Use um atalho para puxar o assunto e testar o tom do assistente.</h2>
          <p className={styles.spotlightDescription}>
            Os chips abaixo ajudam a reproduzir a identidade da marca e ainda aceleram o teste do endpoint.
          </p>
        </div>

        <div className={styles.promptRow}>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className={styles.promptChip}
              onClick={() => setDraft(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.layout}>
        <section className={`surfaceCard ${styles.conversationPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Conversa</h2>
              <p className={styles.panelDescription}>
                O historico da sessao e enviado a cada nova pergunta.
              </p>
            </div>

            <div className={styles.panelTags}>
              <span className={styles.panelTag}>Historico automatico</span>
              <span className={styles.panelTag}>System prompt opcional</span>
            </div>
          </div>

          {errorMessage ? (
            <FeedbackState
              description={errorMessage}
              title="A requisicao nao foi concluida"
              variant="error"
            />
          ) : null}

          <ChatMessageList isLoading={isSubmitting} messages={messages} />
        </section>

        <div className={styles.sideColumn}>
          <ChatComposer
            draft={draft}
            hasMessages={messages.length > 0}
            isSubmitting={isSubmitting}
            onClearConversation={handleClearConversation}
            onDraftChange={setDraft}
            onSubmit={handleSubmit}
            onSystemPromptChange={setSystemPrompt}
            systemPrompt={systemPrompt}
          />

          <aside className={`surfaceCard ${styles.helpCard}`}>
            <span className={styles.helpEyebrow}>Pensado para evoluir</span>
            <h2 className={styles.helpTitle}>Uma base visual mais proxima da identidade do app.</h2>

            <ul className={styles.helpList}>
              {helpItems.map((item) => (
                <li key={item} className={styles.helpItem}>
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  )
}
