import { sessionTitle } from "./session-title";
import { supabase } from "@/lib/supabase";

const FEEL_LABELS = ["Agotado", "Difícil", "Ok", "Bien", "Excelente"];

export type FeedItem = {
  athleteId: string;
  athleteName: string;
  sessionName: string;
  timeAgo: string;
  blocks: number;
  minutes: number;
  feelingLabel: string | null;
};

export type NameItem = { id: string; name: string };

export type DashboardData = {
  feed: FeedItem[];
  unplanned: NameItem[];
  loadGroups: { atencion: NameItem[]; precaucion: NameItem[]; enForma: NameItem[] };
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "hace minutos";
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

function countBlocks(items: { chain: boolean }[], circuits: unknown[]) {
  let blocks = 0;
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && items[j]?.chain) j++;
    blocks++;
    i = j;
  }
  return blocks + circuits.length;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentWeekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: dateKey(start), end: dateKey(end) };
}

const isLow = (v: number | null | undefined) => v != null && v <= 1;

export async function fetchDashboard(coachId: string): Promise<DashboardData> {
  const { data: athletes } = await supabase.from("athletes").select("id, full_name").eq("coach_id", coachId);
  const roster = athletes ?? [];

  const { data: doneSessions } = await supabase
    .from("athlete_sessions")
    .select("id, athlete_id, name, minutes, items, circuits, updated_at")
    .eq("coach_id", coachId)
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(8);

  const sessionIds = (doneSessions ?? []).map((s) => s.id);
  const { data: completions } = sessionIds.length
    ? await supabase.from("session_completions").select("session_id, feeling").in("session_id", sessionIds)
    : { data: [] as { session_id: string; feeling: number | null }[] };
  const feelingBySession = new Map((completions ?? []).map((c) => [c.session_id, c.feeling]));
  const nameById = new Map(roster.map((a) => [a.id, a.full_name]));

  const feed: FeedItem[] = (doneSessions ?? []).map((s) => {
    const feeling = feelingBySession.get(s.id);
    return {
      athleteId: s.athlete_id,
      athleteName: nameById.get(s.athlete_id) ?? "Atleta",
      sessionName: sessionTitle(s),
      timeAgo: timeAgo(s.updated_at),
      blocks: countBlocks((s.items ?? []) as { chain: boolean }[], (s.circuits ?? []) as unknown[]),
      minutes: s.minutes ?? 0,
      feelingLabel: feeling != null ? (FEEL_LABELS[feeling] ?? null) : null,
    };
  });

  const { start, end } = currentWeekRange();
  const { data: thisWeek } = await supabase
    .from("athlete_sessions")
    .select("athlete_id")
    .eq("coach_id", coachId)
    .neq("status", "draft")
    .gte("date", start)
    .lte("date", end);
  const plannedIds = new Set((thisWeek ?? []).map((s) => s.athlete_id));
  const unplanned = roster.filter((a) => !plannedIds.has(a.id)).map((a) => ({ id: a.id, name: a.full_name }));

  const { data: recentWellness } = await supabase
    .from("wellness_checkins")
    .select("athlete_id, date, energy, sleep, body, created_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  const latestByAthlete = new Map<string, { date: string; energy: number | null; sleep: number | null; body: number | null }>();
  for (const w of recentWellness ?? []) {
    if (!latestByAthlete.has(w.athlete_id)) latestByAthlete.set(w.athlete_id, w);
  }

  const atencion: NameItem[] = [];
  const precaucion: NameItem[] = [];
  const enForma: NameItem[] = [];
  const todayKey = dateKey(new Date());
  for (const a of roster) {
    const w = latestByAthlete.get(a.id);
    const item = { id: a.id, name: a.full_name };
    if (!w) continue;
    if (isLow(w.energy) || isLow(w.sleep) || isLow(w.body)) atencion.push(item);
    else if (w.date !== todayKey) precaucion.push(item);
    else enForma.push(item);
  }

  return { feed, unplanned, loadGroups: { atencion, precaucion, enForma } };
}
