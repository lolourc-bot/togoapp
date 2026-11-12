export type TierKey =
  | "free" | "tier_4_20" | "tier_21_35" | "tier_36_50"
  | "tier_51_75" | "tier_76_100" | "tier_101_plus";

export interface PricingTier {
  key: TierKey;
  minAthletes: number;
  maxAthletes: number | null; // null = sin tope (101+)
  flatPriceUsd: number | null;
  perAthleteUsd: number | null;  // 0.45 solo en tier_101_plus
  flatPriceArs: number | null;   // precio fijo ARS (no convertido)
  perAthleteArs: number | null;  // 675 solo en tier_101_plus
}

export const PRICING_TIERS: PricingTier[] = [
  { key: "free",          minAthletes: 1,   maxAthletes: 3,    flatPriceUsd: 0,  perAthleteUsd: null, flatPriceArs: 0,     perAthleteArs: null },
  { key: "tier_4_20",     minAthletes: 4,   maxAthletes: 20,   flatPriceUsd: 20, perAthleteUsd: null, flatPriceArs: 30000, perAthleteArs: null },
  { key: "tier_21_35",    minAthletes: 21,  maxAthletes: 35,   flatPriceUsd: 25, perAthleteUsd: null, flatPriceArs: 37500, perAthleteArs: null },
  { key: "tier_36_50",    minAthletes: 36,  maxAthletes: 50,   flatPriceUsd: 30, perAthleteUsd: null, flatPriceArs: 45000, perAthleteArs: null },
  { key: "tier_51_75",    minAthletes: 51,  maxAthletes: 75,   flatPriceUsd: 40, perAthleteUsd: null, flatPriceArs: 60000, perAthleteArs: null },
  { key: "tier_76_100",   minAthletes: 76,  maxAthletes: 100,  flatPriceUsd: 50, perAthleteUsd: null, flatPriceArs: 75000, perAthleteArs: null },
  { key: "tier_101_plus", minAthletes: 101, maxAthletes: null, flatPriceUsd: null, perAthleteUsd: 0.45, flatPriceArs: null, perAthleteArs: 675 },
];

export function resolveTier(athleteCount: number): PricingTier {
  const count = Math.max(athleteCount, 0);
  return (
    PRICING_TIERS.find((t) => count >= t.minAthletes && (t.maxAthletes === null || count <= t.maxAthletes)) ??
    PRICING_TIERS[0]!
  );
}

export function tierByKey(key: string): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.key === key);
}

/**
 * El coach elige libremente cualquier tramo (puede pagar de más a propósito). El resync por
 * uso real solo sube de tramo si el uso actual lo exige — nunca baja por debajo del elegido.
 */
export function effectiveTier(athleteCount: number, selectedTierKey: string | null | undefined): PricingTier {
  const live = resolveTier(athleteCount);
  const selected = selectedTierKey ? tierByKey(selectedTierKey) : undefined;
  if (!selected) return live;
  const liveIdx = PRICING_TIERS.indexOf(live);
  const selectedIdx = PRICING_TIERS.indexOf(selected);
  return PRICING_TIERS[Math.max(liveIdx, selectedIdx)]!;
}

/** Cantidad a reportarle a Stripe para facturar el tramo efectivo (nunca por debajo del uso real). */
export function billingQuantity(athleteCount: number, selectedTierKey: string | null | undefined): number {
  const tier = effectiveTier(athleteCount, selectedTierKey);
  return Math.max(athleteCount, tier.minAthletes);
}

export function monthlyPriceUsd(athleteCount: number): number {
  const tier = resolveTier(athleteCount);
  if (tier.flatPriceUsd !== null) return tier.flatPriceUsd;
  return Number((tier.perAthleteUsd! * athleteCount).toFixed(2));
}

export function monthlyPriceArs(athleteCount: number): number {
  const tier = resolveTier(athleteCount);
  if (tier.flatPriceArs !== null) return tier.flatPriceArs;
  return Math.round(tier.perAthleteArs! * athleteCount);
}

/** Shape exacto que espera Stripe: billing_scheme "tiered" + tiers_mode "volume". */
export function toStripeTiersArray(): { up_to: number | "inf"; flat_amount?: number; unit_amount?: number }[] {
  return PRICING_TIERS.map((t, i) => {
    const isLast = i === PRICING_TIERS.length - 1;
    return {
      up_to: isLast ? ("inf" as const) : t.maxAthletes!,
      ...(t.flatPriceUsd !== null ? { flat_amount: Math.round(t.flatPriceUsd * 100) } : {}),
      ...(t.perAthleteUsd !== null ? { unit_amount: Math.round(t.perAthleteUsd * 100) } : {}),
    };
  });
}
