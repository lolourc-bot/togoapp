import { supabase } from "@/lib/supabase";

export type TogoVideo = {
  id: string;
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
};

const COLUMNS = "id, name, pattern, equipment, laterality, description, video_url, image_url";

type TogoVideoRow = {
  id: string;
  name: string;
  pattern: string | null;
  equipment: string | null;
  laterality: string | null;
  description: string | null;
  video_url: string | null;
  image_url: string | null;
};

function rowToVideo(row: TogoVideoRow): TogoVideo {
  return {
    id: row.id,
    name: row.name,
    pattern: row.pattern ?? "",
    equipment: row.equipment ?? "",
    laterality: row.laterality ?? "",
    description: row.description ?? "",
    videoUrl: row.video_url ?? "",
    imageUrl: row.image_url ?? "",
  };
}

export async function fetchIsAdmin(coachId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", coachId).single();
  return !!data?.is_admin;
}

export async function fetchTogoVideos(): Promise<TogoVideo[]> {
  const { data, error } = await supabase.from("togo_videos").select(COLUMNS).order("name", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToVideo);
}

export type TogoVideoInput = {
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
};

export async function createTogoVideo(createdBy: string, input: TogoVideoInput): Promise<string> {
  const { data, error } = await supabase
    .from("togo_videos")
    .insert({
      created_by: createdBy,
      name: input.name,
      pattern: input.pattern || null,
      equipment: input.equipment || null,
      laterality: input.laterality || null,
      description: input.description || null,
      video_url: input.videoUrl || null,
      image_url: input.imageUrl || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateTogoVideo(id: string, input: TogoVideoInput) {
  const { error } = await supabase
    .from("togo_videos")
    .update({
      name: input.name,
      pattern: input.pattern || null,
      equipment: input.equipment || null,
      laterality: input.laterality || null,
      description: input.description || null,
      video_url: input.videoUrl || null,
      image_url: input.imageUrl || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTogoVideo(id: string) {
  const { error } = await supabase.from("togo_videos").delete().eq("id", id);
  if (error) throw error;
}
