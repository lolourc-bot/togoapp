import { supabase } from "@/lib/supabase";
import type { LabSession, SessionCategory } from "@/components/togo/LabSessions";

export async function fetchSessionTemplates(coachId: string): Promise<LabSession[]> {
  const { data, error } = await supabase
    .from("session_templates")
    .select("id, name, category, minutes, exercises, circuits")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    category: (r.category as SessionCategory) ?? "Fuerza",
    minutes: r.minutes ?? 0,
    exercises: r.exercises ?? [],
    circuits: r.circuits ?? [],
  }));
}

export async function createSessionTemplate(coachId: string, session: Omit<LabSession, "id">): Promise<string> {
  const { data, error } = await supabase
    .from("session_templates")
    .insert({
      coach_id: coachId,
      name: session.name,
      category: session.category,
      minutes: session.minutes,
      exercises: session.exercises,
      circuits: session.circuits,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateSessionTemplate(session: LabSession) {
  const { error } = await supabase
    .from("session_templates")
    .update({
      name: session.name,
      category: session.category,
      minutes: session.minutes,
      exercises: session.exercises,
      circuits: session.circuits,
    })
    .eq("id", session.id);
  if (error) throw error;
}

export async function deleteSessionTemplate(id: string) {
  const { error } = await supabase.from("session_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSessionTemplate(id: string): Promise<LabSession | null> {
  const { data, error } = await supabase
    .from("session_templates")
    .select("id, name, category, minutes, exercises, circuits")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    category: (data.category as SessionCategory) ?? "Fuerza",
    minutes: data.minutes ?? 0,
    exercises: data.exercises ?? [],
    circuits: data.circuits ?? [],
  };
}
