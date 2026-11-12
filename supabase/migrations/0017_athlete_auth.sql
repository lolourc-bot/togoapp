-- Real athlete auth: link athletes rows to auth.users, add RLS for athlete self-access.
alter table public.athletes add column if not exists email text;
alter table public.athletes add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create index if not exists athletes_auth_user_id_idx on public.athletes(auth_user_id);

-- Claims every unclaimed athlete row whose email matches the current auth user's email.
-- Lets the same person be claimed across multiple coaches (one athletes row per coach).
create or replace function public.claim_athlete_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.athletes
  set auth_user_id = auth.uid()
  where auth_user_id is null
    and email is not null
    and lower(email) = lower((select email from auth.users where id = auth.uid()));
end;
$$;
grant execute on function public.claim_athlete_profile() to authenticated;

-- Athlete reads their own row (coach's existing policy still governs coach access).
create policy "Athlete reads own row" on public.athletes
  for select using (auth.uid() = auth_user_id);

create policy "Athlete reads own sessions" on public.athlete_sessions
  for select using (exists (
    select 1 from public.athletes a where a.id = athlete_sessions.athlete_id and a.auth_user_id = auth.uid()
  ));

create policy "Athlete reads own messages" on public.messages
  for select using (exists (
    select 1 from public.athletes a where a.id = messages.athlete_id and a.auth_user_id = auth.uid()
  ));
create policy "Athlete sends messages" on public.messages
  for insert with check (exists (
    select 1 from public.athletes a where a.id = messages.athlete_id and a.auth_user_id = auth.uid()
  ));

create policy "Athlete reads own notifications" on public.notifications
  for select using (exists (
    select 1 from public.athletes a where a.id = notifications.athlete_id and a.auth_user_id = auth.uid()
  ));
create policy "Athlete marks notifications read" on public.notifications
  for update using (exists (
    select 1 from public.athletes a where a.id = notifications.athlete_id and a.auth_user_id = auth.uid()
  ));

create policy "Athlete reads own wellness_checkins" on public.wellness_checkins
  for select using (exists (
    select 1 from public.athletes a where a.id = wellness_checkins.athlete_id and a.auth_user_id = auth.uid()
  ));
create policy "Athlete inserts own wellness_checkins" on public.wellness_checkins
  for insert with check (exists (
    select 1 from public.athletes a where a.id = wellness_checkins.athlete_id and a.auth_user_id = auth.uid()
  ));

create policy "Athlete reads own session_completions" on public.session_completions
  for select using (exists (
    select 1 from public.athlete_sessions s
    join public.athletes a on a.id = s.athlete_id
    where s.id = session_completions.session_id and a.auth_user_id = auth.uid()
  ));
create policy "Athlete inserts own session_completions" on public.session_completions
  for insert with check (exists (
    select 1 from public.athlete_sessions s
    join public.athletes a on a.id = s.athlete_id
    where s.id = session_completions.session_id and a.auth_user_id = auth.uid()
  ));

create policy "Athlete reads own team_members rows" on public.team_members
  for select using (exists (
    select 1 from public.athletes a where a.id = team_members.athlete_id and a.auth_user_id = auth.uid()
  ));

create policy "Athlete reads own team messages" on public.team_messages
  for select using (exists (
    select 1 from public.team_members m
    join public.athletes a on a.id = m.athlete_id
    where m.team_id = team_messages.team_id and a.auth_user_id = auth.uid()
  ));
create policy "Athlete sends team messages" on public.team_messages
  for insert with check (exists (
    select 1 from public.team_members m
    join public.athletes a on a.id = m.athlete_id
    where m.team_id = team_messages.team_id and a.auth_user_id = auth.uid()
  ) and exists (
    select 1 from public.athletes a where a.id = team_messages.sender_athlete_id and a.auth_user_id = auth.uid()
  ));

create table public.notification_preferences (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  off_keys text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy "Athlete manages own notification_preferences" on public.notification_preferences
  for all using (exists (
    select 1 from public.athletes a where a.id = notification_preferences.athlete_id and a.auth_user_id = auth.uid()
  )) with check (exists (
    select 1 from public.athletes a where a.id = notification_preferences.athlete_id and a.auth_user_id = auth.uid()
  ));
