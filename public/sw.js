/**
 * PwezaCore Service Worker v3 — offline-first
 *
 * Strategy:
 *  App shell (JS/CSS/icons):   Cache-first  → network fallback → update in background
 *  Navigation requests:        App shell    → always return index.html so SPA routing works offline
 *  Supabase / API calls:       Network-only (data layer handled by IndexedDB in app code)
 *  Images (logos, photos):     Stale-while-revalidate
 */

const APP_SHELL_CACHE  = 'pweza-shell-v9';
const IMAGES_CACHE     = 'pweza-images-v9';
const KNOWN_CACHES     = [APP_SHELL_CACHE, IMAGES_CACHE];

// Static assets cached immediately on install
const PRECACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/noise.png',
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-critical: some precache assets may be missing during first install
      })
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !KNOWN_CACHES.includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests — POST/PUT/DELETE go straight to network
  if (request.method !== 'GET') return;

  // 2. Skip Supabase API calls — data layer handled offline via IndexedDB in app code
  if (url.hostname.includes('supabase.co')) return;

  // 3. Skip other external origins (analytics, fonts, CDN)
  if (url.origin !== self.location.origin) {
    // Image cache for school logos etc from external storage
    if (request.destination === 'image') {
      event.respondWith(staleWhileRevalidate(request, IMAGES_CACHE));
    }
    return;
  }

  // 4. Skip Next.js API routes
  if (url.pathname.startsWith('/api/')) return;

  // 5. Skip HMR / dev websocket
  if (url.pathname.includes('__vite') || url.pathname.includes('__hmr')) return;

  // 6. JS / CSS / fonts / workers — cache-first, update in background
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf)$/) ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirstWithBackgroundUpdate(request, APP_SHELL_CACHE));
    return;
  }

  // 7. Images (local) — stale-while-revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGES_CACHE));
    return;
  }

  // 8. Navigation requests — return app shell (index.html) so SPA routing works offline
  if (request.mode === 'navigate') {
    event.respondWith(navigateFallback(request));
    return;
  }

  // 9. Everything else — network-first with cache fallback
  event.respondWith(networkFirstWithCache(request, APP_SHELL_CACHE));
});

// ─── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirstWithBackgroundUpdate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  // Kick off background update (don't await)
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  return cached ?? (await fetchPromise) ?? new Response('', { status: 503 });
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  return cached ?? (await fetchPromise) ?? new Response('', { status: 503 });
}

async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) ?? new Response('Offline', { status: 503 });
  }
}

async function navigateFallback(request) {
  // Try network first
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      // Cache the navigation response only for the exact URL
      cache.put(request, res.clone());
      return res;
    }
  } catch { /* offline */ }

  // Try cached version of this exact URL
  const cache = await caches.open(APP_SHELL_CACHE);
  const exact = await cache.match(request);
  if (exact) return exact;

  // Fall back to root (SPA shell) — the React router handles the path
  const root = await cache.match('/') ?? await cache.match('/login');
  if (root) return root;

  // Last resort: offline message
  return new Response(offlineHtml(), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function offlineHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PwezaCore — Offline</title>
<style>
  body { margin:0; font-family: system-ui, sans-serif; background:#05080f; color:#f1f5f9; display:flex; align-items:center; justify-content:center; min-height:100vh; flex-direction:column; gap:16px; text-align:center; padding:24px; }
  .logo { width:64px; height:64px; background:linear-gradient(135deg,#10d9a8,#4f8ef7); border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 8px; }
  h1 { font-size:22px; font-weight:800; margin:0; }
  p { font-size:14px; color:#94a3b8; margin:0; max-width:320px; line-height:1.6; }
  button { margin-top:12px; padding:10px 24px; border-radius:10px; background:#4f8ef7; color:#fff; border:none; font-size:14px; font-weight:600; cursor:pointer; }
</style>
</head>
<body>
  <div class="logo">🎓</div>
  <h1>You're offline</h1>
  <p>PwezaCore is loading from your device. Your data is saved locally and will sync when you reconnect.</p>
  <button onclick="location.reload()">Try again</button>
</body>
</html>`;
}

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'pweza-sync') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const all = await self.clients.matchAll({ type: 'window' });
  all.forEach((client) => client.postMessage({ type: 'PWEZA_SYNC_REQUESTED' }));
}

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'PwezaCore', body: 'New notification', url: '/dashboard' };
  try { data = { ...data, ...event.data?.json() }; } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'pwezacore',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      return existing ? existing.focus() : self.clients.openWindow(url);
    })
  );
});
