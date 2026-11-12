create table public.institution_teams (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  category text,
  coach_id uuid references public.institution_coaches(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.institution_teams enable row level security;
create policy "Owner manages institution_teams" on public.institution_teams
  using (exists (select 1 from public.institutions i where i.id = institution_teams.institution_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.institutions i where i.id = institution_teams.institution_id and i.owner_id = auth.uid()));

alter table public.institution_members add column team_id uuid references public.institution_teams(id) on delete set null;
