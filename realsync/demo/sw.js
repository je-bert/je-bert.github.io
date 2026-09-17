// Bump the version when changing the offline app shell.
const CACHE_PREFIX = 'realsync-demo-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_URL = new URL('./boucle-ia.html', self.location.href).href;
const APP_SHELL = [
  './boucle-ia.html',
  './pwa.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
].map((path) => new URL(path, self.location.href).href);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Only handle this demo's known assets. Other pages and external links
  // retain their normal network behavior, even within the worker's scope.
  url.search = '';
  if (request.method !== 'GET' || !APP_SHELL.includes(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url.href);
    const refresh = (async () => {
      const response = await fetch(request);
      if (response.ok && !response.redirected) {
        await cache.put(url.href, response.clone());
      }
      return response;
    })();
    // Keep the worker alive until any cache write has completed.
    event.waitUntil(refresh.catch(() => {}));
    // Fetch the latest demo online; retain the cached copy for offline launch.
    if (url.href === APP_URL) {
      try { return await refresh; }
      catch (error) { if (cached) return cached; throw error; }
    }
    return cached || refresh;
  })());
});
