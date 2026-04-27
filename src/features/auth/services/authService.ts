import { ApiError, apiClient } from '@/shared/api/apiClient'
import type {
  Grupo,
  Perfil,
  ProfileUpdateRequest,
  SigninRequest,
  SignupRequest,
} from '../types'

type GrupoListResponse = {
  items: Grupo[]
  total: number
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

export function listGrupos() {
  return apiClient.get<GrupoListResponse>('/api/v1/grupos/')
}

export function fetchGrupo(grupoId: string) {
  return apiClient.get<Grupo>(`/api/v1/grupos/${grupoId}`)
}

type GrupoCreatePayload = {
  nome: string
  tipo?: 'casal' | 'grupo'
  descricao?: string
  membros?: Array<{ nome: string; email: string | null }>
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

/** Find an existing grupo whose membros contains this email. */
export async function findGrupoByMemberEmail(email: string) {
  const list = await listGrupos()
  const target = email.trim().toLowerCase()
  return (
    list.items.find((grupo) =>
      grupo.membros.some((membro) => (membro.email ?? '').toLowerCase() === target),
    ) ?? null
  )
}

/** Sign up = create perfil + create grupo (or join existing if email already in some grupo). */
export async function signup(payload: SignupRequest) {
  const perfil = await createProfile(payload)
  const existingGrupo = await findGrupoByMemberEmail(perfil.email ?? '').catch(() => null)
  let grupo: Grupo
  if (existingGrupo) {
    grupo = existingGrupo
  } else {
    grupo = await createGrupo({
      nome: `Casal de ${perfil.nome.split(' ')[0] ?? perfil.nome}`,
      tipo: 'casal',
      descricao: 'Nossos lugares favoritos',
      membros: [{ nome: perfil.nome, email: perfil.email }],
    })
  }
  return { perfil, grupo }
}

/** Sign in = find perfil by email; if there's no grupo for them, create one. */
export async function signin({ email }: SigninRequest) {
  const perfil = await fetchProfileByEmail(email)
  if (!perfil) {
    throw new ApiError(
      'Não encontramos uma conta com esse e-mail.',
      404,
      null,
    )
  }
  const existingGrupo = await findGrupoByMemberEmail(perfil.email ?? email).catch(() => null)
  let grupo: Grupo
  if (existingGrupo) {
    grupo = existingGrupo
  } else {
    grupo = await createGrupo({
      nome: `Casal de ${perfil.nome.split(' ')[0] ?? perfil.nome}`,
      tipo: 'casal',
      descricao: 'Nossos lugares favoritos',
      membros: [{ nome: perfil.nome, email: perfil.email }],
    })
  }
  return { perfil, grupo }
}
