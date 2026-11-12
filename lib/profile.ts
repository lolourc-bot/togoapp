import { supabase } from "@/lib/supabase";

export type AthleteProfile = {
  fullName: string;
  birthdate: string | null;
  heightCm: string;
  weightKg: string;
  phone: string;
  coachId: string;
  coachName: string;
};

export async function fetchAthleteProfile(athleteId: string): Promise<AthleteProfile | null> {
  const { data: athlete, error } = await supabase
    .from("athletes")
    .select("full_name, birthdate, height_cm, weight_kg, phone, coach_id")
    .eq("id", athleteId)
    .single();
  if (error || !athlete) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", athlete.coach_id).single();
  return {
    fullName: athlete.full_name,
    birthdate: athlete.birthdate,
    heightCm: athlete.height_cm != null ? String(athlete.height_cm) : "",
    weightKg: athlete.weight_kg != null ? String(athlete.weight_kg) : "",
    phone: athlete.phone ?? "",
    coachId: athlete.coach_id,
    coachName: profile?.full_name ?? "Tu coach",
  };
}

export async function updateAthleteProfile(
  athleteId: string,
  patch: { fullName: string; birthdate: string | null; heightCm: string; weightKg: string; phone: string },
) {
  const { error } = await supabase
    .from("athletes")
    .update({
      full_name: patch.fullName,
      birthdate: patch.birthdate || null,
      height_cm: patch.heightCm ? Number(patch.heightCm) : null,
      weight_kg: patch.weightKg ? Number(patch.weightKg) : null,
      phone: patch.phone || null,
    })
    .eq("id", athleteId);
  if (error) throw error;
}

export async function deleteAthleteAccount(athleteId: string) {
  const { error } = await supabase.from("athletes").delete().eq("id", athleteId);
  if (error) throw error;
}
