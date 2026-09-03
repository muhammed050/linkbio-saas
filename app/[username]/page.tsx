import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { TemplatePage } from "@/components/public/template-page";
import { getTemplate, templates } from "@/components/public/template-data";
import { PublicProfilePage, type PublicProfile } from "@/components/public/public-profile-page";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ username: string }> };
const profileThemes = ["sand", "midnight", "violet", "paper", "forest", "coral", "ocean", "mono"] as const;
const profileLayouts = ["minimal", "creator", "store", "business", "restaurant", "services", "luxury", "bento"] as const;
function isProfileTheme(value: unknown): value is PublicProfile["theme"] { return typeof value === "string" && profileThemes.includes(value as PublicProfile["theme"]); }
function isProfileLayout(value: unknown): value is PublicProfile["layout"] { return typeof value === "string" && profileLayouts.includes(value as PublicProfile["layout"]); }
function getThemeValue(theme: unknown, key: string) { return theme && typeof theme === "object" && !Array.isArray(theme) ? (theme as Record<string, unknown>)[key] : undefined; }
const getPublicProfile = cache(async (username: string): Promise<PublicProfile | null> => {
 try {
  const supabase=await createClient();
  const {data:profile,error:profileError}=await supabase.from("published_profiles").select("id, username, full_name, avatar_url").eq("username",username.toLowerCase()).maybeSingle();
  if(profileError||!profile)return null;
  const {data:page,error:pageError}=await supabase.from("pages").select("id, title, bio, avatar_url, theme, seo_title, seo_description").eq("profile_id",profile.id).eq("is_published",true).maybeSingle();
  if(pageError||!page)return null;
  const [{data:sections,error:sectionsError},{data:socialLinks,error:socialLinksError}]=await Promise.all([
   supabase.from("page_sections").select("id,type,title,position,style").eq("page_id",page.id).eq("is_visible",true).order("position"),
   supabase.from("social_links").select("id,platform,url,position,image_url,style").eq("page_id",page.id).eq("is_visible",true).order("position")
  ]);
  if(sectionsError||socialLinksError)return null;
  const sectionIds=(sections??[]).map(({id})=>id);
  const [{data:links,error:linksError},{data:products,error:productsError},{data:services,error:servicesError}]=await Promise.all([
   sectionIds.length?supabase.from("links").select("id,section_id,title,url,position,image_url,style").in("section_id",sectionIds).eq("is_visible",true).order("position"):Promise.resolve({data:[],error:null}),
   sectionIds.length?supabase.from("products").select("id,section_id,name,description,price_cents,currency,checkout_url,whatsapp_number,position,image_url,style").in("section_id",sectionIds).eq("is_visible",true).order("position"):Promise.resolve({data:[],error:null}),
   sectionIds.length?supabase.from("services").select("id,section_id,name,description,price_cents,currency,duration_minutes,booking_url,whatsapp_number,position,image_url,style").in("section_id",sectionIds).eq("is_visible",true).order("position"):Promise.resolve({data:[],error:null})
  ]);
  if(linksError||productsError||servicesError)return null;
  const theme=getThemeValue(page.theme,"theme"); const layout=getThemeValue(page.theme,"layout");
  return {username:profile.username,name:page.title||profile.full_name||profile.username,bio:page.bio,avatarUrl:page.avatar_url||profile.avatar_url,theme:isProfileTheme(theme)?theme:"sand",layout:isProfileLayout(layout)?layout:"minimal",design:page.theme&&typeof page.theme==='object'?page.theme:{},sections:(sections??[]).map(section=>({...section,links:(links??[]).filter(item=>item.section_id===section.id),products:(products??[]).filter(item=>item.section_id===section.id),services:(services??[]).filter(item=>item.section_id===section.id)})),socialLinks:socialLinks??[],metadata:{title:page.seo_title||page.title||profile.full_name||profile.username,description:page.seo_description||page.bio}};
 }catch{return null;}
});
export function generateStaticParams(){return templates.map(({id})=>({username:id}));}
export async function generateMetadata({params}:PageProps):Promise<Metadata>{const{username}=await params;const template=getTemplate(username);if(template)return{title:`${template.title} | لينكا`,description:template.bio};const profile=await getPublicProfile(username);if(!profile)return{title:"الصفحة غير متاحة | لينكا",robots:{index:false,follow:false}};return{title:`${profile.metadata.title} | لينكا`,description:profile.metadata.description??undefined,alternates:{canonical:`/${profile.username}`},openGraph:{title:profile.metadata.title,description:profile.metadata.description??undefined,url:`/${profile.username}`,type:"profile"}};}
export default async function PublicProfileRoute({params}:PageProps){const{username}=await params;const template=getTemplate(username);if(template)return <TemplatePage template={template}/>;const profile=await getPublicProfile(username);if(!profile)notFound();return <PublicProfilePage profile={profile}/>;}
