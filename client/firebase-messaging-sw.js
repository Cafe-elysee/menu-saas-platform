/* ================================================
   Firebase Messaging Service Worker — SaaS Platform
   Universel : un seul SW pour tous les restaurants
================================================ */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCM6SiQoWQfsq_t-80EfiVplXV9p534_eI",
  authDomain:        "menu-saas-platform.firebaseapp.com",
  projectId:         "menu-saas-platform",
  storageBucket:     "menu-saas-platform.firebasestorage.app",
  messagingSenderId: "460781372428",
  appId:             "1:460781372428:web:55c33bfb6f8f8d5582da29",
  databaseURL:       "https://menu-saas-platform-default-rtdb.europe-west1.firebasedatabase.app"
});

firebase.messaging();

/* ── Gestionnaire push principal ────────────────────────────────────
   Déclenché pour les notifications web push (clients web uniquement).
   Les apps natives (Capacitor APK) gèrent leurs notifications elles-mêmes.
─────────────────────────────────────────────────────────────────── */
self.addEventListener('push', e => {
  if (!e.data) return;

  let data = {};
  try {
    const payload = e.data.json();
    data = payload.data || payload;
  } catch(err) { return; }

  if (!data.table) return;

  const rid   = data.restaurantId || 'unknown';
  const table = data.table;
  const title = data.title || '🔔 Notification';
  const body  = data.body  || 'Appel : Table ' + table;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Toujours poser le flag de revalidation token FCM
      caches.open('saas-fcm-meta').then(cache =>
        cache.put('/needs-token-refresh', new Response('1'))
      ).catch(() => {});

      // Si le menu du restaurant est visible en premier plan → ne pas afficher la notif système
      const menuVisible = clients.some(c =>
        c.url.includes('?rid=' + rid) && c.visibilityState === 'visible'
      );
      if (menuVisible) return;

      return self.registration.showNotification(title, {
        body,
        icon:  '/icon.svg',
        badge: '/icon.svg',
        tag:   rid + '-' + table + '-' + Date.now(),
        renotify:           true,
        requireInteraction: true,
        vibrate: [200, 80, 200, 80, 350],
        actions: [
          { action: 'open',    title: "Ouvrir" },
          { action: 'dismiss', title: 'Fermer' }
        ],
        data: { rid, table, url: '/index.html?rid=' + rid }
      });
    })
  );
});

/* ── Clic sur notification ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const targetUrl = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(e.notification.data && e.notification.data.rid)) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

/* ── Renouvellement subscription push ── */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        if (clients.length > 0) clients.forEach(c => c.postMessage({ type: 'FCM_TOKEN_REFRESH' }));
        return caches.open('saas-fcm-meta').then(cache =>
          cache.put('/needs-token-refresh', new Response('1'))
        );
      })
  );
});

/* ── Cycle de vie du SW ── */
const CACHE  = 'saas-v1';
const ASSETS = ['manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
  caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {});
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'saas-fcm-meta').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
