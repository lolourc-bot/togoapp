import { supabase } from "@/lib/supabase";

const FEEL_LABELS = ["Agotado", "Difícil", "Ok", "Bien", "Excelente"];

export type ProgressItem = { id: string; name: string; chain: boolean };

export type ProgressSession = {
  id: string;
  date: string;
  name: string;
  status: "draft" | "published" | "done";
  minutes: number;
  items: ProgressItem[];
  circuitCount: number;
  feelingLabel: string | null;
};

export type ExecSetLite = { itemId: string; weight: string; reps: string; done: boolean };

export type AthleteProgressRaw = {
  sessions: ProgressSession[];
  setsBySession: Record<string, ExecSetLite[]>;
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseWeight(w: string) {
  const n = parseFloat(w.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Sessions completed, current weekly streak, and exercises currently at their best recorded weight. */
export function computeProfileStats(raw: AthleteProgressRaw) {
  const done = raw.sessions.filter((s) => s.status === "done");
  const sessionsCount = done.length;

  const weekStart = (iso: string) => {
    const d = new Date(`${iso}T00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return dateKey(d);
  };
  const weeksWithSessions = new Set(done.map((s) => weekStart(s.date)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  let weekStreak = 0;
  while (weeksWithSessions.has(dateKey(cursor))) {
    weekStreak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  const byExercise = new Map<string, { date: string; weight: number }[]>();
  for (const s of done) {
    for (const item of s.items) {
      const sets = (raw.setsBySession[s.id] ?? []).filter((x) => x.itemId === item.id && x.done);
      const weights = sets.map((x) => parseWeight(x.weight)).filter((w): w is number => w != null);
      if (!weights.length) continue;
      const arr = byExercise.get(item.name) ?? [];
      arr.push({ date: s.date, weight: Math.max(...weights) });
      byExercise.set(item.name, arr);
    }
  }
  let prCount = 0;
  for (const points of byExercise.values()) {
    points.sort((a, b) => (a.date < b.date ? -1 : 1));
    const max = Math.max(...points.map((p) => p.weight));
    if (points[points.length - 1]!.weight >= max) prCount++;
  }

  return { sessionsCount, weekStreak, prCount };
}

export function countBlocks(items: { chain: boolean }[], circuitCount: number) {
  let blocks = 0;
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && items[j]?.chain) j++;
    blocks++;
    i = j;
  }
  return blocks + circuitCount;
}

export async function fetchAthleteProgress(athleteId: string): Promise<AthleteProgressRaw> {
  const since = new Date();
  since.setDate(since.getDate() - 95);

  const { data: rows } = await supabase
    .from("athlete_sessions")
    .select("id, date, name, status, minutes, items, circuits")
    .eq("athlete_id", athleteId)
    .neq("status", "draft")
    .gte("date", dateKey(since))
    .order("date", { ascending: true });

  const sessionRows = rows ?? [];
  const ids = sessionRows.map((r) => r.id);

  const { data: completions } = ids.length
    ? await supabase.from("session_completions").select("session_id, feeling").in("session_id", ids)
    : { data: [] as { session_id: string; feeling: number | null }[] };
  const feelingBySession = new Map((completions ?? []).map((c) => [c.session_id, c.feeling]));

  const { data: sets } = ids.length
    ? await supabase.from("athlete_session_sets").select("session_id, item_id, weight, reps, done").in("session_id", ids)
    : { data: [] as { session_id: string; item_id: string; weight: string | null; reps: string | null; done: boolean }[] };
  const setsBySession: Record<string, ExecSetLite[]> = {};
  for (const s of sets ?? []) {
    (setsBySession[s.session_id] ??= []).push({ itemId: s.item_id, weight: s.weight ?? "", reps: s.reps ?? "", done: s.done });
  }

  const sessions: ProgressSession[] = sessionRows.map((r) => {
    const feeling = feelingBySession.get(r.id);
    return {
      id: r.id,
      date: r.date,
      name: r.name,
      status: r.status as ProgressSession["status"],
      minutes: r.minutes ?? 0,
      items: (r.items ?? []) as ProgressItem[],
      circuitCount: ((r.circuits ?? []) as unknown[]).length,
      feelingLabel: feeling != null ? (FEEL_LABELS[feeling] ?? null) : null,
    };
  });

  return { sessions, setsBySession };
}
