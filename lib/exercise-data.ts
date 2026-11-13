import { fetchTogoVideos } from "@/lib/togo-videos";
import { fetchOwnVideos } from "@/lib/coach-videos";

export type MovementPattern =
  | "Core"
  | "Sentadilla"
  | "Estocada"
  | "Bisagra"
  | "Empuje vertical"
  | "Empuje horizontal"
  | "Tracción vertical"
  | "Tracción horizontal"
  | "Isométricos"
  | "Pliométricos"
  | "DLO";

export type Laterality = "Bilateral" | "Unilateral";

export type LibraryExercise = {
  name: string;
  pattern: MovementPattern;
  equipment: string;
  laterality: Laterality;
  source: "TOGO" | "Coach";
  videoUrl?: string;
};

export function youtubeVideoId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1]! : null;
}

export function youtubeThumbnail(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
}

/** Muted, controls-less, looping, starts at 2s to skip YouTube's title-card flash — for hover-preview thumbnails. */
export function youtubePreviewUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    modestbranding: "1",
    rel: "0",
    fs: "0",
    disablekb: "1",
    iv_load_policy: "3",
    start: "2",
    loop: "1",
    playlist: id,
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Nombre registrado de la cuenta: coach individual, marca o club. */
export const COACH_BADGE = "Pablo R.";

export const sourceLabel = (source: LibraryExercise["source"]) =>
  source === "TOGO" ? "TOGO" : COACH_BADGE;

export const MOVEMENT_PATTERNS = [
  "Todos",
  "Core",
  "Sentadilla",
  "Estocada",
  "Bisagra",
  "Empuje vertical",
  "Empuje horizontal",
  "Tracción vertical",
  "Tracción horizontal",
  "Isométricos",
  "Pliométricos",
  "DLO",
];

export const EQUIPMENT_OPTIONS = [
  "Todo",
  "Barra",
  "Mancuernas",
  "Kettlebell",
  "Máquinas",
  "Peso corporal",
  "Bandas",
  "Poleas",
];

export const LATERALITY_OPTIONS = ["Todos", "Bilateral", "Unilateral"];

/** Real exercise picker list: TOGO's catalog + the coach's own library (same content as /biblioteca). */
/** TOGO's shared library only (readable without signing in): used by the landing's try-it editor. */
export async function fetchTogoLibrary(): Promise<LibraryExercise[]> {
  const togo = await fetchTogoVideos();
  return togo
    .filter((v) => v.pattern)
    .map((v) => ({
      name: v.name,
      pattern: v.pattern as MovementPattern,
      equipment: v.equipment || "Peso corporal",
      laterality: (v.laterality as Laterality) || "Bilateral",
      source: "TOGO",
      ...(v.videoUrl ? { videoUrl: v.videoUrl } : {}),
    }));
}

export async function fetchLibraryExercises(coachId: string): Promise<LibraryExercise[]> {
  const [togo, own] = await Promise.all([fetchTogoVideos(), fetchOwnVideos(coachId)]);
  const togoItems: LibraryExercise[] = togo
    .filter((v) => v.pattern)
    .map((v) => ({
      name: v.name,
      pattern: v.pattern as MovementPattern,
      equipment: v.equipment || "Peso corporal",
      laterality: (v.laterality as Laterality) || "Bilateral",
      source: "TOGO",
      ...(v.videoUrl ? { videoUrl: v.videoUrl } : {}),
    }));
  const ownItems: LibraryExercise[] = own
    .filter((v) => v.pattern)
    .map((v) => ({
      name: v.name,
      pattern: v.pattern as MovementPattern,
      equipment: v.equipment || "Peso corporal",
      laterality: (v.laterality as Laterality) || "Bilateral",
      source: "Coach",
      ...(v.videoUrl ? { videoUrl: v.videoUrl } : {}),
    }));
  return [...ownItems, ...togoItems];
}

export const PICKER_PATTERN_CHIPS = [
  "Todos",
  "Sentadilla",
  "Bisagra",
  "Empuje horizontal",
  "Empuje vertical",
  "Tracción horizontal",
  "Tracción vertical",
  "Core",
  "Estocada",
];

export async function createLibraryExercise(
  coachId: string,
  input: { name: string; pattern: MovementPattern; equipment: string; laterality: Laterality; videoUrl?: string },
): Promise<LibraryExercise> {
  const { createCoachVideo } = await import("@/lib/coach-videos");
  await createCoachVideo(coachId, {
    name: input.name,
    pattern: input.pattern,
    equipment: input.equipment,
    laterality: input.laterality,
    description: "",
    videoUrl: input.videoUrl ?? "",
  });
  return { name: input.name, pattern: input.pattern, equipment: input.equipment, laterality: input.laterality, source: "Coach" };
}
