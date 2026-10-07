const CACHE_PREFIX = __CACHE_PREFIX__;
const CACHE_NAME = __CACHE_NAME__;
const PRECACHE = __PRECACHE__;
const ROOT = new URL('./', self.location.href);
const URLS = new Set(PRECACHE.map(path => new URL(path, ROOT).href));
const SHELL = new URL('index.html', ROOT).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(PRECACHE.map(path => new Request(new URL(path, ROOT), { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE_NAME).then(async cache =>
      (await cache.match(SHELL)) || fetch(request)));
  } else if (URLS.has(url.href)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache =>
      (await cache.match(request)) || fetch(request)));
  }
});
