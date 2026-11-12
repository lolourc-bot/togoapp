import { supabase } from "@/lib/supabase";
import type { CircuitType } from "@/components/togo/CircuitModal";

export type ExecSetRow = { reps: string; weight: string; done: boolean; note: string; noteOpen: boolean; manual?: boolean };
export type ExecExercise = { id: string; label: string; name: string; suggestion: string; sets: ExecSetRow[] };
export type ExecCircuit = { type: CircuitType; name: string; rounds: number; minutes: number; items: { name: string; reps: string }[] };
export type ExecBlock = { letter: string; exercises: ExecExercise[]; circuit?: ExecCircuit };

export type SessionForExecution = {
  id: string;
  coachId: string;
  athleteId: string;
  name: string;
  status: string;
  blocks: ExecBlock[];
};

function plannedSets(sets: string, reps: string, weight: string): { reps: string; weight: string }[] {
  const n = Math.max(1, parseInt(sets, 10) || 1);
  return Array.from({ length: n }, () => ({ reps, weight }));
}

export async function fetchSessionForExecution(sessionId: string): Promise<SessionForExecution | null> {
  const { data, error } = await supabase
    .from("athlete_sessions")
    .select("id, coach_id, athlete_id, name, status, items, circuits")
    .eq("id", sessionId)
    .single();
  if (error || !data) return null;

  const { data: savedSets } = await supabase
    .from("athlete_session_sets")
    .select("item_id, set_index, reps, weight, done, note")
    .eq("session_id", sessionId);
  const saved = new Map<string, { reps: string; weight: string; done: boolean; note: string }>();
  for (const r of savedSets ?? []) saved.set(`${r.item_id}:${r.set_index}`, r);

  const items = (data.items ?? []) as { id: string; name: string; sets: string; reps: string; weight: string; chain: boolean }[];
  const circuits = (data.circuits ?? []) as {
    type: CircuitType;
    name: string;
    exercises: { name: string; reps: string }[];
    amrapSeconds: number;
    emomRounds: number;
    tabataRounds: number;
  }[];

  const blocks: ExecBlock[] = [];
  let letterCode = 65;
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && items[j]?.chain) j++;
    const run = items.slice(i, j);
    const letter = String.fromCharCode(letterCode++);
    const exercises: ExecExercise[] = run.map((item, k) => ({
      id: item.id,
      label: `${letter}${k + 1}`,
      name: item.name,
      suggestion: "",
      sets: plannedSets(item.sets, item.reps, item.weight).map((base, si) => {
        const s = saved.get(`${item.id}:${si}`);
        return { reps: s?.reps ?? base.reps, weight: s?.weight ?? base.weight, done: s?.done ?? false, note: s?.note ?? "", noteOpen: false };
      }),
    }));
    blocks.push({ letter, exercises });
    i = j;
  }
  for (const c of circuits) {
    const letter = String.fromCharCode(letterCode++);
    blocks.push({
      letter,
      exercises: [],
      circuit: {
        type: c.type,
        name: c.name,
        rounds: c.type === "TABATA" ? c.tabataRounds : c.type === "EMOM" ? c.emomRounds : 1,
        minutes: c.type === "AMRAP" ? Math.round((c.amrapSeconds ?? 0) / 60) : 0,
        items: c.exercises.map((e) => ({ name: e.name, reps: e.reps })),
      },
    });
  }

  return { id: data.id, coachId: data.coach_id, athleteId: data.athlete_id, name: data.name, status: data.status, blocks };
}

export async function syncExerciseSets(
  coachId: string,
  sessionId: string,
  itemId: string,
  sets: { reps: string; weight: string; done: boolean; note: string }[],
) {
  await supabase.from("athlete_session_sets").delete().eq("session_id", sessionId).eq("item_id", itemId);
  if (!sets.length) return;
  const { error } = await supabase.from("athlete_session_sets").insert(
    sets.map((s, i) => ({
      coach_id: coachId,
      session_id: sessionId,
      item_id: itemId,
      set_index: i,
      reps: s.reps,
      weight: s.weight,
      done: s.done,
      note: s.note,
    })),
  );
  if (error) throw error;
}

export async function completeSessionExecution(coachId: string, sessionId: string) {
  await supabase.from("athlete_sessions").update({ status: "done" }).eq("id", sessionId);
  const { error } = await supabase.from("session_completions").insert({ coach_id: coachId, session_id: sessionId });
  if (error) throw error;

  const { data: session } = await supabase.from("athlete_sessions").select("athlete_id, name").eq("id", sessionId).single();
  if (session) {
    const { data: athlete } = await supabase.from("athletes").select("full_name").eq("id", session.athlete_id).single();
    await supabase
      .from("notifications")
      .insert({
        coach_id: coachId,
        athlete_id: session.athlete_id,
        audience: "coach",
        kind: "done",
        title: "Atleta completó sesión",
        body: `${athlete?.full_name ?? "Un atleta"} completó ${session.name}.`,
      })
      .then(() => {}, () => {});
  }
}

export async function setSessionFeeling(sessionId: string, feeling: number) {
  const { error } = await supabase.from("session_completions").update({ feeling }).eq("session_id", sessionId);
  if (error) throw error;
}

export async function fetchCompletionSummary(sessionId: string): Promise<{ name: string; blocks: number; sets: number } | null> {
  const { data, error } = await supabase.from("athlete_sessions").select("name, items, circuits").eq("id", sessionId).single();
  if (error || !data) return null;
  const items = (data.items ?? []) as { sets: string; chain: boolean }[];
  const circuits = (data.circuits ?? []) as unknown[];
  let blocks = 0;
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && items[j]?.chain) j++;
    blocks++;
    i = j;
  }
  blocks += circuits.length;
  const sets = items.reduce((sum, it) => sum + Math.max(1, parseInt(it.sets, 10) || 1), 0);
  return { name: data.name, blocks, sets };
}
