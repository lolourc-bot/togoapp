import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const Route = createFileRoute("/api/mp-oauth-callback")({
  server: {
    handlers: {
      GET: async (ctx) => {
        const url = new URL(ctx.request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const appUrl = process.env["APP_URL"];

        // state viene prefijado ("coach:<id>" o "inst:<id>") para que un mismo redirect_uri
        // registrado en MP sirva tanto para el onboarding de marketplace del coach como para
        // el de Caja de la institución.
        const [kind, entityId] = state?.split(":") ?? [];
        if (!code || !entityId || (kind !== "coach" && kind !== "inst")) {
          return Response.redirect(`${appUrl}/configuracion?tab=Pagos&mp=error`, 302);
        }

        const resp = await fetch("https://api.mercadopago.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: process.env["MERCADOPAGO_CLIENT_ID"],
            client_secret: process.env["MERCADOPAGO_CLIENT_SECRET"],
            grant_type: "authorization_code",
            code,
            redirect_uri: `${appUrl}/api/mp-oauth-callback`,
          }),
        });
        const redirectBase = kind === "coach" ? `${appUrl}/configuracion?tab=Pagos` : `${appUrl}/institucion?tab=Configuraci%C3%B3n&section=Caja`;
        if (!resp.ok) return Response.redirect(`${redirectBase}&mp=error`, 302);
        const tok = await resp.json();

        const payload = {
          processor: "mercadopago",
          status: "active",
          mp_user_id: String(tok.user_id),
          mp_access_token: tok.access_token,
          mp_refresh_token: tok.refresh_token,
          mp_public_key: tok.public_key,
          mp_token_expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (kind === "coach") {
          await getSupabaseAdmin().from("coach_payment_accounts").upsert({ coach_id: entityId, ...payload }, { onConflict: "coach_id" });
        } else {
          await getSupabaseAdmin().from("institution_payment_accounts").upsert({ institution_id: entityId, ...payload }, { onConflict: "institution_id" });
        }
        return Response.redirect(`${redirectBase}&mp=connected`, 302);
      },
    },
  },
});
