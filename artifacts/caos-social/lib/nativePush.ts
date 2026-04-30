// Capa de adaptación para push nativas (Android via FCM / iOS via APNs)
// usando @capacitor/push-notifications. Seguro de cargar en web (no-op).
//
// Configuración Android (FCM):
//   * `android/app/google-services.json` se inyecta en CI desde
//     `firebase/google-services.json` (ver workflow android-apk.yml).
//   * El plugin Gradle `com.google.gms.google-services` se aplica en
//     ese mismo paso del workflow.
//
// Una vez que el dispositivo se registra, persistimos el token en la
// tabla `player_tokens` de Supabase, asociado al (roomCode, playerId)
// del jugador. La Edge Function `send-push` (ver `supabase/functions/
// send-push/index.ts`) lo usa para enviar la notificación real con FCM
// HTTP v1.

import { Platform } from "react-native";

import { getSupabase, SUPABASE_URL } from "@workspace/api-client-react";

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

/**
 * Detecta si corremos DENTRO de una app Capacitor nativa (Android / iOS).
 * Usa `Capacitor.isNativePlatform()` que funciona tanto en builds nativos
 * de Expo como en apps Capacitor donde `Platform.OS` siempre devuelve "web"
 * (porque el bundle React corre en un WebView).
 */
function isCapacitorNative(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    // Fallback para builds Expo nativos (Expo Go / standalone)
    return Platform.OS === "android" || Platform.OS === "ios";
  }
}

/**
 * Devuelve la plataforma nativa: "android" | "ios".
 * Se llama solo cuando isCapacitorNative() === true.
 */
function nativePlatform(): PushPlatform {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core");
    const p = Capacitor.getPlatform();
    return (p === "ios" ? "ios" : "android") as PushPlatform;
  } catch {
    return (Platform.OS === "ios" ? "ios" : "android") as PushPlatform;
  }
}

/**
 * Inicializa el SDK de push nativo UNA VEZ al arrancar la app.
 * Pide permisos, registra el dispositivo y, si ya tenemos sesión,
 * persiste el token en `player_tokens`. Si aún no hay sesión, queda
 * encolado y se persiste cuando llamemos a `attachPlayerToPush`.
 */
export async function initNativePush(): Promise<void> {
  if (initialised) return;
  initialised = true;
  if (!isCapacitorNative()) return;

  let PushNotifications: any;
  try {
    // Carga perezosa: en web/Expo Go este módulo no existe y peta el bundler
    // si lo importamos estáticamente.
    PushNotifications =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@capacitor/push-notifications").PushNotifications;
  } catch {
    return;
  }

  try {
    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === "granted";
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) return;

    // Listener: registro exitoso → token FCM (Android) / APNs (iOS).
    PushNotifications.addListener("registration", (t: { value: string }) => {
      cachedToken = t.value;
      cachedPlatform = nativePlatform();
      if (pendingRegistration && cachedToken) {
        void registerPlayerToken({
          room_code: pendingRegistration.roomCode,
          player_id: pendingRegistration.playerId,
          token: cachedToken,
          platform: cachedPlatform,
        });
        pendingRegistration = null;
      }
    });

    PushNotifications.addListener("registrationError", (err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn("[nativePush] registrationError", err);
    });

    // Listener: notificación recibida con la app en primer plano.
    PushNotifications.addListener(
      "pushNotificationReceived",
      (n: { title?: string; body?: string }) => {
        // El sistema operativo NO muestra el banner si la app está en
        // primer plano: no hace falta hacer nada extra; el listener de
        // broadcast en `lib/push.ts` ya muestra una notif local.
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[push] received", n.title, n.body);
        }
      },
    );

    // Listener: usuario tocó la notificación (app en background/cerrada).
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[push] tapped", action);
        }
      },
    );

    await PushNotifications.register();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[nativePush] init failed", e);
  }
}

/**
 * Asocia el dispositivo actual (ya registrado en push) al jugador y la
 * sala. Llamarla nada más entrar a la sala/partida.
 *
 * Si todavía no nos ha llegado el token (race con `register()`), queda
 * encolado y se enviará en cuanto llegue el evento `registration`.
 */
export async function attachPlayerToPush(
  roomCode: string,
  playerId: string,
): Promise<void> {
  if (!isCapacitorNative()) return;
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
}

/**
 * Envía una push REAL (con la app cerrada) llamando a la Edge Function
 * `send-push` de Supabase, que usa FCM HTTP v1 con tu service-account.
 *
 * Nota: la Edge Function se despliega aparte (`supabase functions deploy
 * send-push`). Si no está desplegada todavía, esta llamada falla en
 * silencio y la notificación llega igualmente por broadcast/PWA cuando
 * la app está abierta.
 */
export async function sendNativePush(
  toPlayerId: string,
  payload: PushPayload,
): Promise<void> {
  if (!toPlayerId) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // La anon key se mete por defecto en el cliente Supabase; aquí
        // no la necesitamos porque Edge Function la valida internamente.
      },
      body: JSON.stringify({
        playerId: toPlayerId,
        title: payload.title,
        body: payload.body,
        roomCode: undefined,
        tag: payload.tag,
      }),
      // No esperes respuesta: best-effort.
      keepalive: true,
    }).catch(() => undefined);
  } catch {}
}

/** Helper: ¿tenemos ya un token push válido en este dispositivo? */
export function getCurrentPushToken(): {
  token: string | null;
  platform: PushPlatform | null;
} {
  return { token: cachedToken, platform: cachedPlatform };
}
