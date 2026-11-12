-- Lets a coach pause (hide from active rosters) or permanently remove an athlete.
alter table public.athletes add column if not exists status text not null default 'active';
alter table public.athletes add constraint athletes_status_check check (status in ('active', 'paused'));
