export type InstitutionTierKey = "tier_1" | "tier_2" | "tier_3" | "tier_4";

export interface InstitutionPricingTier {
  key: InstitutionTierKey;
  monthlyPriceUsd: number;
  monthlyPriceArs: number;
  clubMinMembers: number;
  clubMaxMembers: number | null; // null = sin tope
  gymMinMembers: number;
  gymMaxMembers: number | null;
  gymMaxCoaches: number | null; // null = ilimitado
}

export const INSTITUTION_PRICING_TIERS: InstitutionPricingTier[] = [
  { key: "tier_1", monthlyPriceUsd: 70,  monthlyPriceArs: 105000, clubMinMembers: 0,   clubMaxMembers: 100,  gymMinMembers: 0,   gymMaxMembers: 75,   gymMaxCoaches: 3 },
  { key: "tier_2", monthlyPriceUsd: 110, monthlyPriceArs: 165000, clubMinMembers: 101, clubMaxMembers: 250,  gymMinMembers: 76,  gymMaxMembers: 150,  gymMaxCoaches: 8 },
  { key: "tier_3", monthlyPriceUsd: 150, monthlyPriceArs: 225000, clubMinMembers: 251, clubMaxMembers: 500,  gymMinMembers: 151, gymMaxMembers: 300,  gymMaxCoaches: 15 },
  { key: "tier_4", monthlyPriceUsd: 200, monthlyPriceArs: 300000, clubMinMembers: 501, clubMaxMembers: null, gymMinMembers: 301, gymMaxMembers: null, gymMaxCoaches: null },
];

/**
 * Club: solo importa la cantidad de miembros (entrenadores ilimitados siempre).
 * Gym: el tramo es el mayor entre el que exige la cantidad de socios y el que exige la
 * cantidad de entrenadores (cada tramo tiene un tope de coaches además del de socios).
 */
export function resolveInstitutionTier(mode: "club" | "gym", memberCount: number, coachCount: number): InstitutionPricingTier {
  const last = INSTITUTION_PRICING_TIERS[INSTITUTION_PRICING_TIERS.length - 1]!;
  if (mode === "club") {
    return INSTITUTION_PRICING_TIERS.find((t) => memberCount >= t.clubMinMembers && (t.clubMaxMembers === null || memberCount <= t.clubMaxMembers)) ?? last;
  }
  const byMembers = INSTITUTION_PRICING_TIERS.find((t) => memberCount >= t.gymMinMembers && (t.gymMaxMembers === null || memberCount <= t.gymMaxMembers)) ?? last;
  const byCoaches = INSTITUTION_PRICING_TIERS.find((t) => t.gymMaxCoaches === null || coachCount <= t.gymMaxCoaches) ?? last;
  const byMembersIdx = INSTITUTION_PRICING_TIERS.indexOf(byMembers);
  const byCoachesIdx = INSTITUTION_PRICING_TIERS.indexOf(byCoaches);
  return INSTITUTION_PRICING_TIERS[Math.max(byMembersIdx, byCoachesIdx)]!;
}

export function institutionTierByKey(key: string): InstitutionPricingTier | undefined {
  return INSTITUTION_PRICING_TIERS.find((t) => t.key === key);
}

/**
 * La institución elige libremente cualquier tramo (puede pagar de más a propósito). El
 * resync por uso real solo sube de tramo si el uso actual lo exige — nunca baja del elegido.
 */
export function effectiveInstitutionTier(
  mode: "club" | "gym", memberCount: number, coachCount: number, selectedTierKey: string | null | undefined,
): InstitutionPricingTier {
  const live = resolveInstitutionTier(mode, memberCount, coachCount);
  const selected = selectedTierKey ? institutionTierByKey(selectedTierKey) : undefined;
  if (!selected) return live;
  const liveIdx = INSTITUTION_PRICING_TIERS.indexOf(live);
  const selectedIdx = INSTITUTION_PRICING_TIERS.indexOf(selected);
  return INSTITUTION_PRICING_TIERS[Math.max(liveIdx, selectedIdx)]!;
}
