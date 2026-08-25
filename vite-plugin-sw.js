/** Écrit sw.js dans dist/ avec la liste exacte des fichiers du build. */
export function precacheSw() {
  return {
    name: 'precache-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const assets = Object.keys(bundle)
        .filter((name) => !name.endsWith('.map'))
        .map((name) => '/' + name)
      const files = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', ...assets]
      const version = files.join('|')
      const cacheName = 'suivi-salle-' + hash(version)
      const source = swSource(cacheName, files)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

function swSource(cacheName, files) {
  return `/* global self, caches, fetch */
const CACHE = ${JSON.stringify(cacheName)};
const PRECACHE = ${JSON.stringify(files)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put('/index.html', res.clone());
    return res;
  } catch {
    return (await caches.match('/index.html')) || (await caches.match('/'));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, res.clone());
  }
  return res;
}
`
}
