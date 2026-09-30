import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import type { User } from './types'

const STORAGE_KEY = 'noteefy.user_id'

type AuthContextValue = {
  user: User | null
  ready: boolean
  signup: (name: string, email: string, password: string) => Promise<User>
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  // Only the id is kept locally; the profile is always re-read from the database.
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY)
    if (!storedId) {
      setReady(true)
      return
    }

    let cancelled = false
    api
      .user(storedId)
      .then((found) => {
        if (!cancelled) setUser(found)
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const remember = useCallback((found: User) => {
    localStorage.setItem(STORAGE_KEY, found.id)
    setUser(found)
    return found
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      signup: async (name, email, password) =>
        remember(await api.signup(name, email, password)),
      login: async (email, password) => remember(await api.login(email, password)),
      logout: () => {
        localStorage.removeItem(STORAGE_KEY)
        setUser(null)
      },
    }),
    [user, ready, remember],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
