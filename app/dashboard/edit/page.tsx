import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCurrentProfile } from '@/lib/auth/session'
import { getPage } from '@/lib/db/pages'
import { getSections } from '@/lib/db/sections'
import { createClient } from '@/lib/supabase/server'
import EditorPolish from '@/components/dashboard/editor-polish'
import SectionBuilder from '@/components/dashboard/section-builder'
import { createPageAction } from './actions'
import EditorStudio from './editor-studio-final'
import styles from './editor.module.css'

export const dynamic='force-dynamic'

export default async function EditPage(){
 const profile=await getCurrentProfile();
 if(!profile)return null;
 const page=await getPage(profile.id);
 if(!page)return <main className={`${styles.root} editor-page`} dir="rtl"><EditorPolish/><section className="editor-card editor-create-card"><p className="eyebrow">ابدأ مع لينكا</p><h1>أنشئ صفحتك خلال دقيقة</h1><p>اختر اسمك، رابطك، ثم ادخل إلى الاستوديو لتخصيص كل التفاصيل.</p><form action={createPageAction} className="editor-form"><label className="editor-field"><span>اسم الصفحة</span><input name="title" required placeholder="مثلاً: محمد دكارلي"/></label><label className="editor-field"><span>اسم المستخدم / الرابط</span><input name="username" required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9_-]{2,29}" dir="ltr" placeholder="muhammed"/></label><button className="editor-primary" type="submit"><Plus size={17}/> إنشاء صفحتي</button></form><Link href="/dashboard" className="editor-secondary">العودة للوحة التحكم</Link></section></main>
 const sections=await getSections(page.id); const supabase=await createClient(); const ids=sections.map((s:any)=>s.id); const filterIds=ids.length?ids:['00000000-0000-0000-0000-000000000000'];
 const [{data:socials},{data:products},{data:services}]=await Promise.all([supabase.from('social_links').select('*').eq('page_id',page.id).order('position'),supabase.from('products').select('*').in('section_id',filterIds).order('position'),supabase.from('services').select('*').in('section_id',filterIds).order('position')]);
 const enriched=sections.map((s:any)=>({...s,links:[]})); const {data:links}=await supabase.from('links').select('*').in('section_id',filterIds).order('position');
 for(const link of links??[]){const section=enriched.find((s:any)=>s.id===link.section_id);if(section)section.links=[...(section.links||[]),link]}
 return <><EditorPolish/><EditorStudio profile={profile} page={page} sections={enriched} socials={socials??[]} products={products??[]} services={services??[]}/><SectionBuilder pageId={page.id} initialSections={enriched} planType={profile.plan_type||'free'}/></>
}
