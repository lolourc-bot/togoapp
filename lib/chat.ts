import { supabase } from "@/lib/supabase";

export type ChatMessage = { id: string; sender: "coach" | "athlete"; body: string; createdAt: string; readAt: string | null };

export async function fetchCoachInfo(athleteId: string): Promise<{ coachId: string; coachName: string } | null> {
  const { data: athlete, error } = await supabase.from("athletes").select("coach_id").eq("id", athleteId).single();
  if (error || !athlete) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", athlete.coach_id).single();
  return { coachId: athlete.coach_id, coachName: profile?.full_name ?? "Tu coach" };
}

export async function fetchMessages(coachId: string, athleteId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender, body, created_at, read_at")
    .eq("coach_id", coachId)
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((m) => ({
    id: m.id,
    sender: m.sender as "coach" | "athlete",
    body: m.body,
    createdAt: m.created_at,
    readAt: m.read_at,
  }));
}

export async function sendMessage(coachId: string, athleteId: string, sender: "coach" | "athlete", body: string) {
  const { error } = await supabase.from("messages").insert({ coach_id: coachId, athlete_id: athleteId, sender, body });
  if (error) throw error;

  if (sender === "athlete") {
    const { data: athlete } = await supabase.from("athletes").select("full_name").eq("id", athleteId).single();
    await supabase
      .from("notifications")
      .insert({
        coach_id: coachId,
        athlete_id: athleteId,
        audience: "coach",
        kind: "message",
        title: "Mensaje nuevo",
        body: `${athlete?.full_name ?? "Un atleta"}: ${body}`,
      })
      .then(() => {}, () => {});
  } else {
    await supabase
      .from("notifications")
      .insert({ coach_id: coachId, athlete_id: athleteId, audience: "athlete", kind: "message", title: "Mensaje nuevo", body: "Tu coach te envió un mensaje." })
      .then(() => {}, () => {});
  }
}

export type CoachConversation = { athleteId: string; name: string; messages: ChatMessage[] };

export async function fetchCoachConversations(coachId: string): Promise<CoachConversation[]> {
  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("id, full_name")
    .eq("coach_id", coachId)
    .order("full_name", { ascending: true });
  if (error || !athletes) return [];

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, athlete_id, sender, body, created_at, read_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: true });

  const byAthlete = new Map<string, ChatMessage[]>();
  for (const m of msgs ?? []) {
    const arr = byAthlete.get(m.athlete_id) ?? [];
    arr.push({ id: m.id, sender: m.sender as "coach" | "athlete", body: m.body, createdAt: m.created_at, readAt: m.read_at });
    byAthlete.set(m.athlete_id, arr);
  }

  return athletes.map((a) => ({ athleteId: a.id, name: a.full_name, messages: byAthlete.get(a.id) ?? [] }));
}

export async function hasUnreadMessages(coachId: string, athleteId: string): Promise<boolean> {
  const { count } = await supabase
    .from("messages").select("id", { count: "exact", head: true })
    .eq("coach_id", coachId).eq("athlete_id", athleteId).eq("sender", "coach").is("read_at", null);
  return (count ?? 0) > 0;
}

export type MyCoachLink = { athleteId: string; coachId: string; coachName: string };

/** Every coach relationship this logged-in athlete has (can be more than one). */
export async function fetchMyCoachLinks(authUserId: string): Promise<MyCoachLink[]> {
  const { data: rows } = await supabase.from("athletes").select("id, coach_id").eq("auth_user_id", authUserId);
  if (!rows || rows.length === 0) return [];
  const coachIds = [...new Set(rows.map((r) => r.coach_id as string))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", coachIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Coach"]));
  return rows.map((r) => ({ athleteId: r.id, coachId: r.coach_id, coachName: nameById.get(r.coach_id) ?? "Coach" }));
}

export async function markRead(coachId: string, athleteId: string, reader: "coach" | "athlete") {
  const otherSender = reader === "athlete" ? "coach" : "athlete";
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("coach_id", coachId)
    .eq("athlete_id", athleteId)
    .eq("sender", otherSender)
    .is("read_at", null);
  if (error) throw error;
}
