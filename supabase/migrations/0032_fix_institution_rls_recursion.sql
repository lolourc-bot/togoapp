create or replace function public.is_institution_member(p_institution_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.institution_members m
    where m.institution_id = p_institution_id and m.auth_user_id = auth.uid()
  );
$$;
grant execute on function public.is_institution_member(uuid) to authenticated;

drop policy "Member reads own institution" on public.institutions;
create policy "Member reads own institution" on public.institutions for select
  using (public.is_institution_member(id));

drop policy "Member reads own institution coaches" on public.institution_coaches;
create policy "Member reads own institution coaches" on public.institution_coaches for select
  using (public.is_institution_member(institution_id));

drop policy "Member reads own institution classes" on public.institution_classes;
create policy "Member reads own institution classes" on public.institution_classes for select
  using (public.is_institution_member(institution_id));
