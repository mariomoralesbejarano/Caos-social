import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Hardcoded para que el deploy en Vercel funcione sin variables de entorno.
// La anon key es PÚBLICA por diseño (RLS abierto + códigos de sala aleatorios).
export const SUPABASE_URL = "https://wmmxnplssfwycnsdtqqm.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_qaBCK0R9fozRStG_dTksDw_S7CkvrZd";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return client;
}

export const ROOMS_TABLE = "caos_rooms";
