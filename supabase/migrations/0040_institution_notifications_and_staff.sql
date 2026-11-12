-- Notificaciones: mismo patrón jsonb que coach_notification_preferences.
create table public.institution_notification_preferences (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.institution_notification_preferences enable row level security;

-- Accesos y roles: gente invitada más allá del dueño, con permiso completo o solo lectura.
-- auth_user_id queda null hasta que la persona invitada acepta (status 'pending' -> 'active').
create table public.institution_staff (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text,
  permission text not null default 'read_only' check (permission in ('full_access', 'read_only')),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  invite_token uuid not null default gen_random_uuid(),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index institution_staff_institution_email_idx on public.institution_staff (institution_id, lower(email));
create unique index institution_staff_invite_token_idx on public.institution_staff (invite_token);
alter table public.institution_staff enable row level security;

-- Helpers de acceso, reusados en todas las tablas de institución: el dueño siempre tiene
-- full access; el staff invitado con permission='full_access' se equipara al dueño; staff
-- con 'read_only' solo puede leer.
create or replace function public.institution_has_full_access(p_institution_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.institutions i where i.id = p_institution_id and i.owner_id = auth.uid())
    or exists (
      select 1 from public.institution_staff s
      where s.institution_id = p_institution_id and s.auth_user_id = auth.uid()
        and s.status = 'active' and s.permission = 'full_access'
    );
$$;
grant execute on function public.institution_has_full_access(uuid) to authenticated;

create or replace function public.institution_has_read_access(p_institution_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select public.institution_has_full_access(p_institution_id)
    or exists (
      select 1 from public.institution_staff s
      where s.institution_id = p_institution_id and s.auth_user_id = auth.uid() and s.status = 'active'
    );
$$;
grant execute on function public.institution_has_read_access(uuid) to authenticated;

-- institution_notification_preferences: full_access administra, read_only solo lee.
create policy "Full access manages institution_notification_preferences" on public.institution_notification_preferences
  using (public.institution_has_full_access(institution_id)) with check (public.institution_has_full_access(institution_id));
create policy "Read access views institution_notification_preferences" on public.institution_notification_preferences for select
  using (public.institution_has_read_access(institution_id));

-- institution_staff: full_access administra invitaciones; cualquier staff activo ve la lista.
-- La aceptación de la invitación (alguien todavía sin cuenta, visitando el link con el
-- invite_token) NO pasa por estas policies — no hay forma segura de expresar "solo si
-- filtraste por este token exacto" en RLS sin terminar exponiendo todas las filas pendientes
-- a cualquier anónimo. Esa parte se resuelve server-side con service-role (ver
-- lib/institution-staff.ts), el mismo patrón que program_purchases/completar-pago.
create policy "Full access manages institution_staff" on public.institution_staff
  using (public.institution_has_full_access(institution_id)) with check (public.institution_has_full_access(institution_id));
create policy "Read access views institution_staff" on public.institution_staff for select
  using (public.institution_has_read_access(institution_id));

-- Reemplaza "solo el dueño" por "dueño o staff con full_access" en cada tabla de institución
-- ya existente, y agrega lectura para staff con read_only.
drop policy "Owner manages own institution" on public.institutions;
create policy "Full access manages institution" on public.institutions
  using (public.institution_has_full_access(id)) with check (public.institution_has_full_access(id));
create policy "Read access views institution" on public.institutions for select
  using (public.institution_has_read_access(id));

drop policy "Owner manages institution_coaches" on public.institution_coaches;
create policy "Full access manages institution_coaches" on public.institution_coaches
  using (public.institution_has_full_access(institution_id)) with check (public.institution_has_full_access(institution_id));
create policy "Read access views institution_coaches" on public.institution_coaches for select
  using (public.institution_has_read_access(institution_id));

drop policy "Owner manages institution_members" on public.institution_members;
create policy "Full access manages institution_members" on public.institution_members
  using (public.institution_has_full_access(institution_id)) with check (public.institution_has_full_access(institution_id));
create policy "Read access views institution_members" on public.institution_members for select
  using (public.institution_has_read_access(institution_id));

drop policy "Owner manages institution_teams" on public.institution_teams;
create policy "Full access manages institution_teams" on public.institution_teams
  using (public.institution_has_full_access(institution_id)) with check (public.institution_has_full_access(institution_id));
create policy "Read access views institution_teams" on public.institution_teams for select
  using (public.institution_has_read_access(institution_id));

drop policy "Owner manages institution_classes" on public.institution_classes;
create policy "Full access manages institution_classes" on public.institution_classes
  using (public.institution_has_full_access(institution_id)) with check (public.institution_has_full_access(institution_id));
create policy "Read access views institution_classes" on public.institution_classes for select
  using (public.institution_has_read_access(institution_id));

drop policy "Owner manages institution_class_bookings" on public.institution_class_bookings;
create policy "Full access manages institution_class_bookings" on public.institution_class_bookings
  using (exists (select 1 from public.institution_classes c where c.id = institution_class_bookings.class_id and public.institution_has_full_access(c.institution_id)))
  with check (exists (select 1 from public.institution_classes c where c.id = institution_class_bookings.class_id and public.institution_has_full_access(c.institution_id)));
create policy "Read access views institution_class_bookings" on public.institution_class_bookings for select
  using (exists (select 1 from public.institution_classes c where c.id = institution_class_bookings.class_id and public.institution_has_read_access(c.institution_id)));

drop policy "Owner manages institution_practices" on public.institution_practices;
create policy "Full access manages institution_practices" on public.institution_practices
  using (public.institution_has_full_access(institution_id)) with check (public.institution_has_full_access(institution_id));
create policy "Read access views institution_practices" on public.institution_practices for select
  using (public.institution_has_read_access(institution_id));

drop policy "Owner manages institution_practice_attendance" on public.institution_practice_attendance;
create policy "Full access manages institution_practice_attendance" on public.institution_practice_attendance
  using (exists (select 1 from public.institution_practices p where p.id = institution_practice_attendance.practice_id and public.institution_has_full_access(p.institution_id)))
  with check (exists (select 1 from public.institution_practices p where p.id = institution_practice_attendance.practice_id and public.institution_has_full_access(p.institution_id)));
create policy "Read access views institution_practice_attendance" on public.institution_practice_attendance for select
  using (exists (select 1 from public.institution_practices p where p.id = institution_practice_attendance.practice_id and public.institution_has_read_access(p.institution_id)));

drop policy "Owner reads own institution subscription" on public.institution_subscriptions;
create policy "Read access views institution subscription" on public.institution_subscriptions for select
  using (public.institution_has_read_access(institution_id));
