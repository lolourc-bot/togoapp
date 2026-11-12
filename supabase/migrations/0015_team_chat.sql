-- Group chat per team. sender_athlete_id is null for messages sent by the
-- coach; set to a member's id for messages sent "as" that athlete (there is
-- no separate athlete auth in this app — the coach always sends, optionally
-- previewing as a specific athlete, same convention as the 1:1 "messages" table).

create table public.team_messages (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_athlete_id uuid references public.athletes(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index on public.team_messages (team_id, created_at);

alter table public.team_messages enable row level security;

create policy "Coach manages team_messages" on public.team_messages
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);
