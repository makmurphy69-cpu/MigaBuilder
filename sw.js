/* MigaBuilder offline support.
 * Pages: network first, so visitors always get the latest version when online,
 * falling back to the last copy seen when offline.
 * Styles, scripts and CDN libraries: served from cache and refreshed in the background.
 * Analytics, AI proxies and Wikipedia requests are never cached. */
'use strict';
const VERSION = 'miga-v12';
const PAGES = VERSION + '-pages';
const ASSETS = VERSION + '-assets';
const CDN = VERSION + '-cdn';
const CDN_LIMIT = 80;
const CORE = ['/', '/index.html', '/local-tools.css', '/tutorials.css', '/tutorials.js', '/miga-extras.js', '/miga-palette.js', '/usage-counter.js', '/i18n.js', '/home-i18n.js', '/favicon.svg', '/assets/icon-192.png', '/manifest.webmanifest', '/404.html'];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(PAGES).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const home = await cache.match('/index.html');
    return home || new Response('<h1>You are offline</h1><p>Open this page once while online to use it offline.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request).then(response => {
    // Opaque responses (status 0) come from CDN scripts loaded without CORS; they are still usable offline.
    if (response.ok || response.type === 'opaque') {
      cache.put(event.request, response.clone()).then(() => cacheName === CDN && trim(CDN, CDN_LIMIT));
    }
    return response;
  }).catch(() => cached || Response.error());
  if (cached) { event.waitUntil(refresh.catch(() => {})); return cached; }
  return refresh;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
      event.respondWith(networkFirst(request));
    } else if (!url.pathname.startsWith('/cloudflare-worker/') && !url.pathname.startsWith('/videos/') && !url.pathname.startsWith('/samples/') && !url.pathname.startsWith('/assets/demos/')) {
      // Videos and samples are large and use range requests, so they always come from the network.
      event.respondWith(staleWhileRevalidate(event, ASSETS));
    }
  } else if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event, CDN));
  }
});

// "Save every tool for offline use" (command palette): cache the pages it lists and report back.
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type !== 'precache' || !Array.isArray(data.urls)) return;
  const port = event.ports && event.ports[0];
  event.waitUntil(caches.open(PAGES).then(async cache => {
    let saved = 0;
    for (const url of data.urls.slice(0, 200)) {
      const u = new URL(url, self.location.origin);
      if (u.origin !== self.location.origin) continue;
      try { const r = await fetch(u.href, { cache: 'no-cache' }); if (r.ok) { await cache.put(u.href, r); saved++; } } catch (e) {}
    }
    if (port) port.postMessage({ saved: saved, total: data.urls.length });
  }));
});
