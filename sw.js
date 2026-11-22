// Offline support: network first (always fresh when online), cached copy when the network is gone. Covers the game files and the three.js CDN script.
const CACHE = 'vantage-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin && u.hostname !== 'cdnjs.cloudflare.com') return;
  e.respondWith(Promise.race([fetch(r).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then((x) => x.put(r, c)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true })), new Promise((res) => setTimeout(() => caches.match(r, { ignoreSearch: true }).then((c) => c && res(c)), 3000))]).then((x) => x || caches.match(r, { ignoreSearch: true })));
});
