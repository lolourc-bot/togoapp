-- Cuenta de cobro propia de la institución — mismo patrón que coach_payment_accounts, pero
-- acá la plata de las cuotas de los socios va DIRECTO a la institución: no hay comisión de
-- TOGO en Caja (a diferencia del 15% del marketplace), así que el modelo de Stripe es
-- "direct charge" sobre la cuenta conectada, no "separate charges and transfers".
create table public.institution_payment_accounts (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  processor text not null check (processor in ('stripe', 'mercadopago')),

  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  stripe_details_submitted boolean not null default false,

  mp_user_id text,
  mp_access_token text,
  mp_refresh_token text,
  mp_public_key text,
  mp_token_expires_at timestamptz,

  status text not null default 'pending' check (status in ('pending', 'onboarding', 'active', 'restricted', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.institution_payment_accounts enable row level security;
create policy "Read access views institution_payment_accounts" on public.institution_payment_accounts for select
  using (public.institution_has_read_access(institution_id));
-- Server-write-only — el access token de MP y el account id de Stripe nunca van al cliente
-- directo (se exponen redactados vía server-fn, igual que coach_payment_accounts).

-- Formaliza el precio de cuota por socio (antes "plan" era solo texto libre informativo)
-- y el vínculo a la suscripción/preapproval activa de ese socio.
alter table public.institution_members add column if not exists plan_amount integer; -- centavos
alter table public.institution_members add column if not exists plan_currency text;
alter table public.institution_members add column if not exists stripe_subscription_id text;
alter table public.institution_members add column if not exists mp_preapproval_id text;
alter table public.institution_members add column if not exists billing_status text not null default 'none'
  check (billing_status in ('none', 'pending', 'active', 'past_due', 'canceled'));

-- Historial de cobros reales por socio (lo que ve la institución en "Caja").
create table public.institution_member_charges (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  member_id uuid not null references public.institution_members(id) on delete cascade,

  processor text not null check (processor in ('stripe', 'mercadopago')),
  currency text not null,
  amount integer not null,

  stripe_subscription_id text,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  mp_preapproval_id text,
  mp_payment_id text,

  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.institution_member_charges (institution_id);
create index on public.institution_member_charges (member_id);
create unique index on public.institution_member_charges (stripe_invoice_id) where stripe_invoice_id is not null;
create unique index on public.institution_member_charges (mp_payment_id) where mp_payment_id is not null;

alter table public.institution_member_charges enable row level security;
create policy "Read access views institution_member_charges" on public.institution_member_charges for select
  using (public.institution_has_read_access(institution_id));
-- Server-write-only.
