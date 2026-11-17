/**
 * Marketplace program prices. The amount is stored as a plain number string ("8500", "24.99") plus a currency code;
 * older rows may hold free text like "$8.500", which parsePriceInput still understands.
 */

export const PROGRAM_CURRENCIES = [
  { code: "ARS", label: "Pesos argentinos (ARS)", note: "Se cobra con Mercado Pago" },
  { code: "USD", label: "Dólares (USD)", note: "Se cobra con Stripe" },
  { code: "EUR", label: "Euros (EUR)", note: "Se cobra con Stripe" },
] as const;
export type ProgramCurrency = (typeof PROGRAM_CURRENCIES)[number]["code"];

export const isProgramCurrency = (c: unknown): c is ProgramCurrency =>
  PROGRAM_CURRENCIES.some((x) => x.code === c);

/**
 * Reads a price the way people type it in Argentina: "8.500" → 8500, "8.500,50" → 8500.5, "$ 12000" → 12000,
 * "24.99" → 24.99. Returns 0 when there's no usable number.
 */
export function parsePriceInput(raw: string | null | undefined): number {
  if (!raw) return 0;
  let s = String(raw).replace(/[^\d.,]/g, "");
  if (!s) return 0;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = s.split(".");
    // Dots as thousands separators ("8.500", "1.250.000") vs. a decimal point ("24.99").
    if (parts.length > 2 || (parts.length === 2 && parts[1]!.length === 3)) s = parts.join("");
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

/** "$ 8.500", "US$ 25", "€ 19,90". Falls back to `empty` when there's no price. */
export function formatProgramPrice(price: string | null | undefined, currency: string | null | undefined, empty = "Sin precio"): string {
  const n = parsePriceInput(price);
  if (!n) return empty;
  const code = isProgramCurrency(currency) ? currency : "ARS";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: code,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n).replace("EUR", "€");
}
