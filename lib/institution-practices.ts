import { supabase } from "@/lib/supabase";

export type InstitutionPractice = {
  id: string; teamId: string; teamName: string; name: string | null;
  date: string; start: string; end: string; place: string | null; notes: string | null;
};

type Row = {
  id: string; team_id: string; institution_teams: { name: string } | null; name: string | null;
  practice_date: string; start_time: string; end_time: string; place: string | null; notes: string | null;
};

const SELECT = "id, team_id, institution_teams(name), name, practice_date, start_time, end_time, place, notes";

function rowToPractice(r: Row): InstitutionPractice {
  return {
    id: r.id, teamId: r.team_id, teamName: r.institution_teams?.name ?? "—", name: r.name,
    date: r.practice_date, start: r.start_time, end: r.end_time, place: r.place, notes: r.notes,
  };
}

export async function fetchInstitutionPractices(institutionId: string): Promise<InstitutionPractice[]> {
  const { data, error } = await supabase
    .from("institution_practices")
    .select(SELECT)
    .eq("institution_id", institutionId)
    .order("practice_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as Row[]).map(rowToPractice);
}

export type PracticeInput = { teamId: string; name: string | null; date: string; start: string; end: string; place: string | null; notes: string | null };

export async function createInstitutionPractices(institutionId: string, inputs: PracticeInput[]): Promise<InstitutionPractice[]> {
  const { data, error } = await supabase
    .from("institution_practices")
    .insert(inputs.map((input) => ({
      institution_id: institutionId, team_id: input.teamId, name: input.name, practice_date: input.date,
      start_time: input.start, end_time: input.end, place: input.place, notes: input.notes,
    })))
    .select(SELECT);
  if (error || !data) throw error;
  return (data as unknown as Row[]).map(rowToPractice);
}

export async function updateInstitutionPractice(id: string, input: PracticeInput) {
  const { error } = await supabase.from("institution_practices").update({
    team_id: input.teamId, name: input.name, practice_date: input.date,
    start_time: input.start, end_time: input.end, place: input.place, notes: input.notes,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteInstitutionPractice(id: string) {
  const { error } = await supabase.from("institution_practices").delete().eq("id", id);
  if (error) throw error;
}
