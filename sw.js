const CACHE_NAME = 'kanban-v1';

const FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/site/styles/main.css',
  '/site/scripts/main.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});