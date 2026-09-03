export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
type Table<Row = any, Insert = any, Update = any, Relationships extends readonly unknown[] = []> = { Row: Row; Insert: Insert; Update: Update; Relationships: Relationships }
type ProfileFields = { id: string; username: string; full_name: string | null; avatar_url: string | null; locale: string; timezone: string; plan_type: 'free' | 'pro' | 'business'; whop_user_id: string | null; whop_plan_id: string | null; entitlement_provider_created_at: string | null; created_at: string; updated_at: string }
export type Database = {
  public: {
    Tables: Record<string, Table>
    Views: Record<string, Table>
    Functions: Record<string, { Args: Record<string, any>; Returns: any }>
    Enums: { plan_code: 'free' | 'pro' | 'business'; subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'paused'; section_type: 'links' | 'products' | 'services' | 'social' | 'media' | 'text'; analytics_event_type: 'page_view' | 'link_click' | 'product_click' | 'service_click' | 'social_click' | 'media_view'; webhook_provider: 'stripe' | 'whop'; app_role: 'admin'; webhook_event_status: 'received' | 'processing' | 'processed' | 'failed' }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Profile = ProfileFields
