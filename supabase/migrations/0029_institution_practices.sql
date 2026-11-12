create table public.institution_practices (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  team_id uuid not null references public.institution_teams(id) on delete cascade,
  name text,
  practice_date date not null,
  start_time text not null,
  end_time text not null,
  place text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.institution_practices enable row level security;
create policy "Owner manages institution_practices" on public.institution_practices
  using (exists (select 1 from public.institutions i where i.id = institution_practices.institution_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.institutions i where i.id = institution_practices.institution_id and i.owner_id = auth.uid()));

create table public.institution_practice_attendance (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.institution_practices(id) on delete cascade,
  member_id uuid not null references public.institution_members(id) on delete cascade,
  present boolean not null default false,
  created_at timestamptz not null default now(),
  unique (practice_id, member_id)
);
alter table public.institution_practice_attendance enable row level security;
create policy "Owner manages institution_practice_attendance" on public.institution_practice_attendance
  using (exists (
    select 1 from public.institution_practices p
    join public.institutions i on i.id = p.institution_id
    where p.id = institution_practice_attendance.practice_id and i.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.institution_practices p
    join public.institutions i on i.id = p.institution_id
    where p.id = institution_practice_attendance.practice_id and i.owner_id = auth.uid()
  ));
