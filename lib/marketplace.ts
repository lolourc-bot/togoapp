import { supabase } from "@/lib/supabase";

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
};

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
  if (!s) return null;
  const n = Number(s.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
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
    .select("id, name, description, weeks, level, price, payment_type, visible_marketplace")
    .eq("coach_id", coachId)
    .eq("visible_marketplace", true)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id, name: p.name, description: p.description ?? "", weeks: p.weeks,
    level: p.level as ProgramLevel | null, price: p.price, paymentType: p.payment_type as PaymentType | null,
    visible: p.visible_marketplace,
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
    .select("id, name, description, weeks, level, price, payment_type, visible_marketplace")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id, name: p.name, description: p.description ?? "", weeks: p.weeks,
    level: p.level as ProgramLevel | null, price: p.price, paymentType: p.payment_type as PaymentType | null,
    visible: p.visible_marketplace,
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
    supabase.from("programs").select("id, name, description, weeks, level, price, payment_type, visible_marketplace, coach_id")
      .eq("visible_marketplace", true).in("coach_id", coachIds).order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, full_name").in("id", coachIds),
  ]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Coach"]));
  return (programs ?? []).map((p) => ({
    id: p.id, name: p.name, description: p.description ?? "", weeks: p.weeks,
    level: p.level as ProgramLevel | null, price: p.price, paymentType: p.payment_type as PaymentType | null,
    visible: p.visible_marketplace, coachId: p.coach_id, coachName: nameById.get(p.coach_id) ?? "Coach",
  }));
}
