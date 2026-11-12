import { supabase } from "@/lib/supabase";

export async function uploadTeamPhoto(coachId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${coachId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("team-photos").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("team-photos").getPublicUrl(path);
  return data.publicUrl;
}
