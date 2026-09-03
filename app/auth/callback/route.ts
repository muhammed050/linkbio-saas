import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

function safeNext(value: string | null, origin: URL) {
  const fallback = new URL('/dashboard', origin)

  if (!value?.startsWith('/') || value.includes('\\')) return fallback

  let decoded = value
  try {
    for (let index = 0; index < value.length; index += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
  } catch {
    return fallback
  }

  if (decoded.includes('\\') || decoded.startsWith('//')) return fallback

  try {
    const destination = new URL(value, origin)
    return destination.origin === origin.origin ? destination : fallback
  } catch {
    return fallback
  }
}

export async function GET(request: Request) {
  let origin: URL
  try {
    origin = getSiteUrl()
    if (
      origin.origin === 'null' ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      origin.username ||
      origin.password
    ) {
      throw new Error('NEXT_PUBLIC_SITE_URL must be an origin')
    }
  } catch (error) {
    console.error('Auth callback configuration error:', error)
    return Response.json({ error: 'Authentication is unavailable' }, { status: 503 })
  }

  const requestUrl = new URL(request.url)
  const destination = safeNext(requestUrl.searchParams.get('next'), origin)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    destination.pathname = '/login'
    destination.search = 'error=invalid_callback'
    return NextResponse.redirect(destination)
  }

  let exchangeFailed = false
  try {
    const supabase = await createClient()
    const result = await supabase.auth.exchangeCodeForSession(code)
    if (result.error) {
      console.error('Auth callback exchange failed:', result.error)
      exchangeFailed = true
    }
  } catch (exchangeError) {
    console.error('Auth callback exchange failed:', exchangeError)
    exchangeFailed = true
  }

  if (exchangeFailed) {
    destination.pathname = '/login'
    destination.search = 'error=callback_failed'
  }

  return NextResponse.redirect(destination)
}
