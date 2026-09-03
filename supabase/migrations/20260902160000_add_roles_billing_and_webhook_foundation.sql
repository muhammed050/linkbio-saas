alter type public.plan_code add value if not exists 'business';

create type public.app_role as enum ('admin');
create type public.webhook_event_status as enum ('received', 'processing', 'processed', 'failed');

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.plans
  add column limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object');

create table public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete restrict,
  provider public.webhook_provider not null,
  billing_interval text not null check (billing_interval in ('month', 'year', 'lifetime')),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  price_cents integer not null check (price_cents >= 0),
  external_price_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, provider, billing_interval, currency)
);

alter table public.subscriptions
  add column provider_product_id text,
  add column provider_price_id text,
  add column trial_end timestamptz,
  add column canceled_at timestamptz,
  add column ended_at timestamptz,
  add column provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  add column last_provider_event_id text;

alter table public.webhook_events
  add column status public.webhook_event_status not null default 'received',
  add column processing_started_at timestamptz,
  add column processing_attempts integer not null default 0 check (processing_attempts >= 0),
  add column signature_verified_at timestamptz,
  add column provider_created_at timestamptz,
  add column updated_at timestamptz not null default now(),
  add constraint webhook_events_provider_event_id_not_blank check (char_length(btrim(provider_event_id)) between 1 and 255),
  add constraint webhook_events_event_type_not_blank check (char_length(btrim(event_type)) between 1 and 255);

update public.webhook_events
set status = case
  when processed_at is not null then 'processed'::public.webhook_event_status
  when processing_error is not null then 'failed'::public.webhook_event_status
  else 'received'::public.webhook_event_status
end;

alter table public.webhook_events
  add constraint webhook_events_processing_state check (
    (status = 'processed' and processed_at is not null and processing_error is null)
    or (status = 'failed' and processing_error is not null)
    or (status in ('received', 'processing') and processed_at is null)
  );

create index plan_prices_active_lookup_idx
  on public.plan_prices (plan_id, billing_interval, currency)
  where is_active;

create index subscriptions_provider_customer_idx
  on public.subscriptions (provider, provider_customer_id)
  where provider_customer_id is not null;

create index webhook_events_status_received_idx
  on public.webhook_events (received_at)
  where status in ('received', 'failed');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'::public.app_role
  );
$$;

create trigger plan_prices_set_updated_at before update on public.plan_prices for each row execute function public.set_updated_at();
create trigger webhook_events_set_updated_at before update on public.webhook_events for each row execute function public.set_updated_at();

alter table public.user_roles enable row level security;
alter table public.plan_prices enable row level security;

create policy user_roles_select_admin on public.user_roles
  for select to authenticated
  using ((select public.is_admin()));

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using ((select public.is_admin()));

create policy plans_manage_admin on public.plans
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy plan_prices_select_active on public.plan_prices
  for select to anon, authenticated
  using (is_active);

create policy plan_prices_manage_admin on public.plan_prices
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy subscriptions_select_admin on public.subscriptions
  for select to authenticated
  using ((select public.is_admin()));

create policy subscriptions_manage_admin on public.subscriptions
  for insert to authenticated
  with check ((select public.is_admin()));

create policy subscriptions_update_admin on public.subscriptions
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy subscriptions_delete_admin on public.subscriptions
  for delete to authenticated
  using ((select public.is_admin()));

create policy webhook_events_select_admin on public.webhook_events
  for select to authenticated
  using ((select public.is_admin()));

grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.plans, public.plan_prices, public.subscriptions to authenticated;
grant select on public.plan_prices to anon;
grant select on public.webhook_events to authenticated;
grant select, insert, update on public.webhook_events to service_role;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

insert into public.plans (code, name, description, price_cents, currency, billing_interval, limits, is_active)
values
  ('free', 'Free', 'Get started with a simple link page.', 0, 'USD', 'month', '{"links":5,"products":0,"services":0,"sections":2,"custom_domain":false,"analytics":false,"qr_code":false,"seo_metadata":false}'::jsonb, true),
  ('pro', 'Pro', 'For creators who need growth tools.', 2900, 'USD', 'month', '{"links":-1,"products":-1,"services":-1,"sections":-1,"custom_domain":true,"analytics":true,"qr_code":true,"seo_metadata":true}'::jsonb, true),
  ('business', 'Business', 'For businesses that need advanced capacity and support.', 7900, 'USD', 'month', '{"links":-1,"products":-1,"services":-1,"sections":-1,"custom_domain":true,"analytics":true,"qr_code":true,"seo_metadata":true}'::jsonb, true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  limits = excluded.limits,
  is_active = excluded.is_active;

insert into public.plan_prices (plan_id, provider, billing_interval, currency, price_cents, is_active)
select plan.id, 'whop'::public.webhook_provider, seed.billing_interval, seed.currency, seed.price_cents, true
from public.plans plan
join (
  values
    ('pro'::public.plan_code, 'month'::text, 'USD'::char(3), 2900),
    ('business'::public.plan_code, 'month'::text, 'USD'::char(3), 7900)
) as seed(code, billing_interval, currency, price_cents) on seed.code = plan.code
on conflict (plan_id, provider, billing_interval, currency) do update
set
  price_cents = excluded.price_cents,
  is_active = excluded.is_active;

do $$
begin
  if has_table_privilege('anon', 'public.user_roles', 'select')
     or has_table_privilege('authenticated', 'public.user_roles', 'insert')
     or has_table_privilege('authenticated', 'public.user_roles', 'update')
     or has_table_privilege('authenticated', 'public.user_roles', 'delete') then
    raise exception 'client roles must not manage user roles';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'plan_type', 'update')
     or has_column_privilege('authenticated', 'public.profiles', 'whop_user_id', 'update')
     or has_column_privilege('authenticated', 'public.profiles', 'whop_plan_id', 'update') then
    raise exception 'authenticated users must not update profile billing fields';
  end if;

  if has_table_privilege('anon', 'public.subscriptions', 'insert')
     or not exists (
       select 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'subscriptions'
         and policyname = 'subscriptions_manage_admin'
         and cmd = 'INSERT'
         and 'authenticated' = any(roles)
         and with_check like '%is_admin%'
  ) then
    raise exception 'subscription writes must be limited to admin clients';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
      and 'authenticated' = any(roles)
      and coalesce(qual, '') not like '%is_admin%'
      and coalesce(with_check, '') not like '%is_admin%'
  ) then
    raise exception 'non-admin subscription write policy detected';
  end if;

  if has_table_privilege('anon', 'public.webhook_events', 'select')
     or has_table_privilege('anon', 'public.webhook_events', 'insert')
     or has_table_privilege('authenticated', 'public.webhook_events', 'insert')
     or has_table_privilege('authenticated', 'public.webhook_events', 'update')
     or has_table_privilege('authenticated', 'public.webhook_events', 'delete') then
    raise exception 'webhook events must not be writable by client roles';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.webhook_events'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%(provider, provider_event_id)%'
  ) then
    raise exception 'webhook provider event idempotency constraint is required';
  end if;
end;
$$;
