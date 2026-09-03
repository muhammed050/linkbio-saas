do $$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.pages') is null
     or to_regclass('public.page_sections') is null
     or to_regclass('public.links') is null
     or to_regclass('public.social_links') is null
     or to_regclass('public.products') is null
     or to_regclass('public.product_images') is null
     or to_regclass('public.services') is null
     or to_regclass('public.media') is null
     or to_regclass('public.subscriptions') is null
     or to_regclass('public.analytics_sessions') is null
     or to_regclass('public.analytics_events') is null
     or to_regclass('public.webhook_events') is null then
    raise exception 'legacy Linkbio tables are incomplete; use a fresh project or restore the verified legacy schema before reconciling';
  end if;

  if exists (
    select 1 from public.subscriptions
    where provider is null or btrim(provider::text) not in ('stripe', 'whop')
       or status is null or btrim(status::text) not in ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'paused')
       or plan is null or btrim(plan::text) not in ('free', 'basic', 'pro', 'business')
  ) then
    raise exception 'subscriptions contains provider, status, or plan values that cannot be represented by the application schema';
  end if;

  if exists (
    select 1 from public.webhook_events
    where provider is null or btrim(provider::text) not in ('stripe', 'whop')
       or event_id is null or char_length(btrim(event_id)) not between 1 and 255
       or event_type is null or char_length(btrim(event_type)) not between 1 and 255
  ) then
    raise exception 'webhook_events contains provider, event_id, or event_type values that cannot be represented by the application schema';
  end if;

  if exists (
    select provider, btrim(event_id)
    from public.webhook_events
    group by provider, btrim(event_id)
    having count(*) > 1
  ) then
    raise exception 'webhook_events has duplicate provider/event_id pairs; resolve them before reconciling';
  end if;

  if exists (
    select 1
    from public.pages page
    left join public.profiles profile on profile.id = page.user_id
    where profile.id is null
  ) then
    raise exception 'pages contains user_id values without matching profiles';
  end if;
end;
$$;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'plan_code') then
    create type public.plan_code as enum ('free', 'basic', 'pro', 'business');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'subscription_status') then
    create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'paused');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'section_type') then
    create type public.section_type as enum ('links', 'products', 'services', 'social', 'media', 'text');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'analytics_event_type') then
    create type public.analytics_event_type as enum ('page_view', 'link_click', 'product_click', 'service_click', 'social_click', 'media_view');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'webhook_provider') then
    create type public.webhook_provider as enum ('stripe', 'whop');
  end if;
end;
$$;

alter type public.plan_code add value if not exists 'business';

create or replace function public.normalize_username(value text)
returns text
language sql
immutable
strict
as $$
  select nullif(trim(both '-' from regexp_replace(regexp_replace(lower(btrim(value)), '[^a-z0-9_-]+', '-', 'g'), '-{2,}', '-', 'g')), '');
$$;

create or replace function public.is_reserved_username(value text)
returns boolean
language sql
immutable
strict
as $$
  select value in ('about', 'admin', 'api', 'app', 'auth', 'billing', 'blog', 'dashboard', 'docs', 'help', 'login', 'logout', 'pricing', 'privacy', 'register', 'settings', 'signup', 'support', 'terms', 'www');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code public.plan_code not null unique,
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency char(3) not null default 'SAR' check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year', 'lifetime')),
  external_price_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (code, name, price_cents, currency, billing_interval)
values
  ('free', 'Free', 0, 'USD', 'month'),
  ('basic', 'Basic', 0, 'USD', 'month'),
  ('pro', 'Pro', 2900, 'USD', 'month'),
  ('business', 'Business', 7900, 'USD', 'month')
on conflict (code) do nothing;

alter table public.profiles
  add column if not exists locale text not null default 'ar',
  add column if not exists timezone text not null default 'Asia/Riyadh';

alter table public.pages
  add column if not exists profile_id uuid,
  add column if not exists theme jsonb not null default '{}'::jsonb,
  add column if not exists custom_domain text;

update public.pages
set profile_id = user_id
where profile_id is null;

update public.pages
set theme = case when jsonb_typeof(theme_settings) = 'object' then theme_settings else '{}'::jsonb end
where theme = '{}'::jsonb and theme_settings is not null;

alter table public.page_sections add column if not exists is_visible boolean not null default true;
update public.page_sections set is_visible = visible where is_visible and visible is not null;

alter table public.links add column if not exists section_id uuid, add column if not exists icon text, add column if not exists is_visible boolean not null default true;
alter table public.products add column if not exists section_id uuid, add column if not exists price_cents integer, add column if not exists checkout_url text, add column if not exists whatsapp_number text, add column if not exists position integer not null default 0, add column if not exists is_visible boolean not null default true;
alter table public.services add column if not exists section_id uuid, add column if not exists price_cents integer, add column if not exists whatsapp_number text, add column if not exists position integer not null default 0, add column if not exists is_visible boolean not null default true;
alter table public.product_images add column if not exists storage_path text;
alter table public.media add column if not exists storage_path text;
alter table public.analytics_events add column if not exists occurred_at timestamptz not null default now(), add column if not exists target_id uuid;

update public.product_images set storage_path = url where storage_path is null;
update public.media set storage_path = path where storage_path is null;
update public.analytics_events set occurred_at = created_at where occurred_at is null;
update public.links set is_visible = visible where is_visible and visible is not null;
update public.products set price_cents = price::integer where price_cents is null and price = trunc(price);
update public.products set checkout_url = url where checkout_url is null;
update public.products set whatsapp_number = whatsapp where whatsapp_number is null;
update public.products set is_visible = coalesce(active, is_active, true) where is_visible;
update public.services set price_cents = price::integer where price_cents is null and price is not null and price = trunc(price);
update public.services set whatsapp_number = whatsapp where whatsapp_number is null;
update public.services set is_visible = coalesce(active, is_active, true) where is_visible;

do $$
begin
  if exists (select 1 from public.products where price is not null and price <> trunc(price))
     or exists (select 1 from public.services where price is not null and price <> trunc(price)) then
    raise exception 'legacy product or service prices contain fractional values and cannot be safely converted to price_cents';
  end if;
end;
$$;

insert into public.page_sections (page_id, type, title, position, is_visible)
select source.page_id, source.type, null, coalesce(max(section.position), -1) + 1, true
from (
  select distinct page_id, 'links'::text as type from public.links where section_id is null
  union
  select distinct page_id, 'products'::text as type from public.products where section_id is null
  union
  select distinct page_id, 'services'::text as type from public.services where section_id is null
) source
left join public.page_sections section on section.page_id = source.page_id
where not exists (
  select 1 from public.page_sections existing
  where existing.page_id = source.page_id and existing.type::text = source.type
)
group by source.page_id, source.type;

update public.links content
set section_id = (
  select id from public.page_sections
  where page_id = content.page_id and type::text = 'links'
  order by position, id limit 1
)
where content.section_id is null;

update public.products content
set section_id = (
  select id from public.page_sections
  where page_id = content.page_id and type::text = 'products'
  order by position, id limit 1
)
where content.section_id is null;

update public.services content
set section_id = (
  select id from public.page_sections
  where page_id = content.page_id and type::text = 'services'
  order by position, id limit 1
)
where content.section_id is null;

create table if not exists public.analytics_page_views (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  session_id uuid,
  viewed_at timestamptz not null default now(),
  referrer_host text
);

alter table public.subscriptions
  add column if not exists profile_id uuid,
  add column if not exists plan_id uuid,
  add column if not exists provider_customer_id text,
  add column if not exists current_period_start timestamptz;

update public.subscriptions subscription
set profile_id = user_id
where profile_id is null;

update public.subscriptions subscription
set plan_id = plans.id
from public.plans plans
where subscription.plan_id is null
  and plans.code::text = btrim(subscription.plan::text);

do $$
begin
  if exists (select 1 from public.subscriptions where profile_id is null or plan_id is null) then
    raise exception 'subscriptions could not be safely backfilled';
  end if;

  if (select atttypid from pg_attribute where attrelid = 'public.subscriptions'::regclass and attname = 'provider' and not attisdropped) <> 'public.webhook_provider'::regtype then
    alter table public.subscriptions alter column provider type public.webhook_provider using btrim(provider::text)::public.webhook_provider;
  end if;
  if (select atttypid from pg_attribute where attrelid = 'public.subscriptions'::regclass and attname = 'status' and not attisdropped) <> 'public.subscription_status'::regtype then
    alter table public.subscriptions alter column status type public.subscription_status using btrim(status::text)::public.subscription_status;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.subscriptions'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%(provider, provider_subscription_id)%') then
    alter table public.subscriptions add constraint subscriptions_provider_subscription_id_key unique (provider, provider_subscription_id);
  end if;
end;
$$;

alter table public.webhook_events
  add column if not exists provider_event_id text,
  add column if not exists received_at timestamptz not null default now(),
  add column if not exists processing_error text;

update public.webhook_events
set provider_event_id = btrim(event_id)
where provider_event_id is null;

update public.webhook_events
set received_at = created_at
where received_at is null;

do $$
begin
  if exists (select 1 from public.webhook_events where provider_event_id is null) then
    raise exception 'webhook_events could not be safely backfilled';
  end if;

  if (select atttypid from pg_attribute where attrelid = 'public.webhook_events'::regclass and attname = 'provider' and not attisdropped) <> 'public.webhook_provider'::regtype then
    alter table public.webhook_events alter column provider type public.webhook_provider using btrim(provider::text)::public.webhook_provider;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.webhook_events'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%(provider, provider_event_id)%') then
    alter table public.webhook_events add constraint webhook_events_provider_event_id_key unique (provider, provider_event_id);
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
alter table public.links enable row level security;
alter table public.social_links enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.services enable row level security;
alter table public.media enable row level security;
alter table public.subscriptions enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_page_views enable row level security;
alter table public.analytics_events enable row level security;
alter table public.webhook_events enable row level security;

revoke all on function public.set_updated_at() from public;
revoke all on function public.normalize_username(text) from public;
revoke all on function public.is_reserved_username(text) from public;
