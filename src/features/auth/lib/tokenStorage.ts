type StoredSession = {
  perfil_id: string
  grupo_id: string
}

const STORAGE_KEY = 'comidinhas:session'

export function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (
      typeof parsed?.perfil_id !== 'string' ||
      typeof parsed?.grupo_id !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}
