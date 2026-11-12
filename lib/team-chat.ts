import { supabase } from "@/lib/supabase";

export type TeamMessage = {
  id: string;
  senderAthleteId: string | null;
  senderName: string;
  body: string;
  createdAt: string;
};

export async function fetchTeamMessages(teamId: string, nameById: Map<string, string>, coachName: string): Promise<TeamMessage[]> {
  const { data, error } = await supabase
    .from("team_messages")
    .select("id, sender_athlete_id, body, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((m) => ({
    id: m.id,
    senderAthleteId: m.sender_athlete_id,
    senderName: m.sender_athlete_id ? nameById.get(m.sender_athlete_id) ?? "Atleta" : coachName,
    body: m.body,
    createdAt: m.created_at,
  }));
}

export type TeamConversation = { teamId: string; name: string; memberNames: string[]; messages: TeamMessage[] };

export async function fetchTeamConversations(coachId: string, coachName: string): Promise<TeamConversation[]> {
  const { data: teams } = await supabase.from("teams").select("id, name").eq("coach_id", coachId).order("name");
  if (!teams || teams.length === 0) return [];

  const { data: members } = await supabase
    .from("team_members")
    .select("team_id, athlete_id, athletes(full_name)")
    .eq("coach_id", coachId);
  const membersByTeam = new Map<string, { id: string; name: string }[]>();
  for (const m of members ?? []) {
    const list = membersByTeam.get(m.team_id) ?? [];
    list.push({ id: m.athlete_id, name: (m.athletes as unknown as { full_name: string } | null)?.full_name ?? "Atleta" });
    membersByTeam.set(m.team_id, list);
  }

  const { data: msgs } = await supabase
    .from("team_messages")
    .select("id, team_id, sender_athlete_id, body, created_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: true });
  const msgsByTeam = new Map<string, TeamMessage[]>();
  for (const m of msgs ?? []) {
    const roster = membersByTeam.get(m.team_id) ?? [];
    const nameById = new Map(roster.map((r) => [r.id, r.name]));
    const list = msgsByTeam.get(m.team_id) ?? [];
    list.push({
      id: m.id,
      senderAthleteId: m.sender_athlete_id,
      senderName: m.sender_athlete_id ? nameById.get(m.sender_athlete_id) ?? "Atleta" : coachName,
      body: m.body,
      createdAt: m.created_at,
    });
    msgsByTeam.set(m.team_id, list);
  }

  return teams.map((t) => ({
    teamId: t.id,
    name: t.name,
    memberNames: (membersByTeam.get(t.id) ?? []).map((m) => m.name),
    messages: msgsByTeam.get(t.id) ?? [],
  }));
}

export type MyTeamLink = { teamId: string; coachId: string; name: string; members: { id: string; name: string }[] };

/** Every team this logged-in athlete belongs to, across any of their coach relationships. */
export async function fetchMyTeamLinks(athleteIds: string[]): Promise<MyTeamLink[]> {
  if (athleteIds.length === 0) return [];
  const { data: memberships } = await supabase.from("team_members").select("team_id, coach_id").in("athlete_id", athleteIds);
  if (!memberships || memberships.length === 0) return [];
  const teamIds = [...new Set(memberships.map((m) => m.team_id as string))];
  const coachIdByTeam = new Map(memberships.map((m) => [m.team_id, m.coach_id as string]));

  const [{ data: teams }, { data: allMembers }] = await Promise.all([
    supabase.from("teams").select("id, name").in("id", teamIds),
    supabase.from("team_members").select("team_id, athlete_id, athletes(full_name)").in("team_id", teamIds),
  ]);
  const membersByTeam = new Map<string, { id: string; name: string }[]>();
  for (const m of allMembers ?? []) {
    const list = membersByTeam.get(m.team_id) ?? [];
    list.push({ id: m.athlete_id, name: (m.athletes as unknown as { full_name: string } | null)?.full_name ?? "Atleta" });
    membersByTeam.set(m.team_id, list);
  }
  return (teams ?? []).map((t) => ({
    teamId: t.id, coachId: coachIdByTeam.get(t.id)!, name: t.name, members: membersByTeam.get(t.id) ?? [],
  }));
}

export async function sendTeamMessage(coachId: string, teamId: string, senderAthleteId: string | null, body: string) {
  const { error } = await supabase
    .from("team_messages")
    .insert({ coach_id: coachId, team_id: teamId, sender_athlete_id: senderAthleteId, body });
  if (error) throw error;

  const { data: team } = await supabase.from("teams").select("name").eq("id", teamId).single();
  const { data: members } = await supabase.from("team_members").select("athlete_id").eq("team_id", teamId);
  const teamName = team?.name ?? "tu equipo";

  if (senderAthleteId === null) {
    // Coach wrote to the group — notify every member.
    const rows = (members ?? [])
      .map((m) => m.athlete_id as string)
      .map((athleteId) => ({
        coach_id: coachId,
        athlete_id: athleteId,
        audience: "athlete",
        kind: "teamMessage",
        title: `Mensaje en ${teamName}`,
        body,
      }));
    if (rows.length) await supabase.from("notifications").insert(rows).then(() => {}, () => {});
  } else {
    // An athlete wrote to the group — notify the coach once, and the other members.
    const { data: sender } = await supabase.from("athletes").select("full_name").eq("id", senderAthleteId).single();
    const senderName = sender?.full_name ?? "Un atleta";
    await supabase
      .from("notifications")
      .insert({ coach_id: coachId, audience: "coach", kind: "teamMessage", title: `Mensaje en ${teamName}`, body: `${senderName}: ${body}` })
      .then(() => {}, () => {});
    const otherRows = (members ?? [])
      .map((m) => m.athlete_id as string)
      .filter((id) => id !== senderAthleteId)
      .map((athleteId) => ({
        coach_id: coachId,
        athlete_id: athleteId,
        audience: "athlete",
        kind: "teamMessage",
        title: `Mensaje en ${teamName}`,
        body: `${senderName}: ${body}`,
      }));
    if (otherRows.length) await supabase.from("notifications").insert(otherRows).then(() => {}, () => {});
  }
}
