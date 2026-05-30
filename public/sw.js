// Service worker — offline shell caching + Web Push notifications.

const CACHE = 'jyotish-ai-v1';
const PRECACHE = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Cache-first for icons/manifest; network-first (no cache) for everything else.
// API routes and Next.js internals are never cached.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, API routes, and Next.js internals
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/')
  ) return;

  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request))
    );
    return;
  }

  // Network-first for all other same-origin pages
  event.respondWith(
    fetch(request).catch(() => caches.match('/') ?? new Response('Offline', { status: 503 }))
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Astro Guide', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Astro Guide';
  const options = {
    body: data.body || 'Your report is ready.',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'astro-guide',
    data: { url: data.url || data.route || '/dashboard' },
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes(targetUrl) && 'focus' in c) {
        await c.focus();
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
