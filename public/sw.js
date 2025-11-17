const CACHE_NAME = 'pwezacore-v1';
const RUNTIME_CACHE = 'pwezacore-runtime-v1';
const STATIC_CACHE = 'pwezacore-static-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard/teacher',
  '/offline',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== STATIC_CACHE &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== CACHE_NAME
            );
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API routes (always use network)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Network first strategy
      return fetch(request)
        .then((response) => {
          // Clone the response
          const responseToCache = response.clone();

          // Cache successful responses
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }

          // Return a basic response for other requests
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  }
});

async function syncAttendance() {
  // Implement background sync logic here
  console.log('[Service Worker] Syncing attendance...');
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'pwezacore-notification',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification('PwezaCore', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/dashboard/teacher/notifications')
  );
});

