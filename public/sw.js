const CACHE_NAME = 'gastoia-static-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/theme-init.js',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
];

const STATIC_EXT_REGEX =
  /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff|woff2|webmanifest)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Apenas requisições GET da própria origem podem usar cache
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // NUNCA cachear /api/*
  if (url.pathname.startsWith('/api/')) return;

  // Navegação SPA: rede primeiro, com fallback offline para index.html em cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Arquivos estáticos: cache-first com atualização em segundo plano
  if (
    url.pathname.startsWith('/assets/') ||
    STATIC_EXT_REGEX.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});
