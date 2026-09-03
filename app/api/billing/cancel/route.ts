import { createClient } from '@/lib/supabase/server'
import { getRequiredEnv } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return Response.json({ error: 'Authentication required' }, { status: 401 })

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('provider_subscription_id,status,cancel_at_period_end')
    .eq('profile_id', user.id)
    .eq('provider', 'whop')
    .in('status', ['trialing', 'active', 'past_due', 'paused'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (subscriptionError) return Response.json({ error: 'Unable to read subscription' }, { status: 500 })
  if (!subscription?.provider_subscription_id) return Response.json({ error: 'No active Whop subscription found' }, { status: 404 })
  if (subscription.cancel_at_period_end) return Response.json({ ok: true, alreadyScheduled: true }, { status: 200 })

  let response: Response
  try {
    response = await fetch(`https://api.whop.com/api/v1/memberships/${encodeURIComponent(subscription.provider_subscription_id)}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getRequiredEnv('WHOP_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellation_mode: 'at_period_end' }),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('Whop cancellation request failed:', error)
    return Response.json({ error: 'Billing provider is unavailable' }, { status: 503 })
  }

  if (!response.ok) {
    console.error('Whop cancellation request was rejected:', response.status)
    return Response.json({ error: 'Unable to cancel subscription. Check the Whop API key permissions.' }, { status: response.status === 403 ? 403 : 502 })
  }

  return Response.json({ ok: true, cancelAtPeriodEnd: true }, { status: 200 })
}
