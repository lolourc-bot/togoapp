import { supabase } from "@/lib/supabase";

export type LibraryExercise = {
  id: string;
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
  source: "togo" | "coach";
};

const COLUMNS = "id, name, pattern, equipment, laterality, description, video_url, image_url, source";

function rowToExercise(row: {
  id: string;
  name: string;
  pattern: string | null;
  equipment: string | null;
  laterality: string | null;
  description: string | null;
  video_url: string | null;
  image_url: string | null;
  source: string;
}): LibraryExercise {
  return {
    id: row.id,
    name: row.name,
    pattern: row.pattern ?? "",
    equipment: row.equipment ?? "",
    laterality: row.laterality ?? "",
    description: row.description ?? "",
    videoUrl: row.video_url ?? "",
    imageUrl: row.image_url ?? "",
    source: row.source === "togo" ? "togo" : "coach",
  };
}

export async function fetchExercises(coachId: string): Promise<LibraryExercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(COLUMNS)
    .or(`coach_id.is.null,coach_id.eq.${coachId}`)
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToExercise);
}

export type NewExerciseInput = {
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
};

export async function createExercise(coachId: string, input: NewExerciseInput): Promise<string> {
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      coach_id: coachId,
      source: "coach",
      name: input.name,
      pattern: input.pattern,
      equipment: input.equipment,
      laterality: input.laterality,
      description: input.description || null,
      video_url: input.videoUrl || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateExercise(id: string, input: NewExerciseInput) {
  const { error } = await supabase
    .from("exercises")
    .update({
      name: input.name,
      pattern: input.pattern,
      equipment: input.equipment,
      laterality: input.laterality,
      description: input.description || null,
      video_url: input.videoUrl || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteExercise(id: string) {
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw error;
}
