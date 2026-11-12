import { supabase } from "@/lib/supabase";

export type InstitutionClass = {
  id: string; name: string; classType: string | null; coachId: string | null; coachName: string | null;
  room: string | null; date: string; start: string; durationMinutes: number; capacity: number;
  waitlistEnabled: boolean; description: string | null;
};

type Row = {
  id: string; name: string; class_type: string | null; coach_id: string | null; institution_coaches: { full_name: string } | null;
  room: string | null; class_date: string; start_time: string; duration_minutes: number; capacity: number;
  waitlist_enabled: boolean; description: string | null;
};

const SELECT = "id, name, class_type, coach_id, institution_coaches(full_name), room, class_date, start_time, duration_minutes, capacity, waitlist_enabled, description";

function rowToClass(r: Row): InstitutionClass {
  return {
    id: r.id, name: r.name, classType: r.class_type, coachId: r.coach_id, coachName: r.institution_coaches?.full_name ?? null,
    room: r.room, date: r.class_date, start: r.start_time, durationMinutes: r.duration_minutes, capacity: r.capacity,
    waitlistEnabled: r.waitlist_enabled, description: r.description,
  };
}

export async function fetchInstitutionClasses(institutionId: string): Promise<InstitutionClass[]> {
  const { data, error } = await supabase
    .from("institution_classes")
    .select(SELECT)
    .eq("institution_id", institutionId)
    .order("class_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as Row[]).map(rowToClass);
}

export type ClassInput = {
  name: string; classType: string | null; coachId: string | null; room: string | null;
  date: string; start: string; durationMinutes: number; capacity: number; waitlistEnabled: boolean; description: string | null;
};

export async function createInstitutionClasses(institutionId: string, inputs: ClassInput[]): Promise<InstitutionClass[]> {
  const { data, error } = await supabase
    .from("institution_classes")
    .insert(inputs.map((input) => ({
      institution_id: institutionId, name: input.name, class_type: input.classType, coach_id: input.coachId,
      room: input.room, class_date: input.date, start_time: input.start, duration_minutes: input.durationMinutes,
      capacity: input.capacity, waitlist_enabled: input.waitlistEnabled, description: input.description,
    })))
    .select(SELECT);
  if (error || !data) throw error;
  return (data as unknown as Row[]).map(rowToClass);
}

export async function updateInstitutionClass(id: string, input: ClassInput) {
  const { error } = await supabase.from("institution_classes").update({
    name: input.name, class_type: input.classType, coach_id: input.coachId, room: input.room,
    class_date: input.date, start_time: input.start, duration_minutes: input.durationMinutes,
    capacity: input.capacity, waitlist_enabled: input.waitlistEnabled, description: input.description,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteInstitutionClass(id: string) {
  const { error } = await supabase.from("institution_classes").delete().eq("id", id);
  if (error) throw error;
}
