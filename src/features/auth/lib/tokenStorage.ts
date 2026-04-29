type StoredSession = {
  perfil_id: string
  grupo_id: string
}

const STORAGE_KEY = 'comidinhas:session'
const LAST_GROUP_BY_PROFILE_KEY = 'comidinhas:last-grupo-by-perfil'

function readLastGroupMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LAST_GROUP_BY_PROFILE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([perfilId, grupoId]) => typeof perfilId === 'string' && typeof grupoId === 'string',
      ),
    ) as Record<string, string>
  } catch {
    return {}
  }
}

export function readLastGrupoId(perfilId: string): string | null {
  return readLastGroupMap()[perfilId] ?? null
}

function writeLastGrupoId(perfilId: string, grupoId: string) {
  const current = readLastGroupMap()
  localStorage.setItem(
    LAST_GROUP_BY_PROFILE_KEY,
    JSON.stringify({ ...current, [perfilId]: grupoId }),
  )
}

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
  writeLastGrupoId(session.perfil_id, session.grupo_id)
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}
