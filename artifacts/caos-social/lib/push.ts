// Notificaciones push “híbridas”:
//  - Web (PWA / preview): Service Worker + Notification API.
//  - Nativo (Capacitor): se delega en el SDK externo (OneSignal / Firebase).
//
// La API pública es una sola función global:
//   sendPushNotification(playerId, mensaje)
// que cualquier cliente puede llamar (p. ej. tras tirar una carta) y que
// dispara una notificación en el móvil del jugador destinatario.
//
// Usa Supabase Realtime *Broadcast* como transporte instantáneo en lugar de
// la base de datos (latencia <100 ms en todo el grupo).

import { broadcastRoomEvent, getRoomChannel } from "@workspace/api-client-react";

import { showCaosNotification } from "@/lib/notifications";
import { sendNativePush } from "@/lib/nativePush";

export interface PushPayload {
  toPlayerId: string;
  fromPlayerId?: string;
  title: string;
  body: string;
  tag?: string;
  ts: number;
}

/**
 * Envía una notificación push a un jugador concreto de la sala.
 * Es seguro llamarla en cualquier plataforma; internamente:
 *   - emite un broadcast por el canal de la sala;
 *   - opcionalmente delega en el SDK nativo (OneSignal/Firebase) si está
 *     configurado, para entrega con la app cerrada.
 */
export async function sendPushNotification(
  roomCode: string,
  toPlayerId: string,
  message: { title: string; body: string; fromPlayerId?: string; tag?: string },
): Promise<void> {
  const payload: PushPayload = {
    toPlayerId,
    fromPlayerId: message.fromPlayerId,
    title: message.title,
    body: message.body,
    tag: message.tag,
    ts: Date.now(),
  };
  // Camino rápido: broadcast a todos los clientes de la sala (<100 ms).
  await broadcastRoomEvent(roomCode, "PUSH", payload as unknown as Record<string, unknown>);
  // Camino “app cerrada”: SDK nativo (no-op si no está configurado).
  try {
    await sendNativePush(toPlayerId, payload);
  } catch {}
}

type Unsubscribe = () => void;

/**
 * Suscribe al cliente actual a notificaciones push entrantes para `myPlayerId`.
 * Devuelve una función de limpieza.
 */
export function subscribeToPush(
  roomCode: string,
  myPlayerId: string,
  onIncoming?: (p: PushPayload) => void,
): Unsubscribe {
  const { channel } = getRoomChannel(roomCode);
  const handler = (msg: { payload?: unknown }) => {
    const p = msg?.payload as PushPayload | undefined;
    if (!p || p.toPlayerId !== myPlayerId) return;
    // Notificación local (web/PWA). En nativo, el SDK ya muestra su propio aviso.
    void showCaosNotification({
      title: p.title,
      body: p.body,
      tag: p.tag ?? `push-${p.ts}`,
      requireInteraction: true,
    });
    onIncoming?.(p);
  };
  channel.on("broadcast", { event: "PUSH" }, handler);
  return () => {
    try {
      // supabase-js no expone un .off por handler individual; basta con que el
      // canal viva mientras la app esté abierta. Limpieza no-op a propósito.
    } catch {}
  };
}
