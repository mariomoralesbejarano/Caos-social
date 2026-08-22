// React hooks for the Baraja Española multiplayer game engine.
// Pattern mirrors index.ts but for the baraja_rooms table.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  applyApuestasBet,
  applyApuestasPlayCard,
  applyBarajaJoin,
  applyBarajaStartGame,
  applyMentirosoCallMentira,
  applyMentirosoPlay,
  applyOcaRoll,
  applyMonopolyAction,
  applyArenaAction,
  applyPartyAction,
  applyParchisMove,
  applyParchisRoll,
  applyTraditionalPlay,
  createBarajaRoom,
  generateBarajaCode,
  serializeBarajaRoom,
  type MonopolyAction,
} from "./barajaGame";
import { applyPokerAction, applyPokerDrinkAward, applyPokerNextHand } from "./pokerGame";
import { applyBlackjackAction, applyBlackjackNextRound } from "./blackjackGame";
import {
  BARAJA_TABLE,
  existsBarajaRoom,
  gcBarajaRooms,
  getBarajaChannel,
  insertBarajaRoom,
  loadBarajaRoom,
  mutateBarajaRoom,
} from "./barajaStore";
import { getSupabase } from "./supabase";
import type { BarajaRoomState } from "./barajaTypes";

// ─── Query key ────────────────────────────────────────────────────────────────

export function getBarajaRoomQueryKey(code: string, playerId: string) {
  return ["baraja-room", code.toUpperCase(), playerId] as const;
}

// ─── useGetBarajaRoom ─────────────────────────────────────────────────────────

export function useGetBarajaRoom(code: string, playerId: string) {
  const qc = useQueryClient();
  const queryKey = getBarajaRoomQueryKey(code, playerId);
  const enabled = !!code && !!playerId;

  const query = useQuery<BarajaRoomState, Error>({
    queryKey,
    enabled,
    queryFn: async () => {
      const room = await loadBarajaRoom(code);
      if (!room) throw new Error("Sala no encontrada");
      return serializeBarajaRoom(room, playerId);
    },
    staleTime: 500,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!enabled) return;
    const sb = getSupabase();
    const upper = code.toUpperCase();

    // postgres_changes → instant state push
    const pgChannel = sb
      .channel(`baraja-pg:${upper}:${playerId}`)
      .on(
        "postgres_changes" as "postgres_changes",
        { event: "*", schema: "public", table: BARAJA_TABLE, filter: `code=eq.${upper}` },
        (payload: { new?: { state?: unknown } }) => {
          const newState = payload.new?.state as Record<string, unknown> | undefined;
          if (newState) {
            try {
              qc.setQueryData(queryKey, serializeBarajaRoom(newState as any, playerId));
            } catch {
              qc.invalidateQueries({ queryKey });
            }
          } else {
            qc.invalidateQueries({ queryKey });
          }
        },
      )
      .subscribe();

    // Broadcast channel for <100 ms updates
    const { channel: bcast } = getBarajaChannel(upper);
    const onUpdate = () => qc.invalidateQueries({ queryKey });
    bcast.on("broadcast", { event: "BARAJA_UPDATED" }, onUpdate);

    const onFocus = () => qc.invalidateQueries({ queryKey });
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      window.addEventListener("online", onFocus);
    }

    return () => {
      sb.removeChannel(pgChannel);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("online", onFocus);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, code, playerId]);

  return query;
}

// ─── useCreateBarajaRoom ──────────────────────────────────────────────────────

export function useCreateBarajaRoom() {
  return useMutation({
    mutationFn: async ({
      gameId,
      gameTitle,
      name,
      avatar,
      livesPerPlayer,
      tableConfig,
    }: {
      gameId: string;
      gameTitle: string;
      name: string;
      avatar: string;
      livesPerPlayer?: 3 | 5;
      tableConfig?: {
        startingStack?: number;
        smallBlind?: number;
        bigBlind?: number;
        maxPlayers?: number;
        stakesMode?: "chips" | "sips";
        partyMode?: boolean;
      };
    }) => {
      void gcBarajaRooms();
      let code = generateBarajaCode();
      let attempts = 0;
      while ((await existsBarajaRoom(code)) && attempts < 10) {
        code = generateBarajaCode();
        attempts++;
      }
      const playerId = Math.random().toString(36).slice(2, 10);
      const room = createBarajaRoom({
        code,
        gameId,
        gameTitle,
        playerId,
        name,
        avatar,
        livesPerPlayer,
        tableConfig,
      });
      await insertBarajaRoom(room);
      return { code: room.code, playerId };
    },
  });
}

// ─── useJoinBarajaRoom ────────────────────────────────────────────────────────

export function useJoinBarajaRoom() {
  return useMutation({
    mutationFn: async ({
      code,
      name,
      avatar,
    }: {
      code: string;
      name: string;
      avatar: string;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyBarajaJoin(room, name, avatar),
      );
      if ("error" in (result as object))
        throw new Error((result as { error: string }).error);
      const { playerId } = result as { room: unknown; playerId: string };
      return { code: code.toUpperCase(), playerId };
    },
  });
}

// ─── useStartBarajaGame ───────────────────────────────────────────────────────

export function useStartBarajaGame() {
  return useMutation({
    mutationFn: async ({ code, playerId }: { code: string; playerId: string }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyBarajaStartGame(room, playerId),
      );
      if ("error" in (result as object))
        throw new Error((result as { error: string }).error);
    },
  });
}

// ─── useLeaveBarajaRoom ───────────────────────────────────────────────────────

export function useLeaveBarajaRoom() {
  return useMutation({
    mutationFn: async ({ code, playerId }: { code: string; playerId: string }) => {
      await mutateBarajaRoom(code, (room) => {
        const p = room.players.find((x) => x.id === playerId);
        if (p) { p.connected = false; p.lastSeen = Date.now(); }
        room.version += 1;
        return { room };
      });
    },
  });
}

// ─── Las Apuestas ─────────────────────────────────────────────────────────────

export function usePlaceApuestasBet() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      bet,
    }: {
      code: string;
      playerId: string;
      bet: number;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyApuestasBet(room, playerId, bet),
      );
      if ("error" in (result as object))
        throw new Error((result as { error: string }).error);
    },
  });
}

export function usePlayApuestasCard() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      cardId,
    }: {
      code: string;
      playerId: string;
      cardId: string;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyApuestasPlayCard(room, playerId, cardId),
      );
      if ("error" in (result as object))
        throw new Error((result as { error: string }).error);
    },
  });
}

// ─── El Mentiroso ─────────────────────────────────────────────────────────────

export function usePlayMentiroso() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      cardIds,
      declaredValue,
    }: {
      code: string;
      playerId: string;
      cardIds: string[];
      declaredValue?: number;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyMentirosoPlay(room, playerId, cardIds, declaredValue),
      );
      if ("error" in (result as object))
        throw new Error((result as { error: string }).error);
    },
  });
}

export function useCallMentira() {
  return useMutation({
    mutationFn: async ({
      code,
      callerId,
    }: {
      code: string;
      callerId: string;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyMentirosoCallMentira(room, callerId),
      );
      if ("error" in (result as object))
        throw new Error((result as { error: string }).error);
    },
  });
}

// ─── Texas Hold'em ───────────────────────────────────────────────────────────

export function usePokerAction() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      action,
      amount,
    }: {
      code: string;
      playerId: string;
      action: "fold" | "check" | "call" | "raise";
      amount?: number;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyPokerAction(room, playerId, action, amount),
      );
      if ("error" in (result as object))
        throw new Error((result as { error: string }).error);
    },
  });
}

export function usePokerNextHand() {
  return useMutation({
    mutationFn: async ({ code, playerId }: { code: string; playerId: string }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyPokerNextHand(room, playerId),
      );
      if ("error" in (result as object))
        throw new Error((result as { error: string }).error);
    },
  });
}

export function usePokerDrinkAward() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      recipientIds,
    }: {
      code: string;
      playerId: string;
      recipientIds: string[];
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyPokerDrinkAward(room, playerId, recipientIds),
      );
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function useParchisRoll() {
  return useMutation({
    mutationFn: async ({ code, playerId }: { code: string; playerId: string }) => {
      const result = await mutateBarajaRoom(code, (room) => applyParchisRoll(room, playerId));
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function useParchisMove() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      pieceIndex,
    }: {
      code: string;
      playerId: string;
      pieceIndex: number;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyParchisMove(room, playerId, pieceIndex),
      );
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function useOcaRoll() {
  return useMutation({
    mutationFn: async ({ code, playerId }: { code: string; playerId: string }) => {
      const result = await mutateBarajaRoom(code, (room) => applyOcaRoll(room, playerId));
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function useMonopolyAction() {
  return useMutation<void, Error, {
    code: string;
    playerId: string;
    action: MonopolyAction;
  }>({
    mutationFn: async ({
      code,
      playerId,
      action,
    }: {
      code: string;
      playerId: string;
      action: MonopolyAction;
    }) => {
      const result = await mutateBarajaRoom(code, (room) => applyMonopolyAction(room, playerId, action));
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function useArenaAction() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      action,
      points,
      value,
    }: {
      code: string;
      playerId: string;
      action: "tap" | "pass-bomb" | "memory-input" | "score" | "pass" | "stopwatch" | "stroop" | "target" | "answer";
      points?: number;
      value?: number;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyArenaAction(room, playerId, action, points, value),
      );
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function usePartyAction() {
  return useMutation({
    mutationFn: async ({ code, playerId, action, value, kind }: {
      code: string; playerId: string; action: "coin" | "prompt" | "vote" | "probable"; value?: string; kind?: "incómoda" | "yo-nunca";
    }) => {
      const result = await mutateBarajaRoom(code, (room) => applyPartyAction(room, playerId, action, value, kind));
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function useBlackjackAction() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      action,
    }: {
      code: string;
      playerId: string;
      action: "hit" | "stand" | "double" | "split";
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyBlackjackAction(room, playerId, action),
      );
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function useBlackjackNextRound() {
  return useMutation({
    mutationFn: async ({ code, playerId }: { code: string; playerId: string }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyBlackjackNextRound(room, playerId),
      );
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}

export function useTraditionalPlay() {
  return useMutation({
    mutationFn: async ({
      code,
      playerId,
      cardId,
    }: {
      code: string;
      playerId: string;
      cardId: string;
    }) => {
      const result = await mutateBarajaRoom(code, (room) =>
        applyTraditionalPlay(room, playerId, cardId),
      );
      if ("error" in (result as object)) throw new Error((result as { error: string }).error);
    },
  });
}
