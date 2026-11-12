-- Athlete profile screen needs a few personal-data fields that don't exist yet.

alter table public.athletes
  add column birthdate date,
  add column height_cm numeric,
  add column weight_kg numeric,
  add column phone text;
