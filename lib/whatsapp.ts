import { createServerFn } from "@tanstack/react-start";

/**
 * Un solo número de WhatsApp Business de TOGO (no por institución) — manda notificaciones
 * a socios/entrenadores de cualquier institución. Credenciales a nivel de app, en .env.
 */
function getWhatsAppConfig() {
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const accessToken = process.env["WHATSAPP_ACCESS_TOKEN"];
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

export const fetchWhatsAppStatus = createServerFn({ method: "POST" }).handler(async (): Promise<{ connected: boolean }> => {
  return { connected: getWhatsAppConfig() !== null };
});

/**
 * Mensaje de texto libre — solo funciona si la persona te escribió en las últimas 24hs
 * (ventana de "customer service" de WhatsApp). Fuera de esa ventana, Meta rechaza el envío
 * y hay que usar sendWhatsAppTemplate en su lugar.
 */
export async function sendWhatsAppTextMessage(toPhoneE164: string, body: string): Promise<void> {
  const config = getWhatsAppConfig();
  if (!config) throw new Error("WhatsApp no está configurado");
  const resp = await fetch(`https://graph.facebook.com/v23.0/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhoneE164.replace(/[^0-9]/g, ""),
      type: "text",
      text: { body },
    }),
  });
  if (!resp.ok) throw new Error(`WhatsApp rechazó el mensaje: ${await resp.text()}`);
}

/** Mensaje con plantilla aprobada — el único tipo permitido para iniciar una conversación. */
export async function sendWhatsAppTemplate(
  toPhoneE164: string,
  templateName: string,
  languageCode: string,
  components?: unknown[],
): Promise<void> {
  const config = getWhatsAppConfig();
  if (!config) throw new Error("WhatsApp no está configurado");
  const resp = await fetch(`https://graph.facebook.com/v23.0/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhoneE164.replace(/[^0-9]/g, ""),
      type: "template",
      template: { name: templateName, language: { code: languageCode }, ...(components ? { components } : {}) },
    }),
  });
  if (!resp.ok) throw new Error(`WhatsApp rechazó el mensaje: ${await resp.text()}`);
}

/** Prueba de punta a punta usando la plantilla "hello_world" que Meta aprueba automáticamente. */
export const sendTestWhatsAppMessage = createServerFn({ method: "POST" })
  .validator((data: { toPhoneE164: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    await sendWhatsAppTemplate(data.toPhoneE164, "hello_world", "en_US");
  });
