// ねこの ねがえり（決め方：猫の気まぐれ〈向き〉。見せ方の部品：まるい ラグと、まわりの札）。
// まるい ラグの上で、猫が まるくなって ねている。ごろんと ねがえりを打つたびに、あたまの向きが変わる。
// さいごに あたまが向いた札が結果になる。選択肢は 2〜8 個（RS01-S08：12個は扱えない）。
// 同じ「猫の気まぐれ」系統の はなびら うらない とは、決まり方（はなびらは のこった1枚、こちらは あたまの向き）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が すやすや ねている（Z が のぼる）。
// 2. ごろん、ごろんと ねがえりを打つ。向きは右まわりにも左まわりにも変わる。
// 3. さいごの1回は、半分まで ころがって もどりかけ、どちらへ行くか分からない。
// 結果は先に乱数で決め（RS01-S14）、ねがえりの角度の並びを、決めた札の向きで終わるように組む。
// 札はどれも同じ大きさで、同じ間かくに並ぶ（出やすさは札に表れない：RS01-S21）。
import { C } from '../art.js';
import { catCurled } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

export const MAX = 8;

// 札 i の向き（度。0 が上、右まわり）。いちばん上から右まわりに同じ間かくで並べる
export const tagAngle = (i, n) => (360 * i) / n;

// ねがえりの並び：向きを変える回数ぶんの「札の番号」。決めた札 decided で終わり、続けて同じ札にならない。
// 回数は 3〜4（2つの時は 3）。rand() は 0 以上 1 未満
export function rollSequence(n, decided, rand = Math.random) {
  const count = n <= 2 ? 3 : 3 + Math.floor(rand() * 2);
  // さいごから前へ組む（どの数でも、となりと違う札を必ず選べる）
  const seq = [decided];
  while (seq.length < count) {
    const next = seq[0];
    let j = Math.floor(rand() * (n - 1));
    if (j >= next) j++;
    seq.unshift(j);
  }
  return seq;
}

// from の向き（度）から to の向きへ、近い方へまわる角度の差（-180〜180）
export const turnDelta = (from, to) => ((((to - from) % 360) + 540) % 360) - 180;

// 押してから結果が出るまでの、おおよその時間（ミリ秒）
export function negaeriDuration(count) {
  return 900 + (count - 1) * (820 + 520) + 700 + 500 + 650;
}

export function createNegaeri({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;
  let heading = 0; // いまの あたまの向き（度。0 が上、右まわり）

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const cx = W / 2;
    const cy = H / 2;
    // 4・8 個の時は真横にも札が来るので、札を少し細くし、ラグと猫を札の間に収める
    const sides = n % 4 === 0;
    const tagW = sides ? Math.min(124, W * 0.33) : Math.min(150, W * 0.38);
    const tagH = Math.max(30, Math.min(42, H * 0.075));
    // 札は、たての だ円の上に並べる（横に広い札が画面からはみ出さないように）
    const rx = W / 2 - tagW / 2 - 6;
    const ry = H / 2 - tagH / 2 - 6;
    const tags = Array.from({ length: n }, (_, i) => {
      const a = (tagAngle(i, n) * Math.PI) / 180;
      return { x: cx + Math.sin(a) * rx, y: cy - Math.cos(a) * ry };
    });
    // 猫から見た札の向き（だ円なので、並びの角度とは少し違う）
    const dirs = tags.map((t) => ((Math.atan2(t.x - cx, -(t.y - cy)) * 180) / Math.PI + 360) % 360);
    const rugR = Math.max(44, Math.min(rx - tagW / 2 + 18, ry * 0.55, 120, sides ? W / 2 - 6 - tagW - 8 : Infinity));
    const catS = Math.min(1, (rugR * 0.95) / 64);
    geo = { n, W, H, cx, cy, tags, dirs, tagW, tagH, rugR, catS };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // まるい ラグ
    s += `<circle cx="${cx}" cy="${cy}" r="${(rugR + 8).toFixed(1)}" fill="#f7c4b4" opacity="0.55"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${rugR.toFixed(1)}" fill="#fde3d6" stroke="#f1b8a3" stroke-width="3"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${(rugR * 0.72).toFixed(1)}" fill="none" stroke="#fffaf0" stroke-width="3" stroke-dasharray="4 7" stroke-linecap="round"/>`;
    // 札と、ラグへの点線
    let minLabel = Infinity;
    choices.forEach((label, i) => {
      const t = tags[i];
      const size = Math.max(12, Math.min(22, tagH * 0.56, (tagW - 16) / Math.max(charCount(label), 1)));
      minLabel = Math.min(minLabel, size);
      const a = (dirs[i] * Math.PI) / 180;
      const lx = cx + Math.sin(a) * (rugR + 10);
      const ly = cy - Math.cos(a) * (rugR + 10);
      s += `<path d="M${lx.toFixed(1)},${ly.toFixed(1)} L${t.x.toFixed(1)},${t.y.toFixed(1)}" stroke="${C.chestnut}" stroke-width="1.6" stroke-dasharray="3 5" opacity="0.45"/>`;
      s += `<g class="tag" data-i="${i}">`
        + `<rect class="tag-bg" x="${(t.x - tagW / 2).toFixed(1)}" y="${(t.y - tagH / 2).toFixed(1)}" width="${tagW.toFixed(1)}" height="${tagH.toFixed(1)}" rx="${(tagH / 2).toFixed(1)}" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="2"/>`
        + `<text class="cell-label" x="${t.x.toFixed(1)}" y="${t.y.toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g>`;
    });
    // 猫と、Z
    s += `<g class="ng-cat" transform="translate(${cx} ${cy})"><g class="ng-rot"><g class="ng-squash"><g class="ng-in">${catCurled(cat)}</g></g></g></g>`;
    s += `<g class="ng-z"></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      rot: svg.querySelector('.ng-rot'),
      squash: svg.querySelector('.ng-squash'),
      catIn: svg.querySelector('.ng-in'),
      z: svg.querySelector('.ng-z'),
      tags: Array.from(svg.querySelectorAll('.tag')),
    };
    heading = dirs[Math.floor(Math.random() * n)] + 25;
    setHeading(heading);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  // あたまの向き（度。0 が上）。猫の絵は あたまが右（90 度）なので、90 を引いてまわす
  function setHeading(deg, squash = 1) {
    refs.rot.setAttribute('transform', `rotate(${(deg - 90).toFixed(2)}) scale(${geo.catS.toFixed(3)})`);
    refs.squash.setAttribute('transform', `scale(1 ${squash.toFixed(3)})`);
  }

  function setCat(opts) {
    refs.catIn.innerHTML = catCurled(cat, opts);
  }

  // すやすや：Z が のぼる
  function puffZ() {
    const t = svgEl('text', { x: (geo.cx + geo.rugR * 0.35).toFixed(1), y: (geo.cy - geo.rugR * 0.35).toFixed(1), 'font-size': '20', 'font-weight': '700', fill: C.chestnut, opacity: '0' });
    t.textContent = 'z';
    refs.z.appendChild(t);
    t.animate([{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { transform: 'translate(14px,-34px)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => t.remove();
  }

  // いちばん近い向きの札
  function tagAt(deg) {
    let best = 0;
    let bestD = Infinity;
    geo.dirs.forEach((d, i) => {
      const diff = Math.abs(turnDelta(deg, d));
      if (diff < bestD) { bestD = diff; best = i; }
    });
    return best;
  }

  // ごろんと向きを変える（delta 度）
  async function roll(delta, dur) {
    const from = heading;
    audio.roll(Math.floor(Math.random() * 5));
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      setHeading(from + delta * e, 1 - 0.18 * Math.sin(Math.PI * t));
    });
    heading = from + delta;
    setHeading(heading);
  }

  function lightTag(i, strong) {
    refs.tags.forEach((g, k) => {
      const bg = g.querySelector('.tag-bg');
      const on = k === i;
      bg.setAttribute('fill', on ? (strong ? '#fff1c4' : '#fff8e4') : C.paper);
      bg.setAttribute('stroke', on && strong ? C.momiji : C.woodDeep);
      bg.setAttribute('stroke-width', on && strong ? '4' : '2');
    });
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「ごろん」を おしてね');
    play.textContent = 'ごろん';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, dirs } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const seq = rollSequence(n, decided);
    // 1. すやすや
    showHint(result, 'すやすや…');
    for (let k = 0; k < 2; k++) { puffZ(); await wait(450); }
    // 2. ごろん、ごろん（右まわりにも左まわりにも）
    for (let k = 0; k < seq.length; k++) {
      const last = k === seq.length - 1;
      let delta = turnDelta(heading, dirs[seq[k]]);
      // ときどき、遠まわりで ぐるっと まわる
      if (!last && Math.abs(delta) < 120 && Math.random() < 0.35) delta += delta >= 0 ? -360 : 360;
      if (last) {
        // 3. さいごの1回：半分まで ころがって もどりかけ、もう一度 ころがる
        showHint(result, 'むにゃむにゃ…');
        const from = heading;
        await frames(700, (t) => setHeading(from + delta * 0.5 * ease.inOutSine(t), 1 - 0.12 * Math.sin(Math.PI * t)));
        audio.heart();
        await frames(500, (t) => setHeading(from + delta * (0.5 - 0.22 * Math.sin(Math.PI * t)), 1));
        heading = from + delta * 0.5;
        await roll(delta * 0.5, 650);
      } else {
        showHint(result, 'ごろん…');
        await roll(delta, 820);
        lightTag(seq[k], false);
        puffZ();
        await wait(520);
      }
    }
    const landed = tagAt(((heading % 360) + 360) % 360);
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    // めをさまして、にっこり
    setCat({ sleep: false, mood: 'happy' });
    lightTag(landed, true);
    refs.tags[landed].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    showResult(result, 'こっちを むいたよ', getChoices()[landed]);
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
