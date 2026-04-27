import { apiClient } from '@/shared/api/apiClient'
import type {
  AuthBundle,
  AuthSession,
  GroupContext,
  ProfileUpdateRequest,
  RefreshRequest,
  RefreshResponse,
  SigninRequest,
  SignupRequest,
} from '../types'

export function signup(payload: SignupRequest) {
  return apiClient.post<AuthBundle, SignupRequest>('/api/v1/profiles/signup', payload, {
    skipAuth: true,
  })
}

export function signin(payload: SigninRequest) {
  return apiClient.post<AuthBundle, SigninRequest>('/api/v1/profiles/signin', payload, {
    skipAuth: true,
  })
}

export function refreshSession(refreshToken: string) {
  return apiClient.post<RefreshResponse | AuthBundle, RefreshRequest>(
    '/api/v1/profiles/refresh',
    { refresh_token: refreshToken },
    { skipAuth: true, skipRefresh: true },
  )
}

export function getMe() {
  return apiClient.get<AuthBundle['profile']>('/api/v1/profiles/me')
}

export function updateMe(payload: ProfileUpdateRequest) {
  return apiClient.patch<AuthBundle['profile'], ProfileUpdateRequest>(
    '/api/v1/profiles/me',
    payload,
  )
}

export function getGroupContext() {
  return apiClient.get<GroupContext>('/api/v1/groups/me/context')
}

export function extractSession(response: RefreshResponse | AuthBundle): AuthSession {
  if ('session' in response && response.session) {
    return response.session
  }
  throw new Error('Invalid refresh response: missing session.')
}
