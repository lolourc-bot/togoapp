import { supabase } from "@/lib/supabase";

export type InstitutionTeam = {
  id: string; name: string; category: string | null; coachId: string | null; coachName: string | null;
};

type Row = { id: string; name: string; category: string | null; coach_id: string | null; institution_coaches: { full_name: string } | null };

function rowToTeam(r: Row): InstitutionTeam {
  return { id: r.id, name: r.name, category: r.category, coachId: r.coach_id, coachName: r.institution_coaches?.full_name ?? null };
}

export async function fetchInstitutionTeams(institutionId: string): Promise<InstitutionTeam[]> {
  const { data, error } = await supabase
    .from("institution_teams")
    .select("id, name, category, coach_id, institution_coaches(full_name)")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as Row[]).map(rowToTeam);
}

export async function createInstitutionTeam(institutionId: string, input: { name: string; category: string | null; coachId: string | null }): Promise<InstitutionTeam> {
  const { data, error } = await supabase
    .from("institution_teams")
    .insert({ institution_id: institutionId, name: input.name, category: input.category, coach_id: input.coachId })
    .select("id, name, category, coach_id, institution_coaches(full_name)")
    .single();
  if (error) throw error;
  return rowToTeam(data as unknown as Row);
}

export async function updateInstitutionTeam(id: string, patch: { name?: string; category?: string | null; coachId?: string | null }) {
  const { error } = await supabase.from("institution_teams")
    .update({ name: patch.name, category: patch.category, coach_id: patch.coachId })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteInstitutionTeam(id: string) {
  const { error } = await supabase.from("institution_teams").delete().eq("id", id);
  if (error) throw error;
}
