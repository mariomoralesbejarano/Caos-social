// Chat de sala en tiempo real usando Supabase Realtime *Broadcast*.
// No persiste mensajes en la BBDD a propósito (privacidad de juego de fiesta);
// solo viven en memoria mientras la app esté abierta.
//
// API:
//   - subscribeToChat(roomCode, onMessage) → unsubscribe
//   - sendChatMessage(roomCode, msg)
//   - postSystemEvent(roomCode, body) → mensaje de sistema (juicio, etc.)

import { broadcastRoomEvent, getRoomChannel } from "@workspace/api-client-react";

export type ChatMessageKind = "user" | "system";

export interface ChatMessage {
  id: string;
  kind: ChatMessageKind;
  fromPlayerId?: string;
  fromName?: string;
  fromAvatar?: string;
  body: string;
  ts: number;
}

const CHAT_EVENT = "CHAT" as const;

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function sendChatMessage(
  roomCode: string,
  msg: Omit<ChatMessage, "id" | "ts" | "kind"> & { kind?: ChatMessageKind },
): Promise<ChatMessage> {
  const full: ChatMessage = {
    id: makeId(),
    ts: Date.now(),
    kind: msg.kind ?? "user",
    fromPlayerId: msg.fromPlayerId,
    fromName: msg.fromName,
    fromAvatar: msg.fromAvatar,
    body: msg.body,
  };
  // Reusamos el mismo broadcast event que el resto del juego para no abrir
  // canales adicionales: evento "PUSH" con kind=chat sería confuso, por eso
  // usamos un evento aparte CHAT en el MISMO canal de sala.
  await broadcastRoomEvent(
    roomCode,
    CHAT_EVENT as unknown as "PUSH",
    full as unknown as Record<string, unknown>,
  );
  return full;
}

/** Mensaje de sistema (juicio resuelto, jugador entró, etc.) */
export async function postSystemEvent(
  roomCode: string,
  body: string,
): Promise<ChatMessage> {
  return sendChatMessage(roomCode, { kind: "system", body });
}

type Unsubscribe = () => void;

export function subscribeToChat(
  roomCode: string,
  onMessage: (m: ChatMessage) => void,
): Unsubscribe {
  const { channel } = getRoomChannel(roomCode);
  const handler = (raw: { payload?: unknown }) => {
    const m = raw?.payload as ChatMessage | undefined;
    if (!m || !m.id || !m.body) return;
    onMessage(m);
  };
  channel.on("broadcast", { event: CHAT_EVENT }, handler);
  return () => {
    /* el canal persiste mientras la app esté abierta */
  };
}
