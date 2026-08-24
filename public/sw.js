const CACHE_NAME = 'smart-vyapar-v4.0.0';

// Core static assets to precache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './css/style.css?v=4.0.0',
  './js/billing.js?v=4.0.0',
  './js/voice.js?v=4.0.0',
  './js/pdf.js?v=4.0.0',
  './js/whatsapp.js?v=4.0.0',
  './js/dashboard.js?v=4.0.0',
  './js/pwa.js?v=4.0.0',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg'
];

// Install Event - Precache core assets & skip waiting
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing v3.0.0 - Purging old caches');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Precache notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Immediately claim clients and purge old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First for JS and API calls, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST to save bills or AI endpoints)
  if (request.method !== 'GET') {
    return;
  }

  // Network-First for JS and HTML (Ensures latest AI code is always executed)
  if (request.url.includes('.js') || request.url.includes('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-First for static assets (images, fonts, icons)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
