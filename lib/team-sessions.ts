import { supabase } from "@/lib/supabase";
import type { DaySession, CalEx, FieldData } from "@/components/togo/AthleteSessionCard";
import type { CircuitConfig } from "@/components/togo/CircuitModal";

export type TeamDaySession = DaySession & { memberSessionIds: string[] };

type Row = {
  id: string;
  date: string;
  name: string;
  status: DaySession["status"];
  minutes: number | null;
  items: CalEx[] | null;
  circuits: CircuitConfig[] | null;
  field: FieldData | null;
  team_session_group_id: string;
};

const COLUMNS = "id, date, name, status, minutes, items, circuits, field, team_session_group_id";

function cellKey(teamId: string, date: string) {
  return `${teamId}|${date}`;
}

export async function fetchTeamSessions(teamId: string): Promise<Record<string, TeamDaySession[]>> {
  const { data, error } = await supabase
    .from("athlete_sessions")
    .select(COLUMNS)
    .eq("team_id", teamId)
    .order("date", { ascending: true });
  if (error || !data) return {};

  const groups = new Map<string, { date: string; rows: Row[] }>();
  for (const row of data as Row[]) {
    const g = groups.get(row.team_session_group_id) ?? { date: row.date, rows: [] };
    g.rows.push(row);
    groups.set(row.team_session_group_id, g);
  }

  const out: Record<string, TeamDaySession[]> = {};
  for (const [groupId, g] of groups) {
    const first = g.rows[0]!;
    const session: TeamDaySession = {
      id: groupId,
      name: first.name,
      status: first.status,
      minutes: first.minutes ?? 0,
      items: first.items ?? [],
      circuits: first.circuits ?? [],
      ...(first.field ? { field: first.field } : {}),
      memberSessionIds: g.rows.map((r) => r.id),
    };
    const key = cellKey(teamId, g.date);
    (out[key] ??= []).push(session);
  }
  return out;
}

export async function addTeamSession(
  coachId: string,
  teamId: string,
  memberIds: string[],
  dateKey: string,
  session: { name: string; minutes: number; items: CalEx[]; circuits: CircuitConfig[]; field?: FieldData },
  groupId: string = crypto.randomUUID(),
): Promise<TeamDaySession> {
  const rows = memberIds.map((athleteId) => ({
    coach_id: coachId,
    athlete_id: athleteId,
    team_id: teamId,
    team_session_group_id: groupId,
    date: dateKey,
    name: session.name,
    status: "draft" as const,
    minutes: session.minutes,
    is_field: !!session.field,
    items: session.items,
    circuits: session.circuits,
    field: session.field ?? null,
  }));
  const { data, error } = await supabase.from("athlete_sessions").insert(rows).select("id");
  if (error) throw error;
  return {
    id: groupId,
    name: session.name,
    status: "draft",
    minutes: session.minutes,
    items: session.items,
    circuits: session.circuits,
    ...(session.field ? { field: session.field } : {}),
    memberSessionIds: (data ?? []).map((r) => r.id as string),
  };
}

export async function patchTeamSessionGroup(
  groupId: string,
  patch: Partial<{ name: string; status: DaySession["status"]; minutes: number; items: CalEx[]; circuits: CircuitConfig[] }>,
) {
  const { error } = await supabase
    .from("athlete_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("team_session_group_id", groupId);
  if (error) throw error;
}

export async function deleteTeamSessionGroup(groupId: string) {
  const { error } = await supabase.from("athlete_sessions").delete().eq("team_session_group_id", groupId);
  if (error) throw error;
}

export async function duplicateTeamSessionGroup(
  coachId: string,
  teamId: string,
  memberIds: string[],
  group: TeamDaySession,
  newDateKey: string,
  groupId: string = crypto.randomUUID(),
): Promise<TeamDaySession> {
  return addTeamSession(
    coachId,
    teamId,
    memberIds,
    newDateKey,
    {
      name: group.name,
      minutes: group.minutes,
      items: group.items,
      circuits: group.circuits,
      ...(group.field ? { field: group.field } : {}),
    },
    groupId,
  );
}

export async function publishTeamSessionsInRange(teamId: string, fromDate: string, toDate: string) {
  const { error } = await supabase
    .from("athlete_sessions")
    .update({ status: "published" })
    .eq("team_id", teamId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .eq("status", "draft");
  if (error) throw error;
}

export type TeamActivity = { athleteName: string; sessionName: string; completedAt: string };

export async function fetchRecentTeamActivity(
  teamId: string,
  memberNames: Map<string, string>,
): Promise<TeamActivity[]> {
  const { data: sessions } = await supabase.from("athlete_sessions").select("id, athlete_id, name").eq("team_id", teamId);
  if (!sessions || sessions.length === 0) return [];
  const sessionMap = new Map(sessions.map((s) => [s.id as string, s]));
  const { data: completions } = await supabase
    .from("session_completions")
    .select("session_id, completed_at")
    .in("session_id", sessions.map((s) => s.id))
    .order("completed_at", { ascending: false })
    .limit(10);
  if (!completions) return [];
  return completions.map((c) => {
    const s = sessionMap.get(c.session_id as string);
    return {
      athleteName: s ? memberNames.get(s.athlete_id as string) ?? "Atleta" : "Atleta",
      sessionName: s?.name ?? "Sesión",
      completedAt: c.completed_at as string,
    };
  });
}

export async function fetchTeamSessionGroup(groupId: string): Promise<(TeamDaySession & { date: string }) | null> {
  const { data, error } = await supabase.from("athlete_sessions").select(COLUMNS).eq("team_session_group_id", groupId);
  if (error || !data || data.length === 0) return null;
  const rows = data as Row[];
  const first = rows[0]!;
  return {
    id: groupId,
    name: first.name,
    status: first.status,
    minutes: first.minutes ?? 0,
    items: first.items ?? [],
    circuits: first.circuits ?? [],
    ...(first.field ? { field: first.field } : {}),
    memberSessionIds: rows.map((r) => r.id),
    date: first.date,
  };
}

const TEAM_RANK: Record<DaySession["status"], number> = { draft: 0, published: 1, done: 2 };

/** Real status per day (best of that day's sessions) for the Mon–Sun week containing `anchorDate`. */
export async function fetchTeamWeekStatus(teamId: string, anchorDate: string): Promise<Record<string, DaySession["status"]>> {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("athlete_sessions")
    .select("date, status")
    .eq("team_id", teamId)
    .gte("date", fmt(monday))
    .lte("date", fmt(sunday));
  if (error || !data) return {};
  const out: Record<string, DaySession["status"]> = {};
  for (const row of data as { date: string; status: DaySession["status"] }[]) {
    const prev = out[row.date];
    if (!prev || TEAM_RANK[row.status] > TEAM_RANK[prev]) out[row.date] = row.status;
  }
  return out;
}
