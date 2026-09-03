'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const onboardingSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9_-]+$/),
  displayName: z.string().trim().min(1).max(120),
})

export async function completeOnboarding(input: { username: string; displayName: string }) {
  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'اسم المستخدم أو الاسم المعروض غير صالح.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى.' }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      username: parsed.data.username,
      full_name: parsed.data.displayName,
    }, { onConflict: 'id' })
    .select('id')
    .single()

  if (error) {
    console.error('completeOnboarding profile upsert failed:', error)
    if (error.code === '23505') return { ok: false as const, error: 'اسم المستخدم مستخدم بالفعل. اختر اسماً آخر.' }
    return { ok: false as const, error: 'تعذر حفظ ملفك الشخصي. حاول مرة أخرى.' }
  }

  if (!data) return { ok: false as const, error: 'تعذر إنشاء ملفك الشخصي.' }

  const { data: page, error: pageReadError } = await supabase
    .from('pages')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (pageReadError) {
    console.error('completeOnboarding page lookup failed:', pageReadError)
    return { ok: false as const, error: 'تم حفظ الحساب لكن تعذر تجهيز صفحتك. حاول مرة أخرى.' }
  }

  if (!page) {
    const { error: pageError } = await supabase
      .from('pages')
      .insert({
        profile_id: user.id,
        title: parsed.data.displayName,
        bio: null,
        avatar_url: null,
        theme: { theme: 'sand', layout: 'minimal' },
        is_published: false,
      })

    if (pageError) {
      console.error('completeOnboarding page creation failed:', pageError)
      return { ok: false as const, error: 'تم حفظ الحساب لكن تعذر إنشاء صفحتك. حاول مرة أخرى.' }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/edit')
  revalidatePath('/onboarding')
  return { ok: true as const }
}
