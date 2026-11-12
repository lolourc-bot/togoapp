-- Switch from an off_keys array (assumes "default on") to a jsonb map, since some
-- coach notification rows default to off — a plain off-list can't represent that.
alter table public.coach_notification_preferences drop column off_keys;
alter table public.coach_notification_preferences add column prefs jsonb not null default '{}'::jsonb;
