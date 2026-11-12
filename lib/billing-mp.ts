import { createServerFn } from "@tanstack/react-start";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { effectiveTier, billingQuantity, type TierKey } from "@/lib/billing-pricing";

function getMpClient(): MercadoPagoConfig {
  const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"]; // TOGO como merchant propio
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurada");
  return new MercadoPagoConfig({ accessToken });
}

function arsAmountFor(athleteCount: number, selectedTierKey: string | null | undefined): { amount: number; tierKey: TierKey } {
  const tier = effectiveTier(athleteCount, selectedTierKey);
  const quantity = billingQuantity(athleteCount, selectedTierKey);
  const amount = tier.flatPriceArs ?? Math.round(tier.perAthleteArs! * quantity);
  return { amount, tierKey: tier.key };
}

/** tierKey opcional: el coach puede elegir un tramo más grande del que le exige su uso actual. */
export const startMpSubscription = createServerFn({ method: "POST" })
  .validator((data: { coachId: string; athleteCount: number; tierKey?: TierKey }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: authUser } = await admin.auth.admin.getUserById(data.coachId);
    const email = authUser?.user?.email;
    if (!email) throw new Error("No se encontró el email del coach");

    const { amount, tierKey } = arsAmountFor(data.athleteCount, data.tierKey);
    const preapproval = new PreApproval(getMpClient());
    const result = await preapproval.create({
      body: {
        reason: "Suscripción TOGO — coach",
        external_reference: data.coachId,
        payer_email: email,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: amount, currency_id: "ARS" },
        back_url: `${process.env["APP_URL"]}/configuracion?tab=Suscripci%C3%B3n&mp=success`,
      },
    });

    await admin.from("coach_subscriptions").upsert(
      {
        coach_id: data.coachId,
        processor: "mercadopago",
        mp_preapproval_id: result.id,
        status: "incomplete",
        athlete_count_at_sync: data.athleteCount,
        tier_key: tierKey,
        selected_tier_key: data.tierKey ?? null,
        charge_currency: "ARS",
        charge_amount: amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "coach_id" },
    );
    return { url: result.init_point };
  });

/** Sube de tramo si el uso real lo exige; nunca baja por debajo del tramo elegido manualmente. */
export const syncMpSubscriptionAmount = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: sub } = await admin.from("coach_subscriptions").select("*").eq("coach_id", data.coachId).maybeSingle();
    if (!sub?.["mp_preapproval_id"]) return; // coach en free o en Stripe, nada que sincronizar

    const { data: count } = await admin.rpc("coach_athlete_count", { target_coach_id: data.coachId });
    const athleteCount = Number(count ?? 0);
    const { amount, tierKey } = arsAmountFor(athleteCount, sub["selected_tier_key"] as string | null);
    if (amount === Number(sub["charge_amount"])) return; // sin cambios, evita llamada innecesaria a MP

    const preapproval = new PreApproval(getMpClient());
    await preapproval.update({
      id: sub["mp_preapproval_id"] as string,
      body: { auto_recurring: { transaction_amount: amount, currency_id: "ARS" } },
    });

    await admin.from("coach_subscriptions").update({
      athlete_count_at_sync: athleteCount,
      tier_key: tierKey,
      charge_amount: amount,
      updated_at: new Date().toISOString(),
    }).eq("coach_id", data.coachId);
  });

/** El coach elige explícitamente un tramo distinto (igual o más grande) ya con suscripción activa. */
export const changeMpTier = createServerFn({ method: "POST" })
  .validator((data: { coachId: string; tierKey: TierKey }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: sub } = await admin.from("coach_subscriptions").select("*").eq("coach_id", data.coachId).maybeSingle();
    if (!sub?.["mp_preapproval_id"]) throw new Error("No hay una suscripción de Mercado Pago activa");

    await admin.from("coach_subscriptions").update({ selected_tier_key: data.tierKey }).eq("coach_id", data.coachId);
    const { data: count } = await admin.rpc("coach_athlete_count", { target_coach_id: data.coachId });
    const athleteCount = Number(count ?? 0);
    const { amount, tierKey } = arsAmountFor(athleteCount, data.tierKey);

    const preapproval = new PreApproval(getMpClient());
    await preapproval.update({ id: sub["mp_preapproval_id"] as string, body: { auto_recurring: { transaction_amount: amount, currency_id: "ARS" } } });

    await admin.from("coach_subscriptions").update({
      tier_key: tierKey,
      charge_amount: amount,
      updated_at: new Date().toISOString(),
    }).eq("coach_id", data.coachId);
  });

export const cancelMpSubscription = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: sub } = await admin.from("coach_subscriptions").select("mp_preapproval_id").eq("coach_id", data.coachId).maybeSingle();
    if (!sub?.["mp_preapproval_id"]) throw new Error("El coach no tiene una suscripción de Mercado Pago activa");
    const preapproval = new PreApproval(getMpClient());
    await preapproval.update({ id: sub["mp_preapproval_id"] as string, body: { status: "cancelled" } });
    await admin.from("coach_subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("coach_id", data.coachId);
  });
