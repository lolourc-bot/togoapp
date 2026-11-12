import { supabase } from "@/lib/supabase";

export type InstitutionCoach = { id: string; fullName: string; email: string | null; specialty: string | null };

export async function fetchInstitutionCoaches(institutionId: string): Promise<InstitutionCoach[]> {
  const { data, error } = await supabase
    .from("institution_coaches")
    .select("id, full_name, email, specialty")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, fullName: r.full_name, email: r.email, specialty: r.specialty }));
}

export async function createInstitutionCoach(institutionId: string, input: { fullName: string; email: string | null; specialty: string | null }): Promise<InstitutionCoach> {
  const { data, error } = await supabase
    .from("institution_coaches")
    .insert({ institution_id: institutionId, full_name: input.fullName, email: input.email, specialty: input.specialty })
    .select("id, full_name, email, specialty")
    .single();
  if (error) throw error;
  return { id: data.id, fullName: data.full_name, email: data.email, specialty: data.specialty };
}

export async function updateInstitutionCoach(id: string, patch: { fullName?: string; email?: string | null; specialty?: string | null }) {
  const { error } = await supabase.from("institution_coaches")
    .update({ full_name: patch.fullName, email: patch.email, specialty: patch.specialty })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteInstitutionCoach(id: string) {
  const { error } = await supabase.from("institution_coaches").delete().eq("id", id);
  if (error) throw error;
}
