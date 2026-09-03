import { createHash } from 'node:crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const eventSchema = z.discriminatedUnion('eventType', [
  z.object({ pageId: z.uuid(), eventType: z.literal('page_view') }).strict(),
  z.object({ pageId: z.uuid(), eventType: z.literal('link_click'), targetId: z.uuid() }).strict(),
  z.object({ pageId: z.uuid(), eventType: z.literal('product_click'), targetId: z.uuid() }).strict(),
  z.object({ pageId: z.uuid(), eventType: z.literal('service_click'), targetId: z.uuid() }).strict(),
  z.object({ pageId: z.uuid(), eventType: z.literal('social_click'), targetId: z.uuid() }).strict(),
  z.object({ pageId: z.uuid(), eventType: z.literal('media_view'), targetId: z.uuid() }).strict(),
])

type AnalyticsEvent = z.infer<typeof eventSchema>

const rateLimitWindowMs = 60_000
const rateLimitMaxRequests = 30
const maximumBodySize = 1_024
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(ip).digest('hex')
}

function isRateLimited(request: Request) {
  const now = Date.now()

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key)
  }

  const key = getClientKey(request)
  const bucket = rateLimitBuckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    if (rateLimitBuckets.size >= 10_000) {
      const oldestKey = rateLimitBuckets.keys().next().value
      if (oldestKey) rateLimitBuckets.delete(oldestKey)
    }
    rateLimitBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs })
    return false
  }

  bucket.count += 1
  return bucket.count > rateLimitMaxRequests
}

async function readJsonBody(request: Request) {
  if (!request.body) return ''

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maximumBodySize) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }

  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

async function targetBelongsToPublishedPage(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  event: Exclude<AnalyticsEvent, { eventType: 'page_view' }>
) {
  switch (event.eventType) {
    case 'social_click': {
      const { data, error } = await supabase
        .from('social_links')
        .select('id')
        .eq('id', event.targetId)
        .eq('page_id', event.pageId)
        .eq('is_visible', true)
        .maybeSingle()
      if (error) throw error
      return Boolean(data)
    }
    case 'media_view': {
      const { data, error } = await supabase
        .from('media')
        .select('id')
        .eq('id', event.targetId)
        .eq('page_id', event.pageId)
        .eq('is_visible', true)
        .maybeSingle()
      if (error) throw error
      return Boolean(data)
    }
    case 'link_click':
    case 'product_click':
    case 'service_click': {
      const table = event.eventType === 'link_click' ? 'links' : event.eventType === 'product_click' ? 'products' : 'services'
      const { data: target, error: targetError } = await supabase
        .from(table)
        .select('section_id, is_visible')
        .eq('id', event.targetId)
        .maybeSingle()
      if (targetError) throw targetError
      if (!target?.is_visible) return false

      const { data: section, error: sectionError } = await supabase
        .from('page_sections')
        .select('id')
        .eq('id', target.section_id)
        .eq('page_id', event.pageId)
        .eq('is_visible', true)
        .maybeSingle()
      if (sectionError) throw sectionError
      return Boolean(section)
    }
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maximumBodySize) {
    return Response.json({ error: 'Request body is too large' }, { status: 413 })
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  if (isRateLimited(request)) {
    return Response.json(
      { error: 'Too many analytics events' },
      { status: 429, headers: { 'Retry-After': String(rateLimitWindowMs / 1_000) } }
    )
  }

  let payload: unknown
  try {
    const rawBody = await readJsonBody(request)
    if (rawBody === null) return Response.json({ error: 'Request body is too large' }, { status: 413 })
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const parsed = eventSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid analytics event' }, { status: 400 })
  }

  try {
    const supabase = await createAdminClient()
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('id')
      .eq('id', parsed.data.pageId)
      .eq('is_published', true)
      .maybeSingle()

    if (pageError) throw pageError
    if (!page) return Response.json({ error: 'Published page not found' }, { status: 404 })

    if (parsed.data.eventType !== 'page_view' && !(await targetBelongsToPublishedPage(supabase, parsed.data))) {
      return Response.json({ error: 'Analytics target not found' }, { status: 404 })
    }

    const { error: insertError } = await supabase.from('analytics_events').insert({
      page_id: page.id,
      event_type: parsed.data.eventType,
      target_id: parsed.data.eventType === 'page_view' ? null : parsed.data.targetId,
      metadata: {},
    })

    if (insertError) throw insertError
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Analytics ingestion failed:', error)
    return Response.json({ error: 'Unable to record analytics event' }, { status: 503 })
  }
}
