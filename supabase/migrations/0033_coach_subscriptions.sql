create table public.coach_subscriptions (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  processor text not null check (processor in ('stripe', 'mercadopago')),
  status text not null default 'free'
    check (status in ('free', 'active', 'past_due', 'canceled', 'incomplete')),

  athlete_count_at_sync int not null default 0,
  tier_key text not null default 'free',
  monthly_price_usd numeric(10,2) not null default 0,
  charge_currency text not null default 'USD',
  charge_amount numeric(12,2),

  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_item_id text,

  mp_preapproval_id text,
  mp_payer_id text,

  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index coach_subscriptions_stripe_sub_idx on public.coach_subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;
create unique index coach_subscriptions_mp_preapproval_idx on public.coach_subscriptions (mp_preapproval_id) where mp_preapproval_id is not null;

alter table public.coach_subscriptions enable row level security;
create policy "Coach reads own subscription" on public.coach_subscriptions for select using (auth.uid() = coach_id);
-- Sin policy de insert/update/delete para authenticated: solo service-role escribe.
