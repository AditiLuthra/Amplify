/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// Precache the built app shell (injected by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST || []);

// Show a notification when a push arrives (works when the app is closed)
self.addEventListener('push', (event: PushEvent) => {
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Clara', body: event.data?.text() };
  }

  const title = payload.title || 'Clara';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      badge: undefined,
      tag: payload.tag,
      data: { url: payload.url || '/' },
      requireInteraction: true,
    })
  );
});

// Focus/open the app when the notification is tapped
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return (client as WindowClient).focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});
