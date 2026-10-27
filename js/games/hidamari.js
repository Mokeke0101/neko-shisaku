// ひだまり ねこ（決め方：猫の気まぐれ〈ひだまり〉。見せ方の部品：床に並ぶ ざぶとんと、名前の札）。
// へやの床に ざぶとんが並ぶ。雲が流れるたびに、ひだまり（日の当たる所）が ざぶとんから ざぶとんへ うつる。
// ねむい猫は、ひだまりを追って ざぶとんを うつり、さいごに ひだまりで まるくなった ざぶとんが結果になる。
// 同じ「猫の気まぐれ」系統の はなびら うらない・ねこの ねがえり とは、決まり方（ひだまりを追う）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が ざぶとんで うとうと。ひだまりが ほかの ざぶとんへ うつる。
// 2. 猫が のびをして、ひだまりの ざぶとんへ うつり、まるくなる（1〜2回）。
// 3. さいごは雲が ちらちらして、ひだまりが2つの ざぶとんの間で ゆれてから、1つに落ちつく。
// 結果は先に乱数で決め（RS01-S14）、ひだまりの うつり方を、決めた ざぶとんで終わるように組む。
// ざぶとんと札はどれも同じ大きさ（出やすさは表れない：RS01-S21）。
// v17 の後（テーマパーク）：たたみで おおわず、季節の背景の 上に パステルの ざぶとん（あつみ）を ならべる。名前は クレーンの 値札と おなじ パステルの札。
// 動きの ちがい（3B：4つ）：ふつう・ちょうちょ（季節の生き物が 来て 目を さます）・くもり（大きな雲で ひだまりが きえ、さむくて まるまる）・
// ねぼう（さいごに ひだまりが うつっても 気づかず、「はっ！」と いそいで うつる）。
import { C } from '../art.js';
import { look as nowLook } from '../look.js';
import { seasonFlier } from '../kits.js';
import { catSitting, catCurled } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';
import { pastelTag } from './common.js';

// ひだまりが うつる ざぶとんの並び。はじめの ざぶとん（猫が ねている所）から始まり、決めた ざぶとん decided で終わる。
// 続けて同じ ざぶとんにならない。うつる回数は 2〜3。rand() は 0 以上 1 未満
export function sunPlan(n, decided, rand = Math.random) {
  const moves = n <= 2 ? 2 : 2 + Math.floor(rand() * 2);
  const seq = [decided];
  while (seq.length < moves + 1) {
    const next = seq[0];
    let j = Math.floor(rand() * (n - 1));
    if (j >= next) j++;
    seq.unshift(j);
  }
  return seq; // seq[0] が はじめの ざぶとん
}

// 動きの時間（ミリ秒）
const f = (v) => (Math.round(v * 100) / 100).toFixed(2);
export const T = { doze: 700, shift: 520, notice: 300, move: 620, curl: 300, rest: 380, flicker: 1100, settle: 500 };
export function hidamariDuration(moves) {
  return T.doze + (moves - 1) * (T.shift + T.notice + T.move + T.curl + T.rest) + T.flicker + T.settle + T.notice + T.move + T.curl;
}

export function createHidamari({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
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
    const colGap = 14;
    const colW = (W - 20 - colGap) / 2;
    const cellH = Math.min(170, (H - 12) / rows);
    const plateH = Math.max(22, Math.min(34, cellH * 0.34));
    const cushH = Math.max(22, Math.min(cellH - plateH - 10, colW * 0.6));
    const cushW = Math.min(colW * 0.78, cushH * 2.1);
    const top = 6 + Math.max(0, (H - 12 - cellH * rows) / 2);
    const cells = choices.map((_, i) => {
      const r = Math.floor(i / 2);
      const c = i % 2;
      const inRow = r === rows - 1 ? n - r * 2 : 2;
      const cx = 10 + colW / 2 + c * (colW + colGap) + (inRow === 1 ? (colW + colGap) / 2 : 0);
      const y = top + r * cellH;
      return { cx, cushY: y + 2 + cushH / 2, plateY: y + 4 + cushH + 2 };
    });
    const catK = Math.max(0.2, Math.min(0.72, (cushH * 0.95) / 92)); // まるくなった猫の大きさ
    const sitK = Math.max(0.16, Math.min(0.58, (cushH * 1.4) / 160));
    geo = { n, W, H, cells, colW, plateH, cushH, cushW, catK, sitK };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    s += `<defs><radialGradient id="hdSun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6c8" stop-opacity="1"/><stop offset="0.55" stop-color="#ffdf70" stop-opacity="0.75"/><stop offset="1" stop-color="#ffd75e" stop-opacity="0"/></radialGradient></defs>`;
    let minLabel = Infinity;
    cells.forEach((c, i) => {
      const label = choices[i];
      const size = Math.max(12, Math.min(22, plateH * 0.62, (colW - 16) / Math.max(charCount(label), 1)));
      minLabel = Math.min(minLabel, size);
      const col = ['#f7c4b4', '#cfe0ea', '#f6d58a', '#cfe3c0', '#ece2f4', '#fbe3ea'][i % 6];
      const deep = ['#e39a86', '#9fbdd0', '#d9b04d', '#9fbf8a', '#b9a3d0', '#e3a3b8'][i % 6];
      const x0 = c.cx - cushW / 2;
      const y0 = c.cushY - cushH / 2;
      s += `<g class="cush" data-i="${i}">`
        + `<rect x="${(x0 + 2).toFixed(1)}" y="${(y0 + 4).toFixed(1)}" width="${cushW.toFixed(1)}" height="${cushH.toFixed(1)}" rx="${(cushH * 0.3).toFixed(1)}" fill="#a0703f" opacity="0.15"/>`
        + `<rect x="${x0.toFixed(1)}" y="${(y0 + 5).toFixed(1)}" width="${cushW.toFixed(1)}" height="${cushH.toFixed(1)}" rx="${(cushH * 0.3).toFixed(1)}" fill="${deep}"/>`
        + `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${cushW.toFixed(1)}" height="${cushH.toFixed(1)}" rx="${(cushH * 0.3).toFixed(1)}" fill="${col}" stroke="${deep}" stroke-width="2.2"/>`
        + `<ellipse cx="${(c.cx - cushW * 0.18).toFixed(1)}" cy="${(y0 + cushH * 0.26).toFixed(1)}" rx="${(cushW * 0.22).toFixed(1)}" ry="${(cushH * 0.1).toFixed(1)}" fill="#ffffff" opacity="0.35"/>`
        + `<rect x="${(x0 + 5).toFixed(1)}" y="${(y0 + 5).toFixed(1)}" width="${(cushW - 10).toFixed(1)}" height="${(cushH - 10).toFixed(1)}" rx="${(cushH * 0.24).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="3 5" opacity="0.8"/>`
        + [[x0 + 3, y0 + 3], [x0 + cushW - 3, y0 + 3], [x0 + 3, y0 + cushH - 3], [x0 + cushW - 3, y0 + cushH - 3]].map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${deep}"/>`).join('')
        + `<g class="sun" opacity="0"><ellipse cx="${c.cx.toFixed(1)}" cy="${c.cushY.toFixed(1)}" rx="${(cushW * 0.9).toFixed(1)}" ry="${(cushH * 1.15).toFixed(1)}" fill="url(#hdSun)"/>`
        + [[-0.36, -0.3], [0.38, -0.22], [0.3, 0.32]].map(([dx, dy]) => `<path d="M${(c.cx + dx * cushW).toFixed(1)},${(c.cushY + dy * cushH - 5).toFixed(1)} l1.6,3.4 3.4,1.6 -3.4,1.6 -1.6,3.4 -1.6,-3.4 -3.4,-1.6 3.4,-1.6 Z" fill="#ffffff"/>`).join('') + '</g>'
        + `</g>`;
      s += `<g class="cell" data-i="${i}">`
        + pastelTag(i, c.cx - colW / 2 + 2, c.plateY, colW - 4, plateH)
        + `<text class="cell-label" x="${c.cx.toFixed(1)}" y="${(c.plateY + plateH / 2 + 0.5).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g>`;
    });
    s += `<rect class="hd-dim" x="0" y="0" width="${W}" height="${H}" fill="#7d8aa0" opacity="0" pointer-events="none"/>`;
    s += `<g class="hd-pos"><g class="hd-cat"></g></g>`;
    // 上を ながれる 雲と、ときどき来る 季節の生き物（v12。v13 から季節で かえる：kits.js の seasonFlier）
    s += `<g class="hd-cloud" transform="translate(-80 30)" opacity="0.9"><path d="M0,22 q-4,-14 10,-16 q4,-12 20,-8 q12,-8 24,2 q14,-2 14,12 q8,4 2,10 Z" fill="#ffffff" stroke="#e6eef4" stroke-width="2"/></g>`;
    s += `<g class="hd-fly" visibility="hidden">${seasonFlier(nowLook, '#fbd9e2').svg}</g>`;
    s += `<g class="hd-z"></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      suns: Array.from(svg.querySelectorAll('.sun')),
      cells: Array.from(svg.querySelectorAll('.cell')),
      pos: svg.querySelector('.hd-pos'),
      catG: svg.querySelector('.hd-cat'),
      z: svg.querySelector('.hd-z'),
      cloud: svg.querySelector('.hd-cloud'),
      fly: svg.querySelector('.hd-fly'),
      dim: svg.querySelector('.hd-dim'),
    };
    const start = Math.floor(Math.random() * n);
    curlOn(start);
    setSun(start, 1);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  // ざぶとん i の上で まるくなる
  function curlOn(i, mood = 'normal') {
    const c = geo.cells[i];
    refs.catG.innerHTML = catCurled(cat, { sleep: mood === 'normal', mood });
    refs.pos.setAttribute('transform', `translate(${c.cx.toFixed(1)} ${c.cushY.toFixed(1)}) scale(${geo.catK.toFixed(3)})`);
    refs.pos.dataset.on = String(i);
  }

  // すわった姿で x, y（足もと）に置く
  function sitAt(x, y, look) {
    refs.catG.innerHTML = catSitting(cat, { look });
    refs.pos.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - 78 * geo.sitK).toFixed(1)}) scale(${geo.sitK.toFixed(3)})`);
  }

  // ひだまりの明るさ（ざぶとん i を a に。ほかは そのまま）
  function setSun(i, a) {
    refs.suns[i].setAttribute('opacity', a.toFixed(3));
  }

  function clearSuns() {
    refs.suns.forEach((e) => e.setAttribute('opacity', '0'));
  }

  // ひだまりを from から to へ うつす
  async function shiftSun(from, to, dur) {
    audio.slide(dur / 1000);
    const cx0 = -80 + Math.random() * 40;
    await frames(dur, (t) => {
      refs.cloud.setAttribute('transform', `translate(${(cx0 + (geo.W + 120) * t).toFixed(1)} 30)`);
      setSun(from, 1 - t);
      setSun(to, t);
    });
  }

  // 猫が のびをして、ざぶとん to へ うつり、まるくなる
  async function moveCat(from, to, dur = T.move) {
    const a = geo.cells[from];
    const b = geo.cells[to];
    const footA = { x: a.cx, y: a.cushY + geo.cushH * 0.25 };
    const footB = { x: b.cx, y: b.cushY + geo.cushH * 0.25 };
    sitAt(footA.x, footA.y, { x: Math.sign(b.cx - a.cx) * 0.6, y: Math.sign(b.cushY - a.cushY) * 0.6 });
    audio.stretch(0.3);
    await wait(T.notice);
    const h = 26 + Math.abs(footB.y - footA.y) * 0.3;
    audio.hop(to);
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      refs.pos.setAttribute('transform', `translate(${(footA.x + (footB.x - footA.x) * e).toFixed(1)} ${(footA.y + (footB.y - footA.y) * e - Math.sin(Math.PI * t) * h - 78 * geo.sitK).toFixed(1)}) scale(${geo.sitK.toFixed(3)})`);
    });
    curlOn(to);
    audio.step(to);
    await wait(T.curl);
  }

  function puffZ(i) {
    const c = geo.cells[i];
    const t = svgEl('text', { x: (c.cx + geo.cushW * 0.25).toFixed(1), y: (c.cushY - geo.cushH * 0.35).toFixed(1), 'font-size': '18', 'font-weight': '700', fill: C.chestnut, opacity: '0' });
    t.textContent = 'z';
    refs.z.appendChild(t);
    t.animate([{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { transform: 'translate(12px,-28px)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => t.remove();
  }

  function lightCell(i) {
    const bg = refs.cells[i].querySelector('.cell-bg');
    bg.setAttribute('fill', '#fff1c4');
    bg.setAttribute('stroke', C.momiji);
    bg.setAttribute('stroke-width', '4');
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「ひなたぼっこ」を おしてね');
    play.textContent = 'ひなたぼっこ';
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
    const seq = sunPlan(n, decided);
    // はじめ：猫は seq[0] の ひだまりで うとうと
    clearSuns();
    curlOn(seq[0]);
    setSun(seq[0], 1);
    showHint(result, 'うとうと…');
    puffZ(seq[0]);
    await wait(T.doze);
    const vr = Math.random();
    const variant = vr < 0.25 && seq.length >= 3 ? 'fly' : vr < 0.5 ? 'kumo' : vr < 0.75 ? 'osoi' : 'plain';
    stage.dataset.variant = variant;
    const flyAt = variant === 'fly' ? 1 : -1;
    if (variant === 'kumo') {
      // くもり：大きな雲で ひだまりが きえて、さむくて まるまる。また 日が さす
      showHint(result, 'くもって きた…');
      const on = seq[0];
      audio.slide(0.4);
      await frames(240, (t) => { refs.dim.setAttribute('opacity', f(0.22 * t)); setSun(on, 1 - t); refs.cloud.setAttribute('transform', `translate(${f(-80 + (geo.W * 0.5) * t)} 30) scale(${f(1 + t)})`); });
      showHint(result, 'さむい…');
      const c = geo.cells[on];
      await frames(220, (t) => refs.pos.setAttribute('transform', `translate(${f(c.cx)} ${f(c.cushY)}) scale(${f(geo.catK * (1 - 0.1 * Math.sin(Math.PI * t)))})`));
      await frames(240, (t) => { refs.dim.setAttribute('opacity', f(0.22 * (1 - t))); setSun(on, t); refs.cloud.setAttribute('transform', `translate(${f(-80 + geo.W * 0.5 + (geo.W * 0.7) * t)} 30) scale(2)`); });
      curlOn(on);
    }
    // 1・2. ひだまりが うつり、猫が追いかける（さいごの1回の前まで）
    for (let k = 1; k < seq.length - 1; k++) {
      showHint(result, 'くもが ながれて…');
      await shiftSun(seq[k - 1], seq[k], T.shift);
      showHint(result, 'よっこいしょ');
      await moveCat(seq[k - 1], seq[k]);
      puffZ(seq[k]);
      await wait(T.rest);
      if (k === flyAt) {
        // ちょうちょ（季節の生き物）が来て、目を さます
        const c = geo.cells[seq[k]];
        showHint(result, `あ、${seasonFlier(nowLook).name}…`);
        curlOn(seq[k], 'happy');
        refs.fly.setAttribute('visibility', 'visible');
        await frames(900, (t) => refs.fly.setAttribute('transform', `translate(${(c.cx + geo.cushW * 0.6 - t * geo.cushW * 1.2).toFixed(1)} ${(c.cushY - geo.cushH * 0.9 - Math.sin(t * Math.PI * 3) * 10).toFixed(1)}) scale(${(1.7 * (1 - 0.3 * Math.abs(Math.sin(t * 20)))).toFixed(2)} 1.7)`));
        refs.fly.setAttribute('visibility', 'hidden');
        curlOn(seq[k]);
        showHint(result, 'すやぁ…');
      }
    }
    // 3. さいご：雲が ちらちらして、ひだまりが2つの間で ゆれてから、決めた ざぶとんに落ちつく
    const from = seq[seq.length - 2];
    const to = seq[seq.length - 1];
    showHint(result, 'ひだまりは どこ…？');
    audio.heart();
    await frames(T.flicker, (t) => {
      const w = 0.5 + 0.5 * Math.sin(t * Math.PI * 5);
      setSun(from, 1 - w * t);
      setSun(to, w * t + (1 - t) * 0.15);
    });
    await frames(T.settle, (t) => { setSun(from, (1 - t) * 0.2); setSun(to, 0.6 + 0.4 * t); });
    setSun(from, 0);
    setSun(to, 1);
    if (variant === 'osoi') {
      // ねぼう：気づかない → 「はっ！」 → いそいで うつる
      showHint(result, 'すやすや…');
      puffZ(from);
      await wait(380);
      showHint(result, 'はっ！');
      audio.pop();
      curlOn(from, 'happy');
      await wait(160);
      await moveCat(from, to, 420);
    } else {
      await moveCat(from, to);
    }
    const landed = Number(refs.pos.dataset.on); // 猫が まるくなった ざぶとん
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    curlOn(landed, 'happy');
    audio.stamp();
    lightCell(landed);
    refs.cells[landed].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    showResult(result, 'ここが いちばん あったかい', getChoices()[landed]);
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
