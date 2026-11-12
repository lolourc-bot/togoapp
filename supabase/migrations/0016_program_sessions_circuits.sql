-- Program canvas sessions didn't support circuits/finishers (only straight
-- exercises), unlike athlete/team sessions and Lab templates. Add the same
-- jsonb column for consistency now that the dedicated session editor
-- (/sesiones/$sessionId) supports circuits across every mode.
alter table public.program_sessions add column circuits jsonb not null default '[]'::jsonb;
