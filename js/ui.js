// 結果の欄と、ボタンの状態（3つのゲームで共通）。
import { GAME_CAT, CAT_DESIGN, designById, catFace, catName } from './cats.js';
import { store } from './store.js';
import { audio } from './audio.js';
import { jackpot } from './fx.js';
export function showHint(el, text) {
  el.classList.remove('is-pop');
  el.textContent = '';
  const p = document.createElement('span');
  p.className = 'result-hint';
  p.textContent = text;
  el.appendChild(p);
}

// 結果の ひとこと（v12）：ゲームの猫（アズ・イズ）が、毎回すこし ちがう言い方で しゃべる
const SAY = {
  snack: (label) => [`${label}…`, 'これに きまり！', 'きょうは これだにゃ', 'やったね！', 'これが いいにゃ'],
  coin: (label) => [`${label}…`, 'これに きまり！', 'どきどきしたにゃ', 'やったね！'],
};
export function sayOf(purpose, label, top) {
  if (top) return 'おおあたり！';
  const list = (SAY[purpose] || SAY.snack)(label);
  return list[Math.floor(Math.random() * list.length)];
}

export function showResult(el, label, value) {
  el.classList.remove('is-pop');
  el.textContent = '';
  const game = el.id.replace(/-result$/, '');
  const cat = GAME_CAT[game] ? designById(CAT_DESIGN[GAME_CAT[game]]) : null;
  const purpose = store.data ? store.data.purpose : 'snack';
  const coins = store.data ? store.data.coin : [];
  const top = purpose === 'coin' && coins.length > 1 && value === coins[coins.length - 1]; // お楽しみ袋の いちばん上の段階
  const a = document.createElement('span');
  a.className = 'result-label';
  if (cat) {
    a.classList.add('result-say');
    a.innerHTML = `<svg class="say-face" viewBox="-56 -56 112 112" aria-hidden="true">${catFace(cat, { mood: 'happy' })}</svg>`;
    a.append(`${catName(cat)}「${sayOf(purpose, label, top)}」`);
    el.dataset.say = a.textContent;
    audio.meow(cat.kind, 0.55);
  } else {
    a.textContent = label;
  }
  if (top) jackpot();
  const b = document.createElement('span');
  b.className = 'result-value';
  b.textContent = value;
  el.append(a, b);
  void el.offsetWidth; // 演出をやり直すため、いったん描き直させる
  el.classList.add('is-pop');
}

export function setBusy(view, busy) {
  view.querySelectorAll('.play, .back, .purpose-btn').forEach((b) => { b.disabled = busy; });
}

export function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// 文字の数（サロゲートペアを1文字と数える）
export const charCount = (s) => Array.from(s).length;

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
