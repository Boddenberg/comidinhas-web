export type Perfil = {
  id: string
  nome: string
  email: string | null
  bio: string | null
  cidade: string | null
  foto_url: string | null
  grupo_individual_id?: string | null
  criado_em?: string | null
  atualizado_em?: string | null
}

export type Membro = {
  perfil_id?: string
  nome: string
  email: string | null
  papel?: 'dono' | 'membro' | string
}

export type Grupo = {
  id: string
  nome: string
  tipo: 'individual' | 'casal' | 'grupo' | string
  descricao: string | null
  codigo?: string | null
  foto_url?: string | null
  dono_perfil_id?: string | null
  membros: Membro[]
  criado_em?: string | null
  atualizado_em?: string | null
}

export type SignupRequest = {
  nome: string
  email: string
  bio?: string
  cidade?: string
}

export type SigninRequest = {
  email: string
}

export type ProfileUpdateRequest = Partial<{
  nome: string
  email: string
  bio: string
  cidade: string
}>
