import { createServerFn } from "@tanstack/react-start";
import { getStripeClient, getOrCreateCoachTieredPrice } from "@/lib/stripe-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { effectiveTier, billingQuantity, type TierKey } from "@/lib/billing-pricing";

async function getOrCreateStripeCustomer(coachId: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const stripe = getStripeClient();
  const { data: sub } = await admin.from("coach_subscriptions").select("stripe_customer_id").eq("coach_id", coachId).maybeSingle();
  if (sub?.["stripe_customer_id"]) return sub["stripe_customer_id"] as string;

  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", coachId).maybeSingle();
  const { data: authUser } = await admin.auth.admin.getUserById(coachId);
  const customer = await stripe.customers.create({
    ...(profile?.["full_name"] ? { name: profile["full_name"] as string } : {}),
    ...(authUser?.user?.email ? { email: authUser.user.email } : {}),
    metadata: { coach_id: coachId },
  });
  await admin.from("coach_subscriptions").upsert(
    { coach_id: coachId, processor: "stripe", stripe_customer_id: customer.id },
    { onConflict: "coach_id" },
  );
  return customer.id;
}

/** tierKey opcional: el coach puede elegir un tramo más grande del que le exige su uso actual. */
export const startStripeCheckout = createServerFn({ method: "POST" })
  .validator((data: { coachId: string; athleteCount: number; tierKey?: TierKey }) => data)
  .handler(async ({ data }) => {
    const stripe = getStripeClient();
    const priceId = await getOrCreateCoachTieredPrice();
    const customerId = await getOrCreateStripeCustomer(data.coachId);
    const quantity = billingQuantity(data.athleteCount, data.tierKey ?? null);

    if (data.tierKey) {
      await getSupabaseAdmin().from("coach_subscriptions").update({ selected_tier_key: data.tierKey }).eq("coach_id", data.coachId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: Math.max(quantity, 1) }],
      success_url: `${process.env["APP_URL"]}/configuracion?tab=Suscripci%C3%B3n&stripe=success`,
      cancel_url: `${process.env["APP_URL"]}/configuracion?tab=Suscripci%C3%B3n&stripe=cancel`,
      subscription_data: { metadata: { coach_id: data.coachId } },
    });
    return { url: session.url };
  });

export const createStripePortalSession = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: sub } = await admin.from("coach_subscriptions").select("stripe_customer_id").eq("coach_id", data.coachId).maybeSingle();
    if (!sub?.["stripe_customer_id"]) throw new Error("El coach no tiene una cuenta de Stripe todavía");
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub["stripe_customer_id"] as string,
      return_url: `${process.env["APP_URL"]}/configuracion?tab=Suscripci%C3%B3n`,
    });
    return { url: portal.url };
  });

/** Sube de tramo si el uso real lo exige; nunca baja por debajo del tramo elegido manualmente. */
export const syncStripeSubscriptionQuantity = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: sub } = await admin.from("coach_subscriptions").select("*").eq("coach_id", data.coachId).maybeSingle();
    if (!sub?.["stripe_subscription_item_id"]) return; // coach en free, nada que sincronizar

    const { data: count } = await admin.rpc("coach_athlete_count", { target_coach_id: data.coachId });
    const athleteCount = Number(count ?? 0);
    const tier = effectiveTier(athleteCount, sub["selected_tier_key"] as string | null);
    const quantity = billingQuantity(athleteCount, sub["selected_tier_key"] as string | null);
    await stripe.subscriptionItems.update(sub["stripe_subscription_item_id"] as string, { quantity });

    await admin.from("coach_subscriptions").update({
      athlete_count_at_sync: athleteCount,
      tier_key: tier.key,
      monthly_price_usd: tier.flatPriceUsd ?? Number((tier.perAthleteUsd! * quantity).toFixed(2)),
      charge_amount: tier.flatPriceUsd ?? Number((tier.perAthleteUsd! * quantity).toFixed(2)),
      updated_at: new Date().toISOString(),
    }).eq("coach_id", data.coachId);
  });

/** El coach elige explícitamente un tramo distinto (igual o más grande) ya con suscripción activa. */
export const changeStripeTier = createServerFn({ method: "POST" })
  .validator((data: { coachId: string; tierKey: TierKey }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: sub } = await admin.from("coach_subscriptions").select("*").eq("coach_id", data.coachId).maybeSingle();
    if (!sub?.["stripe_subscription_item_id"]) throw new Error("No hay una suscripción de Stripe activa");

    await admin.from("coach_subscriptions").update({ selected_tier_key: data.tierKey }).eq("coach_id", data.coachId);
    const { data: count } = await admin.rpc("coach_athlete_count", { target_coach_id: data.coachId });
    const athleteCount = Number(count ?? 0);
    const tier = effectiveTier(athleteCount, data.tierKey);
    const quantity = billingQuantity(athleteCount, data.tierKey);
    await stripe.subscriptionItems.update(sub["stripe_subscription_item_id"] as string, { quantity });

    await admin.from("coach_subscriptions").update({
      tier_key: tier.key,
      monthly_price_usd: tier.flatPriceUsd ?? Number((tier.perAthleteUsd! * quantity).toFixed(2)),
      charge_amount: tier.flatPriceUsd ?? Number((tier.perAthleteUsd! * quantity).toFixed(2)),
      updated_at: new Date().toISOString(),
    }).eq("coach_id", data.coachId);
  });
