// ねこ さいころ（決め方：転がって止まる。見せ方の部品：大きな さいころと、目の一覧）。
// 猫が ぬいぐるみの大きな さいころを ころがす。上を向いた目の選択肢が結果になる。選択肢は 2〜6 個（RS01-S08：12個は扱えない）。
// 選択肢が6個より少ない時、あまった目は「もういちど」（その目が出たら、もう1回ころがす）。どの目も同じ大きさ。
// 同じ「回って止まる」系統の にくきゅうルーレット とは、止まり方（ルーレットは針が回る、こちらは さいころが転がる）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が さいころを前足で ころころ ゆらしてから、ぽんと押す。
// 2. さいころは はねながら転がり、目が変わる。だんだん ゆっくりになり、さいごに角で ぐらぐらする。
// 3. 「もういちど」が出たら、もう1回。
// 結果は先に乱数で決め（RS01-S14）、さいごに上を向く目を、決めた選択肢の目にする。
// 「もういちど」を はさむかは、あまった目の数の割合（6 − 選択肢の数）/ 6 で決める（多くて1回）。
import { C } from '../art.js';
import { catSitting, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

export const MAX = 6;

const PIPS = {
  1: [[0, 0]],
  2: [[-0.5, -0.5], [0.5, 0.5]],
  3: [[-0.5, -0.5], [0, 0], [0.5, 0.5]],
  4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
  5: [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]],
  6: [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0], [0.5, 0], [-0.5, 0.55], [0.5, 0.55]],
};

// ころがす目の並び。決めた選択肢 decided（0 から）の目 decided+1 で終わる。
// 選択肢が6個より少ない時は、「もういちど」の目（n+1〜6）を前に1回はさむことがある。rand() は 0 以上 1 未満
export function rollPlan(n, decided, rand = Math.random) {
  const faces = [];
  const spare = MAX - n;
  if (spare > 0 && rand() < spare / MAX) faces.push(n + 1 + Math.floor(rand() * spare));
  faces.push(decided + 1);
  return faces;
}

// 1回ころがす時間（ミリ秒）。1回だけの時は長めに見せる
export function rollTime(last, long) {
  return (long ? 1100 : 750) + (long ? 1600 : 1150) + (last ? 800 : 380) + 300;
}

// 目の絵（中心 0,0、一辺 d）
function dieFace(face, d, line = C.line) {
  const r = d * 0.09;
  return `<rect x="${(-d / 2).toFixed(2)}" y="${(-d / 2).toFixed(2)}" width="${d.toFixed(2)}" height="${d.toFixed(2)}" rx="${(d * 0.2).toFixed(2)}" fill="#ffffff" stroke="${line}" stroke-width="${Math.max(1.6, d * 0.045).toFixed(2)}"/>`
    + PIPS[face].map(([px, py]) => `<circle cx="${(px * d * 0.56).toFixed(2)}" cy="${(py * d * 0.56).toFixed(2)}" r="${(face === 1 ? r * 1.5 : r).toFixed(2)}" fill="${face === 1 ? C.momiji : C.ink}"/>`).join('');
}

export function createSaikoro({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
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
    // 上：目の一覧（6行。あまった目は「もういちど」）。下：さいころが転がる床と猫
    const listH = Math.min(H * 0.56, 6 * 54);
    const rowH = listH / 6;
    const listX = 12;
    const listW = W - 24;
    const listY = 4;
    const iconD = Math.min(rowH * 0.66, 34);
    const floorY = H - 10;
    const playTop = listY + listH + 8;
    const catS = Math.max(0.3, Math.min(0.62, (floorY - playTop) / 190));
    const catAt = { x: W - 20 - 80 * catS, y: floorY - 78 * catS };
    const dieS = Math.max(46, Math.min(100, (floorY - playTop) * 0.42));
    const dieRest = { x: Math.max(dieS, (W - 160 * catS) * 0.45), y: floorY - dieS / 2 - 2 };
    geo = { n, W, H, rowH, listX, listW, listY, floorY, catS, catAt, dieS, dieRest };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 目の一覧の板
    s += `<rect x="${listX - 4}" y="${listY - 2}" width="${listW + 8}" height="${listH + 4}" rx="18" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="3"/>`;
    let minLabel = Infinity;
    for (let f = 1; f <= MAX; f++) {
      const y = listY + rowH * (f - 1);
      const cy = y + rowH / 2;
      const isChoice = f <= n;
      const label = isChoice ? choices[f - 1] : 'もういちど';
      const tx = listX + 16 + iconD + 14;
      const tw = listX + listW - 10 - tx;
      const size = Math.max(12, Math.min(24, rowH * 0.5, (tw - 20) / Math.max(charCount(label), 1)));
      if (isChoice) minLabel = Math.min(minLabel, size);
      if (f > 1) s += `<path d="M${listX + 10},${y.toFixed(1)} H${listX + listW - 10}" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="3 5"/>`;
      s += `<g class="${isChoice ? 'cell' : 'spare'}" data-i="${f - 1}">`
        + `<rect class="${isChoice ? 'cell-bg' : 'spare-bg'}" x="${tx - 6}" y="${(cy - rowH * 0.42).toFixed(1)}" width="${(tw + 2).toFixed(1)}" height="${(rowH * 0.84).toFixed(1)}" rx="10" fill="${isChoice ? '#ffffff' : 'none'}" stroke="${isChoice ? '#e6cfae' : 'none'}" stroke-width="1.6"/>`
        + `<g transform="translate(${(listX + 16 + iconD / 2).toFixed(1)} ${cy.toFixed(1)})">${dieFace(f, iconD)}</g>`
        + `<text class="${isChoice ? 'cell-label' : 'spare-label'}" x="${tx + 6}" y="${cy.toFixed(1)}" font-size="${(isChoice ? size : Math.min(size, 17)).toFixed(1)}" fill="${isChoice ? C.ink : C.inkSoft}" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g>`;
    }
    // 床
    s += `<ellipse cx="${W / 2}" cy="${floorY + 2}" rx="${W * 0.48}" ry="9" fill="#e9c99a" opacity="0.55"/>`;
    // さいころの影と、さいころ
    s += `<ellipse class="die-shadow" cx="0" cy="0" rx="${dieS * 0.5}" ry="${dieS * 0.12}" fill="#a0703f" opacity="0.2"/>`;
    s += `<g class="die"><g class="die-in"></g></g>`;
    // 猫と前足
    s += `<g class="cat-pos" transform="translate(${catAt.x.toFixed(1)} ${catAt.y.toFixed(1)}) scale(${catS.toFixed(3)})"><g class="sk-cat">${catSitting(cat, { look: { x: -1, y: 0.3 } })}</g></g>`;
    s += `<g class="paw" visibility="hidden">${catPaw(cat, 30 * catS * 1.4)}</g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      die: svg.querySelector('.die'),
      dieIn: svg.querySelector('.die-in'),
      dieShadow: svg.querySelector('.die-shadow'),
      catG: svg.querySelector('.sk-cat'),
      paw: svg.querySelector('.paw'),
      rows: Array.from({ length: MAX }, (_, f) => svg.querySelector(`[data-i="${f}"]`)),
    };
    drawDie(1 + Math.floor(Math.random() * Math.min(n, MAX)));
    placeDie(dieRest.x, dieRest.y, 0);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  function drawDie(face) {
    refs.dieIn.innerHTML = dieFace(face, geo.dieS)
      + `<rect x="${(-geo.dieS / 2 + 4).toFixed(1)}" y="${(geo.dieS / 2 - geo.dieS * 0.16).toFixed(1)}" width="${(geo.dieS - 8).toFixed(1)}" height="${(geo.dieS * 0.1).toFixed(1)}" rx="${(geo.dieS * 0.05).toFixed(1)}" fill="#efe4d6" opacity="0.8"/>`;
    refs.die.dataset.face = String(face);
  }

  function placeDie(x, y, rot = 0, scale = 1) {
    refs.die.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${scale.toFixed(3)})`);
    const lift = Math.max(0, geo.dieRest.y - y);
    refs.dieShadow.setAttribute('transform', `translate(${x.toFixed(2)} ${(geo.floorY - 2).toFixed(2)}) scale(${Math.max(0.4, 1 - lift / 120).toFixed(3)})`);
  }

  function placePaw(x, y) {
    refs.paw.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  // 一覧の行を光らせる（f は目。0 なら消す）
  function lightRow(f, strong = false) {
    refs.rows.forEach((g, k) => {
      const bg = g.querySelector('.cell-bg, .spare-bg');
      const on = k === f - 1;
      if (g.classList.contains('cell')) {
        bg.setAttribute('fill', on ? (strong ? '#fff1c4' : '#fff8e4') : '#ffffff');
        bg.setAttribute('stroke', on && strong ? C.momiji : '#e6cfae');
        bg.setAttribute('stroke-width', on && strong ? '3.5' : '1.6');
      } else {
        bg.setAttribute('fill', on ? '#f3ece2' : 'none');
      }
    });
  }

  // さいころを1回ころがして、face の目で止める
  async function roll(face, last, long) {
    const { dieRest, catS, catAt, dieS } = geo;
    // 前足で ころころ ゆらす
    const pawAt = { x: dieRest.x + dieS * 0.62, y: dieRest.y - dieS * 0.1 };
    refs.paw.setAttribute('visibility', 'visible');
    setCat('normal', { x: -1, y: 0.6 });
    let beat = -1;
    await frames(long ? 1100 : 750, (t) => {
      const w = Math.sin(t * Math.PI * 8);
      placePaw(pawAt.x + Math.abs(w) * 4, pawAt.y);
      placeDie(dieRest.x - Math.abs(w) * 3, dieRest.y, -w * 8);
      const b = Math.floor(t * 8);
      if (b !== beat) { beat = b; audio.wiggle(b); }
    });
    // ぽんと押す：はねながら転がり、目を変える。だんだん ゆっくり
    audio.toss();
    setCat('happy');
    refs.paw.setAttribute('visibility', 'hidden');
    const from = { ...dieRest };
    const span = Math.min(dieRest.x - dieS * 0.7, 120);
    const to = { x: dieRest.x - span * (0.5 + Math.random() * 0.5), y: dieRest.y };
    let next = 0;
    const tumble = long ? 1600 : 1150;
    await frames(tumble, (t) => {
      const e = ease.outCubic(t);
      const x = from.x + (to.x - from.x) * e;
      const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * 54 * (1 - t) * (1 - t);
      placeDie(x, from.y - bounce, -720 * e);
      const now = t * tumble;
      if (now >= next) {
        drawDie(1 + Math.floor(Math.random() * MAX));
        next = now + 70 + 260 * t * t;
        audio.tick();
      }
    });
    // 角で ぐらぐら（どちらの目か分からない）
    setCat('normal', { x: -1, y: 0.6 });
    const wob = last ? 800 : 380;
    let other = face;
    while (other === face) other = 1 + Math.floor(Math.random() * MAX);
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
    lightRow(face, false);
    await wait(300);
    // 次に ころがす時は、もとの場所から
    return to;
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「ころがす」を おしてね');
    play.textContent = 'ころがす';
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
    const faces = rollPlan(n, decided);
    stage.dataset.faces = faces.join(',');
    showHint(result, 'ころころ…');
    await wait(300);
    let at = null;
    for (let k = 0; k < faces.length; k++) {
      const last = k === faces.length - 1;
      if (k > 0) {
        // もういちど：さいころを猫の前へ もどす
        showHint(result, 'もういちど！');
        audio.pop();
        await wait(600);
        lightRow(0);
        const back = { ...geo.dieRest };
        await frames(420, (t) => placeDie(at.x + (back.x - at.x) * ease.inOutSine(t), back.y - Math.sin(Math.PI * t) * 30, 0));
        showHint(result, 'ころころ…');
      }
      at = await roll(faces[k], last, faces.length === 1);
    }
    const landed = Number(refs.die.dataset.face) - 1; // 上を向いた目
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    lightRow(landed + 1, true);
    refs.rows[landed].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 240, easing: 'ease-out' });
    setCat('happy');
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    showResult(result, `${landed + 1} の め`, getChoices()[landed]);
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
