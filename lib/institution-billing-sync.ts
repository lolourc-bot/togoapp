import { supabase } from "@/lib/supabase";
import { syncInstitutionStripeTier } from "@/lib/institution-billing-stripe";
import { syncInstitutionMpAmount } from "@/lib/institution-billing-mp";

/** Llamar tras cualquier alta/baja de entrenador o miembro/socio. Nunca bloquea la UI. */
export async function resyncInstitutionBilling(institutionId: string, mode: "club" | "gym"): Promise<void> {
  const { data: sub } = await supabase
    .from("institution_subscriptions")
    .select("processor")
    .eq("institution_id", institutionId)
    .maybeSingle();
  if (!sub) return; // sin suscripción todavía

  try {
    const [{ count: memberCount }, { count: coachCount }] = await Promise.all([
      supabase.from("institution_members").select("*", { count: "exact", head: true }).eq("institution_id", institutionId),
      supabase.from("institution_coaches").select("*", { count: "exact", head: true }).eq("institution_id", institutionId),
    ]);
    const data = { institutionId, mode, memberCount: memberCount ?? 0, coachCount: coachCount ?? 0 };
    if (sub.processor === "stripe") {
      await syncInstitutionStripeTier({ data });
    } else if (sub.processor === "mercadopago") {
      await syncInstitutionMpAmount({ data });
    }
  } catch (err) {
    console.error("institution billing resync failed", err);
  }
}
