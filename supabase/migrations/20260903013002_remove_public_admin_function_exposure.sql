create schema if not exists private;
alter function public.is_admin() set schema private;
revoke all on function private.is_admin() from public,anon,authenticated;
grant execute on function private.is_admin() to authenticated,service_role;
create policy analytics_rate_limits_deny_client on public.analytics_rate_limits for all to anon,authenticated using (false) with check (false);
