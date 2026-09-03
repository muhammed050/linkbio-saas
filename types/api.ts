import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Page = Database['public']['Tables']['pages']['Row']
export type Section = Database['public']['Tables']['page_sections']['Row']
export type Link = Database['public']['Tables']['links']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row']

export type PlanType = Database['public']['Enums']['plan_code']
export type EventType = Database['public']['Enums']['analytics_event_type']
export type SectionType = Database['public']['Enums']['section_type']

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

export interface PageWithSections extends Page {
  sections: SectionWithContent[]
}

export interface SectionWithContent extends Section {
  links?: Link[]
  products?: Product[]
  services?: Service[]
}

export interface AnalyticsStats {
  page_views: number
  link_clicks: number
  product_clicks: number
  service_clicks: number
  total_events: number
}

export interface DailyStats {
  date: string
  page_views: number
  link_clicks: number
  product_clicks: number
  service_clicks: number
}

export interface TopItem {
  id: string
  title: string
  clicks: number
}
