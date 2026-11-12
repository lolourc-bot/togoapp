import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveTier, monthlyPriceUsd } from "@/lib/billing-pricing";
import { INSTITUTION_PRICING_TIERS, type InstitutionTierKey } from "@/lib/institution-billing-pricing";
import { materializeProgramForAthlete } from "@/lib/program-materialize";

function institutionTierFromPriceLookupKey(lookupKey: string | null | undefined) {
  const match = lookupKey?.match(/^togo-institution-(tier_\d)-v1$/);
  const tierKey = match?.[1] as InstitutionTierKey | undefined;
  return tierKey ? INSTITUTION_PRICING_TIERS.find((t) => t.key === tierKey) : undefined;
}

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const raw = await ctx.request.text();
        const sig = ctx.request.headers.get("stripe-signature");
        const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
        const stripe = getStripeClient();

        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(raw, sig!, webhookSecret!);
        } catch {
          return new Response("Webhook signature verification failed", { status: 400 });
        }

        const admin = getSupabaseAdmin();

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.mode === "subscription" && session.subscription) {
              const requestOpts = event.account ? { stripeAccount: event.account } : undefined;
              const sub = await stripe.subscriptions.retrieve(session.subscription as string, {}, requestOpts);
              const item = sub.items.data[0];
              const coachId = sub.metadata["coach_id"];
              const institutionId = sub.metadata["institution_id"];
              const memberId = sub.metadata["member_id"];
              if (memberId) {
                await admin.from("institution_members").update({
                  stripe_subscription_id: sub.id,
                  billing_status: sub.status === "trialing" || sub.status === "active" ? "active" : "pending",
                }).eq("id", memberId);
              } else if (coachId && item) {
                const tier = resolveTier(item.quantity ?? 0);
                await admin.from("coach_subscriptions").upsert({
                  coach_id: coachId,
                  processor: "stripe",
                  status: sub.status === "trialing" || sub.status === "active" ? "active" : "incomplete",
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: sub.id,
                  stripe_subscription_item_id: item.id,
                  athlete_count_at_sync: item.quantity ?? 0,
                  tier_key: tier.key,
                  monthly_price_usd: monthlyPriceUsd(item.quantity ?? 0),
                  charge_currency: "USD",
                  charge_amount: monthlyPriceUsd(item.quantity ?? 0),
                  current_period_start: item.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
                  current_period_end: item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "coach_id" });
              } else if (institutionId && item) {
                const tier = institutionTierFromPriceLookupKey(item.price.lookup_key);
                await admin.from("institution_subscriptions").upsert({
                  institution_id: institutionId,
                  processor: "stripe",
                  status: sub.status === "trialing" || sub.status === "active" ? "active" : "incomplete",
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: sub.id,
                  stripe_subscription_item_id: item.id,
                  tier_key: tier?.key ?? "tier_1",
                  monthly_price_usd: tier?.monthlyPriceUsd ?? 0,
                  charge_currency: "USD",
                  charge_amount: tier?.monthlyPriceUsd ?? 0,
                  current_period_start: item.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
                  current_period_end: item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "institution_id" });
              }
            } else if (session.mode === "payment") {
              const purchaseId = session.metadata?.["purchase_id"];
              if (purchaseId && session.payment_intent) {
                const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
                const { data: purchase } = await admin.from("program_purchases").select("*").eq("id", purchaseId).maybeSingle();
                if (purchase && purchase["status"] !== "paid") {
                  const { data: account } = await admin.from("coach_payment_accounts").select("stripe_account_id").eq("coach_id", purchase["coach_id"] as string).maybeSingle();
                  let transferId: string | null = null;
                  let transferStatus = "pending";
                  if (account?.["stripe_account_id"]) {
                    const transfer = await stripe.transfers.create({
                      amount: purchase["net_amount"] as number,
                      currency: (purchase["currency"] as string).toLowerCase(),
                      destination: account["stripe_account_id"] as string,
                      source_transaction: paymentIntent.latest_charge as string,
                    });
                    transferId = transfer.id;
                    transferStatus = "completed";
                  }
                  // "Contratado" para un programa pago significa "pagó" — crear la fila de
                  // athletes (y poner el programa en su calendario) recién ahora, sin que el
                  // coach tenga que intervenir.
                  let athleteId: string | null = null;
                  if (purchase["buyer_email"]) {
                    const { data: existing } = await admin.from("athletes").select("id").eq("coach_id", purchase["coach_id"] as string).eq("email", purchase["buyer_email"] as string).maybeSingle();
                    if (existing) {
                      athleteId = existing.id as string;
                    } else {
                      const { data: newAthlete } = await admin.from("athletes").insert({
                        coach_id: purchase["coach_id"], full_name: purchase["buyer_name"], email: purchase["buyer_email"],
                      }).select("id").single();
                      athleteId = newAthlete?.id ?? null;
                    }
                    if (athleteId) {
                      await materializeProgramForAthlete(purchase["coach_id"] as string, purchase["program_id"] as string, athleteId, new Date().toISOString().slice(0, 10));
                    }
                  }

                  await admin.from("program_purchases").update({
                    status: "paid",
                    purchased_at: new Date().toISOString(),
                    stripe_payment_intent_id: paymentIntent.id,
                    stripe_transfer_id: transferId,
                    stripe_transfer_status: transferStatus,
                    athlete_id: athleteId,
                  }).eq("id", purchaseId);
                }
              }
            }
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const coachId = sub.metadata["coach_id"];
            const institutionId = sub.metadata["institution_id"];
            const memberId = sub.metadata["member_id"];
            const item = sub.items.data[0];
            const statusMap: Record<string, string> = {
              trialing: "active", active: "active", past_due: "past_due", canceled: "canceled",
              incomplete: "incomplete", incomplete_expired: "incomplete", unpaid: "incomplete",
            };
            if (memberId) {
              await admin.from("institution_members").update({ billing_status: statusMap[sub.status] ?? "pending" }).eq("id", memberId);
            } else if (coachId && item) {
              const tier = resolveTier(item.quantity ?? 0);
              await admin.from("coach_subscriptions").update({
                status: statusMap[sub.status] ?? "incomplete",
                athlete_count_at_sync: item.quantity ?? 0,
                tier_key: tier.key,
                monthly_price_usd: monthlyPriceUsd(item.quantity ?? 0),
                charge_amount: monthlyPriceUsd(item.quantity ?? 0),
                current_period_start: item.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
                current_period_end: item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString(),
              }).eq("coach_id", coachId);
            } else if (institutionId && item) {
              const tier = institutionTierFromPriceLookupKey(item.price.lookup_key);
              await admin.from("institution_subscriptions").update({
                status: statusMap[sub.status] ?? "incomplete",
                ...(tier ? { tier_key: tier.key, monthly_price_usd: tier.monthlyPriceUsd, charge_amount: tier.monthlyPriceUsd } : {}),
                current_period_start: item.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
                current_period_end: item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString(),
              }).eq("institution_id", institutionId);
            }
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const coachId = sub.metadata["coach_id"];
            const institutionId = sub.metadata["institution_id"];
            const memberId = sub.metadata["member_id"];
            if (memberId) {
              await admin.from("institution_members").update({ billing_status: "canceled" }).eq("id", memberId);
            } else if (coachId) {
              await admin.from("coach_subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("coach_id", coachId);
            } else if (institutionId) {
              await admin.from("institution_subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("institution_id", institutionId);
            }
            break;
          }

          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            const subId = invoice.parent?.subscription_details?.subscription;
            if (subId) {
              const requestOpts = event.account ? { stripeAccount: event.account } : undefined;
              const sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : subId.id, {}, requestOpts);
              const memberId = sub.metadata["member_id"];
              if (memberId) {
                const { data: member } = await admin.from("institution_members").select("institution_id").eq("id", memberId).maybeSingle();
                const { data: already } = await admin.from("institution_member_charges").select("id").eq("stripe_invoice_id", invoice.id).maybeSingle();
                if (member && !already) {
                  await admin.from("institution_member_charges").insert({
                    institution_id: member["institution_id"] as string,
                    member_id: memberId,
                    processor: "stripe",
                    currency: (invoice.currency ?? "usd").toUpperCase(),
                    amount: invoice.amount_paid,
                    stripe_subscription_id: sub.id,
                    stripe_invoice_id: invoice.id,
                    status: "paid",
                    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
                    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
                    paid_at: new Date().toISOString(),
                  });
                  await admin.from("institution_members").update({ billing_status: "active" }).eq("id", memberId);
                }
              }
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const subId = invoice.parent?.subscription_details?.subscription;
            if (subId) {
              const requestOpts = event.account ? { stripeAccount: event.account } : undefined;
              const sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : subId.id, {}, requestOpts);
              const coachId = sub.metadata["coach_id"];
              const institutionId = sub.metadata["institution_id"];
              const memberId = sub.metadata["member_id"];
              if (memberId) {
                const { data: member } = await admin.from("institution_members").select("institution_id").eq("id", memberId).maybeSingle();
                const { data: already } = await admin.from("institution_member_charges").select("id").eq("stripe_invoice_id", invoice.id).maybeSingle();
                if (member && !already) {
                  await admin.from("institution_member_charges").insert({
                    institution_id: member["institution_id"] as string,
                    member_id: memberId,
                    processor: "stripe",
                    currency: (invoice.currency ?? "usd").toUpperCase(),
                    amount: invoice.amount_due,
                    stripe_subscription_id: sub.id,
                    stripe_invoice_id: invoice.id,
                    status: "failed",
                  });
                }
                await admin.from("institution_members").update({ billing_status: "past_due" }).eq("id", memberId);
              } else if (coachId) await admin.from("coach_subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("coach_id", coachId);
              else if (institutionId) await admin.from("institution_subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("institution_id", institutionId);
            }
            break;
          }

          case "account.updated": {
            const account = event.data.object as Stripe.Account;
            const status = account.charges_enabled && account.payouts_enabled ? "active" : account.details_submitted ? "restricted" : "onboarding";
            const patch = {
              stripe_charges_enabled: account.charges_enabled ?? false,
              stripe_payouts_enabled: account.payouts_enabled ?? false,
              stripe_details_submitted: account.details_submitted ?? false,
              status,
              updated_at: new Date().toISOString(),
            };
            await admin.from("coach_payment_accounts").update(patch).eq("stripe_account_id", account.id);
            await admin.from("institution_payment_accounts").update(patch).eq("stripe_account_id", account.id);
            break;
          }

          case "charge.refunded": {
            const charge = event.data.object as Stripe.Charge;
            if (charge.payment_intent) {
              const refunded = charge.amount_refunded >= charge.amount;
              await admin.from("program_purchases").update({
                status: refunded ? "refunded" : "partially_refunded",
                refunded_at: new Date().toISOString(),
              }).eq("stripe_payment_intent_id", typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id);
            }
            break;
          }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
      },
    },
  },
});
