import { createServerFn } from "@tanstack/react-start";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { effectiveInstitutionTier, type InstitutionTierKey } from "@/lib/institution-billing-pricing";

function getMpClient(): MercadoPagoConfig {
  const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"]; // TOGO como merchant propio
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurada");
  return new MercadoPagoConfig({ accessToken });
}

/** tierKey opcional: la institución puede elegir un tramo más grande del que le exige su uso actual. */
export const startInstitutionMpSubscription = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; ownerId: string; mode: "club" | "gym"; memberCount: number; coachCount: number; tierKey?: InstitutionTierKey }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: authUser } = await admin.auth.admin.getUserById(data.ownerId);
    const email = authUser?.user?.email;
    if (!email) throw new Error("No se encontró el email del propietario de la institución");

    const tier = effectiveInstitutionTier(data.mode, data.memberCount, data.coachCount, data.tierKey ?? null);
    const preapproval = new PreApproval(getMpClient());
    const result = await preapproval.create({
      body: {
        reason: "Suscripción TOGO — institución",
        external_reference: data.institutionId,
        payer_email: email,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: tier.monthlyPriceArs, currency_id: "ARS" },
        back_url: `${process.env["APP_URL"]}/institucion?tab=Configuraci%C3%B3n&mp=success`,
      },
    });

    await admin.from("institution_subscriptions").upsert(
      {
        institution_id: data.institutionId,
        processor: "mercadopago",
        mp_preapproval_id: result.id,
        status: "incomplete",
        member_count_at_sync: data.memberCount,
        coach_count_at_sync: data.coachCount,
        tier_key: tier.key,
        selected_tier_key: data.tierKey ?? null,
        charge_currency: "ARS",
        charge_amount: tier.monthlyPriceArs,
        monthly_price_usd: tier.monthlyPriceUsd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "institution_id" },
    );
    return { url: result.init_point };
  });

/** Sube de tramo si el uso real lo exige; nunca baja por debajo del tramo elegido manualmente. */
export const syncInstitutionMpAmount = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; mode: "club" | "gym"; memberCount: number; coachCount: number }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: sub } = await admin.from("institution_subscriptions").select("*").eq("institution_id", data.institutionId).maybeSingle();
    if (!sub?.["mp_preapproval_id"]) return;

    const tier = effectiveInstitutionTier(data.mode, data.memberCount, data.coachCount, sub["selected_tier_key"] as string | null);
    if (tier.monthlyPriceArs === Number(sub["charge_amount"])) return;

    const preapproval = new PreApproval(getMpClient());
    await preapproval.update({
      id: sub["mp_preapproval_id"] as string,
      body: { auto_recurring: { transaction_amount: tier.monthlyPriceArs, currency_id: "ARS" } },
    });

    await admin.from("institution_subscriptions").update({
      member_count_at_sync: data.memberCount,
      coach_count_at_sync: data.coachCount,
      tier_key: tier.key,
      charge_amount: tier.monthlyPriceArs,
      monthly_price_usd: tier.monthlyPriceUsd,
      updated_at: new Date().toISOString(),
    }).eq("institution_id", data.institutionId);
  });

/** La institución elige explícitamente un tramo distinto (igual o más grande) ya con suscripción activa. */
export const changeInstitutionMpTier = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; mode: "club" | "gym"; memberCount: number; coachCount: number; tierKey: InstitutionTierKey }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: sub } = await admin.from("institution_subscriptions").select("*").eq("institution_id", data.institutionId).maybeSingle();
    if (!sub?.["mp_preapproval_id"]) throw new Error("No hay una suscripción de Mercado Pago activa");

    await admin.from("institution_subscriptions").update({ selected_tier_key: data.tierKey }).eq("institution_id", data.institutionId);
    const tier = effectiveInstitutionTier(data.mode, data.memberCount, data.coachCount, data.tierKey);

    const preapproval = new PreApproval(getMpClient());
    await preapproval.update({ id: sub["mp_preapproval_id"] as string, body: { auto_recurring: { transaction_amount: tier.monthlyPriceArs, currency_id: "ARS" } } });

    await admin.from("institution_subscriptions").update({
      tier_key: tier.key,
      charge_amount: tier.monthlyPriceArs,
      monthly_price_usd: tier.monthlyPriceUsd,
      updated_at: new Date().toISOString(),
    }).eq("institution_id", data.institutionId);
  });

export const cancelInstitutionMpSubscription = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: sub } = await admin.from("institution_subscriptions").select("mp_preapproval_id").eq("institution_id", data.institutionId).maybeSingle();
    if (!sub?.["mp_preapproval_id"]) throw new Error("La institución no tiene una suscripción de Mercado Pago activa");
    const preapproval = new PreApproval(getMpClient());
    await preapproval.update({ id: sub["mp_preapproval_id"] as string, body: { status: "cancelled" } });
    await admin.from("institution_subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("institution_id", data.institutionId);
  });
