// PSR CRM Service Worker — v1.0
// Enables PWA install prompt + offline caching

const CACHE_NAME = 'psrcrm-v1';

// Files to cache on install (shell assets)
const PRECACHE_URLS = [
  '/recrm/',
  '/recrm/index.html',
  '/recrm/manifest.json',
];

// ── Install: pre-cache shell ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting(); // Activate immediately
    })
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim(); // Take control of all open tabs
    })
  );
});

// ── Fetch: network-first for API calls, cache-first for assets ──
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Skip non-GET, chrome-extension, and third-party API requests
  if (event.request.method !== 'GET') return;
  if (url.startsWith('chrome-extension')) return;
  if (url.includes('googleapis.com') || url.includes('firestore') || url.includes('firebase')) return;
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return;
  if (url.includes('cdn.jsdelivr.net')) return;
  if (url.includes('script.google.com')) return; // Apps Script calls — never cache

  // For the app shell (HTML + manifest): network-first, fall back to cache
  if (url.includes('/recrm/index.html') || url.endsWith('/recrm/') || url.includes('/recrm/manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
    return;
  }

  // For everything else: cache-first (fonts, icons, static assets)
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      });
    })
  );
});
