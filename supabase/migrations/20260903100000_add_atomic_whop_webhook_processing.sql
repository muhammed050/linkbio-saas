alter table public.profiles
  add column entitlement_provider_created_at timestamptz;

alter table public.subscriptions
  add column last_provider_created_at timestamptz;

create index subscriptions_profile_whop_entitlement_idx
  on public.subscriptions (profile_id, last_provider_created_at desc)
  where provider = 'whop'::public.webhook_provider
    and status in ('active'::public.subscription_status, 'trialing'::public.subscription_status);

create or replace function public.claim_whop_webhook_event(
  p_provider_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_provider_created_at timestamptz,
  p_signature_verified_at timestamptz default now()
)
returns table(event_id uuid, disposition text, processing_attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'claim_whop_webhook_event is restricted to service_role' using errcode = '42501';
  end if;

  if char_length(btrim(p_provider_event_id)) not between 1 and 255
     or char_length(btrim(p_event_type)) not between 1 and 255
     or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid Whop webhook event' using errcode = '22023';
  end if;

  return query
  with claimed as (
    insert into public.webhook_events (
      provider,
      provider_event_id,
      event_type,
      payload,
      status,
      processing_started_at,
      processing_attempts,
      processing_error,
      signature_verified_at,
      provider_created_at
    )
    values (
      'whop'::public.webhook_provider,
      btrim(p_provider_event_id),
      btrim(p_event_type),
      p_payload,
      'processing'::public.webhook_event_status,
      now(),
      1,
      null,
      p_signature_verified_at,
      p_provider_created_at
    )
    on conflict (provider, provider_event_id) do update
    set
      status = 'processing'::public.webhook_event_status,
      processing_started_at = now(),
      processing_attempts = public.webhook_events.processing_attempts + 1,
      processing_error = null,
      signature_verified_at = coalesce(public.webhook_events.signature_verified_at, excluded.signature_verified_at),
      provider_created_at = coalesce(public.webhook_events.provider_created_at, excluded.provider_created_at)
    where public.webhook_events.status in ('received'::public.webhook_event_status, 'failed'::public.webhook_event_status)
      or (
        public.webhook_events.status = 'processing'::public.webhook_event_status
        and (
          public.webhook_events.processing_started_at is null
          or public.webhook_events.processing_started_at <= now() - interval '15 minutes'
        )
      )
    returning public.webhook_events.id, public.webhook_events.processing_attempts
  )
  select claimed.id, 'claimed'::text, claimed.processing_attempts
  from claimed;

  if found then
    return;
  end if;

  return query
  select
    event.id,
    case
      when event.status = 'processed'::public.webhook_event_status then 'already_processed'
      else 'in_progress'
    end,
    event.processing_attempts
  from public.webhook_events event
  where event.provider = 'whop'::public.webhook_provider
    and event.provider_event_id = btrim(p_provider_event_id);
end;
$$;

create or replace function public.apply_whop_membership_event(
  p_event_id uuid,
  p_profile_id uuid,
  p_plan_id uuid,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_provider_product_id text,
  p_provider_price_id text,
  p_status public.subscription_status,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_trial_end timestamptz,
  p_canceled_at timestamptz,
  p_ended_at timestamptz,
  p_provider_metadata jsonb,
  p_provider_created_at timestamptz
)
returns table(subscription_applied boolean, entitlement_applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_status public.webhook_event_status;
  v_event_provider_created_at timestamptz;
  v_existing_profile_id uuid;
  v_rows integer;
  v_subscription_applied boolean := false;
  v_entitlement_applied boolean := false;
  v_plan_type public.plan_code;
  v_price_id text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'apply_whop_membership_event is restricted to service_role' using errcode = '42501';
  end if;

  if char_length(btrim(p_provider_subscription_id)) = 0
     or p_provider_created_at is null
     or jsonb_typeof(p_provider_metadata) <> 'object' then
    raise exception 'invalid Whop membership event' using errcode = '22023';
  end if;

  select event.status, event.provider_created_at
  into v_event_status, v_event_provider_created_at
  from public.webhook_events event
  where event.id = p_event_id
    and event.provider = 'whop'::public.webhook_provider
  for update;

  if not found then
    raise exception 'Whop webhook event was not claimed' using errcode = 'P0002';
  end if;

  if v_event_status = 'processed'::public.webhook_event_status then
    return query select false, false;
    return;
  end if;

  if v_event_status <> 'processing'::public.webhook_event_status then
    raise exception 'Whop webhook event is not being processed' using errcode = '55000';
  end if;

  if v_event_provider_created_at is distinct from p_provider_created_at then
    raise exception 'Whop membership timestamp must match the claimed event' using errcode = '22023';
  end if;

  perform 1
  from public.plans plan
  where plan.id = p_plan_id
    and plan.is_active;

  if not found then
    raise exception 'Whop membership references an unavailable plan' using errcode = '23503';
  end if;

  perform 1
  from public.profiles profile
  where profile.id = p_profile_id
  for update;

  if not found then
    raise exception 'Whop membership profile was not found' using errcode = 'P0002';
  end if;

  select subscription.profile_id
  into v_existing_profile_id
  from public.subscriptions subscription
  where subscription.provider = 'whop'::public.webhook_provider
    and subscription.provider_subscription_id = btrim(p_provider_subscription_id)
  for update;

  if found and v_existing_profile_id <> p_profile_id then
    raise exception 'Whop subscription cannot be reassigned to another profile' using errcode = '23514';
  end if;

  insert into public.subscriptions (
    profile_id,
    plan_id,
    provider,
    provider_customer_id,
    provider_subscription_id,
    provider_product_id,
    provider_price_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    trial_end,
    canceled_at,
    ended_at,
    provider_metadata,
    last_provider_event_id,
    last_provider_created_at
  )
  values (
    p_profile_id,
    p_plan_id,
    'whop'::public.webhook_provider,
    nullif(btrim(p_provider_customer_id), ''),
    btrim(p_provider_subscription_id),
    nullif(btrim(p_provider_product_id), ''),
    nullif(btrim(p_provider_price_id), ''),
    p_status,
    p_current_period_start,
    p_current_period_end,
    coalesce(p_cancel_at_period_end, false),
    p_trial_end,
    p_canceled_at,
    p_ended_at,
    p_provider_metadata,
    (select event.provider_event_id from public.webhook_events event where event.id = p_event_id),
    p_provider_created_at
  )
  on conflict (provider, provider_subscription_id) do update
  set
    plan_id = excluded.plan_id,
    provider_customer_id = excluded.provider_customer_id,
    provider_product_id = excluded.provider_product_id,
    provider_price_id = excluded.provider_price_id,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    trial_end = excluded.trial_end,
    canceled_at = excluded.canceled_at,
    ended_at = excluded.ended_at,
    provider_metadata = excluded.provider_metadata,
    last_provider_event_id = excluded.last_provider_event_id,
    last_provider_created_at = excluded.last_provider_created_at
  where public.subscriptions.profile_id = excluded.profile_id
    and (
      public.subscriptions.last_provider_created_at is null
      or excluded.last_provider_created_at > public.subscriptions.last_provider_created_at
    );

  get diagnostics v_rows = row_count;
  v_subscription_applied := v_rows > 0;

  if v_subscription_applied then
    select plan.code, subscription.provider_price_id
    into v_plan_type, v_price_id
    from public.subscriptions subscription
    join public.plans plan on plan.id = subscription.plan_id
    where subscription.profile_id = p_profile_id
      and subscription.provider = 'whop'::public.webhook_provider
      and subscription.status in ('active'::public.subscription_status, 'trialing'::public.subscription_status)
    order by subscription.last_provider_created_at desc nulls last, subscription.updated_at desc
    limit 1;

    update public.profiles profile
    set
      plan_type = coalesce(v_plan_type, 'free'::public.plan_code),
      whop_user_id = coalesce(nullif(btrim(p_provider_customer_id), ''), profile.whop_user_id),
      whop_plan_id = v_price_id,
      entitlement_provider_created_at = p_provider_created_at
    where profile.id = p_profile_id
      and (
        profile.entitlement_provider_created_at is null
        or p_provider_created_at > profile.entitlement_provider_created_at
      );

    get diagnostics v_rows = row_count;
    v_entitlement_applied := v_rows > 0;
  end if;

  update public.webhook_events
  set
    status = 'processed'::public.webhook_event_status,
    processed_at = now(),
    processing_error = null
  where id = p_event_id;

  return query select v_subscription_applied, v_entitlement_applied;
end;
$$;

create or replace function public.fail_whop_webhook_event(
  p_event_id uuid,
  p_processing_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'fail_whop_webhook_event is restricted to service_role' using errcode = '42501';
  end if;

  update public.webhook_events
  set
    status = 'failed'::public.webhook_event_status,
    processing_error = left(coalesce(nullif(btrim(p_processing_error), ''), 'Unknown processing error'), 2000)
  where id = p_event_id
    and provider = 'whop'::public.webhook_provider
    and status = 'processing'::public.webhook_event_status;

  if not found then
    raise exception 'Whop webhook event is not being processed' using errcode = '55000';
  end if;
end;
$$;

revoke all on function public.claim_whop_webhook_event(text, text, jsonb, timestamptz, timestamptz) from public;
revoke all on function public.apply_whop_membership_event(uuid, uuid, uuid, text, text, text, text, public.subscription_status, timestamptz, timestamptz, boolean, timestamptz, timestamptz, timestamptz, jsonb, timestamptz) from public;
revoke all on function public.fail_whop_webhook_event(uuid, text) from public;

grant execute on function public.claim_whop_webhook_event(text, text, jsonb, timestamptz, timestamptz) to service_role;
grant execute on function public.apply_whop_membership_event(uuid, uuid, uuid, text, text, text, text, public.subscription_status, timestamptz, timestamptz, boolean, timestamptz, timestamptz, timestamptz, jsonb, timestamptz) to service_role;
grant execute on function public.fail_whop_webhook_event(uuid, text) to service_role;

do $$
begin
  if has_function_privilege('anon', 'public.claim_whop_webhook_event(text, text, jsonb, timestamptz, timestamptz)', 'execute')
     or has_function_privilege('authenticated', 'public.claim_whop_webhook_event(text, text, jsonb, timestamptz, timestamptz)', 'execute')
     or has_function_privilege('anon', 'public.apply_whop_membership_event(uuid, uuid, uuid, text, text, text, text, public.subscription_status, timestamptz, timestamptz, boolean, timestamptz, timestamptz, timestamptz, jsonb, timestamptz)', 'execute')
     or has_function_privilege('authenticated', 'public.apply_whop_membership_event(uuid, uuid, uuid, text, text, text, text, public.subscription_status, timestamptz, timestamptz, boolean, timestamptz, timestamptz, timestamptz, jsonb, timestamptz)', 'execute')
     or has_function_privilege('anon', 'public.fail_whop_webhook_event(uuid, text)', 'execute')
     or has_function_privilege('authenticated', 'public.fail_whop_webhook_event(uuid, text)', 'execute') then
    raise exception 'Whop webhook RPCs must not be executable by client roles';
  end if;
end;
$$;
