"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, ChevronDown, ChevronLeft, ChevronRight, Eye, ExternalLink, Link2, Monitor, Palette, Plus, Smartphone, Tablet, Trash2, Type, Upload, X, Zap } from "lucide-react"
import { addStudioLink, addStudioSection, publishStudioPage, removeStudioLink, removeStudioSection, saveStudioLink, saveStudioPage, saveStudioSection } from "./actions"

type LinkItem = { id: string; title: string; url: string; is_visible: boolean; position: number }
type SectionItem = { id: string; type: "links" | "products" | "services" | "social" | "media" | "text"; title: string | null; is_visible: boolean; position: number; links?: LinkItem[] }
type PageData = { id: string; title: string; bio: string | null; avatar_url: string | null; is_published: boolean; theme: Record<string, unknown> }

const palettes = [
  { name: "Ink", bg: "#f5f5f4", card: "#ffffff", text: "#171717", accent: "#111111" },
  { name: "Cloud", bg: "#eef2ff", card: "#ffffff", text: "#1e1b4b", accent: "#4f46e5" },
  { name: "Mint", bg: "#ecfdf5", card: "#ffffff", text: "#064e3b", accent: "#059669" },
  { name: "Night", bg: "#111827", card: "#1f2937", text: "#f9fafb", accent: "#f9fafb" },
]

export function StudioClient({ page, sections, username }: { page: PageData; sections: SectionItem[]; username: string }) {
  const initialPalette = typeof page.theme?.palette === "string" ? page.theme.palette : "Ink"
  const [localPage, setLocalPage] = useState(page)
  const [localSections, setLocalSections] = useState(sections)
  const [selected, setSelected] = useState<string | null>(sections[0]?.id ?? null)
  const [panel, setPanel] = useState<"add" | "design" | "content">("content")
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("mobile")
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(true)

  const palette = useMemo(() => palettes.find((item) => item.name === (localPage.theme?.palette ?? initialPalette)) ?? palettes[0], [localPage.theme, initialPalette])
  const selectedSection = localSections.find((section) => section.id === selected) ?? null

  function markDirty() { setSaved(false) }
  function savePage(next: Partial<PageData>) {
    setLocalPage((current) => ({ ...current, ...next }))
    markDirty()
  }
  function persistPage() {
    startTransition(async () => {
      await saveStudioPage({ title: localPage.title, bio: localPage.bio ?? "", theme: localPage.theme })
      setSaved(true)
    })
  }
  function choosePalette(name: string) {
    const next = palettes.find((item) => item.name === name) ?? palettes[0]
    savePage({ theme: { ...localPage.theme, palette: next.name, background: next.bg, card: next.card, text: next.text, accent: next.accent } })
  }
  function addSection(type: "links" | "social" | "media" | "text") {
    startTransition(async () => {
      const section = await addStudioSection({ pageId: page.id, type, title: type === "links" ? "روابطي" : type === "text" ? "نبذة" : type === "social" ? "تواصل معي" : "محتوى" })
      setLocalSections((current) => [...current, { ...section, links: [] } as SectionItem])
      setSelected(section.id)
      setPanel("content")
    })
  }
  function addLink() {
    if (!selectedSection || selectedSection.type !== "links") return
    startTransition(async () => {
      const link = await addStudioLink({ sectionId: selectedSection.id, title: "رابط جديد", url: "https://example.com" })
      setLocalSections((current) => current.map((section) => section.id === selectedSection.id ? { ...section, links: [...(section.links ?? []), link] } : section))
    })
  }
  function deleteSection(id: string) {
    startTransition(async () => {
      await removeStudioSection(id)
      setLocalSections((current) => current.filter((section) => section.id !== id))
      setSelected((current) => current === id ? null : current)
    })
  }
  function deleteLink(sectionId: string, linkId: string) {
    startTransition(async () => {
      await removeStudioLink(linkId)
      setLocalSections((current) => current.map((section) => section.id === sectionId ? { ...section, links: (section.links ?? []).filter((link) => link.id !== linkId) } : section))
    })
  }
  function updateSectionTitle(sectionId: string, title: string) {
    setLocalSections((current) => current.map((section) => section.id === sectionId ? { ...section, title } : section))
    startTransition(async () => { await saveStudioSection({ sectionId, title }) })
  }
  function updateLink(sectionId: string, linkId: string, field: "title" | "url", value: string) {
    setLocalSections((current) => current.map((section) => section.id === sectionId ? { ...section, links: (section.links ?? []).map((link) => link.id === linkId ? { ...link, [field]: value } : link) } : section))
  }
  function commitLink(link: LinkItem) {
    startTransition(async () => { await saveStudioLink({ linkId: link.id, title: link.title, url: link.url, isVisible: link.is_visible }) })
  }
  function publish() {
    startTransition(async () => {
      const next = await publishStudioPage(!localPage.is_published)
      setLocalPage((current) => ({ ...current, is_published: next.is_published }))
    })
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f4f5] text-zinc-950">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="flex items-center gap-2 text-sm font-semibold"><ChevronRight size={18} /> لينكا</a>
          <div className="hidden h-6 w-px bg-zinc-200 sm:block" />
          <div className="hidden sm:block"><input value={localPage.title} onChange={(e) => savePage({ title: e.target.value })} onBlur={persistPage} className="w-48 bg-transparent text-sm font-semibold outline-none" /></div>
          <span className="hidden items-center gap-1.5 text-xs text-zinc-500 md:flex">{saved ? <Check size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}{saved ? "تم الحفظ" : "تغييرات غير محفوظة"}</span>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
          <button onClick={() => setDevice("desktop")} className={`rounded-lg p-2 ${device === "desktop" ? "bg-white shadow-sm" : "text-zinc-500"}`} aria-label="سطح المكتب"><Monitor size={16} /></button>
          <button onClick={() => setDevice("tablet")} className={`rounded-lg p-2 ${device === "tablet" ? "bg-white shadow-sm" : "text-zinc-500"}`} aria-label="الجهاز اللوحي"><Tablet size={16} /></button>
          <button onClick={() => setDevice("mobile")} className={`rounded-lg p-2 ${device === "mobile" ? "bg-white shadow-sm" : "text-zinc-500"}`} aria-label="الهاتف"><Smartphone size={16} /></button>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/${username}`} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 sm:flex"><Eye size={16} /> معاينة</a>
          <button onClick={persistPage} disabled={isPending || saved} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium disabled:opacity-50">حفظ</button>
          <button onClick={publish} disabled={isPending} className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">{localPage.is_published ? "إلغاء النشر" : "نشر"}</button>
        </div>
      </header>

      <div className="flex min-h-screen pt-16">
        <aside className="fixed bottom-0 right-0 top-16 z-40 hidden w-60 border-l border-zinc-200 bg-white lg:flex lg:flex-col">
          <div className="grid grid-cols-2 border-b border-zinc-200 p-2">
            <button onClick={() => setPanel("add")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${panel === "add" ? "bg-zinc-100" : "text-zinc-500"}`}><Plus size={16} /> إضافة</button>
            <button onClick={() => setPanel("design")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${panel === "design" ? "bg-zinc-100" : "text-zinc-500"}`}><Palette size={16} /> التصميم</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {panel === "add" ? <div className="space-y-2">
              {[["links", "روابط", Link2], ["text", "نص", Type], ["social", "شبكات اجتماعية", Zap], ["media", "وسائط", Upload]].map(([type, label, Icon]) => <button key={type as string} disabled={isPending} onClick={() => addSection(type as "links" | "text" | "social" | "media")} className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 p-3 text-right hover:border-zinc-400 hover:bg-zinc-50"><span className="rounded-lg bg-zinc-100 p-2"><Icon size={17} /></span><span><strong className="block text-sm">{label as string}</strong><small className="text-xs text-zinc-500">عنصر فعلي مرتبط ببيانات صفحتك</small></span></button>)}
            </div> : <div className="space-y-3">
              <p className="px-1 text-xs font-semibold text-zinc-500">المظهر</p>
              <div className="grid grid-cols-2 gap-2">{palettes.map((item) => <button key={item.name} onClick={() => choosePalette(item.name)} className={`rounded-xl border p-2 text-right ${palette.name === item.name ? "border-zinc-950 ring-1 ring-zinc-950" : "border-zinc-200"}`}><span className="mb-2 block h-10 rounded-lg" style={{ background: item.bg }}><span className="m-2 inline-block h-3 w-3 rounded-full" style={{ background: item.accent }} /></span><span className="text-xs font-medium">{item.name}</span></button>)}</div>
              <label className="block rounded-xl border border-zinc-200 p-3"><span className="mb-2 block text-xs font-semibold">الخلفية</span><input type="color" value={String(localPage.theme?.background ?? palette.bg)} onChange={(e) => savePage({ theme: { ...localPage.theme, background: e.target.value } })} className="h-9 w-full cursor-pointer" /></label>
            </div>}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 items-center justify-center bg-[#e9e9ea] p-5 lg:mr-60 lg:ml-80">
          <div className="flex h-[calc(100vh-7.5rem)] w-full items-center justify-center overflow-auto rounded-2xl border border-zinc-300/70 bg-[#ddd] p-4 shadow-inner sm:p-8">
            <div className={`${device === "mobile" ? "w-[390px]" : device === "tablet" ? "w-[680px]" : "w-full max-w-5xl"} h-full max-h-[760px] overflow-y-auto rounded-[28px] border border-zinc-300 bg-white shadow-2xl transition-all`} style={{ background: String(localPage.theme?.background ?? palette.bg), color: String(localPage.theme?.text ?? palette.text) }}>
              <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col items-center px-5 py-10 sm:px-8">
                <div className="mb-5 h-20 w-20 overflow-hidden rounded-full border-4 border-white/80 bg-zinc-200 shadow-sm">{localPage.avatar_url ? <img src={localPage.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-bold">{localPage.title.slice(0, 1)}</div>}</div>
                <h1 className="text-center text-2xl font-bold tracking-tight">{localPage.title}</h1>
                <p className="mt-2 max-w-md text-center text-sm opacity-70">{localPage.bio || "أضف نبذة قصيرة عنك من اللوحة اليمنى."}</p>
                <div className="mt-7 w-full space-y-3">
                  {localSections.filter((section) => section.is_visible).map((section) => <section key={section.id} onClick={() => { setSelected(section.id); setPanel("content") }} className={`group relative rounded-2xl p-1 ${selected === section.id ? "ring-2 ring-zinc-950/20" : ""}`}>
                    {section.title && <h2 className="mb-2 px-1 text-sm font-semibold opacity-75">{section.title}</h2>}
                    {section.type === "links" ? (section.links ?? []).map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" onClick={(e) => e.preventDefault()} className="flex min-h-14 items-center justify-center rounded-xl px-5 text-center text-sm font-semibold shadow-sm transition hover:-translate-y-0.5" style={{ background: String(localPage.theme?.card ?? palette.card), color: String(localPage.theme?.text ?? palette.text) }}>{link.title}</a>) : <div className="rounded-xl bg-white/60 p-5 text-center text-sm opacity-70">{section.type === "text" ? "قسم نص" : section.type === "social" ? "روابط اجتماعية" : section.type === "media" ? "قسم وسائط" : section.type}</div>}
                  </section>)}
                  {localSections.length === 0 && <div className="rounded-2xl border border-dashed border-black/20 p-10 text-center text-sm opacity-60">ابدأ بإضافة أول عنصر من لوحة الإضافة</div>}
                </div>
                <div className="mt-auto pt-10 text-xs opacity-50">لينكا · {username}</div>
              </div>
            </div>
          </div>
        </main>

        <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-80 border-r border-zinc-200 bg-white lg:block">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3"><div><p className="text-xs font-semibold text-zinc-500">المحرر</p><h2 className="text-sm font-bold">خصائص الصفحة</h2></div><button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"><X size={16} /></button></div>
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedSection ? <div className="space-y-4">
                <div><label className="mb-1.5 block text-xs font-semibold text-zinc-600">اسم الصفحة</label><input value={localPage.title} onChange={(e) => savePage({ title: e.target.value })} onBlur={persistPage} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-950" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold text-zinc-600">النبذة</label><textarea value={localPage.bio ?? ""} onChange={(e) => savePage({ bio: e.target.value })} onBlur={persistPage} rows={4} className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-950" /></div>
                <div className="rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">اختر أي قسم داخل المعاينة لتعديل محتواه. جميع التعديلات تحفظ في Supabase ولا توجد عناصر وهمية.</div>
              </div> : <div className="space-y-5">
                <div><label className="mb-1.5 block text-xs font-semibold text-zinc-600">عنوان القسم</label><input value={selectedSection.title ?? ""} onChange={(e) => updateSectionTitle(selectedSection.id, e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-950" /></div>
                {selectedSection.type === "links" && <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-zinc-600">الروابط</span><button onClick={addLink} className="flex items-center gap-1 rounded-lg bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-white"><Plus size={13} /> إضافة</button></div>{(selectedSection.links ?? []).map((link) => <div key={link.id} className="space-y-2 rounded-xl border border-zinc-200 p-3"><div className="flex items-center justify-between"><span className="truncate text-xs font-semibold text-zinc-500">{link.title}</span><button onClick={() => deleteLink(selectedSection.id, link.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></div><input value={link.title} onChange={(e) => updateLink(selectedSection.id, link.id, "title", e.target.value)} onBlur={() => commitLink(link)} className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm" /><input dir="ltr" value={link.url} onChange={(e) => updateLink(selectedSection.id, link.id, "url", e.target.value)} onBlur={() => commitLink({ ...link, ...((selectedSection.links ?? []).find((item) => item.id === link.id) ?? {}) })} className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs" /></div>)}</div>}
                <button onClick={() => deleteSection(selectedSection.id)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={16} /> حذف القسم</button>
              </div>}
            </div>
            <div className="border-t border-zinc-200 p-3"><a href={`/${username}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-zinc-100 py-2.5 text-sm font-semibold hover:bg-zinc-200"><ExternalLink size={15} /> فتح الصفحة العامة</a></div>
          </div>
        </aside>

        <div className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl lg:hidden">
          <button onClick={() => setPanel("add")} className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold"><Plus size={18} />إضافة</button>
          <button onClick={() => setPanel("design")} className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold"><Palette size={18} />تصميم</button>
          <button onClick={() => setSelected(null)} className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold"><Type size={18} />الصفحة</button>
          <a href={`/${username}`} target="_blank" rel="noreferrer" className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold"><Eye size={18} />معاينة</a>
        </div>
      </div>
    </div>
  )
}
