// CAOS SOCIAL — Service Worker básico para notificaciones del Tribunal.
// No cachea nada de la app (network-first puro), solo habilita la API Notification.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    }),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "CAOS SOCIAL", body: "Algo está pasando en tu sala." };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      badge: "/favicon.ico",
    }),
  );
});
