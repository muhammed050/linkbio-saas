export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert, Update, Relationships extends readonly unknown[] = []> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Relationships
}

type ProfileFields = {
  id: string; username: string; full_name: string | null; avatar_url: string | null; locale: string; timezone: string
  plan_type: Database['public']['Enums']['plan_code']; whop_user_id: string | null; whop_plan_id: string | null
  entitlement_provider_created_at: string | null; created_at: string; updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileFields, Omit<ProfileFields, 'full_name' | 'avatar_url' | 'locale' | 'timezone' | 'plan_type' | 'whop_user_id' | 'whop_plan_id' | 'entitlement_provider_created_at' | 'created_at' | 'updated_at'> & Partial<Omit<ProfileFields, 'id' | 'username'>>, Partial<ProfileFields>>
      user_roles: Table<
        { user_id: string; role: Database['public']['Enums']['app_role']; created_at: string },
        { user_id: string; role: Database['public']['Enums']['app_role']; created_at?: string },
        { user_id?: string; role?: Database['public']['Enums']['app_role']; created_at?: string },
        [{ foreignKeyName: 'user_roles_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }]
      >
      plans: Table<
        { id: string; code: Database['public']['Enums']['plan_code']; name: string; description: string | null; price_cents: number; currency: string; billing_interval: string; external_price_id: string | null; is_active: boolean; limits: Json; created_at: string; updated_at: string },
        { id?: string; code: Database['public']['Enums']['plan_code']; name: string; description?: string | null; price_cents?: number; currency?: string; billing_interval?: string; external_price_id?: string | null; is_active?: boolean; limits?: Json; created_at?: string; updated_at?: string },
        { id?: string; code?: Database['public']['Enums']['plan_code']; name?: string; description?: string | null; price_cents?: number; currency?: string; billing_interval?: string; external_price_id?: string | null; is_active?: boolean; limits?: Json; created_at?: string; updated_at?: string }
      >
      plan_prices: Table<
        { id: string; plan_id: string; provider: Database['public']['Enums']['webhook_provider']; billing_interval: string; currency: string; price_cents: number; external_price_id: string | null; is_active: boolean; created_at: string; updated_at: string },
        { id?: string; plan_id: string; provider: Database['public']['Enums']['webhook_provider']; billing_interval: string; currency: string; price_cents: number; external_price_id?: string | null; is_active?: boolean; created_at?: string; updated_at?: string },
        { id?: string; plan_id?: string; provider?: Database['public']['Enums']['webhook_provider']; billing_interval?: string; currency?: string; price_cents?: number; external_price_id?: string | null; is_active?: boolean; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'plan_prices_plan_id_fkey'; columns: ['plan_id']; isOneToOne: false; referencedRelation: 'plans'; referencedColumns: ['id'] }]
      >
      pages: Table<
        { id: string; profile_id: string; title: string; bio: string | null; avatar_url: string | null; theme: Json; is_published: boolean; published_at: string | null; custom_domain: string | null; seo_title: string | null; seo_description: string | null; created_at: string; updated_at: string },
        { id?: string; profile_id: string; title: string; bio?: string | null; avatar_url?: string | null; theme?: Json; is_published?: boolean; published_at?: string | null; custom_domain?: string | null; seo_title?: string | null; seo_description?: string | null; created_at?: string; updated_at?: string },
        { id?: string; profile_id?: string; title?: string; bio?: string | null; avatar_url?: string | null; theme?: Json; is_published?: boolean; published_at?: string | null; custom_domain?: string | null; seo_title?: string | null; seo_description?: string | null; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'pages_profile_id_fkey'; columns: ['profile_id']; isOneToOne: true; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      >
      page_sections: Table<
        { id: string; page_id: string; type: Database['public']['Enums']['section_type']; title: string | null; position: number; is_visible: boolean; created_at: string; updated_at: string },
        { id?: string; page_id: string; type: Database['public']['Enums']['section_type']; title?: string | null; position: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        { id?: string; page_id?: string; type?: Database['public']['Enums']['section_type']; title?: string | null; position?: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'page_sections_page_id_fkey'; columns: ['page_id']; isOneToOne: false; referencedRelation: 'pages'; referencedColumns: ['id'] }]
      >
      links: Table<
        { id: string; section_id: string; title: string; url: string; icon: string | null; position: number; is_visible: boolean; created_at: string; updated_at: string },
        { id?: string; section_id: string; title: string; url: string; icon?: string | null; position: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        { id?: string; section_id?: string; title?: string; url?: string; icon?: string | null; position?: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'links_section_id_fkey'; columns: ['section_id']; isOneToOne: false; referencedRelation: 'page_sections'; referencedColumns: ['id'] }]
      >
      social_links: Table<
        { id: string; page_id: string; platform: string; url: string; position: number; is_visible: boolean; created_at: string; updated_at: string },
        { id?: string; page_id: string; platform: string; url: string; position: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        { id?: string; page_id?: string; platform?: string; url?: string; position?: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'social_links_page_id_fkey'; columns: ['page_id']; isOneToOne: false; referencedRelation: 'pages'; referencedColumns: ['id'] }]
      >
      products: Table<
        { id: string; section_id: string; name: string; description: string | null; price_cents: number; currency: string; checkout_url: string | null; whatsapp_number: string | null; position: number; is_visible: boolean; created_at: string; updated_at: string },
        { id?: string; section_id: string; name: string; description?: string | null; price_cents: number; currency?: string; checkout_url?: string | null; whatsapp_number?: string | null; position: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        { id?: string; section_id?: string; name?: string; description?: string | null; price_cents?: number; currency?: string; checkout_url?: string | null; whatsapp_number?: string | null; position?: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'products_section_id_fkey'; columns: ['section_id']; isOneToOne: false; referencedRelation: 'page_sections'; referencedColumns: ['id'] }]
      >
      product_images: Table<
        { id: string; product_id: string; storage_path: string; alt_text: string | null; position: number; created_at: string },
        { id?: string; product_id: string; storage_path: string; alt_text?: string | null; position: number; created_at?: string },
        { id?: string; product_id?: string; storage_path?: string; alt_text?: string | null; position?: number; created_at?: string },
        [{ foreignKeyName: 'product_images_product_id_fkey'; columns: ['product_id']; isOneToOne: false; referencedRelation: 'products'; referencedColumns: ['id'] }]
      >
      services: Table<
        { id: string; section_id: string; name: string; description: string | null; price_cents: number | null; currency: string; duration_minutes: number | null; booking_url: string | null; whatsapp_number: string | null; position: number; is_visible: boolean; created_at: string; updated_at: string },
        { id?: string; section_id: string; name: string; description?: string | null; price_cents?: number | null; currency?: string; duration_minutes?: number | null; booking_url?: string | null; whatsapp_number?: string | null; position: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        { id?: string; section_id?: string; name?: string; description?: string | null; price_cents?: number | null; currency?: string; duration_minutes?: number | null; booking_url?: string | null; whatsapp_number?: string | null; position?: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'services_section_id_fkey'; columns: ['section_id']; isOneToOne: false; referencedRelation: 'page_sections'; referencedColumns: ['id'] }]
      >
      media: Table<
        { id: string; page_id: string; section_id: string | null; kind: string; storage_path: string; title: string | null; alt_text: string | null; position: number; is_visible: boolean; created_at: string; updated_at: string },
        { id?: string; page_id: string; section_id?: string | null; kind: string; storage_path: string; title?: string | null; alt_text?: string | null; position?: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        { id?: string; page_id?: string; section_id?: string | null; kind?: string; storage_path?: string; title?: string | null; alt_text?: string | null; position?: number; is_visible?: boolean; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'media_page_id_fkey'; columns: ['page_id']; isOneToOne: false; referencedRelation: 'pages'; referencedColumns: ['id'] }, { foreignKeyName: 'media_section_id_fkey'; columns: ['section_id']; isOneToOne: false; referencedRelation: 'page_sections'; referencedColumns: ['id'] }]
      >
      subscriptions: Table<
        { id: string; profile_id: string; plan_id: string; provider: Database['public']['Enums']['webhook_provider']; provider_customer_id: string | null; provider_subscription_id: string; status: Database['public']['Enums']['subscription_status']; current_period_start: string | null; current_period_end: string | null; cancel_at_period_end: boolean; provider_product_id: string | null; provider_price_id: string | null; trial_end: string | null; canceled_at: string | null; ended_at: string | null; provider_metadata: Json; last_provider_event_id: string | null; last_provider_created_at: string | null; created_at: string; updated_at: string },
        { id?: string; profile_id: string; plan_id: string; provider: Database['public']['Enums']['webhook_provider']; provider_customer_id?: string | null; provider_subscription_id: string; status: Database['public']['Enums']['subscription_status']; current_period_start?: string | null; current_period_end?: string | null; cancel_at_period_end?: boolean; provider_product_id?: string | null; provider_price_id?: string | null; trial_end?: string | null; canceled_at?: string | null; ended_at?: string | null; provider_metadata?: Json; last_provider_event_id?: string | null; last_provider_created_at?: string | null; created_at?: string; updated_at?: string },
        { id?: string; profile_id?: string; plan_id?: string; provider?: Database['public']['Enums']['webhook_provider']; provider_customer_id?: string | null; provider_subscription_id?: string; status?: Database['public']['Enums']['subscription_status']; current_period_start?: string | null; current_period_end?: string | null; cancel_at_period_end?: boolean; provider_product_id?: string | null; provider_price_id?: string | null; trial_end?: string | null; canceled_at?: string | null; ended_at?: string | null; provider_metadata?: Json; last_provider_event_id?: string | null; last_provider_created_at?: string | null; created_at?: string; updated_at?: string },
        [{ foreignKeyName: 'subscriptions_profile_id_fkey'; columns: ['profile_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'subscriptions_plan_id_fkey'; columns: ['plan_id']; isOneToOne: false; referencedRelation: 'plans'; referencedColumns: ['id'] }]
      >
      analytics_sessions: Table<{ id: string; page_id: string; visitor_hash: string; started_at: string; last_seen_at: string; country_code: string | null; referrer_host: string | null }, { id?: string; page_id: string; visitor_hash: string; started_at?: string; last_seen_at?: string; country_code?: string | null; referrer_host?: string | null }, { id?: string; page_id?: string; visitor_hash?: string; started_at?: string; last_seen_at?: string; country_code?: string | null; referrer_host?: string | null }, [{ foreignKeyName: 'analytics_sessions_page_id_fkey'; columns: ['page_id']; isOneToOne: false; referencedRelation: 'pages'; referencedColumns: ['id'] }]>
      analytics_page_views: Table<{ id: string; page_id: string; session_id: string | null; viewed_at: string; referrer_host: string | null }, { id?: string; page_id: string; session_id?: string | null; viewed_at?: string; referrer_host?: string | null }, { id?: string; page_id?: string; session_id?: string | null; viewed_at?: string; referrer_host?: string | null }, [{ foreignKeyName: 'analytics_page_views_page_id_fkey'; columns: ['page_id']; isOneToOne: false; referencedRelation: 'pages'; referencedColumns: ['id'] }, { foreignKeyName: 'analytics_page_views_session_id_fkey'; columns: ['session_id']; isOneToOne: false; referencedRelation: 'analytics_sessions'; referencedColumns: ['id'] }]>
      analytics_events: Table<{ id: string; page_id: string; session_id: string | null; event_type: Database['public']['Enums']['analytics_event_type']; target_id: string | null; occurred_at: string; metadata: Json }, { id?: string; page_id: string; session_id?: string | null; event_type: Database['public']['Enums']['analytics_event_type']; target_id?: string | null; occurred_at?: string; metadata?: Json }, { id?: string; page_id?: string; session_id?: string | null; event_type?: Database['public']['Enums']['analytics_event_type']; target_id?: string | null; occurred_at?: string; metadata?: Json }, [{ foreignKeyName: 'analytics_events_page_id_fkey'; columns: ['page_id']; isOneToOne: false; referencedRelation: 'pages'; referencedColumns: ['id'] }, { foreignKeyName: 'analytics_events_session_id_fkey'; columns: ['session_id']; isOneToOne: false; referencedRelation: 'analytics_sessions'; referencedColumns: ['id'] }]>
      webhook_events: Table<
        { id: string; provider: Database['public']['Enums']['webhook_provider']; provider_event_id: string; event_type: string; payload: Json; received_at: string; processed_at: string | null; processing_error: string | null; status: Database['public']['Enums']['webhook_event_status']; processing_started_at: string | null; processing_attempts: number; signature_verified_at: string | null; provider_created_at: string | null; updated_at: string },
        { id?: string; provider: Database['public']['Enums']['webhook_provider']; provider_event_id: string; event_type: string; payload: Json; received_at?: string; processed_at?: string | null; processing_error?: string | null; status?: Database['public']['Enums']['webhook_event_status']; processing_started_at?: string | null; processing_attempts?: number; signature_verified_at?: string | null; provider_created_at?: string | null; updated_at?: string },
        { id?: string; provider?: Database['public']['Enums']['webhook_provider']; provider_event_id?: string; event_type?: string; payload?: Json; received_at?: string; processed_at?: string | null; processing_error?: string | null; status?: Database['public']['Enums']['webhook_event_status']; processing_started_at?: string | null; processing_attempts?: number; signature_verified_at?: string | null; provider_created_at?: string | null; updated_at?: string }
      >
    }
    Views: { published_profiles: Table<{ id: string; username: string; full_name: string | null; avatar_url: string | null }, never, never> }
    Functions: {
      claim_whop_webhook_event: { Args: { p_provider_event_id: string; p_event_type: string; p_payload: Json; p_provider_created_at: string | null; p_signature_verified_at?: string }; Returns: { event_id: string; disposition: string; processing_attempts: number }[] }
      apply_whop_membership_event: { Args: { p_event_id: string; p_profile_id: string; p_plan_id: string; p_provider_subscription_id: string; p_provider_customer_id: string | null; p_provider_product_id: string | null; p_provider_price_id: string | null; p_status: Database['public']['Enums']['subscription_status']; p_current_period_start: string | null; p_current_period_end: string | null; p_cancel_at_period_end: boolean | null; p_trial_end: string | null; p_canceled_at: string | null; p_ended_at: string | null; p_provider_metadata: Json; p_provider_created_at: string }; Returns: { subscription_applied: boolean; entitlement_applied: boolean }[] }
      fail_whop_webhook_event: { Args: { p_event_id: string; p_processing_error: string }; Returns: undefined }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_reserved_username: { Args: { value: string }; Returns: boolean }
      normalize_username: { Args: { value: string }; Returns: string | null }
    }
    Enums: {
      plan_code: 'free' | 'basic' | 'pro' | 'business'
      subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'paused'
      section_type: 'links' | 'products' | 'services' | 'social' | 'media' | 'text'
      analytics_event_type: 'page_view' | 'link_click' | 'product_click' | 'service_click' | 'social_click' | 'media_view'
      webhook_provider: 'stripe' | 'whop'
      app_role: 'admin'
      webhook_event_status: 'received' | 'processing' | 'processed' | 'failed'
    }
    CompositeTypes: { [_ in never]: never }
  }
}
