import { supabase } from "@/lib/supabase";

export type WellnessCheckin = { date: string; energy: number | null; sleep: number | null; body: number | null };

export async function fetchAthleteCoachId(athleteId: string): Promise<string | null> {
  const { data, error } = await supabase.from("athletes").select("coach_id").eq("id", athleteId).single();
  if (error || !data) return null;
  return data.coach_id as string;
}

export async function saveWellnessCheckin(
  coachId: string,
  athleteId: string,
  sessionId: string | null,
  answers: { energy?: number | undefined; sleep?: number | undefined; body?: number | undefined },
) {
  const { error } = await supabase.from("wellness_checkins").insert({
    coach_id: coachId,
    athlete_id: athleteId,
    session_id: sessionId,
    energy: answers.energy ?? null,
    sleep: answers.sleep ?? null,
    body: answers.body ?? null,
  });
  if (error) throw error;
}

export type WellnessOverviewRow = {
  athleteId: string;
  athleteName: string;
  date: string | null;
  energy: number | null;
  sleep: number | null;
  body: number | null;
  state: "ok" | "warn" | "none";
};

export async function fetchWellnessOverview(coachId: string): Promise<WellnessOverviewRow[]> {
  const { data: athletes } = await supabase
    .from("athletes")
    .select("id, full_name")
    .eq("coach_id", coachId)
    .eq("status", "active")
    .order("full_name");
  if (!athletes || athletes.length === 0) return [];

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);
  const sinceKey = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;

  const { data: checkins } = await supabase
    .from("wellness_checkins")
    .select("athlete_id, date, energy, sleep, body")
    .eq("coach_id", coachId)
    .gte("date", sinceKey)
    .order("date", { ascending: false });

  const latestByAthlete = new Map<string, { date: string; energy: number | null; sleep: number | null; body: number | null }>();
  for (const c of checkins ?? []) {
    if (!latestByAthlete.has(c.athlete_id)) latestByAthlete.set(c.athlete_id, c);
  }

  const low = (v: number | null) => v != null && v <= 1;
  const rank = { warn: 0, ok: 1, none: 2 };
  return athletes
    .map((a) => {
      const c = latestByAthlete.get(a.id);
      const state: "ok" | "warn" | "none" = !c ? "none" : low(c.energy) || low(c.sleep) || low(c.body) ? "warn" : "ok";
      return {
        athleteId: a.id,
        athleteName: a.full_name,
        date: c?.date ?? null,
        energy: c?.energy ?? null,
        sleep: c?.sleep ?? null,
        body: c?.body ?? null,
        state,
      };
    })
    .sort((a, b) => rank[a.state] - rank[b.state] || a.athleteName.localeCompare(b.athleteName));
}

export async function fetchRecentWellness(athleteId: string, days = 7): Promise<WellnessCheckin[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const sinceKey = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("wellness_checkins")
    .select("date, energy, sleep, body")
    .eq("athlete_id", athleteId)
    .gte("date", sinceKey)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  const byDate = new Map<string, WellnessCheckin>();
  for (const row of data) byDate.set(row.date, row);
  return [...byDate.values()];
}
