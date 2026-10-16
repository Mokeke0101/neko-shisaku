// カリカリ おとし（決め方：上から落ちて入る。見せ方の部品：横に並ぶ お皿と、くぎの板）。
// 猫の手が板の上からカリカリを1つ落とす。カリカリは くぎに当たって右へ左へ はね、下の お皿の1つに入る。入った お皿が結果になる。
// 縦の画面に12枚の お皿を並べるため、お皿の文字は縦に書く（幅のある時は横に書く）。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫の手が、どこから落とそうか右へ左へ まよう。
// 2. 落ちたカリカリが、くぎに当たるたびに右か左へ はねる。下へ行くほど ゆっくりになる。
// 結果は先に乱数で決め（RS01-S14）、落とす所と、はねる向きの並びを、決めた お皿に入るように組む。
// お皿はどれも同じ大きさ（出やすさは お皿の大きさに表れない：RS01-S21）。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

const BOWL = ['#fde2d6', '#fdefc8', '#e4efd2', '#dde9f6', '#ece2f4', '#fbe3ea'];
const BOWL_EDGE = ['#e8664a', '#e0a93a', '#86a256', '#6f9fcb', '#a985c9', '#e391ad'];

// カリカリの道。位置 q は お皿の幅の半分を1とした目盛りで、お皿 i の真ん中は q = 2i+1（1〜2n-1）。
// 1段ごとに q が 1 ずつ右か左へ動く（板のはしでは内へ はね返る）。rows 段の後に、決めた お皿 target の真ん中に着く。
// 戻り値は { start, steps }（steps は +1 か -1 の並び）。rand() は 0 以上 1 未満
export function dropPath(n, target, rows, rand = Math.random) {
  const qT = 2 * target + 1;
  const qMax = 2 * n - 1;
  // 落とす所：決めた お皿から rows 段で届き、偶数・奇数が合う所から選ぶ
  const cands = [];
  for (let q = 1; q <= qMax; q++) if (Math.abs(qT - q) <= rows && (rows - Math.abs(qT - q)) % 2 === 0) cands.push(q);
  const start = cands[Math.floor(rand() * cands.length)];
  const steps = [];
  let q = start;
  for (let m = rows; m > 0; m--) {
    const d = qT - q;
    let s;
    if (Math.abs(d) === m) s = Math.sign(d);
    else if (q <= 1) s = 1;
    else if (q >= qMax) s = -1;
    else s = rand() < 0.5 ? -1 : 1;
    // はしを越える時と、届かなくなる時は向きを替える
    if (q + s < 1 || q + s > qMax || Math.abs(qT - (q + s)) > m - 1) s = -s;
    steps.push(s);
    q += s;
  }
  return { start, steps };
}

// 縦に書く時の1字ずつの並び。続いた数字（4字まで）は1つにまとめる（縦中横）
export function verticalTokens(text) {
  const out = [];
  for (const ch of Array.from(text)) {
    const last = out[out.length - 1];
    if (/[0-9]/.test(ch) && last && /^[0-9]{1,3}$/.test(last)) out[out.length - 1] = last + ch;
    else out.push(ch);
  }
  return out;
}

export function createOtoshi({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
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
    const boardX = 4;
    const boardW = W - 8;
    const x0 = boardX + 10;
    const bw = (boardW - 20) / n;
    const vertical = bw < 96;
    const binH = vertical ? Math.max(96, Math.min(176, H * 0.4)) : Math.max(64, Math.min(96, H * 0.2));
    const topZone = 58;
    const binTop = H - binH - 6;
    const pegTop = topZone + 10;
    const pegBottom = binTop - 14;
    const rowGap = Math.max(14, Math.min(30, (pegBottom - pegTop) / 10));
    const rows = Math.max(3, Math.floor((pegBottom - pegTop) / rowGap));
    const half = bw / 2;
    const kr = Math.max(7, Math.min(11, half * 0.62));
    const mouth = kr * 2 + 6; // お皿の口（入ったカリカリが止まる所。文字はその下に書く）
    const qx = (q) => x0 + q * half;
    const rowY = (r) => pegTop + r * rowGap;
    geo = { n, W, H, x0, bw, half, rows, rowGap, pegTop, binTop, binH, qx, rowY, kr, vertical, topZone };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 板
    s += `<rect x="${boardX + 3}" y="${8}" width="${boardW}" height="${H - 10}" rx="20" fill="#d9b07a" opacity="0.35"/>`;
    s += `<rect x="${boardX}" y="${2}" width="${boardW}" height="${H - 8}" rx="20" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="3"/>`;
    // くぎ：段 r と r+1 の間の、カリカリが通る q と同じ偶数・奇数の所に置く（カリカリは くぎに当たって右か左へ はねる）。
    // 遊ぶ時に、落とす所に合わせて くぎを置き直す
    s += `<g class="pegs"></g>`;
    // お皿
    let minLabel = Infinity;
    choices.forEach((c, i) => {
      const bx = x0 + i * bw + 2;
      const w = bw - 4;
      const col = i % BOWL.length;
      const len = Math.max(charCount(c), 1);
      let label = '';
      if (vertical) {
        const chars = verticalTokens(c);
        const size = Math.max(12, Math.min(22, w * 0.7, (binH - 16 - mouth) / (chars.length * 1.04)));
        minLabel = Math.min(minLabel, size);
        const total = size * 1.04 * chars.length;
        const y0 = binTop + 8 + mouth + (binH - 16 - mouth - total) / 2 + size * 0.52;
        label = chars.map((ch, k) => {
          // 縦に書く時、のばす音は90度まわし、小さい かなは右上へ寄せる
          const cy = y0 + k * size * 1.04;
          // 数字のまとまりは横に並べて1字分に収める（縦中横）
          const rot = /[ーｰ〜～]/.test(ch) ? ` transform="rotate(90 ${(bx + w / 2).toFixed(1)} ${cy.toFixed(1)})"`
            : /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ]/.test(ch) ? ` transform="translate(${(size * 0.14).toFixed(1)} ${(-size * 0.14).toFixed(1)})"`
              : /^[0-9]{2,}$/.test(ch) && ch.length * size * 0.58 > (w - 6) ? ` textLength="${(w - 6).toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : '';
          return `<text class="cell-label" x="${(bx + w / 2).toFixed(1)}" y="${(y0 + k * size * 1.04).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central"${rot}>${escapeXml(ch)}</text>`;
        }).join('');
      } else {
        const size = Math.max(12, Math.min(24, ((w - 12) / len) * 0.98, (binH - mouth) * 0.5));
        minLabel = Math.min(minLabel, size);
        label = `<text class="cell-label" x="${(bx + w / 2).toFixed(1)}" y="${(binTop + mouth + (binH - mouth) / 2 - 2).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(c)}</text>`;
      }
      s += `<g class="cell" data-i="${i}">`
        + `<rect class="cell-bg" x="${bx.toFixed(1)}" y="${binTop}" width="${w.toFixed(1)}" height="${binH}" rx="${Math.min(12, w / 2.6).toFixed(1)}" fill="${BOWL[col]}" stroke="${BOWL_EDGE[col]}" stroke-width="2.2"/>`
        + `<path d="M${(bx + 3).toFixed(1)},${binTop + 7} h${(w - 6).toFixed(1)}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`
        + label
        + `</g>`;
    });
    // 落ちるカリカリ（小さな魚の形）と、落とす手と、のぞく猫
    s += `<g class="kibble"><g class="kibble-in">${kibble(kr)}</g></g>`;
    s += `<g class="paw">${catPaw(cat, Math.max(12, Math.min(17, half * 0.9)))}</g>`;
    s += `<g transform="translate(${W - 44} ${topZone / 2 + 4}) scale(0.42)"><g class="ot-cat">${catFace(cat, { look: { x: -1, y: 0.6 } })}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      cells: Array.from(svg.querySelectorAll('.cell')),
      pegs: svg.querySelector('.pegs'),
      kibble: svg.querySelector('.kibble'),
      kibbleIn: svg.querySelector('.kibble-in'),
      paw: svg.querySelector('.paw'),
      catG: svg.querySelector('.ot-cat'),
    };
    drawPegs(1);
    placePaw(W / 2, topZone / 2);
    placeKibble(W / 2, topZone / 2 + 14);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  function kibble(r) {
    return `<circle r="${r * 1.25}" fill="#ffffff" opacity="0.75"/><path d="M${-r},0 Q${-r * 0.2},${-r * 0.95} ${r * 0.55},${-r * 0.2} L${r * 1.05},${-r * 0.6} L${r * 0.95},0 L${r * 1.05},${r * 0.6} L${r * 0.55},${r * 0.2} Q${-r * 0.2},${r * 0.95} ${-r},0 Z" fill="${C.chestnut}" stroke="${C.chestnutDeep}" stroke-width="1.4" stroke-linejoin="round"/>`
      + `<circle cx="${-r * 0.45}" cy="${-r * 0.1}" r="${r * 0.14}" fill="#5a3e2e"/>`;
  }

  // くぎを置く。startQ は落とす所（段 r で カリカリは q の偶数・奇数が startQ + r と同じ所にいる）
  function drawPegs(startQ) {
    const { n, rows, qx, rowY, half } = geo;
    let s = '';
    const pr = Math.max(2.6, Math.min(4.2, half * 0.2));
    for (let r = 0; r < rows; r++) {
      const ballParity = (startQ + r) % 2;
      for (let q = 0; q <= 2 * n; q++) {
        if (q % 2 !== ballParity) continue;
        s += `<circle class="peg" data-r="${r}" data-q="${q}" cx="${qx(q).toFixed(1)}" cy="${(rowY(r) + geo.rowGap * 0.5).toFixed(1)}" r="${pr}" fill="${C.woodDeep}"/>`;
      }
    }
    refs.pegs.innerHTML = s;
  }

  function placeKibble(x, y, rot = 0) {
    refs.kibble.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    refs.kibbleIn.setAttribute('transform', `rotate(${rot.toFixed(1)})`);
  }

  function placePaw(x, y) {
    refs.paw.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  }

  function setFace(mood, look) {
    refs.catG.innerHTML = catFace(cat, { mood, look });
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「おとす」を おしてね');
    play.textContent = 'おとす';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, rows, qx, rowY, topZone, W } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const { start, steps } = dropPath(n, decided, rows);
    drawPegs(start);

    // 1. どこから落とそうか まよう（手が右へ左へ）
    showHint(result, 'どこから おとそうかな…');
    const yPaw = topZone / 2;
    const sx = qx(start);
    const stops = [];
    for (let k = 0; k < 3; k++) stops.push(geo.x0 + 14 + Math.random() * (W - 2 * geo.x0 - 28));
    stops.push(sx);
    let px = W / 2;
    for (let k = 0; k < stops.length; k++) {
      const from = px;
      const to = stops[k];
      await frames(380 + k * 60, (t) => {
        const e = ease.inOutSine(t);
        const x = from + (to - from) * e;
        placePaw(x, yPaw);
        placeKibble(x, yPaw + 14, Math.sin(t * Math.PI * 2) * 10);
      });
      px = to;
      setFace('normal', { x: (to - (W - 44)) / 120, y: 0.6 });
      audio.hover(k);
      await wait(k === stops.length - 1 ? 380 : 160);
    }

    // 2. 落とす。くぎに当たるたびに右か左へ はねる（下へ行くほど ゆっくり）
    showHint(result, 'ころころ…');
    audio.toss();
    let q = start;
    let y = yPaw + 14;
    let rot = 0;
    await frames(260, (t) => placeKibble(sx, y + (rowY(0) - y) * t * t, rot));
    y = rowY(0);
    placePaw(sx, yPaw - 10);
    for (let r = 0; r < steps.length; r++) {
      const s = steps[r];
      const fromX = qx(q);
      const toX = qx(q + s);
      const fromY = rowY(r);
      const toY = rowY(r + 1);
      const dur = 150 + 110 * Math.pow(r / Math.max(1, steps.length - 1), 2);
      await frames(dur, (t) => {
        const x = fromX + (toX - fromX) * t;
        const yy = fromY + (toY - fromY) * t * t - Math.sin(Math.PI * t) * geo.rowGap * 0.35;
        rot += s * 9;
        placeKibble(x, yy, rot);
      });
      q += s;
      audio.ping(r, s);
      const peg = refs.pegs.querySelector(`.peg[data-r="${r}"][data-q="${q - s}"]`);
      if (peg) peg.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 200 });
    }
    // お皿へ入る
    const landed = (q - 1) / 2;
    const bx = qx(q);
    const fy = rowY(steps.length);
    const ty = geo.binTop + geo.kr + 7;
    await frames(360, (t) => placeKibble(bx, fy + (ty - fy) * t * t, rot + 40 * t));
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    audio.pop();
    frames(260, (t) => placeKibble(bx, ty - Math.sin(Math.PI * t) * 8, rot + 40));
    const bg = refs.cells[landed].querySelector('.cell-bg');
    bg.setAttribute('fill', '#fff1c4');
    bg.setAttribute('stroke', C.momiji);
    bg.setAttribute('stroke-width', '4');
    refs.cells[landed].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    setFace('happy');
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'はいったよ', choices[landed]);
    const c = centerOf(result);
    celebrate(level, c.x, c.y - 30);
    await wait(700);
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
