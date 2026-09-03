create table public.analytics_rate_limits (
  key_hash text primary key check(char_length(key_hash)=64),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check(request_count>=0)
);
alter table public.analytics_rate_limits enable row level security;
revoke all on table public.analytics_rate_limits from anon,authenticated;
grant all on table public.analytics_rate_limits to service_role;
create index analytics_rate_limits_window_idx on public.analytics_rate_limits(window_started_at);
create or replace function public.check_analytics_rate_limit(p_key_hash text,p_limit integer default 30,p_window_seconds integer default 60) returns boolean language plpgsql security definer set search_path='' as $$ declare v_count integer; begin if coalesce((select auth.jwt()->>'role'),'') <> 'service_role' then raise exception 'check_analytics_rate_limit is restricted to service_role' using errcode='42501'; end if; if char_length(p_key_hash)<>64 or p_limit<1 or p_limit>10000 or p_window_seconds<1 or p_window_seconds>3600 then raise exception 'invalid rate limit arguments' using errcode='22023'; end if; insert into public.analytics_rate_limits(key_hash,window_started_at,request_count) values(p_key_hash,now(),1) on conflict(key_hash) do update set request_count=case when public.analytics_rate_limits.window_started_at <= now()-(p_window_seconds * interval '1 second') then 1 else public.analytics_rate_limits.request_count+1 end, window_started_at=case when public.analytics_rate_limits.window_started_at <= now()-(p_window_seconds * interval '1 second') then now() else public.analytics_rate_limits.window_started_at end returning request_count into v_count; if random()<0.01 then delete from public.analytics_rate_limits where window_started_at < now()-interval '1 day'; end if; return v_count<=p_limit; end; $$;
revoke all on function public.check_analytics_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.check_analytics_rate_limit(text,integer,integer) to service_role;
