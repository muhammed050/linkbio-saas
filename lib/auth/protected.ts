import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from './session'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export async function withAuth<T>(
  handler: (user: User, profile: Profile) => Promise<T>
): Promise<T> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/onboarding')
  }

  return handler(user, profile)
}

export async function requireAuthForRoute() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireProfileForRoute() {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/onboarding')
  }
  return profile
}
