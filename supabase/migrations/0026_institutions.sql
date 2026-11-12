create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('club', 'gym')),
  logo_url text,
  created_at timestamptz not null default now()
);
alter table public.institutions enable row level security;
create policy "Owner manages own institution" on public.institutions
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.institution_coaches (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  full_name text not null,
  email text,
  specialty text,
  created_at timestamptz not null default now()
);
alter table public.institution_coaches enable row level security;
create policy "Owner manages institution_coaches" on public.institution_coaches
  using (exists (select 1 from public.institutions i where i.id = institution_coaches.institution_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.institutions i where i.id = institution_coaches.institution_id and i.owner_id = auth.uid()));

create table public.institution_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  full_name text not null,
  email text,
  plan text,
  status text not null default 'active' check (status in ('active', 'paused')),
  coach_id uuid references public.institution_coaches(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.institution_members enable row level security;
create policy "Owner manages institution_members" on public.institution_members
  using (exists (select 1 from public.institutions i where i.id = institution_members.institution_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.institutions i where i.id = institution_members.institution_id and i.owner_id = auth.uid()));
