
const CACHE_NAME = 'talivexa-ai-cache-v3';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/i18n.js',
  '/js/app.js',
  '/manifest.json',
  '/assets/icons/talivexa-logo.svg',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/images/founder-placeholder.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).catch(() =>
        caches.match('/index.html')
      );
    })
  );
});
