create table public.institution_classes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  class_type text,
  coach_id uuid references public.institution_coaches(id) on delete set null,
  room text,
  class_date date not null,
  start_time text not null,
  duration_minutes int not null default 60,
  capacity int not null default 20,
  waitlist_enabled boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);
alter table public.institution_classes enable row level security;
create policy "Owner manages institution_classes" on public.institution_classes
  using (exists (select 1 from public.institutions i where i.id = institution_classes.institution_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.institutions i where i.id = institution_classes.institution_id and i.owner_id = auth.uid()));

create table public.institution_class_bookings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.institution_classes(id) on delete cascade,
  member_id uuid not null references public.institution_members(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlisted')),
  present boolean not null default false,
  created_at timestamptz not null default now(),
  unique (class_id, member_id)
);
alter table public.institution_class_bookings enable row level security;
create policy "Owner manages institution_class_bookings" on public.institution_class_bookings
  using (exists (
    select 1 from public.institution_classes c
    join public.institutions i on i.id = c.institution_id
    where c.id = institution_class_bookings.class_id and i.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.institution_classes c
    join public.institutions i on i.id = c.institution_id
    where c.id = institution_class_bookings.class_id and i.owner_id = auth.uid()
  ));
