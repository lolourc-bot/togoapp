import Stripe from "stripe";
import { toStripeTiersArray } from "@/lib/billing-pricing";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY no configurada");
  _stripe = new Stripe(key, { apiVersion: "2026-09-30.endive" });
  return _stripe;
}

const PRICE_LOOKUP_KEY = "togo-coach-tiered-v1";
let _cachedPriceId: string | null = null;

/** Idempotente: busca el Price tiered por lookup_key, lo crea si no existe. */
export async function getOrCreateCoachTieredPrice(): Promise<string> {
  if (_cachedPriceId) return _cachedPriceId;
  const stripe = getStripeClient();
  const existing = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], limit: 1 });
  if (existing.data[0]) {
    _cachedPriceId = existing.data[0].id;
    return _cachedPriceId;
  }
  const product = await stripe.products.create({ name: "TOGO — Suscripción de coach" });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    recurring: { interval: "month" },
    billing_scheme: "tiered",
    tiers_mode: "volume",
    tiers: toStripeTiersArray(),
    lookup_key: PRICE_LOOKUP_KEY,
  });
  _cachedPriceId = price.id;
  return _cachedPriceId;
}
