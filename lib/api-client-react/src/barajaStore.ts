// Supabase store for baraja_rooms table.
// Same CAS (optimistic-concurrency) pattern as store.ts.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { BarajaRoom, BGameResult } from "./barajaTypes";

export const BARAJA_TABLE = "baraja_rooms";

// ── Broadcast channels ────────────────────────────────────────────────────────

const _channels = new Map<string, { channel: RealtimeChannel; ready: Promise<void> }>();

export function getBarajaChannel(code: string) {
  const key = `baraja-bcast:${code.toUpperCase()}`;
  const existing = _channels.get(key);
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
  const entry = { channel, ready };
  _channels.set(key, entry);
  return entry;
}

export async function broadcastBarajaEvent(code: string): Promise<void> {
  try {
    const { channel, ready } = getBarajaChannel(code);
    await ready;
    await channel.send({
      type: "broadcast",
      event: "BARAJA_UPDATED",
      payload: { ts: Date.now() },
    });
  } catch {
    // best-effort
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function loadBarajaRoom(code: string): Promise<BarajaRoom | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(BARAJA_TABLE)
    .select("code, state, version")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) {
    if ((error as { code?: string }).code === "PGRST116") return null;
    throw error;
  }
  if (!data) return null;
  return (data as { state: BarajaRoom }).state;
}

export async function insertBarajaRoom(room: BarajaRoom): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from(BARAJA_TABLE).insert({
    code: room.code,
    state: room as unknown,
    version: room.version,
  });
  if (error) throw error;
}

export async function existsBarajaRoom(code: string): Promise<boolean> {
  const sb = getSupabase();
  const { data } = await sb
    .from(BARAJA_TABLE)
    .select("code")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return !!data;
}

/**
 * Optimistic-concurrency mutation: read state, apply fn, write back guarded by version.
 * Retries up to 5 times on conflict.
 */
export async function mutateBarajaRoom<T>(
  code: string,
  fn: (room: BarajaRoom) => BGameResult<T>,
): Promise<T | { error: string }> {
  const sb = getSupabase();
  const upper = code.toUpperCase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await sb
      .from(BARAJA_TABLE)
      .select("state, version")
      .eq("code", upper)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { error: "Sala no encontrada" };
    const expectedVersion = (data as { version: number }).version;
    const room = (data as { state: BarajaRoom }).state;
    const clone: BarajaRoom = JSON.parse(JSON.stringify(room));
    const result = fn(clone);
    if (result && typeof result === "object" && "error" in (result as object)) {
      return result as { error: string };
    }
    let newRoom: BarajaRoom = clone;
    if (result && typeof result === "object" && "room" in (result as object)) {
      newRoom = (result as unknown as { room: BarajaRoom }).room;
    }
    const { data: upd, error: updErr } = await sb
      .from(BARAJA_TABLE)
      .update({
        state: newRoom as unknown,
        version: newRoom.version,
        updated_at: new Date().toISOString(),
      })
      .eq("code", upper)
      .eq("version", expectedVersion)
      .select("code");
    if (updErr) throw updErr;
    if (upd && (upd as unknown[]).length > 0) {
      void broadcastBarajaEvent(upper);
      return result as T;
    }
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  }
  return { error: "Conflicto de concurrencia. Intenta de nuevo." };
}

/** GC rooms older than 48 h. Best-effort. */
export async function gcBarajaRooms(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const sb = getSupabase();
    await sb.from(BARAJA_TABLE).delete().lt("updated_at", cutoff);
  } catch {}
}
