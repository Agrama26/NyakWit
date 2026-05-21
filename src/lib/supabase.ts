import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipe data
export type UserRole = 'user' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface ScanHistory {
  id: string
  user_id: string
  disease_key: string
  confidence: number
  all_probabilities: Record<string, number>
  image_url: string | null
  scanned_at: string
}