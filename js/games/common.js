// 版 v11 で足した12本のゲームが共通で使う部品。
// - createGame：押してから結果が出るまでの流れ（結果を先に決める・着地を確かめる・お祝い）を1か所にまとめる。
//   ゲームごとに違うのは、絵（draw）と動き（perform）だけ。perform は、動きが実際に止まった選択肢の番号を返す。
// - 名前の札（.cell と .cell-bg と .cell-label）：どのゲームも同じ形にする（tools/checklib.mjs の labelGeometry が測る）。
// 結果は先に乱数で決め、動きをその結果に合わせる（RS01-S14）。札はどれも同じ大きさ（出やすさは表れない：RS01-S21）。
import { C } from '../art.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

export const f = (n) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');

// 選択肢ごとの色（ガチャの カプセル・かんらんしゃの ゴンドラ など）。うすい色と、ふちの色
export const TINTS = [
  ['#f7b4a6', '#d98a7a'], ['#fde3a6', '#d9b04d'], ['#cfe3c0', '#86a256'], ['#cfe0ea', '#7aa7c4'],
  ['#ece2f4', '#a985c9'], ['#fbd9e2', '#e391ad'], ['#f9d2a8', '#db8f4a'], ['#d6efe6', '#6fb39b'],
  ['#e3dde9', '#8f8499'], ['#fff1b8', '#d4b043'], ['#f6c6c0', '#c97a6e'], ['#d9e6f7', '#6f8fcb'],
];

// 札の文字の大きさ：札の幅と高さに収まる大きさ（12 px 以上・max まで）。左右の すきまは 5 px ずつ（v12 で 7 → 5）
export function fitSize(label, w, h, max = 22) {
  const len = Math.max(charCount(label), 1);
  return Math.max(12, Math.min(max, (w - 10) / len, h * 0.64));
}

// 札を n 個、箱 box（x, y, w, h）の中に cols 列で並べる。最後の行は真ん中に寄せる
export function grid(n, box, cols, gap = 6) {
  const rows = Math.ceil(n / cols);
  const w = (box.w - gap * (cols - 1)) / cols;
  const h = (box.h - gap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const x = box.x + c * (w + gap) + ((cols - inRow) * (w + gap)) / 2;
    const y = box.y + r * (h + gap);
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, row: r, col: c };
  });
}

// 札の 材料（v16：白い板を やめ、あつみの ある 物に じかに書く）。face：おもて・edge：ふち・under：下の あつみ・grain：木目（無しは null）
export const MATS = {
  wood: { face: '#efcb93', edge: '#a8743f', under: '#8a5a32', grain: '#d9a868', nail: true },
  kraft: { face: '#e6c48f', edge: '#a8743f', under: '#9b6b3a', grain: null, tape: true },
  dark: { face: '#d9a868', edge: '#8a5a32', under: '#5a3a22', grain: '#c4925a', nail: true },
};

// テーマパークの 札（v17 の後：クレーンの 値札と おなじ）。選択肢ごとに パステル色を かえる
export function pastelMat(i) {
  const [face, edge] = TINTS[i % TINTS.length];
  return { face, edge, under: edge, grain: null };
}

// パステルの札の 下じき（かげ・おもて・つや）。文字は 呼ぶ側で書く。おもては class="cell-bg" か cls で わたす
export function pastelTag(i, x, y, w, h, cls = 'cell-bg', extra = '') {
  const [col, edge] = TINTS[i % TINTS.length];
  const rx = Math.min(9, h / 2.4);
  return `<rect x="${f(x + 1)}" y="${f(y + 2)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${edge}" opacity="0.45"/>`
    + `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${col}" stroke="${edge}" stroke-width="2"${extra}/>`
    + `<rect x="${f(x + 3)}" y="${f(y + 2.5)}" width="${f(Math.max(0, w - 6))}" height="${f(h * 0.28)}" rx="${f(h * 0.14)}" fill="#ffffff" opacity="0.45"/>`;
}

// 名前の札。badge を渡すと、左に番号の丸を付ける（色は tint）。mat は MATS の名前
export function plate(i, x, y, w, h, label, { badge = null, tint = null, mat = 'pastel', fill = null, max = 22 } = {}) {
  const m = mat === 'pastel' ? pastelMat(i) : MATS[mat] || MATS.wood;
  const rx = mat === 'pastel' ? Math.min(9, h / 2.4) : Math.min(5, h / 3);
  let s = `<g class="cell" data-i="${i}">`
    + `<rect x="${f(x + 1.5)}" y="${f(y + 3)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${m.under}" opacity="${mat === 'pastel' ? 0.45 : 0.7}"/>`
    + `<rect class="cell-bg" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${fill || m.face}" stroke="${m.edge}" stroke-width="2"/>`
    + (mat === 'pastel'
      ? `<rect x="${f(x + 3)}" y="${f(y + 2.5)}" width="${f(Math.max(0, w - 6))}" height="${f(h * 0.28)}" rx="${f(h * 0.14)}" fill="#ffffff" opacity="0.45"/>`
      : `<rect x="${f(x + 2.5)}" y="${f(y + 1.8)}" width="${f(Math.max(0, w - 5))}" height="2.2" rx="1.1" fill="#ffffff" opacity="0.35"/>`);
  if (m.grain && w > 40) s += `<path d="M${f(x + w * 0.55)},${f(y + h * 0.8)} q${f(w * 0.12)},1.6 ${f(w * 0.26)},-0.6" stroke="${m.grain}" stroke-width="1.2" fill="none"/>`;
  if (m.nail && h >= 22 && w > 60) s += `<circle cx="${f(x + w - 4.5)}" cy="${f(y + 4.5)}" r="1.4" fill="#8a7466"/><circle cx="${f(x + w - 4.5)}" cy="${f(y + h - 4.5)}" r="1.4" fill="#8a7466"/>`;
  if (m.tape) s += `<rect x="${f(x + w * 0.5 - 9)}" y="${f(y - 3)}" width="18" height="7" fill="#f6efd8" opacity="0.85" transform="rotate(-6 ${f(x + w * 0.5)} ${f(y)})"/>`;
  let tx = x + w / 2;
  let tw = w;
  let anchor = 'middle';
  if (badge !== null) {
    const br = Math.min(h * 0.36, 13);
    const bx = x + 6 + br;
    const [col, edge] = tint || [C.cream, C.momiji];
    s += `<circle cx="${f(bx)}" cy="${f(y + h / 2)}" r="${f(br)}" fill="${col}" stroke="${edge}" stroke-width="2"/>`
      + `<text x="${f(bx)}" y="${f(y + h / 2 + 0.5)}" font-size="${f(br * 1.1)}" font-weight="700" fill="#3e2a1e" text-anchor="middle" dominant-baseline="central">${badge}</text>`;
    tx = bx + br + 6;
    tw = x + w - tx + 8;
    anchor = 'start';
  }
  const size = fitSize(label, tw, h, max);
  const ink = mat === 'pastel' ? `fill="${C.ink}"` : 'fill="#3e2a1e" font-weight="700"';
  s += `<text class="cell-label" x="${f(tx)}" y="${f(y + h / 2)}" font-size="${f(size)}" ${ink} text-anchor="${anchor}" dominant-baseline="central">${escapeXml(label)}</text></g>`;
  return { svg: s, size };
}

// いちばん近い札の番号
export function nearest(cells, x, y) {
  let best = 0;
  let bd = Infinity;
  cells.forEach((c, i) => { const d = (c.cx - x) ** 2 + (c.cy - y) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
}

// 決めた札を光らせる
export function lightPlate(svg, i) {
  const bg = svg.querySelector(`.cell[data-i="${i}"] .cell-bg`);
  if (!bg) return;
  bg.setAttribute('fill', '#fff1c4');
  bg.setAttribute('stroke', C.momiji);
  bg.setAttribute('stroke-width', '4');
}

// 札をうすく光らせる（まよっている時）。on が false で もとに戻す
export function hintPlate(svg, i, on) {
  const bg = svg.querySelector(`.cell[data-i="${i}"] .cell-bg`);
  if (bg) bg.setAttribute('fill', on ? '#fff6dc' : bg.dataset.fill || MATS.wood.face);
}

// ちがう番号を ランダムに1つ（except を除く）
export function other(n, except, rand = Math.random) {
  if (n < 2) return except;
  let j = Math.floor(rand() * (n - 1));
  if (j >= except) j++;
  return j;
}

// 続けて同じにならない番号の並び（count 個）。最後は last
export function wander(n, count, last, rand = Math.random) {
  const seq = [last];
  while (seq.length < count) seq.unshift(other(n, seq[0], rand));
  return seq;
}

// 点の列 pts を なめらかに通る道（Catmull-Rom）。t は 0〜1。向き（ラジアン）も返す
export function along(pts, t) {
  const segs = pts.length - 1;
  const u = Math.min(segs - 1e-6, Math.max(0, t * segs));
  const k = Math.floor(u);
  const s = u - k;
  const p0 = pts[Math.max(0, k - 1)];
  const p1 = pts[k];
  const p2 = pts[k + 1];
  const p3 = pts[Math.min(segs, k + 2)];
  const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
  const dcr = (a, b, c, d) => 0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * s + 3 * (-a + 3 * b - 3 * c + d) * s * s);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y), a: Math.atan2(dcr(p0.y, p1.y, p2.y, p3.y), dcr(p0.x, p1.x, p2.x, p3.x)) };
}

// 選択肢の並びを まぜる（Fisher–Yates）
export function shuffle(a, rand = Math.random) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

// 押してから結果が出るまでの流れ。spec：
// - play：ボタンの文字。resultLabel：結果の上の言葉
// - draw(g)：SVG の中身を返す。g には n・W・H・cat・choices が入る。g に置き場などを書き足してよい
// - after(g)：描いた後に、要る要素を g に取っておく（任意）
// - perform(g, decided, say)：動き。動きが止まった選択肢の番号を返す
export function createGame({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }, spec) {
  let busy = false;
  const g = { stage };

  function render() {
    const choices = getChoices();
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    Object.assign(g, { choices, n: choices.length, W, H, cat: getCat() });
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    svg.innerHTML = spec.draw(g);
    stage.textContent = '';
    stage.appendChild(svg);
    g.svg = svg;
    svg.querySelectorAll('.cell-bg').forEach((bg) => { bg.dataset.fill = bg.getAttribute('fill'); });
    if (spec.after) spec.after(g);
    stage.dataset.count = String(g.n);
    stage.dataset.cat = g.cat.id;
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, `「${spec.play}」を おしてね`);
    play.textContent = spec.play;
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    showHint(result, '…'); // 前の結果を すぐに消す（音の準備を待つ間も、前の結果を出したままにしない）
    await audio.unlock();
    render();
    const weights = getWeights();
    if (weights.length !== g.n) throw new Error(`選択肢と重みの数が合わない: ${g.n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const landed = await spec.perform(g, decided, (text) => showHint(result, text));
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    lightPlate(g.svg, landed);
    g.svg.querySelector(`.cell[data-i="${landed}"]`).animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
    // お祝いの大きさ：お楽しみ袋では段階の並びの位置で変える（RS01-S15）。おやつでは真ん中の大きさ
    const level = getPurpose() === 'coin' ? levelOf(landed, g.n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    showResult(result, spec.resultLabel, getChoices()[landed]);
    const c = centerOf(result);
    celebrate(level, c.x, c.y - 30);
    await wait(600);
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
