alter table public.institution_members add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create index if not exists institution_members_auth_user_id_idx on public.institution_members(auth_user_id);

create or replace function public.claim_institution_member()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.institution_members set auth_user_id = auth.uid()
  where auth_user_id is null and email is not null
    and lower(email) = lower((select email from auth.users where id = auth.uid()));
end;
$$;
grant execute on function public.claim_institution_member() to authenticated;

create policy "Member reads own row" on public.institution_members for select
  using (auth.uid() = auth_user_id);

create policy "Member reads own institution" on public.institutions for select
  using (exists (select 1 from public.institution_members m where m.institution_id = institutions.id and m.auth_user_id = auth.uid()));

create policy "Member reads own institution coaches" on public.institution_coaches for select
  using (exists (select 1 from public.institution_members m where m.institution_id = institution_coaches.institution_id and m.auth_user_id = auth.uid()));

create policy "Member reads own institution classes" on public.institution_classes for select
  using (exists (select 1 from public.institution_members m where m.institution_id = institution_classes.institution_id and m.auth_user_id = auth.uid()));

create policy "Member reads own bookings" on public.institution_class_bookings for select
  using (exists (select 1 from public.institution_members m where m.id = institution_class_bookings.member_id and m.auth_user_id = auth.uid()));

create policy "Member books own class" on public.institution_class_bookings for insert
  with check (exists (select 1 from public.institution_members m where m.id = institution_class_bookings.member_id and m.auth_user_id = auth.uid()));

create policy "Member cancels own booking" on public.institution_class_bookings for delete
  using (exists (select 1 from public.institution_members m where m.id = institution_class_bookings.member_id and m.auth_user_id = auth.uid()));

create or replace function public.class_occupancy_bulk(p_class_ids uuid[])
returns table(class_id uuid, confirmed_count bigint, waitlisted_count bigint)
language sql security definer set search_path = public as $$
  select class_id, count(*) filter (where status = 'confirmed') as confirmed_count, count(*) filter (where status = 'waitlisted') as waitlisted_count
  from public.institution_class_bookings
  where class_id = any(p_class_ids)
  group by class_id;
$$;
grant execute on function public.class_occupancy_bulk(uuid[]) to authenticated;

create or replace function public.promote_waitlist() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_next_id uuid;
begin
  if old.status = 'confirmed' then
    select id into v_next_id from public.institution_class_bookings
      where class_id = old.class_id and status = 'waitlisted'
      order by created_at asc limit 1;
    if v_next_id is not null then
      update public.institution_class_bookings set status = 'confirmed' where id = v_next_id;
    end if;
  end if;
  return old;
end;
$$;

create trigger trg_promote_waitlist
after delete on public.institution_class_bookings
for each row execute function public.promote_waitlist();
