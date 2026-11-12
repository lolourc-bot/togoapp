import { supabase } from "@/lib/supabase";

export type ClassBooking = {
  id: string; memberId: string; memberName: string; status: "confirmed" | "waitlisted"; present: boolean;
};

type Row = { id: string; member_id: string; status: string; present: boolean; institution_members: { full_name: string } | null };

const SELECT = "id, member_id, status, present, institution_members(full_name)";

function rowToBooking(r: Row): ClassBooking {
  return { id: r.id, memberId: r.member_id, memberName: r.institution_members?.full_name ?? "—", status: r.status as "confirmed" | "waitlisted", present: r.present };
}

export async function fetchClassBookings(classId: string): Promise<ClassBooking[]> {
  const { data, error } = await supabase.from("institution_class_bookings").select(SELECT).eq("class_id", classId).order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as Row[]).map(rowToBooking);
}

export async function createClassBooking(classId: string, memberId: string, status: "confirmed" | "waitlisted"): Promise<ClassBooking> {
  const { data, error } = await supabase.from("institution_class_bookings").insert({ class_id: classId, member_id: memberId, status }).select(SELECT).single();
  if (error) throw error;
  return rowToBooking(data as unknown as Row);
}

export async function updateClassBooking(id: string, patch: { status?: "confirmed" | "waitlisted"; present?: boolean }) {
  const payload: Record<string, unknown> = {};
  if (patch.status !== undefined) payload["status"] = patch.status;
  if (patch.present !== undefined) payload["present"] = patch.present;
  const { error } = await supabase.from("institution_class_bookings").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteClassBooking(id: string) {
  const { error } = await supabase.from("institution_class_bookings").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchBookingCountsForClasses(classIds: string[]): Promise<Record<string, { confirmed: number; waitlisted: number }>> {
  if (classIds.length === 0) return {};
  const { data, error } = await supabase.from("institution_class_bookings").select("class_id, status").in("class_id", classIds);
  if (error || !data) return {};
  const out: Record<string, { confirmed: number; waitlisted: number }> = {};
  for (const row of data as { class_id: string; status: string }[]) {
    const entry = out[row.class_id] ?? { confirmed: 0, waitlisted: 0 };
    if (row.status === "confirmed") entry.confirmed++; else entry.waitlisted++;
    out[row.class_id] = entry;
  }
  return out;
}

export async function fetchClassOccupancyBulk(classIds: string[]): Promise<Record<string, { confirmed: number; waitlisted: number }>> {
  if (classIds.length === 0) return {};
  const { data, error } = await supabase.rpc("class_occupancy_bulk", { p_class_ids: classIds });
  if (error || !data) return {};
  const out: Record<string, { confirmed: number; waitlisted: number }> = {};
  for (const row of data as { class_id: string; confirmed_count: number; waitlisted_count: number }[]) {
    out[row.class_id] = { confirmed: row.confirmed_count, waitlisted: row.waitlisted_count };
  }
  return out;
}

export type MyBooking = { id: string; classId: string; status: "confirmed" | "waitlisted" };

export async function fetchMyClassBookings(memberId: string): Promise<MyBooking[]> {
  const { data, error } = await supabase.from("institution_class_bookings").select("id, class_id, status").eq("member_id", memberId);
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, classId: r.class_id, status: r.status as "confirmed" | "waitlisted" }));
}

export async function markAllPresent(classId: string) {
  const { error } = await supabase.from("institution_class_bookings").update({ present: true }).eq("class_id", classId).eq("status", "confirmed");
  if (error) throw error;
}
