import { supabase } from "@/lib/supabase";

export const COVER_MAX_MB = 5;

/** Uploads a program's marketplace cover to the public `program-covers` bucket and returns its URL. */
export async function uploadProgramCover(coachId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("La portada tiene que ser una imagen (JPG, PNG o WebP).");
  if (file.size > COVER_MAX_MB * 1024 * 1024) throw new Error(`La imagen pesa más de ${COVER_MAX_MB} MB.`);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${coachId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("program-covers").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from("program-covers").getPublicUrl(path).data.publicUrl;
}
