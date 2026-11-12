import { supabase } from "@/lib/supabase";
import type { CircuitConfig } from "@/components/togo/CircuitModal";

export type CanvasExercise = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  chained: boolean;
  series?: { weight: string; reps: string }[];
  notes?: string;
  rest?: string;
  microRest?: string | null;
  repsUnit?: string;
  weightUnit?: string;
  extras?: { name: string; values: string[] }[];
};
export type CanvasSession = { name: string; exercises: CanvasExercise[]; circuits?: CircuitConfig[] };
export type ProgramCanvas = { id: string; name: string; weeks: number; sessions: Record<string, CanvasSession> };

export async function fetchProgramCanvases(coachId: string): Promise<ProgramCanvas[]> {
  const { data: progs, error } = await supabase
    .from("programs")
    .select("id, name, weeks")
    .eq("coach_id", coachId)
    .neq("status", "Archivado")
    .order("created_at", { ascending: true });
  if (error || !progs) return [];

  const ids = progs.map((p) => p.id);
  const byProgram: Record<string, Record<string, CanvasSession>> = {};
  if (ids.length) {
    const { data: rows } = await supabase
      .from("program_sessions")
      .select("program_id, week_index, day_index, name, exercises, circuits")
      .in("program_id", ids);
    for (const r of rows ?? []) {
      const bucket = (byProgram[r.program_id] ??= {});
      bucket[`${r.week_index}-${r.day_index}`] = { name: r.name, exercises: r.exercises ?? [], circuits: r.circuits ?? [] };
    }
  }

  return progs.map((p) => ({ id: p.id, name: p.name, weeks: p.weeks ?? 2, sessions: byProgram[p.id] ?? {} }));
}

export async function createProgramCanvas(coachId: string, name: string): Promise<string> {
  const { data, error } = await supabase
    .from("programs")
    .insert({ coach_id: coachId, name, weeks: 2, status: "En progreso" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function renameProgramCanvas(id: string, name: string) {
  const { error } = await supabase.from("programs").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteProgramCanvas(id: string) {
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw error;
}

export async function setProgramWeeks(id: string, weeks: number) {
  const { error } = await supabase.from("programs").update({ weeks }).eq("id", id);
  if (error) throw error;
}

export async function upsertProgramSession(
  coachId: string,
  programId: string,
  weekIndex: number,
  dayIndex: number,
  session: CanvasSession,
) {
  const { error } = await supabase.from("program_sessions").upsert(
    {
      coach_id: coachId,
      program_id: programId,
      week_index: weekIndex,
      day_index: dayIndex,
      name: session.name,
      exercises: session.exercises,
      circuits: session.circuits ?? [],
    },
    { onConflict: "program_id,week_index,day_index" },
  );
  if (error) throw error;
}

export async function deleteProgramSession(programId: string, weekIndex: number, dayIndex: number) {
  const { error } = await supabase
    .from("program_sessions")
    .delete()
    .eq("program_id", programId)
    .eq("week_index", weekIndex)
    .eq("day_index", dayIndex);
  if (error) throw error;
}

export async function moveProgramSession(
  programId: string,
  from: { week: number; day: number },
  to: { week: number; day: number },
) {
  await supabase.from("program_sessions").delete().eq("program_id", programId).eq("week_index", to.week).eq("day_index", to.day);
  const { error } = await supabase
    .from("program_sessions")
    .update({ week_index: to.week, day_index: to.day })
    .eq("program_id", programId)
    .eq("week_index", from.week)
    .eq("day_index", from.day);
  if (error) throw error;
}

export async function fetchProgramSession(programId: string, weekIndex: number, dayIndex: number): Promise<CanvasSession | null> {
  const { data, error } = await supabase
    .from("program_sessions")
    .select("name, exercises, circuits")
    .eq("program_id", programId)
    .eq("week_index", weekIndex)
    .eq("day_index", dayIndex)
    .maybeSingle();
  if (error || !data) return null;
  return { name: data.name, exercises: data.exercises ?? [], circuits: data.circuits ?? [] };
}

export async function fetchProgramMeta(programId: string): Promise<{ name: string; weeks: number } | null> {
  const { data, error } = await supabase.from("programs").select("name, weeks").eq("id", programId).single();
  if (error || !data) return null;
  return { name: data.name, weeks: data.weeks ?? 2 };
}

/** Real set of "week-day" keys that already have a saved session, for this program. */
export async function fetchProgramSessionDays(programId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("program_sessions")
    .select("week_index, day_index")
    .eq("program_id", programId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => `${r.week_index}-${r.day_index}`));
}
