import { supabase } from "@/lib/supabase";
import type { DaySession } from "@/components/togo/AthleteSessionCard";

type SessionRow = {
  id: string;
  date: string;
  name: string;
  status: DaySession["status"];
  minutes: number | null;
  items: DaySession["items"] | null;
  circuits: DaySession["circuits"] | null;
  field: DaySession["field"] | null;
};

const SELECT_COLUMNS = "id, date, name, status, minutes, items, circuits, field";

function rowToSession(row: SessionRow): DaySession {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    minutes: row.minutes ?? 0,
    items: row.items ?? [],
    circuits: row.circuits ?? [],
    ...(row.field ? { field: row.field } : {}),
  };
}

function sessionToPayload(session: DaySession) {
  return {
    name: session.name,
    status: session.status,
    minutes: session.minutes,
    is_field: !!session.field,
    items: session.items,
    circuits: session.circuits,
    field: session.field ?? null,
  };
}

export async function fetchAthleteSessions(athleteId: string): Promise<Record<string, DaySession[]>> {
  const { data, error } = await supabase
    .from("athlete_sessions")
    .select(SELECT_COLUMNS)
    .eq("athlete_id", athleteId)
    .order("date", { ascending: true });
  if (error || !data) return {};
  const grouped: Record<string, DaySession[]> = {};
  for (const row of data as SessionRow[]) {
    (grouped[row.date] ??= []).push(rowToSession(row));
  }
  return grouped;
}

export async function insertAthleteSession(coachId: string, athleteId: string, dateKey: string, session: DaySession) {
  const { error } = await supabase.from("athlete_sessions").insert({
    id: session.id,
    coach_id: coachId,
    athlete_id: athleteId,
    date: dateKey,
    ...sessionToPayload(session),
  });
  if (error) throw error;
}

export async function updateAthleteSession(session: DaySession) {
  const { error } = await supabase
    .from("athlete_sessions")
    .update({ ...sessionToPayload(session), updated_at: new Date().toISOString() })
    .eq("id", session.id);
  if (error) throw error;
}

export async function patchAthleteSessionStatus(id: string, status: DaySession["status"]) {
  const { error } = await supabase.from("athlete_sessions").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function moveAthleteSessionDate(id: string, newDate: string) {
  const { error } = await supabase.from("athlete_sessions").update({ date: newDate }).eq("id", id);
  if (error) throw error;
}

export async function deleteAthleteSession(id: string) {
  const { error } = await supabase.from("athlete_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAthleteSessionById(id: string): Promise<(DaySession & { date: string }) | null> {
  const { data, error } = await supabase.from("athlete_sessions").select(SELECT_COLUMNS).eq("id", id).single();
  if (error || !data) return null;
  return { ...rowToSession(data as SessionRow), date: (data as SessionRow).date };
}

const RANK: Record<DaySession["status"], number> = { draft: 0, published: 1, done: 2 };

/** Real status per day (best of same-day sessions) for the Mon–Sun week containing `anchorDate`. */
export async function fetchAthleteWeekStatus(athleteId: string, anchorDate: string): Promise<Record<string, DaySession["status"]>> {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("athlete_sessions")
    .select("date, status")
    .eq("athlete_id", athleteId)
    .gte("date", fmt(monday))
    .lte("date", fmt(sunday));
  if (error || !data) return {};
  const out: Record<string, DaySession["status"]> = {};
  for (const row of data as { date: string; status: DaySession["status"] }[]) {
    const prev = out[row.date];
    if (!prev || RANK[row.status] > RANK[prev]) out[row.date] = row.status;
  }
  return out;
}

export type ExerciseHistoryPoint = { date: string; weight: string; reps: string };

/** Real last-performed + PR for one exercise name, scanning this athlete's past sessions. */
export async function fetchExerciseHistory(
  athleteId: string,
  exerciseName: string,
  excludeSessionId?: string,
): Promise<{ last: ExerciseHistoryPoint | null; pr: ExerciseHistoryPoint | null }> {
  const { data, error } = await supabase
    .from("athlete_sessions")
    .select("id, date, items")
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false });
  if (error || !data) return { last: null, pr: null };

  const target = exerciseName.trim().toLowerCase();
  let last: ExerciseHistoryPoint | null = null;
  let pr: ExerciseHistoryPoint | null = null;
  let prWeight = -Infinity;

  for (const row of data) {
    if (excludeSessionId && row.id === excludeSessionId) continue;
    const items = (row.items ?? []) as {
      name: string;
      series?: { weight: string; reps: string }[];
      weight?: string;
      reps?: string;
    }[];
    for (const it of items) {
      if (it.name.trim().toLowerCase() !== target) continue;
      const series = it.series && it.series.length ? it.series : [{ weight: it.weight ?? "", reps: it.reps ?? "" }];
      for (const s of series) {
        if (!last) last = { date: row.date, weight: s.weight, reps: s.reps };
        const w = Number(s.weight);
        if (!Number.isNaN(w) && w > prWeight) {
          prWeight = w;
          pr = { date: row.date, weight: s.weight, reps: s.reps };
        }
      }
    }
  }
  return { last, pr };
}

export type WeekDaySessionRef = { id: string; status: DaySession["status"]; field: boolean };

/** The sessions of each day (Mon–Sun week containing `anchorDate`), so the editor can jump to another day. */
export async function fetchAthleteWeekSessions(athleteId: string, anchorDate: string): Promise<Record<string, WeekDaySessionRef[]>> {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("athlete_sessions")
    .select("id, date, status, field, created_at")
    .eq("athlete_id", athleteId)
    .gte("date", fmt(monday))
    .lte("date", fmt(sunday))
    .order("created_at", { ascending: true });
  if (error || !data) return {};
  const out: Record<string, WeekDaySessionRef[]> = {};
  for (const row of data as { id: string; date: string; status: DaySession["status"]; field: unknown }[]) {
    (out[row.date] ??= []).push({ id: row.id, status: row.status, field: !!row.field });
  }
  return out;
}
