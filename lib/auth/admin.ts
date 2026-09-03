import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export class AdminAccessError extends Error {
  constructor(message: string, readonly status: 401 | 403 | 503) {
    super(message)
  }
}

export async function requireAdmin(): Promise<User> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) throw new AdminAccessError('Authentication required', 401)

  try {
    const admin = (await createAdminClient()) as unknown as SupabaseClient
    const { data: role, error: roleError } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) throw roleError
    if (!role) throw new AdminAccessError('Administrator access required', 403)
  } catch (error) {
    if (error instanceof AdminAccessError) throw error
    console.error('Admin authorization check failed:', error)
    throw new AdminAccessError('Administrator authorization is unavailable', 503)
  }

  return user
}
