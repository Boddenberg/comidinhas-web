export type AuthSession = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
}

export type AuthUser = {
  id: string
  email: string
}

export type AuthProfile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  city?: string | null
  bio?: string | null
  favorite_cuisine?: string | null
}

export type AuthBundle = {
  user: AuthUser
  profile: AuthProfile
  session: AuthSession
  email_confirmation_required?: boolean
}

export type SignupRequest = {
  email: string
  password: string
  username: string
  full_name?: string
}

export type SigninRequest = {
  email: string
  password: string
}

export type RefreshRequest = {
  refresh_token: string
}

export type RefreshResponse = {
  session: AuthSession
}

export type ProfileUpdateRequest = Partial<{
  full_name: string
  username: string
  city: string
  bio: string
  favorite_cuisine: string
  avatar_url: string
}>

export type GroupMember = {
  profile_id: string
  role: 'owner' | 'member'
  full_name: string | null
  avatar_url: string | null
}

export type GroupContext = {
  user_id: string
  profile_id: string
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  active_group: {
    id: string
    name: string
    type: string
    members: GroupMember[]
  } | null
  active_role: string | null
  groups: Array<{
    id: string
    name: string
    type: string
    role: string
  }>
}
