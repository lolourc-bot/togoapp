-- Permite elegir manualmente un plan más grande del que exige el uso actual (coach o
-- institución). El tramo "elegido" nunca se baja automáticamente — el resync solo sube
-- de tramo si el uso real supera lo elegido, nunca al revés.
alter table public.coach_subscriptions add column if not exists selected_tier_key text;
alter table public.institution_subscriptions add column if not exists selected_tier_key text;
