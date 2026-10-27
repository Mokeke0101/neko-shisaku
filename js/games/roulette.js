// にくきゅうルーレット（見せ方の部品：回る円盤）。
// 盤は動かさず、猫の手の針だけが回る。文字が回らないので、カメラ越しでも選択肢が読みやすい。
// 選択肢ごとの場所（扇）の大きさは、出やすさに合わせる（RS01-S21）。おやつ決め用は、どれも同じ大きさ。
// v17 の後（テーマパーク）：ゲームセンターの ピンクの ルーレット盤（ふちの 横の面・電球・つや・ピンクの 台）。選択肢は 盤に じかに書く。
// 動きの ちがい（3B：4つ）：ふつう・あれ？（1つ手前で止まって もうひとつ）・いきすぎ（となりまで行って もどる）・
// ちょん（とちゅうで 止まりかけ、真ん中の猫が 手で ちょんと おして もうひとまわり）。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { pickIndex, jitter } from '../random.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

const f = (n) => (Math.round(n * 10) / 10).toFixed(1);
const FILLS = ['#fbd6a2', '#fde8b2', '#f8cbbb', '#e2ecc0', '#fbe0c6', '#f5d09a'];

// 選択肢の文字の大きさと置き場（RS01-S01・S21）。
// 文字は、扇の真ん中の線の上に、中心から外へ向けて並べる。文字の太さ（文字の大きさ）に使える角度は、
// 扇の大きさそのものではなく、隣どうしの扇の真ん中の線の中間で区切った角度にする。
// どの扇も同じ大きさなら、扇の大きさと同じ。小さい扇（比 6・3・1 で 12個のうち1つだけ出にくい時、約5度）は、
// 両どなりの大きい扇から角度を借りて、文字を読める大きさに保つ（扇の大きさ＝出やすさは変えない）。
// 角度が足りない文字は、外側（角度の幅が広い所）へ寄せて置く。
const LABEL_MAX = 26;
const LABEL_MIN = 12;
const LABEL_FILL = 0.8; // 区切った角度の幅のうち、文字の太さに使う割合（残りは隣の文字とのすき間）
export function labelLayout({ choices, spans, hub, rs, R }) {
  const n = spans.length;
  const rIn = hub + 12;
  const rOut = rs - Math.max(11, R * 0.075) * 2 - 6; // 肉球の下に文字が隠れないように
  const along = rOut - rIn;
  const rMid = (rIn + rOut) / 2;
  // 角度の幅 room（度）に収まる文字の大きさと、置く半径
  const fit = (room, len, byLen) => {
    const k = (LABEL_FILL * Math.min(room, 180) * Math.PI) / 180;
    // 文字の太さ s が、文字の内側の端の半径での角度の幅に収まる大きさ。真ん中に置く時と、外側の端に寄せる時
    // 真ん中に置く時は、前の版（v3）の決め方（真ん中の半径での弧の長さの 0.62 倍）も認める。どの扇も同じ大きさなら v3 と同じ大きさになる
    const centered = Math.max((k * rMid) / (1 + (k * len) / 2), (0.62 * Math.PI * rMid * Math.min(room, 180)) / 180);
    const outer = (k * rOut) / (1 + k * len);
    if (centered >= Math.min(byLen, outer)) return { raw: Math.min(byLen, centered), r: rMid };
    const raw = Math.min(byLen, outer);
    return { raw, r: rOut - (len * Math.max(LABEL_MIN, raw)) / 2 };
  };
  return spans.map((span, i) => {
    const len = Math.max(charCount(choices[i]), 1);
    const byLen = Math.min(LABEL_MAX, (along / len) * 0.96);
    // 文字の置き場の角度：前（反時計回り）の隣との中間から、次（時計回り）の隣との中間まで
    const before = n === 1 ? 180 : (span + spans[(i - 1 + n) % n]) / 4;
    const after = n === 1 ? 180 : (span + spans[(i + 1) % n]) / 4;
    // ふつうは扇の真ん中の線の上に置く（置き場は、狭い側の2倍）
    let L = fit(2 * Math.min(before, after), len, byLen);
    let shift = 0;
    // 小さい扇が続く時は、真ん中の線の上では狭すぎる。置き場の全体（大きい隣の側へ広い）の真ん中へ、文字をずらして置く
    if (L.raw < LABEL_MIN + 2) {
      const wide = fit(before + after, len, byLen);
      if (wide.raw > L.raw + 0.5) { L = wide; shift = (after - before) / 2; }
    }
    const size = Math.max(LABEL_MIN, L.raw);
    // 文字の内側の端で、文字の太さが自分の扇の幅を越えるか（越える時は白いふちを付ける）
    const inner = L.r - (len * size) / 2;
    const spill = shift !== 0 || size > inner * ((span * Math.PI) / 180) * 0.9;
    return { size, r: L.r, spill, shift };
  });
}

export function createRoulette({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let angle = 0; // 針の向き（度。0 が真上、時計回り）
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;

  function sectorFill(i, n) {
    let c = FILLS[i % FILLS.length];
    if (i === n - 1 && n % FILLS.length === 1) c = FILLS[2]; // 最後と最初が同じ色で隣り合わないように
    return c;
  }

  function render() {
    const choices = getChoices();
    const weights = getWeights();
    if (weights.length !== choices.length) throw new Error(`選択肢と重みの数が合わない: ${choices.length}・${weights.length}`);
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const R = Math.min(W, H) / 2 - 6;
    const cx = W / 2;
    const cy = H / 2;
    const rs = R - 15; // 扇の半径
    const hub = Math.max(30, R * 0.22);
    // 扇の始まりの角度（真上から時計回りの度）と、扇の大きさ（度）。大きさは重みに比べる
    const total = weights.reduce((a, w) => a + w, 0);
    const spans = weights.map((w) => (360 * w) / total);
    const starts = [];
    spans.reduce((a, sp, i) => { starts[i] = a; return a + sp; }, 0);
    geo = { n, spans, starts, cx, cy, R, rs, hub };
    let minLabel = Infinity;

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 木の台（盤の下に すきまが ある時）。盤の外まわりの 電球は、まわす間 おいかけっこで光る（v12）
    const room = H / 2 - R;
    const th = Math.max(5, R * 0.045); // 盤の あつみ
    s += `<defs><radialGradient id="rl-rim" cx="0.4" cy="0.35" r="0.75"><stop offset="0.8" stop-color="#f7b4a6"/><stop offset="1" stop-color="#e3918a"/></radialGradient>`
      + `<radialGradient id="rl-sheen" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.92" stop-color="#c97a6e" stop-opacity="0"/><stop offset="1" stop-color="#c97a6e" stop-opacity="0.16"/></radialGradient></defs>`;
    if (room > 16) {
      // 木の台：2本の足と、あつみの ある 台の板
      const foot = cy + R + Math.min(48, room - 4);
      const lw = Math.max(9, R * 0.07);
      for (const sg of [-1, 1]) {
        s += `<path d="M${f(cx + sg * R * 0.42)},${f(cy + R * 0.55)} L${f(cx + sg * R * 0.6)},${f(foot)}" stroke="#c97a6e" stroke-width="${f(lw + 3)}" stroke-linecap="round"/>`
          + `<path d="M${f(cx + sg * R * 0.42)},${f(cy + R * 0.55)} L${f(cx + sg * R * 0.6)},${f(foot)}" stroke="#f7b4a6" stroke-width="${f(lw)}" stroke-linecap="round"/>`
          + `<path d="M${f(cx + sg * R * 0.42 - 2)},${f(cy + R * 0.58)} L${f(cx + sg * R * 0.6 - 2)},${f(foot - 4)}" stroke="#f1c98f" stroke-width="2" stroke-linecap="round"/>`;
      }
      s += `<ellipse cx="${f(cx)}" cy="${f(foot + 9)}" rx="${f(R * 0.9)}" ry="6" fill="#a0703f" opacity="0.18"/>`
        + `<rect x="${f(cx - R * 0.82)}" y="${f(foot - 2)}" width="${f(R * 1.64)}" height="10" rx="5" fill="#e3918a"/>`
        + `<rect x="${f(cx - R * 0.82)}" y="${f(foot - 7)}" width="${f(R * 1.64)}" height="9" rx="5" fill="#f7b4a6" stroke="#c97a6e" stroke-width="2"/>`;
    } else {
      s += `<ellipse cx="${cx}" cy="${cy + R * 0.96}" rx="${R * 0.82}" ry="${R * 0.09}" fill="#d9b07a" opacity="0.35"/>`;
    }
    // 盤の 横の面（あつみ）→ ふち → つや
    s += `<circle cx="${cx}" cy="${f(cy + th)}" r="${R}" fill="#c97a6e"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#rl-rim)" stroke="#c97a6e" stroke-width="1.5"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R - 3}" fill="none" stroke="#ffd9d0" stroke-width="2"/>`;
    s += `<path d="M${f(cx - R * 0.86)},${f(cy - R * 0.32)} A${R - 6},${R - 6} 0 0 1 ${f(cx - R * 0.3)},${f(cy - R * 0.87)}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.45"/>`;
    for (let k = 0; k < 28; k++) {
      const a = ((k + 0.5) / 28) * Math.PI * 2;
      s += `<circle class="rl-bulb" cx="${f(cx + Math.cos(a) * (R - 8))}" cy="${f(cy + Math.sin(a) * (R - 8))}" r="2.6" fill="#fff1c4" stroke="#e3bb84" stroke-width="0.8"/>`;
    }
    // 扇
    for (let i = 0; i < n; i++) {
      const a0 = ((starts[i] - 90) * Math.PI) / 180;
      const a1 = ((starts[i] + spans[i] - 90) * Math.PI) / 180;
      const large = spans[i] > 180 ? 1 : 0;
      const d = `M${cx},${cy} L${cx + Math.cos(a0) * rs},${cy + Math.sin(a0) * rs} A${rs},${rs} 0 ${large} 1 ${cx + Math.cos(a1) * rs},${cy + Math.sin(a1) * rs} Z`;
      s += `<path class="sector" data-i="${i}" d="${d}" fill="${sectorFill(i, n)}" stroke="#fffaf0" stroke-width="3" stroke-linejoin="round"/>`;
    }
    // 扇の 内がわの くぼみ と つや（色を ぬった 木の板に見せる）
    s += `<circle cx="${cx}" cy="${cy}" r="${rs}" fill="url(#rl-sheen)" pointer-events="none"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${rs + 1.5}" fill="none" stroke="#7a4a2a" stroke-width="2" opacity="0.35"/>`;
    // 選ばれた扇を示す縁（最初は隠す）
    s += `<path class="pick-ring" d="" fill="#ffffff" fill-opacity="0.35" stroke="${C.momiji}" stroke-width="5" stroke-linejoin="round" opacity="0"/>`;
    // 文字
    const labels = labelLayout({ choices, spans, hub, rs, R });
    for (let i = 0; i < n; i++) {
      const L = labels[i];
      const mid = starts[i] + spans[i] / 2 + L.shift; // 真上から時計回り（小さい扇が続く時だけ、少しずらす）
      minLabel = Math.min(minLabel, L.size);
      // 文字は中心から外へ向けて並べ、左半分では上下が逆にならないよう向きを返す
      const flip = mid > 180;
      const rot = flip ? mid + 90 : mid - 90;
      const tx = cx + Math.cos(((mid - 90) * Math.PI) / 180) * L.r;
      const ty = cy + Math.sin(((mid - 90) * Math.PI) / 180) * L.r;
      // 小さい場所の文字は場所の幅からはみ出すので、白いふちを付けて、隣の場所の色の上でも読めるようにする
      const halo = L.spill ? ` stroke="#fffaf0" stroke-width="${(L.size * 0.32).toFixed(1)}" stroke-linejoin="round" paint-order="stroke"` : '';
      s += `<text class="cell-label${L.spill ? ' is-spill' : ''}" data-i="${i}" x="${tx}" y="${ty}" font-size="${L.size.toFixed(1)}" fill="${C.ink}"${halo} text-anchor="middle" dominant-baseline="central" transform="rotate(${rot.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)})">${escapeXml(choices[i])}</text>`;
    }
    // 縁の鋲
    for (let i = 0; i < n; i++) {
      const a = ((starts[i] - 90) * Math.PI) / 180;
      s += `<circle cx="${cx + Math.cos(a) * (R - 8)}" cy="${cy + Math.sin(a) * (R - 8)}" r="3.6" fill="#fff3df" stroke="#9b5f3a" stroke-width="1"/>`;
    }
    // 針（猫の手）：細い腕の先の肉球が、縁の近くを指す。文字の上は細い腕だけが通る
    const pawSize = Math.max(11, R * 0.075);
    const armLen = rs - pawSize * 0.9;
    s += `<g class="needle" transform="rotate(${angle} ${cx} ${cy})">`
      + `<path d="M${cx - 4},${cy + 4} L${cx - 1.2},${cy - armLen + 4} L${cx + 5.2},${cy - armLen + 4} L${cx + 8},${cy + 4} Z" fill="#7a4a2a" opacity="0.22"/>`
      + `<ellipse cx="${cx + 2}" cy="${f(cy - armLen + 4)}" rx="${f(pawSize)}" ry="${f(pawSize * 0.92)}" fill="#7a4a2a" opacity="0.22"/>`
      + `<path d="M${cx - 6},${cy} L${cx - 3.2},${cy - armLen} L${cx + 3.2},${cy - armLen} L${cx + 6},${cy} Z" fill="${cat.paw}" stroke="${cat.line}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<g transform="translate(${cx} ${cy - armLen})">${catPaw(cat, pawSize)}</g>`
      + `</g>`;
    // 真ん中の猫
    const k = hub / 50;
    s += `<circle cx="${cx}" cy="${f(cy + 4)}" r="${hub + 7}" fill="#c97a6e" opacity="0.5"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${hub + 7}" fill="#f7b4a6" stroke="#c97a6e" stroke-width="2.4"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${hub + 2}" fill="${C.paper}" stroke="#e3918a" stroke-width="1.6"/>`;
    s += `<g class="hub-cat" transform="translate(${cx} ${cy + hub * 0.08}) scale(${(k * 0.9).toFixed(3)})">${catFace(cat)}</g>`;
    // ちょん と おす 手（動きの ちがい）
    s += `<g class="rl-push" opacity="0">${catPaw(cat, pawSize * 1.05)}</g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      needle: svg.querySelector('.needle'),
      ring: svg.querySelector('.pick-ring'),
      hubCat: svg.querySelector('.hub-cat'),
      push: svg.querySelector('.rl-push'),
      bulbs: Array.from(svg.querySelectorAll('.rl-bulb')),
    };
    geo.armLen = armLen;
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.spans = spans.map((x) => x.toFixed(2)).join(',');
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  function setNeedle(a) {
    refs.needle.setAttribute('transform', `rotate(${a.toFixed(3)} ${geo.cx} ${geo.cy})`);
  }

  function setCat(mood, look = null) {
    refs.hubCat.innerHTML = catFace(cat, { mood, look });
  }

  // 真ん中の猫が、針の先を目で追う
  function lookAt(a) {
    const r = (a * Math.PI) / 180;
    setCat('normal', { x: Math.sin(r), y: -Math.cos(r) });
  }

  // 針の向き a（0〜360 度）が入っている扇の番号
  function sectorAt(a) {
    const { starts, spans, n } = geo;
    for (let i = n - 1; i >= 0; i--) if (a >= starts[i]) return i;
    return 0;
  }

  function showRing(i) {
    const { cx, cy, rs, starts, spans } = geo;
    const a0 = ((starts[i] - 90) * Math.PI) / 180;
    const a1 = ((starts[i] + spans[i] - 90) * Math.PI) / 180;
    const large = spans[i] > 180 ? 1 : 0;
    const r = rs - 2;
    refs.ring.setAttribute('d', `M${cx},${cy} L${cx + Math.cos(a0) * r},${cy + Math.sin(a0) * r} A${r},${r} 0 ${large} 1 ${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r} Z`);
    refs.ring.setAttribute('opacity', '1');
    refs.ring.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 900, easing: 'ease-out' });
  }

  // 回す前に針を置く向き。扇の境目のうち、両どなりの扇がなるべく大きい境目にする。
  // 小さい扇の文字の上に針の腕が重ならないようにするため（どの扇も同じ大きさなら、真上の境目）
  function restAngle() {
    if (!geo) return 0;
    const { starts, spans, n } = geo;
    let best = 0;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      const score = Math.min(spans[i], spans[(i - 1 + n) % n]);
      if (score > bestScore + 1e-9) { best = i; bestScore = score; }
    }
    return starts[best];
  }

  function reset() {
    clearCelebration();
    render();
    if (geo) { angle = restAngle(); setNeedle(angle); stage.dataset.rest = angle.toFixed(2); }
    showHint(result, '「まわす」を おしてね');
    play.textContent = 'まわす';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    showHint(result, 'くるくる…');
    const { starts, spans } = geo;
    const decided = pickWeighted(getWeights()); // 結果を先に決める（出やすさは扇の大きさに比べる）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const start = angle;
    const within = spans[decided] * (0.5 + jitter(-0.3, 0.3));
    const targetMod = starts[decided] + within;
    const turns = 4 + pickIndex(2);
    const delta = 360 * turns + ((targetMod - (start % 360) + 360) % 360);
    // ため（少し戻す）
    await frames(260, (t) => { angle = start - 10 * ease.inOutSine(t); setNeedle(angle); });
    const from = angle;
    const total = delta + 10;
    let lastSector = sectorAt(((from % 360) + 360) % 360);
    let lastTick = 0;
    let lastLook = 0;
    // 動きの ちがい（4つ）
    const vr = Math.random();
    const variant = geo.n < 2 ? 'plain' : vr < 0.25 ? 'creep' : vr < 0.5 ? 'over' : vr < 0.75 ? 'flick' : 'plain';
    stage.dataset.variant = variant;
    const prev = (decided - 1 + geo.n) % geo.n;
    const next = (decided + 1) % geo.n;
    // あれ？：1つ手前の場所で いったん止まり、もうひと目もり すすむ
    const back = variant === 'creep' ? within + Math.min(spans[prev] * 0.5, 30) : 0;
    // いきすぎ：となりの場所まで行ってから、ゆっくり もどる
    const over = variant === 'over' ? spans[decided] - within + Math.min(spans[next] * 0.5, 30) : 0;
    // ちょん：止まりかけた所から、真ん中の猫が おして もうひとまわり
    const push = variant === 'flick' ? 480 : 0; // ちがう場所で 止まりかけるように ひとまわり と 3分の1
    const dur = 4600 + turns * 260 - (push ? 1300 : 0);
    await frames(dur, (t) => {
      angle = from + (total - back + over - push) * ease.outQuart(t);
      setNeedle(angle);
      const ph = Math.floor(angle / 13);
      refs.bulbs.forEach((el, k) => el.setAttribute('fill', (k + ph) % 4 === 0 ? '#ffd36b' : '#f3dcc0'));
      const sec = sectorAt(((angle % 360) + 360) % 360);
      if (sec !== lastSector) {
        lastSector = sec;
        const now = performance.now();
        if (now - lastTick > 40) { audio.tick(); lastTick = now; }
      }
      const nowL = performance.now();
      if (nowL - lastLook > 90) { lookAt(angle); lastLook = nowL; }
    });
    if (over) {
      showHint(result, 'いきすぎ…？');
      audio.heart();
      await wait(380);
      const a0 = angle;
      await frames(720, (t) => { angle = a0 - over * ease.inOutSine(t); setNeedle(angle); lookAt(angle); });
      audio.tick();
    }
    if (push) {
      showHint(result, 'とまっちゃう…？');
      await wait(260);
      // 手が 針の先へ のびて ちょん
      const rad = ((angle - 90) * Math.PI) / 180;
      const tip = { x: geo.cx + Math.cos(rad) * geo.armLen * 0.55, y: geo.cy + Math.sin(rad) * geo.armLen * 0.55 };
      setCat('strain');
      await frames(260, (t) => {
        refs.push.setAttribute('opacity', f(t));
        refs.push.setAttribute('transform', `translate(${f(geo.cx + (tip.x - geo.cx) * t)} ${f(geo.cy + (tip.y - geo.cy) * t)})`);
      });
      showHint(result, 'ちょん！');
      audio.pop();
      const a0 = angle;
      let ls = sectorAt(((a0 % 360) + 360) % 360);
      await frames(1100, (t) => {
        angle = a0 + push * ease.outCubic(t);
        setNeedle(angle);
        refs.push.setAttribute('opacity', f(Math.max(0, 1 - t * 4)));
        const sec = sectorAt(((angle % 360) + 360) % 360);
        if (sec !== ls) { ls = sec; audio.tick(); }
        lookAt(angle);
      });
    }
    if (back) {
      showHint(result, 'ここ…？');
      audio.heart();
      await wait(420);
      showHint(result, 'あれ？ もうひとつ！');
      const a0 = angle;
      audio.tick();
      await frames(560, (t) => { angle = a0 + back * ease.inOutSine(t); setNeedle(angle); lookAt(angle); });
    }
    refs.bulbs.forEach((el, k) => el.setAttribute('fill', k % 2 ? '#ffd36b' : '#fff1c4'));
    angle = ((angle % 360) + 360) % 360;
    // ゆらり（扇の中に収まる小さな揺れ）
    // 小さな扇でも縁を越えないよう、揺れの幅を扇の大きさの 15% までにする
    const settle = angle;
    const wobble = Math.min(2.2, spans[decided] * 0.15);
    await frames(420, (t) => { setNeedle(settle + Math.sin(t * Math.PI * 3) * wobble * (1 - t)); });
    setNeedle(settle);
    const landed = sectorAt(settle);
    stage.dataset.landed = String(landed);
    showRing(landed);
    setCat('happy');
    // お祝いの大きさ：お楽しみ袋では段階の並びの位置で変える（RS01-S15）。おやつでは真ん中の大きさ
    const level = getPurpose() === 'coin' ? levelOf(landed, geo.n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'きまったよ', choices[landed]);
    const c = centerOf(result);
    celebrate(level, c.x, c.y - 30);
    await wait(500);
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}

