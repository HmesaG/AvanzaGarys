// Service Worker para AvanzA Coaching PWA
const CACHE_NAME = "avanza-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Ignorar peticiones que no sean GET o sean de API dinámica
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
        if (event.request.mode === "navigate") {
          return caches.match("/login");
        }
      });
    }),
  );
});

// Soporte para Notificaciones Web Push
self.addEventListener("push", (event) => {
  let payload = { title: "AvanzA Coaching", body: "Tienes una actualización de tu sesión." };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "AvanzA Coaching", {
      body: payload.body,
      icon: "/icons/icon.svg",
      badge: "/favicon.svg",
      data: { url: payload.url || "/mensajes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/mensajes";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
