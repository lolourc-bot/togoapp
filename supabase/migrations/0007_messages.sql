-- 1:1 coach<->athlete messaging. One conversation per athlete (coach_id +
-- athlete_id is the thread key — athletes only ever have one coach today).

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  sender text not null check (sender in ('coach', 'athlete')),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index on public.messages (coach_id, athlete_id, created_at);

alter table public.messages enable row level security;
create policy "Coach manages messages" on public.messages using (auth.uid() = coach_id);
