import { supabase } from "@/lib/supabase";
import { syncStripeSubscriptionQuantity } from "@/lib/billing-stripe";
import { syncMpSubscriptionAmount } from "@/lib/billing-mp";

/** Llamar tras cualquier alta/baja/pausa de atleta. Nunca bloquea ni tira la UI de atletas. */
export async function resyncBillingForCurrentCoach(coachId: string): Promise<void> {
  const { data: sub } = await supabase
    .from("coach_subscriptions")
    .select("processor")
    .eq("coach_id", coachId)
    .maybeSingle();

  if (!sub) return; // sin fila todavía (coach nuevo en gratis), nada que sincronizar

  try {
    if (sub.processor === "stripe") {
      await syncStripeSubscriptionQuantity({ data: { coachId } });
    } else if (sub.processor === "mercadopago") {
      await syncMpSubscriptionAmount({ data: { coachId } });
    }
  } catch (err) {
    console.error("billing resync failed", err);
  }
}
