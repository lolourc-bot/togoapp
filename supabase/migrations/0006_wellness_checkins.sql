-- Pre-session wellness check-in (/hoy's WellnessSheet), surfaced on the
-- coach's "Bienestar" tab for that athlete.

create table public.wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  session_id uuid references public.athlete_sessions(id) on delete set null,
  date date not null default current_date,
  energy integer,
  sleep integer,
  body integer,
  created_at timestamptz not null default now()
);

create index on public.wellness_checkins (athlete_id, date);

alter table public.wellness_checkins enable row level security;
create policy "Coach manages wellness_checkins" on public.wellness_checkins using (auth.uid() = coach_id);
