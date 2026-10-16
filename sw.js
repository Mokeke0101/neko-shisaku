// 通信なしで動く仕組み（Service Worker）。RS01-S04・S12。
// 最初に開いた時に、下の一覧のファイルをすべて端末へ保存し、その後は保存したものを先に使う。
// 保存に無いものだけ置き場所へ取りに行き、取れなければそのまま失敗させる（別のもので代わりに出さない）。
// 公開し直す時は VERSION を上げる（js/version.js の APP_VERSION と同じ値にする）。
'use strict';

const VERSION = 'v3';
const CACHE = `nekokime-${VERSION}`;
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/version.js',
  './js/store.js',
  './js/audio.js',
  './js/wake.js',
  './js/art.js',
  './js/fx.js',
  './js/ui.js',
  './js/random.js',
  './js/odds.js',
  './js/settings.js',
  './js/cats.js',
  './js/calendar.js',
  './js/schedule.js',
  './yotei.txt',
  './js/games/roulette.js',
  './js/games/stamp.js',
  './js/games/nobi.js',
  './fonts/ZenMaruGothic-Medium.woff',
  './fonts/ZenMaruGothic-Bold.woff',
  './fonts/OFL.txt',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // STARTUP-FILES:BEGIN
  './icons/startup-1125x2436.png',
  './icons/startup-1170x2532.png',
  './icons/startup-1179x2556.png',
  './icons/startup-1206x2622.png',
  './icons/startup-1242x2688.png',
  './icons/startup-1260x2736.png',
  './icons/startup-1284x2778.png',
  './icons/startup-1290x2796.png',
  './icons/startup-1320x2868.png',
  './icons/startup-750x1334.png',
  './icons/startup-828x1792.png',
  // STARTUP-FILES:END
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 置き場所の HTTP キャッシュを通さず、置き場所から取り直す
    await cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('nekokime-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
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
