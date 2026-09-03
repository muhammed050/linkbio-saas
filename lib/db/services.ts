import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/types'

type ServiceContactMethod =
  | { booking_url: string; whatsapp_number?: string | null }
  | { booking_url?: string | null; whatsapp_number: string }

export async function getServices(sectionId: string): Promise<Service[]> {
  try { const supabase = await createClient(); const { data, error } = await supabase.from('services').select('*').eq('section_id', sectionId).order('position', { ascending: true }); if (error) throw error; return data || [] } catch (error) { console.error('Error fetching services:', error); return [] }
}

export async function getService(serviceId: string): Promise<Service | null> {
  try { const supabase = await createClient(); const { data, error } = await supabase.from('services').select('*').eq('id', serviceId).single(); if (error) throw error; return data } catch (error) { console.error('Error fetching service:', error); return null }
}

export async function createService(sectionId: string, data: Pick<Service, 'name'> & ServiceContactMethod & Partial<Pick<Service, 'description' | 'price_cents' | 'currency' | 'duration_minutes'>>): Promise<Service | null> {
  try {
    const supabase = await createClient()
    const { data: services } = await supabase.from('services').select('position').eq('section_id', sectionId).order('position', { ascending: false }).limit(1)
    const nextPosition = services && services.length > 0 ? services[0].position + 1 : 0
    const { data: service, error } = await supabase.from('services').insert({ section_id: sectionId, name: data.name, description: data.description || null, price_cents: data.price_cents ?? null, currency: data.currency || 'USD', duration_minutes: data.duration_minutes ?? null, booking_url: data.booking_url, whatsapp_number: data.whatsapp_number || null, position: nextPosition, is_visible: true }).select().single()
    if (error) throw error
    return service
  } catch (error) { console.error('Error creating service:', error); return null }
}

export async function updateService(serviceId: string, updates: Partial<Pick<Service, 'name' | 'description' | 'price_cents' | 'currency' | 'duration_minutes' | 'booking_url' | 'whatsapp_number' | 'is_visible' | 'position'>>): Promise<Service | null> {
  try { const supabase = await createClient(); const { data, error } = await supabase.from('services').update(updates).eq('id', serviceId).select().single(); if (error) throw error; return data } catch (error) { console.error('Error updating service:', error); return null }
}

export async function deleteService(serviceId: string): Promise<boolean> {
  try { const supabase = await createClient(); const { error } = await supabase.from('services').delete().eq('id', serviceId); if (error) throw error; return true } catch (error) { console.error('Error deleting service:', error); return false }
}

export async function reorderServices(updates: Array<{ id: string; position: number }>): Promise<boolean> {
  if (updates.length === 0) return true
  if (updates.some(({ id, position }) => !id || !Number.isInteger(position) || position < 0)) return false
  try {
    const supabase = await createClient()
    const tempResults = await Promise.all(updates.map(({ id }, index) => supabase.from('services').update({ position: 1000000 + index }).eq('id', id)))
    if (tempResults.some(({ error }) => error)) throw new Error('Error creating temporary service positions')
    const finalResults = await Promise.all(updates.map(({ id, position }) => supabase.from('services').update({ position }).eq('id', id)))
    if (finalResults.some(({ error }) => error)) throw new Error('Error applying service positions')
    return true
  } catch (error) { console.error('Error reordering services:', error); return false }
}

export async function countServices(sectionId: string): Promise<number> {
  try { const supabase = await createClient(); const { count, error } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('section_id', sectionId); if (error) throw error; return count || 0 } catch (error) { console.error('Error counting services:', error); return 0 }
}
