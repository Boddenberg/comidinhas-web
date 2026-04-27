import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearSession, readSession, writeSession } from './lib/tokenStorage'
import {
  fetchGrupo,
  fetchProfile,
  signin as signinRequest,
  signup as signupRequest,
  updateProfile as updateProfileRequest,
} from './services/authService'
import type {
  Grupo,
  Perfil,
  ProfileUpdateRequest,
  SigninRequest,
  SignupRequest,
} from './types'

type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  status: AuthStatus
  perfil: Perfil | null
  grupo: Grupo | null
  signIn: (payload: SigninRequest) => Promise<void>
  signUp: (payload: SignupRequest) => Promise<void>
  signOut: () => void
  updatePerfil: (payload: ProfileUpdateRequest) => Promise<Perfil>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type ProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: ProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [grupo, setGrupo] = useState<Grupo | null>(null)

  const persist = useCallback((nextPerfil: Perfil | null, nextGrupo: Grupo | null) => {
    if (nextPerfil && nextGrupo) {
      writeSession({ perfil_id: nextPerfil.id, grupo_id: nextGrupo.id })
    } else {
      clearSession()
    }
    setPerfil(nextPerfil)
    setGrupo(nextGrupo)
  }, [])

  useEffect(() => {
    let cancelled = false
    const stored = readSession()
    if (!stored) {
      setStatus('unauthenticated')
      return
    }

    Promise.all([fetchProfile(stored.perfil_id), fetchGrupo(stored.grupo_id)])
      .then(([loadedPerfil, loadedGrupo]) => {
        if (cancelled) return
        setPerfil(loadedPerfil)
        setGrupo(loadedGrupo)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        clearSession()
        setStatus('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(
    async (payload: SigninRequest) => {
      const { perfil: p, grupo: g } = await signinRequest(payload)
      persist(p, g)
      setStatus('authenticated')
    },
    [persist],
  )

  const signUp = useCallback(
    async (payload: SignupRequest) => {
      const { perfil: p, grupo: g } = await signupRequest(payload)
      persist(p, g)
      setStatus('authenticated')
    },
    [persist],
  )

  const signOut = useCallback(() => {
    persist(null, null)
    setStatus('unauthenticated')
  }, [persist])

  const updatePerfil = useCallback(
    async (payload: ProfileUpdateRequest) => {
      if (!perfil) {
        throw new Error('Sem perfil ativo.')
      }
      const updated = await updateProfileRequest(perfil.id, payload)
      setPerfil(updated)
      return updated
    },
    [perfil],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      perfil,
      grupo,
      signIn,
      signUp,
      signOut,
      updatePerfil,
    }),
    [grupo, perfil, signIn, signOut, signUp, status, updatePerfil],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return value
}
