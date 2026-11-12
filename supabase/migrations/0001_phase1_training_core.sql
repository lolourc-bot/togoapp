-- Phase 1: core coach<->athlete training domain.
-- Mirrors the existing RLS pattern on public.athletes / public.teams:
-- every table carries coach_id and is scoped with `auth.uid() = coach_id`.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text,
  video_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text,
  minutes integer,
  created_at timestamptz not null default now()
);

create table public.session_template_items (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.session_templates(id) on delete cascade,
  position integer not null default 0,
  exercise_id uuid references public.exercises(id) on delete set null,
  name text not null,
  sets text,
  reps text,
  weight text
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  weeks integer,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now()
);

create table public.athlete_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  date date not null,
  name text not null,
  status text not null default 'draft',
  minutes integer,
  is_field boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.athlete_session_items (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.athlete_sessions(id) on delete cascade,
  position integer not null default 0,
  exercise_id uuid references public.exercises(id) on delete set null,
  name text not null,
  sets text,
  reps text,
  weight text,
  notes text
);

create table public.athlete_session_circuits (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.athlete_sessions(id) on delete cascade,
  type text not null,
  name text,
  rounds integer,
  minutes integer
);

create table public.athlete_session_circuit_items (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  circuit_id uuid not null references public.athlete_session_circuits(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  reps text
);

create table public.athlete_session_sets (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  session_item_id uuid not null references public.athlete_session_items(id) on delete cascade,
  set_index integer not null default 0,
  reps text,
  weight text,
  done boolean not null default false,
  note text
);

create table public.session_completions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.athlete_sessions(id) on delete cascade,
  duration_seconds integer,
  feeling integer,
  completed_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid references public.athletes(id) on delete cascade,
  audience text not null default 'coach',
  kind text not null,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index on public.session_template_items (template_id);
create index on public.program_assignments (athlete_id);
create index on public.athlete_sessions (athlete_id, date);
create index on public.athlete_session_items (session_id);
create index on public.athlete_session_circuits (session_id);
create index on public.athlete_session_circuit_items (circuit_id);
create index on public.athlete_session_sets (session_item_id);
create index on public.session_completions (session_id);
create index on public.notifications (coach_id, read_at);

alter table public.exercises enable row level security;
alter table public.session_templates enable row level security;
alter table public.session_template_items enable row level security;
alter table public.programs enable row level security;
alter table public.program_assignments enable row level security;
alter table public.athlete_sessions enable row level security;
alter table public.athlete_session_items enable row level security;
alter table public.athlete_session_circuits enable row level security;
alter table public.athlete_session_circuit_items enable row level security;
alter table public.athlete_session_sets enable row level security;
alter table public.session_completions enable row level security;
alter table public.notifications enable row level security;

create policy "Coach manages exercises" on public.exercises using (auth.uid() = coach_id);
create policy "Coach manages session_templates" on public.session_templates using (auth.uid() = coach_id);
create policy "Coach manages session_template_items" on public.session_template_items using (auth.uid() = coach_id);
create policy "Coach manages programs" on public.programs using (auth.uid() = coach_id);
create policy "Coach manages program_assignments" on public.program_assignments using (auth.uid() = coach_id);
create policy "Coach manages athlete_sessions" on public.athlete_sessions using (auth.uid() = coach_id);
create policy "Coach manages athlete_session_items" on public.athlete_session_items using (auth.uid() = coach_id);
create policy "Coach manages athlete_session_circuits" on public.athlete_session_circuits using (auth.uid() = coach_id);
create policy "Coach manages athlete_session_circuit_items" on public.athlete_session_circuit_items using (auth.uid() = coach_id);
create policy "Coach manages athlete_session_sets" on public.athlete_session_sets using (auth.uid() = coach_id);
create policy "Coach manages session_completions" on public.session_completions using (auth.uid() = coach_id);
create policy "Coach manages notifications" on public.notifications using (auth.uid() = coach_id);
