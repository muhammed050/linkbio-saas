import { z } from 'zod'
import { isPaidBillingPlan, getWhopPlanId } from '@/lib/billing/plans'
import { getRequiredEnv, getSiteUrl } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const checkoutSchema = z.object({ plan: z.enum(['pro', 'business']) }).strict()

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

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return Response.json({ error: 'Authentication required' }, { status: 401 })

  let whopPlanId: string
  let siteUrl: URL
  try {
    whopPlanId = getWhopPlanId(parsed.data.plan)
    siteUrl = getSiteUrl()
  } catch (error) {
    console.error('Checkout configuration error:', error)
    return Response.json({ error: 'Billing is unavailable. Check Whop plan configuration.' }, { status: 503 })
  }

  const { data: localPlan, error: planError } = await supabase
    .from('plans')
    .select('id')
    .eq('code', parsed.data.plan)
    .eq('is_active', true)
    .maybeSingle()

  if (planError) {
    console.error('Plan validation failed:', planError)
    return Response.json({ error: 'Billing is unavailable' }, { status: 503 })
  }
  if (!localPlan) return Response.json({ error: 'The requested plan is unavailable' }, { status: 409 })

  const successUrl = new URL('/dashboard?checkout=success', siteUrl).toString()
  const cancelUrl = new URL('/pricing?checkout=cancelled', siteUrl).toString()
  const idempotencyKey = `linkbio-checkout-${user.id}-${parsed.data.plan}-${Date.now()}`

  try {
    // Whop's current Checkout Configuration API is /api/v1/checkout_configurations.
    // Creating the configuration here lets us attach our Supabase user ID as metadata,
    // which is returned with the membership webhook and is the reliable account link.
    const response = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getRequiredEnv('WHOP_API_KEY')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        plan_id: whopPlanId,
        redirect_url: successUrl,
        metadata: {
          user_id: user.id,
          plan: parsed.data.plan,
          local_plan_id: localPlan.id,
        },
      }),
      cache: 'no-store',
    })

    const result: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      const providerMessage = result && typeof result === 'object' && 'message' in result && typeof result.message === 'string'
        ? result.message
        : result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
          ? result.error
          : `Whop returned HTTP ${response.status}`
      console.error('Whop checkout configuration rejected:', response.status, providerMessage)
      return Response.json({ error: `Unable to start checkout: ${providerMessage}` }, { status: 502 })
    }

    if (!result || typeof result !== 'object') {
      console.error('Whop checkout configuration returned a non-object response')
      return Response.json({ error: 'Billing provider returned an invalid response' }, { status: 502 })
    }

    const purchaseUrl = 'purchase_url' in result && typeof result.purchase_url === 'string' ? result.purchase_url : null
    const checkoutConfigId = 'id' in result && typeof result.id === 'string' ? result.id : null

    if (!purchaseUrl) {
      console.error('Whop checkout configuration response did not contain purchase_url:', result)
      return Response.json({ error: 'Billing provider returned an invalid checkout URL' }, { status: 502 })
    }

    return Response.json({ checkoutUrl: purchaseUrl, checkoutConfigId }, { status: 201 })
  } catch (error) {
    console.error('Whop checkout request failed:', error)
    return Response.json({ error: 'Billing provider is unavailable' }, { status: 503 })
  }
}
