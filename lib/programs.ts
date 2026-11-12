import { supabase } from "@/lib/supabase";

export type ProgramStatus = "En progreso" | "Listo para publicar" | "Archivado";

export type ProgramWithCounts = {
  id: string;
  name: string;
  description: string;
  weeks: number;
  status: ProgramStatus;
  athletes: number;
  sessions: number;
};

export async function getCoachId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function fetchPrograms(coachId: string): Promise<ProgramWithCounts[]> {
  const { data: rows, error } = await supabase
    .from("programs")
    .select("id, name, description, weeks, status")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  if (error || !rows) return [];

  const ids = rows.map((r) => r.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: assignments } = await supabase
      .from("program_assignments")
      .select("program_id")
      .in("program_id", ids);
    for (const a of assignments ?? []) counts[a.program_id] = (counts[a.program_id] ?? 0) + 1;
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    weeks: r.weeks ?? 0,
    status: (r.status as ProgramStatus) ?? "En progreso",
    athletes: counts[r.id] ?? 0,
    sessions: 0,
  }));
}

export async function createProgram(coachId: string, input: { name: string; description: string; weeks: number }) {
  const { data, error } = await supabase
    .from("programs")
    .insert({ coach_id: coachId, name: input.name, description: input.description, weeks: input.weeks, status: "En progreso" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function archiveProgram(id: string) {
  const { error } = await supabase.from("programs").update({ status: "Archivado" }).eq("id", id);
  if (error) throw error;
}

export async function assignProgramToAthletes(coachId: string, programId: string, athleteIds: string[], startDate: string) {
  const { error } = await supabase.from("program_assignments").insert(
    athleteIds.map((athleteId) => ({ coach_id: coachId, program_id: programId, athlete_id: athleteId, start_date: startDate })),
  );
  if (error) throw error;
}

export type AthleteOption = { id: string; name: string; initials: string; active: string | null };

export async function fetchAthletesForAssign(coachId: string): Promise<AthleteOption[]> {
  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("id, full_name")
    .eq("coach_id", coachId)
    .order("full_name", { ascending: true });
  if (error || !athletes) return [];

  const { data: assignments } = await supabase
    .from("program_assignments")
    .select("athlete_id, start_date, programs(name)")
    .eq("coach_id", coachId)
    .order("start_date", { ascending: false });

  const activeProgram: Record<string, string> = {};
  for (const a of assignments ?? []) {
    if (!activeProgram[a.athlete_id]) activeProgram[a.athlete_id] = (a.programs as unknown as { name: string } | null)?.name ?? "";
  }

  return athletes.map((a) => ({
    id: a.id,
    name: a.full_name,
    initials: a.full_name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase(),
    active: activeProgram[a.id] || null,
  }));
}
