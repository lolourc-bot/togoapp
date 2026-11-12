import { supabase } from "@/lib/supabase";

export type TeamFeatures = { planning: boolean; chat: boolean; achievements: boolean };

export type Team = {
  id: string;
  name: string;
  description: string;
  members: string[];
  features: TeamFeatures;
  photoUrl: string | null;
};

export async function fetchTeams(coachId: string): Promise<Team[]> {
  const { data: teamRows, error } = await supabase
    .from("teams")
    .select("id, name, description, features, photo_url")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: true });
  if (error || !teamRows) return [];
  const { data: memberRows } = await supabase
    .from("team_members")
    .select("team_id, athlete_id")
    .eq("coach_id", coachId);
  const membersByTeam = new Map<string, string[]>();
  for (const row of memberRows ?? []) {
    const list = membersByTeam.get(row.team_id) ?? [];
    list.push(row.athlete_id);
    membersByTeam.set(row.team_id, list);
  }
  return teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? "",
    members: membersByTeam.get(t.id) ?? [],
    features: (t.features as TeamFeatures) ?? { planning: true, chat: true, achievements: true },
    photoUrl: t.photo_url ?? null,
  }));
}

export async function createTeam(
  coachId: string,
  input: { name: string; description: string; memberIds: string[]; features: TeamFeatures; photoUrl?: string | null },
): Promise<string> {
  const { data, error } = await supabase
    .from("teams")
    .insert({ coach_id: coachId, name: input.name, description: input.description || null, features: input.features, photo_url: input.photoUrl ?? null })
    .select("id")
    .single();
  if (error) throw error;
  const teamId = data.id as string;
  if (input.memberIds.length) {
    await supabase
      .from("team_members")
      .insert(input.memberIds.map((athleteId) => ({ coach_id: coachId, team_id: teamId, athlete_id: athleteId })));
  }
  return teamId;
}

export async function updateTeam(
  coachId: string,
  teamId: string,
  input: { name: string; description: string; memberIds: string[]; features: TeamFeatures; photoUrl?: string | null },
) {
  const { error } = await supabase
    .from("teams")
    .update({ name: input.name, description: input.description || null, features: input.features, photo_url: input.photoUrl ?? null })
    .eq("id", teamId);
  if (error) throw error;

  const { data: existing } = await supabase.from("team_members").select("athlete_id").eq("team_id", teamId);
  const existingIds = new Set((existing ?? []).map((r) => r.athlete_id as string));
  const nextIds = new Set(input.memberIds);

  const toAdd = input.memberIds.filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !nextIds.has(id));

  if (toAdd.length) {
    await supabase
      .from("team_members")
      .insert(toAdd.map((athleteId) => ({ coach_id: coachId, team_id: teamId, athlete_id: athleteId })));
  }
  if (toRemove.length) {
    await supabase.from("team_members").delete().eq("team_id", teamId).in("athlete_id", toRemove);
  }
}

export async function deleteTeam(teamId: string) {
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw error;
}

export type Load = "ok" | "warn" | "inactive" | "none";

export const LOAD_LABEL: Record<Load, string> = {
  ok: "Carga OK",
  warn: "En alerta",
  inactive: "Inactivo",
  none: "Sin datos",
};

export type RosterMember = { id: string; name: string; months: number; load: Load; last: string };

function monthsSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (30 * 86400000)));
}

function relativeDay(iso: string | undefined): string {
  if (!iso) return "sin registros";
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays <= 0) return "hoy";
  if (diffDays === 1) return "ayer";
  return `hace ${diffDays} días`;
}

function loadFor(iso: string | undefined): Load {
  if (!iso) return "none";
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays <= 3) return "ok";
  if (diffDays <= 7) return "warn";
  return "inactive";
}

/** Real athlete roster with activity-derived stats (last completed session, rough load signal). */
export async function fetchAthleteRoster(coachId: string): Promise<RosterMember[]> {
  const { data: athletes } = await supabase
    .from("athletes")
    .select("id, full_name, created_at")
    .eq("coach_id", coachId)
    .order("full_name", { ascending: true });
  if (!athletes) return [];

  const { data: completions } = await supabase
    .from("session_completions")
    .select("completed_at, athlete_sessions!inner(athlete_id)")
    .eq("coach_id", coachId);

  const lastByAthlete = new Map<string, string>();
  for (const row of completions ?? []) {
    const athleteId = (row.athlete_sessions as unknown as { athlete_id: string } | null)?.athlete_id;
    if (!athleteId) continue;
    const prev = lastByAthlete.get(athleteId);
    if (!prev || (row.completed_at as string) > prev) lastByAthlete.set(athleteId, row.completed_at as string);
  }

  return athletes.map((a) => {
    const last = lastByAthlete.get(a.id);
    return {
      id: a.id,
      name: a.full_name,
      months: monthsSince(a.created_at),
      load: loadFor(last),
      last: relativeDay(last),
    };
  });
}
