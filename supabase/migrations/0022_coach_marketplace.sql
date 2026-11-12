create table public.coach_marketplace_profiles (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  specialty text,
  modality text check (modality in ('Online', 'Presencial', 'Ambas')),
  modality_text text,
  years_experience integer,
  chips text[] not null default '{}',
  available_days boolean[] not null default '{false,false,false,false,false,false,false}',
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coach_marketplace_profiles enable row level security;
create policy "Coach manages own marketplace profile" on public.coach_marketplace_profiles
  using (auth.uid() = coach_id) with check (auth.uid() = coach_id);
create policy "Public reads visible marketplace profiles" on public.coach_marketplace_profiles
  for select using (visible = true);

alter table public.programs add column if not exists price text;
alter table public.programs add column if not exists payment_type text check (payment_type in ('unico', 'sub'));
alter table public.programs add column if not exists level text check (level in ('Principiante', 'Intermedio', 'Avanzado'));
alter table public.programs add column if not exists visible_marketplace boolean not null default false;
create policy "Public reads marketplace-visible programs" on public.programs
  for select using (visible_marketplace = true);

create table public.marketplace_requests (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  requester_name text not null,
  requester_email text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
alter table public.marketplace_requests enable row level security;
create policy "Coach manages own marketplace_requests" on public.marketplace_requests using (auth.uid() = coach_id);
create policy "Anyone can submit a marketplace request" on public.marketplace_requests
  for insert with check (true);

-- Public athlete-count stat without exposing individual athlete rows to strangers.
create or replace function public.coach_athlete_count(target_coach_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.athletes where coach_id = target_coach_id;
$$;
grant execute on function public.coach_athlete_count(uuid) to anon, authenticated;
