// Persistencia de tokens push de cada jugador en la tabla `player_tokens`
// de Supabase. Permite que el servidor (o una Edge Function) envíe una
// notificación REAL vía FCM a un jugador concreto incluso con la app
// cerrada o el móvil bloqueado.
//
// La tabla se crea con `db/player_tokens.sql` (ejecútalo una vez en el
// SQL editor de Supabase).

import { getSupabase } from "@workspace/api-client-react";

export type PushPlatform = "android" | "ios" | "web";

const TOKENS_TABLE = "player_tokens";

export interface PlayerTokenRow {
  room_code: string;
  player_id: string;
  token: string;
  platform: PushPlatform;
}

/**
 * Registra (upsert) el token push del jugador para esta sala.
 * Llamarla cada vez que el SDK nativo nos da un token nuevo.
 */
export async function registerPlayerToken(input: PlayerTokenRow): Promise<void> {
  if (!input.token || !input.room_code || !input.player_id) return;
  try {
    const sb = getSupabase();
    await sb
      .from(TOKENS_TABLE)
      .upsert(
        {
          room_code: input.room_code.toUpperCase(),
          player_id: input.player_id,
          token: input.token,
          platform: input.platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "room_code,player_id,platform" },
      );
  } catch (e) {
    // No bloquees el juego si Supabase falla aquí.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[playerTokens] upsert failed", e);
    }
  }
}

/** Devuelve los tokens registrados para un jugador concreto en la sala. */
export async function getPlayerTokens(
  roomCode: string,
  playerId: string,
): Promise<PlayerTokenRow[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from(TOKENS_TABLE)
      .select("room_code, player_id, token, platform")
      .eq("room_code", roomCode.toUpperCase())
      .eq("player_id", playerId);
    if (error) throw error;
    return (data ?? []) as PlayerTokenRow[];
  } catch {
    return [];
  }
}

/** Borra los tokens del jugador (útil al salir de la sala). */
export async function clearPlayerTokens(
  roomCode: string,
  playerId: string,
): Promise<void> {
  try {
    const sb = getSupabase();
    await sb
      .from(TOKENS_TABLE)
      .delete()
      .eq("room_code", roomCode.toUpperCase())
      .eq("player_id", playerId);
  } catch {}
}
