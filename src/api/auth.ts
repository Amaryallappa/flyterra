import { supabase } from './supabase'

export interface LoginPayload  { email: string; password: string }
export interface RegisterPayload {
  email: string
  password: string
  username: string
  full_name: string
  mobile_number: string
  role: 'Farmer' | 'Operator'
}
export interface UserProfile {
  account_id: string
  username: string
  role: 'Farmer' | 'Operator' | 'Admin'
  is_active: boolean
  full_name?: string
  mobile_number?: string
  assigned_base_station_id?: number | null
}

export const authApi = {
  login: async ({ email, password }: LoginPayload) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  registerFarmer: async (payload: RegisterPayload) => {
    // We should call the Netlify function for registration as it handles the database inserts with service_role
    // But if we want to stick to direct Supabase for now (as in RegisterPage.tsx):
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    })
    if (error) throw error
    if (!data.user) throw new Error('Sign-up failed')

    const userId = data.user.id
    await supabase.from('accounts').insert({
      account_id: userId,
      username:   payload.username,
      role:       'Farmer',
    })

    await supabase.from('farmers').insert({
      farmer_id:     userId,
      full_name:     payload.full_name,
      mobile_number: payload.mobile_number,
      email:         payload.email,
    })

    return { message: 'Farmer registered successfully', user_id: userId }
  },

  me: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const { data, error } = await supabase
      .from('accounts')
      .select('account_id, username, role, is_active')
      .eq('account_id', session.user.id)
      .single()
    if (error) throw error
    const profile = data as UserProfile

    if (profile.role === 'Operator') {
      const { data: op } = await supabase
        .from('operators')
        .select('assigned_base_station_id')
        .eq('operator_id', session.user.id)
        .single()
      if (op) profile.assigned_base_station_id = op.assigned_base_station_id
    }

    return profile
  },

  logout: async () => {
    await supabase.auth.signOut()
  },
}

