-- Lab "Lienzo": each canvas tab is a programs row; each week/day grid cell
-- is a row here, keyed by (program_id, week_index, day_index).

create table public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  week_index integer not null,
  day_index integer not null,
  name text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (program_id, week_index, day_index)
);

create index on public.program_sessions (program_id);

alter table public.program_sessions enable row level security;
create policy "Coach manages program_sessions" on public.program_sessions using (auth.uid() = coach_id);
