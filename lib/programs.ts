import { uniqueName } from "@/lib/unique-name";
import { supabase } from "@/lib/supabase";

export type ProgramStatus = "En progreso" | "Publicado" | "Archivado";

export type ProgramWithCounts = {
  id: string;
  name: string;
  description: string;
  weeks: number;
  status: ProgramStatus;
  athletes: number;
  sessions: number;
  coverUrl: string | null;
  sport: string | null;
};

export async function getCoachId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function fetchPrograms(coachId: string): Promise<ProgramWithCounts[]> {
  const { data: rows, error } = await supabase
    .from("programs")
    // "*" so newer optional columns (sport, cover_url) don't break the list if a migration is still pending.
    .select("*")
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
    // A program listed in the marketplace is "Publicado" (older rows only have the visibility flag).
    status: r.status === "Archivado" ? "Archivado" : r.visible_marketplace || r.status === "Publicado" ? "Publicado" : "En progreso",
    athletes: counts[r.id] ?? 0,
    sessions: 0,
    coverUrl: (r as { cover_url?: string | null }).cover_url ?? null,
    sport: (r as { sport?: string | null }).sport ?? null,
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
  // Archiving also takes it off the marketplace.
  const { error } = await supabase.from("programs").update({ status: "Archivado", visible_marketplace: false }).eq("id", id);
  if (error) throw error;
}

/** Copies a program (its data and every session in its weeks) as a new, unpublished "(copia)". */
export async function duplicateProgram(coachId: string, programId: string): Promise<string> {
  const { data: src, error } = await supabase.from("programs").select("*").eq("id", programId).single();
  if (error || !src) throw error ?? new Error("Programa no encontrado");
  const { id: _id, created_at: _c, ...rest } = src as Record<string, unknown>;
  const { data: existing } = await supabase.from("programs").select("name").eq("coach_id", coachId);
  const { data: created, error: insErr } = await supabase
    .from("programs")
    .insert({ ...rest, coach_id: coachId, name: uniqueName(`${src.name} (copia)`, (existing ?? []).map((r) => r.name as string)), status: "En progreso", visible_marketplace: false })
    .select("id")
    .single();
  if (insErr || !created) throw insErr;
  const newId = created.id as string;
  const { data: sessions, error: sErr } = await supabase.from("program_sessions").select("*").eq("program_id", programId);
  if (sErr) throw sErr;
  if (sessions && sessions.length) {
    const rows = sessions.map((row) => {
      const { id: _sid, created_at: _sc, ...r } = row as Record<string, unknown>;
      return { ...r, program_id: newId, coach_id: coachId };
    });
    const { error: cpErr } = await supabase.from("program_sessions").insert(rows);
    if (cpErr) {
      await supabase.from("programs").delete().eq("id", newId);
      throw cpErr;
    }
  }
  return newId;
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
