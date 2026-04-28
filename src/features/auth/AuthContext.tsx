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
  fetchPerfilContextos,
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
  grupos: Grupo[]
  selectGrupo: (grupoId: string) => Promise<void>
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
  const [grupos, setGrupos] = useState<Grupo[]>([])

  const persist = useCallback(
    (nextPerfil: Perfil | null, nextGrupo: Grupo | null, nextGrupos: Grupo[] = []) => {
      if (nextPerfil && nextGrupo) {
        writeSession({ perfil_id: nextPerfil.id, grupo_id: nextGrupo.id })
      } else {
        clearSession()
      }
      setPerfil(nextPerfil)
      setGrupo(nextGrupo)
      setGrupos(nextPerfil && nextGrupo ? nextGrupos : [])
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    const stored = readSession()
    if (!stored) {
      setStatus('unauthenticated')
      return
    }

    fetchProfile(stored.perfil_id)
      .then(async (loadedPerfil) => {
        const loadedGrupos = await fetchPerfilContextos(loadedPerfil.id).catch(
          () => [] as Grupo[],
        )
        const grupoFromContextos = loadedGrupos.find((item) => item.id === stored.grupo_id)
        const loadedGrupo =
          grupoFromContextos ?? (await fetchGrupo(stored.grupo_id).catch(() => null))

        if (!loadedGrupo) {
          throw new Error('Grupo salvo nao encontrado.')
        }

        if (cancelled) return
        const nextGrupos = loadedGrupos.some((item) => item.id === loadedGrupo.id)
          ? loadedGrupos
          : [loadedGrupo, ...loadedGrupos]
        persist(loadedPerfil, loadedGrupo, nextGrupos)
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
  }, [persist])

  const signIn = useCallback(
    async (payload: SigninRequest) => {
      const { perfil: p, grupo: g, grupos: gs } = await signinRequest(payload)
      persist(p, g, gs)
      setStatus('authenticated')
    },
    [persist],
  )

  const signUp = useCallback(
    async (payload: SignupRequest) => {
      const { perfil: p, grupo: g, grupos: gs } = await signupRequest(payload)
      persist(p, g, gs)
      setStatus('authenticated')
    },
    [persist],
  )

  const signOut = useCallback(() => {
    persist(null, null)
    setStatus('unauthenticated')
  }, [persist])

  const selectGrupo = useCallback(
    async (grupoId: string) => {
      if (!perfil) {
        throw new Error('Sem perfil ativo.')
      }

      const nextGrupo = grupos.find((item) => item.id === grupoId) ?? (await fetchGrupo(grupoId))
      const nextGrupos = grupos.some((item) => item.id === nextGrupo.id)
        ? grupos
        : [nextGrupo, ...grupos]
      persist(perfil, nextGrupo, nextGrupos)
    },
    [grupos, perfil, persist],
  )

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
      grupos,
      selectGrupo,
      signIn,
      signUp,
      signOut,
      updatePerfil,
    }),
    [grupo, grupos, perfil, selectGrupo, signIn, signOut, signUp, status, updatePerfil],
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
