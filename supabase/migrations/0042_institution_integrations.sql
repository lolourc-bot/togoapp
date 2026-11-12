-- Integraciones de la institución: Google Calendar (OAuth) y WhatsApp (Meta Cloud API,
-- credenciales todavía pendientes del lado del usuario — la columna queda lista para cuando
-- estén). Una fila por institución, server-write-only (tokens nunca van al cliente crudos).
create table public.institution_integrations (
  institution_id uuid primary key references public.institutions(id) on delete cascade,

  google_access_token text,
  google_refresh_token text,
  google_token_expires_at timestamptz,
  google_calendar_id text,
  google_connected_at timestamptz,

  whatsapp_phone_number_id text,
  whatsapp_access_token text,
  whatsapp_connected_at timestamptz,

  updated_at timestamptz not null default now()
);
alter table public.institution_integrations enable row level security;
create policy "Read access views institution_integrations" on public.institution_integrations for select
  using (public.institution_has_read_access(institution_id));
-- Server-write-only.

-- Vínculo al evento real de Google Calendar creado para cada clase/práctica (sync TOGO -> Google).
alter table public.institution_classes add column if not exists google_event_id text;
alter table public.institution_practices add column if not exists google_event_id text;
