import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { transport: ws as unknown as typeof WebSocket },
})
