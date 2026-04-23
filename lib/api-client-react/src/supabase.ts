import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";

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

// =====================================================
// Realtime Broadcast: canal por sala para eventos instantáneos
// (PANICO, VOTO, PUSH, ROOM_UPDATED…). No depende de la BBDD.
// =====================================================

interface RoomChannel {
  channel: RealtimeChannel;
  ready: Promise<void>;
}

const channels = new Map<string, RoomChannel>();

function channelName(code: string): string {
  return `room-bcast:${code.toUpperCase()}`;
}

/**
 * Devuelve (o crea) un canal de broadcast singleton para una sala.
 * El canal se mantiene vivo mientras la app esté abierta.
 */
export function getRoomChannel(code: string): RoomChannel {
  const key = channelName(code);
  const existing = channels.get(key);
  if (existing) return existing;
  const sb = getSupabase();
  const channel = sb.channel(key, {
    config: { broadcast: { self: true, ack: false } },
  });
  const ready = new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  const entry: RoomChannel = { channel, ready };
  channels.set(key, entry);
  return entry;
}

export type RoomBroadcastEvent =
  | "ROOM_UPDATED"
  | "PANICO"
  | "VOTO"
  | "VERIFICACION"
  | "PUSH";

/**
 * Envía un evento broadcast a TODOS los clientes suscritos a la sala.
 * Latencia típica: <100ms. Equivalente a:
 *   channel.send({ type: 'broadcast', event, payload })
 */
export async function broadcastRoomEvent(
  code: string,
  event: RoomBroadcastEvent,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { channel, ready } = getRoomChannel(code);
    await ready;
    await channel.send({ type: "broadcast", event, payload });
  } catch {
    // best-effort: la BBDD ya tiene el cambio persistido
  }
}
