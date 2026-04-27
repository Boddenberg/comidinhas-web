export type Perfil = {
  id: string
  nome: string
  email: string | null
  bio: string | null
  cidade: string | null
  foto_url: string | null
  criado_em?: string | null
  atualizado_em?: string | null
}

export type Membro = {
  nome: string
  email: string | null
}

export type Grupo = {
  id: string
  nome: string
  tipo: 'casal' | 'grupo' | string
  descricao: string | null
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
