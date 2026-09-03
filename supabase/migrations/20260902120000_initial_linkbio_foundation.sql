create extension if not exists pgcrypto;

create type public.plan_code as enum ('free', 'basic', 'pro');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'paused');
create type public.section_type as enum ('links', 'products', 'services', 'social', 'media', 'text');
create type public.analytics_event_type as enum ('page_view', 'link_click', 'product_click', 'service_click', 'social_click', 'media_view');
create type public.webhook_provider as enum ('stripe', 'whop');

create or replace function public.normalize_username(value text)
returns text
language sql
immutable
strict
as $$
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(btrim(value)), '[^a-z0-9_-]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )),
    ''
  );
$$;

create or replace function public.is_reserved_username(value text)
returns boolean
language sql
immutable
strict
as $$
  select value in (
    'about', 'admin', 'api', 'app', 'auth', 'billing', 'blog', 'dashboard',
    'docs', 'help', 'login', 'logout', 'pricing', 'privacy', 'register',
    'settings', 'signup', 'support', 'terms', 'www'
  );
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text,
  avatar_url text,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  timezone text not null default 'Asia/Riyadh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  constraint profiles_username_not_reserved check (not public.is_reserved_username(username)),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 120)
);

create table public.plans (
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
  updated_at timestamptz not null default now(),
  constraint plans_name_length check (char_length(name) between 1 and 100)
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  title text not null,
  bio text,
  avatar_url text,
  theme jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  is_published boolean not null default false,
  published_at timestamptz,
  custom_domain text unique,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_title_length check (char_length(title) between 1 and 120),
  constraint pages_bio_length check (bio is null or char_length(bio) <= 500),
  constraint pages_publication_timestamp check ((is_published and published_at is not null) or (not is_published and published_at is null)),
  constraint pages_custom_domain_format check (custom_domain is null or custom_domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$')
);

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type public.section_type not null,
  title text,
  position integer not null check (position >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, position),
  constraint page_sections_title_length check (title is null or char_length(title) between 1 and 120)
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.page_sections(id) on delete cascade,
  title text not null,
  url text not null check (url ~* '^https?://'),
  icon text,
  position integer not null check (position >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, position),
  constraint links_title_length check (char_length(title) between 1 and 120)
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  platform text not null,
  url text not null check (url ~* '^https?://'),
  position integer not null check (position >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, platform),
  unique (page_id, position),
  constraint social_links_platform_format check (platform ~ '^[a-z0-9_-]{2,40}$')
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.page_sections(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'SAR' check (currency ~ '^[A-Z]{3}$'),
  checkout_url text check (checkout_url is null or checkout_url ~* '^https?://'),
  whatsapp_number text,
  position integer not null check (position >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, position),
  constraint products_name_length check (char_length(name) between 1 and 160),
  constraint products_description_length check (description is null or char_length(description) <= 2000),
  constraint products_purchase_method check (checkout_url is not null or whatsapp_number is not null)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, position),
  unique (product_id, storage_path),
  constraint product_images_storage_path_format check (storage_path !~ '^/' and char_length(storage_path) between 1 and 1024)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.page_sections(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency char(3) not null default 'SAR' check (currency ~ '^[A-Z]{3}$'),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  booking_url text check (booking_url is null or booking_url ~* '^https?://'),
  whatsapp_number text,
  position integer not null check (position >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, position),
  constraint services_name_length check (char_length(name) between 1 and 160),
  constraint services_description_length check (description is null or char_length(description) <= 2000),
  constraint services_contact_method check (booking_url is not null or whatsapp_number is not null)
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  section_id uuid references public.page_sections(id) on delete set null,
  kind text not null check (kind in ('image', 'video', 'audio', 'file')),
  storage_path text not null,
  title text,
  alt_text text,
  position integer not null default 0 check (position >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, storage_path),
  constraint media_storage_path_format check (storage_path !~ '^/' and char_length(storage_path) between 1 and 1024)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  provider public.webhook_provider not null,
  provider_customer_id text,
  provider_subscription_id text not null,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id),
  constraint subscriptions_period_order check (current_period_end is null or current_period_start is null or current_period_end > current_period_start)
);

create table public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  visitor_hash text not null check (char_length(visitor_hash) between 32 and 128),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  country_code char(2) check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  referrer_host text,
  unique (page_id, visitor_hash)
);

create table public.analytics_page_views (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  session_id uuid references public.analytics_sessions(id) on delete set null,
  viewed_at timestamptz not null default now(),
  referrer_host text
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  session_id uuid references public.analytics_sessions(id) on delete set null,
  event_type public.analytics_event_type not null,
  target_id uuid,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.webhook_provider not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id)
);

create index pages_published_at_idx on public.pages (published_at desc) where is_published;
create index page_sections_public_idx on public.page_sections (page_id, position) where is_visible;
create index links_public_idx on public.links (section_id, position) where is_visible;
create index social_links_public_idx on public.social_links (page_id, position) where is_visible;
create index products_public_idx on public.products (section_id, position) where is_visible;
create index services_public_idx on public.services (section_id, position) where is_visible;
create index media_public_idx on public.media (page_id, position) where is_visible;
create index subscriptions_profile_status_idx on public.subscriptions (profile_id, status);
create index analytics_sessions_page_started_idx on public.analytics_sessions (page_id, started_at desc);
create index analytics_page_views_page_viewed_idx on public.analytics_page_views (page_id, viewed_at desc);
create index analytics_events_page_occurred_idx on public.analytics_events (page_id, occurred_at desc);
create index analytics_events_page_type_occurred_idx on public.analytics_events (page_id, event_type, occurred_at desc);
create index webhook_events_unprocessed_idx on public.webhook_events (received_at) where processed_at is null;

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

create or replace function public.prepare_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'profile id cannot be changed';
  end if;
  new.username := public.normalize_username(new.username);
  if new.username is null or new.username !~ '^[a-z0-9][a-z0-9_-]{2,29}$' then
    raise exception 'username must contain 3-30 lowercase letters, numbers, underscores, or hyphens';
  end if;
  if public.is_reserved_username(new.username) then
    raise exception 'username is reserved';
  end if;
  return new;
end;
$$;

create or replace function public.sync_page_publication_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    new.published_at := now();
  elsif not new.is_published then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.validate_analytics_session_page()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.session_id is not null and not exists (
    select 1 from public.analytics_sessions session
    where session.id = new.session_id and session.page_id = new.page_id
  ) then
    raise exception 'analytics session does not belong to page';
  end if;
  return new;
end;
$$;

create or replace function public.validate_section_content_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.page_sections section
    where section.id = new.section_id and section.type::text = tg_argv[0]
  ) then
    raise exception 'content must belong to a matching section type';
  end if;
  return new;
end;
$$;

create or replace function public.validate_media_section_page()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.section_id is not null and not exists (
    select 1 from public.page_sections section
    where section.id = new.section_id and section.page_id = new.page_id
  ) then
    raise exception 'media section must belong to its page';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  candidate := public.normalize_username(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  if candidate is null or public.is_reserved_username(candidate) or candidate !~ '^[a-z0-9][a-z0-9_-]{2,29}$' or exists (select 1 from public.profiles where username = candidate) then
    candidate := 'user-' || replace(left(new.id::text, 8), '-', '');
  end if;
  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, candidate, nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'avatar_url', ''));
  return new;
end;
$$;

create trigger profiles_prepare_before_write before insert or update on public.profiles for each row execute function public.prepare_profile();
create trigger pages_sync_publication_before_write before insert or update on public.pages for each row execute function public.sync_page_publication_timestamp();
create trigger analytics_page_views_validate_session before insert or update on public.analytics_page_views for each row execute function public.validate_analytics_session_page();
create trigger analytics_events_validate_session before insert or update on public.analytics_events for each row execute function public.validate_analytics_session_page();
create trigger links_validate_section_type before insert or update on public.links for each row execute function public.validate_section_content_type('links');
create trigger products_validate_section_type before insert or update on public.products for each row execute function public.validate_section_content_type('products');
create trigger services_validate_section_type before insert or update on public.services for each row execute function public.validate_section_content_type('services');
create trigger media_validate_section_page before insert or update on public.media for each row execute function public.validate_media_section_page();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger plans_set_updated_at before update on public.plans for each row execute function public.set_updated_at();
create trigger pages_set_updated_at before update on public.pages for each row execute function public.set_updated_at();
create trigger page_sections_set_updated_at before update on public.page_sections for each row execute function public.set_updated_at();
create trigger links_set_updated_at before update on public.links for each row execute function public.set_updated_at();
create trigger social_links_set_updated_at before update on public.social_links for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger media_set_updated_at before update on public.media for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

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

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_select_published_page on public.profiles for select to anon, authenticated using (exists (select 1 from public.pages page where page.profile_id = id and page.is_published));
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy plans_select_active on public.plans for select to anon, authenticated using (is_active);
create policy pages_select_owner on public.pages for select to authenticated using ((select auth.uid()) = profile_id);
create policy pages_select_published on public.pages for select to anon, authenticated using (is_published);
create policy pages_insert_own on public.pages for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy pages_update_own on public.pages for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy pages_delete_own on public.pages for delete to authenticated using ((select auth.uid()) = profile_id);
create policy page_sections_owner_manage on public.page_sections for all to authenticated using (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid()))) with check (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid())));
create policy page_sections_select_public on public.page_sections for select to anon, authenticated using (is_visible and exists (select 1 from public.pages page where page.id = page_id and page.is_published));
create policy links_owner_manage on public.links for all to authenticated using (exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and page.profile_id = (select auth.uid()))) with check (exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and page.profile_id = (select auth.uid())));
create policy links_select_public on public.links for select to anon, authenticated using (is_visible and exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and section.is_visible and page.is_published));
create policy social_links_owner_manage on public.social_links for all to authenticated using (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid()))) with check (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid())));
create policy social_links_select_public on public.social_links for select to anon, authenticated using (is_visible and exists (select 1 from public.pages page where page.id = page_id and page.is_published));
create policy products_owner_manage on public.products for all to authenticated using (exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and page.profile_id = (select auth.uid()))) with check (exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and page.profile_id = (select auth.uid())));
create policy products_select_public on public.products for select to anon, authenticated using (is_visible and exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and section.is_visible and page.is_published));
create policy product_images_owner_manage on public.product_images for all to authenticated using (exists (select 1 from public.products product join public.page_sections section on section.id = product.section_id join public.pages page on page.id = section.page_id where product.id = product_id and page.profile_id = (select auth.uid()))) with check (exists (select 1 from public.products product join public.page_sections section on section.id = product.section_id join public.pages page on page.id = section.page_id where product.id = product_id and page.profile_id = (select auth.uid())));
create policy product_images_select_public on public.product_images for select to anon, authenticated using (exists (select 1 from public.products product join public.page_sections section on section.id = product.section_id join public.pages page on page.id = section.page_id where product.id = product_id and product.is_visible and section.is_visible and page.is_published));
create policy services_owner_manage on public.services for all to authenticated using (exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and page.profile_id = (select auth.uid()))) with check (exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and page.profile_id = (select auth.uid())));
create policy services_select_public on public.services for select to anon, authenticated using (is_visible and exists (select 1 from public.page_sections section join public.pages page on page.id = section.page_id where section.id = section_id and section.is_visible and page.is_published));
create policy media_owner_manage on public.media for all to authenticated using (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid()))) with check (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid())));
create policy media_select_public on public.media for select to anon, authenticated using (is_visible and exists (select 1 from public.pages page where page.id = page_id and page.is_published));
create policy subscriptions_select_own on public.subscriptions for select to authenticated using (profile_id = (select auth.uid()));
create policy analytics_sessions_select_owner on public.analytics_sessions for select to authenticated using (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid())));
create policy analytics_sessions_insert_published on public.analytics_sessions for insert to anon, authenticated with check (exists (select 1 from public.pages page where page.id = page_id and page.is_published));
create policy analytics_page_views_select_owner on public.analytics_page_views for select to authenticated using (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid())));
create policy analytics_page_views_insert_published on public.analytics_page_views for insert to anon, authenticated with check (exists (select 1 from public.pages page where page.id = page_id and page.is_published));
create policy analytics_events_select_owner on public.analytics_events for select to authenticated using (exists (select 1 from public.pages page where page.id = page_id and page.profile_id = (select auth.uid())));
create policy analytics_events_insert_published on public.analytics_events for insert to anon, authenticated with check (exists (select 1 from public.pages page where page.id = page_id and page.is_published));

grant select, update on public.profiles to authenticated;
grant select on public.plans to anon, authenticated;
grant select, insert, update, delete on public.pages, public.page_sections, public.links, public.social_links, public.products, public.product_images, public.services, public.media to authenticated;
grant select on public.pages, public.page_sections, public.links, public.social_links, public.products, public.product_images, public.services, public.media to anon;
grant select on public.subscriptions to authenticated;
grant select, insert on public.analytics_sessions, public.analytics_page_views, public.analytics_events to anon, authenticated;

revoke all on function public.normalize_username(text) from public;
revoke all on function public.is_reserved_username(text) from public;
revoke all on function public.set_updated_at() from public;
revoke all on function public.prepare_profile() from public;
revoke all on function public.sync_page_publication_timestamp() from public;
revoke all on function public.validate_analytics_session_page() from public;
revoke all on function public.validate_section_content_type() from public;
revoke all on function public.validate_media_section_page() from public;
revoke all on function public.handle_new_user() from public;
