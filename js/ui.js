// 結果の欄と、ボタンの状態（3つのゲームで共通）。
export function showHint(el, text) {
  el.classList.remove('is-pop');
  el.textContent = '';
  const p = document.createElement('span');
  p.className = 'result-hint';
  p.textContent = text;
  el.appendChild(p);
}

export function showResult(el, label, value) {
  el.classList.remove('is-pop');
  el.textContent = '';
  const a = document.createElement('span');
  a.className = 'result-label';
  a.textContent = label;
  const b = document.createElement('span');
  b.className = 'result-value';
  b.textContent = value;
  el.append(a, b);
  void el.offsetWidth; // 演出をやり直すため、いったん描き直させる
  el.classList.add('is-pop');
}

export function setBusy(view, busy) {
  view.querySelectorAll('.play, .back').forEach((b) => { b.disabled = busy; });
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
