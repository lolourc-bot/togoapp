import { createServerFn } from "@tanstack/react-start";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { supabase } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** El dueño/staff de la institución fija cuánto le cobra a este socio por mes. */
export async function setMemberPlanPrice(memberId: string, amountCents: number, currency: string) {
  const { error } = await supabase.from("institution_members").update({ plan_amount: amountCents, plan_currency: currency }).eq("id", memberId);
  if (error) throw error;
}

export type MemberBillingInfo = {
  memberId: string;
  fullName: string;
  email: string | null;
  planAmount: number | null;
  planCurrency: string | null;
  billingStatus: "none" | "pending" | "active" | "past_due" | "canceled";
  processor: "stripe" | "mercadopago";
  institutionAccountActive: boolean;
};

/** Token de acceso = el memberId (uuid no adivinable) — mismo patrón que program_purchases. */
export const fetchMemberBillingForPayment = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }): Promise<MemberBillingInfo | null> => {
    const admin = getSupabaseAdmin();
    const { data: member } = await admin
      .from("institution_members")
      .select("id, full_name, email, plan_amount, plan_currency, billing_status, institution_id")
      .eq("id", data.memberId)
      .maybeSingle();
    if (!member) return null;
    const { data: account } = await admin
      .from("institution_payment_accounts")
      .select("processor, status")
      .eq("institution_id", member["institution_id"] as string)
      .maybeSingle();
    return {
      memberId: member["id"] as string,
      fullName: member["full_name"] as string,
      email: member["email"] as string | null,
      planAmount: member["plan_amount"] as number | null,
      planCurrency: member["plan_currency"] as string | null,
      billingStatus: member["billing_status"] as MemberBillingInfo["billingStatus"],
      processor: (account?.["processor"] as "stripe" | "mercadopago" | undefined) ?? "stripe",
      institutionAccountActive: account?.["status"] === "active",
    };
  });

export const createMemberStripeCheckout = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const stripe = getStripeClient();
    const { data: member } = await admin.from("institution_members").select("*").eq("id", data.memberId).single();
    if (!member["plan_amount"]) throw new Error("Este socio todavía no tiene un precio de cuota configurado");
    const { data: account } = await admin.from("institution_payment_accounts").select("stripe_account_id, status").eq("institution_id", member["institution_id"] as string).single();
    if (!account?.["stripe_account_id"] || account["status"] !== "active") throw new Error("La institución todavía no activó los cobros");

    // Direct charge: la sesión se crea directamente sobre la cuenta conectada de la
    // institución — la plata de la cuota entra ahí, no a la cuenta de TOGO.
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: (member["plan_currency"] as string).toLowerCase(),
            product_data: { name: "Cuota mensual" },
            recurring: { interval: "month" },
            unit_amount: member["plan_amount"] as number,
          },
          quantity: 1,
        }],
        success_url: `${process.env["APP_URL"]}/completar-cuota/${data.memberId}?result=success`,
        cancel_url: `${process.env["APP_URL"]}/completar-cuota/${data.memberId}?result=cancel`,
        subscription_data: { metadata: { member_id: data.memberId, institution_id: member["institution_id"] as string } },
      },
      { stripeAccount: account["stripe_account_id"] as string },
    );
    await admin.from("institution_members").update({ billing_status: "pending" }).eq("id", data.memberId);
    return { url: session.url };
  });

export const createMemberMpPreapproval = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: member } = await admin.from("institution_members").select("*").eq("id", data.memberId).single();
    if (!member["plan_amount"]) throw new Error("Este socio todavía no tiene un precio de cuota configurado");
    if (!member["email"]) throw new Error("Este socio no tiene un email cargado");
    const { data: account } = await admin.from("institution_payment_accounts").select("mp_access_token, status").eq("institution_id", member["institution_id"] as string).single();
    if (!account?.["mp_access_token"] || account["status"] !== "active") throw new Error("La institución todavía no activó los cobros");

    const client = new MercadoPagoConfig({ accessToken: account["mp_access_token"] as string });
    const preapproval = new PreApproval(client);
    const result = await preapproval.create({
      body: {
        reason: "Cuota mensual",
        external_reference: data.memberId,
        payer_email: member["email"] as string,
        auto_recurring: {
          frequency: 1, frequency_type: "months",
          transaction_amount: (member["plan_amount"] as number) / 100,
          currency_id: member["plan_currency"] as string,
        },
        back_url: `${process.env["APP_URL"]}/completar-cuota/${data.memberId}?result=success`,
      },
    });
    await admin.from("institution_members").update({ billing_status: "pending", mp_preapproval_id: result.id }).eq("id", data.memberId);
    return { url: result.init_point };
  });

export type InstitutionMemberCharge = {
  id: string;
  memberName: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

export async function fetchInstitutionMemberCharges(institutionId: string): Promise<InstitutionMemberCharge[]> {
  const { data, error } = await supabase
    .from("institution_member_charges")
    .select("id, amount, currency, status, paid_at, created_at, institution_members(full_name)")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map((c) => ({
    id: c.id, memberName: c.institution_members?.full_name ?? "Socio",
    amount: c.amount, currency: c.currency, status: c.status, paidAt: c.paid_at, createdAt: c.created_at,
  }));
}
