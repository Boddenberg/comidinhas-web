import type { FormEvent } from 'react'
import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { saveGooglePlace } from '@/features/places/services/googleMapsService'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { FeedbackState } from '@/shared/ui/FeedbackState/FeedbackState'
import { PageHeader } from '@/shared/ui/PageHeader/PageHeader'
import { ChatComposer } from '../components/ChatComposer'
import { ChatMessageList } from '../components/ChatMessageList'
import { sendChatMessage } from '../services/chatService'
import type {
  ChatConversationMessage,
  ChatHistoryMessage,
  RecommendationLocation,
  RecommendedRestaurant,
} from '../types'
import styles from './ChatPage.module.css'

const quickPrompts = [
  'Estou com vontade de comer arabe hoje',
  'Quero um jantar leve e perto de Pinheiros',
  'Algo barato para duas pessoas',
  'Surpreenda com uma novidade',
]

const helpItems = [
  'A IA cruza seus lugares salvos com opcoes externas.',
  'Se faltar contexto, ela pergunta antes de recomendar.',
  'Opcoes do Google podem ser salvas direto no Comidinhas.',
]

function createMessageId() {
  return crypto.randomUUID()
}

async function getBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 8000 },
    )
  })
}

function recommendationToInternalRestaurant(
  restaurante: RecommendedRestaurant,
  saved: Awaited<ReturnType<typeof saveGooglePlace>>,
): RecommendedRestaurant {
  return {
    ...restaurante,
    bairro: saved.neighborhood,
    candidato_id: `comidinhas:${saved.id}`,
    categoria: saved.category,
    cidade: saved.city,
    favorito: saved.is_favorite,
    faixa_preco: saved.price_range,
    imagem_capa: saved.image_url,
    ja_fomos: saved.status === 'fomos' || saved.status === 'quero_voltar',
    link: saved.link,
    lugar_id: saved.id,
    novo_no_app: false,
    nome: saved.name,
    origem: 'comidinhas',
    rating: saved.rating ?? restaurante.rating,
    status: saved.status,
    user_rating_count: saved.user_rating_count ?? restaurante.user_rating_count,
  }
}

export function ChatPage() {
  const { grupo, perfil } = useAuth()
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatConversationMessage[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savingRecommendationId, setSavingRecommendationId] = useState<string | null>(null)

  async function buildLocation(): Promise<RecommendationLocation | undefined> {
    const location = await getBrowserLocation()
    if (location) {
      return {
        ...location,
        cidade: perfil?.cidade ?? undefined,
        raio_metros: 8000,
      }
    }

    if (perfil?.cidade) {
      return { cidade: perfil.cidade, raio_metros: 8000 }
    }

    return undefined
  }

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
      if (!grupo) {
        throw new Error('Selecione um contexto antes de conversar com a IA.')
      }

      const response = await sendChatMessage(
        grupo.id,
        {
          history: history.length > 0 ? history : undefined,
          message: trimmedMessage,
        },
        {
          localizacao: await buildLocation(),
          perfilId: perfil?.id,
          permitirGoogle: true,
        },
      )

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          content: response.reply,
          id: createMessageId(),
          metadata: {
            model: response.model,
            provider: response.provider,
          },
          recommendations: response.recommendations,
          role: 'assistant',
        },
      ])
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Nao foi possivel obter recomendacoes agora.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSaveGoogleRecommendation(restaurante: RecommendedRestaurant) {
    if (!grupo || !restaurante.google_place_id) return

    setErrorMessage(null)
    setSavingRecommendationId(restaurante.candidato_id)
    try {
      const saved = await saveGooglePlace(grupo.id, {
        added_by_profile_id: perfil?.id,
        is_favorite: false,
        notes: 'Salvo a partir da recomendacao da IA',
        place_id: restaurante.google_place_id,
        status: 'quero_ir',
      })

      setMessages((currentMessages) =>
        currentMessages.map((message) => ({
          ...message,
          recommendations: message.recommendations?.map((option) =>
            option.restaurante.candidato_id === restaurante.candidato_id
              ? {
                  ...option,
                  restaurante: recommendationToInternalRestaurant(restaurante, saved),
                }
              : option,
          ),
        })),
      )
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Nao foi possivel salvar essa recomendacao.'))
    } finally {
      setSavingRecommendationId(null)
    }
  }

  function handleClearConversation() {
    setMessages([])
    setErrorMessage(null)
  }

  return (
    <section className={styles.page}>
      <PageHeader
        action={<span className={styles.pageBadge}>Busca com IA</span>}
        description="Diga o que voces querem comer e receba opcoes salvas no contexto ou descobertas no Google."
        eyebrow="IA recomenda"
        title="Converse com a IA para escolher restaurantes."
      />

      <section className={`surfaceCard ${styles.spotlight}`}>
        <div className={styles.spotlightCopy}>
          <span className={styles.spotlightLabel}>Sugestoes rapidas</span>
          <h2 className={styles.spotlightTitle}>Puxe uma vontade e deixe a IA montar os cards.</h2>
          <p className={styles.spotlightDescription}>
            Funciona melhor quando voce fala comida, bairro, budget ou clima do momento.
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
                Contexto ativo: {grupo?.nome ?? 'perfil individual'}
              </p>
            </div>

            <div className={styles.panelTags}>
              <span className={styles.panelTag}>Comidinhas</span>
              <span className={styles.panelTag}>Google quando fizer sentido</span>
            </div>
          </div>

          {errorMessage ? (
            <FeedbackState
              description={errorMessage}
              title="A requisicao nao foi concluida"
              variant="error"
            />
          ) : null}

          <ChatMessageList
            isLoading={isSubmitting}
            messages={messages}
            onSaveGoogleRecommendation={handleSaveGoogleRecommendation}
            savingRecommendationId={savingRecommendationId}
          />
        </section>

        <div className={styles.sideColumn}>
          <ChatComposer
            draft={draft}
            hasMessages={messages.length > 0}
            isSubmitting={isSubmitting}
            onClearConversation={handleClearConversation}
            onDraftChange={setDraft}
            onSubmit={handleSubmit}
          />

          <aside className={`surfaceCard ${styles.helpCard}`}>
            <span className={styles.helpEyebrow}>Como pedir</span>
            <h2 className={styles.helpTitle}>Fale como se estivesse decidindo agora.</h2>

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
