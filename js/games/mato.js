// ねこパンチ まとあて（決め方：当てる。見せ方の部品：棚に並ぶ的）。
// 縁日の的当てのように、棚に選択肢の的を並べる。猫が ねらいを決めて、猫パンチで玉を飛ばす。当たった的が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. ねらい（肉球の印）が的から的へ移る。だんだん ゆっくりになる。
// 2. 終わりに、2つの的の間で まよう。
// 3. 猫が手を引いて、パンチ。玉が弧をえがいて飛び、的に当たる。
// 結果は先に乱数で決め（RS01-S14）、ねらいの移り方を、決めた的で終わるように並べる。
// 的はどれも同じ大きさ（出やすさは的の大きさに表れない：RS01-S21）。
import { C } from '../art.js';
import { catSitting, catPaw, pawPrint } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

const RIM = ['#e8664a', '#f29a4a', '#86a256', '#6f9fcb', '#a985c9', '#d4b043'];

// 棚の並べ方。5つまでは1列、6つからは2列（上の棚から、左から右へ）
export function shelfLayout(n) {
  const cols = n <= 5 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  return { cols, rows, cellOf: (i) => ({ col: i % cols, row: Math.floor(i / cols) }) };
}

// ねらいの移り方。決めた的 decided で終わり、同じ的に続けて止まらない。
// 終わりの3回は、決めた的ととなりの1つの間を行き来する（まよう）。rand() は 0 以上 1 未満
export function aimPath(n, decided, rand = Math.random) {
  if (n < 2) return [decided];
  let other;
  do { other = Math.floor(rand() * n); } while (other === decided);
  const free = 8 + Math.floor(rand() * 4);
  const path = [];
  let prev = -1;
  for (let k = 0; k < free; k++) {
    let i;
    do { i = Math.floor(rand() * n); } while (i === prev);
    path.push(i);
    prev = i;
  }
  if (prev === other) {
    let j;
    do { j = Math.floor(rand() * n); } while (j === other);
    path.push(j);
  }
  path.push(other, decided, other, decided);
  return path;
}

// k 回目（0 から）の移る時間（ミリ秒）。m は移る回数。後ろほど長い
export function aimTime(k, m) {
  const p = m > 1 ? k / (m - 1) : 1;
  return 150 + 430 * Math.pow(p, 2.2);
}

export function createMato({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
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
    const { cols, rows, cellOf } = shelfLayout(n);
    const catH = Math.max(92, Math.min(150, H * 0.27));
    const boardX = 4;
    const boardY = 4;
    const boardW = W - 8;
    const boardH = H - catH - 10;
    const pad = 12;
    const gap = 10;
    const rowH = (boardH - pad * 2 - 6) / rows;
    const ph = Math.max(26, Math.min(54, rowH - 12));
    const pw = (boardW - pad * 2 - gap * (cols - 1)) / cols;
    const plates = choices.map((_, i) => {
      const { col, row } = cellOf(i);
      const x = boardX + pad + col * (pw + gap);
      const shelfY = boardY + pad + 4 + (row + 1) * rowH; // 棚板の上の面
      const y = shelfY - ph - 3;
      const rb = Math.min(ph * 0.36, 15);
      return { x, y, w: pw, h: ph, shelfY, bx: x + 8 + rb, by: y + ph / 2, rb };
    });
    const catS = (catH - 8) / 168;
    const catAt = { x: W / 2 - 18, y: H - catH / 2 - 2 };
    const pawRest = { x: catAt.x + 58 * catS, y: catAt.y - 2 * catS };
    geo = { n, W, H, plates, catAt, catS, pawRest, ph };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 屋台の棚
    s += `<rect x="${boardX + 3}" y="${boardY + 6}" width="${boardW}" height="${boardH}" rx="20" fill="#d9b07a" opacity="0.35"/>`;
    s += `<rect x="${boardX}" y="${boardY}" width="${boardW}" height="${boardH}" rx="20" fill="#fff3e2" stroke="${C.woodDeep}" stroke-width="3"/>`;
    for (let r = 0; r < rows; r++) {
      const y = boardY + pad + 4 + (r + 1) * rowH;
      s += `<rect x="${boardX + 8}" y="${y}" width="${boardW - 16}" height="7" rx="3" fill="${C.wood}" stroke="${C.woodDeep}" stroke-width="1.6"/>`;
    }
    // 屋台の しましまの やね（v12。1だん目の的の上に すきまが ある時）
    const awn = Math.min(16, rowH - ph - 8);
    if (awn >= 8) {
      const k = Math.ceil((boardW - 16) / 28);
      let a = '';
      for (let j = 0; j < k; j++) {
        const x0 = boardX + 8 + j * 28;
        const w = Math.min(28, boardX + boardW - 8 - x0);
        a += `<path d="M${x0},${boardY + 6} h${w} v${awn - 4} q${-w / 2},8 ${-w},0 Z" fill="${j % 2 ? '#fffaf0' : '#f7a6a0'}"/>`;
      }
      s += `<g opacity="0.95">${a}</g><path d="M${boardX + 8},${boardY + 6} H${boardX + boardW - 8}" stroke="#d97f7a" stroke-width="2"/>`;
    }
    let minLabel = Infinity;
    plates.forEach((p, i) => {
      const labelX = p.bx + p.rb + 7;
      const labelW = p.x + p.w - 8 - labelX;
      const len = Math.max(charCount(choices[i]), 1);
      const size = Math.max(12, Math.min(22, (labelW / len) * 0.98, p.h * 0.58));
      minLabel = Math.min(minLabel, size);
      const rim = RIM[i % RIM.length];
      const cx = p.x + p.w / 2;
      s += `<g class="cell" data-i="${i}"><g class="plate" data-cx="${cx}" data-cy="${p.y + p.h}">`
        + `<path d="M${p.x + p.w * 0.3},${p.y + p.h} l-4,4 M${p.x + p.w * 0.7},${p.y + p.h} l4,4" stroke="${C.woodDeep}" stroke-width="3" stroke-linecap="round"/>`
        + `<rect class="cell-bg" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${Math.min(12, p.h / 2.4)}" fill="#ffffff" stroke="${rim}" stroke-width="2.6"/>`
        + `<circle cx="${p.bx}" cy="${p.by}" r="${p.rb}" fill="#ffffff" stroke="${rim}" stroke-width="2"/>`
        + `<circle cx="${p.bx}" cy="${p.by}" r="${p.rb * 0.62}" fill="${rim}" opacity="0.85"/>`
        + `<circle cx="${p.bx}" cy="${p.by}" r="${p.rb * 0.26}" fill="#ffffff"/>`
        + `<g class="star" transform="translate(${p.bx} ${p.by}) scale(0)"><path d="${starPath(p.rb * 1.1)}" fill="${C.icho}" stroke="${C.ichoDeep}" stroke-width="1.6" stroke-linejoin="round"/></g>`
        + `<text class="cell-label" x="${labelX}" y="${p.by}" font-size="${size.toFixed(1)}" fill="${C.ink}" dominant-baseline="central">${escapeXml(choices[i])}</text>`
        + `</g></g>`;
    });
    // ねらい（肉球の印）
    const ar = Math.max(13, Math.min(20, geo.ph * 0.42));
    s += `<g class="aim" visibility="hidden"><circle r="${ar}" fill="#ffffff" opacity="0.7"/><circle r="${ar}" fill="none" stroke="${C.momiji}" stroke-width="2.4" stroke-dasharray="4 3"/><g opacity="0.9">${pawPrint(C.momiji, ar * 0.8)}</g></g>`;
    // 猫と、パンチする手と玉
    s += `<ellipse cx="${W / 2}" cy="${H - 4}" rx="${W * 0.3}" ry="6" fill="#d9b07a" opacity="0.25"/>`;
    s += `<g transform="translate(${catAt.x} ${catAt.y}) scale(${catS.toFixed(3)})"><g class="mato-cat">${catSitting(cat, { look: { x: 0, y: -1 } })}</g></g>`;
    const br = Math.max(7, Math.min(11, catS * 12));
    s += `<g class="ball" transform="translate(${pawRest.x} ${pawRest.y - 22 * catS})"><circle r="${br}" fill="#f4a7a3" stroke="#d97f7a" stroke-width="1.6"/>`
      + `<path d="M${-br * 0.8},${-br * 0.3} Q0,${-br * 0.95} ${br * 0.8},${-br * 0.3} M${-br * 0.92},${br * 0.15} Q0,${-br * 0.45} ${br * 0.92},${br * 0.15} M${-br * 0.2},${-br * 0.96} Q${-br * 0.75},0 ${-br * 0.2},${br * 0.96}" stroke="#d97f7a" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
    s += `<g class="punch" transform="translate(${pawRest.x} ${pawRest.y})"><g transform="scale(${catS.toFixed(3)})">`
      + `<path d="M-30,30 Q-6,24 0,0" stroke="${cat.line}" stroke-width="21" fill="none" stroke-linecap="round"/>`
      + `<path d="M-30,30 Q-6,24 0,0" stroke="${cat.paw}" stroke-width="15" fill="none" stroke-linecap="round"/>`
      + `<g>${catPaw(cat, 16)}</g></g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      cells: Array.from(svg.querySelectorAll('.cell')),
      plates: Array.from(svg.querySelectorAll('.plate')),
      stars: Array.from(svg.querySelectorAll('.star')),
      aim: svg.querySelector('.aim'),
      ball: svg.querySelector('.ball'),
      punch: svg.querySelector('.punch'),
      catG: svg.querySelector('.mato-cat'),
    };
    geo.br = br;
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  function starPath(r) {
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      pts.push(`${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`);
    }
    return `M${pts.join(' L')} Z`;
  }

  function placeAim(x, y, scale = 1) {
    refs.aim.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`);
  }

  function placeBall(x, y, scale = 1) {
    refs.ball.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`);
  }

  function placePunch(dx, dy, rot = 0) {
    const { pawRest } = geo;
    refs.punch.setAttribute('transform', `translate(${(pawRest.x + dx).toFixed(2)} ${(pawRest.y + dy).toFixed(2)}) rotate(${rot.toFixed(1)})`);
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  function lookAt(p) {
    const { catAt } = geo;
    const dx = p.bx - catAt.x;
    const dy = p.by - (catAt.y - 20 * geo.catS);
    const L = Math.hypot(dx, dy) || 1;
    return { x: dx / L, y: dy / L };
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「ねらう」を おしてね');
    play.textContent = 'ねらう';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, plates, pawRest, catS } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const path = aimPath(n, decided);

    // 1. ねらいが的から的へ移る（だんだん ゆっくり。終わりに2つの間で まよう）
    showHint(result, 'どれに しようかな…');
    refs.aim.setAttribute('visibility', 'visible');
    let at = { x: pawRest.x, y: pawRest.y - 40 };
    for (let k = 0; k < path.length; k++) {
      const p = plates[path[k]];
      const dur = aimTime(k, path.length);
      const from = { ...at };
      if (k === path.length - 4) showHint(result, 'これかな… それとも…');
      await frames(dur * 0.6, (t) => {
        const e = ease.inOutSine(t);
        placeAim(from.x + (p.bx - from.x) * e, from.y + (p.by - from.y) * e, 1 + Math.sin(Math.PI * t) * 0.18);
      });
      at = { x: p.bx, y: p.by };
      setCat('normal', lookAt(p));
      audio.aim(k);
      await wait(dur * 0.4);
    }
    // ねらいが きまった（印が小さく しまる）
    const target = plates[path[path.length - 1]];
    await frames(260, (t) => placeAim(target.bx, target.by, 1 - 0.25 * ease.outCubic(t)));
    await wait(200);

    // ときどき出る別の動き（v12）：1ぱつ目は はずれて「おしい！」、2はつ目で 当てる
    delete stage.dataset.variant;
    if (Math.random() < 0.3) {
      stage.dataset.variant = 'miss';
      showHint(result, 'えいっ！');
      setCat('strain', lookAt(target));
      await frames(300, (t) => placePunch(-14 * ease.outCubic(t) * catS * 3, 10 * ease.outCubic(t) * catS * 3, -20 * t));
      audio.toss();
      await frames(120, (t) => placePunch(-42 * catS + 60 * catS * t, 30 * catS - 50 * catS * t, -20 + 30 * t));
      const m0 = { x: pawRest.x, y: pawRest.y - 22 * catS };
      const side = target.bx > geo.W / 2 ? -1 : 1;
      const m1 = { x: target.bx + side * geo.ph * 1.4, y: target.by - geo.ph * 0.9 };
      await frames(520, (t) => {
        placeBall(m0.x + (m1.x - m0.x) * t, m0.y + (m1.y - m0.y) * t - Math.sin(Math.PI * t) * 50, 1 - 0.3 * t);
        if (t > 0.3) placePunch(18 * catS * (1 - t), -20 * catS * (1 - t), 10 * (1 - t));
      });
      placePunch(0, 0, 0);
      showHint(result, 'おしい！');
      audio.tap();
      await frames(380, (t) => placeBall(m1.x + side * 20 * t, m1.y + 90 * t * t, 0.7 * (1 - t)));
      placeBall(m0.x, m0.y, 1);
      await wait(160);
    }
    // 2. 手を引いて、パンチ。玉が弧をえがいて飛ぶ
    showHint(result, 'イズの ねこパンチ！');
    setCat('strain', lookAt(target));
    await frames(380, (t) => placePunch(-14 * ease.outCubic(t) * catS * 3, 10 * ease.outCubic(t) * catS * 3, -20 * t));
    audio.toss();
    await frames(120, (t) => placePunch(-42 * catS + 60 * catS * t, 30 * catS - 50 * catS * t, -20 + 30 * t));
    const b0 = { x: pawRest.x, y: pawRest.y - 22 * catS };
    const b1 = { x: target.bx, y: target.by };
    const lift = Math.max(50, (b0.y - b1.y) * 0.35);
    await frames(620, (t) => {
      const x = b0.x + (b1.x - b0.x) * t;
      const y = b0.y + (b1.y - b0.y) * t - Math.sin(Math.PI * t) * lift;
      placeBall(x, y, 1 - 0.3 * t);
      if (t > 0.3) placePunch(18 * catS * (1 - t), -20 * catS * (1 - t), 10 * (1 - t));
    });
    placePunch(0, 0, 0);
    // 3. 当たった
    const landed = path[path.length - 1];
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    audio.hit();
    refs.aim.setAttribute('visibility', 'hidden');
    // 玉は的に当たって、下へ はねて落ちる
    frames(520, (t) => placeBall(b1.x + 26 * t, b1.y + 60 * t * t - 30 * t, 0.7 * (1 - t)));
    const plate = refs.plates[landed];
    const pivot = `${plate.dataset.cx} ${plate.dataset.cy}`;
    frames(700, (t) => plate.setAttribute('transform', `rotate(${(Math.sin(t * Math.PI * 5) * 9 * (1 - t)).toFixed(2)} ${pivot})`));
    frames(420, (t) => refs.stars[landed].setAttribute('transform', `translate(${target.bx} ${target.by}) scale(${ease.outBack(t).toFixed(3)}) rotate(${(-40 * (1 - t)).toFixed(1)})`));
    const bg = refs.cells[landed].querySelector('.cell-bg');
    bg.setAttribute('fill', '#fff1c4');
    bg.setAttribute('stroke', C.momiji);
    bg.setAttribute('stroke-width', '4');
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    setCat('happy');
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'あたり', choices[landed]);
    const c = centerOf(result);
    celebrate(level, c.x, c.y - 30);
    await wait(800);
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
