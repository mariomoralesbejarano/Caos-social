// Capa de adaptación para SDKs de push nativo (OneSignal o Firebase
// Cloud Messaging) cuando la app se empaquete con Capacitor.
//
// Importante: este módulo es seguro de cargar tanto en web como en nativo.
// En web es un no-op. En nativo, una vez instalado uno de los SDKs y
// configurado en Capacitor, basta con rellenar las funciones marcadas
// con TODO.
//
// Pasos para activar (Android/iOS):
//   1) pnpm add @capacitor/core @capacitor/push-notifications
//      (o:  pnpm add onesignal-cordova-plugin onesignal-capacitor-plugin)
//   2) En `app/_layout.tsx`, llamar a `initNativePush()` una sola vez al
//      arrancar la app.
//   3) Tras `register()`, guardar el `deviceToken` (o el `playerId` de
//      OneSignal) asociado al `playerId` de la sala — p. ej. en una tabla
//      `caos_devices(playerId, token)` de Supabase.
//   4) En servidor (Edge Function) o vía REST de OneSignal/FCM, enviar
//      la notificación al token correspondiente cuando llegue un PUSH.

import { Platform } from "react-native";

import type { PushPayload } from "@/lib/push";

let initialised = false;

export async function initNativePush(): Promise<void> {
  if (initialised) return;
  initialised = true;
  if (Platform.OS === "web") return;
  // TODO (nativo): inicializar OneSignal o @capacitor/push-notifications.
  //
  // Ejemplo OneSignal (pseudocódigo):
  //   import OneSignal from "onesignal-cordova-plugin";
  //   OneSignal.initialize("<ONESIGNAL_APP_ID>");
  //   OneSignal.Notifications.requestPermission(true);
  //   OneSignal.User.pushSubscription.addEventListener("change", (e) => {
  //     // Persistir e.current.id ↔ playerId en Supabase.
  //   });
  //
  // Ejemplo Firebase / Capacitor (pseudocódigo):
  //   import { PushNotifications } from "@capacitor/push-notifications";
  //   await PushNotifications.requestPermissions();
  //   await PushNotifications.register();
  //   PushNotifications.addListener("registration", (t) => {
  //     // Persistir t.value ↔ playerId en Supabase.
  //   });
}

export async function sendNativePush(
  _toPlayerId: string,
  _payload: PushPayload,
): Promise<void> {
  if (Platform.OS === "web") return;
  // TODO (nativo): llamar a la Edge Function que dispara la push real
  // resolviendo `_toPlayerId` -> token de dispositivo.
  //
  //   await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ playerId: _toPlayerId, ..._payload }),
  //   });
}
