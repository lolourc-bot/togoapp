import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SCOPE = "https://www.googleapis.com/auth/calendar";

export const startGoogleCalendarOAuth = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }) => {
    const clientId = process.env["GOOGLE_CLIENT_ID"];
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID no configurada");
    const redirectUri = `${process.env["APP_URL"]}/api/google-oauth-callback`;
    const params = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: "code",
      scope: SCOPE, access_type: "offline", prompt: "consent", state: data.institutionId,
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  });

export type IntegrationsStatus = { googleConnected: boolean; whatsappConnected: boolean };

export const fetchInstitutionIntegrationsStatus = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }): Promise<IntegrationsStatus> => {
    const admin = getSupabaseAdmin();
    const { data: row } = await admin
      .from("institution_integrations")
      .select("google_connected_at, whatsapp_connected_at")
      .eq("institution_id", data.institutionId)
      .maybeSingle();
    return { googleConnected: !!row?.["google_connected_at"], whatsappConnected: !!row?.["whatsapp_connected_at"] };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    await admin.from("institution_integrations").update({
      google_access_token: null, google_refresh_token: null, google_token_expires_at: null,
      google_calendar_id: null, google_connected_at: null, updated_at: new Date().toISOString(),
    }).eq("institution_id", data.institutionId);
  });

async function getValidGoogleAccessToken(institutionId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data: row } = await admin
    .from("institution_integrations")
    .select("google_access_token, google_refresh_token, google_token_expires_at")
    .eq("institution_id", institutionId)
    .maybeSingle();
  if (!row?.["google_refresh_token"]) return null;

  const expiresAt = row["google_token_expires_at"] ? new Date(row["google_token_expires_at"] as string).getTime() : 0;
  if (row["google_access_token"] && expiresAt > Date.now() + 60_000) return row["google_access_token"] as string;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env["GOOGLE_CLIENT_ID"]!,
      client_secret: process.env["GOOGLE_CLIENT_SECRET"]!,
      refresh_token: row["google_refresh_token"] as string,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) return null;
  const tok = await resp.json();
  await admin.from("institution_integrations").update({
    google_access_token: tok.access_token,
    google_token_expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("institution_id", institutionId);
  return tok.access_token as string;
}

async function upsertGoogleEvent(
  institutionId: string,
  opts: { eventId: string | null; summary: string; description: string; location: string | null; startISO: string; endISO: string },
): Promise<string | null> {
  const accessToken = await getValidGoogleAccessToken(institutionId);
  if (!accessToken) return null;
  const admin = getSupabaseAdmin();
  const { data: row } = await admin.from("institution_integrations").select("google_calendar_id").eq("institution_id", institutionId).maybeSingle();
  const calendarId = (row?.["google_calendar_id"] as string | undefined) ?? "primary";

  const body = {
    summary: opts.summary,
    description: opts.description,
    ...(opts.location ? { location: opts.location } : {}),
    start: { dateTime: opts.startISO, timeZone: "America/Argentina/Buenos_Aires" },
    end: { dateTime: opts.endISO, timeZone: "America/Argentina/Buenos_Aires" },
  };
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const url = opts.eventId ? `${base}/${opts.eventId}` : base;
  const resp = await fetch(url, {
    method: opts.eventId ? "PUT" : "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  return json.id as string;
}

async function deleteGoogleEvent(institutionId: string, eventId: string): Promise<void> {
  const accessToken = await getValidGoogleAccessToken(institutionId);
  if (!accessToken) return;
  const admin = getSupabaseAdmin();
  const { data: row } = await admin.from("institution_integrations").select("google_calendar_id").eq("institution_id", institutionId).maybeSingle();
  const calendarId = (row?.["google_calendar_id"] as string | undefined) ?? "primary";
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

/** Best-effort: si la institución no conectó Google o falla la llamada, no rompe el guardado de la clase. */
export const syncClassToGoogleCalendar = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; classId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: cls } = await admin.from("institution_classes").select("*").eq("id", data.classId).maybeSingle();
    if (!cls) return;
    const start = new Date(`${cls["class_date"]}T${cls["start_time"]}`);
    const end = new Date(start.getTime() + (cls["duration_minutes"] as number) * 60000);
    const eventId = await upsertGoogleEvent(data.institutionId, {
      eventId: (cls["google_event_id"] as string | null) ?? null,
      summary: cls["name"] as string,
      description: (cls["description"] as string | null) ?? "",
      location: cls["room"] as string | null,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    });
    if (eventId && eventId !== cls["google_event_id"]) {
      await admin.from("institution_classes").update({ google_event_id: eventId }).eq("id", data.classId);
    }
  });

export const deleteClassFromGoogleCalendar = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; classId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: cls } = await admin.from("institution_classes").select("google_event_id").eq("id", data.classId).maybeSingle();
    if (cls?.["google_event_id"]) await deleteGoogleEvent(data.institutionId, cls["google_event_id"] as string);
  });

export const syncPracticeToGoogleCalendar = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; practiceId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: p } = await admin.from("institution_practices").select("*").eq("id", data.practiceId).maybeSingle();
    if (!p) return;
    const start = new Date(`${p["practice_date"]}T${p["start_time"]}`);
    const end = new Date(`${p["practice_date"]}T${p["end_time"]}`);
    const eventId = await upsertGoogleEvent(data.institutionId, {
      eventId: (p["google_event_id"] as string | null) ?? null,
      summary: (p["name"] as string | null) ?? "Práctica",
      description: (p["notes"] as string | null) ?? "",
      location: p["place"] as string | null,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    });
    if (eventId && eventId !== p["google_event_id"]) {
      await admin.from("institution_practices").update({ google_event_id: eventId }).eq("id", data.practiceId);
    }
  });

export const deletePracticeFromGoogleCalendar = createServerFn({ method: "POST" })
  .validator((data: { institutionId: string; practiceId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: p } = await admin.from("institution_practices").select("google_event_id").eq("id", data.practiceId).maybeSingle();
    if (p?.["google_event_id"]) await deleteGoogleEvent(data.institutionId, p["google_event_id"] as string);
  });
