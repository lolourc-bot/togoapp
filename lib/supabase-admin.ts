import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

let _admin: SupabaseClient | null = null;

/** Server-only. Never import from components/ or any client-rendered code path. */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) throw new Error("Faltan env vars de service-role de Supabase");
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  });
  return _admin;
}
