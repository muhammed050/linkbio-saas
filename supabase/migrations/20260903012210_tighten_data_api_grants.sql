revoke all on public.published_profiles from anon,authenticated,service_role;
grant select on public.published_profiles to anon,authenticated;
revoke insert,update,delete on public.plans,public.plan_prices from authenticated;
revoke insert,update,delete on public.subscriptions from authenticated;
revoke insert,update,delete on public.user_roles from authenticated;
