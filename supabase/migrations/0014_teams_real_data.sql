-- Real teams: membership, persisted feature toggles, and team-wide sessions
-- (fanned out into one athlete_sessions row per member, correlated via
-- team_session_group_id so bulk UI operations — publish/copy/duplicate/
-- delete across the whole team — can act on every member's copy at once).

alter table public.teams add column description text;
alter table public.teams add column features jsonb not null default '{"planning": true, "chat": true, "achievements": true}'::jsonb;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, athlete_id)
);

create index on public.team_members (team_id);

alter table public.team_members enable row level security;

create policy "Coach manages team_members" on public.team_members
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

alter table public.athlete_sessions add column team_id uuid references public.teams(id) on delete set null;
alter table public.athlete_sessions add column team_session_group_id uuid;

create index on public.athlete_sessions (team_id, date);
create index on public.athlete_sessions (team_session_group_id);
