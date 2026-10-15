// 設定の画面：選択肢と段階の調整（RS01-S09・S10）、音（RS01-S11・D02）、状態の表示。
import { store, LIMITS, cleanLabel } from './store.js';
import { audio } from './audio.js';
import { icons } from './art.js';

const LISTS = {
  choices: { el: 'list-choices', make: (n) => `おやつ${n + 1}` },
  stages: { el: 'list-stages', make: (n) => `${n + 1}だんめ` },
};

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
      note(ol, '');
      save();
      renderList(key);
    });
    li.append(num, input, del);
    ol.appendChild(li);
  });
  const add = document.querySelector(`[data-add="${key}"]`);
  add.disabled = list.length >= LIMITS.max;
}

function save() {
  store.save();
  renderStatus();
}

export function renderStatus(extra = {}) {
  const set = (id, text, ok) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-ok', ok === true);
    el.classList.toggle('is-ng', ok === false);
  };
  if (extra.offline) set('st-offline', extra.offline.text, extra.offline.ok);
  if (extra.wake) set('st-wake', extra.wake.text, extra.wake.ok);
  if (extra.standalone) set('st-standalone', extra.standalone.text, extra.standalone.ok);
  if (extra.version) set('st-version', extra.version, null);
  if (store.blocked) set('st-offline', store.loadState, false);
}

export function setupSettings() {
  renderList('choices');
  renderList('stages');
  for (const key of Object.keys(LISTS)) {
    document.querySelector(`[data-add="${key}"]`).addEventListener('click', () => {
      const list = store.data[key];
      if (list.length >= LIMITS.max) return;
      list.push(LISTS[key].make(list.length));
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
}

export function refreshSettings() {
  renderList('choices');
  renderList('stages');
}
