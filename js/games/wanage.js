// ねこの わなげ（決め方：当てる〈わなげ〉。見せ方の部品：しばふに立つ棒と、名前の札）。
// 縁日の わなげのように、しばふに立てた棒の前に選択肢の札を置く。猫が わを投げ、わが入った棒の札が結果になる。
// 同じ「当てる」系統の ねこパンチ まとあて とは、当たり方（まとあては玉が当たる、こちらは わが棒に入る・はじかれる）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が わを かまえて、ふわっと投げる。
// 2. はじめの わは、棒の上で はねて しばふに落ちる（1〜2回）。
// 3. さいごの わは、棒の上で くるくる ゆれてから、すとんと入る。
// 結果は先に乱数で決め（RS01-S14）、さいごの わを決めた棒へ、ほかの わを別の棒へ投げる。
// はじかれた わは しばふに落ちるだけで、札は そのまま読める（どの選択肢も残念がらせない：RS01-S15）。
// 棒と札はどれも同じ大きさ（出やすさは表れない：RS01-S21）。
// v17 の後（テーマパーク）：縁日の わなげ屋台。しましまの やね・パステルの 柱・ひな壇。地面は 描かず、まわりに 季節の背景が 見える。
// 棒は キャンディの しましま。札は クレーンの 値札と おなじ パステルの札（選択肢ごとに 色を かえる）。
// 動きの ちがい（3B：4つ）：ふつう・すっぽり（はねた わが 猫の あたまに）・かぜ（さいごの わが 風で ながされて もどる）・
// ぴょん（さいごの わが 棒の先で ぴょん ぴょん はねてから 入る）。
import { C } from '../art.js';
import { catSitting, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';
import { TINTS } from './common.js';

// ひな壇の 段の色（パステルの ペンキ）。おもて・ふち
const STEPS = [['#fbd9e2', '#e391ad'], ['#d6efe6', '#6fb39b'], ['#fde3a6', '#d9b04d'], ['#cfe0ea', '#7aa7c4'], ['#ece2f4', '#a985c9'], ['#f9d2a8', '#db8f4a']];

// 投げる先の並び。決めた棒 decided で終わる。前の わ（0〜2本）は decided 以外の棒。
// 投げる数は 1〜3（棒が2本なら 1〜2）。rand() は 0 以上 1 未満
export function tossPlan(n, decided, rand = Math.random) {
  const u = rand();
  const count = n <= 2 ? (u < 0.35 ? 1 : 2) : u < 0.15 ? 1 : u < 0.6 ? 2 : 3;
  const seq = [];
  for (let k = 0; k < count - 1; k++) {
    let j = Math.floor(rand() * (n - 1));
    if (j >= decided) j++;
    seq.push(j);
  }
  seq.push(decided);
  return seq;
}

// 1本を投げる時間（ミリ秒）。さいごの わは ゆれる時間を足す
export const tossTime = (last, only) => 520 + 720 + (last ? (only ? 1500 : 1000) + 220 : 520) + 280;

// 押してから結果が出るまでの、おおよその時間（ミリ秒）
export function wanageDuration(count) {
  let s = count === 1 ? 1200 : 600;
  for (let k = 0; k < count; k++) s += tossTime(k === count - 1, count === 1);
  return s;
}

// わ（中心 0,0、横の半径 r）。色 col
function ring(r, col, deep) {
  return `<ellipse cx="0" cy="0" rx="${r.toFixed(1)}" ry="${(r * 0.38).toFixed(1)}" fill="none" stroke="${deep}" stroke-width="${(r * 0.36).toFixed(1)}"/>`
    + `<ellipse cx="0" cy="0" rx="${r.toFixed(1)}" ry="${(r * 0.38).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${(r * 0.24).toFixed(1)}"/>`;
}
// わの 奥の半分（part='back'：棒の後ろ）と 手前の半分（part='front'：棒の前）。棒に入った わは、2つに分けて棒を はさむ
function ringHalf(r, col, deep, part) {
  const ry = (r * 0.38).toFixed(1);
  const d = `M${(-r).toFixed(1)},0 A${r.toFixed(1)},${ry} 0 0 ${part === 'back' ? 1 : 0} ${r.toFixed(1)},0`;
  return `<path d="${d}" fill="none" stroke="${deep}" stroke-width="${(r * 0.36).toFixed(1)}"/>`
    + `<path d="${d}" fill="none" stroke="${col}" stroke-width="${(r * 0.24).toFixed(1)}"/>`;
}
const RINGS = [['#f7a6a0', '#d97f7a'], ['#9fc5e8', '#6f9fcb'], ['#f3d36b', '#d4b043']];

export function createWanage({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const rows = Math.ceil(n / 2);
    const throwZone = Math.max(96, Math.min(160, H * 0.26));
    const awnH = Math.max(26, Math.min(40, H * 0.06)); // 屋台の やね
    const top = awnH + 12;
    const areaH = H - throwZone - top;
    const cellH = Math.min(96, areaH / rows);
    const colGap = 14;
    const colW = (W - 24 - colGap) / 2;
    const plateH = Math.max(24, Math.min(36, cellH * 0.42));
    const pegH = Math.max(14, cellH - plateH - 12);
    const ringR = Math.max(12, Math.min(26, colW * 0.13, pegH * 0.9));
    const startY = top + (areaH - cellH * rows) / 2;
    const pegs = choices.map((_, i) => {
      const r = Math.floor(i / 2);
      const c = i % 2;
      const inRow = r === rows - 1 ? n - r * 2 : 2;
      const cx = 12 + colW / 2 + c * (colW + colGap) + (inRow === 1 ? (colW + colGap) / 2 : 0);
      const plateY = startY + r * cellH + cellH - plateH - 4; // 札の上
      const base = plateY - 2; // 棒の根もと
      return { cx, base, tip: base - pegH, plateY, r };
    });
    const catS = Math.max(0.3, Math.min(0.62, throwZone / 190));
    const catAt = { x: W / 2, y: H - 6 - 78 * catS };
    const hand = { x: catAt.x + 40 * catS, y: catAt.y - 10 * catS };
    geo = { n, W, H, pegs, colW, plateH, pegH, ringR, catS, catAt, hand };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 屋台：おくの かべ・柱・しましまの やね・前の だい（地面は 描かない）
    const boothB = startY + cellH * rows + 8;
    s += `<defs><linearGradient id="wn-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e6f7"/><stop offset="1" stop-color="#fde9ee"/></linearGradient></defs>`;
    s += `<rect x="9" y="${(awnH + 2).toFixed(1)}" width="${W - 18}" height="${(boothB - awnH).toFixed(1)}" fill="#c97a6e" opacity="0.2"/>`
      + `<rect x="8" y="${awnH.toFixed(1)}" width="${W - 16}" height="${(boothB - awnH).toFixed(1)}" fill="url(#wn-back)"/>`;
    for (let yy = awnH + 12; yy < boothB - 6; yy += 16) for (let xx = 18 + ((Math.round(yy / 16)) % 2) * 8; xx < W - 14; xx += 16) s += `<circle cx="${xx}" cy="${yy.toFixed(1)}" r="1.4" fill="#f2bccb" opacity="0.6"/>`;
    // ひな壇（段ごとに パステルの ペンキ。上の面と 前の面で あつみ）
    for (let r = 0; r < rows; r++) {
      const [face, edge] = STEPS[r % STEPS.length];
      const rowB = startY + (r + 1) * cellH;
      const sy = rowB - plateH - 10;
      s += `<rect x="10" y="${(sy - 5).toFixed(1)}" width="${W - 20}" height="7" fill="#ffffff" opacity="0.7"/>`
        + `<rect x="10" y="${(sy + 2).toFixed(1)}" width="${W - 20}" height="${(rowB - sy + 2).toFixed(1)}" fill="${face}" stroke="${edge}" stroke-width="1.6"/>`
        + `<path d="M10,${(rowB + 3).toFixed(1)} H${W - 10}" stroke="${edge}" stroke-width="2.4" opacity="0.6"/>`;
    }
    // 柱（左右）
    [8, W - 8].forEach((x) => { s += `<rect x="${x - 5}" y="${awnH.toFixed(1)}" width="10" height="${(boothB - awnH + 10).toFixed(1)}" rx="4" fill="#f7b4a6" stroke="#c97a6e" stroke-width="2"/><path d="M${x - 2},${(awnH + 4).toFixed(1)} V${(boothB + 6).toFixed(1)}" stroke="#ffffff" stroke-width="2" opacity="0.5"/>`; });
    // 前の だい（ふちに あつみ）
    s += `<rect x="2" y="${(boothB + 2).toFixed(1)}" width="${W - 4}" height="12" rx="5" fill="#c97a6e" opacity="0.35"/>`
      + `<rect x="2" y="${(boothB - 2).toFixed(1)}" width="${W - 4}" height="12" rx="5" fill="#f7b4a6" stroke="#c97a6e" stroke-width="2"/>`
      + `<rect x="6" y="${boothB.toFixed(1)}" width="${W - 12}" height="3" rx="1.5" fill="#ffffff" opacity="0.5"/>`;
    // しましまの やね（すそは まるく）
    const k = Math.max(6, Math.round((W - 4) / 30));
    const sw = (W - 4) / k;
    s += `<rect x="1" y="4" width="${W - 2}" height="${(awnH - 4).toFixed(1)}" rx="4" fill="#c97a6e" opacity="0.25"/>`;
    for (let j = 0; j < k; j++) {
      const x0 = 2 + j * sw;
      s += `<path d="M${x0.toFixed(1)},2 h${sw.toFixed(1)} v${(awnH - 8).toFixed(1)} q${(-sw / 2).toFixed(1)},9 ${(-sw).toFixed(1)},0 Z" fill="${j % 2 ? '#fff6ea' : '#f7a6a0'}" stroke="#d98a7a" stroke-width="1.2"/>`;
    }
    s += `<path d="M2,2 H${W - 2}" stroke="#d98a7a" stroke-width="3" stroke-linecap="round"/>`;
    // かんばん
    s += `<g transform="translate(${(W / 2).toFixed(1)} ${(awnH + 2).toFixed(1)})"><rect x="-44" y="-2" width="88" height="22" rx="11" fill="#fff6ea" stroke="#d98a7a" stroke-width="2"/>`
      + `<text y="9.5" font-size="14" font-weight="700" fill="#c95f4c" text-anchor="middle" dominant-baseline="central" letter-spacing="2">わなげ</text></g>`;
    s += `<g class="wn-ground"></g>`;
    let minLabel = Infinity;
    pegs.forEach((p, i) => {
      const label = choices[i];
      const size = Math.max(12, Math.min(22, plateH * 0.62, (colW - 16) / Math.max(charCount(label), 1)));
      minLabel = Math.min(minLabel, size);
      const pw = colW - 4;
      const [col, edge] = TINTS[i % TINTS.length];
      const rx = Math.min(9, plateH / 2.4).toFixed(1);
      // キャンディの しましまの 棒
      let stripes = '';
      for (let y = p.tip + 6; y < p.base - 2; y += 9) stripes += `<path d="M${(p.cx - 3.5).toFixed(1)},${(y + 3).toFixed(1)} l7,-4" stroke="#f29bb5" stroke-width="2.6"/>`;
      s += `<g class="peg" data-i="${i}">`
        + `<ellipse cx="${p.cx.toFixed(1)}" cy="${p.base.toFixed(1)}" rx="${(ringR * 0.8).toFixed(1)}" ry="${(ringR * 0.22).toFixed(1)}" fill="#a0703f" opacity="0.16"/>`
        + `<g class="ring-back"></g>`
        + `<rect x="${(p.cx - 3.5).toFixed(1)}" y="${p.tip.toFixed(1)}" width="7" height="${geo.pegH.toFixed(1)}" rx="3" fill="#fff6ea" stroke="#d98a9c" stroke-width="1.4"/>`
        + stripes
        + `<circle cx="${p.cx.toFixed(1)}" cy="${p.tip.toFixed(1)}" r="5" fill="#f7a6a0" stroke="#d97f7a" stroke-width="1.6"/><circle cx="${(p.cx - 1.6).toFixed(1)}" cy="${(p.tip - 1.6).toFixed(1)}" r="1.5" fill="#ffffff" opacity="0.8"/>`
        + `<g class="ring-front"></g>`
        + `<g class="cell" data-i="${i}">`
        + `<rect x="${(p.cx - pw / 2 + 1).toFixed(1)}" y="${(p.plateY + 2).toFixed(1)}" width="${pw.toFixed(1)}" height="${plateH.toFixed(1)}" rx="${rx}" fill="${edge}" opacity="0.45"/>`
        + `<rect class="cell-bg" x="${(p.cx - pw / 2).toFixed(1)}" y="${p.plateY.toFixed(1)}" width="${pw.toFixed(1)}" height="${plateH.toFixed(1)}" rx="${rx}" fill="${col}" stroke="${edge}" stroke-width="2"/>`
        + `<rect x="${(p.cx - pw / 2 + 3).toFixed(1)}" y="${(p.plateY + 2.5).toFixed(1)}" width="${(pw - 6).toFixed(1)}" height="${(plateH * 0.28).toFixed(1)}" rx="${(plateH * 0.14).toFixed(1)}" fill="#ffffff" opacity="0.45"/>`
        + `<text class="cell-label" x="${p.cx.toFixed(1)}" y="${(p.plateY + plateH / 2 + 0.5).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g></g>`;
    });
    s += `<g class="wn-fly" visibility="hidden"></g>`;
    // 猫の よこの わの たば（v12）
    const pr = ringR * 0.8;
    for (let k = 0; k < 3; k++) {
      const [col, deep] = RINGS[k % RINGS.length];
      s += `<g transform="translate(${(catAt.x - 92 * catS - pr).toFixed(1)} ${(H - 8 - k * pr * 0.42).toFixed(1)})">${ring(pr, col, deep)}</g>`;
    }
    s += `<g transform="translate(${catAt.x.toFixed(1)} ${catAt.y.toFixed(1)}) scale(${catS.toFixed(3)})"><g class="wn-cat">${catSitting(cat, { look: { x: 0, y: -1 } })}</g><g class="wn-hat"></g></g>`;
    s += `<g class="wn-paw" visibility="hidden">${catPaw(cat, 30 * catS * 1.1)}</g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      ground: svg.querySelector('.wn-ground'),
      pegs: Array.from(svg.querySelectorAll('.peg')),
      fly: svg.querySelector('.wn-fly'),
      catG: svg.querySelector('.wn-cat'),
      paw: svg.querySelector('.wn-paw'),
      cells: Array.from(svg.querySelectorAll('.cell')),
    };
    refs.hat = svg.querySelector('.wn-hat');
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  function placeFly(x, y, scale, rot = 0) {
    refs.fly.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${scale.toFixed(3)})`);
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  // 投げた わが いま入っている棒（棒の先から下へ、わが いちばん近い棒）
  function pegAt(x, y) {
    let best = -1;
    let bestD = Infinity;
    geo.pegs.forEach((p, i) => {
      const d = Math.hypot(p.cx - x, (p.tip + p.base) / 2 - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  // 1本投げる（target の棒へ）。last なら入る、そうでなければ はじかれて しばふに落ちる
  async function toss(target, k, last, only, hat = false, odd = null) {
    const { hand, pegs, ringR, catS } = geo;
    const [col, deep] = RINGS[k % RINGS.length];
    const p = pegs[target];
    refs.fly.innerHTML = ring(ringR, col, deep);
    // かまえる
    setCat('normal', { x: (p.cx - hand.x) / geo.W, y: -1 });
    refs.paw.setAttribute('visibility', 'visible');
    refs.fly.setAttribute('visibility', 'visible');
    await frames(520, (t) => {
      const w = Math.sin(t * Math.PI * 2) * 6;
      refs.paw.setAttribute('transform', `translate(${(hand.x + w).toFixed(1)} ${(hand.y - 12 * catS - Math.sin(Math.PI * t) * 10).toFixed(1)})`);
      placeFly(hand.x + w, hand.y - 24 * catS - Math.sin(Math.PI * t) * 10, 1.1, w * 3);
    });
    refs.paw.setAttribute('visibility', 'hidden');
    // ふわっと投げる（遠いほど小さく見える）
    audio.toss();
    const from = { x: hand.x, y: hand.y - 24 * catS };
    const to = { x: p.cx, y: p.tip - 4 };
    const h = 60 + (from.y - to.y) * 0.35;
    // かぜ：わが 横へ ながされて、また もどる
    const drift = last && odd === 'kaze' ? (to.x > geo.W / 2 ? -1 : 1) * geo.W * 0.28 : 0;
    if (drift) showHint(result, 'かぜが…！');
    await frames(drift ? 1100 : 720, (t) => {
      const e = ease.inOutSine(t);
      placeFly(from.x + (to.x - from.x) * e + Math.sin(Math.PI * t) * drift, from.y + (to.y - from.y) * e - Math.sin(Math.PI * t) * h, 1.1 - 0.2 * e, 360 * 2 * t);
    });
    if (drift) showHint(result, 'もどってきた…！');
    if (last && odd === 'pyon') {
      // ぴょん：棒の先で ぴょん ぴょん はねる
      showHint(result, 'ぴょん… ぴょん…');
      for (let q = 0; q < 2; q++) {
        audio.ping(q, 1);
        await frames(300, (t) => placeFly(to.x, to.y - Math.sin(Math.PI * t) * (28 - q * 12), 0.9, (q ? -1 : 1) * 40 * t));
      }
    }
    if (!last && hat) {
      // すっぽり：はねた わが もどってきて、猫の あたまに
      audio.ping(k, 1);
      showHint(result, 'あれれ…');
      const head = { x: geo.catAt.x, y: geo.catAt.y - 66 * catS };
      await frames(620, (t) => placeFly(to.x + (head.x - to.x) * t, to.y + (head.y - to.y) * t - Math.sin(Math.PI * t) * 60, 0.9 + 0.2 * t, 300 * t));
      refs.fly.setAttribute('visibility', 'hidden');
      refs.hat.innerHTML = `<g transform="translate(0 -66) scale(${(1.1 / catS).toFixed(3)})">${ring(ringR, col, deep)}</g>`;
      setCat('happy', { x: 0, y: -1 });
      showHint(result, 'すっぽり！');
      audio.pop();
      await wait(420);
      return -1;
    }
    if (!last) {
      // 棒の先で はねて、しばふに落ちる
      audio.ping(k, 1);
      const side = Math.random() < 0.5 ? -1 : 1;
      const land = { x: p.cx + side * (ringR * 1.6 + 6), y: p.base + 4 };
      await frames(520, (t) => {
        placeFly(to.x + (land.x - to.x) * t, to.y + (land.y - to.y) * t * t - Math.sin(Math.PI * t) * 22, 0.9, side * 220 * t);
      });
      const g = svgEl('g', { transform: `translate(${land.x.toFixed(1)} ${land.y.toFixed(1)}) scale(0.9)`, opacity: '0.85' });
      g.innerHTML = ring(ringR, col, deep);
      refs.ground.appendChild(g);
      refs.fly.setAttribute('visibility', 'hidden');
      audio.tap();
      await wait(280);
      return -1;
    }
    // さいごの わ：棒の先で くるくる ゆれてから、すとんと入る
    audio.heart();
    setCat('strain', { x: 0, y: -1 });
    const wob = only ? 1500 : 1000;
    await frames(wob, (t) => {
      const a = Math.sin(t * Math.PI * 6) * 18 * (1 - t * 0.7);
      placeFly(to.x + Math.sin(t * Math.PI * 6) * 3, to.y + Math.abs(Math.sin(t * Math.PI * 3)) * 2, 0.9, a);
    });
    // 棒に通る：わを 奥と手前に分けて、棒を はさんだまま 根もとへ落とす
    const down = { x: p.cx, y: p.base - ringR * 0.42 }; // 手前の半分が 札に かからない高さ
    const peg = refs.pegs[target];
    const back = peg.querySelector('.ring-back');
    const front = peg.querySelector('.ring-front');
    back.innerHTML = ringHalf(ringR, col, deep, 'back');
    front.innerHTML = ringHalf(ringR, col, deep, 'front');
    refs.fly.setAttribute('visibility', 'hidden');
    const put = (y) => [back, front].forEach((el) => el.setAttribute('transform', `translate(${down.x.toFixed(1)} ${y.toFixed(1)}) scale(0.9)`));
    await frames(280, (t) => put(to.y + (down.y - to.y) * t * t));
    audio.stamp();
    await frames(220, (t) => put(down.y - Math.sin(Math.PI * t) * 3));
    const landed = pegAt(down.x, down.y);
    return landed;
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「なげる」を おしてね');
    play.textContent = 'なげる';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const plan = tossPlan(n, decided);
    const vr = Math.random();
    const variant = vr < 0.25 && plan.length >= 2 ? 'hat' : vr < 0.5 ? 'kaze' : vr < 0.75 ? 'pyon' : 'plain';
    stage.dataset.variant = variant;
    const hatAt = variant === 'hat' ? 0 : -1;
    showHint(result, 'どこに なげようかな…');
    // 1本だけの時は、はじめに長く ねらう（4秒を下回らないように）
    for (let k = 0; k < (plan.length === 1 ? 4 : 2); k++) {
      setCat('normal', { x: k % 2 ? 0.8 : -0.8, y: -1 });
      audio.hover(k);
      await wait(300);
    }
    let landed = -1;
    for (let k = 0; k < plan.length; k++) {
      const last = k === plan.length - 1;
      showHint(result, last ? (plan.length === 1 ? 'えいっ…！' : 'さいごの わ…！') : 'えいっ！');
      landed = await toss(plan[k], k, last, plan.length === 1, k === hatAt, variant);
    }
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    setCat('happy');
    const bg = refs.cells[landed].querySelector('.cell-bg');
    bg.setAttribute('fill', '#fff1c4');
    bg.setAttribute('stroke', C.momiji);
    bg.setAttribute('stroke-width', '4');
    refs.cells[landed].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    showResult(result, 'はいった！', getChoices()[landed]);
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
