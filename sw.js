// Generated from the complete static release.
const revision = "16e086d24022f163";
const files = [
  "index.html",
  "manifest.webmanifest",
  "pwa.js",
  "pwa.css",
  "hrl.css",
  "hrl-search.js",
  "hrl-barat-data.js",
  "hrl-poem-notes.js",
  "gb/book.svg",
  "gb/candle.svg",
  "gb/corner-dark.svg",
  "gb/corner.svg",
  "gb/divider-cross-dark.svg",
  "gb/divider-cross.svg",
  "gb/key.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "reader/data/b-lotman.js",
  "reader/data/lotman-theses.js",
  "reader/hrl-reader.css",
  "reader/hrl-study.js",
  "reader/index.html",
  "reader/notes-transfer.js"
];
const scope = self.registration.scope;
const prefix = 'hrl:' + scope + ':';
const cacheName = prefix + revision;
const urlFor = name => new URL(name, scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(files.map(name => new Request(urlFor(name), {cache:'reload'})));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const old = (await caches.keys()).filter(key => key.startsWith(prefix) && key !== cacheName);
    await Promise.all(old.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.source?.url.startsWith(scope) && event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(scope)) return;
  const request = event.request;
  const url = new URL(request.url);
  const pathname = url.pathname.slice(new URL(scope).pathname.length);
  const name = pathname === '' ? 'index.html' : pathname === 'reader/' ? 'reader/index.html' : pathname;
  if (!files.includes(name)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(urlFor(name)) || fetch(request);
  })());
});
