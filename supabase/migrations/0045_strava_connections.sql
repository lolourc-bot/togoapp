-- Conexión de Strava por atleta: el atleta autoriza una vez desde su perfil, y guardamos
-- los tokens para poder leer sus actividades completadas (no hay forma de "empujar" una
-- sesión planificada hacia Strava — la API pública no lo permite, solo podemos traer de vuelta
-- lo que el atleta ya registró ahí).
create table public.athlete_strava_connections (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now()
);

create unique index athlete_strava_connections_strava_athlete_id_idx
  on public.athlete_strava_connections(strava_athlete_id);

alter table public.athlete_strava_connections enable row level security;

create policy "Athlete manages own Strava connection"
  on public.athlete_strava_connections for all
  using (athlete_id in (select id from public.athletes where auth_user_id = auth.uid()))
  with check (athlete_id in (select id from public.athletes where auth_user_id = auth.uid()));

create policy "Coach reads their athletes' Strava connection"
  on public.athlete_strava_connections for select
  using (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
