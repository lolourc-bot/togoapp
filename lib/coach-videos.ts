import { supabase } from "@/lib/supabase";

export type CoachVideo = {
  id: string;
  coachId: string;
  coachName: string;
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
};

type CoachVideoRow = {
  id: string;
  coach_id: string;
  name: string;
  pattern: string | null;
  equipment: string | null;
  laterality: string | null;
  description: string | null;
  video_url: string | null;
  image_url: string | null;
};

function rowToVideo(row: CoachVideoRow, coachName: string): CoachVideo {
  return {
    id: row.id,
    coachId: row.coach_id,
    coachName,
    name: row.name,
    pattern: row.pattern ?? "",
    equipment: row.equipment ?? "",
    laterality: row.laterality ?? "",
    description: row.description ?? "",
    videoUrl: row.video_url ?? "",
    imageUrl: row.image_url ?? "",
  };
}

const COLUMNS = "id, coach_id, name, pattern, equipment, laterality, description, video_url, image_url";

export async function fetchOwnVideos(coachId: string): Promise<CoachVideo[]> {
  const { data, error } = await supabase
    .from("coach_videos")
    .select(COLUMNS)
    .eq("coach_id", coachId)
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => rowToVideo(row, "Mío"));
}

export type FollowedCoach = { id: string; fullName: string };

export async function fetchFollowedCoaches(coachId: string): Promise<FollowedCoach[]> {
  const { data, error } = await supabase
    .from("coach_follows")
    .select("followed_id, profiles!coach_follows_followed_id_fkey(full_name)")
    .eq("follower_id", coachId);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.followed_id as string,
    fullName: (row.profiles as unknown as { full_name: string | null })?.full_name ?? "Coach",
  }));
}

/** All other coaches' videos (visible community-wide), each tagged with its author's name. */
export async function fetchCommunityVideos(excludeId: string): Promise<CoachVideo[]> {
  const { data, error } = await supabase
    .from("coach_videos")
    .select(`${COLUMNS}, profiles(full_name)`)
    .neq("coach_id", excludeId)
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map((row) =>
    rowToVideo(row, (row.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "Coach"),
  );
}

export async function searchCoaches(query: string, excludeId: string): Promise<FollowedCoach[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "coach")
    .neq("id", excludeId)
    .ilike("full_name", `%${query.trim()}%`)
    .limit(20);
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, fullName: row.full_name ?? "Coach" }));
}

export async function followCoach(followerId: string, followedId: string) {
  const { error } = await supabase.from("coach_follows").insert({ follower_id: followerId, followed_id: followedId });
  if (error) throw error;
}

export async function unfollowCoach(followerId: string, followedId: string) {
  const { error } = await supabase
    .from("coach_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("followed_id", followedId);
  if (error) throw error;
}

export type CoachVideoInput = {
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
};

async function notifyFollowers(coachId: string, videoName: string) {
  const { data: followers } = await supabase.from("coach_follows").select("follower_id").eq("followed_id", coachId);
  if (!followers || followers.length === 0) return;
  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", coachId).single();
  const coachName = me?.full_name || "Un coach que seguís";
  const rows = followers.map((f) => ({
    coach_id: f.follower_id,
    audience: "coach",
    kind: "newCoachVideo",
    title: `${coachName} subió un video nuevo`,
    body: videoName,
  }));
  await supabase.from("notifications").insert(rows);
}

export async function createCoachVideo(coachId: string, input: CoachVideoInput): Promise<string> {
  const { data, error } = await supabase
    .from("coach_videos")
    .insert({
      coach_id: coachId,
      name: input.name,
      pattern: input.pattern || null,
      equipment: input.equipment || null,
      laterality: input.laterality || null,
      description: input.description || null,
      video_url: input.videoUrl || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  await notifyFollowers(coachId, input.name).catch(() => {});
  return data.id as string;
}

export async function updateCoachVideo(id: string, input: CoachVideoInput) {
  const { error } = await supabase
    .from("coach_videos")
    .update({
      name: input.name,
      pattern: input.pattern || null,
      equipment: input.equipment || null,
      laterality: input.laterality || null,
      description: input.description || null,
      video_url: input.videoUrl || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCoachVideo(id: string) {
  const { error } = await supabase.from("coach_videos").delete().eq("id", id);
  if (error) throw error;
}
