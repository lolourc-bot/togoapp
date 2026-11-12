import { getSupabaseAdmin } from "@/lib/supabase-admin";

function mondayOf(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * El acceso dura más que las `weeks` nominales del programa, para que pausar o
 * atrasarse no corte el acceso justo en el borde — el buffer escala con la duración
 * (mínimo 2 semanas, o la mitad de la duración si el programa es más largo).
 */
export function computeAccessUntil(weeks: number, startDate: string): string {
  const bufferWeeks = Math.max(2, Math.ceil(weeks * 0.5));
  const d = mondayOf(startDate);
  d.setDate(d.getDate() + (weeks + bufferWeeks) * 7);
  return fmt(d);
}

/**
 * Crea el program_assignments y materializa cada program_sessions del molde como una
 * fila real de athlete_sessions con fecha concreta — la semana 0 del programa cae en la
 * semana (lunes a domingo) que contiene startDate. Sin esto, "asignar un programa" solo
 * dejaba un registro administrativo sin que apareciera nada en el calendario del atleta.
 */
export async function materializeProgramForAthlete(
  coachId: string,
  programId: string,
  athleteId: string,
  startDate: string,
): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: program } = await admin.from("programs").select("weeks").eq("id", programId).maybeSingle();
  const weeks = (program?.["weeks"] as number | null) ?? 0;
  const accessUntil = computeAccessUntil(weeks, startDate);

  await admin.from("program_assignments").insert({
    coach_id: coachId,
    program_id: programId,
    athlete_id: athleteId,
    start_date: startDate,
    access_until: accessUntil,
  });

  const { data: templateSessions } = await admin
    .from("program_sessions")
    .select("week_index, day_index, name, exercises, circuits")
    .eq("program_id", programId);
  if (!templateSessions?.length) return;

  const monday = mondayOf(startDate);
  const rows = templateSessions.map((s) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + (s["week_index"] as number) * 7 + (s["day_index"] as number));
    const exercises = ((s["exercises"] as Record<string, unknown>[]) ?? []).map((e) => {
      const { chained, ...rest } = e as { chained?: boolean } & Record<string, unknown>;
      return { ...rest, chain: chained ?? false };
    });
    return {
      coach_id: coachId,
      athlete_id: athleteId,
      date: fmt(date),
      name: s["name"] as string,
      status: "published",
      items: exercises,
      circuits: s["circuits"] ?? [],
    };
  });

  await admin.from("athlete_sessions").insert(rows);
}
