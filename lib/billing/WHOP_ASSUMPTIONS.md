# Whop integration assumptions

The checkout integration uses Whop API v5's `POST /api/v5/checkout_sessions` endpoint with Bearer authentication. It expects a response with a top-level `checkout_url`.

Webhook verification assumes Whop Standard Webhooks headers: `webhook-id`, `webhook-timestamp`, and `webhook-signature`. The signature is an HMAC-SHA256 over `webhook-id.webhook-timestamp.raw-body`, with a `v1,<base64-signature>` value and a `whsec_` base64 signing secret. Events older than five minutes are rejected.

Subscription synchronization handles `membership.*` events. It expects membership data at `data`, the membership identifier at `data.id`, the plan identifier at `data.plan.id` or `data.plan_id`, and the Whop user identifier at `data.user.id` or `data.user_id`. Checkout metadata contains `user_id`; this is the preferred profile correlation key. Configure a Whop webhook endpoint that forwards checkout metadata and emits these membership event fields. Confirm these assumptions against the Whop account's enabled API and webhook payload version before production rollout.
