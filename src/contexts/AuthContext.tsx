import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, UserProfile } from '@/api/auth'
import { supabase } from '@/api/supabase'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  login: (email: string, password: string, requiredRole: 'Farmer' | 'Operator' | 'Admin') => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const profile = await authApi.me()
      setUser(profile)
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error)
      console.log('Error details:', JSON.stringify(error, null, 2))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const login = async (email: string, password: string, requiredRole: 'Farmer' | 'Operator' | 'Admin') => {
    await authApi.login({ email, password })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Failed to retrieve session')

    // Fetch profile early to validate role before updating state
    const profile = await authApi.me()
    if (!profile || profile.role !== requiredRole) {
      await authApi.logout()
      throw new Error(`Invalid account type for this portal. Please use the correct login page.`)
    }

    setUser(profile)
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
