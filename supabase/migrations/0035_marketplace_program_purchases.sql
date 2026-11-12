create table public.coach_payment_accounts (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
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
alter table public.coach_payment_accounts enable row level security;
create policy "Coach reads own payment account" on public.coach_payment_accounts for select using (auth.uid() = coach_id);
-- Server-write-only.

create table public.program_purchases (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  athlete_id uuid references public.athletes(id) on delete set null,
  marketplace_request_id uuid references public.marketplace_requests(id) on delete set null,

  processor text not null check (processor in ('stripe', 'mercadopago')),
  currency text not null,
  amount_total integer not null,
  commission_rate numeric not null default 0.15,
  commission_amount integer not null,
  net_amount integer not null,

  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  stripe_transfer_status text check (stripe_transfer_status in ('pending', 'completed', 'reversed')),
  mp_payment_id text,
  mp_preference_id text,

  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  purchased_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.program_purchases (coach_id);
create index on public.program_purchases (athlete_id);
create unique index on public.program_purchases (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create unique index on public.program_purchases (mp_payment_id) where mp_payment_id is not null;

alter table public.program_purchases enable row level security;
create policy "Coach reads own program_purchases" on public.program_purchases for select using (auth.uid() = coach_id);
create policy "Athlete reads own program_purchases" on public.program_purchases for select
  using (exists (select 1 from public.athletes a where a.id = program_purchases.athlete_id and a.auth_user_id = auth.uid()));
-- Server-write-only.

alter table public.marketplace_requests add column if not exists program_purchase_id uuid references public.program_purchases(id) on delete set null;
