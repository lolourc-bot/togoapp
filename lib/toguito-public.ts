import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import { PRICING_TIERS } from "./billing-pricing";
import { INSTITUTION_PRICING_TIERS } from "./institution-billing-pricing";

/**
 * Toguito for logged-out visitors on the landing: answers questions about what TOGO is, what it does and what
 * it costs. Public endpoint, so the conversation is capped (turns and message length) and replies stay short.
 */

export type PublicToguitoMessage = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 16;
const MAX_CHARS = 800;
/** Written questions a visitor can ask per day, and for all visitors together (protects the API bill). */
const VISITOR_DAILY_LIMIT = 15;
const GLOBAL_DAILY_LIMIT = 1500;

const LIMIT_REACHED =
  "Por hoy ya respondí muchas preguntas 🐺 Si querés seguir, creá tu cuenta gratis con el botón \"Empezar gratis\" y adentro te ayudo con todo.";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Counts one question for this visitor (hashed IP, never stored in clear) and says whether it's within the daily
 * limits. If the counter isn't reachable (e.g. the migration isn't applied yet) it lets the question through.
 */
async function withinDailyLimit(): Promise<boolean> {
  try {
    const { getRequestIP } = await import("@tanstack/react-start/server");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const visitorHash = await sha256(`toguito:${ip}`);
    const { data, error } = await getSupabaseAdmin().rpc("toguito_public_hit", { p_visitor_hash: visitorHash });
    if (error) {
      console.warn("[toguito-public] usage counter unavailable:", error.message);
      return true;
    }
    const row = (Array.isArray(data) ? data[0] : data) as { visitor_today: number; total_today: number } | undefined;
    if (!row) return true;
    return row.visitor_today <= VISITOR_DAILY_LIMIT && row.total_today <= GLOBAL_DAILY_LIMIT;
  } catch (e) {
    console.warn("[toguito-public] usage counter failed:", e);
    return true;
  }
}

const ars = (n: number) => `$${n.toLocaleString("es-AR")}`;

const coachPricing = PRICING_TIERS.map((t) => {
  if (t.flatPriceArs === 0) return `- Hasta ${t.maxAthletes} atletas: gratis para siempre, sin tarjeta.`;
  if (t.maxAthletes === null) return `- Más de ${t.minAthletes - 1} atletas: ${ars(t.perAthleteArs!)} por atleta por mes (USD ${t.perAthleteUsd}).`;
  return `- ${t.minAthletes} a ${t.maxAthletes} atletas: ${ars(t.flatPriceArs!)} por mes (USD ${t.flatPriceUsd}).`;
}).join("\n");

const institutionPricing = INSTITUTION_PRICING_TIERS.map((t) => {
  const club = t.clubMaxMembers === null ? `más de ${t.clubMinMembers - 1} socios` : `hasta ${t.clubMaxMembers} socios`;
  const gym = t.gymMaxMembers === null ? `más de ${t.gymMinMembers - 1} socios` : `hasta ${t.gymMaxMembers} socios y ${t.gymMaxCoaches} entrenadores`;
  return `- ${ars(t.monthlyPriceArs)} por mes (USD ${t.monthlyPriceUsd}): clubes ${club}; gimnasios ${gym}.`;
}).join("\n");

const SYSTEM_PROMPT = `Sos Toguito, el lobo asistente de TOGO. Estás en la página principal de TOGO hablando con visitantes que todavía no tienen cuenta: entrenadores, coaches independientes, clubes y gimnasios que quieren saber si TOGO les sirve.

Qué es TOGO: la plataforma para planificar, seguir y cobrarle a tus atletas, en español.
- Lab de programas: armás semanas enteras arrastrando sesiones a una grilla, duplicás semanas y asignás un programa a muchos atletas. Varias sesiones por día. Sesiones de fuerza y de campo (correr, bici, natación, remo). Superseries y circuitos AMRAP, EMOM y TABATA. Biblioteca de ejercicios con videos.
- App para atletas: cada atleta ve su semana y la sesión del día en el celular, registra series, pesos y repeticiones, mira los videos y le deja comentarios al coach.
- Seguimiento: bienestar diario (sueño, fatiga, dolor, ánimo), control de carga, conexión con Strava y mensajes dentro de TOGO, sin usar WhatsApp.
- Cobros: le cobrás la cuota a tus atletas en pesos con Mercado Pago o en dólares con Stripe.
- Clubes y gimnasios: panel propio con clases, cupos, socios, entrenadores, cuotas y caja.
- Todas las funciones están incluidas en todos los planes. Sin contratos: se cambia de plan o se cancela cuando quieras.

Precios para coaches (según cuántos atletas entrenás):
${coachPricing}

Precios para clubes y gimnasios (entrenadores ilimitados en clubes):
${institutionPricing}

Cómo responder:
- Español rioplatense, cálido y directo, como un lobo simpático. Respuestas cortas: 1 a 4 oraciones, sin títulos ni markdown.
- Si te preguntan algo que no está acá (integraciones puntuales, fechas, descuentos, datos de una cuenta), decí con honestidad que no lo sabés y sugerí crear la cuenta gratis o escribir a soporte desde la app. No inventes funciones ni precios.
- Al hablar de precios, buscá el plan exacto en la lista y decilo en pesos; en dólares solo si te lo piden.
- Cuando tenga sentido, invitá a empezar gratis con el botón "Empezar gratis".
- Si te preguntan algo que no tiene que ver con TOGO o con entrenar atletas, respondé amablemente que solo podés ayudar con TOGO.`;

export const askToguitoPublic = createServerFn({ method: "POST" })
  .validator((data: { messages: PublicToguitoMessage[] }) => {
    const messages = (Array.isArray(data?.messages) ? data.messages : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-MAX_MESSAGES);
    return { messages };
  })
  .handler(async ({ data }) => {
    const { messages } = data;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") return { text: "¿En qué te puedo ayudar?" };
    if (messages.some((m) => m.content.length > MAX_CHARS)) {
      return { text: "Ese mensaje es muy largo para mí 😅 ¿Me lo contás más corto?" };
    }
    // The API needs the conversation to start with the visitor.
    const start = messages.findIndex((m) => m.role === "user");
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) return { text: "Ahora no puedo responder. Probá de nuevo en un rato." };
    if (!(await withinDailyLimit())) return { text: LIMIT_REACHED };
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 1024,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: messages.slice(start),
      });
      if (response.stop_reason === "refusal") return { text: "De eso no puedo hablar, pero de TOGO te cuento lo que quieras." };
      const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      return { text: text || "No tengo una respuesta para eso ahora mismo." };
    } catch {
      return { text: "Tuve un problema para responder. Probá de nuevo en un momento." };
    }
  });
