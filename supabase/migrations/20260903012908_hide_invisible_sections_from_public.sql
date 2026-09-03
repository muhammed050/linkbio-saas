drop policy if exists sections_public_select on public.page_sections;
create policy sections_public_select on public.page_sections for select to anon using (is_visible and exists(select 1 from public.pages p where p.id=page_sections.page_id and p.is_published));
create policy sections_owner_select on public.page_sections for select to authenticated using (exists(select 1 from public.pages p where p.id=page_sections.page_id and p.profile_id=(select auth.uid())));
