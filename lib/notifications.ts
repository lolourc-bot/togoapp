import { useCallback, useEffect, useState } from "react";
import type { UserType } from "@/lib/user-context";
import { supabase } from "@/lib/supabase";
import { getCoachId } from "@/lib/programs";
import { fetchAthleteCoachId } from "@/lib/wellness";

export type NotifCat = "Entrenamiento" | "Mensajes" | "Institución";
export type Notif = {
  id: string; kind: string; title: string; body: string; time: string; day: string;
  cat: NotifCat; unread: boolean; only?: UserType[];
};

export const NOTIF_STYLE: Record<string, { bg: string; fg: string }> = {
  session: { bg: "#EFF6FF", fg: "#3B82F6" },
  message: { bg: "#F0FDF4", fg: "#16A34A" },
  done: { bg: "#DCFCE7", fg: "#16A34A" },
  class: { bg: "#FFFBEB", fg: "#D97706" },
  fee: { bg: "#FFF7ED", fg: "#EA580C" },
  coach: { bg: "#F5F3FF", fg: "#7C3AED" },
  team: { bg: "#EFF6FF", fg: "#3B82F6" },
  reminder: { bg: "#F1F5F9", fg: "#64748B" },
  newAthlete: { bg: "#F5F3FF", fg: "#7C3AED" },
  inactive: { bg: "#FFF7ED", fg: "#EA580C" },
  request: { bg: "#FFFBEB", fg: "#D97706" },
  noWeek: { bg: "#F1F5F9", fg: "#64748B" },
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function catForKind(kind: string): NotifCat {
  if (kind === "message") return "Mensajes";
  return "Entrenamiento";
}

type NotifRow = { id: string; kind: string; title: string; body: string | null; created_at: string; read_at: string | null };

function rowToNotif(row: NotifRow): Notif {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body ?? "",
    time: timeLabel(row.created_at),
    day: dayLabel(row.created_at),
    cat: catForKind(row.kind),
    unread: !row.read_at,
  };
}

export function useNotifs(who: "athlete" | "coach", athleteId?: string) {
  const [list, setList] = useState<Notif[]>([]);
  const [coachId, setCoachId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const cid = who === "coach" ? await getCoachId() : athleteId ? await fetchAthleteCoachId(athleteId) : null;
    if (!cid) return;
    setCoachId(cid);
    let query = supabase
      .from("notifications")
      .select("id, kind, title, body, created_at, read_at")
      .eq("coach_id", cid)
      .eq("audience", who)
      .order("created_at", { ascending: false })
      .limit(30);
    if (who === "athlete" && athleteId) query = query.eq("athlete_id", athleteId);
    const { data } = await query;
    setList((data ?? []).map(rowToNotif));
  }, [who, athleteId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    list,
    markAll: () => {
      if (!coachId) return;
      let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("coach_id", coachId).eq("audience", who).is("read_at", null);
      if (who === "athlete" && athleteId) query = query.eq("athlete_id", athleteId);
      query.then(() => reload());
    },
    markRead: (id: string) => {
      supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).then(() => reload());
    },
  };
}

export function forUser(list: Notif[], t: UserType) {
  return list.filter((n) => !n.only || n.only.includes(t));
}

export async function notifySessionsPublished(coachId: string, athleteId: string, count: number) {
  if (count <= 0) return;
  const title = count === 1 ? "Nueva sesión publicada" : "Nuevas sesiones publicadas";
  const body = count === 1 ? "Tu coach publicó una sesión nueva." : `Tu coach publicó ${count} sesiones nuevas.`;
  await supabase
    .from("notifications")
    .insert({ coach_id: coachId, athlete_id: athleteId, audience: "athlete", kind: "session", title, body })
    .then(
      () => {},
      () => {},
    );
}
