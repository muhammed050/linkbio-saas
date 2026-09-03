import { processWhopWebhook, verifyWhopWebhook } from '@/lib/billing/whop-webhook'

export const runtime = 'nodejs'

const maximumBodySize = 1_048_576

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maximumBodySize) {
    return Response.json({ error: 'Request body is too large' }, { status: 413 })
  }

  const rawBody = Buffer.from(await request.arrayBuffer())
  if (rawBody.length > maximumBodySize) return Response.json({ error: 'Request body is too large' }, { status: 413 })
  if (!verifyWhopWebhook(request, rawBody)) return Response.json({ error: 'Invalid webhook signature' }, { status: 401 })

  let payload: unknown
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  try {
    const result = await processWhopWebhook(payload)
    return Response.json({ received: true, duplicate: result.duplicate }, { status: 200 })
  } catch (error) {
    console.error('Whop webhook processing failed:', error)
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
