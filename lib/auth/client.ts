'use client'

import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/config'

function callbackUrl(next: string) {
  const url = getSiteUrl()
  url.pathname = '/auth/callback'
  url.search = new URLSearchParams({ next }).toString()
  return url.toString()
}

export async function signUpWithPassword(email: string, password: string) {
  return createClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl('/dashboard') },
  })
}

export async function signInWithPassword(email: string, password: string) {
  return createClient().auth.signInWithPassword({ email, password })
}

export async function signInWithOAuth(provider: 'google' | 'github') {
  return createClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl('/dashboard') },
  })
}

export async function requestPasswordRecovery(email: string) {
  return createClient().auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/auth/reset-password'),
  })
}

export async function signOut() {
  return createClient().auth.signOut()
}
