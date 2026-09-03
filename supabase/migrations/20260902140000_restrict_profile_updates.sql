revoke update on table public.profiles from authenticated;

grant update (username, full_name, avatar_url) on table public.profiles to authenticated;
