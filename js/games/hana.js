// はなびら うらない（決め方：花びらを1枚ずつ抜いて、さいごに残った1枚。見せ方の部品：円に並ぶ花びら）。
// 選択肢を1枚ずつ花びらに書き、猫の手が花びらを抜いていく。さいごに残った花びらが結果になる。
// 秋の見た目では、花はコスモス。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 花びらが減るほど、抜くのがゆっくりになる。
// 2. のこり2枚になったら、猫の手が2枚の間で まよう（「どっちに しようかな」）。そのあと、結果でない方を抜く。
// 結果は先に乱数で決め（RS01-S14）、抜く順は、決めた花びらを最後に残すように並べる。
// 花びらはどれも同じ大きさ（出やすさは、抜く順で決まり、花びらの大きさには表れない：RS01-S21）。
import { C } from '../art.js';
import { look } from '../look.js';
import { catSitting, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

// 季節の花（どれも明るい色で、花びらの文字が読める）：春 さくら・夏 ひまわり・秋 コスモス・冬 さざんか
const FLOWERS = {
  haru: { petals: ['#fbd9e2', '#fde8ee', '#f9cdd8'], edge: '#eaa7ba', center: '#f6d55e', centerDeep: '#e0b43c' },
  natsu: { petals: ['#fde58a', '#fdeca6', '#fbdc74'], edge: '#e0b43c', center: '#c99a62', centerDeep: '#9b6a42' },
  aki: { petals: ['#f9c6d3', '#fde3ea', '#f5b8cd'], edge: '#e9a1b8', center: C.icho, centerDeep: C.ichoDeep },
  fuyu: { petals: ['#ffffff', '#fdf1f4', '#fbe6ec'], edge: '#e7b3c2', center: '#f6d55e', centerDeep: '#e0b43c' },
};
const flower = () => FLOWERS[look.season] || FLOWERS.aki;

// 花びらを抜く順。決めた花びら（decided）を最後に残す。rand(k) は 0〜k-1 の整数を返す
export function pluckOrder(n, decided, rand = (k) => Math.floor(Math.random() * k)) {
  const rest = [];
  for (let i = 0; i < n; i++) if (i !== decided) rest.push(i);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return rest; // 長さ n-1。抜いた後に残るのは decided だけ
}

// 1枚を抜く時間（ミリ秒）。k は何枚目か（0 から）、m は抜く枚数
export function pluckTime(k, m) {
  const p = m > 1 ? k / (m - 1) : 1;
  return 360 + 560 * Math.pow(p, 2);
}

export function createHana({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;
  let pawAt = null;

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const Rf = Math.min(W / 2 - 6, (H - 58) / 2);
    const fx = W / 2;
    const fy = Rf + 4 + Math.max(0, (H - 58 - (Rf * 2 + 8)) * 0.5); // 下の猫の場所を残して、花を縦の真ん中へ
    const r0 = Rf * 0.2; // 花の真ん中
    const step = 360 / n;
    const wMax = Math.min(2 * Rf * 0.86 * Math.sin(Math.PI / n) * 0.96, Rf * 0.62);
    const hb = Math.min(wMax * 0.2, r0 * Math.sin(Math.PI / n) * 0.95);
    const catAt = { x: W - 40, y: H - 38, s: 0.42 };
    const pawSize = Math.max(14, Math.min(22, Rf * 0.1));
    geo = { n, W, H, fx, fy, Rf, r0, step, wMax, catAt, pawSize };

    // 花びらの形（中心から真上へ向けた形）。先にコスモスの切れこみを3つ
    const tipY = -Rf;
    const petalD = `M${-hb},${-r0 + 2}`
      + ` C${-wMax * 0.32},${-r0 - (Rf - r0) * 0.25} ${-wMax * 0.56},${-Rf * 0.62} ${-wMax * 0.46},${tipY * 0.94}`
      + ` L${-wMax * 0.3},${tipY} L${-wMax * 0.17},${tipY * 0.955} L0,${tipY * 1.005} L${wMax * 0.17},${tipY * 0.955} L${wMax * 0.3},${tipY}`
      + ` L${wMax * 0.46},${tipY * 0.94}`
      + ` C${wMax * 0.56},${-Rf * 0.62} ${wMax * 0.32},${-r0 - (Rf - r0) * 0.25} ${hb},${-r0 + 2} Z`;
    // 文字の大きさ：花びらの中心の線の上に、中心から外へ向けて並べる
    const rIn = r0 + 10;
    const rOut = Rf * 0.9;
    const along = rOut - rIn;
    const phi = (Math.min(step, 180) * Math.PI) / 180;
    const sizes = choices.map((c) => {
      const len = Math.max(charCount(c), 1);
      const k = 0.78 * phi;
      const byWidth = (k * (rIn + rOut) / 2) / (1 + (k * len) / 2);
      return Math.max(12, Math.min(24, (along / len) * 0.96, wMax * 0.58, byWidth));
    });
    const rText = (rIn + rOut) / 2;
    geo.rText = rText;

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 茎と葉（コスモスの細い葉）
    s += `<path d="M${fx},${fy + r0} C${fx + 6},${fy + Rf * 0.7} ${fx - 10},${H - 40} ${fx - 4},${H + 4}" stroke="${C.oliveDeep}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${fx - 2},${H - 30} q-26,-10 -44,-34 M${fx - 20},${H - 42} q-6,-14 -2,-26 M${fx},${H - 18} q24,-6 40,-28 M${fx + 22},${H - 26} q8,-12 6,-24" stroke="${C.olive}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    // 花びら
    for (let i = 0; i < n; i++) {
      const a = i * step;
      const flip = a > 180;
      // 最後と最初が同じ色で隣り合わないように
      const FL = flower();
      const fill = i === n - 1 && n % FL.petals.length === 1 ? FL.petals[1] : FL.petals[i % FL.petals.length];
      s += `<g class="petal" data-i="${i}" transform="translate(${fx} ${fy}) rotate(${a.toFixed(2)})">`
        + `<path class="petal-bg" d="${petalD}" fill="${fill}" stroke="${FL.edge}" stroke-width="2" stroke-linejoin="round"/>`
        + `<path d="M0,${-r0 - 4} L0,${-Rf * 0.36}" stroke="${FL.edge}" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>`
        + `<text class="cell-label" x="0" y="${-rText}" font-size="${sizes[i].toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central" transform="rotate(${flip ? 90 : -90} 0 ${-rText})">${escapeXml(choices[i])}</text>`
        + `</g>`;
    }
    // 花の真ん中
    s += `<circle cx="${fx}" cy="${fy}" r="${r0}" fill="${flower().center}" stroke="${flower().centerDeep}" stroke-width="3"/>`;
    for (let k = 0; k < 14; k++) {
      const a = k * 2.4;
      const rr = r0 * 0.62 * Math.sqrt((k + 0.5) / 14);
      s += `<circle cx="${fx + Math.cos(a) * rr}" cy="${fy + Math.sin(a) * rr}" r="${Math.max(1.6, r0 * 0.07)}" fill="${C.kakiDeep}" opacity="0.75"/>`;
    }
    // 右下で見ている猫
    s += `<g transform="translate(${catAt.x} ${catAt.y}) scale(${catAt.s})"><g class="hana-cat">${catSitting(cat)}</g></g>`;
    // 猫の手
    s += `<g class="paw"><g class="paw-in">${catPaw(cat, pawSize)}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      petals: Array.from(svg.querySelectorAll('.petal')),
      paw: svg.querySelector('.paw'),
      catG: svg.querySelector('.hana-cat'),
      front: svg.querySelector('.hana-cat').parentNode,
    };
    pawAt = rest();
    placePaw(pawAt.x, pawAt.y, 1);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = Math.min(...sizes).toFixed(1);
  }

  function rest() {
    return { x: geo.catAt.x - 34, y: geo.catAt.y - 4 };
  }

  function placePaw(x, y, scale) {
    refs.paw.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`);
  }

  // i 番目の花びらの、手でつまむ所（花びらの先の近く）
  function tipOf(i, r = 0.8) {
    const a = ((i * geo.step) * Math.PI) / 180;
    return { x: geo.fx + Math.sin(a) * geo.Rf * r, y: geo.fy - Math.cos(a) * geo.Rf * r };
  }

  function setMood(mood) {
    refs.catG.innerHTML = catSitting(cat, { mood });
  }

  async function moveTo(p, dur, lift = 18) {
    const from = { ...pawAt };
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      placePaw(from.x + (p.x - from.x) * e, from.y + (p.y - from.y) * e - Math.sin(Math.PI * t) * lift, 1);
    });
    pawAt = { ...p };
  }

  // 抜いた花びらが、くるくる回りながら下へ落ちる（待たずに次へ進む）
  function fall(i) {
    const g = refs.petals[i];
    const a = i * geo.step;
    const { fx, fy, Rf, H } = geo;
    const rc = Rf * 0.6;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const spin = (200 + Math.random() * 260) * dir;
    const tip = tipOf(i, 0.6);
    const pull = { x: Math.sin((a * Math.PI) / 180) * 14, y: -Math.cos((a * Math.PI) / 180) * 14 };
    const drop = H + 60 - tip.y;
    const drift = (Math.random() * 2 - 1) * 50;
    g.classList.add('is-gone');
    g.parentNode.insertBefore(g, refs.front); // 落ちる花びらは、花の真ん中より手前に出す
    return frames(1100, (t) => {
      const p = Math.min(1, t / 0.18);
      const f = t < 0.18 ? 0 : (t - 0.18) / 0.82;
      const dx = pull.x * ease.outCubic(p) + drift * Math.sin(f * Math.PI * 1.2);
      const dy = pull.y * ease.outCubic(p) + drop * f * f;
      g.setAttribute('transform', `translate(${(fx + dx).toFixed(2)} ${(fy + dy).toFixed(2)}) rotate(${a.toFixed(2)}) translate(0 ${-rc}) rotate(${(spin * f).toFixed(1)}) translate(0 ${rc})`);
      g.setAttribute('opacity', (1 - Math.max(0, f - 0.55) / 0.45).toFixed(3));
    }).then(() => { g.setAttribute('visibility', 'hidden'); });
  }

  async function pluck(i, dur, k) {
    const p = tipOf(i);
    await moveTo(p, dur * 0.55);
    // つまむ
    await frames(dur * 0.14, (t) => placePaw(p.x, p.y, 1 - 0.12 * Math.sin(Math.PI * t)));
    audio.pluck(k);
    fall(i);
    await wait(dur * 0.1);
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「うらなう」を おしてね');
    play.textContent = 'うらなう';
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
    const order = pluckOrder(n, decided);
    const m = order.length;
    showHint(result, 'どれが のこるかな…');
    // のこり2枚になる前までは、順に抜く
    for (let k = 0; k < m - 1; k++) {
      await pluck(order[k], pluckTime(k, m), k);
    }
    // のこり2枚：2枚の間で まよってから、結果でない方を抜く
    const last = order[m - 1];
    const pair = Math.random() < 0.5 ? [last, decided] : [decided, last];
    showHint(result, 'のこるのは…？');
    for (let h = 0; h < 3; h++) {
      const p = tipOf(pair[h % 2], 0.74);
      await moveTo(p, 520, 10);
      audio.hover(h);
      await frames(380, (t) => placePaw(p.x, p.y + Math.sin(t * Math.PI * 2) * 2.5, 1));
    }
    await pluck(last, 900, m - 1);
    await wait(380);
    // さいごの1枚
    const landed = refs.petals.findIndex((g) => !g.classList.contains('is-gone'));
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    const g = refs.petals[landed];
    g.querySelector('.petal-bg').setAttribute('stroke', C.momiji);
    g.querySelector('.petal-bg').setAttribute('stroke-width', '4');
    g.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
    const r = rest();
    moveTo(r, 520);
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    setMood('happy');
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'のこったよ', choices[landed]);
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
