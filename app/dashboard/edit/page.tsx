import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCurrentProfile } from '@/lib/auth/session'
import { getPage } from '@/lib/db/pages'
import { getSections } from '@/lib/db/sections'
import { createClient } from '@/lib/supabase/server'
import { createPageAction } from './actions'
import EditorStudio from './editor-studio'
import styles from './editor.module.css'

export default async function EditPage(){
 const profile=await getCurrentProfile();
 if(!profile)return null;
 const page=await getPage(profile.id);
 if(!page)return <main className={`${styles.root} editor-page`} dir="rtl"><section className="editor-card editor-create-card"><p className="eyebrow">ابدأ مع لينكا</p><h1>أنشئ صفحتك خلال دقيقة</h1><p>اختر اسمك، رابطك، ثم ادخل إلى الاستوديو لتخصيص كل التفاصيل.</p><form action={createPageAction} className="editor-form"><label className="editor-field"><span>اسم الصفحة</span><input name="title" required placeholder="مثلاً: محمد دكارلي"/></label><label className="editor-field"><span>اسم المستخدم / الرابط</span><input name="username" required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9_-]{2,29}" dir="ltr" placeholder="muhammed"/></label><button className="editor-primary" type="submit"><Plus size={17}/> إنشاء صفحتي</button></form><Link href="/dashboard" className="editor-secondary">العودة للوحة التحكم</Link></section></main>
 const sections=await getSections(page.id);
 const supabase=await createClient();
 const {data:socials}=await supabase.from('social_links').select('*').eq('page_id',page.id).order('position');
 return <EditorStudio profile={profile} page={page} sections={sections} socials={socials??[]}/>
}
