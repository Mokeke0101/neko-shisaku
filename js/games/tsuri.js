// ねこの つりぼり（決め方：釣る。見せ方の部品：横から見た池の、深さごとの札〈タナ〉と さかな）。
// 池を横から見て、深さ（タナ）ごとに選択肢の札を立てる。どの深さにも さかなが1ぴき およいでいる。
// 猫が つりばりを しずめ、さかなが食いついた深さの札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が つりざおを ふって、はりを池に入れる。
// 2. はりが深さを変えるたびに、その深さの さかなが よってきて つつく。うきが ぴくっと動くが、さかなは はなれていく（1〜2回）。
// 3. さいごの深さで、さかなが つついて、つついて、ぐいっと食いつく。うきが しずみ、猫が つりあげる。
// 結果は先に乱数で決め（RS01-S14）、はりを止める深さの並びを、決めた深さで終わるように組む。
// はなれていく さかなは およぎ去るだけで、札は そのまま読める（どの選択肢も残念がらせない：RS01-S15）。
// 札はどれも同じ大きさで、同じ間かく（出やすさは表れない：RS01-S21）。
import { C } from '../art.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

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

const FISH = [['#f7b5a6', '#e08d7c'], ['#a9cbe8', '#7aa7cf'], ['#f6d58a', '#d9b04d'], ['#c6dfae', '#97b878']];

// さかな（中心 0,0、左を向く。長さは約 2.4s）
function fishSVG(s, k) {
  const [body, deep] = FISH[k % FISH.length];
  const r = (v) => (v * s).toFixed(2);
  return `<path d="M${r(0.9)},0 L${r(1.4)},${r(-0.45)} L${r(1.4)},${r(0.45)} Z" fill="${deep}"/>`
    + `<ellipse cx="0" cy="0" rx="${r(1)}" ry="${r(0.55)}" fill="${body}" stroke="${deep}" stroke-width="${r(0.08)}"/>`
    + `<circle cx="${r(-0.55)}" cy="${r(-0.1)}" r="${r(0.11)}" fill="#4a3a33"/>`
    + `<path d="M${r(-0.1)},${r(-0.35)} q${r(0.15)},${r(0.35)} 0,${r(0.7)}" stroke="${deep}" stroke-width="${r(0.07)}" fill="none" opacity="0.7"/>`;
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
    const topRoom = Math.max(78, Math.min(110, H * 0.19)); // さんばしと猫
    const waterTop = topRoom;
    const bandH = Math.min(56, (H - 8 - waterTop - 14) / n);
    const bandsTop = waterTop + 14 + Math.max(0, (H - 8 - waterTop - 14 - bandH * n) / 2);
    const tagW = Math.max(118, Math.min(150, W * 0.38));
    const tagH = Math.max(22, Math.min(36, bandH - 6));
    const x0 = 8 + tagW + 10; // さかなが およぐ はんいの左
    const x1 = W - 12;
    const lineX = x0 + (x1 - x0) * 0.45;
    const fishS = Math.max(7, Math.min(18, bandH * 0.32));
    const catS = Math.max(0.3, Math.min(0.46, (topRoom - 10) / 160));
    const catAt = { x: W - 14 - 80 * catS, y: waterTop - 6 - 78 * catS };
    const rodTip = { x: lineX, y: Math.max(8, waterTop - topRoom * 0.75) };
    const bandY = (i) => bandsTop + bandH * (i + 0.5);
    geo = { n, W, H, waterTop, bandH, bandY, tagW, tagH, x0, x1, lineX, fishS, catS, catAt, rodTip };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 池（上ほど明るい水）
    s += `<defs><linearGradient id="tsW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8eef0"/><stop offset="1" stop-color="#bcdde3"/></linearGradient></defs>`;
    s += `<rect x="4" y="${waterTop}" width="${W - 8}" height="${(H - 4 - waterTop).toFixed(1)}" rx="18" fill="url(#tsW)" stroke="#9fc8cf" stroke-width="3"/>`;
    s += `<path d="M10,${waterTop + 6} q12,-6 24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7"/>`;
    // さんばし
    s += `<rect x="${(lineX - 20).toFixed(1)}" y="${(waterTop - 10).toFixed(1)}" width="${(W - lineX + 16).toFixed(1)}" height="10" rx="3" fill="#e3bb84" stroke="#b98a52" stroke-width="2"/>`;
    s += `<rect x="${(W - 30).toFixed(1)}" y="${(waterTop - 4).toFixed(1)}" width="8" height="24" fill="#c99a62"/>`;
    // さんばしの バケツと、池の 水草（v12）
    const bk = Math.max(12, Math.min(20, topRoom * 0.2));
    s += `<g transform="translate(${(lineX + 8 + bk).toFixed(1)} ${(waterTop - 10).toFixed(1)})"><path d="M${-bk},${-bk * 1.3} h${bk * 2} l${-bk * 0.2},${bk * 1.3} h${-bk * 1.6} Z" fill="#cfe0ea" stroke="#7aa7c4" stroke-width="2"/><path d="M${-bk},${-bk * 1.3} q${bk},${-bk * 1.1} ${bk * 2},0" stroke="#7aa7c4" stroke-width="1.6" fill="none"/><ellipse cy="${-bk * 1.3}" rx="${bk}" ry="${bk * 0.25}" fill="#a9cfd5"/></g>`;
    [[14, H - 6, 1], [W - 18, H - 6, 0.8]].forEach(([x, y, k]) => {
      s += `<path d="M${x},${y} q-4,-22 2,-40 M${x + 6},${y} q4,-18 -2,-32 M${x - 6},${y} q-6,-14 0,-26" stroke="#86a256" stroke-width="${(3 * k).toFixed(1)}" fill="none" stroke-linecap="round" opacity="0.7"/>`;
    });
    // 深さの線と札、さかな
    let minLabel = Infinity;
    choices.forEach((label, i) => {
      const y = bandY(i);
      const size = Math.max(12, Math.min(22, tagH * 0.62, (tagW - 16) / Math.max(charCount(label), 1)));
      minLabel = Math.min(minLabel, size);
      s += `<path d="M${x0 - 6},${y.toFixed(1)} H${x1}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 7" opacity="0.6"/>`;
      s += `<g class="tag" data-i="${i}">`
        + `<rect class="tag-bg" x="8" y="${(y - tagH / 2).toFixed(1)}" width="${tagW.toFixed(1)}" height="${tagH.toFixed(1)}" rx="${Math.min(10, tagH / 2).toFixed(1)}" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="2"/>`
        + `<text class="cell-label" x="${(8 + tagW / 2).toFixed(1)}" y="${y.toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g>`;
      s += `<g class="fish" data-i="${i}">${fishSVG(fishS, i)}</g>`;
    });
    // 糸・うき・はり
    s += `<path class="ts-line" d="" stroke="#6b5a4e" stroke-width="1.4" fill="none"/>`;
    s += `<g class="ts-hook"><path d="M0,-6 V3 q0,5 -5,5 q-4,0 -4,-4" stroke="#8a7a70" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="0" cy="-6" r="2.4" fill="${C.momiji}"/></g>`;
    s += `<g class="ts-bob"><ellipse cx="0" cy="0" rx="6" ry="8" fill="#ffffff" stroke="${C.ink}" stroke-width="1.6"/><path d="M-6,-1 H6 A6,8 0 0 0 -6,-1 Z" fill="${C.momiji}"/></g>`;
    s += `<g class="ts-catch" visibility="hidden"></g>`;
    // 猫と つりざお
    s += `<path class="ts-rod" d="" stroke="#9b5f3a" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
    s += `<g transform="translate(${catAt.x.toFixed(1)} ${catAt.y.toFixed(1)}) scale(${catS.toFixed(3)})"><g class="ts-cat">${catSitting(cat, { look: { x: -1, y: 0.6 } })}</g></g>`;
    svg.innerHTML = s;
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
    };
    fish = choices.map((_, i) => ({ x: x0 + 20 + ((i * 0.37) % 1) * (x1 - x0 - 40), dir: i % 2 ? 1 : -1, speed: 0.025 + (i % 3) * 0.008 }));
    fish.forEach((f, i) => placeFish(i, f.x, 0));
    setTackle(geo.waterTop - 2, 0);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  // さかな i を x に置く（dir で向き。-1 は左向き）。wiggle は尾びれの ゆれ
  function placeFish(i, x, wiggle) {
    const f = fish[i];
    const y = geo.bandY(i) + Math.sin(wiggle) * 1.5;
    refs.fish[i].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${f.dir < 0 ? 1 : -1} 1)`);
  }

  // さかなを ゆっくり およがせる（dt ミリ秒ぶん）。skip の さかなは動かさない
  function swim(dt, skip = -1) {
    const { x0, x1 } = geo;
    fish.forEach((f, i) => {
      if (i === skip) return;
      f.x += f.dir * f.speed * dt;
      if (f.x < x0 + 16) { f.x = x0 + 16; f.dir = 1; }
      if (f.x > x1 - 16) { f.x = x1 - 16; f.dir = -1; }
      placeFish(i, f.x, performance.now() / 120 + i);
    });
  }

  // うき（水面）と、はり（hookY）と、糸。twitch は うきの しずみ（0〜1）
  function setTackle(hookY, twitch) {
    const { lineX, waterTop, rodTip } = geo;
    const bobY = waterTop + twitch * 10;
    refs.bob.setAttribute('transform', `translate(${lineX.toFixed(1)} ${bobY.toFixed(1)})`);
    refs.hook.setAttribute('transform', `translate(${lineX.toFixed(1)} ${hookY.toFixed(1)})`);
    refs.line.setAttribute('d', `M${rodTip.x.toFixed(1)},${rodTip.y.toFixed(1)} Q${(rodTip.x + 4).toFixed(1)},${((rodTip.y + bobY) / 2).toFixed(1)} ${lineX.toFixed(1)},${(bobY - 6).toFixed(1)} M${lineX.toFixed(1)},${(bobY + 6).toFixed(1)} L${lineX.toFixed(1)},${(hookY - 6).toFixed(1)}`);
    const { catAt, catS } = geo;
    const hand = { x: catAt.x - 38 * catS, y: catAt.y + 20 * catS };
    refs.rod.setAttribute('d', `M${hand.x.toFixed(1)},${hand.y.toFixed(1)} Q${((hand.x + rodTip.x) / 2).toFixed(1)},${(Math.min(hand.y, rodTip.y) - 14 + twitch * 12).toFixed(1)} ${rodTip.x.toFixed(1)},${(rodTip.y + twitch * 10).toFixed(1)}`);
  }

  // はりの いまの深さ（いちばん近い深さの札）
  const depthAt = (y) => Math.max(0, Math.min(geo.n - 1, Math.round((y - geo.bandY(0)) / geo.bandH)));

  function lightTag(i, strong) {
    refs.tags.forEach((g, k) => {
      const bg = g.querySelector('.tag-bg');
      const on = k === i;
      bg.setAttribute('fill', on ? (strong ? '#fff1c4' : '#fff8e4') : C.paper);
      bg.setAttribute('stroke', on && strong ? C.momiji : C.woodDeep);
      bg.setAttribute('stroke-width', on && strong ? '4' : on ? '3' : '2');
    });
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
    const { n, lineX, bandY, waterTop, fishS } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const plan = depthPlan(n, decided);
    let last = performance.now();
    const tick = (skip = -1) => { const now = performance.now(); swim(now - last, skip); last = now; };
    // 1. つりざおを ふって、はりを池に入れる
    showHint(result, 'えいっ…');
    setCat('normal', { x: -1, y: 0.4 });
    audio.toss();
    await frames(T.cast, (t) => { setTackle(waterTop - 2 + (bandY(0) - 30 - waterTop) * ease.outCubic(t) * Math.min(1, t * 1.5), Math.sin(t * Math.PI) * 0.3); tick(); });
    let hookY = bandY(0) - 30;
    // 2. 深さを変えて、さかなが つつく
    for (let k = 0; k < plan.length; k++) {
      const d = plan[k];
      const final = k === plan.length - 1;
      const y = bandY(d);
      showHint(result, final && plan.length > 1 ? 'こんどは…？' : 'じっと まつ…');
      const fromY = hookY;
      await frames(T.move, (t) => { setTackle(fromY + (y - fromY) * ease.inOutSine(t), 0); tick(); });
      hookY = y;
      lightTag(d, false);
      // その深さの さかなが よってくる
      const f = fish[d];
      const side = f.x < lineX ? -1 : 1;
      const near = lineX + side * (fishS * 1.4 + 4);
      f.dir = side < 0 ? 1 : -1; // はりのほうを向く
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
        f.dir = -f.dir;
        const away = f.x - side * 60;
        const ax = f.x;
        await frames(T.leave, (t) => { f.x = ax + (away - ax) * t; placeFish(d, f.x, t * 20); tick(d); });
        continue;
      }
      // 3. ぐいっと食いつく
      showHint(result, 'きた…！');
      audio.heart();
      await frames(T.bite, (t) => { setTackle(hookY, 0.5 + 0.5 * Math.min(1, t * 2)); tick(d); });
      // ときどき出る別の動き（v12）：おおもの！ ひっぱりあいが 長くなる
      delete stage.dataset.variant;
      if (Math.random() < 0.3) {
        stage.dataset.variant = 'big';
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
    const upY = waterTop - 30;
    await frames(T.reel, (t) => {
      const y = hookY + (upY - hookY) * ease.inOutSine(t);
      setTackle(Math.min(y, hookY), t < 0.2 ? 1 : 0);
      refs.catch.setAttribute('transform', `translate(${(lineX + Math.sin(t * Math.PI * 6) * 4).toFixed(1)} ${(y + 8).toFixed(1)}) rotate(${(70 + Math.sin(t * Math.PI * 8) * 20).toFixed(1)})`);
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
