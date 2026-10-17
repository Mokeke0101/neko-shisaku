// 通信なしで動く仕組み（Service Worker）。RS01-S04・S12。
// 最初に開いた時に、下の一覧のファイルをすべて端末へ保存し、その後は保存したものを先に使う。
// 保存に無いものだけ置き場所へ取りに行き、取れなければそのまま失敗させる（別のもので代わりに出さない）。
// 公開し直す時は VERSION を上げる（js/version.js の APP_VERSION と同じ値にする）。
'use strict';

const VERSION = 'v12';
const CACHE = `nekokime-${VERSION}`;
// 書体（約 4.2 MB）は版と分けて保存し、版を上げても取り直さない（RS01-S03）。書体のファイルを替えた時だけ FONT_VERSION を上げる
const FONT_VERSION = 'f1';
const FONT_CACHE = `nekokime-fonts-${FONT_VERSION}`;
const FONT_FILES = [
  './fonts/ZenMaruGothic-Medium.woff',
  './fonts/ZenMaruGothic-Bold.woff',
  './fonts/OFL.txt',
];
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
  './js/look.js',
  './js/scenes.js',
  './js/kits.js',
  './js/decor.js',
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
  './js/games/hana.js',
  './js/games/kuji.js',
  './js/games/amida.js',
  './js/games/race.js',
  './js/games/mato.js',
  './js/games/sugoroku.js',
  './js/games/otoshi.js',
  './js/games/maigo.js',
  './js/games/tower.js',
  './js/games/sagasu.js',
  './js/games/saikoro.js',
  './js/games/negaeri.js',
  './js/games/mekuri.js',
  './js/games/wanage.js',
  './js/games/tsuri.js',
  './js/games/tobiishi.js',
  './js/games/hidamari.js',
  './js/games/common.js',
  './js/games/crane.js',
  './js/games/gacha.js',
  './js/games/kanransha.js',
  './js/games/shabon.js',
  './js/games/jarashi.js',
  './js/games/hikoki.js',
  './js/games/watage.js',
  './js/games/himo.js',
  './js/games/hyokkori.js',
  './js/games/yubin.js',
  './js/games/daruma.js',
  './js/games/list.js',
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
    // 書体は、まだ保存していない時だけ取りに行く
    const fonts = await caches.open(FONT_CACHE);
    for (const f of FONT_FILES) {
      if (!(await fonts.match(f))) await fonts.add(new Request(f, { cache: 'reload' }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('nekokime-') && n !== CACHE && n !== FONT_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = (await cache.match(req, { ignoreSearch: true })) || (await (await caches.open(FONT_CACHE)).match(req, { ignoreSearch: true }));
    if (hit) return hit;
    return fetch(req);
  })());
});

// ページからの問い合わせ：版と、保存したファイルの数を返す
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'status' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const keys = await (await caches.open(CACHE)).keys();
    const fontKeys = await (await caches.open(FONT_CACHE)).keys();
    event.ports[0].postMessage({ version: VERSION, total: FILES.length + FONT_FILES.length, cached: keys.length + fontKeys.length });
  })());
});
