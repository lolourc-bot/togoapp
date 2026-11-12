import { getSupabaseAdmin } from "@/lib/supabase-admin";

const STRAVA_CLIENT_ID = process.env["STRAVA_CLIENT_ID"];
const STRAVA_CLIENT_SECRET = process.env["STRAVA_CLIENT_SECRET"];

export function stravaConfigured(): boolean {
  return !!STRAVA_CLIENT_ID && !!STRAVA_CLIENT_SECRET;
}

/** `state` lleva el athleteId para poder asociar el callback sin depender de cookies. */
export function stravaAuthorizeUrl(appUrl: string, athleteId: string): string {
  const redirectUri = `${appUrl}/api/strava-callback`;
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state: athleteId,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
};

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  return res.json();
}

export async function saveStravaConnection(athleteId: string, tokens: StravaTokenResponse) {
  if (!tokens.athlete?.id) throw new Error("Strava no devolvió el athlete id");
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("athlete_strava_connections").upsert({
    athlete_id: athleteId,
    strava_athlete_id: tokens.athlete.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
  });
  if (error) throw error;
}

/** Token válido para pegarle a la API de Strava a nombre de este atleta — refresca solo si ya venció. */
export async function getValidStravaAccessToken(athleteId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("athlete_strava_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() > Date.now() + 60_000) return data.access_token;
  const refreshed = await refreshStravaToken(data.refresh_token);
  await admin
    .from("athlete_strava_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    })
    .eq("athlete_id", athleteId);
  return refreshed.access_token;
}

export async function findAthleteByStravaId(stravaAthleteId: number): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("athlete_strava_connections")
    .select("athlete_id")
    .eq("strava_athlete_id", stravaAthleteId)
    .maybeSingle();
  return data?.athlete_id ?? null;
}

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  start_date_local: string;
  distance: number; // meters
  moving_time: number; // seconds
  average_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
};

export async function fetchStravaActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`No se pudo traer la actividad de Strava: ${res.status}`);
  return res.json();
}

export async function disconnectStrava(athleteId: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("athlete_strava_connections").delete().eq("athlete_id", athleteId);
  if (error) throw error;
}

/**
 * Busca, para este atleta, una sesión de campo (field) planificada para la fecha de la
 * actividad que todavía no esté marcada como hecha, y le pega los datos reales. Si no hay
 * ninguna sesión planificada ese día, no hace nada — no inventamos una sesión que el coach
 * nunca armó.
 */
export async function matchStravaActivityToSession(athleteId: string, activity: StravaActivity) {
  const admin = getSupabaseAdmin();
  const dateKey = activity.start_date_local.slice(0, 10);
  const { data: sessions } = await admin
    .from("athlete_sessions")
    .select("id, field, status")
    .eq("athlete_id", athleteId)
    .eq("date", dateKey)
    .eq("is_field", true)
    .neq("status", "done");
  const target = (sessions ?? [])[0];
  if (!target) return false;

  const distanceKm = (activity.distance / 1000).toFixed(2);
  const minutes = Math.round(activity.moving_time / 60);
  const realTime = `${Math.floor(activity.moving_time / 60)}:${String(activity.moving_time % 60).padStart(2, "0")}`;
  const field = {
    ...(target.field as Record<string, unknown> ?? {}),
    realDistance: distanceKm,
    realTime,
    ...(activity.average_heartrate ? { hrAvg: String(Math.round(activity.average_heartrate)) } : {}),
    ...(activity.max_heartrate ? { hrMax: String(Math.round(activity.max_heartrate)) } : {}),
  };
  await admin.from("athlete_sessions").update({ field, status: "done", minutes }).eq("id", target.id as string);
  return true;
}
