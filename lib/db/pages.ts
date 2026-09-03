import { createClient } from '@/lib/supabase/server'
import { getSections } from '@/lib/db/sections'
import type { Page, PageWithSections } from '@/types'

export async function getPage(profileId: string): Promise<Page | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('pages').select('*').eq('profile_id', profileId).single()
    if (error?.code === 'PGRST116' && error.details === 'The result contains 0 rows') return null
    if (error) throw error
    return data
  } catch (error) { console.error('Error fetching page:', error); return null }
}

export async function getPageByUsername(username: string): Promise<PageWithSections | null> {
  try {
    const supabase = await createClient()
    const normalized = username.trim().toLowerCase()
    if (!normalized) return null
    const { data: profile, error: profileError } = await supabase.from('published_profiles').select('id').eq('username', normalized).maybeSingle()
    if (profileError || !profile) return null
    const { data: page, error: pageError } = await supabase.from('pages').select('*').eq('profile_id', profile.id).eq('is_published', true).maybeSingle()
    if (pageError || !page) return null
    const sections = await getSections(page.id)
    return { ...page, sections }
  } catch (error) { console.error('Error fetching page by username:', error); return null }
}

export async function createPage(profileId: string, data: Pick<Page, 'title'> & Partial<Pick<Page, 'bio' | 'avatar_url' | 'theme'>>): Promise<Page | null> {
  try {
    const supabase = await createClient()
    const { data: page, error } = await supabase.from('pages').insert({ profile_id: profileId, title: data.title, bio: data.bio || null, avatar_url: data.avatar_url || null, theme: data.theme || {}, is_published: false }).select().single()
    if (error) throw error
    return page
  } catch (error) { console.error('Error creating page:', error); return null }
}

export async function updatePage(profileId: string, updates: Partial<Pick<Page, 'title' | 'bio' | 'avatar_url' | 'theme' | 'is_published' | 'custom_domain' | 'seo_title' | 'seo_description'>>): Promise<Page | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('pages').update(updates).eq('profile_id', profileId).select().single()
    if (error) throw error
    return data
  } catch (error) { console.error('Error updating page:', error); return null }
}

export async function deletePage(profileId: string): Promise<boolean> {
  try { const supabase = await createClient(); const { error } = await supabase.from('pages').delete().eq('profile_id', profileId); if (error) throw error; return true } catch (error) { console.error('Error deleting page:', error); return false }
}

export async function togglePagePublish(profileId: string): Promise<Page | null> {
  try {
    const supabase = await createClient()
    const { data: currentPage, error: currentError } = await supabase.from('pages').select('is_published').eq('profile_id', profileId).single()
    if (currentError || !currentPage) return null
    const { data, error } = await supabase.from('pages').update({ is_published: !currentPage.is_published }).eq('profile_id', profileId).select().single()
    if (error) throw error
    return data
  } catch (error) { console.error('Error toggling page publish:', error); return null }
}
