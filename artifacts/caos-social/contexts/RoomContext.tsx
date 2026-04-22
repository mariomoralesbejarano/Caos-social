import {
  RoomState,
  getGetRoomQueryKey,
  useGetRoom,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

import { buzzIncoming, playClink } from "@/lib/feedback";
import { Session, clearSession, loadSession, saveSession } from "@/lib/session";

interface RoomContextValue {
  session: Session | null;
  room: RoomState | null;
  isLoading: boolean;
  setSession: (s: Session | null) => Promise<void>;
  refresh: () => void;
  hydrated: boolean;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      setSessionState(s);
      setHydrated(true);
    })();
  }, []);

  const query = useGetRoom(
    session?.roomCode ?? "",
    { playerId: session?.playerId ?? "" },
    {
      query: {
        queryKey: getGetRoomQueryKey(session?.roomCode ?? "", {
          playerId: session?.playerId ?? "",
        }),
        enabled: !!session,
        refetchInterval: 3000,
        retry: false,
      },
    },
  );

  async function setSession(s: Session | null) {
    if (s) await saveSession(s);
    else await clearSession();
    setSessionState(s);
    if (s) {
      qc.invalidateQueries({
        queryKey: getGetRoomQueryKey(s.roomCode, { playerId: s.playerId }),
      });
    }
  }

  // Drop session if room no longer exists
  useEffect(() => {
    if (!session || !hydrated) return;
    const err = query.error as { status?: number } | null;
    if (err && err.status === 404) {
      clearSession().then(() => setSessionState(null));
    }
  }, [query.error, session, hydrated]);

  // Feedback: clink on score increase, buzz on new inbox card
  const room = (query.data as RoomState | undefined) ?? null;
  const lastScoreRef = useRef<number | null>(null);
  const lastInboxRef = useRef<number>(0);

  useEffect(() => {
    if (!room || !session) return;
    const me = room.players.find((p) => p.id === session.playerId);
    if (!me) return;
    if (lastScoreRef.current !== null && me.score > lastScoreRef.current) {
      playClink();
    }
    lastScoreRef.current = me.score;
    const inboxLen = room.myInbox?.length ?? 0;
    if (inboxLen > lastInboxRef.current) buzzIncoming();
    lastInboxRef.current = inboxLen;
  }, [room, session]);

  const value: RoomContextValue = {
    session,
    room,
    isLoading: query.isLoading,
    setSession,
    refresh: () => query.refetch(),
    hydrated,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within RoomProvider");
  return ctx;
}
