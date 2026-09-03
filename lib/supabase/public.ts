import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getRequiredEnv } from '@/lib/config'

let client: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createPublicClient() {
  if (client) return client
  client = createSupabaseClient<Database>(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
  return client
}
