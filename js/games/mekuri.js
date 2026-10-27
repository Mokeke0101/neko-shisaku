// ぺらぺら めくり（決め方：めくる〈ページ〉。見せ方の部品：上で とじた めくりカードと、下の一覧）。
// 上で とじた めくりカードに、選択肢が1まいずつ書いてある。猫が ぺらぺら めくり、さいごに めくるのを やめた ページが結果になる。
// 同じ「めくる・集める」系統の にくきゅうスタンプ とは、決まり方（スタンプは押した ます、こちらは止まった ページ）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が ぺらぺら めくる。はじめは速く、だんだん ゆっくりになる。下の一覧で、いまの ページが光る。
// 2. さいごは、次の ページの はしを持ち上げては もどし、めくるか まよう。
// 結果は先に乱数で決め（RS01-S14）、めくる ページの並びを、決めた ページで終わるように組む。
// ページは どれも同じ大きさで、一覧の札も同じ大きさ（出やすさは表れない：RS01-S21）。
// v17 の後（テーマパーク）：めくりカードは ピンクの 台に立てた 卓上めくり（金の リング・紙の 重なり）。一覧は ラベンダーの ボードに、クレーンの 値札と おなじ パステルの札。
// 動きの ちがい（3B：4つ）：ふつう・めくりすぎ（1まい めくりすぎて もどす）・かぜ（ひゅうっと 風で 何まいも めくれる）・
// ふーっ（さいごの 1まいを 猫が 息で ふいて めくる）。
import { C } from '../art.js';
import { catSitting, catPaw, pawPrint } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';
import { TINTS, pastelTag } from './common.js';

// めくる ページの並び（いちばん上に出る ページの番号）。決めた ページ decided で終わり、続けて同じ ページにならない。
// めくる回数は 11〜14。rand() は 0 以上 1 未満
export function pageSequence(n, decided, rand = Math.random) {
  const count = 11 + Math.floor(rand() * 4);
  const seq = [decided];
  while (seq.length < count) {
    const next = seq[0];
    let j = Math.floor(rand() * (n - 1));
    if (j >= next) j++;
    seq.unshift(j);
  }
  return seq;
}

// k 回目（0 から）に めくる時間（ミリ秒）。後ほど ゆっくり
export const flipTime = (k, count) => 150 + 420 * Math.pow(k / Math.max(1, count - 1), 2.2);

// 押してから結果が出るまでの、おおよその時間（ミリ秒）
export function mekuriDuration(count) {
  let s = 500;
  for (let k = 1; k < count; k++) s += flipTime(k, count) + 60;
  return s + 2 * (520 + 260) + 500;
}

export function createMekuri({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
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
    // 上：めくりカード（右に猫）。下：一覧（2列）
    const rows = Math.ceil(n / 2);
    const listRowH = Math.max(30, Math.min(44, (H * 0.5) / rows));
    const listH = listRowH * rows;
    // カードと一覧を続けて置き、全体を上下の真ん中に寄せる
    const padH = Math.max(110, Math.min(300, H - listH - 4 - 18 - 18));
    const padTop = 18 + Math.max(0, (H - 4 - 18 - (padH + 18 + listH)) / 2);
    const listY = padTop + padH + 18;
    const catZone = Math.max(70, Math.min(110, W * 0.26));
    const padW = Math.min(300, W - catZone - 24);
    const padX = 10 + (W - catZone - 10 - padW) / 2;
    const colGap = 10;
    const colW = (W - 20 - colGap) / 2;
    const cells = choices.map((_, i) => {
      const r = Math.floor(i / 2);
      const c = i % 2;
      const inRow = r === rows - 1 ? n - r * 2 : 2;
      const x = 10 + c * (colW + colGap) + (inRow === 1 ? (colW + colGap) / 2 : 0);
      return { x, y: listY + r * listRowH, w: colW, h: listRowH - 6 };
    });
    const catS = Math.max(0.3, Math.min(0.62, catZone / 150));
    const catAt = { x: W - catZone / 2 - 4, y: padTop + padH - 78 * catS };
    geo = { n, W, H, padX, padTop, padW, padH, cells, catS, catAt };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // めくりカード：台紙と、とじ具
    // 木の台（うしろの 足と、下の 板）
    s += `<path d="M${(padX + padW * 0.5).toFixed(1)},${padTop} L${(padX + padW * 0.5 + 10).toFixed(1)},${(padTop + padH + 8).toFixed(1)}" stroke="#e39a8e" stroke-width="8" stroke-linecap="round"/>`;
    s += `<rect x="${(padX + 4).toFixed(1)}" y="${(padTop + 8).toFixed(1)}" width="${padW}" height="${padH}" rx="14" fill="#c97a6e" opacity="0.25"/>`;
    s += `<rect x="${padX.toFixed(1)}" y="${padTop}" width="${padW}" height="${padH}" rx="14" fill="#f7b4a6" stroke="#c97a6e" stroke-width="3"/>`;
    // 紙の 重なり（下の はしに 何まいも 見える）
    for (let q = 3; q >= 1; q--) s += `<rect x="${(padX + 6).toFixed(1)}" y="${(padTop + 8 + q * 2.4).toFixed(1)}" width="${(padW - 12).toFixed(1)}" height="${(padH - 14).toFixed(1)}" rx="10" fill="${q % 2 ? '#efe2cb' : '#f7eedd'}" stroke="#d9c09c" stroke-width="1"/>`;
    s += `<rect x="${(padX - 6).toFixed(1)}" y="${(padTop + padH - 4).toFixed(1)}" width="${padW + 12}" height="10" rx="5" fill="#f7b4a6" stroke="#c97a6e" stroke-width="2"/>`;
    s += `<g class="mk-under"></g><g class="mk-top"></g>`;
    // 金の リング
    for (let k = 0; k < 6; k++) {
      const rx = padX + padW * (0.14 + k * 0.144);
      s += `<ellipse cx="${rx.toFixed(1)}" cy="${(padTop + 3).toFixed(1)}" rx="4.5" ry="9" fill="none" stroke="#a8915a" stroke-width="3.4"/>`
        + `<ellipse cx="${rx.toFixed(1)}" cy="${(padTop + 3).toFixed(1)}" rx="4.5" ry="9" fill="none" stroke="#f1dc9a" stroke-width="1.4"/>`
        + `<circle cx="${rx.toFixed(1)}" cy="${(padTop + 11).toFixed(1)}" r="2.4" fill="#8a7466"/>`;
    }
    // コルクボード（一覧の 下じき）
    const lastC = cells[cells.length - 1];
    const boardY = listY - 8;
    const boardH = lastC.y + lastC.h + 8 - boardY;
    s += `<rect x="4" y="${(boardY + 3).toFixed(1)}" width="${W - 8}" height="${boardH.toFixed(1)}" rx="12" fill="#a985c9" opacity="0.3"/>`
      + `<rect x="4" y="${boardY.toFixed(1)}" width="${W - 8}" height="${boardH.toFixed(1)}" rx="12" fill="#efe6f7" stroke="#a985c9" stroke-width="2.4"/>`;
    // 一覧
    let minLabel = Infinity;
    cells.forEach((c, i) => {
      const label = choices[i];
      const size = Math.max(12, Math.min(22, c.h * 0.56, (c.w - 46) / Math.max(charCount(label), 1)));
      minLabel = Math.min(minLabel, size);
      s += `<g class="cell" data-i="${i}">`
        + pastelTag(i, c.x, c.y, c.w, c.h)
        + `<circle cx="${(c.x + 17).toFixed(1)}" cy="${(c.y + c.h / 2).toFixed(1)}" r="${Math.min(11, c.h * 0.36).toFixed(1)}" fill="#fffaf0" stroke="${TINTS[i % TINTS.length][1]}" stroke-width="1.6"/>`
        + `<text x="${(c.x + 17).toFixed(1)}" y="${(c.y + c.h / 2).toFixed(1)}" font-size="${Math.min(14, c.h * 0.42).toFixed(1)}" font-weight="700" fill="${C.chestnut}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`
        + `<text class="cell-label" x="${(c.x + 34 + (c.w - 40) / 2).toFixed(1)}" y="${(c.y + c.h / 2).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g>`;
    });
    // 猫と前足
    s += `<g transform="translate(${catAt.x.toFixed(1)} ${catAt.y.toFixed(1)}) scale(${catS.toFixed(3)})"><g class="mk-cat">${catSitting(cat, { look: { x: -1, y: 0.2 } })}</g></g>`;
    s += `<g class="mk-paw">${catPaw(cat, 30 * catS * 1.2)}</g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      under: svg.querySelector('.mk-under'),
      top: svg.querySelector('.mk-top'),
      catG: svg.querySelector('.mk-cat'),
      paw: svg.querySelector('.mk-paw'),
      cells: Array.from(svg.querySelectorAll('.cell')),
    };
    const start = Math.floor(Math.random() * n);
    drawPage(refs.top, start);
    refs.top.dataset.page = String(start);
    placePaw(0);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  // ページの絵（i 番目の選択肢）。ページ番号と、大きな文字
  function drawPage(g, i) {
    const { padX, padTop, padW, padH } = geo;
    const label = getChoices()[i];
    const len = Math.max(charCount(label), 1);
    const size = Math.max(16, Math.min(48, (padW - 40) / len, padH * 0.36));
    const tint = ['#fffaf0', '#fff6ea', '#fdfbf3'][i % 3];
    // ページの すみの 小さな絵（v12）：ページごとに 肉球・さかな・ハート・ほし を じゅんに
    const dx = padX + padW - 30;
    const dy = padTop + padH - 30;
    const doodle = [
      `<g transform="translate(${dx} ${dy})" opacity="0.55">${pawPrint('#f1b8a3', 14)}</g>`,
      `<g transform="translate(${dx} ${dy})" opacity="0.6"><path d="M-12,0 Q-2,-9 8,0 Q-2,9 -12,0 Z M8,0 L14,-6 L14,6 Z" fill="#cfe0ea" stroke="#7aa7c4" stroke-width="1.4"/></g>`,
      `<g transform="translate(${dx} ${dy})" opacity="0.6"><path d="M0,8 C-12,-2 -8,-12 0,-5 C8,-12 12,-2 0,8 Z" fill="#fbd9e2" stroke="#e391ad" stroke-width="1.4"/></g>`,
      `<g transform="translate(${dx} ${dy})" opacity="0.6"><path d="M0,-10 L3,-3 L10,-3 L4,2 L6,9 L0,5 L-6,9 L-4,2 L-10,-3 L-3,-3 Z" fill="#fde3a6" stroke="#d9b04d" stroke-width="1.2"/></g>`,
    ][i % 4];
    g.innerHTML = `<rect x="${(padX + 6).toFixed(1)}" y="${(padTop + 8).toFixed(1)}" width="${(padW - 12).toFixed(1)}" height="${(padH - 14).toFixed(1)}" rx="10" fill="${tint}" stroke="#e6cfae" stroke-width="2"/>`
      + `<path d="M${(padX + 16).toFixed(1)},${(padTop + 22).toFixed(1)} H${(padX + padW - 16).toFixed(1)}" stroke="#f1b8a3" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`
      + `<circle cx="${(padX + padW / 2).toFixed(1)}" cy="${(padTop + 22 + padH * 0.13).toFixed(1)}" r="${Math.min(16, padH * 0.1).toFixed(1)}" fill="#fde3d6"/>`
      + `<text x="${(padX + padW / 2).toFixed(1)}" y="${(padTop + 22 + padH * 0.13).toFixed(1)}" font-size="${Math.min(18, padH * 0.11).toFixed(1)}" font-weight="700" fill="${C.momiji}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`
      + `<text x="${(padX + padW / 2).toFixed(1)}" y="${(padTop + padH * 0.62).toFixed(1)}" font-size="${size.toFixed(1)}" font-weight="700" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>` + doodle;
  }

  // ページの はしを持ち上げる形（lift 0〜1）。とじ具（上）を軸に、下から めくれる
  function liftTop(lift) {
    const { padTop } = geo;
    const sy = 1 - 2 * lift; // 1 → -1（裏返る）
    refs.top.setAttribute('transform', `translate(0 ${padTop}) scale(1 ${sy.toFixed(3)}) translate(0 ${-padTop})`);
    refs.top.setAttribute('opacity', sy < -0.1 ? '0' : '1');
  }

  // 猫の前足（p 0〜1：カードの右下の角から、持ち上げた所まで）
  function placePaw(p) {
    const { padX, padTop, padW, padH } = geo;
    const x = padX + padW - 14;
    const y = padTop + padH - 10 - p * padH * 0.5;
    refs.paw.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }

  function lightCell(i, strong = false) {
    refs.cells.forEach((g, k) => {
      const bg = g.querySelector('.cell-bg');
      const on = k === i;
      const [col, edge] = TINTS[k % TINTS.length];
      bg.setAttribute('fill', on ? (strong ? '#fff1c4' : '#fff8e4') : col);
      bg.setAttribute('stroke', on && strong ? C.momiji : on ? C.woodDeep : edge);
      bg.setAttribute('stroke-width', on && strong ? '4' : on ? '2.6' : '2');
    });
  }

  // 1まい めくる：いまの ページが上へ めくれて、下の ページ next が出る
  async function flip(next, dur, k, paw = true) {
    drawPage(refs.under, next);
    audio.pluck(k);
    await frames(dur, (t) => { liftTop(ease.inOutSine(t)); placePaw(paw ? Math.sin(Math.PI * t) * 0.6 : 0); });
    drawPage(refs.top, next);
    refs.top.dataset.page = String(next);
    liftTop(0);
    placePaw(0);
    lightCell(next);
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「めくる」を おしてね');
    play.textContent = 'めくる';
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
    const seq = pageSequence(n, decided);
    // はじめの ページ（並びの さいしょ）にしておく
    drawPage(refs.top, seq[0]);
    refs.top.dataset.page = String(seq[0]);
    lightCell(seq[0]);
    showHint(result, 'ぺらぺら…');
    refs.catG.innerHTML = catSitting(cat, { look: { x: -1, y: 0.4 } });
    await wait(500);
    const vr = Math.random();
    const variant = n < 2 ? 'plain' : vr < 0.25 ? 'back' : vr < 0.5 ? 'wind' : vr < 0.75 ? 'fu' : 'plain';
    stage.dataset.variant = variant;
    const windAt = Math.floor(seq.length * 0.45);
    // 1. ぺらぺら めくる（だんだん ゆっくり）
    for (let k = 1; k < seq.length; k++) {
      if (k === seq.length - 3) showHint(result, 'どこで とめようかな…');
      if (variant === 'wind' && k >= windAt && k < windAt + 3) {
        // かぜ：ひゅうっと 何まいも めくれる（手は 使わない）
        if (k === windAt) { showHint(result, 'ひゅう…！'); refs.catG.innerHTML = catSitting(cat, { mood: 'strain', look: { x: -1, y: 0.2 } }); }
        await flip(seq[k], 110, k, false);
        if (k === windAt + 2) { refs.catG.innerHTML = catSitting(cat, { look: { x: -1, y: 0.4 } }); showHint(result, 'ぺらぺら…'); }
        continue;
      }
      if (variant === 'fu' && k === seq.length - 1) {
        // ふーっ：さいごの 1まいは 息で ふいて めくる
        showHint(result, 'ふーっ');
        refs.catG.innerHTML = catSitting(cat, { mood: 'puff', look: { x: -1, y: 0.2 } });
        await wait(250);
        await flip(seq[k], 700, k, false);
        refs.catG.innerHTML = catSitting(cat, { look: { x: -1, y: 0.4 } });
        continue;
      }
      await flip(seq[k], flipTime(k, seq.length), k);
      await wait(60);
    }
    // めくりすぎ：1まい めくりすぎて、「あっ」と もどす
    if (variant === 'back') {
      let over = decided;
      while (over === decided) over = Math.floor(Math.random() * n);
      await flip(over, 420, seq.length);
      showHint(result, 'あっ、めくりすぎた！');
      refs.catG.innerHTML = catSitting(cat, { mood: 'strain', look: { x: -1, y: 0.4 } });
      await wait(240);
      // もどす：前の ページが 上から おりてくる
      drawPage(refs.under, over);
      drawPage(refs.top, decided);
      refs.top.dataset.page = String(decided);
      audio.pluck(1);
      await frames(420, (t) => { liftTop(1 - ease.inOutSine(t)); placePaw(Math.sin(Math.PI * t) * 0.6); });
      liftTop(0);
      placePaw(0);
      lightCell(decided);
      showHint(result, 'どこで とめようかな…');
    }
    // 2. 次の ページの はしを持ち上げては もどす（まよう）
    let other = decided;
    while (n > 1 && other === decided) other = Math.floor(Math.random() * n);
    drawPage(refs.under, other);
    refs.catG.innerHTML = catSitting(cat, { mood: 'strain', look: { x: -1, y: 0.6 } });
    for (let k = 0; k < 2; k++) {
      audio.heart();
      await frames(520, (t) => { const l = Math.sin(Math.PI * t) * (k === 0 ? 0.18 : 0.28); liftTop(l); placePaw(l * 1.6); });
      await wait(260);
    }
    liftTop(0);
    placePaw(0);
    const landed = Number(refs.top.dataset.page); // いちばん上に のこった ページ
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    refs.catG.innerHTML = catSitting(cat, { mood: 'happy' });
    lightCell(landed, true);
    audio.stamp();
    refs.cells[landed].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    showResult(result, `${landed + 1} ページ`, getChoices()[landed]);
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
