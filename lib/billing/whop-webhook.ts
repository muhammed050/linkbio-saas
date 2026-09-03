import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { getPlanFromWhopPlanId } from '@/lib/billing/plans'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/types/database'

const webhookPayloadSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  created_at: z.union([z.number().finite(), z.string().min(1)]),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough()

function signatureSecret(secret: string) {
  const encoded = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const decoded = Buffer.from(encoded, 'base64')
  return decoded.length > 0 ? decoded : Buffer.from(secret)
}

function getV1Signatures(value: string) {
  return value.split(' ').flatMap((entry) => {
    const [version, signature] = entry.split(',')
    return version === 'v1' && signature ? [signature] : []
  })
}

export function verifyWhopWebhook(request: Request, rawBody: Buffer): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET
  const webhookId = request.headers.get('webhook-id')
  const timestamp = request.headers.get('webhook-timestamp')
  const signatures = getV1Signatures(request.headers.get('webhook-signature') ?? '')
  if (!secret || !webhookId || !timestamp || signatures.length === 0) return false

  const timestampMs = Number(timestamp) * 1_000
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 300_000) return false

  const expected = createHmac('sha256', signatureSecret(secret))
    .update(`${webhookId}.${timestamp}.${rawBody.toString('utf8')}`)
    .digest()

  return signatures.some((signature) => {
    const received = Buffer.from(signature, 'base64')
    return received.length === expected.length && timingSafeEqual(received, expected)
  })
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function timestampValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value * 1_000)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

function jsonValue(value: unknown): Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.map(jsonValue)
  if (typeof value === 'object') {
    const result: { [key: string]: Json | undefined } = {}
    for (const [key, nestedValue] of Object.entries(value)) result[key] = jsonValue(nestedValue)
    return result
  }
  throw new Error('Webhook payload contains a non-JSON value')
}

function isSubscriptionStatus(value: string): value is Database['public']['Enums']['subscription_status'] {
  return ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'paused'].some((status) => status === value)
}

function subscriptionStatus(data: Record<string, unknown>): Database['public']['Enums']['subscription_status'] {
  const value = stringValue(data.status)
  if (value && isSubscriptionStatus(value)) return value
  return data.valid === true ? 'active' : 'canceled'
}

function nestedId(data: Record<string, unknown>, key: string) {
  const candidate = data[key]
  return isRecord(candidate) ? stringValue(candidate.id) : null
}

export async function processWhopWebhook(payload: unknown) {
  const parsed = webhookPayloadSchema.safeParse(payload)
  if (!parsed.success) throw new Error('Webhook payload does not match the expected Whop event envelope')

  const event = parsed.data
  const providerCreatedAt = timestampValue(event.created_at)
  if (!providerCreatedAt) throw new Error('Webhook event is missing a valid provider creation timestamp')

  const admin = await createAdminClient()
  const { data: claims, error: claimError } = await admin.rpc('claim_whop_webhook_event', {
    p_provider_event_id: event.id,
    p_event_type: event.type,
    p_payload: jsonValue(event),
    p_provider_created_at: providerCreatedAt,
    p_signature_verified_at: new Date().toISOString(),
  })
  if (claimError) throw claimError

  const claim = claims?.[0]
  if (!claim) throw new Error('Whop webhook event claim returned no disposition')
  if (claim.disposition !== 'claimed') return { duplicate: true }

  try {
    if (!event.type.startsWith('membership.')) throw new Error('Webhook event type is not supported')
    await synchronizeMembership(admin, event.data ?? {}, claim.event_id, providerCreatedAt)
    return { duplicate: false }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2_000) : 'Unknown processing error'
    const { error: failureError } = await admin.rpc('fail_whop_webhook_event', {
      p_event_id: claim.event_id,
      p_processing_error: message,
    })
    if (failureError) console.error('Unable to mark Whop webhook event as failed:', failureError)
    throw error
  }
}

async function synchronizeMembership(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  data: Record<string, unknown>,
  eventId: string,
  providerCreatedAt: string
) {
  const subscriptionId = stringValue(data.id)
  const providerPlanId = nestedId(data, 'plan') ?? stringValue(data.plan_id)
  const providerUserId = nestedId(data, 'user') ?? stringValue(data.user_id)
  const metadata = isRecord(data.metadata) ? data.metadata : {}
  const profileId = stringValue(metadata.user_id)
  if (!subscriptionId || !providerPlanId) throw new Error('Membership event is missing subscription or plan identifier')

  const planCode = getPlanFromWhopPlanId(providerPlanId)
  if (!planCode) throw new Error('Membership event references an unconfigured Whop plan')

  const { data: plan, error: planError } = await admin
    .from('plans')
    .select('id')
    .eq('code', planCode)
    .maybeSingle()
  if (planError) throw planError
  if (!plan) throw new Error('Membership event references an unavailable local plan')

  let profileQuery = admin.from('profiles').select('id').limit(1)
  if (profileId) profileQuery = profileQuery.eq('id', profileId)
  else if (providerUserId) profileQuery = profileQuery.eq('whop_user_id', providerUserId)
  else throw new Error('Membership event cannot be linked to a profile')
  const { data: profile, error: profileError } = await profileQuery.maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new Error('Membership event profile was not found')

  const status = subscriptionStatus(data)
  const { error: applyError } = await admin.rpc('apply_whop_membership_event', {
    p_event_id: eventId,
    p_profile_id: profile.id,
    p_plan_id: plan.id,
    p_provider_subscription_id: subscriptionId,
    p_provider_customer_id: providerUserId,
    p_provider_product_id: nestedId(data, 'product') ?? stringValue(data.product_id),
    p_provider_price_id: providerPlanId,
    p_status: status,
    p_current_period_start: timestampValue(data.current_period_start),
    p_current_period_end: timestampValue(data.current_period_end) ?? timestampValue(data.expires_at),
    p_cancel_at_period_end: data.cancel_at_period_end === true,
    p_trial_end: timestampValue(data.trial_end),
    p_canceled_at: timestampValue(data.canceled_at),
    p_ended_at: timestampValue(data.ended_at),
    p_provider_metadata: jsonValue(metadata),
    p_provider_created_at: providerCreatedAt,
  })
  if (applyError) throw applyError
}
