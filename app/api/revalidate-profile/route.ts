import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const username = String(body?.username || '').trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(username)) return NextResponse.json({ ok:false }, { status:400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok:false }, { status:401 })
    const { data: profile } = await supabase.from('profiles').select('id,username').eq('id',user.id).maybeSingle()
    if (!profile || profile.username !== username) return NextResponse.json({ ok:false }, { status:403 })
    revalidatePath(`/${username}`)
    return NextResponse.json({ ok:true })
  } catch {
    return NextResponse.json({ ok:false }, { status:500 })
  }
}
