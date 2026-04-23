// Helper para notificaciones push web a través del Service Worker.
// Usar showNotification del registration permite que el globo aparezca
// también con la pestaña en segundo plano o la pantalla apagada.

import { Platform } from "react-native";

export function isWebNotifSupported(): boolean {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export function notifPermission(): NotificationPermission | "unsupported" {
  if (!isWebNotifSupported()) return "unsupported";
  return Notification.permission;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebNotifSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function requestNotifPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isWebNotifSupported()) return "unsupported";
  await ensureServiceWorker();
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

interface NotifPayload {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
}

export async function showCaosNotification(payload: NotifPayload): Promise<void> {
  if (!isWebNotifSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // Mensaje al SW (más fiable en background) + fallback directo.
    try {
      reg.active?.postMessage({ type: "show-notification", payload });
    } catch {}
    await reg.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      renotify: true,
      requireInteraction: payload.requireInteraction,
      badge: "/favicon.ico",
      icon: "/favicon.ico",
      vibrate: [200, 80, 200, 80, 400] as unknown as number[],
      data: payload.data,
    } as NotificationOptions);
  } catch {
    // último recurso: notificación nativa (foreground only)
    try {
      new Notification(payload.title, { body: payload.body, tag: payload.tag });
    } catch {}
  }
}
