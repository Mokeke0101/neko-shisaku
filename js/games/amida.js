// あしあと あみだ（決め方：線をたどる。見せ方の部品：横に並ぶ線と、右はしの札）。
// 子猫が、あみだくじの線を左から右へ たどる。たどり着いた右はしの札が結果になる。
// 縦の画面に12本の線を並べるため、線は横向きにした（上から下へ選択肢を並べる）。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 「あるく」を押すと、たての橋（横の線どうしをつなぐ線）が1本ずつ出る。
// 2. 子猫が、どこから歩きだすかを まよってから、左はしの1つに立つ。
// 3. 子猫が足あとを残しながら線をたどる。橋に来るたびに曲がるので、着くまで分からない。終わりに近づくと ゆっくりになる。
// 結果は先に乱数で決め（RS01-S14）、橋を作った後に、決めた札へ着く左はしを、歩きだす所にする。
// 札はどれも同じ大きさ（出やすさは札の大きさに表れない：RS01-S21）。
import { C } from '../art.js';
import { catFace, pawPrint } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

const COLS = 5; // 橋を置く たての列の数

// 橋を作る。ladder[c] は、列 c で、行 r と r+1 をつなぐ橋の r の一覧。
// 同じ列で、となりあう橋（r と r+1）は置かない（どちらへ曲がるかが1つに決まるように）。
// rand() は 0 以上 1 未満の数を返す
export function makeLadder(n, cols = COLS, rand = Math.random) {
  const ladder = [];
  for (let c = 0; c < cols; c++) {
    const rungs = [];
    for (let r = 0; r < n - 1; r++) {
      if (rungs.length && rungs[rungs.length - 1] === r - 1) continue;
      // 1つ前の列と同じ所には、なるべく置かない（すぐ戻るだけの橋になるため）
      const prev = c > 0 && ladder[c - 1].includes(r);
      if (rand() < (prev ? 0.15 : 0.5)) rungs.push(r);
    }
    if (!rungs.length && n > 1) rungs.push(Math.floor(rand() * (n - 1)));
    ladder.push(rungs);
  }
  return ladder;
}

// 左はしの行 start から たどった道。{ end: たどり着いた行, turns: [{ col, from, to }] }
export function trace(ladder, start) {
  let r = start;
  const turns = [];
  ladder.forEach((rungs, col) => {
    if (rungs.includes(r)) { turns.push({ col, from: r, to: r + 1 }); r += 1; }
    else if (rungs.includes(r - 1)) { turns.push({ col, from: r, to: r - 1 }); r -= 1; }
  });
  return { end: r, turns };
}

// 決めた行 target にたどり着く、左はしの行
export function startFor(ladder, n, target) {
  for (let s = 0; s < n; s++) if (trace(ladder, s).end === target) return s;
  throw new Error(`たどり着く左はしが無い: ${target}`); // あみだくじは並べ替えなので、ここには来ない
}

export function createAmida({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;
  let kitten = null;

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const cardX = 4;
    const cardW = W - 8;
    const spacing = Math.min(62, (H - 34) / n);
    const top = (H - spacing * n) / 2 + spacing / 2;
    const ys = choices.map((_, i) => top + i * spacing);
    const cardY = ys[0] - spacing / 2 - 6;
    const cardH = spacing * n + 12;
    const tagW = Math.max(112, Math.min(150, W * 0.38));
    const tagX = cardX + cardW - 8 - tagW;
    const xStart = cardX + 52;
    const xEnd = tagX - 12;
    const colX = Array.from({ length: COLS }, (_, c) => xStart + ((xEnd - xStart) * (c + 0.75)) / (COLS + 0.5));
    const th = Math.max(22, Math.min(40, spacing - 6));
    const kit = Math.max(26, Math.min(42, spacing * 1.05));
    geo = { n, W, H, ys, spacing, tagX, tagW, xStart, xEnd, colX, th, kit, cardX };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 紙
    s += `<rect x="${cardX + 3}" y="${cardY + 6}" width="${cardW}" height="${cardH}" rx="22" fill="#d9b07a" opacity="0.35"/>`;
    s += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="22" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="3"/>`;
    // 横の線と、左はしの立つ所
    let minLabel = Infinity;
    ys.forEach((y, i) => {
      s += `<path d="M${xStart},${y} H${xEnd + 6}" stroke="${C.chestnut}" stroke-width="3" stroke-linecap="round"/>`;
      s += `<circle class="start" data-i="${i}" cx="${xStart}" cy="${y}" r="5" fill="${C.cream}" stroke="${C.chestnut}" stroke-width="2.5"/>`;
      const len = Math.max(charCount(choices[i]), 1);
      const size = Math.max(12, Math.min(22, th * 0.62, ((tagW - 16) / len) * 0.98));
      minLabel = Math.min(minLabel, size);
      s += `<g class="tag" data-i="${i}">`
        + `<rect class="tag-bg" x="${tagX}" y="${y - th / 2}" width="${tagW}" height="${th}" rx="${Math.min(12, th / 2)}" fill="#ffffff" stroke="${C.woodDeep}" stroke-width="2"/>`
        + `<text class="cell-label" x="${tagX + tagW / 2}" y="${y}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(choices[i])}</text>`
        + `</g>`;
    });
    s += `<g class="rungs"></g>`;
    s += `<path class="trail" d="" fill="none" stroke="${C.momiji}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>`;
    s += `<g class="prints"></g>`;
    // 子猫（顔だけ。足あとで歩いたことを見せる）
    s += `<g class="kitten"><g class="kitten-in">${catFace(cat)}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      svg,
      rungs: svg.querySelector('.rungs'),
      trail: svg.querySelector('.trail'),
      prints: svg.querySelector('.prints'),
      kitten: svg.querySelector('.kitten'),
      kittenIn: svg.querySelector('.kitten-in'),
      tags: Array.from(svg.querySelectorAll('.tag')),
    };
    kitten = { x: cardX + 24, y: ys[Math.floor((n - 1) / 2)] + (n % 2 ? 0 : spacing / 2) };
    placeKitten(kitten.x, kitten.y);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  function placeKitten(x, y, lift = 0) {
    const k = geo.kit / 100;
    refs.kitten.setAttribute('transform', `translate(${x.toFixed(2)} ${(y - lift - geo.kit * 0.08).toFixed(2)}) scale(${k.toFixed(3)})`);
  }

  function setFace(mood, look = null) {
    refs.kittenIn.innerHTML = catFace(cat, { mood, look });
  }

  async function hopTo(p, dur) {
    const from = { ...kitten };
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      placeKitten(from.x + (p.x - from.x) * e, from.y + (p.y - from.y) * e, Math.sin(Math.PI * t) * 14);
    });
    kitten = { ...p };
  }

  function reset() {
    clearCelebration();
    render();
    if (geo) setFace('normal', { x: 1, y: 0 });
    showHint(result, '「あるく」を おしてね');
    play.textContent = 'あるく';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, ys, colX, xStart, tagX } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const ladder = makeLadder(n);
    const start = startFor(ladder, n, decided);
    stage.dataset.start = String(start);

    // 1. 橋が1本ずつ出る
    showHint(result, 'はしを かけるよ…');
    const all = [];
    ladder.forEach((rungs, c) => rungs.forEach((r) => all.push({ c, r })));
    const each = Math.min(90, 1100 / all.length);
    for (let k = 0; k < all.length; k++) {
      const { c, r } = all[k];
      const line = svgEl('path', { d: `M${colX[c]},${ys[r]} V${ys[r + 1]}`, stroke: C.chestnut, 'stroke-width': '3', 'stroke-linecap': 'round' });
      refs.rungs.appendChild(line);
      line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
      audio.rung(k);
      await wait(each);
    }
    await wait(250);

    // 2. どこから歩きだすか まよう
    showHint(result, 'どこから いこうかな…');
    const tries = [];
    for (let h = 0; h < 3; h++) {
      let r;
      do { r = Math.floor(Math.random() * n); } while (n > 2 && (r === start || r === tries[tries.length - 1]));
      tries.push(r);
    }
    for (const r of [...tries, start]) {
      setFace('normal', { x: 0.6, y: ys[r] < kitten.y ? -1 : 1 });
      audio.hop(r);
      await hopTo({ x: xStart - geo.kit * 0.55, y: ys[r] }, 300);
      await wait(120);
    }
    await wait(220);

    // 3. 足あとを残して たどる
    showHint(result, 'どっちに いくかな…');
    const { end, turns } = trace(ladder, start);
    const pts = [{ x: xStart, y: ys[start] }];
    for (const t of turns) {
      pts.push({ x: colX[t.col], y: ys[t.from] });
      pts.push({ x: colX[t.col], y: ys[t.to] });
    }
    pts.push({ x: tagX - 4, y: ys[end] });
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      segs.push({ a: pts[i - 1], b: pts[i], from: total, len });
      total += len;
    }
    const at = (d) => {
      const sg = segs.find((x) => d <= x.from + x.len) || segs[segs.length - 1];
      const u = sg.len ? Math.min(1, (d - sg.from) / sg.len) : 1;
      return { x: sg.a.x + (sg.b.x - sg.a.x) * u, y: sg.a.y + (sg.b.y - sg.a.y) * u, dx: sg.b.x - sg.a.x, dy: sg.b.y - sg.a.y };
    };
    refs.trail.setAttribute('d', 'M' + pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L'));
    refs.trail.setAttribute('stroke-dasharray', `${total.toFixed(2)} ${total.toFixed(2)}`);
    refs.trail.setAttribute('stroke-dashoffset', total.toFixed(2));
    const dur = Math.max(3400, Math.min(6200, (total / 120) * 1000));
    const gapPrint = Math.max(14, geo.spacing * 0.42);
    let nextPrint = gapPrint * 0.5;
    let printNo = 0;
    await frames(dur, (t) => {
      const d = total * (1 - Math.pow(1 - t, 1.7));
      const p = at(d);
      refs.trail.setAttribute('stroke-dashoffset', (total - d).toFixed(2));
      placeKitten(p.x, p.y, Math.abs(Math.sin(d / 9)) * 3);
      const L = Math.hypot(p.dx, p.dy) || 1;
      if (printNo % 3 === 0) setFace('normal', { x: p.dx / L, y: p.dy / L });
      while (d >= nextPrint) {
        const q = at(nextPrint);
        const ql = Math.hypot(q.dx, q.dy) || 1;
        const side = printNo % 2 ? 1 : -1;
        const ox = (-q.dy / ql) * 4 * side;
        const oy = (q.dx / ql) * 4 * side;
        const ang = (Math.atan2(q.dy, q.dx) * 180) / Math.PI + 90;
        const g = svgEl('g', { transform: `translate(${(q.x + ox).toFixed(2)} ${(q.y + oy).toFixed(2)}) rotate(${ang.toFixed(1)})`, opacity: '0.75' });
        g.innerHTML = pawPrint(C.momijiDeep, 6);
        refs.prints.appendChild(g);
        audio.step(printNo);
        printNo++;
        nextPrint += gapPrint;
      }
    });
    kitten = { x: tagX - 4, y: ys[end] };
    placeKitten(kitten.x, kitten.y);
    // 4. 着いた札
    const landed = end;
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    const tag = refs.tags[landed];
    tag.querySelector('.tag-bg').setAttribute('fill', '#fff1c4');
    tag.querySelector('.tag-bg').setAttribute('stroke', C.momiji);
    tag.querySelector('.tag-bg').setAttribute('stroke-width', '4');
    tag.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 240, easing: 'ease-out' });
    refs.trail.setAttribute('opacity', '0.8');
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    setFace('happy');
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'ついたよ', choices[landed]);
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
