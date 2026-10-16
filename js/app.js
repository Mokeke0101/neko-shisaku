// ねこきめ（秋の見本）：画面の切り替え・起動・通信なしで動く仕組みの登録。
// 選択肢の用途の切り替え（RS01-S10）、猫の案（RS01-S20）、予定のテキスト（RS01-S13）もここでつなぐ。
import { APP_VERSION } from './version.js';
import { store, PURPOSES } from './store.js';
import { audio } from './audio.js';
import { wake } from './wake.js';
import { icons, logoSVG, menuArt, rotateSVG, sceneSVG } from './art.js';
import { setupFalling, clearCelebration } from './fx.js';
import { setupSettings, refreshSettings, renderStatus, setSchedule, renderCatStatus } from './settings.js';
import { DESIGNS, GAME_CAT, designById, catSitting, catFace } from './cats.js';
import { parseYotei, findOverlaps, lookup, dayNum } from './schedule.js';
import { LAST_YEAR } from './calendar.js';
import { createRoulette } from './games/roulette.js';
import { createStamp } from './games/stamp.js';
import { createNobi } from './games/nobi.js';

const $ = (id) => document.getElementById(id);

store.load();

// ---- 絵を置く ----
for (const kind of ['home', 'roulette', 'stamp', 'nobi', 'settings']) {
  $(`${kind}-scene`).innerHTML = sceneSVG(kind);
}
$('cats-scene').innerHTML = sceneSVG('settings');
const catOf = (kind) => designById(store.data.cats[kind]);
const catForGame = (game) => catOf(GAME_CAT[game]);
// 猫が出る絵を描き直す（猫の案を選び直した時も呼ぶ）
function paintCats() {
  $('home-logo').innerHTML = logoSVG(catOf('mike'), catOf('saba'));
  $('rotate-art').innerHTML = rotateSVG(catOf('mike'));
  document.querySelectorAll('.menu-art').forEach((el) => { el.innerHTML = menuArt(el.dataset.art, catForGame(el.dataset.art)); });
}
paintCats();
document.querySelectorAll('.menu-arrow').forEach((el) => { el.innerHTML = icons.chevron; });
document.querySelectorAll('.icon-back').forEach((el) => { el.innerHTML = icons.back; });
document.querySelectorAll('.icon-gear').forEach((el) => { el.innerHTML = icons.gear; });
document.querySelectorAll('.icon-plus').forEach((el) => { el.innerHTML = icons.plus; });

// ---- ゲーム ----
const games = {
  roulette: createRoulette({ view: $('view-roulette'), stage: $('roulette-stage'), result: $('roulette-result'), play: $('roulette-play'), getChoices: () => store.list(), getCat: () => catForGame('roulette') }),
  stamp: createStamp({ view: $('view-stamp'), stage: $('stamp-stage'), result: $('stamp-result'), play: $('stamp-play'), getChoices: () => store.list(), getCat: () => catForGame('stamp') }),
  nobi: createNobi({ view: $('view-nobi'), stage: $('nobi-stage'), result: $('nobi-result'), play: $('nobi-play'), getStages: () => store.list(), getCat: () => catForGame('nobi') }),
};

// ---- 決めるもの（おやつ・コイン）の切り替え。ゲームの間で共有する（RS01-S10） ----
function paintPurpose() {
  document.querySelectorAll('.purpose-btn').forEach((b) => {
    const on = b.dataset.purpose === store.data.purpose;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  document.body.dataset.purpose = store.data.purpose;
}
document.querySelectorAll('.purpose-btn').forEach((b) => {
  b.addEventListener('click', () => {
    const g = games[current];
    if ((g && g.isBusy()) || !(b.dataset.purpose in PURPOSES) || b.dataset.purpose === store.data.purpose) return;
    audio.tap();
    store.data.purpose = b.dataset.purpose;
    store.save();
    paintPurpose();
    if (g) g.reset();
  });
});
paintPurpose();

// ---- ねこの案（見比べて選ぶ：RS01-S20） ----
function renderCatCards() {
  for (const kind of ['mike', 'saba']) {
    const box = $(`cats-${kind}`);
    box.textContent = '';
    for (const d of DESIGNS.filter((x) => x.kind === kind)) {
      const on = store.data.cats[kind] === d.id;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cat-card' + (on ? ' is-on' : '');
      card.dataset.design = d.id;
      card.setAttribute('aria-pressed', String(on));
      card.innerHTML = `<span class="cat-fig"><svg viewBox="-84 -84 168 166">${catSitting(d)}</svg></span>`
        + `<span class="cat-text"><span class="cat-name">${d.label}　${d.name}</span><span class="cat-desc">${d.desc}</span>`
        + `<span class="cat-faces"><svg viewBox="-55 -55 110 100">${catFace(d, { mood: 'happy' })}</svg><svg viewBox="-55 -55 110 100">${catFace(d, { mood: 'strain' })}</svg></span>`
        + `<span class="cat-pick">${on ? 'えらんでいる' : 'これに する'}</span></span>`;
      card.addEventListener('click', () => {
        if (store.data.cats[kind] === d.id) return;
        audio.tap();
        store.data.cats[kind] = d.id;
        store.save();
        renderCatCards();
        paintCats();
        renderCatStatus();
      });
      box.appendChild(card);
    }
  }
}

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
  if (name === 'cats') renderCatCards();
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
  if (yotei.state === 'error') notices.push('予定のテキストを読めません（せっていの「季節と行事」を見てください）。');
  if (yotei.needsUpdate) notices.push(`行事のカレンダーは ${LAST_YEAR}年までです。アップデートが必要です。`);
  const el = $('home-notice');
  el.hidden = notices.length === 0;
  el.textContent = notices.join('');
}
wake.onChange = status;

// ---- 予定のテキスト（RS01-S13）。最初に開く時に端末へ保存し、その後は通信しない ----
const yotei = { state: 'loading', needsUpdate: false };
async function loadYotei() {
  let text;
  try {
    const res = await fetch('yotei.txt');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    yotei.state = 'error';
    setSchedule({ state: 'error', message: `予定のテキストを開けません（${e.message}）` });
    status();
    return;
  }
  const parsed = parseYotei(text);
  if (!parsed.ok) {
    yotei.state = 'error';
    setSchedule({ state: 'error', parsed, message: `予定のテキストに、書き方の誤りが ${parsed.errors.length} か所あります` });
    status();
    return;
  }
  const now = new Date();
  const today = lookup(parsed, dayNum(now.getFullYear(), now.getMonth() + 1, now.getDate()));
  yotei.state = 'ok';
  yotei.needsUpdate = today.needsUpdate;
  document.body.dataset.season = today.season ? today.season.id : '';
  document.body.dataset.event = today.event ? today.event.id : '';
  setSchedule({ state: 'ok', parsed, overlaps: findOverlaps(parsed) });
  status();
}

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
loadYotei();
views.home.falling.start();
document.body.dataset.view = 'home';
status();
wake.start();
setupServiceWorker();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
document.fonts.ready.then(() => { document.body.dataset.fontsReady = String(document.fonts.check('700 20px NekoMaru') && document.fonts.check('500 20px NekoMaru')); });
