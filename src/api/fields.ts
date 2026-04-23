import { supabase } from './supabase'

export interface FieldCreate {
  field_name: string
  crop_type: string
  boundary_coordinates: Array<{ lat: number; lng: number }> // Supabase stores JSONB
  area_acres: number
}

export interface Field {
  field_id: number
  field_name: string
  crop_type: string
  area_acres: number
  boundary_coordinates: Array<{ lat: number; lng: number }>
  is_verified: boolean
  verification_date?: string
  station_id: number | null
  created_at: string
}

export const fieldsApi = {
  list: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('farmer_id', session.user.id) // Only show the logged-in user's fields
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Field[]
  },

  listVerified: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    // We use !inner join to filter the fields themselves by the station's status
    const { data, error } = await supabase
      .from('fields')
      .select('*, base_stations!inner(status)')
      .eq('farmer_id', session.user.id) // Only show the logged-in user's fields
      .eq('is_verified', true)
      .eq('base_stations.status', 'Active')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Field[]
  },

  get: async (id: number) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('field_id', id)
      .eq('farmer_id', session.user.id) // Security: verify ownership
      .single()
    if (error) throw error
    return data as Field
  },

  create: async (payload: FieldCreate) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('fields')
      .insert({ ...payload, farmer_id: session.user.id })
      .select()
      .single()
    if (error) throw error
    return data as Field
  },

  delete: async (id: number) => {
    const { error } = await supabase
      .from('fields')
      .delete()
      .eq('field_id', id)
    if (error) throw error
  },
}

