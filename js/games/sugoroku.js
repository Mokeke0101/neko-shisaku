// ねこ すごろく（決め方：盤を進む。見せ方の部品：つづら折りに並ぶ ます）。
// 選択肢を すごろくの ますに書き、スタートから つづら折りに並べる。猫が さいころをふり、こまが出た目だけ進む。
// 止まった ますが結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が さいころを手の中で しゃかしゃか ふってから、投げる。さいころは転がりながら目を変え、だんだん ゆっくりになる。
// 2. さいごに さいころが角で ぐらぐらして、どちらの目で止まるか分からない。
// 3. 2回ふる時は、1回目に進んだ所から、2回目で どこまで行くか。
// 結果は先に乱数で決め（RS01-S14）、さいころの目を、合わせて決めた ますに止まるように選ぶ（1ますめは1回、ほかは2回ふる）。
// ますはどれも同じ大きさ（出やすさは ますの大きさに表れない：RS01-S21）。
// v16：盤は 木の板、ますは 厚みのある タイル（下に こい色の あつみ・上に 光）。選択肢は ますに じかに書く。さいころは v15 の立体。
// 動きの ちがい（3B：4つ）：ふつう・いきすぎて もどる・こまが つまずく・さいころを 高く なげる。
import { C } from '../art.js';
import { catSitting, catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';
import { die3D } from './saikoro.js';

const SQ = ['#fde2d6', '#fdefc8', '#e4efd2', '#dde9f6', '#ece2f4', '#fbe3ea'];
const SQ_EDGE = ['#e8664a', '#e0a93a', '#86a256', '#6f9fcb', '#a985c9', '#e391ad'];

// 盤の並べ方。3つまでは1列、それより多いと2列（12個・8文字でも読める大きさにするため）。下の段から つづら折りに並べる
export function boardLayout(n) {
  const cols = n <= 3 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  return {
    cols, rows,
    cellOf: (i) => {
      const r = Math.floor(i / cols); // 下から何段目か
      const k = i % cols;
      return { row: rows - 1 - r, col: r % 2 === 0 ? k : cols - 1 - k };
    },
  };
}

// さいころの目。合わせて target（1 から n）に止まる目を返す。1ますめは1回、ほかは2回ふる。rand() は 0 以上 1 未満
export function diceFor(target, rand = Math.random) {
  if (!Number.isInteger(target) || target < 1 || target > 12) throw new RangeError(`止まる ますが正しくない: ${target}`);
  if (target === 1) return [1];
  const lo = Math.max(1, target - 6);
  const hi = Math.min(6, target - 1);
  const a = lo + Math.floor(rand() * (hi - lo + 1));
  return [a, target - a];
}

// 2行に分ける時に、2行目の頭に来てはいけない文字（小さい かな・のばす音）
const NO_HEAD = /^[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶー～、。！？]/;
// 選択肢の文字を、ますの中の1行か2行に分ける。1行で 16 px 以上に書ける時は1行にする。
// 2行にする時は、2行目の頭に小さい かな・のばす音が来ない所、数字の途中でない所で、長い方の行がなるべく短くなる所で切る
export function splitLabel(text, w, h) {
  const chars = Array.from(text);
  const len = Math.max(chars.length, 1);
  const one = Math.min(22, (w / len) * 0.98, h * 0.5);
  if (len < 3 || one >= 16) return { lines: [text], size: Math.max(12, one) };
  let best = null;
  for (let k = 1; k < len; k++) {
    const a = chars.slice(0, k).join('');
    const b = chars.slice(k).join('');
    if (NO_HEAD.test(b) || (/[0-9０-９]$/.test(a) && /^[0-9０-９]/.test(b))) continue;
    const longest = Math.max(k, len - k);
    if (!best || longest < best.longest) best = { lines: [a, b], longest };
  }
  if (!best) return { lines: [text], size: Math.max(12, one) };
  const two = Math.min(22, (w / best.longest) * 0.98, h * 0.34);
  if (two <= one + 0.5) return { lines: [text], size: Math.max(12, one) };
  return { lines: best.lines, size: Math.max(12, two) };
}

export function createSugoroku({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;
  let piece = null;

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const { cols, rows, cellOf } = boardLayout(n);
    const dz = Math.max(84, Math.min(122, H * 0.23)); // 下の さいころの場所
    const boardX = 4;
    const boardY = 4;
    const boardW = W - 8;
    const boardH = H - dz - 8;
    const pad = 12;
    const gap = 10;
    const cw = (boardW - pad * 2 - gap * (cols - 1)) / cols;
    const ch = Math.min(n <= 3 ? 76 : 100, (boardH - pad * 2 - gap * (rows - 1)) / rows);
    const used = rows * ch + gap * (rows - 1);
    const top = boardY + pad + (boardH - pad * 2 - used) / 2;
    const slot = Math.max(11, Math.min(17, ch * 0.24, cw * 0.14)); // こまの いばしょ（番号の丸）の半径
    const cells = choices.map((_, i) => {
      const { row, col } = cellOf(i);
      const x = boardX + pad + col * (cw + gap);
      const y = top + row * (ch + gap);
      return { x, y, w: cw, h: ch, sx: x + 8 + slot, sy: y + ch / 2 };
    });
    const dieS = Math.max(34, Math.min(50, dz * 0.42));
    const floorY = H - 8;
    const startAt = { x: boardX + 40, y: H - dz / 2 - 2 };
    const dieRest = { x: W * 0.5, y: floorY - dieS / 2 - 4 };
    const catS = Math.min(0.62, (dz - 6) / 165);
    const catAt = { x: W - 62 * catS - 22, y: H - 84 * catS - 4 };
    const pieceR = Math.max(13, Math.min(20, slot * 1.25));
    geo = { n, W, H, cells, slot, startAt, dieRest, dieS, catAt, catS, pieceR, floorY };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 盤
    s += `<rect x="${boardX + 2}" y="${boardY + 7}" width="${boardW}" height="${boardH}" rx="20" fill="#6fb39b" opacity="0.35"/>`;
    s += `<rect x="${boardX}" y="${boardY}" width="${boardW}" height="${boardH}" rx="20" fill="#e3f4ec" stroke="#6fb39b" stroke-width="3"/>`;
    for (let k = 0; k < 5; k++) {
      const gy = boardY + 14 + (k * (boardH - 28)) / 4;
      s += `<path d="M${boardX + 12},${gy.toFixed(1)} C${(boardX + boardW * 0.3).toFixed(1)},${(gy - 5).toFixed(1)} ${(boardX + boardW * 0.6).toFixed(1)},${(gy + 5).toFixed(1)} ${boardX + boardW - 12},${gy.toFixed(1)}" stroke="#c6e6d8" stroke-width="1.6" fill="none"/>`;
    }
    s += `<rect x="${boardX + 6}" y="${boardY + 6}" width="${boardW - 12}" height="${boardH - 12}" rx="15" fill="none" stroke="#a9dcc9" stroke-width="2" stroke-dasharray="6 5"/>`;
    // 道（ますの真ん中を順につなぐ）
    const road = [{ x: startAt.x, y: startAt.y }, ...cells.map((c) => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 }))];
    s += `<path d="M${road.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}" stroke="#f1dcb8" stroke-width="${Math.min(26, ch * 0.4).toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M${road.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}" stroke="${C.woodDeep}" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.7"/>`;
    // ます
    let minLabel = Infinity;
    cells.forEach((c, i) => {
      const lx = c.sx + slot + 6;
      const lw = c.x + c.w - 6 - lx;
      const { lines, size } = splitLabel(choices[i], lw, c.h);
      minLabel = Math.min(minLabel, size);
      const cx = lx + lw / 2;
      const lh = size * 1.12;
      const rxc = Math.min(14, c.h / 3);
      const th = Math.max(5, Math.min(8, c.h * 0.1)); // タイルの あつみ
      s += `<rect x="${c.x + 1}" y="${c.y + th + 2}" width="${c.w}" height="${c.h}" rx="${rxc}" fill="#6fb39b" opacity="0.3"/>`
        + `<rect x="${c.x}" y="${c.y + th}" width="${c.w}" height="${c.h}" rx="${rxc}" fill="${SQ_EDGE[i % SQ.length]}"/>`;
      s += `<g class="cell" data-i="${i}">`
        + `<rect class="cell-bg" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${rxc}" fill="${SQ[i % SQ.length]}" stroke="${SQ_EDGE[i % SQ.length]}" stroke-width="2.4"/>`
        + `<rect x="${c.x + 6}" y="${c.y + 4}" width="${c.w - 12}" height="${Math.max(4, c.h * 0.14).toFixed(1)}" rx="${Math.max(2, c.h * 0.07).toFixed(1)}" fill="#ffffff" opacity="0.5"/>`
        + `<circle cx="${c.sx}" cy="${c.sy}" r="${slot}" fill="#ffffff" stroke="${SQ_EDGE[i % SQ.length]}" stroke-width="2"/>`
        + `<text x="${c.sx}" y="${c.sy + 0.5}" font-size="${(slot * 1.05).toFixed(1)}" font-weight="700" fill="${C.inkSoft}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`
        + lines.map((ln, k) => `<text class="cell-label" x="${cx.toFixed(1)}" y="${(c.sy + (k - (lines.length - 1) / 2) * lh).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(ln)}</text>`).join('')
        + `</g>`;
    });
    // スタートの ござ
    s += `<g><ellipse cx="${startAt.x}" cy="${startAt.y + 4}" rx="34" ry="15" fill="#f4e2c0" stroke="${C.woodDeep}" stroke-width="2"/>`
      + `<text x="${startAt.x}" y="${startAt.y + 30}" font-size="13" font-weight="700" fill="${C.inkSoft}" text-anchor="middle" dominant-baseline="central">スタート</text></g>`;
    // 猫の ざぶとん（v12）
    s += `<rect x="${(catAt.x - 62 * catS).toFixed(1)}" y="${(catAt.y + 66 * catS).toFixed(1)}" width="${(124 * catS).toFixed(1)}" height="${(18 * catS).toFixed(1)}" rx="${(8 * catS).toFixed(1)}" fill="#a985c9" stroke="#7d5fa0" stroke-width="2"/>`
      + `<circle cx="${(catAt.x - 56 * catS).toFixed(1)}" cy="${(catAt.y + 68 * catS).toFixed(1)}" r="${(4 * catS).toFixed(1)}" fill="#f6d55e"/><circle cx="${(catAt.x + 56 * catS).toFixed(1)}" cy="${(catAt.y + 68 * catS).toFixed(1)}" r="${(4 * catS).toFixed(1)}" fill="#f6d55e"/>`;
    // 猫
    s += `<g transform="translate(${catAt.x} ${catAt.y}) scale(${catS.toFixed(3)})"><g class="sg-cat">${catSitting(cat, { look: { x: -1, y: 0.3 } })}</g></g>`;
    // さいころ
    s += `<g class="die-shadow"><ellipse rx="${dieS * 0.5}" ry="${dieS * 0.12}" fill="#a0703f" opacity="0.18"/></g>`;
    s += `<g class="die"><g class="die-in"></g></g>`;
    // 猫の手（さいころを ふる・投げる）
    s += `<g class="sg-paw" visibility="hidden"><g transform="scale(${catS.toFixed(3)})">${catPaw(cat, 20)}</g></g>`;
    // こま（猫の顔）
    s += `<g class="piece"><circle r="${pieceR + 3}" fill="#ffffff" opacity="0.85"/><g transform="scale(${(pieceR / 52).toFixed(3)})" class="piece-in">${catFace(cat)}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      cells: Array.from(svg.querySelectorAll('.cell')),
      die: svg.querySelector('.die'),
      dieIn: svg.querySelector('.die-in'),
      dieShadow: svg.querySelector('.die-shadow'),
      paw: svg.querySelector('.sg-paw'),
      piece: svg.querySelector('.piece'),
      pieceIn: svg.querySelector('.piece-in'),
      catG: svg.querySelector('.sg-cat'),
    };
    piece = { x: startAt.x, y: startAt.y - 6 };
    placePiece(piece.x, piece.y);
    drawDie(Math.floor(Math.random() * 6) + 1);
    placeDie(dieRest.x, dieRest.y, -8);
    placePaw(pawRest().x, pawRest().y);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  function pawRest() {
    return { x: geo.catAt.x - 46 * geo.catS, y: geo.catAt.y + 30 * geo.catS };
  }

  function drawDie(face) {
    refs.dieIn.innerHTML = die3D(face, geo.dieS * 0.92);
    refs.die.dataset.face = String(face);
  }

  function placeDie(x, y, rot = 0, scale = 1) {
    refs.die.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${scale.toFixed(3)})`);
    const lift = Math.max(0, geo.dieRest.y - y);
    refs.dieShadow.setAttribute('transform', `translate(${x.toFixed(2)} ${(geo.floorY - 3).toFixed(2)}) scale(${Math.max(0.4, 1 - lift / 120).toFixed(3)})`);
  }

  function placePaw(x, y) {
    refs.paw.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  }

  function placePiece(x, y, lift = 0, squash = 1) {
    refs.piece.setAttribute('transform', `translate(${x.toFixed(2)} ${(y - lift).toFixed(2)}) scale(${(1 / squash).toFixed(3)} ${squash.toFixed(3)})`);
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  function lightCell(i, on) {
    const bg = refs.cells[i].querySelector('.cell-bg');
    bg.setAttribute('stroke-width', on ? '4' : '2.4');
  }

  // さいころを1回ふる（face の目で止める）。last は さいごの1回か、long は1回だけ ふる時か（長めに見せる）
  async function roll(face, last, long, high = false) {
    const { dieRest, catS } = geo;
    const pr = pawRest();
    // しゃかしゃか（手の中で ふる）
    const hold = { x: pr.x - 6, y: pr.y - 34 * catS - geo.dieS * 0.3 };
    setCat('normal', { x: -0.6, y: 0.4 });
    let lastShake = -1;
    refs.paw.setAttribute('visibility', 'visible');
    await frames(long ? 1100 : last ? 450 : 750, (t) => {
      const w = Math.sin(t * Math.PI * 10);
      placePaw(pr.x + w * 5, pr.y - 30 * catS + w * 2);
      placeDie(hold.x + w * 6, hold.y + Math.abs(w) * 3, w * 25, 0.8);
      const beat = Math.floor(t * 10);
      if (beat !== lastShake) { lastShake = beat; drawDie(1 + Math.floor(Math.random() * 6)); audio.rattle(); }
    });
    // 投げる：はねながら転がり、目を変える。だんだん ゆっくり
    audio.toss();
    placePaw(pr.x, pr.y);
    refs.paw.setAttribute('visibility', 'hidden');
    const from = { ...hold };
    const to = { x: dieRest.x + (Math.random() * 2 - 1) * 12, y: dieRest.y };
    let nextFace = 0;
    let spin = 0;
    const tumble = long ? 1600 : 1150;
    await frames(tumble, (t) => {
      const e = ease.outCubic(t);
      const x = from.x + (to.x - from.x) * e;
      const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * 46 * (1 - t) * (1 - t);
      const y = from.y + (to.y - from.y) * Math.min(1, t * 2.2) - bounce;
      spin = Math.sin(t * Math.PI * 6) * 22 * (1 - t); // 立体の さいころは ころがる時に かたむく（ぐるぐる まわさない）
      placeDie(x, y - (high ? Math.sin(Math.PI * Math.min(1, t * 1.6)) * 60 : 0), spin, 0.8 + 0.2 * Math.min(1, t * 3));
      const now = t * tumble;
      if (now >= nextFace) {
        drawDie(1 + Math.floor(Math.random() * 6));
        nextFace = now + 70 + 260 * t * t;
        audio.tick();
      }
    });
    // 角で ぐらぐら（どちらの目か分からない）。さいごの1回は長め
    const wob = last ? 800 : 380;
    let other = face;
    while (other === face) other = 1 + Math.floor(Math.random() * 6);
    let shown = -1;
    await frames(wob, (t) => {
      const a = Math.sin(t * Math.PI * (last ? 5 : 3)) * 24 * (1 - t);
      placeDie(to.x, to.y - Math.abs(a) * 0.25, a);
      const want = a > 4 ? other : face;
      if (want !== shown) { shown = want; drawDie(want); if (t > 0.05) audio.tick(); }
    });
    drawDie(face);
    placeDie(to.x, to.y, 0);
    audio.stamp();
    refs.die.animate([{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }], { duration: 300 });
    await wait(300);
  }

  // こまを steps ます進める（from は いまの ますの番号。スタートは -1）
  async function walk(fromIndex, steps, stumbleAt = -1) {
    const { cells } = geo;
    let at = fromIndex;
    for (let k = 0; k < steps; k++) {
      const next = at + 1;
      const c = cells[next];
      const p0 = { ...piece };
      const p1 = { x: c.sx, y: c.sy };
      setCat('normal', { x: Math.sign(p1.x - geo.catAt.x) || -1, y: -0.6 });
      if (at >= 0) lightCell(at, false);
      await frames(210, (t) => {
        const e = ease.inOutSine(t);
        placePiece(p0.x + (p1.x - p0.x) * e, p0.y + (p1.y - p0.y) * e, Math.sin(Math.PI * t) * 16, t > 0.85 ? 0.88 : 1);
      });
      piece = p1;
      if (k === stumbleAt) {
        // つまずく：こまが よろっと かたむいて、たてなおす
        showHint(result, 'おっとっと…');
        audio.heart();
        await frames(420, (t) => refs.piece.setAttribute('transform', `translate(${p1.x.toFixed(2)} ${p1.y.toFixed(2)}) rotate(${(Math.sin(t * Math.PI * 3) * 24 * (1 - t)).toFixed(1)})`));
      }
      lightCell(next, true);
      audio.hop(next);
      placePiece(p1.x, p1.y, 0, 1);
      at = next;
      await wait(40);
    }
    return at;
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「さいころ」を おしてね');
    play.textContent = 'さいころ';
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
    const dice = diceFor(decided + 1);
    stage.dataset.dice = dice.join(',');
    let at = -1;
    const vr = Math.random();
    let variant = vr < 0.25 ? 'over' : vr < 0.5 ? 'stumble' : vr < 0.75 ? 'high' : 'plain';
    if (variant === 'over' && decided >= n - 1) variant = 'plain';
    stage.dataset.variant = variant;
    for (let k = 0; k < dice.length; k++) {
      const high = variant === 'high' && k === dice.length - 1;
      showHint(result, high ? 'えいっ！ たかく なげるよ' : k === 0 ? 'ころころ…' : 'もう いっかい…');
      await roll(dice[k], k === dice.length - 1, dice.length === 1, high);
      showHint(result, `${dice[k]} すすむ`);
      at = await walk(at, dice[k], variant === 'stumble' && k === 0 ? Math.floor(Math.random() * dice[k]) : -1);
      await wait(k === dice.length - 1 ? 150 : 250);
    }
    // ときどき出る別の動き（v12）：いきおいで 1ます いきすぎて、もどる
    if (variant === 'over' && at < n - 1) {
      showHint(result, 'あっ、いきすぎ…');
      const back = at;
      await walk(at, 1);
      audio.heart();
      await wait(220);
      showHint(result, 'もどって…');
      const c = geo.cells[back];
      const p0 = { ...piece };
      lightCell(back + 1, false);
      await frames(320, (t) => placePiece(p0.x + (c.sx - p0.x) * ease.inOutSine(t), p0.y + (c.sy - p0.y) * ease.inOutSine(t), Math.sin(Math.PI * t) * 16, 1));
      piece = { x: c.sx, y: c.sy };
      placePiece(piece.x, piece.y, 0, 1);
      lightCell(back, true);
      audio.hop(back);
      at = back;
    }
    const landed = at;
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    const bg = refs.cells[landed].querySelector('.cell-bg');
    bg.setAttribute('fill', '#fff1c4');
    bg.setAttribute('stroke', C.momiji);
    bg.setAttribute('stroke-width', '4');
    refs.pieceIn.innerHTML = catFace(cat, { mood: 'happy' });
    frames(500, (t) => placePiece(piece.x, piece.y, Math.abs(Math.sin(t * Math.PI * 2)) * 10, 1));
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    setCat('happy');
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, `${landed + 1}ますめ`, choices[landed]);
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
