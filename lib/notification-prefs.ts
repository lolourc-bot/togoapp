import { supabase } from "@/lib/supabase";

export async function fetchNotificationPrefs(athleteId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("off_keys")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return new Set(data?.off_keys ?? []);
}

export async function setNotificationPrefOff(athleteId: string, offKeys: string[]) {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ athlete_id: athleteId, off_keys: offKeys, updated_at: new Date().toISOString() }, { onConflict: "athlete_id" });
  if (error) throw error;
}
