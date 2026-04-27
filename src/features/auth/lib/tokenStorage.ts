import type { AuthSession } from '../types'

const STORAGE_KEY = 'comidinhas:auth-session'

export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (
      typeof parsed?.access_token !== 'string' ||
      typeof parsed?.refresh_token !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

export function isSessionExpiringSoon(session: AuthSession, leewaySeconds = 60) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return session.expires_at <= nowSeconds + leewaySeconds
}
