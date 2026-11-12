-- Revise athlete_sessions storage: the UI's DaySession.items (CalEx[]) and
-- .circuits (CircuitConfig[]) carry too many free-form editor fields to
-- normalize cleanly (circuit timer config, field/aerobic data with nested
-- intervals). Store them as JSONB on the session row instead of child tables.

drop policy if exists "Coach manages athlete_session_circuit_items" on public.athlete_session_circuit_items;
drop policy if exists "Coach manages athlete_session_circuits" on public.athlete_session_circuits;
drop policy if exists "Coach manages athlete_session_items" on public.athlete_session_items;
drop policy if exists "Coach manages athlete_session_sets" on public.athlete_session_sets;

drop table public.athlete_session_sets;
drop table public.athlete_session_circuit_items;
drop table public.athlete_session_circuits;
drop table public.athlete_session_items;

alter table public.athlete_sessions
  add column items jsonb not null default '[]'::jsonb,
  add column circuits jsonb not null default '[]'::jsonb,
  add column field jsonb;

-- Execution-set logging (/sesion-atleta) references a session + the item's
-- client-side id (items live in the JSONB blob, not a child table row).
create table public.athlete_session_sets (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.athlete_sessions(id) on delete cascade,
  item_id text not null,
  set_index integer not null default 0,
  reps text,
  weight text,
  done boolean not null default false,
  note text
);

create index on public.athlete_session_sets (session_id);

alter table public.athlete_session_sets enable row level security;
create policy "Coach manages athlete_session_sets" on public.athlete_session_sets using (auth.uid() = coach_id);
