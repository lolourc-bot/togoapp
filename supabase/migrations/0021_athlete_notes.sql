create table public.athlete_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.athlete_notes enable row level security;
create policy "Coach manages athlete_notes" on public.athlete_notes using (auth.uid() = coach_id);
create index athlete_notes_athlete_id_idx on public.athlete_notes(athlete_id, created_at desc);
