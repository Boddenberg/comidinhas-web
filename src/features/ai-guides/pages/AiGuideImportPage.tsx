import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { resolveGroupBackgroundUrl } from '@/features/groups/lib/groupBackgrounds'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import {
  bulkUpdateItens,
  cancelImportJob,
  createImportJob,
  getAiGuide,
  isJobSuccess,
  isJobTerminal,
  JOB_STEP_LABELS,
  listImportJobs,
  pollImportJob,
  rerunImportJob,
  type GuiaIaItem,
  type GuiaIaResponse,
  type GuiaIaSugestaoCard,
  type JobResponse,
  type JobStatus,
  type StatusMatching,
} from '../services/aiGuidesService'
import styles from './AiGuideImportPage.module.css'

const SUGGESTION_LABELS: Record<string, { title: string; emoji: string }> = {
  melhor_para_hoje: { title: 'Melhor para hoje', emoji: '✨' },
  mais_facil_para_todos: { title: 'Mais fácil pra todos', emoji: '🤝' },
  melhor_avaliado: { title: 'Melhor avaliado', emoji: '⭐' },
  mais_desejado_pelo_grupo: { title: 'Mais desejado pelo grupo', emoji: '💕' },
  novidade_para_o_grupo: { title: 'Novidade pro grupo', emoji: '🆕' },
}

const STATUS_TONE: Partial<Record<StatusMatching, 'success' | 'warning' | 'danger' | 'info'>> = {
  encontrado_interno: 'success',
  encontrado_google: 'success',
  criado_automaticamente: 'success',
  confirmado_usuario: 'success',
  possivel_duplicado: 'warning',
  baixa_confianca: 'warning',
  dados_incompletos: 'warning',
  possivelmente_fechado: 'warning',
  pendente: 'info',
  ignorado: 'info',
  nao_encontrado: 'danger',
}

const STATUS_LABELS: Record<StatusMatching, string> = {
  encontrado_interno: 'Já está no perfil',
  encontrado_google: 'Achado no Google',
  criado_automaticamente: 'Criado automaticamente',
  confirmado_usuario: 'Confirmado',
  possivel_duplicado: 'Possível duplicado',
  baixa_confianca: 'Baixa confiança',
  dados_incompletos: 'Dados incompletos',
  possivelmente_fechado: 'Talvez esteja fechado',
  pendente: 'Pendente',
  ignorado: 'Ignorado',
  nao_encontrado: 'Não encontrado',
}

const SAMPLE_TEXT = `10 japoneses imperdíveis em São Paulo:
1. Kan Suke – Itaim Bibi
2. Tan Tan Noodle Bar – Vila Mariana
3. Sushi Hachi – Jardins
4. Kinoshita – Higienópolis
5. Nakka – Pinheiros
6. Azumi – Moema
7. Shin-Zushi – Itaim
8. Sushi Yassu – Paraíso
9. Temaki Ya – Brooklin
10. Komeki – Liberdade

... e mais alguns menções especiais que valem a visita!`

const PIPELINE_STEPS = [
  { id: 'sanitiza', label: 'Sanitiza', icon: 'sparkles', tone: 'purple' },
  { id: 'classifica', label: 'Classifica', icon: 'tag', tone: 'pink' },
  { id: 'extrai', label: 'Extrai\nrestaurantes', icon: 'list', tone: 'place' },
  { id: 'cruza', label: 'Cruza com\no grupo', icon: 'users', tone: 'blue' },
  { id: 'enriquece', label: 'Enriquece com\nGoogle Places', icon: 'pin', tone: 'budget' },
  { id: 'sugere', label: 'Monta\nsugestões', icon: 'star', tone: 'distance' },
  { id: 'cria', label: 'Cria\no guia', icon: 'flag', tone: 'tip' },
] as const

const TONE_TO_VAR: Record<string, { bg: string; fg: string }> = {
  purple: { bg: 'var(--color-tile-purple-bg)', fg: 'var(--color-tile-purple-text)' },
  pink: { bg: 'var(--color-tile-pink-bg)', fg: 'var(--color-tile-pink-text)' },
  place: { bg: 'var(--color-tile-place-bg)', fg: 'var(--color-tile-place-text)' },
  blue: { bg: 'var(--color-tile-blue-bg)', fg: 'var(--color-tile-blue-text)' },
  budget: { bg: 'var(--color-tile-budget-bg)', fg: 'var(--color-tile-budget-text)' },
  distance: { bg: 'var(--color-tile-distance-bg)', fg: 'var(--color-tile-distance-text)' },
  tip: { bg: 'var(--color-tip-bg)', fg: 'var(--color-tip-text)' },
}

const CHAR_LIMIT = 8000
const URL_PATTERN = /^https?:\/\/\S+/i

type InputMode = 'texto' | 'link'
type FilterId = 'todos' | 'pendentes' | 'confirmados' | 'duvidas'
type ItemActionState = Record<string, 'confirmando' | 'descartando' | undefined>

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`
}

function formatStatus(status: JobStatus) {
  return JOB_STEP_LABELS[status] ?? status
}

function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return `há ${days} d`
}

function getStatusTone(status: StatusMatching) {
  return STATUS_TONE[status] ?? 'info'
}

export function AiGuideImportPage() {
  const { grupo, perfil } = useAuth()

  const [mode, setMode] = useState<InputMode>('texto')
  const [texto, setTexto] = useState('')
  const [link, setLink] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [job, setJob] = useState<JobResponse | null>(null)
  const [guide, setGuide] = useState<GuiaIaResponse | null>(null)
  const [history, setHistory] = useState<JobResponse[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<ItemActionState>({})
  const [filter, setFilter] = useState<FilterId>('todos')

  const pollAbortRef = useRef<AbortController | null>(null)

  const loadHistory = useCallback(async () => {
    if (!grupo) return
    setHistoryLoading(true)
    try {
      const items = await listImportJobs(grupo.id, 8)
      setHistory(items)
    } catch (err) {
      console.warn('Falha ao listar histórico de importações IA', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [grupo])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort()
    }
  }, [])

  const trackJob = useCallback(
    async (initial: JobResponse) => {
      pollAbortRef.current?.abort()
      const controller = new AbortController()
      pollAbortRef.current = controller
      setJob(initial)
      setGuide(null)

      try {
        const finalJob = await pollImportJob(initial.id, {
          intervalMs: 2500,
          signal: controller.signal,
          onUpdate: (next) => setJob(next),
        })

        setJob(finalJob)

        if (isJobSuccess(finalJob.status) && finalJob.guia_id) {
          const guia = await getAiGuide(finalJob.guia_id)
          setGuide(guia)
        }
      } catch (err) {
        if ((err as DOMException)?.name !== 'AbortError') {
          setError(getErrorMessage(err, 'Não foi possível acompanhar a importação.'))
        }
      } finally {
        void loadHistory()
      }
    },
    [loadHistory],
  )

  const isRunning = job ? !isJobTerminal(job.status) : false
  const success = job ? isJobSuccess(job.status) : false

  const trimmedTexto = texto.trim()
  const trimmedLink = link.trim()
  const linkLooksValid = URL_PATTERN.test(trimmedLink)
  const canSubmit = mode === 'texto' ? trimmedTexto.length >= 10 : linkLooksValid

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!grupo || !canSubmit || submitting || isRunning) return

    setSubmitting(true)
    setError(null)

    try {
      const payloadTexto = mode === 'texto' ? trimmedTexto : trimmedLink
      const payloadUrl = mode === 'link' ? trimmedLink : undefined

      const created = await createImportJob({
        grupo_id: grupo.id,
        perfil_id: perfil?.id,
        texto: payloadTexto,
        url_origem: payloadUrl,
      })
      void trackJob(created)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível iniciar a importação.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!job) return
    pollAbortRef.current?.abort()
    try {
      const cancelled = await cancelImportJob(job.id)
      setJob(cancelled)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível cancelar a importação.'))
    } finally {
      void loadHistory()
    }
  }

  async function handleRerun(jobId: string) {
    setError(null)
    try {
      const rerun = await rerunImportJob(jobId)
      void trackJob(rerun)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível reexecutar a importação.'))
    }
  }

  async function handleResumeJob(target: JobResponse) {
    setError(null)
    if (isJobSuccess(target.status) && target.guia_id) {
      setJob(target)
      try {
        const guia = await getAiGuide(target.guia_id)
        setGuide(guia)
      } catch (err) {
        setError(getErrorMessage(err, 'Não foi possível abrir o guia.'))
      }
      return
    }

    if (!isJobTerminal(target.status)) {
      void trackJob(target)
      return
    }

    setJob(target)
    setGuide(null)
  }

  async function handleConfirmItem(item: GuiaIaItem) {
    if (!guide) return
    setActionState((current) => ({ ...current, [item.id]: 'confirmando' }))
    try {
      await bulkUpdateItens(guide.id, { confirmar: [item.id] })
      const refreshed = await getAiGuide(guide.id)
      setGuide(refreshed)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível confirmar o item.'))
    } finally {
      setActionState((current) => ({ ...current, [item.id]: undefined }))
    }
  }

  async function handleDiscardItem(item: GuiaIaItem) {
    if (!guide) return
    setActionState((current) => ({ ...current, [item.id]: 'descartando' }))
    try {
      await bulkUpdateItens(guide.id, { descartar: [item.id] })
      const refreshed = await getAiGuide(guide.id)
      setGuide(refreshed)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível descartar o item.'))
    } finally {
      setActionState((current) => ({ ...current, [item.id]: undefined }))
    }
  }

  function handleUseSample() {
    setMode('texto')
    setTexto(SAMPLE_TEXT)
    setLink('')
  }

  function handleClear() {
    setTexto('')
    setLink('')
  }

  const suggestionCards = useMemo(() => {
    if (!guide) return []
    const entries: { key: string; card: GuiaIaSugestaoCard }[] = []
    const sugestoes = guide.sugestoes ?? {
      melhor_para_hoje: null,
      mais_facil_para_todos: null,
      melhor_avaliado: null,
      mais_desejado_pelo_grupo: null,
      novidade_para_o_grupo: null,
      aviso_privacidade: null,
    }
    for (const key of [
      'melhor_para_hoje',
      'mais_facil_para_todos',
      'melhor_avaliado',
      'mais_desejado_pelo_grupo',
      'novidade_para_o_grupo',
    ] as const) {
      const card = sugestoes[key]
      if (card) entries.push({ key, card })
    }
    return entries
  }, [guide])

  const visibleItems = useMemo(() => {
    const items = guide?.itens ?? []
    if (filter === 'todos') return items
    if (filter === 'confirmados') {
      return items.filter((item) => item.lugar_id || item.status_matching === 'confirmado_usuario')
    }
    if (filter === 'duvidas') {
      return items.filter((item) =>
        ['possivel_duplicado', 'baixa_confianca', 'dados_incompletos', 'possivelmente_fechado'].includes(
          item.status_matching,
        ),
      )
    }
    return items.filter(
      (item) => item.status_matching === 'pendente' || item.status_matching === 'nao_encontrado',
    )
  }, [filter, guide])

  if (!grupo) {
    return (
      <section className={styles.page}>
        <div className={`surfaceCard ${styles.emptyState}`}>
          <div className={styles.emptyIcon}>
            <Icon name="users" size={20} />
          </div>
          <h1>Selecione um grupo</h1>
          <p>A IA precisa saber em qual perfil salvar o guia, os lugares e as sugestões.</p>
        </div>
      </section>
    )
  }

  const groupPhotoUrl = grupo.foto_url ? resolveGroupBackgroundUrl(grupo.foto_url) : null

  return (
    <section className={styles.page}>
      {error ? <p className={styles.error}>{error}</p> : null}

      <article className={`surfaceCard ${styles.importCard}`}>
        <header className={styles.importHero}>
          <div className={styles.heroBadge}>
            <Icon name="sparkles" size={26} />
          </div>
          <div className={styles.heroCopy}>
            <h1>Importar guia com IA</h1>
            <p>
              Cole um texto, matéria, lista, post ou link e a IA transforma isso em um guia para o
              grupo.
            </p>
          </div>
          <div className={styles.heroMascot} aria-hidden="true">
            <span className={styles.mascotEmoji}>🤖</span>
            <span className={styles.mascotBowl}>🍜</span>
            <span className={styles.mascotSparkleA}>✨</span>
            <span className={styles.mascotSparkleB}>✨</span>
            <span className={styles.mascotSparkleC}>✨</span>
            <span className={styles.mascotChecklist}>
              <span>✓</span>
              <span>✓</span>
              <span>✓</span>
            </span>
          </div>
        </header>

        <form className={styles.importForm} onSubmit={handleSubmit}>
          <div className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>Grupo</span>
            <div className={styles.groupSelect}>
              <span className={styles.groupAvatar} aria-hidden="true">
                {groupPhotoUrl ? (
                  <img src={groupPhotoUrl} alt="" />
                ) : (
                  <Icon name="users" size={14} />
                )}
              </span>
              <span className={styles.groupName}>{grupo.nome}</span>
              <Icon name="chevron-down" size={16} />
            </div>
          </div>

          <div className={styles.modeTabs} role="tablist" aria-label="Origem do conteúdo">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'texto'}
              className={styles.modeTab}
              data-active={mode === 'texto'}
              onClick={() => setMode('texto')}
              disabled={submitting || isRunning}
            >
              <Icon name="pencil" size={15} />
              Colar texto
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'link'}
              className={styles.modeTab}
              data-active={mode === 'link'}
              onClick={() => setMode('link')}
              disabled={submitting || isRunning}
            >
              <Icon name="link" size={15} />
              Colar link
            </button>
          </div>

          {mode === 'texto' ? (
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>Cole aqui o texto, lista ou post</span>
              <div className={styles.textAreaWrap}>
                <textarea
                  className={styles.textArea}
                  disabled={submitting || isRunning}
                  maxLength={CHAR_LIMIT}
                  minLength={10}
                  onChange={(event) => setTexto(event.target.value)}
                  placeholder={SAMPLE_TEXT}
                  rows={11}
                  value={texto}
                />
                <span className={styles.charCounter}>
                  {texto.length.toLocaleString('pt-BR')} / {CHAR_LIMIT.toLocaleString('pt-BR')}
                </span>
              </div>
            </label>
          ) : null}

          <div className={styles.divider}>
            <span>Ou</span>
          </div>

          <label className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>Ou cole um link</span>
            <div className={styles.linkInputWrap}>
              <Icon name="link" size={16} />
              <input
                className={styles.linkInput}
                disabled={submitting || isRunning}
                inputMode="url"
                maxLength={1000}
                onChange={(event) => setLink(event.target.value)}
                onFocus={() => setMode('link')}
                placeholder="https://..."
                type="url"
                value={link}
              />
            </div>
          </label>

          <ul className={styles.pipeline} aria-hidden="true">
            {PIPELINE_STEPS.map((step, index) => {
              const tone = TONE_TO_VAR[step.tone] ?? TONE_TO_VAR.purple
              return (
                <li key={step.id} className={styles.pipelineItem}>
                  <span
                    className={styles.pipelineIcon}
                    style={{ background: tone.bg, color: tone.fg }}
                  >
                    <Icon name={step.icon} size={20} />
                  </span>
                  <span className={styles.pipelineLabel}>
                    {step.label.split('\n').map((line, lineIndex) => (
                      <span key={lineIndex}>{line}</span>
                    ))}
                  </span>
                  {index < PIPELINE_STEPS.length - 1 ? (
                    <span className={styles.pipelineConnector} aria-hidden="true">
                      <Icon name="arrow-right" size={14} />
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={!canSubmit || submitting || isRunning}
          >
            <Icon name="sparkles" size={18} />
            {submitting ? 'Enviando...' : isRunning ? 'Importando...' : 'Criar guia com IA'}
          </button>

          <div className={styles.secondaryActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleUseSample}
              disabled={submitting || isRunning}
            >
              <Icon name="book-open" size={15} />
              Usar exemplo
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleClear}
              disabled={submitting || isRunning || (!texto && !link)}
            >
              <Icon name="trash" size={15} />
              Limpar
            </button>
            {isRunning ? (
              <button type="button" className={styles.cancelButton} onClick={handleCancel}>
                Cancelar importação
              </button>
            ) : null}
          </div>

          <p className={styles.privacyNote}>
            <Icon name="lock" size={13} />A IA só usa o conteúdo para criar o guia. Nada é
            publicado sem sua aprovação.
          </p>
        </form>
      </article>

      {job ? (
        <div className={styles.statusGrid}>
          <JobProgress job={job} />
          <div className={`surfaceCard ${styles.historyCard}`}>
            <header className={styles.panelHeader}>
              <h3>Últimas importações</h3>
              <button
                onClick={loadHistory}
                type="button"
                className={styles.iconButton}
                aria-label="Atualizar"
              >
                <Icon name="bolt" size={14} />
              </button>
            </header>

            {historyLoading && history.length === 0 ? (
              <p className={styles.muted}>Carregando histórico...</p>
            ) : history.length === 0 ? (
              <p className={styles.muted}>Nenhuma importação por aqui ainda.</p>
            ) : (
              <ul className={styles.historyList}>
                {history.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={styles.historyItem}
                      data-active={job?.id === entry.id}
                      onClick={() => handleResumeJob(entry)}
                    >
                      <span className={styles.historyDot} data-status={entry.status} />
                      <div className={styles.historyBody}>
                        <strong>{formatStatus(entry.status)}</strong>
                        <span>
                          {entry.estatisticas.restaurantes_extraidos} extraídos ·{' '}
                          {formatRelativeTime(entry.atualizado_em ?? entry.criado_em)}
                        </span>
                      </div>
                      {entry.status === 'failed' || entry.status === 'cancelled' ? (
                        <span
                          className={styles.historyAction}
                          onClick={(ev) => {
                            ev.stopPropagation()
                            void handleRerun(entry.id)
                          }}
                          role="button"
                        >
                          Reexecutar
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {success && guide ? (
        <GuidePreview
          guide={guide}
          suggestionCards={suggestionCards}
          visibleItems={visibleItems}
          actionState={actionState}
          filter={filter}
          onFilter={setFilter}
          onConfirm={handleConfirmItem}
          onDiscard={handleDiscardItem}
        />
      ) : null}
    </section>
  )
}

function JobProgress({ job }: { job: JobResponse }) {
  const tone = isJobSuccess(job.status)
    ? 'success'
    : job.status === 'failed' || job.status === 'invalid_content' || job.status === 'cancelled'
      ? 'danger'
      : 'running'

  return (
    <div className={`surfaceCard ${styles.progressCard}`} data-tone={tone}>
      <header>
        <span className={styles.progressBadge}>{formatStatus(job.status)}</span>
        <strong>{formatPercent(job.progresso_percentual)}</strong>
      </header>
      <div className={styles.progressBarTrack}>
        <div
          className={styles.progressBarFill}
          style={{ width: formatPercent(job.progresso_percentual) }}
        />
      </div>
      {job.progresso_label ? <p className={styles.progressLabel}>{job.progresso_label}</p> : null}
      {job.mensagem_usuario ? <p className={styles.progressMessage}>{job.mensagem_usuario}</p> : null}
      {job.motivo_invalido ? (
        <p className={styles.progressInvalid}>Motivo: {job.motivo_invalido}</p>
      ) : null}

      <dl className={styles.statGrid}>
        <Stat label="Extraídos" value={job.estatisticas.restaurantes_extraidos} />
        <Stat label="Match interno" value={job.estatisticas.matches_internos} />
        <Stat label="Google" value={job.estatisticas.buscas_google} />
        <Stat label="Fotos" value={job.estatisticas.fotos_encontradas} />
      </dl>

      {job.alertas.length > 0 ? (
        <ul className={styles.alertList}>
          {job.alertas.slice(0, 3).map((alert, index) => (
            <li key={`${alert}-${index}`}>{alert}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

type GuidePreviewProps = {
  guide: GuiaIaResponse
  suggestionCards: { key: string; card: GuiaIaSugestaoCard }[]
  visibleItems: GuiaIaItem[]
  actionState: ItemActionState
  filter: FilterId
  onFilter: (next: FilterId) => void
  onConfirm: (item: GuiaIaItem) => void
  onDiscard: (item: GuiaIaItem) => void
}

function GuidePreview({
  guide,
  suggestionCards,
  visibleItems,
  actionState,
  filter,
  onFilter,
  onConfirm,
  onDiscard,
}: GuidePreviewProps) {
  return (
    <div className={`surfaceCard ${styles.guideSection}`}>
      <header className={styles.guideHeader}>
        <div>
          <span className={styles.guideEyebrow}>
            <Icon name="bookmark" size={14} /> Guia recém-criado
          </span>
          <h2>{guide.nome}</h2>
          {guide.descricao ? <p>{guide.descricao}</p> : null}
          <ul className={styles.guideMeta}>
            {guide.cidade_principal ? (
              <li>
                <Icon name="pin" size={13} /> {guide.cidade_principal}
              </li>
            ) : null}
            {guide.categoria ? (
              <li>
                <Icon name="utensils" size={13} /> {guide.categoria}
              </li>
            ) : null}
            <li>
              <Icon name="grid" size={13} /> {guide.total_itens} restaurantes
            </li>
            {guide.fonte ? (
              <li>
                <Icon name="link" size={13} /> {guide.fonte}
              </li>
            ) : null}
          </ul>
        </div>
        {guide.imagem_capa ? (
          <img src={guide.imagem_capa} alt={guide.nome} className={styles.guideCover} />
        ) : null}
      </header>

      {suggestionCards.length > 0 ? (
        <section>
          <h3 className={styles.subSectionTitle}>Sugestões pro grupo</h3>
          <div className={styles.suggestionGrid}>
            {suggestionCards.map(({ key, card }) => {
              const meta = SUGGESTION_LABELS[key] ?? { title: card.titulo, emoji: '✨' }
              return (
                <article key={key} className={styles.suggestionCard}>
                  <header>
                    <span className={styles.suggestionEmoji}>{meta.emoji}</span>
                    <strong>{meta.title}</strong>
                  </header>
                  <h4>{card.nome ?? card.titulo}</h4>
                  <p>{card.motivo}</p>
                  {card.bairro || card.cidade ? (
                    <small>{[card.bairro, card.cidade].filter(Boolean).join(' · ')}</small>
                  ) : null}
                  {card.google_maps_uri ? (
                    <a
                      href={card.google_maps_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.suggestionLink}
                    >
                      Abrir no Google Maps <Icon name="external-link" size={12} />
                    </a>
                  ) : null}
                </article>
              )
            })}
          </div>
          {guide.sugestoes?.aviso_privacidade ? (
            <p className={styles.privacyNotice}>{guide.sugestoes.aviso_privacidade}</p>
          ) : null}
        </section>
      ) : null}

      <section>
        <header className={styles.itemsHeader}>
          <h3 className={styles.subSectionTitle}>Restaurantes do guia</h3>
          <div className={styles.filterRow}>
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'confirmados', label: 'Confirmados' },
                { id: 'pendentes', label: 'Pendentes' },
                { id: 'duvidas', label: 'Dúvidas' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.filterChip}
                data-active={filter === option.id}
                onClick={() => onFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        {visibleItems.length === 0 ? (
          <p className={styles.muted}>Nenhum item para esse filtro.</p>
        ) : (
          <ul className={styles.itemsList}>
            {visibleItems.map((item) => (
              <li key={item.id} className={styles.itemCard}>
                <div className={styles.itemMedia}>
                  {item.foto_url ? (
                    <img src={item.foto_url} alt={item.nome_importado} />
                  ) : (
                    <div className={styles.itemPlaceholder} aria-hidden="true">
                      <Icon name="utensils" size={22} />
                    </div>
                  )}
                  {item.posicao_ranking ? (
                    <span className={styles.itemRank}>#{item.posicao_ranking}</span>
                  ) : null}
                </div>
                <div className={styles.itemBody}>
                  <header>
                    <strong>{item.nome_normalizado ?? item.nome_importado}</strong>
                    <span className={styles.itemTag} data-tone={getStatusTone(item.status_matching)}>
                      {STATUS_LABELS[item.status_matching]}
                    </span>
                  </header>
                  <ul className={styles.itemMeta}>
                    {item.bairro || item.cidade ? (
                      <li>
                        <Icon name="pin" size={12} />
                        {[item.bairro, item.cidade].filter(Boolean).join(' · ')}
                      </li>
                    ) : null}
                    {item.categoria ? (
                      <li>
                        <Icon name="utensils" size={12} />
                        {item.categoria}
                      </li>
                    ) : null}
                    {item.rating ? (
                      <li>
                        <Icon name="star" size={12} />
                        {item.rating.toFixed(1)} ({item.total_avaliacoes ?? 0})
                      </li>
                    ) : null}
                    {item.preco_nivel ? (
                      <li>
                        <Icon name="wallet" size={12} />
                        {'$'.repeat(item.preco_nivel)}
                      </li>
                    ) : null}
                  </ul>
                  {item.trecho_original ? (
                    <p className={styles.itemQuote}>“{item.trecho_original}”</p>
                  ) : null}
                  {item.alertas.length > 0 ? (
                    <ul className={styles.itemAlerts}>
                      {item.alertas.map((alert, index) => (
                        <li key={`${alert}-${index}`}>{alert}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.confirmBtn}
                    disabled={Boolean(actionState[item.id])}
                    onClick={() => onConfirm(item)}
                  >
                    {actionState[item.id] === 'confirmando' ? 'Confirmando…' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    className={styles.discardBtn}
                    disabled={Boolean(actionState[item.id])}
                    onClick={() => onDiscard(item)}
                  >
                    {actionState[item.id] === 'descartando' ? 'Removendo…' : 'Descartar'}
                  </button>
                  {item.google_maps_uri ? (
                    <a
                      className={styles.mapsLink}
                      href={item.google_maps_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Maps <Icon name="external-link" size={11} />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
