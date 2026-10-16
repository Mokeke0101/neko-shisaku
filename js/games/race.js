// けいとだま レース（決め方：競争する。見せ方の部品：横に並ぶ走路と、左はしの札）。
// 選択肢ごとに1つずつ毛糸玉を置き、右の猫のところ（ゴール）へ転がす。いちばん先に着いた毛糸玉の札が結果になる。
// 縦の画面に12本の走路を並べるため、走路は横向きにした（上から下へ選択肢を並べる）。
// 毛糸玉は、転がった後に糸を残す（どこまで進んだかが、カメラ越しにも分かる）。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 「よーい」で毛糸玉がそわそわし、猫の旗の合図で走りだす。
// 2. 毛糸玉の速さは、それぞれ波のように変わる。途中で前に出た玉が、そのまま勝つとは限らない（抜きつ抜かれつ）。
// 3. ゴールが近づくと、ゆっくりになる。2番目の玉も、すぐ後ろに来る。
// 結果は先に乱数で決め（RS01-S14）、決めた玉がちょうどゴールに着いた時に、ほかの玉がまだ着いていないように速さを組む。
// 走路はどれも同じ大きさ（出やすさは走路の大きさに表れない：RS01-S21）。
import { C } from '../art.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

// 毛糸玉の色（12本の走路で同じ色が並ばない）
const YARN = [
  ['#f4a7a3', '#d97f7a'], ['#f6c27a', '#d9a04f'], ['#a9d08e', '#7fae63'], ['#9fc5e8', '#6f9fcb'],
  ['#cfb0e6', '#a985c9'], ['#f3d36b', '#d4b043'], ['#f2b8cf', '#d48fae'], ['#86cdbd', '#58a998'],
  ['#e8a982', '#c7825b'], ['#b9c3f0', '#8a96d1'], ['#d8c08d', '#b39b64'], ['#9fd6e8', '#6fb2c8'],
];

// 毛糸玉の進み方を組む。進み方は、時刻 s（0〜）で、どこまで進んだか（0〜1。1 でゴール）を返す。
// 決めた玉 winner は s = 1 でちょうどゴールに着き、ほかの玉は s = 1 の時にまだ着いていない。
// 速さは「1 + 波（2つの正弦波）+ 後半の伸び」で、いつも正（後ろへは戻らない）。
// 途中（s = 0.55）で決めた玉が先頭にいない組み方を、なるべく選ぶ（抜きつ抜かれつ）。rand() は 0 以上 1 未満
export function raceProfiles(n, winner, rand = Math.random) {
  const make = () => {
    const finish = [];
    const close = n > 1 ? (winner + 1 + Math.floor(rand() * (n - 1))) % n : -1; // すぐ後ろに来る玉
    const lanes = [];
    for (let i = 0; i < n; i++) {
      const T = i === winner ? 1 : 1 + (i === close ? 0.035 + rand() * 0.05 : 0.12 + rand() * 0.5);
      finish.push(T);
      const waves = [0, 1].map((k) => ({ a: 0.16 + rand() * 0.18, w: (2 + k * 2.5 + rand() * 2) * Math.PI, ph: rand() * Math.PI * 2 }));
      const surge = i === winner ? 0.5 + rand() * 0.35 : rand() * 0.35; // 後半の伸び（速さに 3 surge s² を足す）
      const raw = (s) => s + waves.reduce((sum, v) => sum + (v.a / v.w) * (Math.cos(v.ph) - Math.cos(v.w * s + v.ph)), 0) + surge * s * s * s;
      const norm = raw(T);
      lanes.push((s) => Math.max(0, raw(Math.max(0, s)) / norm));
    }
    return { finish, close, at: (i, s) => lanes[i](s) };
  };
  let best = null;
  for (let k = 0; k < 24; k++) {
    const p = make();
    const mid = Array.from({ length: n }, (_, i) => p.at(i, 0.55));
    const leader = mid.indexOf(Math.max(...mid));
    if (!best) best = p;
    if (n === 1 || leader !== winner) { best = p; break; }
  }
  return best;
}

// 遊ぶ時刻 s の進み方（ゴールが近づくと、ゆっくりにする）。dt は前の絵からのミリ秒、D は s = 1 までのミリ秒
export function simStep(s, dt, D) {
  const speed = s < 0.68 ? 1 : Math.max(0.4, 1 - ((s - 0.68) / 0.32) * 0.6);
  return s + (dt / D) * speed;
}

export function createRace({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
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
    const cardX = 4;
    const cardW = W - 8;
    const spacing = Math.min(58, (H - 30) / n);
    const top = (H - spacing * n) / 2 + spacing / 2;
    const ys = choices.map((_, i) => top + i * spacing);
    const cardY = ys[0] - spacing / 2 - 8;
    const cardH = spacing * n + 16;
    const tagW = Math.max(112, Math.min(134, W * 0.33));
    const tagX = cardX + 8;
    const th = Math.max(22, Math.min(40, spacing - 5));
    const catZone = Math.max(70, Math.min(92, W * 0.22));
    const xGoal = cardX + cardW - catZone;
    const r = Math.max(8, Math.min(15, spacing * 0.36));
    const xStart = tagX + tagW + 8 + r;
    const catS = Math.min(catZone / 175, (cardH * 0.42) / 160);
    const catAt = { x: xGoal + catZone / 2 - 2, y: H / 2 + 6 };
    geo = { n, W, H, ys, spacing, tagX, tagW, th, xGoal, xStart, r, catAt, catS };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 板の間（明るい木の床）
    s += `<rect x="${cardX + 3}" y="${cardY + 6}" width="${cardW}" height="${cardH}" rx="22" fill="#d9b07a" opacity="0.35"/>`;
    s += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="22" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="3"/>`;
    // 走路（1本おきに うすい色）
    let minLabel = Infinity;
    ys.forEach((y, i) => {
      if (i % 2 === 0) s += `<rect x="${tagX + tagW + 4}" y="${y - spacing / 2}" width="${xGoal - tagX - tagW - 4}" height="${spacing}" fill="${C.cream}" opacity="0.9"/>`;
      const len = Math.max(charCount(choices[i]), 1);
      const size = Math.max(12, Math.min(22, th * 0.62, ((tagW - 16) / len) * 0.98));
      minLabel = Math.min(minLabel, size);
      s += `<g class="tag" data-i="${i}">`
        + `<rect class="tag-bg" x="${tagX}" y="${y - th / 2}" width="${tagW}" height="${th}" rx="${Math.min(12, th / 2)}" fill="#ffffff" stroke="${C.woodDeep}" stroke-width="2"/>`
        + `<text class="cell-label" x="${tagX + tagW / 2}" y="${y}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(choices[i])}</text>`
        + `</g>`;
    });
    // スタートの線と、ゴールの線（小さな三角の旗を並べる）
    s += `<path d="M${xStart - r - 3},${cardY + 8} V${cardY + cardH - 8}" stroke="${C.woodDeep}" stroke-width="2" stroke-dasharray="4 5"/>`;
    s += `<path d="M${xGoal},${cardY + 6} V${cardY + cardH - 6}" stroke="${C.momiji}" stroke-width="3" stroke-linecap="round"/>`;
    const flags = Math.max(3, Math.floor(cardH / 26));
    for (let k = 0; k < flags; k++) {
      const fy = cardY + 12 + (k * (cardH - 24)) / (flags - 1);
      const col = [C.momiji, C.icho, C.olive][k % 3];
      s += `<path d="M${xGoal + 1.5},${fy - 5} l9,5 l-9,5 Z" fill="${col}"/>`;
    }
    // 糸（走った後に残る）と毛糸玉
    s += `<g class="threads">`;
    ys.forEach((y, i) => { s += `<path class="thread" data-i="${i}" d="M${xStart},${y + r * 0.55} L${xStart},${y + r * 0.55}" stroke="${YARN[i % 12][1]}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`; });
    s += `</g><g class="balls">`;
    ys.forEach((y, i) => {
      const [fill, deep] = YARN[i % 12];
      s += `<g class="ball" data-i="${i}" transform="translate(${xStart} ${y})">`
        + `<ellipse cx="1.5" cy="${r * 0.86}" rx="${r * 0.9}" ry="${r * 0.22}" fill="#a0703f" opacity="0.15"/>`
        + `<g class="ball-in"><circle r="${r}" fill="${fill}" stroke="${deep}" stroke-width="1.8"/>`
        + `<g class="yarn-lines"><path d="M${-r * 0.8},${-r * 0.35} Q0,${-r * 0.95} ${r * 0.8},${-r * 0.35} M${-r * 0.92},${r * 0.12} Q0,${-r * 0.5} ${r * 0.92},${r * 0.12} M${-r * 0.7},${r * 0.6} Q0,${-r * 0.02} ${r * 0.7},${r * 0.6} M${-r * 0.2},${-r * 0.96} Q${-r * 0.75},0 ${-r * 0.2},${r * 0.96}" stroke="${deep}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.8"/></g>`
        + `</g><circle cx="${-r * 0.35}" cy="${-r * 0.4}" r="${r * 0.22}" fill="#ffffff" opacity="0.35"/>`
        + `</g>`;
    });
    s += `</g>`;
    // いちばんの印（着いた玉の走路の、ゴールの線の右に出す）
    const rr = Math.max(9, Math.min(15, spacing * 0.38));
    s += `<g class="medal" visibility="hidden"><g class="medal-in">`
      + `<path d="M${-rr * 0.5},${rr * 0.4} l${-rr * 0.35},${rr * 1.1} l${rr * 0.42},${-rr * 0.25} l${rr * 0.2},${rr * 0.42} l${rr * 0.25},${-rr * 1.1} Z M${rr * 0.5},${rr * 0.4} l${rr * 0.35},${rr * 1.1} l${-rr * 0.42},${-rr * 0.25} l${-rr * 0.2},${rr * 0.42} l${-rr * 0.25},${-rr * 1.1} Z" fill="${C.momiji}"/>`
      + Array.from({ length: 10 }, (_, k) => `<circle cx="${(Math.cos((k / 10) * Math.PI * 2) * rr * 0.78).toFixed(2)}" cy="${(Math.sin((k / 10) * Math.PI * 2) * rr * 0.78).toFixed(2)}" r="${(rr * 0.36).toFixed(2)}" fill="${C.icho}" stroke="${C.ichoDeep}" stroke-width="1.2"/>`).join('')
      + `<circle r="${(rr * 0.72).toFixed(2)}" fill="#fff6d8" stroke="${C.ichoDeep}" stroke-width="1.6"/>`
      + `<text x="0" y="0.5" font-size="${(rr * 0.95).toFixed(1)}" font-weight="700" fill="${C.momijiDeep}" text-anchor="middle" dominant-baseline="central">1</text>`
      + `</g></g>`;
    // ゴールで待つ猫と、旗
    s += `<g transform="translate(${catAt.x} ${catAt.y}) scale(${catS.toFixed(3)})"><g class="race-cat">${catSitting(cat, { look: { x: -1, y: 0 } })}</g>`
      + `<g class="flag" transform="translate(-50 10)"><path d="M0,0 V-70" stroke="${C.chestnutDeep}" stroke-width="5" stroke-linecap="round"/>`
      + `<path class="flag-cloth" d="M0,-70 q-22,6 -44,0 v26 q22,6 44,0 Z" fill="${C.momiji}" stroke="${C.momijiDeep}" stroke-width="3" stroke-linejoin="round"/>`
      + `<circle cx="0" cy="2" r="9" fill="${cat.paw}" stroke="${cat.line}" stroke-width="3"/></g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      balls: Array.from(svg.querySelectorAll('.ball')),
      ballIns: Array.from(svg.querySelectorAll('.ball-in')),
      threads: Array.from(svg.querySelectorAll('.thread')),
      tags: Array.from(svg.querySelectorAll('.tag')),
      catG: svg.querySelector('.race-cat'),
      flag: svg.querySelector('.flag'),
      medal: svg.querySelector('.medal'),
      medalIn: svg.querySelector('.medal-in'),
    };
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  // i 番目の毛糸玉を、進み方 p（0〜1）の所へ置く
  function placeBall(i, p, bob = 0) {
    const { xStart, xGoal, r, ys } = geo;
    const x = xStart + (xGoal - r - 2 - xStart) * Math.min(1, p);
    const roll = ((x - xStart) / r) * (180 / Math.PI);
    refs.balls[i].setAttribute('transform', `translate(${x.toFixed(2)} ${(ys[i] - bob).toFixed(2)})`);
    refs.ballIns[i].setAttribute('transform', `rotate(${roll.toFixed(1)})`);
    refs.threads[i].setAttribute('d', `M${xStart},${(ys[i] + r * 0.55).toFixed(2)} L${Math.max(xStart, x - r * 0.3).toFixed(2)},${(ys[i] + r * 0.55).toFixed(2)}`);
    return x;
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  function setFlag(angle) {
    refs.flag.setAttribute('transform', `translate(-50 10) rotate(${angle.toFixed(1)})`);
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「よーい どん」を おしてね');
    play.textContent = 'よーい どん';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, ys, catAt } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const prof = raceProfiles(n, decided);

    // 1. よーい（毛糸玉がそわそわ。猫が旗を上げる）
    showHint(result, 'よーい…');
    setCat('normal', { x: -1, y: 0 });
    audio.readyGo(0);
    await frames(1300, (t) => {
      for (let i = 0; i < n; i++) placeBall(i, 0, Math.abs(Math.sin(t * Math.PI * 6 + i * 0.9)) * 2.2);
      setFlag(-40 * ease.outCubic(Math.min(1, t * 1.6)));
    });
    audio.readyGo(1);
    // 2. どん（旗をふり下ろす）
    await frames(180, (t) => setFlag(-40 + 70 * t));
    showHint(result, 'どれが はやいかな…');
    const D = 3300; // s = 1（決めた玉がゴールに着く）までの、ゆっくりにしない時のミリ秒
    let s = 0;
    let last = performance.now();
    let lastTick = 0;
    let lastLook = 0;
    let hinted = false;
    await new Promise((resolve) => {
      const step = (now) => {
        const dt = Math.min(50, now - last);
        last = now;
        s = simStep(s, dt, D);
        const sNow = Math.min(s, 1);
        let lead = 0;
        let leadP = -1;
        for (let i = 0; i < n; i++) {
          const p = i === decided ? sNow : Math.min(prof.at(i, sNow), 0.995);
          placeBall(i, p);
          if (p > leadP) { leadP = p; lead = i; }
        }
        if (now - lastTick > 210) {
          lastTick = now;
          audio.roll(Math.floor(s * 10));
        }
        if (now - lastLook > 260) {
          lastLook = now;
          const dy = (ys[lead] - catAt.y) / Math.max(60, geo.H / 2);
          setCat('normal', { x: -1, y: Math.max(-1, Math.min(1, dy)) });
        }
        if (!hinted && leadP > 0.8) { hinted = true; showHint(result, 'もうすぐ ゴール…'); }
        if (s < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    // 3. 決めた玉がゴールに着いた。ほかの玉は、少し進んで止まる
    const landed = decided;
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    audio.pop();
    const from = Array.from({ length: n }, (_, i) => (i === landed ? 1 : Math.min(prof.at(i, 1), 0.995)));
    const to = Array.from({ length: n }, (_, i) => (i === landed ? 1 : Math.max(from[i], Math.min(prof.at(i, 1.03), 0.985))));
    frames(420, (t) => {
      const e = ease.outCubic(t);
      for (let i = 0; i < n; i++) if (i !== landed) placeBall(i, from[i] + (to[i] - from[i]) * e);
    });
    // いちばんの印を出す
    const mx = geo.xGoal + Math.max(9, Math.min(15, geo.spacing * 0.38)) + 6;
    refs.medal.setAttribute('transform', `translate(${mx.toFixed(2)} ${ys[landed].toFixed(2)})`);
    refs.medal.setAttribute('visibility', 'visible');
    frames(380, (t) => refs.medalIn.setAttribute('transform', `scale(${ease.outBack(t).toFixed(3)}) rotate(${(-30 * (1 - t)).toFixed(1)})`));
    // 着いた玉は、ゴールで ぽんと はねる
    frames(420, (t) => placeBall(landed, 1, Math.sin(Math.PI * t) * 10));
    const tag = refs.tags[landed];
    tag.querySelector('.tag-bg').setAttribute('fill', '#fff1c4');
    tag.querySelector('.tag-bg').setAttribute('stroke', C.momiji);
    tag.querySelector('.tag-bg').setAttribute('stroke-width', '4');
    tag.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 240, easing: 'ease-out' });
    refs.threads[landed].setAttribute('stroke-width', '4');
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    setCat('happy');
    frames(900, (t) => setFlag(30 * Math.sin(t * Math.PI * 4) * (1 - t * 0.4)));
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'いちばん', choices[landed]);
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
