// ねこの つりぼり（決め方：釣る。見せ方の部品：横から見た池の、深さごとの札〈タナ〉と さかな）。
// 池を横から見て、深さ（タナ）ごとに選択肢の札を立てる。どの深さにも さかなが1ぴき およいでいる。
// 猫が つりばりを しずめ、さかなが食いついた深さの札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が つりざおを ふって、はりを池に入れる。
// 2. はりが深さを変えるたびに、その深さの さかなが よってきて つつく。うきが ぴくっと動くが、さかなは はなれていく（1〜2回）。
// 3. さいごの深さで、さかなが つついて、つついて、ぐいっと食いつく。うきが しずみ、猫が つりあげる。
// 結果は先に乱数で決め（RS01-S14）、はりを止める深さの並びを、決めた深さで終わるように組む。
// はなれていく さかなは もとの所へ もどるだけで、札は そのまま読める（どの選択肢も残念がらせない：RS01-S15）。
// v16：選択肢は さかなが しっぽの うしろに 糸で ひっぱる 木の札に じかに書く（左の白い札を やめた）。さかなは 金魚と こいが中心
// （和金・紅白・でめきん・山吹・更紗・ふな・昭和・らんちゅう・めだか・浅黄・琉金・なまず）。つれると 札も 水の上に あがる。
// 札はどれも同じ大きさで、同じ間かく（出やすさは表れない：RS01-S21）。
import { C } from '../art.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';
import { TINTS, pastelTag } from './common.js';

// はりを止める深さの並び。決めた深さ decided で終わり、続けて同じ深さにならない。止める数は 2〜3。rand() は 0 以上 1 未満
export function depthPlan(n, decided, rand = Math.random) {
  const count = n <= 2 ? 2 : 2 + Math.floor(rand() * 2);
  const seq = [decided];
  while (seq.length < count) {
    const next = seq[0];
    let j = Math.floor(rand() * (n - 1));
    if (j >= next) j++;
    seq.unshift(j);
  }
  return seq;
}

// 押してから結果が出るまでの、おおよその時間（ミリ秒）
// 動きの時間（ミリ秒）
export const T = { cast: 800, move: 440, come: 420, comeLast: 520, peck: 250, peckLast: 240, rest: 120, leave: 360, bite: 450, reel: 700 };
export function tsuriDuration(count) {
  const fake = T.move + T.come + 2 * (T.peck + T.rest) + T.leave;
  const final = T.move + T.comeLast + 3 * (T.peckLast + T.rest) + T.bite + T.reel;
  return T.cast + (count - 1) * fake + final;
}

// さかなの しゅるい（v16：金魚と こいを中心に、ほかの さかなも まぜる。12ひきのうち 8ひきが 金魚か こい）
export const KINDS = ['wakin', 'kohaku', 'demekin', 'yamabuki', 'sarasa', 'funa', 'showa', 'ranchu', 'medaka', 'asagi', 'ryukin', 'namazu'];
export const KIND_NAMES = { wakin: '和金', kohaku: '紅白', demekin: 'でめきん', yamabuki: '山吹', sarasa: '更紗', funa: 'ふな', showa: '昭和', ranchu: 'らんちゅう', medaka: 'めだか', asagi: '浅黄', ryukin: '琉金', namazu: 'なまず' };
const GOLD = { wakin: ['#f4733f', '#d9542a', null], demekin: ['#4a4a58', '#2f2f3a', '#8a8a9a'], sarasa: ['#fffaf4', '#e46a4a', '#ee5a3c'], ranchu: ['#f7903f', '#d96a2a', null], ryukin: ['#f6704a', '#d24f30', '#fffaf4'] };
const KOI = { kohaku: ['#fffaf4', '#e7a483', '#ee5a3c', null], yamabuki: ['#f8c84a', '#d9a42a', null, null], showa: ['#fffaf4', '#8a7a70', '#ee5a3c', '#3a3a44'], asagi: ['#b9cad8', '#7f97ad', '#f08a5d', null] };

// さかな（中心 0,0、左を向く。長さは約 2.4s）
export function fishSVG(s, i) {
  const kind = KINDS[i % KINDS.length];
  const r = (v) => (v * s).toFixed(2);
  const eye = (x, y, big = 0.12) => `<circle cx="${r(x)}" cy="${r(y)}" r="${r(big)}" fill="#ffffff"/><circle cx="${r(x - 0.02)}" cy="${r(y)}" r="${r(big * 0.62)}" fill="#3a2e2a"/>`;
  if (GOLD[kind]) {
    const [body, edge, spot] = GOLD[kind];
    const tail = kind === 'wakin' || kind === 'ranchu' ? 0.7 : 1;
    let o = `<path d="M${r(0.55)},0 C${r(0.9)},${r(-0.75 * tail)} ${r(1.5)},${r(-0.85 * tail)} ${r(1.45)},${r(-0.2)} Q${r(1.2)},0 ${r(1.45)},${r(0.2)} C${r(1.5)},${r(0.85 * tail)} ${r(0.9)},${r(0.75 * tail)} ${r(0.55)},0 Z" fill="${body}" stroke="${edge}" stroke-width="${r(0.06)}" opacity="0.85"/>`
      + `<path d="M${r(0.7)},${r(-0.3)} L${r(1.3)},${r(-0.5)} M${r(0.7)},${r(0.3)} L${r(1.3)},${r(0.5)}" stroke="${edge}" stroke-width="${r(0.04)}" opacity="0.6"/>`;
    if (kind !== 'ranchu') o += `<path d="M${r(-0.2)},${r(-0.5)} Q${r(0.15)},${r(-0.95)} ${r(0.45)},${r(-0.45)} Z" fill="${body}" stroke="${edge}" stroke-width="${r(0.05)}"/>`;
    o += `<ellipse cx="0" cy="0" rx="${r(0.72)}" ry="${r(0.56)}" fill="${body}" stroke="${edge}" stroke-width="${r(0.07)}"/>`;
    if (spot) o += `<ellipse cx="${r(0.1)}" cy="${r(-0.15)}" rx="${r(0.32)}" ry="${r(0.24)}" fill="${spot}" opacity="0.9"/>`;
    o += `<ellipse cx="${r(-0.1)}" cy="${r(0.28)}" rx="${r(0.38)}" ry="${r(0.16)}" fill="#ffffff" opacity="0.3"/>`
      + `<path d="M${r(-0.05)},${r(0.15)} q${r(0.2)},${r(0.2)} ${r(0.35)},${r(0.1)}" stroke="${edge}" stroke-width="${r(0.05)}" fill="none" opacity="0.6"/>`;
    o += kind === 'demekin' ? eye(-0.45, -0.22, 0.2) : eye(-0.45, -0.12);
    return o;
  }
  if (KOI[kind]) {
    const [body, edge, red, black] = KOI[kind];
    let o = `<path d="M${r(0.95)},0 L${r(1.4)},${r(-0.4)} Q${r(1.28)},0 ${r(1.4)},${r(0.4)} Z" fill="${red || body}" stroke="${edge}" stroke-width="${r(0.05)}" opacity="0.9"/>`
      + `<path d="M${r(-0.1)},${r(-0.38)} Q${r(0.25)},${r(-0.7)} ${r(0.55)},${r(-0.32)} Z" fill="${body}" stroke="${edge}" stroke-width="${r(0.05)}"/>`
      + `<path d="M${r(-1)},0 C${r(-0.9)},${r(-0.42)} ${r(0.5)},${r(-0.5)} ${r(1)},0 C${r(0.5)},${r(0.48)} ${r(-0.9)},${r(0.42)} ${r(-1)},0 Z" fill="${body}" stroke="${edge}" stroke-width="${r(0.06)}"/>`;
    if (red) o += `<path d="M${r(-0.55)},${r(-0.3)} C${r(-0.3)},${r(-0.45)} ${r(0.05)},${r(-0.4)} ${r(0.1)},${r(-0.1)} C${r(-0.15)},${r(0.05)} ${r(-0.5)},0 ${r(-0.55)},${r(-0.3)} Z M${r(0.3)},${r(-0.32)} C${r(0.5)},${r(-0.36)} ${r(0.75)},${r(-0.2)} ${r(0.7)},${r(-0.02)} C${r(0.5)},0 ${r(0.32)},${r(-0.1)} ${r(0.3)},${r(-0.32)} Z" fill="${red}"/>`;
    if (black) o += `<ellipse cx="${r(0.05)}" cy="${r(0.12)}" rx="${r(0.18)}" ry="${r(0.12)}" fill="${black}"/><ellipse cx="${r(0.6)}" cy="${r(-0.22)}" rx="${r(0.12)}" ry="${r(0.08)}" fill="${black}"/>`;
    o += `<path d="M${r(-0.3)},${r(0.3)} l${r(0.25)},${r(0.28)} l${r(0.12)},${r(-0.26)} Z" fill="${body}" stroke="${edge}" stroke-width="${r(0.04)}"/>`
      + `<path d="M${r(-0.95)},${r(0.05)} q${r(-0.12)},${r(0.18)} ${r(-0.05)},${r(0.3)}" stroke="${edge}" stroke-width="${r(0.05)}" fill="none"/>`
      + eye(-0.7, -0.12, 0.09);
    return o;
  }
  const col = { funa: ['#b9c6b0', '#879a7e'], medaka: ['#ecdca6', '#c9b26a'], namazu: ['#9a8a74', '#6f604f'] }[kind];
  if (kind === 'namazu') {
    return `<path d="M${r(0.9)},0 L${r(1.3)},${r(-0.3)} L${r(1.3)},${r(0.3)} Z" fill="${col[1]}"/>`
      + `<path d="M${r(-1.05)},${r(0.1)} C${r(-1)},${r(-0.42)} ${r(0.5)},${r(-0.38)} ${r(1)},0 C${r(0.5)},${r(0.36)} ${r(-0.9)},${r(0.4)} ${r(-1.05)},${r(0.1)} Z" fill="${col[0]}" stroke="${col[1]}" stroke-width="${r(0.06)}"/>`
      + `<path d="M${r(-1)},${r(0.05)} q${r(-0.3)},${r(-0.1)} ${r(-0.4)},${r(-0.4)} M${r(-1)},${r(0.15)} q${r(-0.3)},${r(0.1)} ${r(-0.45)},${r(0.35)}" stroke="${col[1]}" stroke-width="${r(0.06)}" fill="none" stroke-linecap="round"/>`
      + eye(-0.75, -0.1, 0.08);
  }
  const k = kind === 'medaka' ? 0.8 : 1;
  return `<path d="M${r(0.9 * k)},0 L${r(1.4 * k)},${r(-0.45 * k)} L${r(1.4 * k)},${r(0.45 * k)} Z" fill="${col[1]}"/>`
    + `<ellipse cx="0" cy="0" rx="${r(1 * k)}" ry="${r(0.5 * k)}" fill="${col[0]}" stroke="${col[1]}" stroke-width="${r(0.07)}"/>`
    + `<path d="M${r(-0.1)},${r(-0.35 * k)} q${r(0.15)},${r(0.35 * k)} 0,${r(0.7 * k)}" stroke="${col[1]}" stroke-width="${r(0.06)}" fill="none" opacity="0.7"/>`
    + eye(-0.6 * k, -0.08, 0.1);
}

export function createTsuri({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;
  let fish = []; // { x, dir, speed }

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const topRoom = Math.max(78, Math.min(110, H * 0.19)); // さんばしと猫（つれた札も ここに出す）
    const waterTop = topRoom;
    const bandH = Math.min(56, (H - 8 - waterTop - 14) / n);
    const bandsTop = waterTop + 14 + Math.max(0, (H - 8 - waterTop - 14 - bandH * n) / 2);
    const tagH = Math.max(22, Math.min(32, bandH - 4));
    const fishS = Math.max(8, Math.min(24, bandH * 0.44));
    const catS = Math.max(0.3, Math.min(0.46, (topRoom - 10) / 160));
    const catAt = { x: 10 + 60 * catS, y: waterTop - 6 - 78 * catS };
    const lineX = catAt.x + 60 * catS + 30;
    const rodTip = { x: lineX, y: Math.max(8, waterTop - topRoom * 0.78) };
    const bandY = (i) => bandsTop + bandH * (i + 0.5);
    // 札：さかなが 糸で ひっぱる 木の札（文字の長さで はばを決める）
    const room = W - 8 - (lineX + fishS * 2.6 + 30);
    let size = Math.max(12, Math.min(18, tagH * 0.62));
    const longest = Math.max(1, ...choices.map((c) => charCount(c)));
    if (longest * size + 14 > room) size = Math.max(12, (room - 14) / longest);
    const tws = choices.map((c) => Math.min(room, Math.max(50, charCount(c) * size + 14)));
    geo = { n, W, H, waterTop, bandH, bandY, tagH, tws, lineX, fishS, catS, catAt, rodTip, size };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let o = '';
    // 池（上ほど明るい水）と 水面の きらきら
    o += `<defs><linearGradient id="tsW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4eef2"/><stop offset="1" stop-color="#a9d3dc"/></linearGradient></defs>`;
    o += `<rect x="4" y="${waterTop}" width="${W - 8}" height="${(H - 4 - waterTop).toFixed(1)}" rx="18" fill="url(#tsW)" stroke="#8fc3cf" stroke-width="3"/>`;
    o += `<path d="M10,${waterTop + 6} q12,-6 24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7"/>`;
    // 池の そこの 小石と 水草
    for (let k = 0; k < 9; k++) o += `<ellipse cx="${(14 + ((k * 47) % (W - 28))).toFixed(1)}" cy="${(H - 10 - (k % 3) * 3).toFixed(1)}" rx="${(5 + (k % 3) * 2).toFixed(1)}" ry="3.4" fill="#9fb8b0" opacity="0.6"/>`;
    [[14, H - 6, 1], [W - 18, H - 6, 0.8], [W * 0.55, H - 6, 0.7]].forEach(([x, y, k]) => {
      o += `<path d="M${x},${y} q-4,-22 2,-40 M${x + 6},${y} q4,-18 -2,-32 M${x - 6},${y} q-6,-14 0,-26" stroke="#7fae6a" stroke-width="${(3 * k).toFixed(1)}" fill="none" stroke-linecap="round" opacity="0.7"/>`;
    });
    // さんばし（左）
    o += `<rect x="4" y="${(waterTop - 10).toFixed(1)}" width="${(lineX + 16).toFixed(1)}" height="10" rx="3" fill="#e3bb84" stroke="#b98a52" stroke-width="2"/>`
      + `<rect x="${(lineX - 4).toFixed(1)}" y="${(waterTop - 4).toFixed(1)}" width="8" height="22" fill="#c99a62"/>`;
    o += `<g class="ts-fx"></g>`;
    // 深さの線と、さかな と 札（さかなは いつも左向き。札は しっぽの うしろ）
    fish = choices.map((_, i) => {
      const lo = lineX + fishS * 1.05 + 22;
      const hi = W - 8 - fishS * 1.45 - 8 - tws[i] - 10;
      const home = lo + Math.max(0, hi - lo) * ((i * 0.37 + 0.2) % 1);
      return { home, x: home, phase: i * 1.7, speed: 0.0012 + (i % 3) * 0.0004 };
    });
    choices.forEach((label, i) => {
      const y = bandY(i);
      const tl = fish[i].home + fishS * 1.45 + 8;
      const tw = tws[i];
      o += `<path d="M${(lineX - 10).toFixed(1)},${y.toFixed(1)} H${W - 10}" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="3 7" opacity="0.45"/>`;
      o += `<g class="fish" data-i="${i}">${fishSVG(fishS, i)}</g>`;
      o += `<g class="tag" data-i="${i}">`
        + `<path class="ts-string" d="M${(fish[i].home + fishS * 1.35).toFixed(1)},${y.toFixed(1)} L${tl.toFixed(1)},${y.toFixed(1)}" stroke="#8a7a70" stroke-width="1.2"/>`
        + pastelTag(i, tl, y - tagH / 2, tw, tagH, 'tag-bg')
        + `<circle cx="${(tl + 5).toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="#fffaf0" stroke="${TINTS[i % TINTS.length][1]}" stroke-width="1"/>`
        + `<text class="cell-label" x="${(tl + 4 + tw / 2).toFixed(1)}" y="${y.toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g>`;
    });
    // 糸・うき・はり
    o += `<path class="ts-line" d="" stroke="#6b5a4e" stroke-width="1.4" fill="none"/>`;
    o += `<g class="ts-hook"><path d="M0,-6 V3 q0,5 -5,5 q-4,0 -4,-4" stroke="#8a7a70" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="0" cy="-6" r="2.4" fill="${C.momiji}"/></g>`;
    o += `<g class="ts-bob"><ellipse cx="0" cy="0" rx="6" ry="8" fill="#ffffff" stroke="${C.ink}" stroke-width="1.6"/><path d="M-6,-1 H6 A6,8 0 0 0 -6,-1 Z" fill="${C.momiji}"/></g>`;
    o += `<g class="ts-catch" visibility="hidden"></g>`;
    // かめ（動きの ちがいで そこを よこぎる）
    o += `<g class="ts-kame" visibility="hidden"><ellipse rx="16" ry="10" fill="#9cc96b" stroke="#6f9a4a" stroke-width="2"/><path d="M-8,-6 L0,0 L8,-6 M-10,3 H10" stroke="#6f9a4a" stroke-width="1.4" fill="none"/><circle cx="-20" cy="0" r="5.5" fill="#b9dc8f" stroke="#6f9a4a" stroke-width="1.6"/><circle cx="-22" cy="-1.5" r="1" fill="#3a2e2a"/><ellipse cx="-10" cy="10" rx="4" ry="2.6" fill="#b9dc8f"/><ellipse cx="10" cy="10" rx="4" ry="2.6" fill="#b9dc8f"/></g>`;
    // 猫と つりざお
    o += `<path class="ts-rod" d="" stroke="#9b5f3a" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
    o += `<g transform="translate(${catAt.x.toFixed(1)} ${catAt.y.toFixed(1)}) scale(${catS.toFixed(3)})"><g class="ts-cat">${catSitting(cat, { look: { x: 1, y: 0.6 } })}</g></g>`;
    svg.innerHTML = o;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      tags: Array.from(svg.querySelectorAll('.tag')),
      fish: Array.from(svg.querySelectorAll('.fish')),
      line: svg.querySelector('.ts-line'),
      hook: svg.querySelector('.ts-hook'),
      bob: svg.querySelector('.ts-bob'),
      rod: svg.querySelector('.ts-rod'),
      catch: svg.querySelector('.ts-catch'),
      catG: svg.querySelector('.ts-cat'),
      kame: svg.querySelector('.ts-kame'),
      fx: svg.querySelector('.ts-fx'),
    };
    fish.forEach((f, i) => placeFish(i, f.x, 0));
    setTackle(geo.waterTop - 2, 0);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = size.toFixed(1);
  }

  // さかな i を x に置く（いつも左向き）。札は しっぽの うしろに ついてくる。wiggle は 上下の ゆれ
  function placeFish(i, x, wiggle) {
    const f = fish[i];
    const y = geo.bandY(i) + Math.sin(wiggle) * 1.5;
    refs.fish[i].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    refs.tags[i].setAttribute('transform', `translate(${(x - f.home).toFixed(1)} ${(y - geo.bandY(i)).toFixed(1)})`);
  }

  // さかなを その場で ゆっくり ゆらす（skip の さかなは動かさない）
  function swim(dt, skip = -1) {
    const now = performance.now();
    fish.forEach((f, i) => {
      if (i === skip) return;
      f.x = f.home + Math.sin(now * f.speed + f.phase) * 7;
      placeFish(i, f.x, now / 300 + i);
    });
  }

  // うき（水面）と、はり（hookY）と、糸。twitch は うきの しずみ（0〜1）
  function setTackle(hookY, twitch) {
    const { lineX, waterTop, rodTip } = geo;
    const bobY = waterTop + twitch * 10;
    refs.bob.setAttribute('transform', `translate(${lineX.toFixed(1)} ${bobY.toFixed(1)})`);
    refs.hook.setAttribute('transform', `translate(${lineX.toFixed(1)} ${hookY.toFixed(1)})`);
    refs.line.setAttribute('d', `M${rodTip.x.toFixed(1)},${rodTip.y.toFixed(1)} Q${(rodTip.x - 4).toFixed(1)},${((rodTip.y + bobY) / 2).toFixed(1)} ${lineX.toFixed(1)},${(bobY - 6).toFixed(1)} M${lineX.toFixed(1)},${(bobY + 6).toFixed(1)} L${lineX.toFixed(1)},${(hookY - 6).toFixed(1)}`);
    const { catAt, catS } = geo;
    const hand = { x: catAt.x + 38 * catS, y: catAt.y + 20 * catS };
    refs.rod.setAttribute('d', `M${hand.x.toFixed(1)},${hand.y.toFixed(1)} Q${((hand.x + rodTip.x) / 2).toFixed(1)},${(Math.min(hand.y, rodTip.y) - 14 + twitch * 12).toFixed(1)} ${rodTip.x.toFixed(1)},${(rodTip.y + twitch * 10).toFixed(1)}`);
  }

  // はりの いまの深さ（いちばん近い深さの札）
  const depthAt = (y) => Math.max(0, Math.min(geo.n - 1, Math.round((y - geo.bandY(0)) / geo.bandH)));

  function lightTag(i, strong) {
    refs.tags.forEach((g, k) => {
      const bg = g.querySelector('.tag-bg');
      const on = k === i;
      bg.setAttribute('fill', on ? (strong ? '#fff1c4' : '#fff6dc') : TINTS[k % TINTS.length][0]);
      bg.setAttribute('stroke', on && strong ? C.momiji : TINTS[k % TINTS.length][1]);
      bg.setAttribute('stroke-width', on && strong ? '4' : on ? '3' : '2');
    });
  }

  // 水面の しぶき と 波紋（x の所）
  function splash(x, y) {
    const NS = 'http://www.w3.org/2000/svg';
    const r = document.createElementNS(NS, 'ellipse');
    r.setAttribute('cx', x.toFixed(1));
    r.setAttribute('cy', y.toFixed(1));
    r.setAttribute('rx', '10');
    r.setAttribute('ry', '3');
    r.setAttribute('fill', 'none');
    r.setAttribute('stroke', '#ffffff');
    r.setAttribute('stroke-width', '2');
    r.style.transformOrigin = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    refs.fx.appendChild(r);
    r.animate([{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(3)', opacity: 0 }], { duration: 800, easing: 'ease-out' }).onfinish = () => r.remove();
    for (let q = 0; q < 5; q++) {
      const d = document.createElementNS(NS, 'circle');
      d.setAttribute('cx', x.toFixed(1));
      d.setAttribute('cy', y.toFixed(1));
      d.setAttribute('r', '2.4');
      d.setAttribute('fill', '#e6f6fa');
      d.setAttribute('stroke', '#8fc3cf');
      refs.fx.appendChild(d);
      const dx = (q - 2) * 7;
      d.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,-${12 + (q % 3) * 6}px)`, offset: 0.5 }, { transform: `translate(${dx * 1.5}px,2px)`, opacity: 0 }], { duration: 560 }).onfinish = () => d.remove();
    }
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「つる」を おしてね');
    play.textContent = 'つる';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, W, H, lineX, bandY, waterTop, fishS } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const plan = depthPlan(n, decided);
    // 動きの ちがい（3B：4つ）：ふつう・おおもの・ほかの さかなが はねる・かめが そこを よこぎる
    const vr = Math.random();
    const variant = vr < 0.25 ? 'big' : vr < 0.5 ? 'jump' : vr < 0.75 ? 'kame' : 'plain';
    stage.dataset.variant = variant;
    let last = performance.now();
    const tick = (skip = -1) => { const now = performance.now(); swim(now - last, skip); last = now; };
    // 1. つりざおを ふって、はりを池に入れる
    showHint(result, 'えいっ…');
    setCat('normal', { x: -1, y: 0.4 });
    audio.toss();
    await frames(T.cast, (t) => { setTackle(waterTop - 2 + (bandY(0) - 30 - waterTop) * ease.outCubic(t) * Math.min(1, t * 1.5), Math.sin(t * Math.PI) * 0.3); tick(); });
    let hookY = bandY(0) - 30;
    if (variant === 'jump' && n > 1) {
      // ほかの さかなが ぱしゃっと はねる
      const j = (decided + 1 + Math.floor(Math.random() * (n - 1))) % n;
      const jx = fish[j].x;
      const NS = 'http://www.w3.org/2000/svg';
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = fishSVG(fishS * 1.1, j);
      refs.fx.appendChild(g);
      showHint(result, 'ぱしゃっ！');
      audio.pop();
      splash(jx, waterTop);
      await frames(520, (t) => g.setAttribute('transform', `translate(${(jx - t * 30).toFixed(1)} ${(waterTop - Math.sin(Math.PI * t) * 40).toFixed(1)}) rotate(${(-30 + 60 * t).toFixed(0)})`));
      g.remove();
      splash(jx - 30, waterTop);
    }
    // 2. 深さを変えて、さかなが つつく
    for (let k = 0; k < plan.length; k++) {
      const d = plan[k];
      const final = k === plan.length - 1;
      const y = bandY(d);
      if (variant === 'kame' && k === 0) {
        // かめが 池の そこを のんびり よこぎる
        refs.kame.setAttribute('visibility', 'visible');
        refs.kame.animate([{ transform: `translate(${W + 30}px, ${H - 22}px)` }, { transform: `translate(-30px, ${H - 26}px)` }], { duration: 3200, easing: 'linear', fill: 'forwards' }).onfinish = () => refs.kame.setAttribute('visibility', 'hidden');
        setTimeout(() => showHint(result, 'あ、かめさん…'), 300);
      }
      showHint(result, final && plan.length > 1 ? 'こんどは…？' : 'じっと まつ…');
      const fromY = hookY;
      await frames(T.move, (t) => { setTackle(fromY + (y - fromY) * ease.inOutSine(t), 0); tick(); });
      hookY = y;
      lightTag(d, false);
      // その深さの さかなが よってくる
      const f = fish[d];
      const side = 1; // さかなは いつも 右から はりへ よってくる（口が はりに来る）
      const near = lineX + fishS * 1.05 + 3;
      const fx = f.x;
      await frames(final ? T.comeLast : T.come, (t) => { f.x = fx + (near - fx) * ease.outCubic(t); placeFish(d, f.x, t * 20); tick(d); });
      // つつく（うきが ぴくっ）
      const pecks = final ? 3 : 2;
      for (let p = 0; p < pecks; p++) {
        audio.ping(p, p % 2 ? 1 : -1);
        await frames(final ? T.peckLast : T.peck, (t) => { setTackle(hookY, Math.sin(Math.PI * t) * 0.5); placeFish(d, near - side * Math.sin(Math.PI * t) * 4, t * 30); tick(d); });
        await frames(T.rest, () => tick(d));
      }
      if (!final) {
        // はなれていく
        const away = f.home;
        const ax = f.x;
        await frames(T.leave, (t) => { f.x = ax + (away - ax) * t; placeFish(d, f.x, t * 20); tick(d); });
        continue;
      }
      // 3. ぐいっと食いつく
      showHint(result, 'きた…！');
      audio.heart();
      await frames(T.bite, (t) => { setTackle(hookY, 0.5 + 0.5 * Math.min(1, t * 2)); tick(d); });
      // 動きの ちがい：おおもの！ ひっぱりあいが 長くなる
      if (variant === 'big') {
        showHint(result, 'おおもの…！ がんばれ！');
        setCat('strain', { x: -1, y: 0.6 });
        audio.stretch(0.7);
        await frames(700, (t) => { setTackle(hookY + Math.sin(t * Math.PI * 8) * 4, 1); placeFish(d, near + Math.sin(t * Math.PI * 10) * 6, t * 60); tick(d); });
      }
    }
    const landed = depthAt(hookY); // はりが いた深さ
    // つりあげる：さかなが はりと いっしょに 水の上へ
    setCat('strain', { x: -1, y: -0.2 });
    refs.fish[landed].setAttribute('visibility', 'hidden');
    refs.catch.innerHTML = fishSVG(fishS * 1.15, landed);
    refs.catch.setAttribute('visibility', 'visible');
    audio.toss();
    splash(lineX, waterTop);
    const upY = waterTop - 30;
    // 札も いっしょに 水の上へ（はりの 右、水面の上で 読める所）
    const tagG = refs.tags[landed];
    tagG.querySelector('.ts-string').setAttribute('visibility', 'hidden');
    const f0 = fish[landed];
    const t0x = f0.x - f0.home;
    const t0y = 0;
    const t1x = lineX + 16 - (f0.home + fishS * 1.45 + 8);
    const t1y = waterTop - geo.tagH / 2 - 8 - bandY(landed);
    await frames(T.reel, (t) => {
      const e = ease.inOutSine(t);
      const y = hookY + (upY - hookY) * e;
      setTackle(Math.min(y, hookY), t < 0.2 ? 1 : 0);
      refs.catch.setAttribute('transform', `translate(${(lineX + Math.sin(t * Math.PI * 6) * 4).toFixed(1)} ${(y + 8).toFixed(1)}) rotate(${(70 + Math.sin(t * Math.PI * 8) * 20).toFixed(1)})`);
      tagG.setAttribute('transform', `translate(${(t0x + (t1x - t0x) * e).toFixed(1)} ${(t0y + (t1y - t0y) * e).toFixed(1)})`);
      tick(landed);
    });
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    setCat('happy');
    audio.stamp();
    lightTag(landed, true);
    refs.tags[landed].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    showResult(result, 'つれたよ！', getChoices()[landed]);
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
