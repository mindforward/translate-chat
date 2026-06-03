import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service client for admin operations (server-side only)
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
  return createClient(supabaseUrl, serviceKey)
}

export type Room = {
  id: number
  name: string
  password_hash: string
  created_at: string
}

export type Session = {
  id: string
  room_id: number
  nickname: string
  language: string
  session_token: string
  created_at: string
}

export type Message = {
  id: number
  room_id: number
  session_id: string
  nickname: string
  original_text: string
  original_lang: string
  translated_text: string | null
  translated_lang: string | null
  created_at: string
}

export type InviteLink = {
  id: string
  room_id: number
  token: string
  expires_at: string
  used: boolean
  created_at: string
}
