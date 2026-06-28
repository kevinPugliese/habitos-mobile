// Service Worker — Hábitos mobile PWA
// Network-first com fallback pra cache, escopo limitado aos assets do mobile.
// Bumpa o CACHE_VERSION quando mudar a estrutura dos assets cacheados.
const CACHE_VERSION = 'habitos-mobile-v2';
const PRECACHE = [
  './mobile.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Só intercepta GET same-origin — deixa cross-origin (ex: api.qrserver.com) passar direto
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        // Salva cópia no cache pra fallback offline (só respostas válidas)
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, clone)).catch(() => {});
        }
        return resp;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          // Pra navegações sem cache, devolve o shell do mobile.html
          if (req.mode === 'navigate') {
            return caches.match('./mobile.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
      )
  );
});

// Mensagem do app pra forçar atualização do cache
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
