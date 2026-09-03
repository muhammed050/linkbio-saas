import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) throw error
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function getCurrentSession() {
  try {
    const supabase = await createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) throw error
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting current profile:', error)
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) {
    throw new Error('Profile not found')
  }
  return profile
}
