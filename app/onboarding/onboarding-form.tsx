'use client'

import Link from 'next/link'
import { ArrowUpLeft, Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './actions'

export default function OnboardingForm({ email }: { email: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await completeOnboarding({ username, displayName })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('حدث خطأ غير متوقع. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="main-content" dir="rtl" className="min-h-screen overflow-hidden bg-[var(--cream)] text-[var(--ink)]">
      <header className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-7">
        <Link href="/" className="wordmark text-[1.45rem] font-extrabold tracking-[-.06em]">لينكا<span>·</span></Link>
        <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-xs font-bold text-[var(--muted)]">إعداد صفحتك</span>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-[1200px] grid-cols-1 items-center gap-16 px-7 pb-16 pt-8 lg:grid-cols-[1fr_.85fr]">
        <div className="order-2 lg:order-1">
          <p className="eyebrow"><Sparkles size={15} aria-hidden="true" /> خطوة أخيرة قبل البداية</p>
          <h1 className="mt-4 max-w-xl text-5xl font-extrabold leading-[1.05] tracking-[-.07em] sm:text-6xl">خلّ صفحتك<br /><span className="text-[#729232]">تشبهك.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-[var(--muted)]">اختر اسماً ورابطاً مميزاً، وبعدها ستدخل مباشرة إلى مساحة لينكا الخاصة بك لتضيف روابطك وأعمالك ومحتواك.</p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-[#566050]">
            {['رابطك الخاص', 'تصميم عربي أصيل', 'تعديل كامل لاحقاً'].map((item) => <span key={item} className="flex items-center gap-2"><Check size={15} className="text-[#74962f]" />{item}</span>)}
          </div>
        </div>

        <div className="relative order-1 flex items-center justify-center lg:order-2">
          <div className="absolute h-[360px] w-[360px] rounded-full border border-[#dfe7ce] sm:h-[450px] sm:w-[450px]" />
          <div className="absolute h-[430px] w-[430px] rounded-full border border-dashed border-[#dfe7ce] sm:h-[520px] sm:w-[520px]" />
          <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-[390px] rounded-[24px] border border-[#e2e6d6] bg-[var(--paper)] p-7 shadow-[0_24px_55px_#53633c25] sm:p-9">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[#78963a]">LINCA · 01</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-[-.05em]">أنشئ مساحتك</h2>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#d8ed92] font-extrabold">ل</span>
            </div>
            <p className="mb-6 text-xs leading-6 text-[var(--muted)]" dir="ltr">{email}</p>

            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-extrabold">اسم المستخدم</span>
              <div className="flex items-center rounded-xl border border-[var(--line)] bg-[#fafbf7] px-3 focus-within:border-[#91b83c] focus-within:ring-2 focus-within:ring-[#d8ed92]">
                <span className="text-sm font-bold text-[#91b83c]">@</span>
                <input required minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]+" value={username} onChange={(e) => setUsername(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent px-2 py-3 text-sm font-bold outline-none" placeholder="yourname" dir="ltr" />
              </div>
              <span className="mt-2 block text-[10px] text-[var(--muted)]">استخدم الأحرف الإنجليزية والأرقام و _ أو -</span>
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-extrabold">الاسم الظاهر</span>
              <input required maxLength={120} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-[var(--line)] bg-[#fafbf7] px-3 py-3 text-sm font-bold outline-none focus:border-[#91b83c] focus:ring-2 focus:ring-[#d8ed92]" placeholder="مثلاً: محمد الدكرلي" />
            </label>

            {error && <p className="mb-4 rounded-xl border border-[#efc9c4] bg-[#fff7f5] px-3 py-3 text-xs font-bold leading-5 text-[#9b2c20]" role="alert">{error}</p>}
            <button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#3b4738] disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'جارٍ إنشاء صفحتك…' : 'ابدأ مع لينكا'} <ArrowUpLeft size={17} aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
