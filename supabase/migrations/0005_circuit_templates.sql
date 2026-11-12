-- Lab "Bloques": reusable circuit library. Same JSONB pattern as the other
-- rich editor payloads (CircuitConfig has ~13 timer-config fields).

create table public.circuit_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  config jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.circuit_templates enable row level security;
create policy "Coach manages circuit_templates" on public.circuit_templates using (auth.uid() = coach_id);
