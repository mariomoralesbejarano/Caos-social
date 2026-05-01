// Push nativas (Android FCM / iOS APNs) via @capacitor/push-notifications.
//
// POLÍTICA DE SEGURIDAD:
//   • CADA llamada tiene su propio try/catch individual.
//   • La plataforma se verifica con Capacitor.getPlatform() === 'android' | 'ios'
//     ANTES de invocar cualquier función de PushNotifications.
//   • Si cualquier paso falla, solo se loguea — la app NO se cierra.
//   • Delay de 2 s antes de register() para que Firebase termine de iniciarse.

import { Platform } from "react-native";

import { SUPABASE_URL } from "@workspace/api-client-react";

import type { PushPayload } from "@/lib/push";
import { registerPlayerToken, type PushPlatform } from "@/lib/playerTokens";

let initialised = false;
let cachedToken: string | null = null;
let cachedPlatform: PushPlatform | null = null;

interface PendingRegistration { roomCode: string; playerId: string }
let pendingRegistration: PendingRegistration | null = null;

/* ─── helpers de logging ──────────────────────────────────────────────────── */
function safeLog(...a: unknown[]) { try { console.log("[nativePush]", ...a); } catch {} } // eslint-disable-line no-console
function safeErr(...a: unknown[]) { try { console.error("[nativePush]", ...a); } catch {} } // eslint-disable-line no-console

/* ─── detección de plataforma ─────────────────────────────────────────────── */

/** Carga @capacitor/core de forma segura y devuelve el objeto Capacitor o null. */
function getCapacitor(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@capacitor/core").Capacitor ?? null;
  } catch {
    return null;
  }
}

/**
 * Devuelve "android" | "ios" | "web".
 * En builds Capacitor la WebView siempre da "android"/"ios" incluso cuando
 * Platform.OS === "web" (porque el bundle React corre dentro del WebView).
 */
function capacitorPlatform(): string {
  try {
    const Cap = getCapacitor();
    if (Cap && typeof Cap.getPlatform === "function") {
      return Cap.getPlatform(); // "android" | "ios" | "web"
    }
  } catch (e) {
    safeErr("getPlatform() falló", e);
  }
  // Fallback para Expo Go nativo
  return Platform.OS;
}

function isCapacitorNative(): boolean {
  const p = capacitorPlatform();
  return p === "android" || p === "ios";
}

/* ─── carga lazy del plugin ───────────────────────────────────────────────── */
function loadPushPlugin(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@capacitor/push-notifications");
    return mod?.PushNotifications ?? null;
  } catch (e) {
    safeErr("@capacitor/push-notifications no disponible", e);
    return null;
  }
}

/* ─── init principal ──────────────────────────────────────────────────────── */

/**
 * Inicializa push nativo UNA SOLA VEZ al arrancar la app.
 *
 * Flujo:
 *   1. Verifica plataforma (Capacitor.getPlatform() === 'android' o 'ios')
 *   2. Espera 2 s para que Firebase/Capacitor terminen de inicializarse
 *   3. checkPermissions → requestPermissions si hace falta
 *   4. addListener x4 (cada uno en su propio try-catch)
 *   5. register() (en su propio try-catch)
 */
export async function initNativePush(): Promise<void> {
  if (initialised) return;
  initialised = true;

  const platform = capacitorPlatform();
  safeLog("plataforma detectada:", platform);

  if (platform !== "android" && platform !== "ios") {
    safeLog("no es nativo, skip push");
    return;
  }

  // ── Delay de seguridad ──────────────────────────────────────────────────
  // Firebase necesita un momento para leer google-services.json e inicializar
  // su instancia. Sin este delay, register() puede lanzar antes de estar listo.
  await new Promise<void>((r) => setTimeout(r, 2000));

  // ── Cargar plugin ───────────────────────────────────────────────────────
  const Push = loadPushPlugin();
  if (!Push) return;

  // ── 1. Verificar / pedir permisos ───────────────────────────────────────
  let granted = false;

  try {
    const perm = await Push.checkPermissions();
    granted = perm?.receive === "granted";
    safeLog("checkPermissions →", perm?.receive);
  } catch (e) {
    safeErr("checkPermissions() lanzó excepción", e);
  }

  if (!granted) {
    try {
      const req = await Push.requestPermissions();
      granted = req?.receive === "granted";
      safeLog("requestPermissions →", req?.receive);
    } catch (e) {
      safeErr("requestPermissions() lanzó excepción", e);
    }
  }

  if (!granted) {
    safeLog("permisos no concedidos — skip registro");
    return;
  }

  // ── 2. Listeners (cada uno aislado) ────────────────────────────────────

  // registration: token FCM/APNs recibido correctamente
  try {
    Push.addListener("registration", (t: { value: string }) => {
      try {
        cachedToken = t?.value ?? null;
        cachedPlatform = (platform === "ios" ? "ios" : "android") as PushPlatform;
        safeLog("token recibido, plataforma:", cachedPlatform,
                "token:", cachedToken?.slice(0, 20) + "…");
        if (pendingRegistration && cachedToken && cachedPlatform) {
          const { roomCode, playerId } = pendingRegistration;
          pendingRegistration = null;
          registerPlayerToken({
            room_code: roomCode,
            player_id: playerId,
            token: cachedToken,
            platform: cachedPlatform,
          }).catch((err) => safeErr("registerPlayerToken falló", err));
        }
      } catch (e) {
        safeErr("handler 'registration' lanzó excepción interna", e);
      }
    });
  } catch (e) {
    safeErr("addListener('registration') falló", e);
  }

  // registrationError: Firebase no pudo obtener el token (sin crash)
  try {
    Push.addListener("registrationError", (err: unknown) => {
      try {
        safeErr("registrationError del sistema (no es crash):", err);
      } catch {}
    });
  } catch (e) {
    safeErr("addListener('registrationError') falló", e);
  }

  // pushNotificationReceived: app en primer plano
  try {
    Push.addListener("pushNotificationReceived",
      (n: { title?: string; body?: string }) => {
        try { safeLog("push recibida en foreground:", n?.title, n?.body); } catch {}
      });
  } catch (e) {
    safeErr("addListener('pushNotificationReceived') falló", e);
  }

  // pushNotificationActionPerformed: usuario tocó la notificación
  try {
    Push.addListener("pushNotificationActionPerformed", (action: unknown) => {
      try { safeLog("notificación pulsada:", action); } catch {}
    });
  } catch (e) {
    safeErr("addListener('pushNotificationActionPerformed') falló", e);
  }

  // ── 3. register() — solicita token FCM/APNs ────────────────────────────
  // Este es el paso más probable de fallar si google-services.json no está
  // o el plugin de Gradle no está aplicado. Lo capturamos SIN relanzar.
  try {
    safeLog("llamando register()…");
    await Push.register();
    safeLog("register() completado sin excepciones síncronas");
  } catch (e) {
    safeErr(
      "register() lanzó excepción. Causas comunes:\n" +
      "  • google-services.json no está en android/app/\n" +
      "  • apply plugin: 'com.google.gms.google-services' falta en app/build.gradle\n" +
      "  • MessagingService no declarado en AndroidManifest.xml",
      e,
    );
    // NO relanzamos: la app sigue funcionando sin push nativo.
  }
}

/* ─── attachPlayerToPush ─────────────────────────────────────────────────── */

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
    safeErr("attachPlayerToPush falló", e);
  }
}

/* ─── sendNativePush ─────────────────────────────────────────────────────── */

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

/* ─── getCurrentPushToken ────────────────────────────────────────────────── */

export function getCurrentPushToken(): { token: string | null; platform: PushPlatform | null } {
  return { token: cachedToken, platform: cachedPlatform };
}
