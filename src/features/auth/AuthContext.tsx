import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { configureApiClient } from '@/shared/api/apiClient'
import {
  clearSession,
  isSessionExpiringSoon,
  readSession,
  writeSession,
} from './lib/tokenStorage'
import {
  extractSession,
  getMe,
  refreshSession as refreshSessionRequest,
  signin as signinRequest,
  signup as signupRequest,
  updateMe as updateMeRequest,
} from './services/authService'
import type {
  AuthProfile,
  AuthSession,
  ProfileUpdateRequest,
  SigninRequest,
  SignupRequest,
} from './types'

type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  status: AuthStatus
  profile: AuthProfile | null
  session: AuthSession | null
  signIn: (payload: SigninRequest) => Promise<void>
  signUp: (payload: SignupRequest) => Promise<void>
  signOut: () => void
  updateProfile: (payload: ProfileUpdateRequest) => Promise<AuthProfile>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type ProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: ProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [session, setSession] = useState<AuthSession | null>(() => readSession())
  const sessionRef = useRef<AuthSession | null>(session)
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const persistSession = useCallback((next: AuthSession | null) => {
    if (next) {
      writeSession(next)
    } else {
      clearSession()
    }
    sessionRef.current = next
    setSession(next)
  }, [])

  const refreshTokenIfNeeded = useCallback(async (): Promise<string | null> => {
    const current = sessionRef.current
    if (!current) return null

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const promise = (async () => {
      try {
        const response = await refreshSessionRequest(current.refresh_token)
        const nextSession = extractSession(response)
        persistSession(nextSession)
        return nextSession.access_token
      } catch (error) {
        console.error('Auth refresh failed', error)
        persistSession(null)
        setProfile(null)
        setStatus('unauthenticated')
        return null
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    refreshPromiseRef.current = promise
    return promise
  }, [persistSession])

  useEffect(() => {
    configureApiClient({
      getAuthToken: () => sessionRef.current?.access_token ?? null,
      onUnauthorized: refreshTokenIfNeeded,
    })
  }, [refreshTokenIfNeeded])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const stored = sessionRef.current
      if (!stored) {
        setStatus('unauthenticated')
        return
      }

      if (isSessionExpiringSoon(stored)) {
        const newToken = await refreshTokenIfNeeded()
        if (!newToken || cancelled) return
      }

      try {
        const me = await getMe()
        if (cancelled) return
        setProfile(me)
        setStatus('authenticated')
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load profile', error)
        persistSession(null)
        setProfile(null)
        setStatus('unauthenticated')
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [persistSession, refreshTokenIfNeeded])

  const signIn = useCallback(
    async (payload: SigninRequest) => {
      const bundle = await signinRequest(payload)
      persistSession(bundle.session)
      setProfile(bundle.profile)
      setStatus('authenticated')
    },
    [persistSession],
  )

  const signUp = useCallback(
    async (payload: SignupRequest) => {
      const bundle = await signupRequest(payload)
      persistSession(bundle.session)
      setProfile(bundle.profile)
      setStatus('authenticated')
    },
    [persistSession],
  )

  const signOut = useCallback(() => {
    persistSession(null)
    setProfile(null)
    setStatus('unauthenticated')
  }, [persistSession])

  const updateProfile = useCallback(async (payload: ProfileUpdateRequest) => {
    const next = await updateMeRequest(payload)
    setProfile(next)
    return next
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      session,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [profile, session, signIn, signOut, signUp, status, updateProfile],
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
