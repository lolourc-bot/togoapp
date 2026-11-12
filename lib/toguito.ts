import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";

export type ToguitoMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Sos Toguito, el lobo asistente de TOGO (una plataforma de coaching deportivo). Ayudás a coaches con dudas administrativas y de uso de la plataforma: cómo cobrar o facturar a sus atletas, cómo armar programas y sesiones, cómo usar la biblioteca de ejercicios, cómo invitar atletas, planes y suscripción, notificaciones, etc.

Respondé siempre en español rioplatense, de forma breve, cálida y directa — sos un lobo simpático, no un bot formal. Si no sabés algo específico de la cuenta de ese coach (sus datos, sus atletas, su facturación puntual), decilo con honestidad y sugerí dónde puede encontrarlo en la app, en vez de inventar una respuesta.`;

export const askToguito = createServerFn({ method: "POST" })
  .validator((data: { messages: ToguitoMessage[] }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) {
      return { text: "Toguito todavía no está conectado (falta configurar la API key). Avisale a soporte." };
    }
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: data.messages,
      });
      const block = response.content.find((b) => b.type === "text");
      return { text: block && block.type === "text" ? block.text : "No tengo una respuesta para eso ahora mismo." };
    } catch {
      return { text: "Tuve un problema para responder. Probá de nuevo en un momento." };
    }
  });
