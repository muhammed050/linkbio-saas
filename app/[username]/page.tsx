import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TemplatePage } from '@/components/public/template-page'
import { getTemplate, templates } from '@/components/public/template-data'
import { PublicProfilePage, type PublicProfile } from '@/components/public/public-profile-page'
import { createPublicClient } from '@/lib/supabase/public'

export const revalidate = 30
export const dynamicParams = true

type PageProps={params:Promise<{username:string}>}
const profileThemes=['sand','midnight','violet','paper','forest','coral','ocean','mono'] as const
const profileLayouts=['minimal','creator','store','business','restaurant','services','luxury','bento'] as const
function isProfileTheme(v:unknown):v is PublicProfile['theme']{return typeof v==='string'&&profileThemes.includes(v as PublicProfile['theme'])}
function isProfileLayout(v:unknown):v is PublicProfile['layout']{return typeof v==='string'&&profileLayouts.includes(v as PublicProfile['layout'])}
function getThemeValue(t:unknown,k:string){return t&&typeof t==='object'&&!Array.isArray(t)?(t as Record<string,unknown>)[k]:undefined}

async function loadPublicProfile(username:string):Promise<PublicProfile|null>{
  try{
    const s=createPublicClient()
    const{data:profile,error:pe}=await s.from('published_profiles').select('id, username, full_name, avatar_url').eq('username',username).maybeSingle()
    if(pe||!profile)return null
    const{data:page,error:pageError}=await s.from('pages').select('id,title,bio,avatar_url,theme,seo_title,seo_description').eq('profile_id',profile.id).eq('is_published',true).maybeSingle()
    if(pageError||!page)return null
    const[{data:sections,error:se},{data:socialLinks,error:socialError}]=await Promise.all([
      s.from('page_sections').select('id,type,title,position,style').eq('page_id',page.id).eq('is_visible',true).order('position'),
      s.from('social_links').select('id,platform,url,position,image_url,style').eq('page_id',page.id).eq('is_visible',true).order('position')
    ])
    if(se||socialError)return null
    const ids=(sections??[]).map(x=>x.id)
    const[{data:links,error:le},{data:products,error:pr},{data:services,error:sv}]=await Promise.all([
      ids.length?s.from('links').select('id,section_id,title,url,position,image_url,style').in('section_id',ids).eq('is_visible',true).order('position'):Promise.resolve({data:[],error:null}),
      ids.length?s.from('products').select('id,section_id,name,description,price_cents,currency,checkout_url,whatsapp_number,whatsapp_message,position,image_url,style').in('section_id',ids).eq('is_visible',true).order('position'):Promise.resolve({data:[],error:null}),
      ids.length?s.from('services').select('id,section_id,name,description,price_cents,currency,duration_minutes,booking_url,whatsapp_number,whatsapp_message,position,image_url,style').in('section_id',ids).eq('is_visible',true).order('position'):Promise.resolve({data:[],error:null})
    ])
    if(le||pr||sv)return null
    const theme=getThemeValue(page.theme,'theme'),layout=getThemeValue(page.theme,'layout')
    return{username:profile.username,name:page.title||profile.full_name||profile.username,bio:page.bio,avatarUrl:page.avatar_url||profile.avatar_url,theme:isProfileTheme(theme)?theme:'sand',layout:isProfileLayout(layout)?layout:'minimal',design:page.theme&&typeof page.theme==='object'?page.theme:{},sections:(sections??[]).map(section=>({...section,links:(links??[]).filter(x=>x.section_id===section.id),products:(products??[]).filter(x=>x.section_id===section.id),services:(services??[]).filter(x=>x.section_id===section.id)})),socialLinks:socialLinks??[],metadata:{title:page.seo_title||page.title||profile.full_name||profile.username,description:page.seo_description||page.bio}}
  }catch{return null}
}

export function generateStaticParams(){return templates.map(({id})=>({username:id}))}
export async function generateMetadata({params}:PageProps):Promise<Metadata>{const{username}=await params;const template=getTemplate(username);if(template)return{title:`${template.title} | لينكا`,description:template.bio};const profile=await loadPublicProfile(username.trim().toLowerCase());if(!profile)return{title:'الصفحة غير متاحة | لينكا',robots:{index:false,follow:false}};return{title:`${profile.metadata.title} | لينكا`,description:profile.metadata.description??undefined,alternates:{canonical:`/${profile.username}`},openGraph:{title:profile.metadata.title,description:profile.metadata.description??undefined,type:'profile'}}}
export default async function PublicProfileRoute({params}:PageProps){const{username}=await params;const template=getTemplate(username);if(template)return <TemplatePage template={template}/>;const profile=await loadPublicProfile(username.trim().toLowerCase());if(!profile)notFound();return <PublicProfilePage profile={profile}/>} 
