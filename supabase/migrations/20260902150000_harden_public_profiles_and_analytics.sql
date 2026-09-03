grant execute on function public.normalize_username(text) to authenticated;
grant execute on function public.is_reserved_username(text) to authenticated;

drop policy if exists profiles_select_published_page on public.profiles;
revoke select on table public.profiles from anon;

create or replace view public.published_profiles
with (security_barrier = true)
as
select
  profile.id,
  profile.username,
  profile.full_name,
  profile.avatar_url
from public.profiles profile
join public.pages page on page.profile_id = profile.id
where page.is_published;

revoke all on table public.published_profiles from public;
grant select on table public.published_profiles to anon, authenticated;

drop policy if exists analytics_sessions_insert_published on public.analytics_sessions;
drop policy if exists analytics_page_views_insert_published on public.analytics_page_views;
drop policy if exists analytics_events_insert_published on public.analytics_events;

revoke insert on table public.analytics_sessions, public.analytics_page_views, public.analytics_events from anon, authenticated;
grant insert on table public.analytics_sessions, public.analytics_page_views, public.analytics_events to service_role;

do $$
begin
  if not has_function_privilege('authenticated', 'public.normalize_username(text)', 'execute')
     or not has_function_privilege('authenticated', 'public.is_reserved_username(text)', 'execute') then
    raise exception 'authenticated must be able to execute profile validation helpers';
  end if;

  if has_table_privilege('anon', 'public.profiles', 'select') then
    raise exception 'anon must not be able to select public.profiles';
  end if;

  if not has_table_privilege('anon', 'public.published_profiles', 'select')
     or not has_table_privilege('authenticated', 'public.published_profiles', 'select') then
    raise exception 'published profile view must be readable by public page visitors';
  end if;

  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.published_profiles'::regclass
      and attnum > 0
      and not attisdropped
      and attname in ('whop_user_id', 'whop_plan_id')
  ) then
    raise exception 'published profile view must not expose Whop identifiers';
  end if;

  if has_table_privilege('anon', 'public.analytics_sessions', 'insert')
     or has_table_privilege('authenticated', 'public.analytics_sessions', 'insert')
     or has_table_privilege('anon', 'public.analytics_page_views', 'insert')
     or has_table_privilege('authenticated', 'public.analytics_page_views', 'insert')
     or has_table_privilege('anon', 'public.analytics_events', 'insert')
     or has_table_privilege('authenticated', 'public.analytics_events', 'insert') then
    raise exception 'client roles must not be able to insert analytics tracking data';
  end if;

  if not has_table_privilege('service_role', 'public.analytics_sessions', 'insert')
     or not has_table_privilege('service_role', 'public.analytics_page_views', 'insert')
     or not has_table_privilege('service_role', 'public.analytics_events', 'insert') then
    raise exception 'service_role must retain analytics insert access';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('analytics_sessions', 'analytics_page_views', 'analytics_events')
      and cmd = 'INSERT'
      and ('anon' = any(roles) or 'authenticated' = any(roles))
  ) then
    raise exception 'client analytics insert policies must not remain';
  end if;
end;
$$;
