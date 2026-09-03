import { z } from 'zod'
import { isPaidBillingPlan, getWhopPlanId } from '@/lib/billing/plans'
import { getRequiredEnv, getSiteUrl } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const checkoutSchema = z.object({ plan: z.string() }).strict()

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  let input: unknown
  try {
    input = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success || !isPaidBillingPlan(parsed.data.plan)) {
    return Response.json({ error: 'A supported paid plan is required' }, { status: 400 })
  }

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch (error) {
    console.error('Checkout authentication configuration error:', error)
    return Response.json({ error: 'Billing is unavailable' }, { status: 503 })
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return Response.json({ error: 'Authentication required' }, { status: 401 })

  let whopPlanId: string
  let siteUrl: URL
  try {
    whopPlanId = getWhopPlanId(parsed.data.plan)
    siteUrl = getSiteUrl()
  } catch (error) {
    console.error('Checkout configuration error:', error)
    return Response.json({ error: 'Billing is unavailable' }, { status: 503 })
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id')
    .eq('code', parsed.data.plan as never)
    .eq('is_active', true)
    .maybeSingle()
  if (planError) {
    console.error('Plan validation failed:', planError)
    return Response.json({ error: 'Billing is unavailable' }, { status: 503 })
  }
  if (!plan) return Response.json({ error: 'The requested plan is unavailable' }, { status: 409 })

  const successUrl = new URL('/dashboard?checkout=success', siteUrl).toString()
  const cancelUrl = new URL('/pricing?checkout=cancelled', siteUrl).toString()
  let response: Response
  try {
    response = await fetch('https://api.whop.com/api/v5/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getRequiredEnv('WHOP_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: whopPlanId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { user_id: user.id, plan: parsed.data.plan },
      }),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('Whop checkout request failed:', error)
    return Response.json({ error: 'Billing provider is unavailable' }, { status: 503 })
  }

  if (!response.ok) {
    console.error('Whop checkout request was rejected:', response.status)
    return Response.json({ error: 'Unable to start checkout' }, { status: 502 })
  }

  const result: unknown = await response.json().catch(() => null)
  const checkoutUrl = result && typeof result === 'object' && 'checkout_url' in result && typeof result.checkout_url === 'string'
    ? result.checkout_url
    : null
  if (!checkoutUrl) {
    console.error('Whop checkout response did not contain a checkout URL')
    return Response.json({ error: 'Billing provider returned an invalid response' }, { status: 502 })
  }

  return Response.json({ checkoutUrl }, { status: 201 })
}
