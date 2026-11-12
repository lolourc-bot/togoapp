-- Exercise library (/biblioteca): coach-owned custom exercises PLUS a shared
-- TOGO-provided catalog (coach_id = NULL, visible to every coach, editable
-- only by nobody via the app — seeded directly). Supports bulk-importing a
-- large (1000+) video catalog.

alter table public.exercises alter column coach_id drop not null;
alter table public.exercises add column pattern text;
alter table public.exercises add column equipment text;
alter table public.exercises add column laterality text;
alter table public.exercises add column description text;
alter table public.exercises add column image_url text;
alter table public.exercises add column source text not null default 'coach';
alter table public.exercises add constraint exercises_source_check check (source in ('togo', 'coach'));

create index on public.exercises (source);

drop policy "Coach manages exercises" on public.exercises;
create policy "Read own or global exercises" on public.exercises
  for select using (coach_id is null or auth.uid() = coach_id);
create policy "Coach inserts own exercises" on public.exercises
  for insert with check (auth.uid() = coach_id);
create policy "Coach updates own exercises" on public.exercises
  for update using (auth.uid() = coach_id);
create policy "Coach deletes own exercises" on public.exercises
  for delete using (auth.uid() = coach_id);
