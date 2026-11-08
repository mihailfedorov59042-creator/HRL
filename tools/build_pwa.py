from hashlib import sha256
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
files = ['index.html', 'manifest.webmanifest', 'pwa.js', 'pwa.css', 'hrl.css', 'hrl-search.js', 'hrl-barat-data.js', 'hrl-poem-notes.js']
for folder in ('gb', 'icons', 'reader'):
    files.extend(p.relative_to(root).as_posix() for p in sorted((root / folder).rglob('*')) if p.is_file())
digest = sha256()
for name in files:
    digest.update(name.encode() + b'\0' + (root / name).read_bytes() + b'\0')
script = '''// Generated from the complete static release.
const revision = __REVISION__;
const files = __FILES__;
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
'''
(root / 'sw.js').write_text(script.replace('__REVISION__', json.dumps(digest.hexdigest()[:16])).replace('__FILES__', json.dumps(files, indent=2)), encoding='utf-8')
print(f'HRL offline release: {len(files)} files')

