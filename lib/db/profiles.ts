import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching profile by username:', error)
    return null
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'username' | 'full_name' | 'avatar_url'>>
): Promise<Profile | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        username: updates.username?.toLowerCase(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating profile:', error)
    return null
  }
}

export async function updatePlan(
  userId: string,
  planType: Profile['plan_type'],
  whopPlanId?: string
): Promise<Profile | null> {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({
        plan_type: planType,
        whop_plan_id: whopPlanId || null,
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating plan:', error)
    return null
  }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()

    if (error) throw error
    return data === null
  } catch (error) {
    console.error('Error checking username:', error)
    return false
  }
}
