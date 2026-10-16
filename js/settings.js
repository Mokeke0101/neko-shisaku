// 設定の画面：選択肢の調整（RS01-S09・S10）、お楽しみ袋の出やすさ（RS01-S21）、ねこ（RS01-S20）、季節と行事（RS01-S13）、
// 音（RS01-S11・D02）、状態の表示。
import { store, LIMITS, cleanLabel } from './store.js';
import { audio } from './audio.js';
import { icons } from './art.js';
import { CAT_DESIGN, designById } from './cats.js';
import { LEVELS, DEFAULT_LEVEL, weightsOf, percents } from './odds.js';
import { dayNum, fmt, fmtMD, lookup, naturalSeason } from './schedule.js';
import { FIRST_YEAR, LAST_YEAR } from './calendar.js';

const LISTS = {
  snack: { el: 'list-snack', make: (n) => `おやつ${n + 1}` },
  coin: { el: 'list-coin', make: (n) => `${n + 1}だんめ`, levels: true },
};

// お楽しみ袋の選択肢ごとの割合（%）を、選んだ出やすさから計算し直して並べ直す
function renderPercents(ol) {
  const shown = percents(weightsOf(store.data.coinLevels));
  ol.querySelectorAll('.odds-pct').forEach((el, i) => { el.textContent = `${shown[i]}%`; });
  ol.dataset.percents = shown.join(',');
}

// 出やすさを選ぶ3つのボタン（出やすい・ふつう・出にくい）
function levelPicker(ol, i) {
  const box = document.createElement('div');
  box.className = 'odds';
  const group = document.createElement('div');
  group.className = 'odds-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', `${i + 1}番目の出やすさ`);
  for (const l of LEVELS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'odds-btn';
    b.dataset.level = l.id;
    b.textContent = l.name;
    const paint = () => {
      const on = store.data.coinLevels[i] === l.id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    };
    paint();
    b.addEventListener('click', () => {
      if (store.data.coinLevels[i] === l.id) return;
      audio.tap();
      store.data.coinLevels[i] = l.id;
      save();
      group.querySelectorAll('.odds-btn').forEach((x) => {
        const on = x.dataset.level === l.id;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      renderPercents(ol);
    });
    group.appendChild(b);
  }
  const pct = document.createElement('span');
  pct.className = 'odds-pct';
  box.append(group, pct);
  return box;
}

function note(listEl, text) {
  let p = listEl.parentElement.querySelector('.choice-note');
  if (!text) { if (p) p.remove(); return; }
  if (!p) {
    p = document.createElement('p');
    p.className = 'choice-note';
    listEl.after(p);
  }
  p.textContent = text;
}

function renderList(key) {
  const def = LISTS[key];
  const ol = document.getElementById(def.el);
  const list = store.data[key];
  ol.textContent = '';
  list.forEach((label, i) => {
    const li = document.createElement('li');
    li.className = 'choice-row';
    const num = document.createElement('span');
    num.className = 'choice-num';
    num.textContent = String(i + 1);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'choice-input';
    input.value = label;
    input.maxLength = 16; // 絵文字を取り除く前の長さに余裕を持たせる。保存は8文字まで
    input.enterKeyHint = 'done';
    input.addEventListener('change', () => {
      const { value, hadEmoji } = cleanLabel(input.value);
      if (!value) {
        input.value = list[i];
        note(ol, '空にはできません。もとに戻しました。');
        return;
      }
      list[i] = value;
      input.value = value;
      note(ol, hadEmoji ? '絵文字は使えないため、取り除きました。' : (Array.from(value).length >= LIMITS.maxChars ? '8文字までにしました。' : ''));
      save();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'choice-del';
    del.setAttribute('aria-label', `${i + 1}番目を消す`);
    del.innerHTML = icons.cross;
    del.disabled = list.length <= LIMITS.min;
    del.addEventListener('click', () => {
      if (list.length <= LIMITS.min) return;
      list.splice(i, 1);
      if (def.levels) store.data.coinLevels.splice(i, 1);
      note(ol, '');
      save();
      renderList(key);
    });
    li.append(num, input, del);
    if (def.levels) {
      li.classList.add('has-odds');
      li.appendChild(levelPicker(ol, i));
    }
    ol.appendChild(li);
  });
  if (def.levels) renderPercents(ol);
  const add = document.querySelector(`[data-add="${key}"]`);
  add.disabled = list.length >= LIMITS.max;
}

function save() {
  store.save();
  renderStatus();
}

const set = (id, text, ok = null) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('is-ok', ok === true);
  el.classList.toggle('is-ng', ok === false);
};

export function renderStatus(extra = {}) {
  if (extra.offline) set('st-offline', extra.offline.text, extra.offline.ok);
  if (extra.wake) set('st-wake', extra.wake.text, extra.wake.ok);
  if (extra.standalone) set('st-standalone', extra.standalone.text, extra.standalone.ok);
  if (extra.version) set('st-version', extra.version, null);
  if (store.blocked) set('st-offline', store.loadState, false);
}

// ---- 季節と行事 ----
let schedule = { state: 'loading' }; // { state: 'loading' | 'ok' | 'error', parsed, overlaps, message }
export function setSchedule(s) {
  schedule = s;
  renderSchedule();
}

function describe(n) {
  const r = lookup(schedule.parsed, n);
  const season = r.season ? r.season.name : '-';
  let event = 'なし';
  if (r.event) event = `${r.event.name}（${fmtMD(r.event.from)}〜${fmtMD(r.event.to)}）`;
  // 重なった日は、期間の短い行事を出す（RS01-S13）。どの行事と重なったかも添える
  if (r.eventOverlap) event += `。重なり：${r.eventOverlap.map((p) => p.name).join('と')}。期間の短い方を出す`;
  const seasonText = r.seasonOverlap ? `${season}（重なり：${r.seasonOverlap.map((p) => p.name).join('・')}）` : season;
  return { season: seasonText, event, needsUpdate: r.needsUpdate, r };
}

export function renderSchedule() {
  const notes = document.getElementById('yotei-notes');
  if (!notes) return;
  notes.textContent = '';
  const addNote = (text, ng = false) => {
    const li = document.createElement('li');
    li.textContent = text;
    if (ng) li.className = 'is-ng';
    notes.appendChild(li);
  };
  const now = new Date();
  const today = dayNum(now.getFullYear(), now.getMonth() + 1, now.getDate());
  set('st-today', fmt(today));
  if (schedule.state === 'loading') { set('st-yotei', '読んでいます'); return; }
  if (schedule.state === 'error') {
    set('st-yotei', '読めません', false);
    // 季節と行事は決めない。ゲームは境目どおりの季節の見た目で、行事の飾りは出さない（依頼者が AI に任せた決め方。docs/決めたことの記録.md）
    set('st-season', `わかりません（ゲームは境目どおりの「${naturalSeason(today).name}」）`, false);
    set('st-event', 'わかりません（飾りは出さない）', false);
    set('st-overlap', '-');
    addNote(schedule.message, true);
    (schedule.parsed ? schedule.parsed.errors : []).forEach((e) => addNote(`${e.line ? `${e.line}行目：` : ''}${e.message}`, true));
    return;
  }
  set('st-yotei', `読めた（${FIRST_YEAR}〜${LAST_YEAR}年）`, true);
  const t = describe(today);
  set('st-season', t.season);
  set('st-event', t.event);
  set('st-overlap', schedule.overlaps.length ? `${schedule.overlaps.length} か所` : 'なし', schedule.overlaps.length ? false : true);
  schedule.overlaps.forEach((o) => addNote(`${o.type === 'season' ? '季節' : '行事'}の重なり：${o.text}`, true));
  if (t.needsUpdate) addNote(`行事のカレンダーは ${LAST_YEAR}年までです。アップデートが必要です。節分とお月見は出しません。`, true);
}

function renderTry() {
  const input = document.getElementById('try-date');
  const out = document.getElementById('try-result');
  if (!input.value || schedule.state !== 'ok') { out.textContent = ''; return; }
  const [y, m, d] = input.value.split('-').map(Number);
  const n = dayNum(y, m, d);
  const t = describe(n);
  out.textContent = `${fmt(n)}：季節 ${t.season}／行事 ${t.event}${t.needsUpdate ? '／カレンダーの範囲の外（アップデートが必要）' : ''}`;
}

// ---- ねこ ----
export function renderCatStatus() {
  for (const kind of ['mike', 'saba']) {
    const d = designById(CAT_DESIGN[kind]);
    set(`st-cat-${kind}`, `${d.label}　${d.name}`);
  }
}

export function setupSettings() {
  renderList('snack');
  renderList('coin');
  for (const key of Object.keys(LISTS)) {
    document.querySelector(`[data-add="${key}"]`).addEventListener('click', () => {
      const list = store.data[key];
      if (list.length >= LIMITS.max) return;
      list.push(LISTS[key].make(list.length));
      if (LISTS[key].levels) store.data.coinLevels.push(DEFAULT_LEVEL);
      save();
      renderList(key);
      const inputs = document.querySelectorAll(`#${LISTS[key].el} .choice-input`);
      inputs[inputs.length - 1].focus();
    });
  }
  const sound = document.getElementById('opt-sound');
  const playback = document.getElementById('opt-playback');
  sound.checked = store.data.sound;
  playback.checked = store.data.playback;
  playback.disabled = !store.data.sound;
  sound.addEventListener('change', async () => {
    store.data.sound = sound.checked;
    playback.disabled = !sound.checked;
    save();
    audio.reset();
    if (sound.checked) { await audio.unlock(); audio.tap(); }
  });
  playback.addEventListener('change', async () => {
    store.data.playback = playback.checked;
    save();
    audio.reset();
    await audio.unlock();
    audio.tap();
  });
  document.getElementById('try-date').addEventListener('change', renderTry);
  renderCatStatus();
  renderSchedule();
}

export function refreshSettings() {
  renderList('snack');
  renderList('coin');
  renderCatStatus();
  renderSchedule();
  renderTry();
}

