// Offline support: network first (always fresh when online), cached copy when the network is gone. The whole app shell is cached on install, so the game opens offline after the first visit.
const CACHE = 'askew-v5';
const SHELL = ['./', 'index.html', 'config.js', 'style.css', 'theme.css', 'play.css', 'panels.css', 'assets/transitions.css', 'vendor/three.min.js', 'src/world.js', 'src/levels.js', 'src/i18n.js', 'src/audio.js', 'src/scene-fx.js', 'src/scene.js', 'src/ui.js', 'src/game.js', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-192.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  e.respondWith(Promise.race([fetch(r).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then((x) => x.put(r, c)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true })), new Promise((res) => setTimeout(() => caches.match(r, { ignoreSearch: true }).then((c) => c && res(c)), 3000))]).then((x) => x || caches.match(r, { ignoreSearch: true })));
});
