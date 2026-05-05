import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { Icon } from '@/shared/ui/Icon/Icon'
import { PageHeader } from '@/shared/ui/PageHeader/PageHeader'
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

const SAMPLE_TEXT = `Os 10 melhores restaurantes de Vila Madalena
Por Folha SP — 2024

1. Z Deli — Sanduíches autorais e clima de bar de bairro. R. Aspicuelta.
2. Tan Tan Noodle Bar — Lámen criativo e drinks asiáticos. R. Fradique Coutinho.
3. A Casa do Porco — Cozinha brasileira contemporânea (anexo Vila Mada). Centro/Vila.
4. Patuá — Pratos da Bahia em casa pequena. Beco do Batman.
5. Ferro e Farinha — Pizza romana com fila boa. Mooca/Vila.`

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

function getItemOrder(item: GuiaIaItem) {
  return item.posicao_ranking ?? item.ordem ?? Number.MAX_SAFE_INTEGER
}

function getItemTitle(item: GuiaIaItem) {
  return item.nome_normalizado ?? item.nome_importado
}

function getItemLocation(item: GuiaIaItem) {
  return [item.bairro, item.cidade].filter(Boolean).join(' · ')
}

type ItemActionState = Record<string, 'confirmando' | 'descartando' | undefined>

export function AiGuideImportPage() {
  const { grupo, perfil } = useAuth()

  const [texto, setTexto] = useState('')
  const [titulo, setTitulo] = useState('')
  const [urlOrigem, setUrlOrigem] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [job, setJob] = useState<JobResponse | null>(null)
  const [guide, setGuide] = useState<GuiaIaResponse | null>(null)
  const [history, setHistory] = useState<JobResponse[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<ItemActionState>({})
  const [filter, setFilter] = useState<'todos' | 'pendentes' | 'confirmados' | 'duvidas'>('todos')

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

  const trackJob = useCallback(async (initial: JobResponse) => {
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
  }, [loadHistory])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!grupo || texto.trim().length < 10) return

    setSubmitting(true)
    setError(null)

    try {
      const created = await createImportJob({
        grupo_id: grupo.id,
        perfil_id: perfil?.id,
        texto: texto.trim(),
        titulo_sugerido: titulo.trim() || undefined,
        url_origem: urlOrigem.trim() || undefined,
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
    setTexto(SAMPLE_TEXT)
    setTitulo('Vila Mada para o casal')
  }

  const isRunning = job ? !isJobTerminal(job.status) : false
  const success = job ? isJobSuccess(job.status) : false

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
    const items = [...(guide?.itens ?? [])].sort((a, b) => getItemOrder(a) - getItemOrder(b))
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
        <PageHeader
          eyebrow="Guia IA · Novo"
          title="Selecione um grupo para importar guias."
          description="A IA precisa saber em qual perfil salvar o guia, os lugares e as sugestões."
        />
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="Guia IA · Novo"
        title="Cole um texto, ganhe um guia gastronômico."
        description="Mande uma matéria, lista do Insta ou Google Doc. A IA extrai os restaurantes, cruza com o que o grupo já conhece e devolve um guia pronto pra usar no IA Decide."
        action={
          <button
            className={styles.headerAction}
            onClick={handleUseSample}
            type="button"
            disabled={submitting || isRunning}
          >
            <Icon name="sparkles" size={16} />
            Usar texto de exemplo
          </button>
        }
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.heroBand}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>
            <Icon name="robot" size={14} /> novo nesta versão
          </span>
          <h2 className={styles.heroTitle}>
            Cole o link da matéria, a IA monta o guia <span className={styles.heroAccent}>em segundos</span>.
          </h2>
          <p className={styles.heroSubtitle}>
            Sanitização → extração dos restaurantes → match com seus lugares → busca no Google Places →
            sugestões personalizadas pro grupo de {grupo.nome}.
          </p>
        </div>
        <ul className={styles.heroPipeline}>
          <li>
            <span>1</span>
            Limpa e classifica
          </li>
          <li>
            <span>2</span>
            Extrai restaurantes
          </li>
          <li>
            <span>3</span>
            Cruza com seus lugares
          </li>
          <li>
            <span>4</span>
            Sugere para o grupo
          </li>
        </ul>
      </div>

      <div className={styles.layout}>
        <form className={`surfaceCard ${styles.form}`} onSubmit={handleSubmit}>
          <div className={styles.formHead}>
            <h2>Importar texto</h2>
            <p>Funciona com matérias, listas do Instagram ou anotações coladas direto.</p>
          </div>

          <label className="formField">
            <span className="formLabel">Texto do guia</span>
            <textarea
              className={`textArea ${styles.textArea}`}
              disabled={submitting || isRunning}
              minLength={10}
              maxLength={400_000}
              onChange={(event) => setTexto(event.target.value)}
              placeholder="Cole aqui o texto da matéria, a lista do amigo ou o que você salvou."
              required
              rows={10}
              value={texto}
            />
            <small className={styles.fieldHint}>{texto.length.toLocaleString('pt-BR')} / 400.000 caracteres</small>
          </label>

          <div className={styles.formGrid}>
            <label className="formField">
              <span className="formLabel">Título sugerido</span>
              <input
                className="textInput"
                disabled={submitting || isRunning}
                maxLength={200}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Vila Madalena para o casal"
                type="text"
                value={titulo}
              />
            </label>
            <label className="formField">
              <span className="formLabel">URL de origem</span>
              <input
                className="textInput"
                disabled={submitting || isRunning}
                maxLength={1000}
                onChange={(event) => setUrlOrigem(event.target.value)}
                placeholder="https://folha.uol.com.br/..."
                type="url"
                value={urlOrigem}
              />
            </label>
          </div>

          <div className={styles.formActions}>
            <Button
              disabled={submitting || isRunning || texto.trim().length < 10}
              type="submit"
              variant="primary"
            >
              {submitting ? 'Enviando...' : isRunning ? 'Importando...' : 'Gerar guia com IA'}
            </Button>
            {isRunning ? (
              <button className={styles.cancelButton} onClick={handleCancel} type="button">
                Cancelar importação
              </button>
            ) : null}
          </div>
        </form>

        <aside className={styles.sidePanel}>
          {job ? (
            <JobProgress job={job} />
          ) : (
            <div className={`surfaceCard ${styles.idleCard}`}>
              <div className={styles.idleIcon}>
                <Icon name="sparkles" size={20} />
              </div>
              <strong>Pronto pra importar.</strong>
              <p>O acompanhamento da IA aparece aqui assim que você enviar o texto.</p>
            </div>
          )}

          <div className={`surfaceCard ${styles.historyCard}`}>
            <header className={styles.panelHeader}>
              <h3>Últimas importações</h3>
              <button onClick={loadHistory} type="button" className={styles.iconButton} aria-label="Atualizar">
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
        </aside>
      </div>

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
  filter: 'todos' | 'pendentes' | 'confirmados' | 'duvidas'
  onFilter: (next: 'todos' | 'pendentes' | 'confirmados' | 'duvidas') => void
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
  const heroImage =
    guide.imagem_capa ?? visibleItems.find((item) => item.foto_url)?.foto_url ?? null
  const totalText = `${guide.total_itens} restaurante${guide.total_itens === 1 ? '' : 's'}`
  const isCompact = visibleItems.length >= 24

  return (
    <div className={styles.guideSection}>
      <header className={styles.guideHeader}>
        <div className={styles.guideHeaderCopy}>
          <span className={styles.guideEyebrow}>
            <Icon name="sparkles" size={14} /> Guia importado por IA
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
              <Icon name="grid" size={13} /> {totalText}
            </li>
            {guide.fonte ? (
              <li>
                <Icon name="link" size={13} /> {guide.fonte}
              </li>
            ) : null}
          </ul>
        </div>
        <div className={styles.guideHeaderActions}>
          {guide.url_origem ? (
            <a
              className={styles.shareGuideButton}
              href={guide.url_origem}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external-link" size={15} /> Abrir fonte
            </a>
          ) : null}
        </div>
        <div className={styles.guideCover}>
          {heroImage ? <img src={heroImage} alt="" /> : <Icon name="utensils" size={42} />}
        </div>
      </header>

      {suggestionCards.length > 0 ? (
        <section className={styles.suggestionsPanel}>
          <header className={styles.previewSectionHeader}>
            <div>
              <span className={styles.previewSectionIcon}>
                <Icon name="sparkles" size={15} />
              </span>
              <h3 className={styles.subSectionTitle}>Destaques para o grupo</h3>
            </div>
            <p>Sugestoes inteligentes com base nas preferencias de todos.</p>
          </header>
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
                    <small>
                      {[card.bairro, card.cidade].filter(Boolean).join(' · ')}
                    </small>
                  ) : null}
                  {card.google_maps_uri ? (
                    <a
                      href={card.google_maps_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.suggestionLink}
                    >
                      Ver no Maps <Icon name="external-link" size={12} />
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

      <section className={`${styles.itemsPanel} ${isCompact ? styles.itemsPanelCompact : ''}`}>
        <header className={styles.itemsHeader}>
          <div className={styles.itemsTitle}>
            <div>
              <h3 className={styles.guideMenuTitle}>
                Para vocês <span className={styles.titleHeart} aria-hidden="true"></span>
              </h3>
              <p>Lugares que combinam com o perfil de vocês</p>
            </div>
          </div>
          <div className={styles.itemsControls}>
            <div className={styles.filterRow} role="tablist">
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
                  role="tab"
                  type="button"
                  aria-selected={filter === option.id}
                  className={styles.filterChip}
                  data-active={filter === option.id}
                  onClick={() => onFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className={styles.itemsCount}>
              {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </header>

        {visibleItems.length === 0 ? (
          <p className={styles.muted}>Nenhum item para esse filtro.</p>
        ) : (
          <ul className={`${styles.itemsList} ${isCompact ? styles.itemsListCompact : ''}`}>
            {visibleItems.map((item, index) => (
              <li key={item.id} className={styles.itemCard}>
                <div className={styles.itemMedia}>
                  {item.foto_url ? (
                    <img src={item.foto_url} alt={item.nome_importado} />
                  ) : (
                    <div className={styles.itemPlaceholder} aria-hidden="true">
                      <Icon name="utensils" size={22} />
                    </div>
                  )}
                  <span className={styles.itemRank}>#{index + 1}</span>
                  <span className={styles.profileBadge}>
                    {item.lugar_id ? 'No perfil' : STATUS_LABELS[item.status_matching]}
                  </span>
                </div>
                <div className={styles.itemBody}>
                  <header>
                    <strong>{getItemTitle(item)}</strong>
                    <span className={styles.itemTag} data-tone={getStatusTone(item.status_matching)}>
                      {STATUS_LABELS[item.status_matching]}
                    </span>
                  </header>
                  <p className={styles.importedName}>{item.nome_importado}</p>
                  <ul className={styles.itemMeta}>
                    {getItemLocation(item) ? (
                      <li>
                        <Icon name="pin" size={12} />
                        {getItemLocation(item)}
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
                        {item.rating.toFixed(1).replace('.', ',')} ({item.total_avaliacoes ?? 0})
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
                    <p className={styles.itemQuote}>{item.trecho_original}</p>
                  ) : null}
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.confirmBtn}
                    disabled={Boolean(actionState[item.id])}
                    onClick={() => onConfirm(item)}
                  >
                    <Icon name="check" size={14} />
                    {actionState[item.id] === 'confirmando' ? 'Confirmando...' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    className={styles.discardBtn}
                    disabled={Boolean(actionState[item.id])}
                    onClick={() => onDiscard(item)}
                  >
                    <Icon name="x" size={14} />
                    {actionState[item.id] === 'descartando' ? 'Removendo...' : 'Descartar'}
                  </button>
                  {item.google_maps_uri ? (
                    <a
                      className={styles.mapsLink}
                      href={item.google_maps_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon name="pin" size={14} /> Ver no Maps
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
