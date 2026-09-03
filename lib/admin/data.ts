import { createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getAdminOverview() {
  const supabase = (await createAdminClient()) as unknown as SupabaseClient
  const [profiles, subscriptions, webhookEvents] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }),
    supabase
      .from('webhook_events')
      .select('id, provider, provider_event_id, event_type, status, received_at, processed_at, processing_error')
      .order('received_at', { ascending: false })
      .limit(25),
  ])

  if (profiles.error) throw profiles.error
  if (subscriptions.error) throw subscriptions.error
  if (webhookEvents.error) throw webhookEvents.error

  return {
    profileCount: profiles.count ?? 0,
    subscriptionCount: subscriptions.count ?? 0,
    webhookEvents: webhookEvents.data,
  }
}
