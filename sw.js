const CACHE_NAME = 'oha-v1';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
