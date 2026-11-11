/* 離線快取：App 外殼先用快取，背景更新 */
const CACHE = 'acon-inspection-v12';
const ASSETS = [
  './', 'index.html', 'css/app.css', 'css/ninja.css', 'css/cyber.css', 'js/sites-master.js', 'js/store.js', 'js/export.js', 'js/app.js',
  'vendor/exceljs.min.js', 'vendor/jszip.min.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => cached);
    return cached || network;
  }));
});
