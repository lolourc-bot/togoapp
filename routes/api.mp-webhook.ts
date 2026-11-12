import { createFileRoute } from "@tanstack/react-router";
import { MercadoPagoConfig, PreApproval, Payment } from "mercadopago";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveTier } from "@/lib/billing-pricing";
import { materializeProgramForAthlete } from "@/lib/program-materialize";

// Web Crypto (crypto.subtle) en vez de node:crypto: node:crypto se externaliza en el bundle
// de cliente (este archivo de ruta se evalúa también del lado del cliente para el router),
// y acceder a un named export de un módulo externalizado revienta en el browser. crypto.subtle
// es un global real tanto en Node como en el browser, así que no tiene ese problema.
async function verifyMpSignature(ctx: { headers: Headers }, dataId: string): Promise<boolean> {
  const secret = process.env["MERCADOPAGO_WEBHOOK_SECRET"];
  const signature = ctx.headers.get("x-signature");
  const requestId = ctx.headers.get("x-request-id");
  if (!secret || !signature) return false;
  const parts = Object.fromEntries(signature.split(",").map((p) => p.trim().split("=")) as [string, string][]);
  const ts = parts["ts"];
  const hash = parts["v1"];
  if (!ts || !hash) return false;
  const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const expected = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === hash;
}

export const Route = createFileRoute("/api/mp-webhook")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const raw = await ctx.request.text();
        const admin = getSupabaseAdmin();
        let payload: { type?: string; topic?: string; data?: { id?: string }; id?: string };
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("bad payload", { status: 400 });
        }

        const dataId = payload.data?.id ?? payload.id;
        const topic = payload.type ?? payload.topic;
        if (!dataId || !topic) return new Response("ok", { status: 200 });
        if (!(await verifyMpSignature(ctx.request, dataId))) return new Response("invalid signature", { status: 401 });

        const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"]!;
        const client = new MercadoPagoConfig({ accessToken });

        if (topic === "preapproval") {
          const preapproval = new PreApproval(client);
          const result = await preapproval.get({ id: dataId });
          const statusMap: Record<string, string> = { authorized: "active", paused: "canceled", cancelled: "canceled", pending: "incomplete" };
          const memberStatusMap: Record<string, string> = { authorized: "active", paused: "canceled", cancelled: "canceled", pending: "pending" };
          const patch = {
            status: statusMap[result.status ?? ""] ?? "incomplete",
            current_period_end: result.next_payment_date ?? null,
            updated_at: new Date().toISOString(),
          };
          const { data: coachSub } = await admin.from("coach_subscriptions").select("coach_id").eq("mp_preapproval_id", dataId).maybeSingle();
          const { data: member } = await admin.from("institution_members").select("id").eq("mp_preapproval_id", dataId).maybeSingle();
          if (member) {
            await admin.from("institution_members").update({ billing_status: memberStatusMap[result.status ?? ""] ?? "pending" }).eq("id", member["id"] as string);
          } else if (coachSub) {
            await admin.from("coach_subscriptions").update(patch).eq("mp_preapproval_id", dataId);
          } else {
            await admin.from("institution_subscriptions").update(patch).eq("mp_preapproval_id", dataId);
          }
        } else if (topic === "payment") {
          const payment = new Payment(client);
          const result = await payment.get({ id: dataId });
          const memberId = result.external_reference;
          const { data: memberRow } = memberId
            ? await admin.from("institution_members").select("id, institution_id").eq("id", memberId).maybeSingle()
            : { data: null };
          if (memberRow) {
            const { data: already } = await admin.from("institution_member_charges").select("id").eq("mp_payment_id", String(result.id)).maybeSingle();
            if (!already) {
              await admin.from("institution_member_charges").insert({
                institution_id: memberRow["institution_id"] as string,
                member_id: memberRow["id"] as string,
                processor: "mercadopago",
                currency: result.currency_id ?? "ARS",
                amount: Math.round((result.transaction_amount ?? 0) * 100),
                mp_preapproval_id: result.metadata?.["preapproval_id"] ?? null,
                mp_payment_id: String(result.id),
                status: result.status === "approved" ? "paid" : result.status === "refunded" ? "refunded" : "failed",
                paid_at: result.status === "approved" ? new Date().toISOString() : null,
              });
            }
            if (result.status === "approved") {
              await admin.from("institution_members").update({ billing_status: "active" }).eq("id", memberRow["id"] as string);
            } else if (result.status === "rejected" || result.status === "cancelled") {
              await admin.from("institution_members").update({ billing_status: "past_due" }).eq("id", memberRow["id"] as string);
            }
          }

          const purchaseId = result.metadata?.["purchase_id"];
          if (purchaseId && result.status === "approved") {
            const { data: purchase } = await admin.from("program_purchases").select("*").eq("id", purchaseId).maybeSingle();
            if (purchase && purchase["status"] !== "paid") {
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
                status: "paid", purchased_at: new Date().toISOString(), mp_payment_id: String(result.id), athlete_id: athleteId,
              }).eq("id", purchaseId);
            }
          } else if (purchaseId && (result.status === "rejected" || result.status === "cancelled")) {
            await admin.from("program_purchases").update({ status: "failed" }).eq("id", purchaseId);
          } else if (purchaseId && result.status === "refunded") {
            await admin.from("program_purchases").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", purchaseId);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
