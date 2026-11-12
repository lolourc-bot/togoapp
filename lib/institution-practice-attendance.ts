import { supabase } from "@/lib/supabase";

export type PracticeAttendance = { memberId: string; present: boolean };

export async function fetchPracticeAttendance(practiceId: string): Promise<PracticeAttendance[]> {
  const { data, error } = await supabase.from("institution_practice_attendance").select("member_id, present").eq("practice_id", practiceId);
  if (error || !data) return [];
  return data.map((r) => ({ memberId: r.member_id, present: r.present }));
}

export async function setPracticeAttendance(practiceId: string, memberId: string, present: boolean) {
  const { error } = await supabase.from("institution_practice_attendance")
    .upsert({ practice_id: practiceId, member_id: memberId, present }, { onConflict: "practice_id,member_id" });
  if (error) throw error;
}

export async function markAllPracticeAttendance(practiceId: string, memberIds: string[], present: boolean) {
  const { error } = await supabase.from("institution_practice_attendance")
    .upsert(memberIds.map((memberId) => ({ practice_id: practiceId, member_id: memberId, present })), { onConflict: "practice_id,member_id" });
  if (error) throw error;
}

export async function fetchAttendanceCountsForPractices(practiceIds: string[]): Promise<Record<string, { present: number; total: number }>> {
  if (practiceIds.length === 0) return {};
  const { data, error } = await supabase.from("institution_practice_attendance").select("practice_id, present").in("practice_id", practiceIds);
  if (error || !data) return {};
  const out: Record<string, { present: number; total: number }> = {};
  for (const row of data as { practice_id: string; present: boolean }[]) {
    const entry = out[row.practice_id] ?? { present: 0, total: 0 };
    entry.total++;
    if (row.present) entry.present++;
    out[row.practice_id] = entry;
  }
  return out;
}
