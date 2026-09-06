import { withAuth } from "@/lib/auth/protected"
import { getPage } from "@/lib/db/pages"
import { getSections } from "@/lib/db/sections"
import { StudioClient } from "./studio-client"

export default async function StudioPage() {
  return withAuth(async (_user, profile) => {
    const page = await getPage(profile.id)
    if (!page) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-center" dir="rtl">
          <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-bold text-zinc-950">لا توجد صفحة بعد</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">أنشئ صفحتك أولاً ثم افتح الاستوديو لتعديلها.</p>
            <a href="/dashboard" className="mt-6 inline-flex rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white">العودة إلى لوحة التحكم</a>
          </div>
        </div>
      )
    }

    const sections = await getSections(page.id)
    const theme = page.theme && typeof page.theme === "object" && !Array.isArray(page.theme) ? page.theme as Record<string, unknown> : {}
    return <StudioClient page={{ ...page, theme }} sections={sections} username={profile.username} />
  })
}
