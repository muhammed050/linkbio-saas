'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, getCurrentUser } from '@/lib/auth/session'
import { createPage, updatePage, togglePagePublish } from '@/lib/db/pages'
import { createSection, updateSection, deleteSection, reorderSections } from '@/lib/db/sections'
import { createLink, updateLink, deleteLink, reorderLinks } from '@/lib/db/links'
import { createProduct, updateProduct, deleteProduct, reorderProducts } from '@/lib/db/products'
import { createService, updateService, deleteService, reorderServices } from '@/lib/db/services'

const idSchema = z.string().uuid()
const titleSchema = z.string().trim().min(1).max(160)
const urlSchema = z.string().trim().url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Only HTTP(S) URLs are allowed')
const whatsappSchema = z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/)
const currencySchema = z.string().trim().regex(/^[A-Z]{3}$/)
const sectionTypeSchema = z.enum(['links', 'products', 'services', 'social', 'media', 'text'])

function value(formData: FormData, key: string) { return String(formData.get(key) ?? '').trim() }
function optional(input: string) { return input || null }
function redirectAfterSave() { revalidatePath('/dashboard'); revalidatePath('/dashboard/edit'); revalidatePath('/[username]', 'page') }

async function requireOwner() {
  const user = await getCurrentUser()
  const profile = await getCurrentProfile()
  if (!user || !profile) throw new Error('Authentication required')
  return { user, profile }
}

async function ensurePage(profileId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('pages').select('id').eq('profile_id', profileId).maybeSingle()
  if (error) throw error
  return data
}

async function assertPageLimit(profileId: string, planType: string, key: string, pageId: string) {
  const supabase = await createClient()
  const { data: plan, error: planError } = await supabase.from('plans').select('limits').eq('code', planType).eq('is_active', true).maybeSingle()
  if (planError) throw planError
  const limit = Number((plan?.limits as Record<string, unknown> | null)?.[key] ?? -1)
  if (limit < 0) return
  if (key === 'sections') {
    const { count, error } = await supabase.from('page_sections').select('*', { count: 'exact', head: true }).eq('page_id', pageId)
    if (error) throw error
    if ((count ?? 0) >= limit) throw new Error(`Plan limit reached for ${key}`)
    return
  }
  const { data: sections, error: sectionsError } = await supabase.from('page_sections').select('id').eq('page_id', pageId)
  if (sectionsError) throw sectionsError
  const sectionIds = (sections ?? []).map((section) => section.id)
  if (sectionIds.length === 0) { if (limit <= 0) throw new Error(`Plan limit reached for ${key}`); return }
  const table = key === 'links' ? 'links' : key === 'products' ? 'products' : 'services'
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).in('section_id', sectionIds)
  if (error) throw error
  if ((count ?? 0) >= limit) throw new Error(`Plan limit reached for ${key}`)
}

export async function createPageAction(formData: FormData) { const { profile } = await requireOwner(); const title = titleSchema.parse(value(formData, 'title')); if (!await createPage(profile.id, { title })) throw new Error('Unable to create page'); redirectAfterSave() }

export async function updatePageAction(formData: FormData) {
  const { profile } = await requireOwner(); const pageId=idSchema.parse(value(formData,'pageId')); const title=titleSchema.parse(value(formData,'title')); const bio=z.string().max(500).parse(value(formData,'bio')); const avatarRaw=value(formData,'avatarUrl'); const seoTitle=z.string().max(160).parse(value(formData,'seoTitle')); const seoDescription=z.string().max(320).parse(value(formData,'seoDescription')); const avatarUrl=avatarRaw?urlSchema.parse(avatarRaw):null; const theme=value(formData,'theme')||'sand'; const layout=value(formData,'layout')||'minimal'; const page=await updatePage(profile.id,{title,bio:optional(bio),avatar_url:avatarUrl,seo_title:optional(seoTitle),seo_description:optional(seoDescription),theme:{theme,layout}}); if(!page||page.id!==pageId) throw new Error('Unable to update page'); redirectAfterSave()
}

export async function togglePublishAction(formData: FormData) { const {profile}=await requireOwner(); const pageId=idSchema.parse(value(formData,'pageId')); const page=await togglePagePublish(profile.id); if(!page||page.id!==pageId) throw new Error('Unable to change publication status'); redirectAfterSave() }

export async function addSectionAction(formData: FormData) { const {profile}=await requireOwner(); const page=await ensurePage(profile.id); if(!page) throw new Error('Create a page first'); await assertPageLimit(profile.id,profile.plan_type,'sections',page.id); const type=sectionTypeSchema.parse(value(formData,'type')); const title=z.string().max(120).parse(value(formData,'title')); if(!await createSection(page.id,{type,title:optional(title)})) throw new Error('Unable to create section'); redirectAfterSave() }
export async function updateSectionAction(formData: FormData) { await requireOwner(); const result=await updateSection(idSchema.parse(value(formData,'sectionId')),{title:optional(z.string().max(120).parse(value(formData,'title'))),is_visible:formData.get('isVisible')==='on'}); if(!result) throw new Error('Unable to update section'); redirectAfterSave() }
export async function deleteSectionAction(formData: FormData) { await requireOwner(); if(!await deleteSection(idSchema.parse(value(formData,'sectionId')))) throw new Error('Unable to delete section'); redirectAfterSave() }
export async function moveSectionAction(formData: FormData) { await requireOwner(); const id=idSchema.parse(value(formData,'sectionId')); const direction=value(formData,'direction')==='up'?-1:1; const supabase=await createClient(); const {data:item}=await supabase.from('page_sections').select('id,page_id,position').eq('id',id).single(); if(!item) throw new Error('Section not found'); const {data:target}=await supabase.from('page_sections').select('id,position').eq('page_id',item.page_id).eq('position',item.position+direction).maybeSingle(); if(!target) return; if(!await reorderSections([{id:item.id,position:target.position},{id:target.id,position:item.position}])) throw new Error('Unable to reorder sections'); redirectAfterSave() }

export async function addLinkAction(formData: FormData) { const {profile}=await requireOwner(); const page=await ensurePage(profile.id); if(!page) throw new Error('Create a page first'); await assertPageLimit(profile.id,profile.plan_type,'links',page.id); const sectionId=idSchema.parse(value(formData,'sectionId')); const title=titleSchema.parse(value(formData,'title')); const url=urlSchema.parse(value(formData,'url')); if(!await createLink(sectionId,{title,url})) throw new Error('Unable to create link'); redirectAfterSave() }
export async function updateLinkAction(formData: FormData) { await requireOwner(); const id=idSchema.parse(value(formData,'linkId')); const title=titleSchema.parse(value(formData,'title')); const url=urlSchema.parse(value(formData,'url')); if(!await updateLink(id,{title,url,is_visible:formData.get('isVisible')==='on'})) throw new Error('Unable to update link'); redirectAfterSave() }
export async function deleteLinkAction(formData: FormData) { await requireOwner(); if(!await deleteLink(idSchema.parse(value(formData,'linkId')))) throw new Error('Unable to delete link'); redirectAfterSave() }
export async function moveLinkAction(formData: FormData) { await requireOwner(); const id=idSchema.parse(value(formData,'linkId')); const direction=value(formData,'direction')==='up'?-1:1; const supabase=await createClient(); const {data:item}=await supabase.from('links').select('id,section_id,position').eq('id',id).single(); if(!item) throw new Error('Link not found'); const {data:target}=await supabase.from('links').select('id,position').eq('section_id',item.section_id).eq('position',item.position+direction).maybeSingle(); if(!target) return; if(!await reorderLinks([{id:item.id,position:target.position},{id:target.id,position:item.position}])) throw new Error('Unable to reorder links'); redirectAfterSave() }

export async function addProductAction(formData: FormData) { const {profile}=await requireOwner(); const page=await ensurePage(profile.id); if(!page) throw new Error('Create a page first'); await assertPageLimit(profile.id,profile.plan_type,'products',page.id); const sectionId=idSchema.parse(value(formData,'sectionId')); const name=titleSchema.parse(value(formData,'name')); const priceCents=z.coerce.number().int().min(0).max(100000000).parse(value(formData,'priceCents')); const currency=currencySchema.parse(value(formData,'currency')||'USD'); const checkout=value(formData,'checkoutUrl'); const whatsapp=value(formData,'whatsappNumber'); if(!checkout&&!whatsapp) throw new Error('Add a checkout URL or WhatsApp number'); if(checkout) urlSchema.parse(checkout); if(whatsapp) whatsappSchema.parse(whatsapp); if(!await createProduct(sectionId,{name,price_cents:priceCents,currency,checkout_url:checkout||undefined,whatsapp_number:whatsapp||undefined})) throw new Error('Unable to create product'); redirectAfterSave() }
export async function updateProductAction(formData: FormData) { await requireOwner(); const id=idSchema.parse(value(formData,'productId')); const name=titleSchema.parse(value(formData,'name')); const priceCents=z.coerce.number().int().min(0).max(100000000).parse(value(formData,'priceCents')); const currency=currencySchema.parse(value(formData,'currency')||'USD'); const checkout=value(formData,'checkoutUrl'); const whatsapp=value(formData,'whatsappNumber'); if(!checkout&&!whatsapp) throw new Error('Add a checkout URL or WhatsApp number'); if(checkout) urlSchema.parse(checkout); if(whatsapp) whatsappSchema.parse(whatsapp); if(!await updateProduct(id,{name,price_cents:priceCents,currency,checkout_url:checkout||null,whatsapp_number:whatsapp||null,is_visible:formData.get('isVisible')==='on'})) throw new Error('Unable to update product'); redirectAfterSave() }
export async function deleteProductAction(formData: FormData) { await requireOwner(); if(!await deleteProduct(idSchema.parse(value(formData,'productId')))) throw new Error('Unable to delete product'); redirectAfterSave() }
export async function moveProductAction(formData: FormData) { await requireOwner(); const id=idSchema.parse(value(formData,'productId')); const direction=value(formData,'direction')==='up'?-1:1; const supabase=await createClient(); const {data:item}=await supabase.from('products').select('id,section_id,position').eq('id',id).single(); if(!item) throw new Error('Product not found'); const {data:target}=await supabase.from('products').select('id,position').eq('section_id',item.section_id).eq('position',item.position+direction).maybeSingle(); if(!target) return; if(!await reorderProducts([{id:item.id,position:target.position},{id:target.id,position:item.position}])) throw new Error('Unable to reorder products'); redirectAfterSave() }

export async function addServiceAction(formData: FormData) { const {profile}=await requireOwner(); const page=await ensurePage(profile.id); if(!page) throw new Error('Create a page first'); await assertPageLimit(profile.id,profile.plan_type,'services',page.id); const sectionId=idSchema.parse(value(formData,'sectionId')); const name=titleSchema.parse(value(formData,'name')); const description=z.string().max(2000).parse(value(formData,'description')); const priceRaw=value(formData,'priceCents'); const durationRaw=value(formData,'durationMinutes'); const booking=value(formData,'bookingUrl'); const whatsapp=value(formData,'whatsappNumber'); if(!booking&&!whatsapp) throw new Error('Add a booking URL or WhatsApp number'); if(booking) urlSchema.parse(booking); if(whatsapp) whatsappSchema.parse(whatsapp); const result=await createService(sectionId,{name,description:optional(description),price_cents:priceRaw?z.coerce.number().int().min(0).max(100000000).parse(priceRaw):null,currency:currencySchema.parse(value(formData,'currency')||'USD'),duration_minutes:durationRaw?z.coerce.number().int().min(1).max(1440).parse(durationRaw):null,booking_url:booking||undefined,whatsapp_number:whatsapp||undefined}); if(!result) throw new Error('Unable to create service'); redirectAfterSave() }
export async function updateServiceAction(formData: FormData) { await requireOwner(); const id=idSchema.parse(value(formData,'serviceId')); const name=titleSchema.parse(value(formData,'name')); const description=z.string().max(2000).parse(value(formData,'description')); const booking=value(formData,'bookingUrl'); const whatsapp=value(formData,'whatsappNumber'); if(!booking&&!whatsapp) throw new Error('Add a booking URL or WhatsApp number'); if(booking) urlSchema.parse(booking); if(whatsapp) whatsappSchema.parse(whatsapp); if(!await updateService(id,{name,description:optional(description),price_cents:value(formData,'priceCents')?z.coerce.number().int().min(0).max(100000000).parse(value(formData,'priceCents')):null,currency:currencySchema.parse(value(formData,'currency')||'USD'),duration_minutes:value(formData,'durationMinutes')?z.coerce.number().int().min(1).max(1440).parse(value(formData,'durationMinutes')):null,booking_url:booking||null,whatsapp_number:whatsapp||null,is_visible:formData.get('isVisible')==='on'})) throw new Error('Unable to update service'); redirectAfterSave() }
export async function deleteServiceAction(formData: FormData) { await requireOwner(); if(!await deleteService(idSchema.parse(value(formData,'serviceId')))) throw new Error('Unable to delete service'); redirectAfterSave() }
export async function moveServiceAction(formData: FormData) { await requireOwner(); const id=idSchema.parse(value(formData,'serviceId')); const direction=value(formData,'direction')==='up'?-1:1; const supabase=await createClient(); const {data:item}=await supabase.from('services').select('id,section_id,position').eq('id',id).single(); if(!item) throw new Error('Service not found'); const {data:target}=await supabase.from('services').select('id,position').eq('section_id',item.section_id).eq('position',item.position+direction).maybeSingle(); if(!target) return; if(!await reorderServices([{id:item.id,position:target.position},{id:target.id,position:item.position}])) throw new Error('Unable to reorder services'); redirectAfterSave() }

export async function addSocialAction(formData: FormData) { const {profile}=await requireOwner(); const page=await ensurePage(profile.id); if(!page) throw new Error('Create a page first'); const platform=z.string().trim().min(2).max(40).regex(/^[a-z0-9_-]+$/).parse(value(formData,'platform').toLowerCase()); const url=urlSchema.parse(value(formData,'url')); const supabase=await createClient(); const {data:positionRow,error:positionError}=await supabase.from('social_links').select('position').eq('page_id',page.id).order('position',{ascending:false}).limit(1); if(positionError) throw positionError; const position=positionRow?.[0]?.position!=null?positionRow[0].position+1:0; const {error}=await supabase.from('social_links').insert({page_id:page.id,platform,url,position,is_visible:true}); if(error) throw error; redirectAfterSave() }
export async function updateSocialAction(formData: FormData) { await requireOwner(); const id=idSchema.parse(value(formData,'socialId')); const platform=z.string().trim().min(2).max(40).regex(/^[a-z0-9_-]+$/).parse(value(formData,'platform').toLowerCase()); const url=urlSchema.parse(value(formData,'url')); const {error}=await (await createClient()).from('social_links').update({platform,url,is_visible:formData.get('isVisible')==='on'}).eq('id',id); if(error) throw error; redirectAfterSave() }
export async function deleteSocialAction(formData: FormData) { await requireOwner(); const {error}=await (await createClient()).from('social_links').delete().eq('id',idSchema.parse(value(formData,'socialId'))); if(error) throw error; redirectAfterSave() }
