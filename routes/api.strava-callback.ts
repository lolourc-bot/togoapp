import { createFileRoute } from "@tanstack/react-router";
import { exchangeStravaCode, saveStravaConnection } from "@/lib/strava";

export const Route = createFileRoute("/api/strava-callback")({
  server: {
    handlers: {
      GET: async (ctx) => {
        const url = new URL(ctx.request.url);
        const code = url.searchParams.get("code");
        const athleteId = url.searchParams.get("state");
        const appUrl = process.env["APP_URL"];
        const redirectBase = `${appUrl}/perfil`;

        if (url.searchParams.get("error") || !code || !athleteId) {
          return Response.redirect(`${redirectBase}?strava=error`, 302);
        }
        try {
          const tokens = await exchangeStravaCode(code);
          await saveStravaConnection(athleteId, tokens);
          return Response.redirect(`${redirectBase}?strava=connected`, 302);
        } catch {
          return Response.redirect(`${redirectBase}?strava=error`, 302);
        }
      },
    },
  },
});
