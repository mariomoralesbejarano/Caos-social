import { getSupabase, ROOMS_TABLE } from "./supabase";
import type { Room } from "./types";
import type { GameResult } from "./game";

interface RoomRow {
  code: string;
  state: Room;
  version: number;
  updated_at: string;
}

const TTL_MS = 48 * 60 * 60 * 1000;

export async function loadRoom(code: string): Promise<Room | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(ROOMS_TABLE)
    .select("code, state, version")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) {
    if ((error as any).code === "PGRST116") return null;
    throw error;
  }
  if (!data) return null;
  return (data as RoomRow).state;
}

export async function insertRoom(room: Room): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from(ROOMS_TABLE).insert({
    code: room.code,
    state: room as unknown,
    version: room.version,
  });
  if (error) throw error;
}

export async function existsRoom(code: string): Promise<boolean> {
  const sb = getSupabase();
  const { data } = await sb
    .from(ROOMS_TABLE)
    .select("code")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return !!data;
}

/**
 * Optimistic-concurrency mutation: read state, apply fn, write back guarded by version.
 * Retries up to 5 times on conflict.
 */
export async function mutateRoom<T>(
  code: string,
  fn: (room: Room) => GameResult<T>,
): Promise<T | { error: string }> {
  const sb = getSupabase();
  const upper = code.toUpperCase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await sb
      .from(ROOMS_TABLE)
      .select("state, version")
      .eq("code", upper)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { error: "Sala no encontrada" };
    const expectedVersion = (data as any).version as number;
    const room = (data as any).state as Room;

    // Deep-clone to avoid mutating cached object
    const clone: Room = JSON.parse(JSON.stringify(room));
    const result = fn(clone);
    if (result && typeof result === "object" && "error" in (result as any)) {
      return result as { error: string };
    }
    // Determine the room object to persist
    let newRoom: Room = clone;
    if (result && typeof result === "object" && "room" in (result as any)) {
      newRoom = (result as any).room as Room;
    }

    const { data: upd, error: updErr } = await sb
      .from(ROOMS_TABLE)
      .update({
        state: newRoom as unknown,
        version: newRoom.version,
        updated_at: new Date().toISOString(),
      })
      .eq("code", upper)
      .eq("version", expectedVersion)
      .select("code");
    if (updErr) throw updErr;
    if (upd && upd.length > 0) {
      return result as T;
    }
    // version conflict, retry
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  }
  return { error: "Conflicto de concurrencia. Intenta de nuevo." };
}

/** Fire-and-forget garbage collection of inactive rooms (>48h). Best-effort. */
export async function gcRooms(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - TTL_MS).toISOString();
    const sb = getSupabase();
    await sb.from(ROOMS_TABLE).delete().lt("updated_at", cutoff);
  } catch {
    // ignore
  }
}
