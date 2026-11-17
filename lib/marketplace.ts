import { supabase } from "@/lib/supabase";
import { parsePriceInput } from "@/lib/program-price";

export type Modality = "Online" | "Presencial" | "Ambas";
export type ProgramLevel = "Principiante" | "Intermedio" | "Avanzado";
export type PaymentType = "unico" | "sub";

export type MarketplaceCoach = {
  coachId: string;
  name: string;
  photoUrl: string | null;
  bio: string;
  specialty: string;
  modality: Modality | null;
  modalityText: string;
  yearsExperience: number | null;
  chips: string[];
  availableDays: boolean[];
  athleteCount: number;
  visible: boolean;
};

export type MarketplaceProgram = {
  id: string;
  name: string;
  description: string;
  weeks: number | null;
  level: ProgramLevel | null;
  price: string | null;
  paymentType: PaymentType | null;
  visible: boolean;
  sport?: string | null;
  coverUrl?: string | null;
  currency?: string | null;
};

/** Sports/disciplines a marketplace program can be tagged with (athletes filter by them). */
export const PROGRAM_SPORTS = [
  "Fuerza e hipertrofia",
  "Running",
  "Ciclismo",
  "Natación",
  "Triatlón",
  "CrossFit / funcional",
  "Fútbol",
  "Básquet",
  "Hockey",
  "Rugby",
  "Tenis",
  "Pádel",
  "Vóley",
  "Movilidad",
  "Pérdida de peso",
  "Salud y bienestar",
] as const;

async function loadMarketplaceCoach(coachId: string): Promise<MarketplaceCoach | null> {
  const [{ data: profile }, { data: mp }, { data: countData }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", coachId).maybeSingle(),
    supabase.from("coach_marketplace_profiles").select("*").eq("coach_id", coachId).maybeSingle(),
    supabase.rpc("coach_athlete_count", { target_coach_id: coachId }),
  ]);
  if (!profile) return null;
  return {
    coachId,
    name: profile.full_name ?? "Coach",
    photoUrl: mp?.photo_url ?? null,
    bio: mp?.bio ?? "",
    specialty: mp?.specialty ?? "",
    modality: (mp?.modality as Modality | null) ?? null,
    modalityText: mp?.modality_text ?? "",
    yearsExperience: mp?.years_experience ?? null,
    chips: mp?.chips ?? [],
    availableDays: (mp?.available_days as boolean[] | null) ?? Array(7).fill(false),
    athleteCount: Number(countData ?? 0),
    visible: mp?.visible ?? false,
  };
}

/** Public: only returns a profile the coach has explicitly made visible. */
export async function fetchCoachMarketplaceProfile(coachId: string): Promise<MarketplaceCoach | null> {
  const c = await loadMarketplaceCoach(coachId);
  return c && c.visible ? c : null;
}

/** Owner-only: always returns the coach's own draft, regardless of visibility. */
export async function fetchMyMarketplaceProfile(coachId: string): Promise<MarketplaceCoach | null> {
  return loadMarketplaceCoach(coachId);
}

export type PublicCoachSummary = MarketplaceCoach & { minPrice: number | null; programCount: number };

function parsePrice(s: string | null): number | null {
  return parsePriceInput(s) || null;
}

/** Discovery list: every coach who published a visible marketplace profile. */
export async function fetchPublicCoaches(): Promise<PublicCoachSummary[]> {
  const { data: mps } = await supabase.from("coach_marketplace_profiles").select("*").eq("visible", true);
  if (!mps || mps.length === 0) return [];
  const coachIds = mps.map((m) => m.coach_id as string);

  const [{ data: profiles }, { data: programs }, counts] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", coachIds),
    supabase.from("programs").select("coach_id, price").eq("visible_marketplace", true).in("coach_id", coachIds),
    Promise.all(coachIds.map((id) => supabase.rpc("coach_athlete_count", { target_coach_id: id }).then((r) => [id, Number(r.data ?? 0)] as const))),
  ]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Coach"]));
  const countById = new Map(counts);
  const programsByCoach = new Map<string, string | null>();
  const programCountByCoach = new Map<string, number>();
  for (const p of programs ?? []) {
    programCountByCoach.set(p.coach_id, (programCountByCoach.get(p.coach_id) ?? 0) + 1);
    const price = parsePrice(p.price);
    if (price != null) {
      const current = programsByCoach.get(p.coach_id);
      if (current == null || price < (parsePrice(current) ?? Infinity)) programsByCoach.set(p.coach_id, p.price);
    }
  }

  return mps.map((mp) => ({
    coachId: mp.coach_id,
    name: nameById.get(mp.coach_id) ?? "Coach",
    photoUrl: mp.photo_url ?? null,
    bio: mp.bio ?? "",
    specialty: mp.specialty ?? "",
    modality: (mp.modality as Modality | null) ?? null,
    modalityText: mp.modality_text ?? "",
    yearsExperience: mp.years_experience,
    chips: mp.chips ?? [],
    availableDays: (mp.available_days as boolean[] | null) ?? Array(7).fill(false),
    athleteCount: countById.get(mp.coach_id) ?? 0,
    visible: true,
    minPrice: parsePrice(programsByCoach.get(mp.coach_id) ?? null),
    programCount: programCountByCoach.get(mp.coach_id) ?? 0,
  }));
}

/** Public: only programs this coach marked visible in the marketplace. */
export async function fetchCoachMarketplacePrograms(coachId: string): Promise<MarketplaceProgram[]> {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("coach_id", coachId)
    .eq("visible_marketplace", true)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id, name: p.name, description: p.description ?? "", weeks: p.weeks,
    level: p.level as ProgramLevel | null, price: p.price, paymentType: p.payment_type as PaymentType | null,
    visible: p.visible_marketplace,
    sport: (p as { sport?: string | null }).sport ?? null, coverUrl: (p as { cover_url?: string | null }).cover_url ?? null,
    currency: (p as { currency?: string | null }).currency ?? null,
  }));
}

// --- Owner-only (coach editing their own public profile) ---

export type CoachMarketplaceProfileInput = {
  bio: string; specialty: string; modality: Modality; modalityText: string;
  yearsExperience: number | null; chips: string[]; availableDays: boolean[]; visible: boolean;
  photoUrl?: string | null;
};

export async function upsertCoachMarketplaceProfile(coachId: string, input: CoachMarketplaceProfileInput) {
  const { error } = await supabase.from("coach_marketplace_profiles").upsert({
    coach_id: coachId,
    bio: input.bio || null,
    specialty: input.specialty || null,
    modality: input.modality,
    modality_text: input.modalityText || null,
    years_experience: input.yearsExperience,
    chips: input.chips,
    available_days: input.availableDays,
    visible: input.visible,
    ...(input.photoUrl !== undefined ? { photo_url: input.photoUrl } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: "coach_id" });
  if (error) throw error;
}

/** Owner-only: all of the coach's real programs, regardless of marketplace visibility. */
export async function fetchMyMarketplacePrograms(coachId: string): Promise<MarketplaceProgram[]> {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id, name: p.name, description: p.description ?? "", weeks: p.weeks,
    level: p.level as ProgramLevel | null, price: p.price, paymentType: p.payment_type as PaymentType | null,
    visible: p.visible_marketplace,
    sport: (p as { sport?: string | null }).sport ?? null, coverUrl: (p as { cover_url?: string | null }).cover_url ?? null,
    currency: (p as { currency?: string | null }).currency ?? null,
  }));
}

export async function updateProgramMarketplace(
  programId: string,
  patch: { level: ProgramLevel | null; price: string | null; paymentType: PaymentType | null; visible: boolean },
) {
  const { error } = await supabase
    .from("programs")
    .update({ level: patch.level, price: patch.price, payment_type: patch.paymentType, visible_marketplace: patch.visible })
    .eq("id", programId);
  if (error) throw error;
}

// --- Programs catalog (across all public coaches) ---

export type PublicProgramSummary = MarketplaceProgram & { coachId: string; coachName: string };

/** All marketplace-visible programs from coaches who also published a visible profile. */
export async function fetchPublicPrograms(): Promise<PublicProgramSummary[]> {
  const { data: mps } = await supabase.from("coach_marketplace_profiles").select("coach_id").eq("visible", true);
  const coachIds = (mps ?? []).map((m) => m.coach_id as string);
  if (coachIds.length === 0) return [];
  const [{ data: programs }, { data: profiles }] = await Promise.all([
    supabase.from("programs").select("*")
      .eq("visible_marketplace", true).in("coach_id", coachIds).order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, full_name").in("id", coachIds),
  ]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Coach"]));
  return (programs ?? []).map((p) => ({
    id: p.id, name: p.name, description: p.description ?? "", weeks: p.weeks,
    level: p.level as ProgramLevel | null, price: p.price, paymentType: p.payment_type as PaymentType | null,
    visible: p.visible_marketplace, coachId: p.coach_id, coachName: nameById.get(p.coach_id) ?? "Coach",
    sport: (p as { sport?: string | null }).sport ?? null, coverUrl: (p as { cover_url?: string | null }).cover_url ?? null,
    currency: (p as { currency?: string | null }).currency ?? null,
  }));
}

/** What the Lab's "Publicar en marketplace" needs: the program's current listing and whether the coach's profile is public. */
export async function fetchProgramPublishState(programId: string, coachId: string) {
  const [{ data: p, error }, { data: mp }] = await Promise.all([
    supabase.from("programs").select("*").eq("id", programId).maybeSingle(),
    supabase.from("coach_marketplace_profiles").select("visible").eq("coach_id", coachId).maybeSingle(),
  ]);
  if (error) throw error;
  const row = (p ?? {}) as {
    name?: string; level?: ProgramLevel | null; price?: string | null; visible_marketplace?: boolean;
    sport?: string | null; cover_url?: string | null; currency?: string | null;
  };
  return {
    name: row.name ?? "",
    level: row.level ?? null,
    price: row.price ?? null,
    visible: Boolean(row.visible_marketplace),
    sport: row.sport ?? null,
    coverUrl: row.cover_url ?? null,
    currency: row.currency ?? null,
    profileVisible: Boolean(mp?.visible),
  };
}

export type ProgramListing = {
  name: string;
  level: ProgramLevel;
  price: string | null;
  sport: string | null;
  coverUrl: string | null;
  currency: string;
  visible: boolean;
};

/**
 * Saves the marketplace listing from the Lab: name, level, price, sport and cover, and publishes or hides it
 * (status follows: "Publicado" / "En progreso"). Returns false when the sport/cover/currency columns don't exist yet
 * (migration 0048 pending): the rest is still saved.
 */
export async function saveProgramListing(programId: string, l: ProgramListing): Promise<boolean> {
  const base = {
    name: l.name,
    level: l.level,
    price: l.price,
    payment_type: "unico",
    visible_marketplace: l.visible,
    status: l.visible ? "Publicado" : "En progreso",
  };
  const { error } = await supabase.from("programs").update({ ...base, sport: l.sport, cover_url: l.coverUrl, currency: l.currency }).eq("id", programId);
  if (!error) return true;
  const missingColumn = error.code === "PGRST204" || error.code === "42703" || /column/i.test(error.message);
  if (!missingColumn) throw error;
  const { error: retry } = await supabase.from("programs").update(base).eq("id", programId);
  if (retry) throw retry;
  return false;
}

/** Makes the coach's marketplace profile public (creating it if needed). */
export async function publishMyMarketplaceProfile(coachId: string) {
  const { error } = await supabase
    .from("coach_marketplace_profiles")
    .upsert({ coach_id: coachId, visible: true, updated_at: new Date().toISOString() }, { onConflict: "coach_id" });
  if (error) throw error;
}
