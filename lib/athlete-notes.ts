import { supabase } from "@/lib/supabase";

export type AthleteNote = { id: string; body: string; createdAt: string };

export async function fetchAthleteNotes(athleteId: string): Promise<AthleteNote[]> {
  const { data, error } = await supabase
    .from("athlete_notes")
    .select("id, body, created_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at }));
}

export async function createAthleteNote(coachId: string, athleteId: string, body: string): Promise<AthleteNote> {
  const { data, error } = await supabase
    .from("athlete_notes")
    .insert({ coach_id: coachId, athlete_id: athleteId, body })
    .select("id, body, created_at")
    .single();
  if (error) throw error;
  return { id: data.id, body: data.body, createdAt: data.created_at };
}

export async function deleteAthleteNote(id: string) {
  const { error } = await supabase.from("athlete_notes").delete().eq("id", id);
  if (error) throw error;
}
