import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return Response.json({ authenticated: false }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, plan_type')
    .eq('id', user.id)
    .single()
  if (profileError) return Response.json({ error: 'Unable to read billing status' }, { status: 500 })

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('provider_subscription_id,status,current_period_start,current_period_end,cancel_at_period_end,trial_end,canceled_at,ended_at,provider_metadata')
    .eq('profile_id', profile.id)
    .eq('provider', 'whop')
    .in('status', ['trialing', 'active', 'past_due', 'paused'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (subscriptionError) return Response.json({ error: 'Unable to read subscription' }, { status: 500 })

  const metadata = subscription?.provider_metadata && typeof subscription.provider_metadata === 'object' && !Array.isArray(subscription.provider_metadata)
    ? subscription.provider_metadata as Record<string, unknown>
    : {}

  return Response.json({
    authenticated: true,
    plan: profile.plan_type,
    subscription: subscription ? {
      id: subscription.provider_subscription_id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end,
      canceledAt: subscription.canceled_at,
      manageUrl: typeof metadata.manage_url === 'string' ? metadata.manage_url : null,
    } : null,
  }, { status: 200 })
}
