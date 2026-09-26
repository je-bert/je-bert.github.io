const CACHE_PREFIX = 'realsync-presentation-';
const CACHE_NAME = `${CACHE_PREFIX}v50`;
const APP_SHELL = [
  './', './index.html', './presentation.js', './pwa.js', './manifest.webmanifest',
  './assets/logo-white.svg',
  './assets/jeremie-realsync.jpg',
  './assets/logo-cameleon.avif', './assets/logo-rmb.webp', './assets/logo-joly.png',
  './assets/logo-cae.png', './assets/logo-mrc.png',
  './assets/interface-cameleon.png', './assets/interface-rmb.png', './assets/interface-joly.png',
  '../realsync/demo/icons/icon-192.png', '../realsync/demo/icons/icon-512.png',
  '../realsync/demo/icons/apple-touch-icon.png',
].map((path) => new URL(path, self.location.href).href);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  url.search = '';
  if (event.request.method !== 'GET' || !APP_SHELL.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url.href);
    // Keep each installed presentation version consistent, including offline.
    return cached || fetch(event.request);
  })());
});
