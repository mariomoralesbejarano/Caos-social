import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  applyAddCustomCard,
  applyDrawCard,
  applyEndGame,
  applyJoin,
  applyPanicVote,
  applyResetRoom,
  applyRespondToThrow,
  applySetMyTags,
  applyStartGame,
  applyThrowCard,
  applyUsePower,
  createInitialRoom,
  generateCode,
  serializeRoom,
} from "./game";
import {
  existsRoom,
  gcRooms,
  insertRoom,
  loadRoom,
  mutateRoom,
} from "./store";
import { getSupabase, ROOMS_TABLE } from "./supabase";
import type {
  CardTag,
  GameCard,
  PackId,
  RespondAction,
  Room,
  RoomState,
} from "./types";

export * from "./types";
export { ALL_CARDS, PACKS as ALL_PACKS, getCard, getPackCardIds } from "./cards";
export { getSupabase };

// Backwards-compat no-ops
export function setBaseUrl(_url: string): void {}
export type AuthTokenGetter = () => string | null | undefined;
export function setAuthTokenGetter(_g: AuthTokenGetter): void {}

// =====================================================
// Query keys
// =====================================================
export function getGetRoomQueryKey(code: string, params: { playerId: string }) {
  return ["caos-room", code, params.playerId] as const;
}

// =====================================================
// useGetRoom — subscribes to Supabase Realtime for live updates
// =====================================================
export function useGetRoom(
  code: string,
  params: { playerId: string },
  options?: { query?: Partial<UseQueryOptions<RoomState, { status?: number; message?: string }>> },
) {
  const enabled = !!code && !!params.playerId && (options?.query?.enabled ?? true);
  const query = useQuery<RoomState, { status?: number; message?: string }>({
    queryKey: getGetRoomQueryKey(code, params),
    enabled,
    queryFn: async () => {
      const room = await loadRoom(code);
      if (!room) throw { status: 404, message: "Sala no encontrada" };
      return serializeRoom(room, params.playerId);
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 1000,
    retry: false,
    ...(options?.query ?? {}),
  });

  // Realtime subscription
  useEffect(() => {
    if (!enabled) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`room:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: ROOMS_TABLE, filter: `code=eq.${code.toUpperCase()}` },
        (payload) => {
          const newRow = (payload.new as any)?.state as Room | undefined;
          if (newRow) {
            // Hot-swap query data
            (query as any).refetch?.();
          }
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, code]);

  return query;
}

// =====================================================
// Mutation hooks (mimic orval signatures: { data } / { code, data })
// =====================================================

interface MutateOpts {
  data: { name: string; pack?: PackId; packs?: PackId[]; tags?: CardTag[] };
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: async ({ data }: MutateOpts) => {
      // garbage-collect lazily on create
      void gcRooms();
      let code = generateCode();
      let attempts = 0;
      while ((await existsRoom(code)) && attempts < 10) {
        code = generateCode();
        attempts++;
      }
      const { room, playerId } = createInitialRoom({
        code,
        name: data.name,
        pack: data.pack,
        packs: data.packs,
        tags: data.tags,
      });
      await insertRoom(room);
      return { playerId, room: serializeRoom(room, playerId) };
    },
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: async ({
      code,
      data,
    }: {
      code: string;
      data: { name: string; tags?: CardTag[] };
    }) => {
      const result = await mutateRoom(code, (room) => applyJoin(room, data));
      if ("error" in (result as any))
        throw { status: 404, data: result, message: (result as any).error };
      const { room, playerId } = result as { room: Room; playerId: string };
      return { playerId, room: serializeRoom(room, playerId) };
    },
  });
}

function makeSimpleMutation<TBody extends { playerId: string }>(
  apply: (room: Room, body: TBody) => any,
) {
  return () =>
    useMutation({
      mutationFn: async ({ code, data }: { code: string; data: TBody }) => {
        const result = await mutateRoom(code, (room) => apply(room, data));
        if ("error" in (result as any))
          throw { status: 400, data: result, message: (result as any).error };
        return serializeRoom(result as Room, data.playerId);
      },
    });
}

export const useSetMyTags = makeSimpleMutation<{ playerId: string; tags: CardTag[] }>(
  (room, b) => applySetMyTags(room, b.playerId, b.tags),
);

export const useStartGame = makeSimpleMutation<{ playerId: string }>((room, b) =>
  applyStartGame(room, b.playerId),
);

export const useResetRoom = makeSimpleMutation<{ playerId: string }>((room, b) =>
  applyResetRoom(room, b.playerId),
);

export const useEndGame = makeSimpleMutation<{ playerId: string }>((room, b) =>
  applyEndGame(room, b.playerId),
);

export const useThrowCard = makeSimpleMutation<{
  playerId: string;
  toPlayerId: string;
  cardId: string;
}>((room, b) => applyThrowCard(room, b.playerId, b.toPlayerId, b.cardId));

export const useRespondToThrow = makeSimpleMutation<{
  playerId: string;
  throwId: string;
  action: RespondAction;
}>((room, b) => applyRespondToThrow(room, b.playerId, b.throwId, b.action));

export const usePanicVote = makeSimpleMutation<{
  playerId: string;
  throwId: string;
  against: boolean;
}>((room, b) => applyPanicVote(room, b.playerId, b.throwId, b.against));

export const useAddCustomCard = makeSimpleMutation<{
  playerId: string;
  title: string;
  effect: string;
  points: number;
}>((room, b) =>
  applyAddCustomCard(room, b.playerId, {
    title: b.title,
    effect: b.effect,
    points: b.points,
  }),
);

export const useUsePower = makeSimpleMutation<{
  playerId: string;
  cardId: string;
  targetPlayerId?: string;
}>((room, b) => applyUsePower(room, b.playerId, b.cardId, b.targetPlayerId));

export function useDrawCard() {
  return useMutation({
    mutationFn: async ({
      code,
      data,
    }: {
      code: string;
      data: { playerId: string };
    }) => {
      let drawnCard: GameCard | null = null;
      const result = await mutateRoom(code, (room) => {
        const r = applyDrawCard(room, data.playerId);
        if ("error" in (r as any)) return r;
        drawnCard = (r as any).drawnCard;
        return (r as any).room as Room;
      });
      if ("error" in (result as any))
        throw { status: 400, data: result, message: (result as any).error };
      return {
        drawnCard: drawnCard!,
        room: serializeRoom(result as Room, data.playerId),
      };
    },
  });
}
