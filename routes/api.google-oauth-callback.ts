import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const Route = createFileRoute("/api/google-oauth-callback")({
  server: {
    handlers: {
      GET: async (ctx) => {
        const url = new URL(ctx.request.url);
        const code = url.searchParams.get("code");
        const institutionId = url.searchParams.get("state");
        const appUrl = process.env["APP_URL"];
        const redirectBase = `${appUrl}/institucion?tab=Configuraci%C3%B3n&section=Integraciones`;

        if (!code || !institutionId) return Response.redirect(`${redirectBase}&google=error`, 302);

        const resp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env["GOOGLE_CLIENT_ID"]!,
            client_secret: process.env["GOOGLE_CLIENT_SECRET"]!,
            code,
            grant_type: "authorization_code",
            redirect_uri: `${appUrl}/api/google-oauth-callback`,
          }),
        });
        if (!resp.ok) return Response.redirect(`${redirectBase}&google=error`, 302);
        const tok = await resp.json();
        // Sin refresh_token no podemos renovar el access_token más adelante — pasa si la
        // institución ya había autorizado antes sin "prompt=consent" (acá siempre lo mandamos,
        // así que no debería faltar, pero por las dudas lo chequeamos).
        if (!tok.refresh_token) return Response.redirect(`${redirectBase}&google=error`, 302);

        await getSupabaseAdmin().from("institution_integrations").upsert(
          {
            institution_id: institutionId,
            google_access_token: tok.access_token,
            google_refresh_token: tok.refresh_token,
            google_token_expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
            google_calendar_id: "primary",
            google_connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "institution_id" },
        );
        return Response.redirect(`${redirectBase}&google=connected`, 302);
      },
    },
  },
});
