import { createClient } from '@/lib/supabase/server'
import type { AnalyticsStats, DailyStats, EventType, Json, TopItem } from '@/types'

export async function trackEvent(
  pageId: string,
  eventType: EventType,
  targetId?: string,
  metadata?: Record<string, Json | undefined>
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('analytics_events').insert({
      page_id: pageId,
      event_type: eventType,
      target_id: targetId || null,
      metadata: metadata ?? {},
    })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error tracking event:', error)
    return false
  }
}

export async function getAnalytics(
  pageId: string,
  days: number = 30
): Promise<AnalyticsStats> {
  try {
    const supabase = await createClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type')
      .eq('page_id', pageId)
      .gte('occurred_at', startDate.toISOString())

    if (error) throw error

    const stats: AnalyticsStats = {
      page_views: 0,
      link_clicks: 0,
      product_clicks: 0,
      service_clicks: 0,
      total_events: data?.length || 0,
    }

    data?.forEach((event) => {
      switch (event.event_type) {
        case 'page_view':
          stats.page_views++
          break
        case 'link_click':
          stats.link_clicks++
          break
        case 'product_click':
          stats.product_clicks++
          break
        case 'service_click':
          stats.service_clicks++
          break
      }
    })

    return stats
  } catch (error) {
    console.error('Error fetching analytics:', error)
    throw error
  }
}

export async function getDailyStats(pageId: string, days: number = 30): Promise<DailyStats[]> {
  try {
    const supabase = await createClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type, occurred_at')
      .eq('page_id', pageId)
      .gte('occurred_at', startDate.toISOString())
      .order('occurred_at', { ascending: true })

    if (error) throw error

    const dailyMap = new Map<string, DailyStats>()

    data?.forEach((event) => {
      const date = new Date(event.occurred_at).toISOString().split('T')[0]
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          page_views: 0,
          link_clicks: 0,
          product_clicks: 0,
          service_clicks: 0,
        })
      }

      const stats = dailyMap.get(date)!
      switch (event.event_type) {
        case 'page_view':
          stats.page_views++
          break
        case 'link_click':
          stats.link_clicks++
          break
        case 'product_click':
          stats.product_clicks++
          break
        case 'service_click':
          stats.service_clicks++
          break
      }
    })

    return Array.from(dailyMap.values())
  } catch (error) {
    console.error('Error fetching daily stats:', error)
    return []
  }
}

export async function getTopLinks(pageId: string, limit: number = 5): Promise<TopItem[]> {
  try {
    const supabase = await createClient()

    const { data: events, error: eventsError } = await supabase
      .from('analytics_events')
      .select('target_id')
      .eq('page_id', pageId)
      .eq('event_type', 'link_click')
      .not('target_id', 'is', null)

    if (eventsError) throw eventsError

    const clickCounts = new Map<string, number>()
    events?.forEach((event) => {
      const id = event.target_id!
      clickCounts.set(id, (clickCounts.get(id) || 0) + 1)
    })

    const topIds = Array.from(clickCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id)

    if (topIds.length === 0) return []

    const { data: links, error: linksError } = await supabase
      .from('links')
      .select('id, title')
      .in('id', topIds)

    if (linksError) throw linksError

    return topIds
      .map((id) => {
        const link = links?.find((l) => l.id === id)
        if (!link) return null
        return {
          id,
          title: link.title,
          clicks: clickCounts.get(id)!,
        }
      })
      .filter((item): item is TopItem => item !== null)
  } catch (error) {
    console.error('Error fetching top links:', error)
    return []
  }
}
