// 通信なしで出す仕組み（Service Worker）。
// 最初に開いた時に、下の一覧のファイルをすべて端末へ保存する。
// その後は、保存したファイルを先に使う。保存に無いものだけ通信で取りに行き、
// 通信できなければそのまま失敗させる（別のファイルで代わりに出すことはしない）。
'use strict';

const VERSION = 'v1'; // app.js の APP_VERSION と同じ値にする
const CACHE = `neko-shisaku-${VERSION}`;
const FILES = [
  './',
  './index.html',
  './page2.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './sounds/chime.wav',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/startup-750x1334.png',
  './icons/startup-828x1792.png',
  './icons/startup-1125x2436.png',
  './icons/startup-1242x2688.png',
  './icons/startup-1170x2532.png',
  './icons/startup-1284x2778.png',
  './icons/startup-1179x2556.png',
  './icons/startup-1290x2796.png',
  './icons/startup-1206x2622.png',
  './icons/startup-1320x2868.png',
  './icons/startup-1260x2736.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 公開先の HTTP キャッシュを通さず、公開先から取り直す
    await cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('neko-shisaku-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    return fetch(req);
  })());
});

// ページからの問い合わせ：版と、保存したファイルの数を返す
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'status' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    event.ports[0].postMessage({ version: VERSION, total: FILES.length, cached: keys.length });
  })());
});
