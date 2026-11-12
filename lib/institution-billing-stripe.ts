import { createServerFn } from "@tanstack/react-start";
import { getStripeClient } from "@/lib/stripe-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { INSTITUTION_PRICING_TIERS, effectiveInstitutionTier, type InstitutionTierKey } from "@/lib/institution-billing-pricing";

const priceIdCache = new Map<InstitutionTierKey, string>();

/** Un Price plano por tramo (no tiered/volume — cada tramo es un monto fijo distinto). */
async function getOrCreateInstitutionPrice(tierKey: InstitutionTierKey): Promise<string> {
  const cached = priceIdCache.get(tierKey);
  if (cached) return cached;
  const stripe = getStripeClient();
  const lookupKey = `togo-institution-${tierKey}-v1`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data[0]) {
    priceIdCache.set(tierKey, existing.data[0].id);
    return existing.data[0].id;
  }
  const tier = INSTITUTION_PRICING_TIERS.find((t) => t.key === tierKey)!;
  const product = await stripe.products.create({ name: `TOGO — Institución (${tierKey})` });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    recurring: { interval: "month" },
    unit_amount: Math.round(tier.monthlyPriceUsd * 100),
    lookup_key: lookupKey,
  });
  priceIdCache.set(tierKey, price.id);
  return price.id;
}

async function getOrCreateInstitutionStripeCustomer(institutionId: string, ownerId: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const stripe = getStripeClient();
  const { data: sub } = await admin.from("institution_subscriptions").select("stripe_customer_id").eq("institution_id", institutionId).maybeSingle();
  if (sub?.["stripe_customer_id"]) return sub["stripe_customer_id"] as string;

  const { data: inst } = await admin.from("institutions").select("name").eq("id", institutionId).maybeSingle();
  const { data: authUser } = await admin.auth.admin.getUserById(ownerId);
  const customer = await stripe.customers.create({
    ...(inst?.["name"] ? { name: inst["name"] as string } : {}),
    ...(authUser?.user?.email ? { email: authUser.user.email } : {}),
    metadata: { institution_id: institutionId },
  });
  await admin.from("institution_subscriptions").upsert(
    { institution_id: institutionId, processor: "stripe", stripe_customer_id: customer.id },
    { onConflict: "institution_id" },
  );
  return customer.id;
}

/** tierKey opcional: la institución puede elegir un tramo más grande del que le exige su uso actual. */
export const startInstitutionStripeCheckout = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; ownerId: string; mode: "club" | "gym"; memberCount: number; coachCount: number; tierKey?: InstitutionTierKey }) => data)
  .handler(async ({ data }) => {
    const stripe = getStripeClient();
    const tier = effectiveInstitutionTier(data.mode, data.memberCount, data.coachCount, data.tierKey ?? null);
    const priceId = await getOrCreateInstitutionPrice(tier.key);
    const customerId = await getOrCreateInstitutionStripeCustomer(data.institutionId, data.ownerId);
    if (data.tierKey) {
      await getSupabaseAdmin().from("institution_subscriptions").update({ selected_tier_key: data.tierKey }).eq("institution_id", data.institutionId);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env["APP_URL"]}/institucion?tab=Configuraci%C3%B3n&stripe=success`,
      cancel_url: `${process.env["APP_URL"]}/institucion?tab=Configuraci%C3%B3n&stripe=cancel`,
      subscription_data: { metadata: { institution_id: data.institutionId } },
    });
    return { url: session.url };
  });

export const createInstitutionStripePortalSession = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: sub } = await admin.from("institution_subscriptions").select("stripe_customer_id").eq("institution_id", data.institutionId).maybeSingle();
    if (!sub?.["stripe_customer_id"]) throw new Error("La institución no tiene una cuenta de Stripe todavía");
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub["stripe_customer_id"] as string,
      return_url: `${process.env["APP_URL"]}/institucion?tab=Configuraci%C3%B3n`,
    });
    return { url: portal.url };
  });

/** Sube de tramo si el uso real lo exige; nunca baja por debajo del tramo elegido manualmente. */
export const syncInstitutionStripeTier = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; mode: "club" | "gym"; memberCount: number; coachCount: number }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: sub } = await admin.from("institution_subscriptions").select("*").eq("institution_id", data.institutionId).maybeSingle();
    if (!sub?.["stripe_subscription_item_id"]) return; // sin suscripción activa, nada que sincronizar

    const tier = effectiveInstitutionTier(data.mode, data.memberCount, data.coachCount, sub["selected_tier_key"] as string | null);
    if (tier.key !== sub["tier_key"]) {
      const priceId = await getOrCreateInstitutionPrice(tier.key);
      await stripe.subscriptionItems.update(sub["stripe_subscription_item_id"] as string, { price: priceId, quantity: 1 });
    }
    await admin.from("institution_subscriptions").update({
      member_count_at_sync: data.memberCount,
      coach_count_at_sync: data.coachCount,
      tier_key: tier.key,
      monthly_price_usd: tier.monthlyPriceUsd,
      charge_amount: tier.monthlyPriceUsd,
      updated_at: new Date().toISOString(),
    }).eq("institution_id", data.institutionId);
  });

/** La institución elige explícitamente un tramo distinto (igual o más grande) ya con suscripción activa. */
export const changeInstitutionStripeTier = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; mode: "club" | "gym"; memberCount: number; coachCount: number; tierKey: InstitutionTierKey }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: sub } = await admin.from("institution_subscriptions").select("*").eq("institution_id", data.institutionId).maybeSingle();
    if (!sub?.["stripe_subscription_item_id"]) throw new Error("No hay una suscripción de Stripe activa");

    await admin.from("institution_subscriptions").update({ selected_tier_key: data.tierKey }).eq("institution_id", data.institutionId);
    const tier = effectiveInstitutionTier(data.mode, data.memberCount, data.coachCount, data.tierKey);
    const priceId = await getOrCreateInstitutionPrice(tier.key);
    await stripe.subscriptionItems.update(sub["stripe_subscription_item_id"] as string, { price: priceId, quantity: 1 });

    await admin.from("institution_subscriptions").update({
      tier_key: tier.key,
      monthly_price_usd: tier.monthlyPriceUsd,
      charge_amount: tier.monthlyPriceUsd,
      updated_at: new Date().toISOString(),
    }).eq("institution_id", data.institutionId);
  });
