import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api, setToken, clearToken } from './api'
import type { User, Role } from './types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string, role: Role, department_id?: number) => Promise<{ error: string | null }>
  signOut: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('assetflow_token')
    if (!token) {
      setLoading(false)
      return
    }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => { clearToken(); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { token, user } = await api.login({ email, password })
      setToken(token)
      setUser(user)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Login failed' }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, role: Role, department_id?: number) => {
    try {
      const { token, user } = await api.signup({ email, password, name, role, department_id })
      setToken(token)
      setUser(user)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Signup failed' }
    }
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const hasRole = useCallback((...roles: Role[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
