import { createFileRoute } from "@tanstack/react-router";
import { findAthleteByStravaId, fetchStravaActivity, getValidStravaAccessToken, matchStravaActivityToSession } from "@/lib/strava";

export const Route = createFileRoute("/api/strava-webhook")({
  server: {
    handlers: {
      // Strava valida la suscripción con un GET antes de empezar a mandar eventos.
      GET: async (ctx) => {
        const url = new URL(ctx.request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode === "subscribe" && token === process.env["STRAVA_WEBHOOK_VERIFY_TOKEN"] && challenge) {
          return new Response(JSON.stringify({ "hub.challenge": challenge }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("forbidden", { status: 403 });
      },
      POST: async (ctx) => {
        let payload: { object_type?: string; object_id?: number; aspect_type?: string; owner_id?: number };
        try {
          payload = await ctx.request.json();
        } catch {
          return new Response("bad payload", { status: 400 });
        }

        // Respondemos 200 ya mismo (Strava espera 2xx rápido) y seguimos procesando igual —
        // no hay nada más abajo que el cliente de Strava necesite esperar.
        if (payload.object_type === "activity" && (payload.aspect_type === "create" || payload.aspect_type === "update") && payload.owner_id && payload.object_id) {
          try {
            const athleteId = await findAthleteByStravaId(payload.owner_id);
            if (athleteId) {
              const accessToken = await getValidStravaAccessToken(athleteId);
              if (accessToken) {
                const activity = await fetchStravaActivity(accessToken, payload.object_id);
                await matchStravaActivityToSession(athleteId, activity);
              }
            }
          } catch {
            // No reintenta — si falla, el coach/atleta pueden ver la actividad real en Strava
            // igual; esto solo deja de reflejarse automáticamente en TOGO esta vez.
          }
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
