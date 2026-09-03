revoke select on table public.profiles from anon;
grant select (username, full_name, avatar_url) on table public.profiles to anon;
revoke update on table public.profiles from authenticated;
grant update (username, full_name, avatar_url, locale, timezone) on table public.profiles to authenticated;
drop policy if exists profiles_admin_select on public.profiles;
drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles for select to authenticated using ((select auth.uid()) = id or (select public.is_admin()));
