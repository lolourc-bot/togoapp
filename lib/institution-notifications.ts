import { supabase } from "@/lib/supabase";

export async function fetchInstitutionNotificationPrefs(institutionId: string): Promise<Record<string, boolean> | null> {
  const { data } = await supabase.from("institution_notification_preferences").select("prefs").eq("institution_id", institutionId).maybeSingle();
  return (data?.prefs as Record<string, boolean> | undefined) ?? null;
}

export async function setInstitutionNotificationPrefs(institutionId: string, prefs: Record<string, boolean>) {
  const { error } = await supabase
    .from("institution_notification_preferences")
    .upsert({ institution_id: institutionId, prefs, updated_at: new Date().toISOString() }, { onConflict: "institution_id" });
  if (error) throw error;
}
