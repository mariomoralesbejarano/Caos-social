// Push nativas (Android FCM / iOS APNs) via @capacitor/push-notifications.
// SEGURO en web: todas las llamadas están envueltas en try-catch y la detección
// de plataforma usa Capacitor.isNativePlatform() para no crashear en WebView.

import { Platform } from "react-native";

import { SUPABASE_URL } from "@workspace/api-client-react";

import type { PushPayload } from "@/lib/push";
import { registerPlayerToken, type PushPlatform } from "@/lib/playerTokens";

let initialised = false;
let cachedToken: string | null = null;
let cachedPlatform: PushPlatform | null = null;

interface PendingRegistration {
  roomCode: string;
  playerId: string;
}
let pendingRegistration: PendingRegistration | null = null;

function safeLog(...args: unknown[]) {
  try {
    // eslint-disable-next-line no-console
    console.log("[nativePush]", ...args);
  } catch {}
}
function safeWarn(...args: unknown[]) {
  try {
    // eslint-disable-next-line no-console
    console.warn("[nativePush]", ...args);
  } catch {}
}

/**
 * Detecta si corremos DENTRO de una app Capacitor nativa.
 * `Capacitor.isNativePlatform()` devuelve true en Android/iOS incluso cuando
 * el bundle React ve Platform.OS === "web" (porque corre en WebView).
 */
function isCapacitorNative(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core");
    return typeof Capacitor?.isNativePlatform === "function"
      ? Capacitor.isNativePlatform()
      : false;
  } catch {
    return Platform.OS === "android" || Platform.OS === "ios";
  }
}

function nativePlatform(): PushPlatform {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core");
    const p = Capacitor?.getPlatform?.();
    return (p === "ios" ? "ios" : "android") as PushPlatform;
  } catch {
    return (Platform.OS === "ios" ? "ios" : "android") as PushPlatform;
  }
}

/**
 * Inicializa el SDK de push nativo UNA VEZ al arrancar la app.
 *
 * SAFETY: cada operación (check, request, addListener, register) tiene
 * su propio try-catch para que un fallo parcial no crashee la app.
 * Se aplica un delay de 2 s para asegurar que Capacitor y Firebase
 * han terminado de inicializarse antes de pedir el token.
 */
export async function initNativePush(): Promise<void> {
  if (initialised) return;
  initialised = true;

  if (!isCapacitorNative()) {
    safeLog("no es nativo, skip");
    return;
  }

  // Delay de seguridad: permite que Capacitor/Firebase carguen completamente.
  await new Promise<void>((resolve) => setTimeout(resolve, 2000));

  let PushNotifications: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PushNotifications = require("@capacitor/push-notifications").PushNotifications;
  } catch (e) {
    safeWarn("módulo @capacitor/push-notifications no disponible", e);
    return;
  }

  // 1. Comprobar/pedir permisos.
  let granted = false;
  try {
    const perm = await PushNotifications.checkPermissions();
    granted = perm?.receive === "granted";
  } catch (e) {
    safeWarn("checkPermissions falló", e);
  }

  if (!granted) {
    try {
      const req = await PushNotifications.requestPermissions();
      granted = req?.receive === "granted";
    } catch (e) {
      safeWarn("requestPermissions falló", e);
    }
  }

  if (!granted) {
    safeLog("permisos denegados, skip registro");
    return;
  }

  // 2. Registrar listeners antes de llamar a register().
  try {
    PushNotifications.addListener("registration", (t: { value: string }) => {
      try {
        cachedToken = t.value;
        cachedPlatform = nativePlatform();
        safeLog("token OK, plataforma:", cachedPlatform);
        if (pendingRegistration && cachedToken) {
          void registerPlayerToken({
            room_code: pendingRegistration.roomCode,
            player_id: pendingRegistration.playerId,
            token: cachedToken,
            platform: cachedPlatform,
          }).catch((err) => safeWarn("registerPlayerToken falló", err));
          pendingRegistration = null;
        }
      } catch (e) {
        safeWarn("listener registration inner error", e);
      }
    });
  } catch (e) {
    safeWarn("addListener registration falló", e);
  }

  try {
    PushNotifications.addListener("registrationError", (err: unknown) => {
      safeWarn("registrationError del dispositivo", err);
      // NO lanzamos: solo logeamos para no crashear.
    });
  } catch (e) {
    safeWarn("addListener registrationError falló", e);
  }

  try {
    PushNotifications.addListener(
      "pushNotificationReceived",
      (n: { title?: string; body?: string }) => {
        try {
          safeLog("received en foreground", n.title, n.body);
        } catch {}
      },
    );
  } catch (e) {
    safeWarn("addListener pushNotificationReceived falló", e);
  }

  try {
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: unknown) => {
        try {
          safeLog("tapped", action);
        } catch {}
      },
    );
  } catch (e) {
    safeWarn("addListener pushNotificationActionPerformed falló", e);
  }

  // 3. Solicitar el token FCM/APNs. Esto puede fallar si google-services.json
  //    no está configurado — lo capturamos sin crashear.
  try {
    await PushNotifications.register();
    safeLog("register() llamado correctamente");
  } catch (e) {
    safeWarn("register() falló — verifica google-services.json y build.gradle", e);
  }
}

/**
 * Asocia el dispositivo actual al jugador/sala.
 * Si el token aún no llegó (race con register()), queda encolado.
 */
export async function attachPlayerToPush(
  roomCode: string,
  playerId: string,
): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    if (cachedToken && cachedPlatform) {
      await registerPlayerToken({
        room_code: roomCode,
        player_id: playerId,
        token: cachedToken,
        platform: cachedPlatform,
      });
    } else {
      pendingRegistration = { roomCode, playerId };
    }
  } catch (e) {
    safeWarn("attachPlayerToPush falló", e);
  }
}

/**
 * Envía push REAL via Edge Function `send-push` de Supabase.
 * Best-effort: no lanza si falla.
 */
export async function sendNativePush(
  toPlayerId: string,
  payload: PushPayload,
): Promise<void> {
  if (!toPlayerId) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: toPlayerId,
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {}
}

export function getCurrentPushToken(): {
  token: string | null;
  platform: PushPlatform | null;
} {
  return { token: cachedToken, platform: cachedPlatform };
}
