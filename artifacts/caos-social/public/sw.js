// CAOS SOCIAL — Service Worker para notificaciones del Tribunal y retos.
// No cachea (network-first puro). Solo habilita notificaciones visibles
// con la app en background o la pantalla apagada.

const SW_VERSION = "caos-sw-v3";

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
        if ("focus" in c) {
          try { c.postMessage({ type: "notif-click", tag: event.notification.tag }); } catch {}
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    }),
  );
});

// Push real (si algún día configuramos VAPID)
self.addEventListener("push", (event) => {
  let data = { title: "⚠️ ¡CAOS!", body: "Algo está pasando en tu sala." };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(showCaosNotification(data));
});

// Mensajes desde la página: la única vía fiable para que aparezca
// el globo de texto cuando el navegador está en segundo plano.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data && data.type === "show-notification") {
    event.waitUntil(showCaosNotification(data.payload || {}));
  }
});

function showCaosNotification(payload) {
  const title = payload.title || "⚠️ ¡CAOS!";
  const body = payload.body || "Tienes algo nuevo en tu sala.";
  const tag = payload.tag || "caos-" + Date.now();
  const opts = {
    body,
    tag,
    renotify: true,
    requireInteraction: !!payload.requireInteraction,
    badge: "/favicon.ico",
    icon: "/favicon.ico",
    vibrate: [200, 80, 200, 80, 400],
    data: payload.data || {},
  };
  return self.registration.showNotification(title, opts).catch(() => {});
}
