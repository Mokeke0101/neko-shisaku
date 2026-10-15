// ねこ試作：iPhone のホーム画面の Web アプリで、次を確かめるための試作。
// 通信なしで動くか・消音モードで音が鳴るか・画面が消えないか・暗い画面が出ないか・設定が残るか。
'use strict';

const APP_VERSION = 'v1'; // sw.js の VERSION と同じ値にする
const SETTINGS_KEY = 'neko-shisaku.settings.v1';
const DEFAULT_CHOICES = ['コイン 10枚', 'コイン 30枚', 'コイン 50枚', 'もう一回'];

const $ = (id) => document.getElementById(id);
const state = {
  started: false,
  audioCtx: null,
  fileBuffer: null,
  sentinel: null,
  wakeText: '未準備（「はじめる」を押してください）',
  lastTouch: Date.now(),
  settings: null,
  loadText: '-',
  saveBlocked: false,
  swText: '-',
  cacheText: '-',
  persistText: '-',
  audioText: '未準備',
  sceneIndex: 0,
  picking: false,
  events: [],
};

// ---- 出来事の記録（画面にだけ出す。外へは送らない） ----
function hhmmss(d = new Date()) {
  return d.toTimeString().slice(0, 8);
}
function logEvent(text) {
  state.events.unshift(`${hhmmss()} ${text}`);
  state.events.length = Math.min(state.events.length, 30);
  const ol = $('events');
  ol.textContent = '';
  for (const e of state.events) {
    const li = document.createElement('li');
    li.textContent = e;
    ol.appendChild(li);
  }
}

// ---- 状態の表示 ----
function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}
function setText(id, text, ok) {
  const el = $(id);
  el.textContent = text;
  el.classList.toggle('is-ok', ok === true);
  el.classList.toggle('is-ng', ok === false);
}
function audioSessionText() {
  if (!('audioSession' in navigator)) return '仕組みが無い（navigator.audioSession なし）';
  return navigator.audioSession.type;
}
function idleText() {
  const s = Math.floor((Date.now() - state.lastTouch) / 1000);
  return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`;
}
function render() {
  const sa = isStandalone();
  setText('st-standalone', sa ? 'はい' : 'いいえ（Safari で開いている）', sa);
  $('not-standalone').hidden = sa;
  setText('st-online', navigator.onLine ? 'あり' : 'なし', null);
  setText('st-sw', state.swText, navigator.serviceWorker && navigator.serviceWorker.controller ? true : null);
  setText('st-cache', state.cacheText, null);
  setText('st-persist', state.persistText, null);
  setText('st-audiosession', audioSessionText(), null);
  setText('st-audio', state.audioText, null);
  setText('st-wake', state.wakeText, state.sentinel && !state.sentinel.released ? true : null);
  setText('st-idle', idleText(), null);
  setText('st-load', state.loadText, state.saveBlocked ? false : null);
  setText('st-saved', state.settings && state.settings.savedAt ? new Date(state.settings.savedAt).toLocaleString('ja-JP') : 'まだ保存していない', null);
  setText('st-opens', state.settings ? `${state.settings.openCount} 回` : '-', null);
  $('diag').textContent = diagText();
}
function diagText() {
  return [
    `版: ${APP_VERSION}`,
    `時刻: ${new Date().toLocaleString('ja-JP')}`,
    `ホーム画面から開いた: ${isStandalone() ? 'はい' : 'いいえ'}`,
    `通信: ${navigator.onLine ? 'あり' : 'なし'}`,
    `通信なしで出す仕組み: ${state.swText}`,
    `保存したファイル: ${state.cacheText}`,
    `保存の確保: ${state.persistText}`,
    `音の種類の指定: ${audioSessionText()}`,
    `音の準備: ${state.audioText}`,
    `画面を消さない仕組み: ${state.wakeText}`,
    `最後に画面に触れてから: ${idleText()}`,
    `開いた回数: ${state.settings ? state.settings.openCount : '-'}`,
    `選択肢の数: ${state.settings ? state.settings.choices.length : '-'}`,
    `読み込み: ${state.loadText}`,
    `画面: ${screen.width}x${screen.height} 倍率 ${window.devicePixelRatio}`,
    `UA: ${navigator.userAgent}`,
  ].join('\n');
}

// ---- 1. 通信なしで出す仕組み ----
async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    state.swText = '使えない（この環境に Service Worker が無い）';
    logEvent('Service Worker が使えない');
    return;
  }
  state.swText = '準備中（ファイルを端末へ保存している）';
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    const worker = reg.installing || reg.waiting;
    if (worker) {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant' && !navigator.serviceWorker.controller) {
          state.swText = '失敗：ファイルを端末へ保存できなかった（通信を確かめて開き直してください）';
          logEvent('Service Worker の準備に失敗（保存できなかった）');
          render();
        }
      });
    }
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
    state.swText = '動いている（このページを制御中）';
    logEvent('Service Worker がページを制御');
    await refreshCacheStatus();
  } catch (e) {
    state.swText = `失敗：${e.name} ${e.message}`;
    logEvent(`Service Worker の登録に失敗：${e.message}`);
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    logEvent('新しい版の Service Worker に切り替わった（次に開いた時に新しい版の画面が出ます）');
    refreshCacheStatus();
  });
}
function refreshCacheStatus() {
  const ctrl = navigator.serviceWorker.controller;
  if (!ctrl) return Promise.resolve();
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (ev) => {
      const { version, total, cached } = ev.data;
      state.cacheText = `${cached} / ${total} 個（Service Worker の版 ${version}）${cached === total ? ' 完了' : ' 未完了'}`;
      render();
      resolve();
    };
    ctrl.postMessage({ type: 'status' }, [ch.port2]);
  });
}

// ---- 保存の確保 ----
async function refreshPersisted() {
  if (!navigator.storage || !navigator.storage.persisted) {
    state.persistText = '仕組みが無い';
    return;
  }
  state.persistText = (await navigator.storage.persisted()) ? '確保されている' : '確保されていない';
}
async function requestPersist() {
  if (!navigator.storage || !navigator.storage.persist) return;
  const granted = await navigator.storage.persist();
  state.persistText = granted ? '確保されている' : '確保されていない（求めたが認められなかった）';
  logEvent(`保存の確保を求めた：${granted ? '認められた' : '認められなかった'}`);
}

// ---- 2. 音 ----
function applyAudioSession() {
  if (!('audioSession' in navigator)) return;
  navigator.audioSession.type = $('snd-playback').checked ? 'playback' : 'auto';
}
async function ensureAudio() {
  applyAudioSession();
  if (!state.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new Ctx();
    logEvent('音の準備（AudioContext を作った）');
  }
  if (state.audioCtx.state !== 'running') {
    await state.audioCtx.resume();
  }
  state.audioText = `準備済み（状態 ${state.audioCtx.state}）`;
}
function playSynth() {
  const ctx = state.audioCtx;
  const now = ctx.currentTime;
  [1047, 1319, 1568].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const t = now + i * 0.1;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}
function playTick() {
  const ctx = state.audioCtx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}
async function playFile() {
  if (!state.fileBuffer) {
    const res = await fetch('sounds/chime.wav');
    if (!res.ok) throw new Error(`音ファイルを読めない（${res.status}）`);
    state.fileBuffer = await state.audioCtx.decodeAudioData(await res.arrayBuffer());
  }
  const src = state.audioCtx.createBufferSource();
  src.buffer = state.fileBuffer;
  src.connect(state.audioCtx.destination);
  src.start();
}
async function onSound(kind) {
  try {
    await ensureAudio();
    if (kind === 'synth') playSynth();
    else await playFile();
    logEvent(`${kind === 'synth' ? '合成音' : '音ファイル'}を鳴らした（指定 ${audioSessionText()}）`);
  } catch (e) {
    state.audioText = `失敗：${e.name} ${e.message}`;
    logEvent(`音を鳴らせなかった：${e.message}`);
  }
  render();
}
async function onPlaybackToggle() {
  // 指定を変えたら音の準備を作り直す（前の指定が残らないように）
  if (state.audioCtx) {
    await state.audioCtx.close();
    state.audioCtx = null;
    state.fileBuffer = null;
  }
  applyAudioSession();
  state.audioText = '未準備（次に音のボタンを押した時に準備します）';
  logEvent(`音の種類の指定を「${audioSessionText()}」にした`);
  render();
}

// ---- 3. 画面を消さない ----
async function requestWakeLock(reason) {
  if (!$('wake-on').checked) return;
  if (!('wakeLock' in navigator)) {
    state.wakeText = '使えない（navigator.wakeLock が無い）';
    render();
    return;
  }
  if (state.sentinel && !state.sentinel.released) return;
  try {
    const s = await navigator.wakeLock.request('screen');
    state.sentinel = s;
    state.wakeText = '動いている';
    logEvent(`画面を消さない仕組みを取った（${reason}）`);
    s.addEventListener('release', () => {
      state.wakeText = '外れた（画面に触れると取り直します）';
      logEvent('画面を消さない仕組みが外れた');
      render();
    });
  } catch (e) {
    state.wakeText = `失敗：${e.name} ${e.message}`;
    logEvent(`画面を消さない仕組みを取れなかった（${reason}）：${e.message}`);
  }
  render();
}
async function onWakeToggle() {
  if ($('wake-on').checked) {
    await requestWakeLock('入れた');
  } else if (state.sentinel && !state.sentinel.released) {
    await state.sentinel.release();
    state.wakeText = '使っていない（自分で切った）';
    logEvent('画面を消さない仕組みを自分で切った');
  } else {
    state.wakeText = '使っていない（自分で切った）';
  }
  render();
}

// ---- 4. 設定（選択肢） ----
function loadSettings() {
  let raw;
  try {
    raw = localStorage.getItem(SETTINGS_KEY);
  } catch (e) {
    state.saveBlocked = true;
    state.loadText = `失敗：端末の保存を読めない（${e.message}）。保存は止めています`;
    state.settings = { choices: DEFAULT_CHOICES.slice(), openCount: 0, savedAt: null };
    return;
  }
  if (raw === null) {
    state.settings = { choices: DEFAULT_CHOICES.slice(), openCount: 0, savedAt: null };
    state.loadText = '初めて（保存が無いので最初の選択肢を出した）';
  } else {
    try {
      const s = JSON.parse(raw);
      if (!Array.isArray(s.choices) || typeof s.openCount !== 'number') throw new Error('形が違う');
      state.settings = s;
      state.loadText = '端末の保存から読んだ';
    } catch (e) {
      state.saveBlocked = true;
      state.loadText = `失敗：保存の中身を読めない（${e.message}）。保存は止めています`;
      state.settings = { choices: DEFAULT_CHOICES.slice(), openCount: 0, savedAt: null };
      return;
    }
  }
  state.settings.openCount += 1;
  saveSettings('開いた回数を数えた');
}
function saveSettings(why) {
  if (state.saveBlocked) return;
  state.settings.savedAt = Date.now();
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    state.saveBlocked = true;
    state.loadText = `失敗：端末へ保存できない（${e.message}）`;
    logEvent(`保存できなかった：${e.message}`);
    return;
  }
  if (why) logEvent(`保存した（${why}）`);
}
function renderChoices() {
  const ol = $('choices');
  ol.textContent = '';
  state.settings.choices.forEach((c, i) => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'choice-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = c;
    input.addEventListener('change', () => {
      state.settings.choices[i] = input.value;
      saveSettings('選択肢を書き換えた');
      render();
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '消す';
    del.addEventListener('click', () => {
      if (state.settings.choices.length <= 2) {
        logEvent('選択肢は2つより減らせません');
        return;
      }
      state.settings.choices.splice(i, 1);
      saveSettings('選択肢を消した');
      renderChoices();
      render();
    });
    row.append(input, del);
    li.appendChild(row);
    ol.appendChild(li);
  });
}
function onAddChoice() {
  state.settings.choices.push(`選択肢 ${state.settings.choices.length + 1}`);
  saveSettings('選択肢を足した');
  renderChoices();
  render();
}

// ---- 5. 遊びと画面の切り替え ----
function randomIndex(n) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}
async function onPick() {
  if (state.picking) return;
  state.picking = true;
  $('pick-result').textContent = '';
  const items = Array.from($('choices').children);
  const n = items.length;
  const goal = randomIndex(n);
  const steps = n * 3 + goal;
  try {
    await ensureAudio();
  } catch (e) {
    logEvent(`音の準備に失敗：${e.message}`);
  }
  for (let k = 0; k <= steps; k++) {
    items.forEach((li, j) => li.classList.toggle('is-lit', j === k % n));
    if (state.audioCtx && state.audioCtx.state === 'running') playTick();
    await new Promise((r) => setTimeout(r, 60 + k * 6));
  }
  $('pick-result').textContent = state.settings.choices[goal];
  if (state.audioCtx && state.audioCtx.state === 'running') playSynth();
  logEvent(`ひとつ選んだ：${state.settings.choices[goal]}`);
  state.picking = false;
  render();
}
function onSceneNext() {
  const scenes = Array.from(document.querySelectorAll('.scene'));
  scenes[state.sceneIndex].classList.remove('is-shown');
  state.sceneIndex = (state.sceneIndex + 1) % scenes.length;
  scenes[state.sceneIndex].classList.add('is-shown');
  $('pick-result').textContent = '';
  logEvent(`画面を切り替えた（${scenes[state.sceneIndex].dataset.name}）`);
}

// ---- はじめる ----
async function onStart() {
  state.started = true;
  try {
    await ensureAudio();
    playSynth();
    logEvent('はじめる：音を鳴らした');
  } catch (e) {
    state.audioText = `失敗：${e.name} ${e.message}`;
    logEvent(`はじめる：音の準備に失敗：${e.message}`);
  }
  await requestWakeLock('はじめる');
  await requestPersist();
  $('start').textContent = 'もう一度準備する';
  render();
}

// ---- 起動 ----
function init() {
  $('ver').textContent = APP_VERSION;
  loadSettings();
  renderChoices();
  logEvent(`起動（ホーム画面から：${isStandalone() ? 'はい' : 'いいえ'}・通信：${navigator.onLine ? 'あり' : 'なし'}）`);

  $('start').addEventListener('click', onStart);
  $('snd-synth').addEventListener('click', () => onSound('synth'));
  $('snd-file').addEventListener('click', () => onSound('file'));
  $('snd-playback').addEventListener('change', onPlaybackToggle);
  $('wake-on').addEventListener('change', onWakeToggle);
  $('choice-add').addEventListener('click', onAddChoice);
  $('pick').addEventListener('click', onPick);
  $('scene-next').addEventListener('click', onSceneNext);
  $('diag-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(diagText());
      logEvent('記録用の欄を写した');
    } catch (e) {
      logEvent(`写せなかった：${e.message}（画面の写真で残してください）`);
    }
  });

  // 画面に触れた時刻を覚える。仕組みが外れていたら取り直す
  document.addEventListener('pointerdown', () => {
    state.lastTouch = Date.now();
    if (state.started && (!state.sentinel || state.sentinel.released)) requestWakeLock('画面に触れた');
  }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    logEvent(`画面の表示：${document.visibilityState === 'visible' ? '前に出た' : '後ろへ回った'}`);
    if (document.visibilityState === 'visible' && state.started) requestWakeLock('前に出た');
  });
  window.addEventListener('online', () => { logEvent('通信がつながった'); render(); });
  window.addEventListener('offline', () => { logEvent('通信が切れた'); render(); });

  refreshPersisted().then(render);
  setupServiceWorker().then(render);
  setInterval(render, 1000);
  render();
}

init();
