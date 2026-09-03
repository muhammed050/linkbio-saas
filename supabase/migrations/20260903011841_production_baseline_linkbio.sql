create extension if not exists pgcrypto;

create type public.plan_code as enum ('free','pro','business');
create type public.subscription_status as enum ('trialing','active','past_due','canceled','unpaid','incomplete','paused');
create type public.section_type as enum ('links','products','services','social','media','text');
create type public.analytics_event_type as enum ('page_view','link_click','product_click','service_click','social_click','media_view');
create type public.webhook_provider as enum ('stripe','whop');
create type public.app_role as enum ('admin');
create type public.webhook_event_status as enum ('received','processing','processed','failed');

create or replace function public.normalize_username(value text) returns text language sql immutable strict set search_path=public as $$ select nullif(trim(both '-' from regexp_replace(regexp_replace(lower(btrim(value)),'[^a-z0-9_-]+','-','g'),'-{2,}','-','g')),''); $$;
create or replace function public.is_reserved_username(value text) returns boolean language sql immutable strict set search_path=public as $$ select value in ('about','admin','api','app','auth','billing','blog','dashboard','docs','help','login','logout','pricing','privacy','register','settings','signup','support','terms','www'); $$;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique,
 full_name text,
 avatar_url text,
 locale text not null default 'ar' check(locale in ('ar','en')),
 timezone text not null default 'Asia/Riyadh',
 plan_type public.plan_code not null default 'free',
 whop_user_id text,
 whop_plan_id text,
 entitlement_provider_created_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint profiles_username_format check(username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
 constraint profiles_username_not_reserved check(not public.is_reserved_username(username)),
 constraint profiles_full_name_length check(full_name is null or char_length(full_name) between 1 and 120)
);
create unique index profiles_whop_user_id_unique_idx on public.profiles(whop_user_id) where whop_user_id is not null;

create table public.plans (
 id uuid primary key default gen_random_uuid(), code public.plan_code not null unique,
 name text not null, description text, price_cents integer not null default 0 check(price_cents>=0),
 currency char(3) not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
 billing_interval text not null default 'month' check(billing_interval in ('month','year','lifetime')),
 external_price_id text unique, is_active boolean not null default true,
 limits jsonb not null default '{}'::jsonb check(jsonb_typeof(limits)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.pages (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null unique references public.profiles(id) on delete cascade,
 title text not null, bio text, avatar_url text, theme jsonb not null default '{}'::jsonb check(jsonb_typeof(theme)='object'),
 is_published boolean not null default false, published_at timestamptz, custom_domain text unique, seo_title text, seo_description text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pages_title_length check(char_length(title) between 1 and 120),
 constraint pages_bio_length check(bio is null or char_length(bio)<=500),
 constraint pages_publication_timestamp check((is_published and published_at is not null) or (not is_published and published_at is null)),
 constraint pages_custom_domain_format check(custom_domain is null or custom_domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$')
);

create table public.page_sections (
 id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade,
 type public.section_type not null, title text, position integer not null check(position>=0), is_visible boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(page_id,position),
 constraint page_sections_title_length check(title is null or char_length(title) between 1 and 120)
);
create table public.links (
 id uuid primary key default gen_random_uuid(), section_id uuid not null references public.page_sections(id) on delete cascade,
 title text not null, url text not null check(url ~* '^https?://'), icon text, position integer not null check(position>=0), is_visible boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(section_id,position), constraint links_title_length check(char_length(title) between 1 and 120)
);
create table public.social_links (
 id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade,
 platform text not null, url text not null check(url ~* '^https?://'), position integer not null check(position>=0), is_visible boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(page_id,platform), unique(page_id,position), constraint social_links_platform_format check(platform ~ '^[a-z0-9_-]{2,40}$')
);
create table public.products (
 id uuid primary key default gen_random_uuid(), section_id uuid not null references public.page_sections(id) on delete cascade,
 name text not null, description text, price_cents integer not null check(price_cents>=0), currency char(3) not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
 checkout_url text check(checkout_url is null or checkout_url ~* '^https?://'), whatsapp_number text, position integer not null check(position>=0), is_visible boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(section_id,position),
 constraint products_name_length check(char_length(name) between 1 and 160), constraint products_description_length check(description is null or char_length(description)<=2000), constraint products_purchase_method check(checkout_url is not null or whatsapp_number is not null)
);
create table public.product_images (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 storage_path text not null, alt_text text, position integer not null check(position>=0), created_at timestamptz not null default now(), unique(product_id,position), unique(product_id,storage_path),
 constraint product_images_storage_path_format check(storage_path !~ '^/' and char_length(storage_path) between 1 and 1024)
);
create table public.services (
 id uuid primary key default gen_random_uuid(), section_id uuid not null references public.page_sections(id) on delete cascade,
 name text not null, description text, price_cents integer check(price_cents is null or price_cents>=0), currency char(3) not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
 duration_minutes integer check(duration_minutes is null or duration_minutes>0), booking_url text check(booking_url is null or booking_url ~* '^https?://'), whatsapp_number text,
 position integer not null check(position>=0), is_visible boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(section_id,position),
 constraint services_name_length check(char_length(name) between 1 and 160), constraint services_description_length check(description is null or char_length(description)<=2000), constraint services_contact_method check(booking_url is not null or whatsapp_number is not null)
);
create table public.media (
 id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade, section_id uuid references public.page_sections(id) on delete set null,
 kind text not null check(kind in ('image','video','audio','file')), storage_path text not null, title text, alt_text text, position integer not null default 0 check(position>=0), is_visible boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(page_id,storage_path), constraint media_storage_path_format check(storage_path !~ '^/' and char_length(storage_path) between 1 and 1024)
);
create table public.subscriptions (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade, plan_id uuid not null references public.plans(id) on delete restrict,
 provider public.webhook_provider not null, provider_customer_id text, provider_subscription_id text not null, provider_product_id text, provider_price_id text,
 status public.subscription_status not null, current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean not null default false,
 trial_end timestamptz, canceled_at timestamptz, ended_at timestamptz, provider_metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(provider_metadata)='object'),
 last_provider_event_id text, last_provider_created_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(provider,provider_subscription_id), constraint subscriptions_period_order check(current_period_end is null or current_period_start is null or current_period_end>current_period_start)
);
create table public.plan_prices (
 id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.plans(id) on delete restrict, provider public.webhook_provider not null,
 billing_interval text not null check(billing_interval in ('month','year','lifetime')), currency char(3) not null check(currency ~ '^[A-Z]{3}$'), price_cents integer not null check(price_cents>=0),
 external_price_id text unique, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(plan_id,provider,billing_interval,currency)
);
create table public.user_roles(user_id uuid not null references auth.users(id) on delete cascade, role public.app_role not null, created_at timestamptz not null default now(), primary key(user_id,role));
create table public.analytics_sessions (
 id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade, visitor_hash text not null check(char_length(visitor_hash) between 32 and 128),
 started_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), country_code char(2), referrer_host text, unique(page_id,visitor_hash), constraint analytics_sessions_country_format check(country_code is null or country_code ~ '^[A-Z]{2}$')
);
create table public.analytics_page_views (
 id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade, session_id uuid references public.analytics_sessions(id) on delete set null,
 viewed_at timestamptz not null default now(), referrer_host text
);
create table public.analytics_events (
 id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade, session_id uuid references public.analytics_sessions(id) on delete set null,
 event_type public.analytics_event_type not null, target_id uuid, occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object')
);
create table public.webhook_events (
 id uuid primary key default gen_random_uuid(), provider public.webhook_provider not null, provider_event_id text not null, event_type text not null,
 payload jsonb not null default '{}'::jsonb check(jsonb_typeof(payload)='object'), received_at timestamptz not null default now(), processed_at timestamptz,
 processing_error text, status public.webhook_event_status not null default 'received', processing_started_at timestamptz, processing_attempts integer not null default 0 check(processing_attempts>=0),
 signature_verified_at timestamptz, provider_created_at timestamptz, updated_at timestamptz not null default now(), unique(provider,provider_event_id),
 constraint webhook_event_id_not_blank check(char_length(btrim(provider_event_id)) between 1 and 255), constraint webhook_event_type_not_blank check(char_length(btrim(event_type)) between 1 and 255),
 constraint webhook_processing_state check((status='processed' and processed_at is not null and processing_error is null) or (status='failed' and processing_error is not null) or (status in ('received','processing') and processed_at is null))
);

create index pages_published_at_idx on public.pages(published_at desc) where is_published;
create index page_sections_public_idx on public.page_sections(page_id,position) where is_visible;
create index links_public_idx on public.links(section_id,position) where is_visible;
create index social_links_public_idx on public.social_links(page_id,position) where is_visible;
create index products_public_idx on public.products(section_id,position) where is_visible;
create index services_public_idx on public.services(section_id,position) where is_visible;
create index media_public_idx on public.media(page_id,position) where is_visible;
create index subscriptions_profile_status_idx on public.subscriptions(profile_id,status);
create index subscriptions_provider_customer_idx on public.subscriptions(provider,provider_customer_id) where provider_customer_id is not null;
create index subscriptions_profile_whop_entitlement_idx on public.subscriptions(profile_id,last_provider_created_at desc) where provider='whop' and status in ('active','trialing');
create index plan_prices_active_lookup_idx on public.plan_prices(plan_id,billing_interval,currency) where is_active;
create index analytics_sessions_page_started_idx on public.analytics_sessions(page_id,started_at desc);
create index analytics_page_views_page_viewed_idx on public.analytics_page_views(page_id,viewed_at desc);
create index analytics_events_page_occurred_idx on public.analytics_events(page_id,occurred_at desc);
create index analytics_events_page_type_occurred_idx on public.analytics_events(page_id,event_type,occurred_at desc);
create index webhook_events_status_received_idx on public.webhook_events(received_at) where status in ('received','failed');

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end; $$;
create or replace function public.prepare_profile() returns trigger language plpgsql set search_path=public as $$ begin if tg_op='UPDATE' and new.id is distinct from old.id then raise exception 'profile id cannot be changed'; end if; new.username:=public.normalize_username(new.username); if new.username is null or new.username !~ '^[a-z0-9][a-z0-9_-]{2,29}$' then raise exception 'invalid username'; end if; if public.is_reserved_username(new.username) then raise exception 'username is reserved'; end if; return new; end; $$;
create or replace function public.sync_page_publication_timestamp() returns trigger language plpgsql set search_path=public as $$ begin if new.is_published and (tg_op='INSERT' or not old.is_published) then new.published_at:=coalesce(new.published_at,now()); elsif not new.is_published then new.published_at:=null; end if; return new; end; $$;
create or replace function public.validate_analytics_session_page() returns trigger language plpgsql set search_path=public as $$ begin if new.session_id is not null and not exists(select 1 from public.analytics_sessions s where s.id=new.session_id and s.page_id=new.page_id) then raise exception 'analytics session does not belong to page'; end if; return new; end; $$;
create or replace function public.validate_media_section_page() returns trigger language plpgsql set search_path=public as $$ begin if new.section_id is not null and not exists(select 1 from public.page_sections s where s.id=new.section_id and s.page_id=new.page_id) then raise exception 'media section must belong to page'; end if; return new; end; $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ declare candidate text; begin candidate:=public.normalize_username(coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1))); if candidate is null or public.is_reserved_username(candidate) or candidate !~ '^[a-z0-9][a-z0-9_-]{2,29}$' or exists(select 1 from public.profiles where username=candidate) then candidate:='user-'||replace(left(new.id::text,8),'-',''); end if; insert into public.profiles(id,username,full_name,avatar_url) values(new.id,candidate,nullif(new.raw_user_meta_data->>'full_name',''),new.raw_user_meta_data->>'avatar_url'); return new; end; $$;
create trigger profiles_prepare before insert or update on public.profiles for each row execute function public.prepare_profile();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger pages_set_updated_at before update on public.pages for each row execute function public.set_updated_at();
create trigger pages_publication_timestamp before insert or update on public.pages for each row execute function public.sync_page_publication_timestamp();
create trigger page_sections_set_updated_at before update on public.page_sections for each row execute function public.set_updated_at();
create trigger links_set_updated_at before update on public.links for each row execute function public.set_updated_at();
create trigger social_links_set_updated_at before update on public.social_links for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger media_set_updated_at before update on public.media for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger plan_prices_set_updated_at before update on public.plan_prices for each row execute function public.set_updated_at();
create trigger webhook_events_set_updated_at before update on public.webhook_events for each row execute function public.set_updated_at();
create trigger analytics_page_views_validate before insert or update on public.analytics_page_views for each row execute function public.validate_analytics_session_page();
create trigger analytics_events_validate before insert or update on public.analytics_events for each row execute function public.validate_analytics_session_page();
create trigger media_validate before insert or update on public.media for each row execute function public.validate_media_section_page();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'::public.app_role); $$;
revoke all on function public.is_admin() from public; grant execute on function public.is_admin() to authenticated,service_role;

insert into public.plans(code,name,description,price_cents,currency,billing_interval,limits,is_active) values
('free','Free','Get started with a simple link page.',0,'USD','month','{"links":5,"products":0,"services":0,"sections":2,"custom_domain":false,"analytics":false,"qr_code":false,"seo_metadata":false}',true),
('pro','Pro','For creators who need growth tools.',2900,'USD','month','{"links":-1,"products":-1,"services":-1,"sections":-1,"custom_domain":true,"analytics":true,"qr_code":true,"seo_metadata":true}',true),
('business','Business','For businesses that need advanced capacity and support.',7900,'USD','month','{"links":-1,"products":-1,"services":-1,"sections":-1,"custom_domain":true,"analytics":true,"qr_code":true,"seo_metadata":true}',true);
insert into public.plan_prices(plan_id,provider,billing_interval,currency,price_cents,is_active) select id,'whop','month','USD',price_cents,true from public.plans where code in ('pro','business');

revoke all on all tables in schema public from anon,authenticated;
revoke all on all sequences in schema public from anon,authenticated;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_prices enable row level security;
alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
alter table public.links enable row level security;
alter table public.social_links enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.services enable row level security;
alter table public.media enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_roles enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_page_views enable row level security;
alter table public.analytics_events enable row level security;
alter table public.webhook_events enable row level security;

create policy profiles_owner_select on public.profiles for select to authenticated using ((select auth.uid())=id or (select public.is_admin()));
create policy profiles_owner_insert on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy profiles_owner_update on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy profiles_public_safe_select on public.profiles for select to anon using (exists(select 1 from public.pages p where p.profile_id=profiles.id and p.is_published));
create policy plans_public_select on public.plans for select to anon,authenticated using (is_active);
create policy plans_admin_all on public.plans for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy plan_prices_public_select on public.plan_prices for select to anon,authenticated using (is_active);
create policy plan_prices_admin_all on public.plan_prices for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy pages_public_select on public.pages for select to anon,authenticated using (is_published or (select auth.uid())=profile_id);
create policy pages_owner_insert on public.pages for insert to authenticated with check ((select auth.uid())=profile_id);
create policy pages_owner_update on public.pages for update to authenticated using ((select auth.uid())=profile_id) with check ((select auth.uid())=profile_id);
create policy pages_owner_delete on public.pages for delete to authenticated using ((select auth.uid())=profile_id);
create policy sections_public_select on public.page_sections for select to anon,authenticated using (exists(select 1 from public.pages p where p.id=page_sections.page_id and (p.is_published or p.profile_id=(select auth.uid()))));
create policy sections_owner_insert on public.page_sections for insert to authenticated with check (exists(select 1 from public.pages p where p.id=page_sections.page_id and p.profile_id=(select auth.uid())));
create policy sections_owner_update on public.page_sections for update to authenticated using (exists(select 1 from public.pages p where p.id=page_sections.page_id and p.profile_id=(select auth.uid()))) with check (exists(select 1 from public.pages p where p.id=page_sections.page_id and p.profile_id=(select auth.uid())));
create policy sections_owner_delete on public.page_sections for delete to authenticated using (exists(select 1 from public.pages p where p.id=page_sections.page_id and p.profile_id=(select auth.uid())));
create policy links_public_select on public.links for select to anon,authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=links.section_id and s.is_visible and (p.is_published or p.profile_id=(select auth.uid()))));
create policy links_owner_insert on public.links for insert to authenticated with check (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=links.section_id and p.profile_id=(select auth.uid())));
create policy links_owner_update on public.links for update to authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=links.section_id and p.profile_id=(select auth.uid()))) with check (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=links.section_id and p.profile_id=(select auth.uid())));
create policy links_owner_delete on public.links for delete to authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=links.section_id and p.profile_id=(select auth.uid())));
create policy social_public_select on public.social_links for select to anon,authenticated using (exists(select 1 from public.pages p where p.id=social_links.page_id and (p.is_published or p.profile_id=(select auth.uid()))) and is_visible);
create policy social_owner_insert on public.social_links for insert to authenticated with check (exists(select 1 from public.pages p where p.id=social_links.page_id and p.profile_id=(select auth.uid())));
create policy social_owner_update on public.social_links for update to authenticated using (exists(select 1 from public.pages p where p.id=social_links.page_id and p.profile_id=(select auth.uid()))) with check (exists(select 1 from public.pages p where p.id=social_links.page_id and p.profile_id=(select auth.uid())));
create policy social_owner_delete on public.social_links for delete to authenticated using (exists(select 1 from public.pages p where p.id=social_links.page_id and p.profile_id=(select auth.uid())));
create policy products_public_select on public.products for select to anon,authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=products.section_id and s.is_visible and (p.is_published or p.profile_id=(select auth.uid()))) and is_visible);
create policy products_owner_insert on public.products for insert to authenticated with check (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=products.section_id and p.profile_id=(select auth.uid())));
create policy products_owner_update on public.products for update to authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=products.section_id and p.profile_id=(select auth.uid()))) with check (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=products.section_id and p.profile_id=(select auth.uid())));
create policy products_owner_delete on public.products for delete to authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=products.section_id and p.profile_id=(select auth.uid())));
create policy product_images_public_select on public.product_images for select to anon,authenticated using (exists(select 1 from public.products x join public.page_sections s on s.id=x.section_id join public.pages p on p.id=s.page_id where x.id=product_images.product_id and (p.is_published or p.profile_id=(select auth.uid()))));
create policy product_images_owner_insert on public.product_images for insert to authenticated with check (exists(select 1 from public.products x join public.page_sections s on s.id=x.section_id join public.pages p on p.id=s.page_id where x.id=product_images.product_id and p.profile_id=(select auth.uid())));
create policy product_images_owner_update on public.product_images for update to authenticated using (exists(select 1 from public.products x join public.page_sections s on s.id=x.section_id join public.pages p on p.id=s.page_id where x.id=product_images.product_id and p.profile_id=(select auth.uid()))) with check (exists(select 1 from public.products x join public.page_sections s on s.id=x.section_id join public.pages p on p.id=s.page_id where x.id=product_images.product_id and p.profile_id=(select auth.uid())));
create policy product_images_owner_delete on public.product_images for delete to authenticated using (exists(select 1 from public.products x join public.page_sections s on s.id=x.section_id join public.pages p on p.id=s.page_id where x.id=product_images.product_id and p.profile_id=(select auth.uid())));
create policy services_public_select on public.services for select to anon,authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=services.section_id and s.is_visible and (p.is_published or p.profile_id=(select auth.uid()))) and is_visible);
create policy services_owner_insert on public.services for insert to authenticated with check (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=services.section_id and p.profile_id=(select auth.uid())));
create policy services_owner_update on public.services for update to authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=services.section_id and p.profile_id=(select auth.uid()))) with check (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=services.section_id and p.profile_id=(select auth.uid())));
create policy services_owner_delete on public.services for delete to authenticated using (exists(select 1 from public.page_sections s join public.pages p on p.id=s.page_id where s.id=services.section_id and p.profile_id=(select auth.uid())));
create policy media_public_select on public.media for select to anon,authenticated using (exists(select 1 from public.pages p where p.id=media.page_id and (p.is_published or p.profile_id=(select auth.uid()))) and is_visible);
create policy media_owner_insert on public.media for insert to authenticated with check (exists(select 1 from public.pages p where p.id=media.page_id and p.profile_id=(select auth.uid())));
create policy media_owner_update on public.media for update to authenticated using (exists(select 1 from public.pages p where p.id=media.page_id and p.profile_id=(select auth.uid()))) with check (exists(select 1 from public.pages p where p.id=media.page_id and p.profile_id=(select auth.uid())));
create policy media_owner_delete on public.media for delete to authenticated using (exists(select 1 from public.pages p where p.id=media.page_id and p.profile_id=(select auth.uid())));
create policy subscriptions_owner_select on public.subscriptions for select to authenticated using (profile_id=(select auth.uid()));
create policy subscriptions_admin_select on public.subscriptions for select to authenticated using ((select public.is_admin()));
create policy subscriptions_admin_insert on public.subscriptions for insert to authenticated with check ((select public.is_admin()));
create policy subscriptions_admin_update on public.subscriptions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy subscriptions_admin_delete on public.subscriptions for delete to authenticated using ((select public.is_admin()));
create policy user_roles_admin_select on public.user_roles for select to authenticated using ((select public.is_admin()));
create policy analytics_sessions_owner_select on public.analytics_sessions for select to authenticated using (exists(select 1 from public.pages p where p.id=analytics_sessions.page_id and p.profile_id=(select auth.uid())));
create policy analytics_page_views_owner_select on public.analytics_page_views for select to authenticated using (exists(select 1 from public.pages p where p.id=analytics_page_views.page_id and p.profile_id=(select auth.uid())));
create policy analytics_events_owner_select on public.analytics_events for select to authenticated using (exists(select 1 from public.pages p where p.id=analytics_events.page_id and p.profile_id=(select auth.uid())));
create policy webhook_events_admin_select on public.webhook_events for select to authenticated using ((select public.is_admin()));

grant select(username,full_name,avatar_url) on public.profiles to anon;
grant select,insert,update on public.profiles to authenticated;
grant select on public.plans,public.plan_prices to anon;
grant select,insert,update,delete on public.plans,public.plan_prices to authenticated;
grant select,insert,update,delete on public.pages,public.page_sections,public.links,public.social_links,public.products,public.product_images,public.services,public.media to authenticated;
grant select on public.pages,public.page_sections,public.links,public.social_links,public.products,public.product_images,public.services,public.media to anon;
grant select on public.subscriptions,public.analytics_sessions,public.analytics_page_views,public.analytics_events,public.webhook_events to authenticated;
grant select,insert,update,delete on public.subscriptions to authenticated;
grant select on public.user_roles to authenticated;
grant all on all tables in schema public to service_role;
revoke update on public.profiles from authenticated;
grant update(username,full_name,avatar_url,locale,timezone) on public.profiles to authenticated;

create or replace view public.published_profiles with (security_invoker=true,security_barrier=true) as select p.id,p.username,p.full_name,p.avatar_url from public.profiles p join public.pages pg on pg.profile_id=p.id where pg.is_published;
revoke all on public.published_profiles from public;
grant select on public.published_profiles to anon,authenticated;

create or replace function public.claim_whop_webhook_event(p_provider_event_id text,p_event_type text,p_payload jsonb,p_provider_created_at timestamptz,p_signature_verified_at timestamptz default now()) returns table(event_id uuid,disposition text,processing_attempts integer) language plpgsql security definer set search_path='' as $$ begin if coalesce((select auth.jwt()->>'role'),'') <> 'service_role' then raise exception 'claim_whop_webhook_event is restricted to service_role' using errcode='42501'; end if; if char_length(btrim(p_provider_event_id)) not between 1 and 255 or char_length(btrim(p_event_type)) not between 1 and 255 or jsonb_typeof(p_payload)<>'object' then raise exception 'invalid Whop webhook event' using errcode='22023'; end if; return query with claimed as (insert into public.webhook_events(provider,provider_event_id,event_type,payload,status,processing_started_at,processing_attempts,signature_verified_at,provider_created_at) values('whop',btrim(p_provider_event_id),btrim(p_event_type),p_payload,'processing',now(),1,p_signature_verified_at,p_provider_created_at) on conflict(provider,provider_event_id) do update set status='processing',processing_started_at=now(),processing_attempts=public.webhook_events.processing_attempts+1,processing_error=null,signature_verified_at=coalesce(public.webhook_events.signature_verified_at,excluded.signature_verified_at),provider_created_at=coalesce(public.webhook_events.provider_created_at,excluded.provider_created_at) where public.webhook_events.status in ('received','failed') or (public.webhook_events.status='processing' and (public.webhook_events.processing_started_at is null or public.webhook_events.processing_started_at<=now()-interval '15 minutes')) returning public.webhook_events.id,public.webhook_events.processing_attempts) select claimed.id,'claimed',claimed.processing_attempts from claimed; if found then return; end if; return query select e.id,case when e.status='processed' then 'already_processed' else 'in_progress' end,e.processing_attempts from public.webhook_events e where e.provider='whop' and e.provider_event_id=btrim(p_provider_event_id); end; $$;
create or replace function public.apply_whop_membership_event(p_event_id uuid,p_profile_id uuid,p_plan_id uuid,p_provider_subscription_id text,p_provider_customer_id text,p_provider_product_id text,p_provider_price_id text,p_status public.subscription_status,p_current_period_start timestamptz,p_current_period_end timestamptz,p_cancel_at_period_end boolean,p_trial_end timestamptz,p_canceled_at timestamptz,p_ended_at timestamptz,p_provider_metadata jsonb,p_provider_created_at timestamptz) returns table(subscription_applied boolean,entitlement_applied boolean) language plpgsql security definer set search_path='' as $$ declare v_event_status public.webhook_event_status; v_event_provider_created_at timestamptz; v_existing_profile_id uuid; v_rows integer; v_subscription_applied boolean:=false; v_entitlement_applied boolean:=false; v_plan_type public.plan_code; v_price_id text; begin if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'apply_whop_membership_event is restricted to service_role' using errcode='42501'; end if; if char_length(btrim(p_provider_subscription_id))=0 or p_provider_created_at is null or jsonb_typeof(p_provider_metadata)<>'object' then raise exception 'invalid Whop membership event' using errcode='22023'; end if; select e.status,e.provider_created_at into v_event_status,v_event_provider_created_at from public.webhook_events e where e.id=p_event_id and e.provider='whop' for update; if not found then raise exception 'Whop webhook event was not claimed' using errcode='P0002'; end if; if v_event_status='processed' then return query select false,false; return; end if; if v_event_status<>'processing' then raise exception 'Whop webhook event is not being processed' using errcode='55000'; end if; if v_event_provider_created_at is distinct from p_provider_created_at then raise exception 'Whop membership timestamp must match the claimed event' using errcode='22023'; end if; perform 1 from public.plans where id=p_plan_id and is_active; if not found then raise exception 'Whop membership references an unavailable plan' using errcode='23503'; end if; perform 1 from public.profiles where id=p_profile_id for update; if not found then raise exception 'Whop membership profile was not found' using errcode='P0002'; end if; select s.profile_id into v_existing_profile_id from public.subscriptions s where s.provider='whop' and s.provider_subscription_id=btrim(p_provider_subscription_id) for update; if found and v_existing_profile_id<>p_profile_id then raise exception 'Whop subscription cannot be reassigned to another profile' using errcode='23514'; end if; insert into public.subscriptions(profile_id,plan_id,provider,provider_customer_id,provider_subscription_id,provider_product_id,provider_price_id,status,current_period_start,current_period_end,cancel_at_period_end,trial_end,canceled_at,ended_at,provider_metadata,last_provider_event_id,last_provider_created_at) values(p_profile_id,p_plan_id,'whop',nullif(btrim(p_provider_customer_id),''),btrim(p_provider_subscription_id),nullif(btrim(p_provider_product_id),''),nullif(btrim(p_provider_price_id),''),p_status,p_current_period_start,p_current_period_end,coalesce(p_cancel_at_period_end,false),p_trial_end,p_canceled_at,p_ended_at,p_provider_metadata,(select provider_event_id from public.webhook_events where id=p_event_id),p_provider_created_at) on conflict(provider,provider_subscription_id) do update set plan_id=excluded.plan_id,provider_customer_id=excluded.provider_customer_id,provider_product_id=excluded.provider_product_id,provider_price_id=excluded.provider_price_id,status=excluded.status,current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,trial_end=excluded.trial_end,canceled_at=excluded.canceled_at,ended_at=excluded.ended_at,provider_metadata=excluded.provider_metadata,last_provider_event_id=excluded.last_provider_event_id,last_provider_created_at=excluded.last_provider_created_at where public.subscriptions.profile_id=excluded.profile_id and (public.subscriptions.last_provider_created_at is null or excluded.last_provider_created_at>public.subscriptions.last_provider_created_at); get diagnostics v_rows=row_count; v_subscription_applied=v_rows>0; if v_subscription_applied then select pl.code,s.provider_price_id into v_plan_type,v_price_id from public.subscriptions s join public.plans pl on pl.id=s.plan_id where s.profile_id=p_profile_id and s.provider='whop' and s.status in ('active','trialing') order by s.last_provider_created_at desc nulls last,s.updated_at desc limit 1; update public.profiles p set plan_type=coalesce(v_plan_type,'free'),whop_user_id=coalesce(nullif(btrim(p_provider_customer_id),''),p.whop_user_id),whop_plan_id=v_price_id,entitlement_provider_created_at=p_provider_created_at where p.id=p_profile_id and (p.entitlement_provider_created_at is null or p_provider_created_at>p.entitlement_provider_created_at); get diagnostics v_rows=row_count; v_entitlement_applied=v_rows>0; end if; update public.webhook_events set status='processed',processed_at=now(),processing_error=null where id=p_event_id; return query select v_subscription_applied,v_entitlement_applied; end; $$;
create or replace function public.fail_whop_webhook_event(p_event_id uuid,p_processing_error text) returns void language plpgsql security definer set search_path='' as $$ begin if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'fail_whop_webhook_event is restricted to service_role' using errcode='42501'; end if; update public.webhook_events set status='failed',processing_error=left(coalesce(nullif(btrim(p_processing_error),''),'Unknown processing error'),2000) where id=p_event_id and provider='whop' and status='processing'; if not found then raise exception 'Whop webhook event is not being processed' using errcode='55000'; end if; end; $$;
revoke all on function public.claim_whop_webhook_event(text,text,jsonb,timestamptz,timestamptz),public.apply_whop_membership_event(uuid,uuid,uuid,text,text,text,text,public.subscription_status,timestamptz,timestamptz,boolean,timestamptz,timestamptz,timestamptz,jsonb,timestamptz),public.fail_whop_webhook_event(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_whop_webhook_event(text,text,jsonb,timestamptz,timestamptz),public.apply_whop_membership_event(uuid,uuid,uuid,text,text,text,text,public.subscription_status,timestamptz,timestamptz,boolean,timestamptz,timestamptz,timestamptz,jsonb,timestamptz),public.fail_whop_webhook_event(uuid,text) to service_role;
revoke all on function public.normalize_username(text),public.is_reserved_username(text),public.prepare_profile(),public.sync_page_publication_timestamp(),public.validate_analytics_session_page(),public.validate_media_section_page(),public.handle_new_user() from public,anon,authenticated;
grant execute on function public.normalize_username(text),public.is_reserved_username(text) to authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon,authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon,authenticated;
