-- Lab "Lienzo": allow more than one session on the same program day.
-- `slot` orders the sessions inside a (week_index, day_index) cell; existing rows become slot 0.

alter table public.program_sessions add column if not exists slot integer not null default 0;

alter table public.program_sessions
  drop constraint if exists program_sessions_program_id_week_index_day_index_key;

alter table public.program_sessions
  add constraint program_sessions_program_id_week_day_slot_key unique (program_id, week_index, day_index, slot);
