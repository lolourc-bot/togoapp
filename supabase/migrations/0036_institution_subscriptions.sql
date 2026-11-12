create table public.institution_subscriptions (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  processor text not null check (processor in ('stripe', 'mercadopago')),
  status text not null default 'incomplete'
    check (status in ('incomplete', 'active', 'past_due', 'canceled')),
    -- sin tramo 'free': las instituciones no tienen plan gratis, deben elegir uno de los 4 tiers.

  member_count_at_sync int not null default 0,
  coach_count_at_sync int not null default 0,
  tier_key text not null default 'tier_1',
    -- 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'
  monthly_price_usd numeric(10,2) not null default 0,
  charge_currency text not null default 'USD',
  charge_amount numeric(12,2),

  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_item_id text,

  mp_preapproval_id text,

  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index institution_subscriptions_stripe_sub_idx on public.institution_subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;
create unique index institution_subscriptions_mp_preapproval_idx on public.institution_subscriptions (mp_preapproval_id) where mp_preapproval_id is not null;

alter table public.institution_subscriptions enable row level security;
create policy "Owner reads own institution subscription" on public.institution_subscriptions for select
  using (exists (select 1 from public.institutions i where i.id = institution_subscriptions.institution_id and i.owner_id = auth.uid()));
-- Sin policy de insert/update/delete para authenticated: solo service-role escribe (igual que coach_subscriptions).
