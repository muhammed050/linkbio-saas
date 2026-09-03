alter table public.profiles
  add column plan_type public.plan_code not null default 'free',
  add column whop_user_id text,
  add column whop_plan_id text;

create unique index profiles_whop_user_id_unique_idx
  on public.profiles (whop_user_id)
  where whop_user_id is not null;

revoke update (plan_type, whop_user_id, whop_plan_id) on public.profiles from authenticated;
