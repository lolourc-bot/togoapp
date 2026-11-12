-- Same lesson as athlete_sessions/program_sessions: a session template's
-- exercises (with A/B grouping) and circuits (rich timer config) don't fit
-- a normalized child table without losing editor fidelity. Store as JSONB.

drop policy if exists "Coach manages session_template_items" on public.session_template_items;
drop table public.session_template_items;

alter table public.session_templates
  add column exercises jsonb not null default '[]'::jsonb,
  add column circuits jsonb not null default '[]'::jsonb;
