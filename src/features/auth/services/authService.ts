import { ApiError, apiClient } from '@/shared/api/apiClient'
import type {
  Grupo,
  Perfil,
  ProfileUpdateRequest,
  SigninRequest,
  SignupRequest,
} from '../types'

type GrupoListResponse =
  | {
      items?: Grupo[]
      total?: number
    }
  | Grupo[]

type GrupoInviteRaw = {
  mensagem?: string | null
  mensagem_copiavel?: string | null
  message?: string | null
  qr_code_payload?: string | null
  qrCodePayload?: string | null
  url?: string | null
}

export type GrupoInvite = {
  message: string
  qrCodePayload: string
  url: string
}

export type GrupoCreatePayload = {
  nome: string
  tipo?: 'casal' | 'grupo' | 'individual'
  descricao?: string
  foto_url?: string | null
  dono_perfil_id?: string
  membros?: Array<{ perfil_id?: string; email?: string }>
}

export type GrupoUpdatePayload = Partial<GrupoCreatePayload> & {
  responsavel_perfil_id?: string
}

export type SolicitacaoEntradaGrupo = {
  id: string
  perfil_id: string
  nome?: string | null
  email?: string | null
  mensagem?: string | null
  status?: 'pendente' | 'aceita' | 'recusada' | string
  solicitado_em?: string | null
  respondido_em?: string | null
  respondido_por_perfil_id?: string | null
}

export type SolicitarEntradaGrupoPayload = {
  perfil_id: string
  mensagem?: string
}

type SolicitacaoEntradaGrupoListResponse = {
  items?: SolicitacaoEntradaGrupo[]
  total?: number
}

function normalizeGrupoList(response: GrupoListResponse): Grupo[] {
  if (Array.isArray(response)) return response
  return response.items ?? []
}

function normalizeGrupoInvite(response: GrupoInviteRaw): GrupoInvite {
  const url = response.url?.trim() ?? ''
  const qrCodePayload = response.qr_code_payload?.trim() ?? response.qrCodePayload?.trim() ?? url
  const message =
    response.mensagem_copiavel?.trim() ??
    response.mensagem?.trim() ??
    response.message?.trim() ??
    url

  if (!url || !qrCodePayload) {
    throw new Error('Convite retornou sem URL.')
  }

  return { message, qrCodePayload, url }
}

function inviteBaseUrl() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  return 'https://comidinhas-web-production.up.railway.app'
}

export function buildGrupoInviteFromCodigo(group: Pick<Grupo, 'codigo' | 'nome'>): GrupoInvite | null {
  const codigo = group.codigo?.trim()
  if (!codigo || !/^\d{6}$/.test(codigo)) return null

  const url = new URL('/entrar', inviteBaseUrl())
  url.searchParams.set('codigo', codigo)
  const inviteUrl = url.toString()
  const groupName = group.nome.trim() || 'Comidinhas'

  return {
    message: `Bora entrar no meu grupo ${groupName} no Comidinhas?\n\nAcesse: ${inviteUrl}\nCodigo do grupo: ${codigo}`,
    qrCodePayload: inviteUrl,
    url: inviteUrl,
  }
}

function chooseDefaultGrupo(perfil: Perfil, grupos: Grupo[]) {
  return (
    grupos.find((grupo) => grupo.id === perfil.grupo_individual_id) ??
    grupos.find((grupo) => grupo.tipo === 'individual') ??
    grupos[0] ??
    null
  )
}

export async function fetchProfileByEmail(email: string): Promise<Perfil | null> {
  try {
    return await apiClient.get<Perfil>(
      `/api/v1/perfis/por-email?email=${encodeURIComponent(email)}`,
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

export function fetchProfile(perfilId: string) {
  return apiClient.get<Perfil>(`/api/v1/perfis/${perfilId}`)
}

export function createProfile(payload: SignupRequest) {
  return apiClient.post<Perfil, SignupRequest>('/api/v1/perfis/', payload)
}

export function updateProfile(perfilId: string, payload: ProfileUpdateRequest) {
  return apiClient.patch<Perfil, ProfileUpdateRequest>(
    `/api/v1/perfis/${perfilId}`,
    payload,
  )
}

export async function fetchPerfilContextos(perfilId: string) {
  const response = await apiClient.get<GrupoListResponse>(
    `/api/v1/perfis/${perfilId}/contextos`,
  )
  return normalizeGrupoList(response)
}

export async function listGrupos(perfilId?: string) {
  const query = perfilId ? `?perfil_id=${encodeURIComponent(perfilId)}` : ''
  const response = await apiClient.get<GrupoListResponse>(`/api/v1/grupos/${query}`)
  return normalizeGrupoList(response)
}

export function fetchGrupo(grupoId: string) {
  return apiClient.get<Grupo>(`/api/v1/grupos/${grupoId}`)
}

export function fetchGrupoByCodigo(codigo: string) {
  return apiClient.get<Grupo>(`/api/v1/grupos/codigo/${encodeURIComponent(codigo)}`)
}

export async function fetchGrupoInvite(grupoId: string, responsavelPerfilId: string) {
  const query = new URLSearchParams({ responsavel_perfil_id: responsavelPerfilId })
  const response = await apiClient.get<GrupoInviteRaw>(
    `/api/v1/grupos/${grupoId}/convite?${query}`,
  )
  return normalizeGrupoInvite(response)
}

export function createGrupo(payload: GrupoCreatePayload) {
  return apiClient.post<Grupo, GrupoCreatePayload>('/api/v1/grupos/', payload)
}

export function updateGrupo(grupoId: string, payload: GrupoUpdatePayload) {
  return apiClient.patch<Grupo, GrupoUpdatePayload>(
    `/api/v1/grupos/${grupoId}`,
    payload,
  )
}

export function solicitarEntradaGrupo(codigo: string, payload: SolicitarEntradaGrupoPayload) {
  return apiClient.post<SolicitacaoEntradaGrupo, SolicitarEntradaGrupoPayload>(
    `/api/v1/grupos/codigo/${encodeURIComponent(codigo)}/solicitacoes`,
    payload,
  )
}

export async function listSolicitacoesGrupo(
  grupoId: string,
  responsavelPerfilId: string,
  status: 'pendente' | 'aceita' | 'recusada' | string = 'pendente',
) {
  const query = new URLSearchParams({
    responsavel_perfil_id: responsavelPerfilId,
    status,
  })
  const response = await apiClient.get<SolicitacaoEntradaGrupoListResponse>(
    `/api/v1/grupos/${grupoId}/solicitacoes?${query}`,
  )

  return {
    items: response.items ?? [],
    total: response.total ?? response.items?.length ?? 0,
  }
}

export function aceitarSolicitacaoGrupo(
  grupoId: string,
  solicitacaoId: string,
  responsavelPerfilId: string,
) {
  return apiClient.post<Grupo, { responsavel_perfil_id: string }>(
    `/api/v1/grupos/${grupoId}/solicitacoes/${solicitacaoId}/aceitar`,
    { responsavel_perfil_id: responsavelPerfilId },
  )
}

export async function loadPerfilContext(perfil: Perfil) {
  let grupos = await fetchPerfilContextos(perfil.id).catch(() => [] as Grupo[])

  if (grupos.length === 0) {
    grupos = await listGrupos(perfil.id).catch(() => [] as Grupo[])
  }

  if (grupos.length === 0 && perfil.grupo_individual_id) {
    const grupoIndividual = await fetchGrupo(perfil.grupo_individual_id).catch(() => null)
    if (grupoIndividual) grupos = [grupoIndividual]
  }

  const grupo = chooseDefaultGrupo(perfil, grupos)
  if (!grupo) {
    throw new ApiError('Este usuario ainda nao tem um espaco pessoal ou grupo disponivel.', 404, null)
  }

  return { perfil, grupo, grupos }
}

export async function signup(payload: SignupRequest) {
  const perfil = await createProfile(payload)
  return loadPerfilContext(perfil)
}

export async function signin({ email }: SigninRequest) {
  const perfil = await fetchProfileByEmail(email)
  if (!perfil) {
    throw new ApiError('Nao encontramos uma conta com esse e-mail.', 404, null)
  }

  return loadPerfilContext(perfil)
}
