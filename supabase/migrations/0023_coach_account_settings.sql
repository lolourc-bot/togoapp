alter table public.profiles add column if not exists currency text not null default 'ARS';
alter table public.profiles add column if not exists timezone text not null default 'America/Argentina/Buenos_Aires';

create table public.coach_notification_preferences (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  off_keys text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.coach_notification_preferences enable row level security;
create policy "Coach manages own notification prefs" on public.coach_notification_preferences
  using (auth.uid() = coach_id) with check (auth.uid() = coach_id);
