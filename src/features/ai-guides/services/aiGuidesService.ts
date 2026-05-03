import { apiClient } from '@/shared/api/apiClient'

export type JobStatus =
  | 'created'
  | 'sanitizing_text'
  | 'classifying_content'
  | 'extracting_guide_metadata'
  | 'extracting_restaurants'
  | 'matching_internal_restaurants'
  | 'searching_google_places'
  | 'enriching_places'
  | 'selecting_photos'
  | 'calculating_group_suggestions'
  | 'creating_guide'
  | 'completed'
  | 'completed_with_warnings'
  | 'invalid_content'
  | 'failed'
  | 'cancelled'

export type StatusMatching =
  | 'encontrado_interno'
  | 'encontrado_google'
  | 'criado_automaticamente'
  | 'possivel_duplicado'
  | 'pendente'
  | 'nao_encontrado'
  | 'baixa_confianca'
  | 'possivelmente_fechado'
  | 'dados_incompletos'
  | 'ignorado'
  | 'confirmado_usuario'

export type JobEstatisticas = {
  restaurantes_extraidos: number
  restaurantes_salvos: number
  matches_internos: number
  buscas_google: number
  enriquecidos_google: number
  fotos_encontradas: number
  pendencias: number
  chamadas_llm: number
  tokens_entrada: number
  tokens_saida: number
  chamadas_google: number
  custo_estimado_usd: number | null
  custo_estimado_brl: number | null
  duracao_ms: number | null
  lugares_criados_automaticamente: number
}

export type JobResponse = {
  id: string
  grupo_id: string
  perfil_id: string | null
  guia_id: string | null
  status: JobStatus
  etapa_atual: string | null
  etapas_concluidas: string[]
  progresso_percentual: number
  progresso_label: string | null
  mensagem_usuario: string | null
  motivo_invalido: string | null
  alertas: string[]
  estatisticas: JobEstatisticas
  iniciado_em: string | null
  concluido_em: string | null
  criado_em: string | null
  atualizado_em: string | null
}

export type CriarGuiaIaPayload = {
  grupo_id: string
  perfil_id?: string | null
  texto: string
  titulo_sugerido?: string | null
  url_origem?: string | null
}

export type GuiaIaItem = {
  id: string
  posicao_ranking: number | null
  ordem: number
  nome_importado: string
  nome_normalizado: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  categoria: string | null
  place_id: string | null
  endereco: string | null
  latitude: number | null
  longitude: number | null
  google_maps_uri: string | null
  telefone: string | null
  site: string | null
  rating: number | null
  total_avaliacoes: number | null
  preco_nivel: number | null
  foto_url: string | null
  foto_atribuicao: string | null
  status_negocio: string | null
  horarios: string[]
  status_matching: StatusMatching
  score_matching: number | null
  confianca_extracao: number | null
  confianca_enriquecimento: number | null
  alertas: string[]
  trecho_original: string | null
  lugar_id: string | null
  lugar_status: string | null
  lugar_favorito: boolean | null
  extra: Record<string, unknown>
}

export type GuiaIaSugestaoCard = {
  id: string
  titulo: string
  motivo: string
  item_id: string | null
  nome: string | null
  foto_url: string | null
  bairro: string | null
  cidade: string | null
  google_maps_uri: string | null
  score: number | null
}

export type GuiaIaSugestoes = {
  melhor_para_hoje: GuiaIaSugestaoCard | null
  mais_facil_para_todos: GuiaIaSugestaoCard | null
  melhor_avaliado: GuiaIaSugestaoCard | null
  mais_desejado_pelo_grupo: GuiaIaSugestaoCard | null
  novidade_para_o_grupo: GuiaIaSugestaoCard | null
  aviso_privacidade: string | null
}

export type GuiaIaResponse = {
  id: string
  grupo_id: string
  nome: string
  descricao: string | null
  tipo_guia: string
  fonte: string | null
  autor: string | null
  url_origem: string | null
  data_publicacao: string | null
  categoria: string | null
  regiao: string | null
  cidade_principal: string | null
  imagem_capa: string | null
  total_itens: number
  status_importacao: string | null
  qualidade_importacao: string | null
  alertas: string[]
  metadados: Record<string, unknown>
  sugestoes: GuiaIaSugestoes
  itens: GuiaIaItem[]
  criado_em: string | null
  atualizado_em: string | null
}

export type BulkItensPayload = {
  confirmar?: string[]
  descartar?: string[]
  associar?: { item_id: string; lugar_id: string }[]
}

export type BulkItensResponse = {
  confirmados: number
  removidos: number
  associados: number
  nao_encontrados: string[]
}

export const JOB_STEP_LABELS: Record<JobStatus, string> = {
  created: 'Recebendo o texto',
  sanitizing_text: 'Limpando o texto',
  classifying_content: 'Identificando o tipo de conteúdo',
  extracting_guide_metadata: 'Extraindo metadados do guia',
  extracting_restaurants: 'Encontrando restaurantes',
  matching_internal_restaurants: 'Cruzando com seus lugares',
  searching_google_places: 'Buscando no Google Places',
  enriching_places: 'Enriquecendo cada lugar',
  selecting_photos: 'Selecionando fotos',
  calculating_group_suggestions: 'Montando sugestões para o grupo',
  creating_guide: 'Salvando o guia',
  completed: 'Guia pronto!',
  completed_with_warnings: 'Guia pronto com observações',
  invalid_content: 'Não é um guia gastronômico',
  failed: 'Algo deu errado',
  cancelled: 'Importação cancelada',
}

export const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set([
  'completed',
  'completed_with_warnings',
  'invalid_content',
  'failed',
  'cancelled',
])

export function isJobTerminal(status: JobStatus) {
  return TERMINAL_STATUSES.has(status)
}

export function isJobSuccess(status: JobStatus) {
  return status === 'completed' || status === 'completed_with_warnings'
}

export function createImportJob(payload: CriarGuiaIaPayload) {
  return apiClient.post<JobResponse, CriarGuiaIaPayload>('/api/v1/guias/ia/imports', payload)
}

export function getImportJob(jobId: string) {
  return apiClient.get<JobResponse>(`/api/v1/guias/ia/imports/${jobId}`)
}

export function listImportJobs(grupoId: string, limit = 20) {
  const query = new URLSearchParams({ grupo_id: grupoId, limit: String(limit) })
  return apiClient.get<JobResponse[]>(`/api/v1/guias/ia/imports?${query}`)
}

export function cancelImportJob(jobId: string) {
  return apiClient.post<JobResponse, Record<string, never>>(
    `/api/v1/guias/ia/imports/${jobId}/cancelar`,
    {},
  )
}

export function rerunImportJob(jobId: string) {
  return apiClient.post<JobResponse, Record<string, never>>(
    `/api/v1/guias/ia/imports/${jobId}/reexecutar`,
    {},
  )
}

export function getAiGuide(guiaId: string) {
  return apiClient.get<GuiaIaResponse>(`/api/v1/guias/ia/${guiaId}`)
}

export function bulkUpdateItens(guiaId: string, payload: BulkItensPayload) {
  return apiClient.patch<BulkItensResponse, BulkItensPayload>(
    `/api/v1/guias/ia/${guiaId}/itens/bulk`,
    payload,
  )
}

export type PollOptions = {
  intervalMs?: number
  maxAttempts?: number
  signal?: AbortSignal
  onUpdate?: (job: JobResponse) => void
}

export async function pollImportJob(jobId: string, options: PollOptions = {}) {
  const { intervalMs = 2000, maxAttempts = 240, signal, onUpdate } = options

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException('Polling aborted', 'AbortError')
    }

    const job = await getImportJob(jobId)
    onUpdate?.(job)

    if (isJobTerminal(job.status)) {
      return job
    }

    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, intervalMs)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout)
          resolve(undefined)
        },
        { once: true },
      )
    })
  }

  throw new Error('Tempo máximo de espera atingido para a importação do guia.')
}
