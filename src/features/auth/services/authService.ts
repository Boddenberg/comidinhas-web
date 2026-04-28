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

export type GrupoCreatePayload = {
  nome: string
  tipo?: 'casal' | 'grupo' | 'individual'
  descricao?: string
  membros?: Array<{ perfil_id?: string; email?: string }>
}

function normalizeGrupoList(response: GrupoListResponse): Grupo[] {
  if (Array.isArray(response)) return response
  return response.items ?? []
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

export function createGrupo(payload: GrupoCreatePayload) {
  return apiClient.post<Grupo, GrupoCreatePayload>('/api/v1/grupos/', payload)
}

export function updateGrupo(grupoId: string, payload: Partial<GrupoCreatePayload>) {
  return apiClient.patch<Grupo, Partial<GrupoCreatePayload>>(
    `/api/v1/grupos/${grupoId}`,
    payload,
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
    throw new ApiError('Este perfil ainda nao tem um contexto disponivel.', 404, null)
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
