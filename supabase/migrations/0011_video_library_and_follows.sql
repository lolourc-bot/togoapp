-- Admin flag, TOGO's own video catalog (admin-managed), coach-uploaded
-- videos, and coach-follows-coach relationships. Powers:
--   - /admin/videos (is_admin-gated panel to manage togo_videos)
--   - /biblioteca 3 tabs: Mios (coach_videos), TOGO (togo_videos),
--     Seguidos (coach_videos of followed coaches, via coach_follows)
-- Existing "exercises" table data (all 1053 rows are source='togo') is
-- migrated into togo_videos; the exercises table itself is left in place
-- unchanged for now (still used by session/program building elsewhere).

alter table public.profiles add column is_admin boolean not null default false;

update public.profiles set is_admin = true where id = '7c65de7a-817b-480f-b524-62e4e32b862d';

create table public.togo_videos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pattern text,
  equipment text,
  laterality text,
  description text,
  video_url text,
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.togo_videos enable row level security;

create policy "Everyone reads togo videos" on public.togo_videos
  for select using (true);
create policy "Admins insert togo videos" on public.togo_videos
  for insert with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Admins update togo videos" on public.togo_videos
  for update using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Admins delete togo videos" on public.togo_videos
  for delete using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create table public.coach_videos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  pattern text,
  equipment text,
  laterality text,
  description text,
  video_url text,
  image_url text,
  created_at timestamptz not null default now()
);

create index on public.coach_videos (coach_id);

alter table public.coach_videos enable row level security;

create table public.coach_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint coach_follows_no_self check (follower_id <> followed_id),
  constraint coach_follows_unique unique (follower_id, followed_id)
);

create index on public.coach_follows (followed_id);

alter table public.coach_follows enable row level security;

create policy "Coach reads own follows" on public.coach_follows
  for select using (auth.uid() = follower_id or auth.uid() = followed_id);
create policy "Coach creates own follows" on public.coach_follows
  for insert with check (auth.uid() = follower_id);
create policy "Coach deletes own follows" on public.coach_follows
  for delete using (auth.uid() = follower_id);

-- coach_videos SELECT policy references coach_follows, so it must be created after
create policy "Coach reads own or followed videos" on public.coach_videos
  for select using (
    auth.uid() = coach_id
    or exists (select 1 from public.coach_follows where follower_id = auth.uid() and followed_id = coach_videos.coach_id)
  );
create policy "Coach inserts own videos" on public.coach_videos
  for insert with check (auth.uid() = coach_id);
create policy "Coach updates own videos" on public.coach_videos
  for update using (auth.uid() = coach_id);
create policy "Coach deletes own videos" on public.coach_videos
  for delete using (auth.uid() = coach_id);

insert into public.togo_videos (name, pattern, equipment, laterality, description, video_url, image_url, created_at)
select name, pattern, equipment, laterality, description, video_url, image_url, created_at
from public.exercises
where source = 'togo';

insert into public.coach_videos (coach_id, name, pattern, equipment, laterality, description, video_url, image_url, created_at)
select coach_id, name, pattern, equipment, laterality, description, video_url, image_url, created_at
from public.exercises
where source = 'coach' and coach_id is not null;
