import { supabase } from "@/lib/supabase";

export type CoachAccount = { email: string; currency: string; timezone: string };

export async function fetchCoachAccount(coachId: string): Promise<CoachAccount | null> {
  const [{ data: { user } }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("currency, timezone").eq("id", coachId).maybeSingle(),
  ]);
  if (!profile) return null;
  return { email: user?.email ?? "", currency: profile.currency ?? "ARS", timezone: profile.timezone ?? "America/Argentina/Buenos_Aires" };
}

export async function updateCoachAccountPrefs(coachId: string, patch: { currency?: string; timezone?: string }) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", coachId);
  if (error) throw error;
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function fetchCoachNotificationPrefs(coachId: string): Promise<Record<string, boolean> | null> {
  const { data } = await supabase.from("coach_notification_preferences").select("prefs").eq("coach_id", coachId).maybeSingle();
  return (data?.prefs as Record<string, boolean> | undefined) ?? null;
}

export async function setCoachNotificationPrefs(coachId: string, prefs: Record<string, boolean>) {
  const { error } = await supabase
    .from("coach_notification_preferences")
    .upsert({ coach_id: coachId, prefs, updated_at: new Date().toISOString() }, { onConflict: "coach_id" });
  if (error) throw error;
}
