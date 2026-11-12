import { createServerFn } from "@tanstack/react-start";
import { getStripeClient } from "@/lib/stripe-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type PaymentAccountStatus = {
  processor: "stripe" | "mercadopago" | null;
  status: "pending" | "onboarding" | "active" | "restricted" | "disabled";
};

/** Estado redactado — nunca expone tokens/IDs crudos al cliente. */
export const fetchInstitutionPaymentAccountStatus = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }): Promise<PaymentAccountStatus> => {
    const admin = getSupabaseAdmin();
    const { data: account } = await admin.from("institution_payment_accounts").select("processor, status").eq("institution_id", data.institutionId).maybeSingle();
    if (!account) return { processor: null, status: "pending" };
    return { processor: account["processor"] as "stripe" | "mercadopago", status: account["status"] as PaymentAccountStatus["status"] };
  });

export const startInstitutionStripeConnectOnboarding = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }) => {
    const stripe = getStripeClient();
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin.from("institution_payment_accounts").select("stripe_account_id").eq("institution_id", data.institutionId).maybeSingle();
    let accountId = existing?.["stripe_account_id"] as string | undefined;

    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express" });
      accountId = account.id;
      await admin.from("institution_payment_accounts").upsert(
        { institution_id: data.institutionId, processor: "stripe", stripe_account_id: accountId, status: "onboarding" },
        { onConflict: "institution_id" },
      );
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env["APP_URL"]}/institucion?tab=Configuraci%C3%B3n&section=Caja&stripe=refresh`,
      return_url: `${process.env["APP_URL"]}/institucion?tab=Configuraci%C3%B3n&section=Caja&stripe=return`,
      type: "account_onboarding",
    });
    return { url: link.url };
  });

export const createInstitutionStripeExpressDashboardLink = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: account } = await admin.from("institution_payment_accounts").select("stripe_account_id").eq("institution_id", data.institutionId).maybeSingle();
    if (!account?.["stripe_account_id"]) throw new Error("No hay una cuenta de Stripe conectada");
    const link = await stripe.accounts.createLoginLink(account["stripe_account_id"] as string);
    return { url: link.url };
  });

export const refreshInstitutionStripeAccountStatus = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: existing } = await admin.from("institution_payment_accounts").select("stripe_account_id").eq("institution_id", data.institutionId).maybeSingle();
    if (!existing?.["stripe_account_id"]) return;
    const account = await stripe.accounts.retrieve(existing["stripe_account_id"] as string);
    const status = account.charges_enabled && account.payouts_enabled ? "active" : account.details_submitted ? "restricted" : "onboarding";
    await admin.from("institution_payment_accounts").update({
      stripe_charges_enabled: account.charges_enabled ?? false,
      stripe_payouts_enabled: account.payouts_enabled ?? false,
      stripe_details_submitted: account.details_submitted ?? false,
      status,
      updated_at: new Date().toISOString(),
    }).eq("institution_id", data.institutionId);
  });

export const startInstitutionMercadoPagoOAuth = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }) => {
    const clientId = process.env["MERCADOPAGO_CLIENT_ID"];
    if (!clientId) throw new Error("MERCADOPAGO_CLIENT_ID no configurada");
    const redirectUri = `${process.env["APP_URL"]}/api/mp-oauth-callback`;
    const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=inst:${data.institutionId}`;
    return { url };
  });
