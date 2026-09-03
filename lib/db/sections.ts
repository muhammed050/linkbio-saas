import { createClient } from '@/lib/supabase/server'
import { getLinks } from '@/lib/db/links'
import { getProducts } from '@/lib/db/products'
import { getServices } from '@/lib/db/services'
import type { Section, SectionWithContent } from '@/types'

export async function getSections(pageId: string): Promise<SectionWithContent[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('page_sections')
      .select('*')
      .eq('page_id', pageId)
      .order('position', { ascending: true })

    if (error) throw error
    return Promise.all(
      (data ?? []).map(async (section) => {
        switch (section.type) {
          case 'links':
            return { ...section, links: await getLinks(section.id) }
          case 'products':
            return { ...section, products: await getProducts(section.id) }
          case 'services':
            return { ...section, services: await getServices(section.id) }
          default:
            return section
        }
      })
    )
  } catch (error) {
    console.error('Error fetching sections:', error)
    return []
  }
}

export async function getSection(sectionId: string): Promise<Section | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('page_sections')
      .select('*')
      .eq('id', sectionId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching section:', error)
    return null
  }
}

export async function createSection(
  pageId: string,
  data: Pick<Section, 'type' | 'title'>
): Promise<Section | null> {
  try {
    const supabase = await createClient()
    
    const { data: sections } = await supabase
      .from('page_sections')
      .select('position')
      .eq('page_id', pageId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = sections && sections.length > 0 ? sections[0].position + 1 : 0

    const { data: section, error } = await supabase
      .from('page_sections')
      .insert({
        page_id: pageId,
        type: data.type,
        title: data.title,
        position: nextPosition,
        is_visible: true,
      })
      .select()
      .single()

    if (error) throw error
    return section
  } catch (error) {
    console.error('Error creating section:', error)
    return null
  }
}

export async function updateSection(
  sectionId: string,
  updates: Partial<Pick<Section, 'title' | 'is_visible' | 'position'>>
): Promise<Section | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('page_sections')
      .update({
        ...updates,
      })
      .eq('id', sectionId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating section:', error)
    return null
  }
}

export async function deleteSection(sectionId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('page_sections').delete().eq('id', sectionId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting section:', error)
    return false
  }
}

export async function reorderSections(
  updates: Array<{ id: string; position: number }>
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const promises = updates.map(({ id, position }) =>
      supabase
        .from('page_sections')
        .update({
          position,
        })
        .eq('id', id)
    )

    const results = await Promise.all(promises)
    if (results.some(({ error }) => error)) throw new Error('Error reordering sections')
    return true
  } catch (error) {
    console.error('Error reordering sections:', error)
    return false
  }
}
