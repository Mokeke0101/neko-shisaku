// ねこきめ（秋の見本）：画面の切り替え・起動・通信なしで動く仕組みの登録。
import { APP_VERSION } from './version.js';
import { store } from './store.js';
import { audio } from './audio.js';
import { wake } from './wake.js';
import { icons, logoSVG, menuArt, rotateSVG, sceneSVG } from './art.js';
import { setupFalling, clearCelebration } from './fx.js';
import { setupSettings, refreshSettings, renderStatus } from './settings.js';
import { createRoulette } from './games/roulette.js';
import { createStamp } from './games/stamp.js';
import { createNobi } from './games/nobi.js';

const $ = (id) => document.getElementById(id);

store.load();

// ---- 絵を置く ----
for (const kind of ['home', 'roulette', 'stamp', 'nobi', 'settings']) {
  $(`${kind}-scene`).innerHTML = sceneSVG(kind);
}
$('home-logo').innerHTML = logoSVG();
$('rotate-art').innerHTML = rotateSVG();
document.querySelectorAll('.menu-art').forEach((el) => { el.innerHTML = menuArt(el.dataset.art); });
document.querySelectorAll('.menu-arrow').forEach((el) => { el.innerHTML = icons.chevron; });
document.querySelectorAll('.icon-back').forEach((el) => { el.innerHTML = icons.back; });
document.querySelectorAll('.icon-gear').forEach((el) => { el.innerHTML = icons.gear; });
document.querySelectorAll('.icon-plus').forEach((el) => { el.innerHTML = icons.plus; });

// ---- ゲーム ----
const games = {
  roulette: createRoulette({ view: $('view-roulette'), stage: $('roulette-stage'), result: $('roulette-result'), play: $('roulette-play'), getChoices: () => store.data.choices }),
  stamp: createStamp({ view: $('view-stamp'), stage: $('stamp-stage'), result: $('stamp-result'), play: $('stamp-play'), getChoices: () => store.data.choices }),
  nobi: createNobi({ view: $('view-nobi'), stage: $('nobi-stage'), result: $('nobi-result'), play: $('nobi-play'), getStages: () => store.data.stages }),
};

// ---- 画面の切り替え（1つのページの中で切り替える。ページを移らないので、画面を消さない仕組みが外れない） ----
const views = {};
document.querySelectorAll('.view').forEach((v) => {
  views[v.dataset.view] = { el: v, falling: setupFalling(v) };
});
let current = 'home';

function show(name) {
  if (name === current || !views[name]) return;
  const from = views[current];
  const to = views[name];
  clearCelebration();
  to.el.hidden = false;
  if (games[name]) games[name].reset();
  if (name === 'settings') refreshSettings();
  to.falling.start();
  requestAnimationFrame(() => {
    to.el.classList.add('is-shown');
    from.el.classList.remove('is-shown');
  });
  const old = current;
  current = name;
  document.body.dataset.view = name;
  setTimeout(() => {
    if (current !== old) {
      views[old].el.hidden = true;
      views[old].falling.stop();
    }
  }, 300);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (!b || b.disabled) return;
  audio.tap();
  show(b.dataset.go);
});

// 音は利用者の操作の中でしか始められないため、画面に触れるたびに準備を確かめる
for (const type of ['pointerdown', 'touchend', 'click']) {
  document.addEventListener(type, () => { audio.unlock(); }, { capture: true, passive: true });
}

// 大きさが変わった時（端末の回転など）はゲームを描き直す
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const g = games[current];
    if (g && !g.isBusy()) g.reset();
  }, 150);
});

// ---- 縦向き（RS01-S16）：横にされた時は、明るい画面で「たてに もどしてね」 ----
function checkOrientation() {
  const o = screen.orientation;
  const landscape = o ? o.type.startsWith('landscape') : window.matchMedia('(orientation: landscape)').matches;
  $('rotate').hidden = !landscape;
  document.body.dataset.orientation = landscape ? 'landscape' : 'portrait';
}
if (screen.orientation) screen.orientation.addEventListener('change', checkOrientation);
window.addEventListener('resize', checkOrientation);
checkOrientation();

// ---- 状態 ----
function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}
const offline = { text: '準備中', ok: null };
function status() {
  renderStatus({
    offline,
    wake: { text: wake.state, ok: wake.held() ? true : (wake.supported ? null : false) },
    standalone: { text: isStandalone() ? 'はい' : 'いいえ（Safari で開いています）', ok: isStandalone() },
    version: APP_VERSION,
  });
  const notices = [];
  if (!wake.supported) notices.push('この端末では、画面を消さない仕組みが使えません（iOS 18.4 以降が必要です）。');
  if (!isStandalone()) notices.push('ホーム画面に追加して、そこから開いてください。');
  const el = $('home-notice');
  el.hidden = notices.length === 0;
  el.textContent = notices.join('');
}
wake.onChange = status;

// ---- 通信なしで動く仕組み（Service Worker） ----
async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    offline.text = '使えません（Service Worker が無い）';
    offline.ok = false;
    status();
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    const worker = reg.installing || reg.waiting;
    if (worker) {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant' && !navigator.serviceWorker.controller) {
          offline.text = '失敗：ファイルを保存できませんでした（通信を確かめて開き直してください）';
          offline.ok = false;
          status();
        }
      });
    }
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    }
    await refreshCache();
    navigator.serviceWorker.addEventListener('controllerchange', refreshCache);
  } catch (e) {
    offline.text = `失敗：${e.name} ${e.message}`;
    offline.ok = false;
    status();
  }
}
function refreshCache() {
  const ctrl = navigator.serviceWorker.controller;
  if (!ctrl) return Promise.resolve();
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (ev) => {
      const { version, total, cached } = ev.data;
      offline.text = cached === total ? `完了（${cached}/${total}・${version}）` : `未完了（${cached}/${total}・${version}）`;
      offline.ok = cached === total;
      document.body.dataset.offlineReady = String(cached === total);
      status();
      resolve();
    };
    ctrl.postMessage({ type: 'status' }, [ch.port2]);
  });
}

// ---- 起動 ----
setupSettings();
views.home.falling.start();
document.body.dataset.view = 'home';
status();
wake.start();
setupServiceWorker();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
document.fonts.ready.then(() => { document.body.dataset.fontsReady = String(document.fonts.check('700 20px NekoMaru') && document.fonts.check('500 20px NekoMaru')); });
