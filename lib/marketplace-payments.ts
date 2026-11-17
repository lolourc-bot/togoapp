import { createServerFn } from "@tanstack/react-start";
import { isProgramCurrency, parsePriceInput } from "./program-price";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getStripeClient } from "@/lib/stripe-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

export type CoachProgramPurchase = {
  id: string;
  programName: string;
  buyerName: string | null;
  buyerEmail: string | null;
  amountTotal: number;
  netAmount: number;
  currency: string;
  status: string;
  purchasedAt: string | null;
  createdAt: string;
};

/** Lectura directa — la RLS ya permite al coach ver sus propias filas de program_purchases. */
export async function fetchMyProgramPurchases(coachId: string): Promise<CoachProgramPurchase[]> {
  const { data, error } = await supabase
    .from("program_purchases")
    .select("id, amount_total, net_amount, currency, status, purchased_at, created_at, buyer_name, buyer_email, programs(name)")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((p: any) => ({
    id: p.id,
    programName: p.programs?.name ?? "Programa",
    buyerName: p.buyer_name ?? null,
    buyerEmail: p.buyer_email ?? null,
    amountTotal: p.amount_total,
    netAmount: p.net_amount,
    currency: p.currency,
    status: p.status,
    purchasedAt: p.purchased_at,
    createdAt: p.created_at,
  }));
}

export type PaymentAccountStatus = {
  processor: "stripe" | "mercadopago" | null;
  status: "pending" | "onboarding" | "active" | "restricted" | "disabled";
};

/** Estado redactado — nunca expone tokens/IDs crudos al cliente. */
export const fetchMyPaymentAccountStatus = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }): Promise<PaymentAccountStatus> => {
    const admin = getSupabaseAdmin();
    const { data: account } = await admin.from("coach_payment_accounts").select("processor, status").eq("coach_id", data.coachId).maybeSingle();
    if (!account) return { processor: null, status: "pending" };
    return { processor: account["processor"] as "stripe" | "mercadopago", status: account["status"] as PaymentAccountStatus["status"] };
  });

export const startStripeConnectOnboarding = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }) => {
    const stripe = getStripeClient();
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin.from("coach_payment_accounts").select("stripe_account_id").eq("coach_id", data.coachId).maybeSingle();
    let accountId = existing?.["stripe_account_id"] as string | undefined;

    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express" });
      accountId = account.id;
      await admin.from("coach_payment_accounts").upsert(
        { coach_id: data.coachId, processor: "stripe", stripe_account_id: accountId, status: "onboarding" },
        { onConflict: "coach_id" },
      );
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env["APP_URL"]}/configuracion?tab=Pagos&stripe=refresh`,
      return_url: `${process.env["APP_URL"]}/configuracion?tab=Pagos&stripe=return`,
      type: "account_onboarding",
    });
    return { url: link.url };
  });

export const createStripeExpressDashboardLink = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: account } = await admin.from("coach_payment_accounts").select("stripe_account_id").eq("coach_id", data.coachId).maybeSingle();
    if (!account?.["stripe_account_id"]) throw new Error("No hay una cuenta de Stripe conectada");
    const link = await stripe.accounts.createLoginLink(account["stripe_account_id"] as string);
    return { url: link.url };
  });

export const refreshStripeAccountStatus = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: existing } = await admin.from("coach_payment_accounts").select("stripe_account_id").eq("coach_id", data.coachId).maybeSingle();
    if (!existing?.["stripe_account_id"]) return;
    const account = await stripe.accounts.retrieve(existing["stripe_account_id"] as string);
    const status = account.charges_enabled && account.payouts_enabled ? "active" : account.details_submitted ? "restricted" : "onboarding";
    await admin.from("coach_payment_accounts").update({
      stripe_charges_enabled: account.charges_enabled ?? false,
      stripe_payouts_enabled: account.payouts_enabled ?? false,
      stripe_details_submitted: account.details_submitted ?? false,
      status,
      updated_at: new Date().toISOString(),
    }).eq("coach_id", data.coachId);
  });

export const startMercadoPagoMarketplaceOAuth = createServerFn({ method: "POST" })
  .validator((data: { coachId: string }) => data)
  .handler(async ({ data }) => {
    const clientId = process.env["MERCADOPAGO_CLIENT_ID"];
    if (!clientId) throw new Error("MERCADOPAGO_CLIENT_ID no configurada");
    const redirectUri = `${process.env["APP_URL"]}/api/mp-oauth-callback`;
    const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=coach:${data.coachId}`;
    return { url };
  });

// --- Compra de programa (pago único, 15% de comisión) ---

export type ProgramPurchaseForPayment = {
  id: string;
  programName: string;
  amountTotal: number;
  currency: string;
  status: string;
  processor: "stripe" | "mercadopago";
  coachPaymentAccountActive: boolean;
};

/** El id de la compra actúa como token de acceso (no adivinable) — igual que una URL de Checkout. */
export const fetchProgramPurchaseForPayment = createServerFn({ method: "POST" })
  .validator((data: { purchaseId: string }) => data)
  .handler(async ({ data }): Promise<ProgramPurchaseForPayment | null> => {
    const admin = getSupabaseAdmin();
    const { data: purchase } = await admin
      .from("program_purchases")
      .select("id, amount_total, currency, status, processor, coach_id, programs(name)")
      .eq("id", data.purchaseId)
      .maybeSingle();
    if (!purchase) return null;
    const { data: account } = await admin.from("coach_payment_accounts").select("status").eq("coach_id", purchase["coach_id"] as string).maybeSingle();
    const programs = purchase["programs"] as { name: string } | { name: string }[] | null;
    const programName = Array.isArray(programs) ? (programs[0]?.name ?? "Programa") : (programs?.name ?? "Programa");
    return {
      id: purchase["id"] as string,
      programName,
      amountTotal: purchase["amount_total"] as number,
      currency: purchase["currency"] as string,
      status: purchase["status"] as string,
      processor: purchase["processor"] as "stripe" | "mercadopago",
      coachPaymentAccountActive: account?.["status"] === "active",
    };
  });

export const createProgramCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: { purchaseId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: purchase } = await admin.from("program_purchases").select("*, programs(name)").eq("id", data.purchaseId).single();
    const programs = purchase["programs"] as { name: string } | { name: string }[] | null;
    const programName = Array.isArray(programs) ? (programs[0]?.name ?? "Programa") : (programs?.name ?? "Programa");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: (purchase["currency"] as string).toLowerCase(),
          product_data: { name: programName },
          unit_amount: purchase["amount_total"] as number,
        },
        quantity: 1,
      }],
      success_url: `${process.env["APP_URL"]}/completar-pago/${purchase["id"]}?result=success`,
      cancel_url: `${process.env["APP_URL"]}/completar-pago/${purchase["id"]}?result=cancel`,
      metadata: { purchase_id: purchase["id"] as string },
    });
    await admin.from("program_purchases").update({ stripe_checkout_session_id: session.id }).eq("id", data.purchaseId);
    return { url: session.url };
  });

export const createProgramMpPreference = createServerFn({ method: "POST" })
  .validator((data: { purchaseId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: purchase } = await admin.from("program_purchases").select("*, programs(name)").eq("id", data.purchaseId).single();
    const { data: account } = await admin.from("coach_payment_accounts").select("mp_access_token, status").eq("coach_id", purchase["coach_id"] as string).single();
    if (!account || account["status"] !== "active") throw new Error("La cuenta de cobro del coach no está activa");

    const programs = purchase["programs"] as { name: string } | { name: string }[] | null;
    const programName = Array.isArray(programs) ? (programs[0]?.name ?? "Programa") : (programs?.name ?? "Programa");

    const client = new MercadoPagoConfig({ accessToken: account["mp_access_token"] as string });
    const preference = new Preference(client);
    const pref = await preference.create({
      body: {
        items: [{
          id: purchase["program_id"] as string,
          title: programName,
          quantity: 1,
          unit_price: (purchase["amount_total"] as number) / 100,
          currency_id: purchase["currency"] as string,
        }],
        marketplace_fee: (purchase["commission_amount"] as number) / 100,
        back_urls: {
          success: `${process.env["APP_URL"]}/completar-pago/${purchase["id"]}?result=success`,
          failure: `${process.env["APP_URL"]}/completar-pago/${purchase["id"]}?result=cancel`,
        },
        notification_url: `${process.env["APP_URL"]}/api/mp-webhook`,
        metadata: { purchase_id: purchase["id"] },
      },
    });
    await admin.from("program_purchases").update({ mp_preference_id: pref.id }).eq("id", data.purchaseId);
    return { url: pref.init_point };
  });

/**
 * Compra directa de un programa pago — sin pasar por marketplace_requests ni esperar
 * que el coach acepte nada. El atleta paga al toque; el webhook de pago confirmado crea
 * el atleta y materializa el programa en su calendario.
 */
export const createDirectProgramPurchase = createServerFn({ method: "POST" })
  .validator((data: { coachId: string; programId: string; buyerName: string; buyerEmail: string }) => data)
  .handler(async ({ data }): Promise<{ purchaseId: string }> => {
    const admin = getSupabaseAdmin();
    // "*" so the optional `currency` column (migration 0048) doesn't break checkout while it's pending.
    const { data: program } = await admin.from("programs").select("*").eq("id", data.programId).eq("coach_id", data.coachId).maybeSingle();
    if (!program) throw new Error("Programa no encontrado");
    // Understands "8.500", "$8.500", "8.500,50" and plain "8500" (the old Number() parse read "8.500" as 8.5).
    const priceNum = parsePriceInput(program["price"] as string | null);
    if (program["payment_type"] !== "unico" || priceNum <= 0) throw new Error("Este programa no tiene un precio de pago único");

    // The program's own currency wins; older programs fall back to the coach's billing currency.
    // Pesos go through Mercado Pago, dollars and euros through Stripe.
    let currency: string;
    if (isProgramCurrency(program["currency"])) {
      currency = program["currency"];
    } else {
      const { data: profile } = await admin.from("profiles").select("currency").eq("id", data.coachId).maybeSingle();
      currency = profile?.["currency"] === "ARS" ? "ARS" : "USD";
    }
    const processor = currency === "ARS" ? "mercadopago" : "stripe";
    const amountTotal = Math.round(priceNum * 100);
    const commissionAmount = Math.round(amountTotal * 0.15);
    const netAmount = amountTotal - commissionAmount;

    const { data: purchase, error } = await admin.from("program_purchases").insert({
      coach_id: data.coachId,
      program_id: data.programId,
      processor, currency,
      amount_total: amountTotal,
      commission_rate: 0.15,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      buyer_name: data.buyerName,
      buyer_email: data.buyerEmail,
    }).select("id").single();
    if (error || !purchase) throw new Error("No se pudo crear la compra");
    return { purchaseId: purchase.id };
  });
