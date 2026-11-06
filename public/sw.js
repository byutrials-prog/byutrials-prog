// Service Worker untuk Tipsy Point PWA
// Strategi: Cache First untuk aset statis, Network First untuk API

const CACHE_NAME = 'tipsy-point-v1.0.0';
const RUNTIME_CACHE = 'tipsy-point-runtime-v1';

// self.__WB_MANIFEST akan diisi otomatis oleh VitePWA/Workbox dengan daftar aset
// JANGAN hapus baris ini - ini adalah placeholder wajib untuk injectManifest strategy
const PRECACHE_ASSETS = self.__WB_MANIFEST || [
  { url: '/', revision: null },
  { url: '/index.html', revision: null },
  { url: '/offline.html', revision: null },
];

// Instal SW - pre-cache aset utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Extract URL strings dari manifest entries
      const urls = PRECACHE_ASSETS.map(entry =>
        typeof entry === 'string' ? entry : entry.url
      );
      return cache.addAll(urls);
    }).then(() => self.skipWaiting())
  );
});

// Aktifkan SW - hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - strategi hybrid
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET dan request ke Firebase/external API
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Untuk navigasi halaman - Network First, fallback ke cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Simpan ke runtime cache
          const cloned = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => {
          // Jika offline, coba dari cache atau tampilkan halaman offline
          return caches.match(request)
            .then((cached) => cached || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Untuk aset statis (JS, CSS, gambar) - Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const cloned = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
          return response;
        });
      })
    );
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        const cloned = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Background Sync untuk operasi offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  // Placeholder untuk sinkronisasi data offline ke Firebase
  const db = await openDB();
  const pendingItems = await db.getAll('pending-sync');
  // Sync logic akan ditangani oleh app
  console.log('[SW] Syncing pending transactions:', pendingItems.length);
}

// Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Tipsy Point', {
      body: data.body || 'Ada notifikasi baru',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
