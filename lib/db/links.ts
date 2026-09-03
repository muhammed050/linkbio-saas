import { createClient } from '@/lib/supabase/server'
import type { Link } from '@/types'

export async function getLinks(sectionId: string): Promise<Link[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('section_id', sectionId)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching links:', error)
    return []
  }
}

export async function getLink(linkId: string): Promise<Link | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('id', linkId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching link:', error)
    return null
  }
}

export async function createLink(
  sectionId: string,
  data: Pick<Link, 'title' | 'url'> & Partial<Pick<Link, 'icon'>>
): Promise<Link | null> {
  try {
    const supabase = await createClient()
    
    const { data: links } = await supabase
      .from('links')
      .select('position')
      .eq('section_id', sectionId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = links && links.length > 0 ? links[0].position + 1 : 0

    const { data: link, error } = await supabase
      .from('links')
      .insert({
        section_id: sectionId,
        title: data.title,
        url: data.url,
        icon: data.icon || null,
        position: nextPosition,
        is_visible: true,
      })
      .select()
      .single()

    if (error) throw error
    return link
  } catch (error) {
    console.error('Error creating link:', error)
    return null
  }
}

export async function updateLink(
  linkId: string,
  updates: Partial<Pick<Link, 'title' | 'url' | 'icon' | 'is_visible' | 'position'>>
): Promise<Link | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('links')
      .update({
        ...updates,
      })
      .eq('id', linkId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating link:', error)
    return null
  }
}

export async function deleteLink(linkId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('links').delete().eq('id', linkId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting link:', error)
    return false
  }
}

export async function reorderLinks(
  updates: Array<{ id: string; position: number }>
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const promises = updates.map(({ id, position }) =>
      supabase
        .from('links')
        .update({
          position,
        })
        .eq('id', id)
    )

    const results = await Promise.all(promises)
    if (results.some(({ error }) => error)) throw new Error('Error reordering links')
    return true
  } catch (error) {
    console.error('Error reordering links:', error)
    return false
  }
}

export async function countLinks(sectionId: string): Promise<number> {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('links')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', sectionId)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error counting links:', error)
    return 0
  }
}
