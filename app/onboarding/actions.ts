'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const onboardingSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9_]+$/),
  displayName: z.string().trim().min(1).max(80),
})

export async function completeOnboarding(input: { username: string; displayName: string }) {
  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid username or display name.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Your session has expired. Please sign in again.' }

  const { error } = await supabase
    .from('profiles')
    .update({ username: parsed.data.username, display_name: parsed.data.displayName })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') return { ok: false as const, error: 'That username is already taken.' }
    return { ok: false as const, error: 'Could not save your profile. Please try again.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/onboarding')
  return { ok: true as const }
}
