// にくきゅうルーレット（見せ方の部品：回る円盤）。
// 盤は動かさず、猫の手の針だけが回る。文字が回らないので、カメラ越しでも選択肢が読みやすい。
// 選択肢ごとの場所（扇）の大きさは、出やすさに合わせる（RS01-S21）。おやつ決め用は、どれも同じ大きさ。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { pickIndex, jitter } from '../random.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

const FILLS = ['#fbd6a2', '#fde8b2', '#f8cbbb', '#e2ecc0', '#fbe0c6', '#f5d09a'];

export function createRoulette({ view, stage, result, play, getChoices, getWeights, getCat }) {
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
    s += `<ellipse cx="${cx}" cy="${cy + R * 0.96}" rx="${R * 0.82}" ry="${R * 0.09}" fill="#d9b07a" opacity="0.35"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.chestnut}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R - 3}" fill="none" stroke="#cf9468" stroke-width="2"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R - 8}" fill="none" stroke="#f3dcc0" stroke-width="2" stroke-dasharray="5 6" opacity="0.8"/>`;
    // 扇
    for (let i = 0; i < n; i++) {
      const a0 = ((starts[i] - 90) * Math.PI) / 180;
      const a1 = ((starts[i] + spans[i] - 90) * Math.PI) / 180;
      const large = spans[i] > 180 ? 1 : 0;
      const d = `M${cx},${cy} L${cx + Math.cos(a0) * rs},${cy + Math.sin(a0) * rs} A${rs},${rs} 0 ${large} 1 ${cx + Math.cos(a1) * rs},${cy + Math.sin(a1) * rs} Z`;
      s += `<path class="sector" data-i="${i}" d="${d}" fill="${sectorFill(i, n)}" stroke="#fffaf0" stroke-width="3" stroke-linejoin="round"/>`;
    }
    // 選ばれた扇を示す縁（最初は隠す）
    s += `<path class="pick-ring" d="" fill="#ffffff" fill-opacity="0.35" stroke="${C.momiji}" stroke-width="5" stroke-linejoin="round" opacity="0"/>`;
    // 文字
    for (let i = 0; i < n; i++) {
      const mid = starts[i] + spans[i] / 2; // 真上から時計回り
      const len = charCount(choices[i]);
      const rIn = hub + 12;
      const rOut = rs - Math.max(11, R * 0.075) * 2 - 6; // 肉球の下に文字が隠れないように
      const along = rOut - rIn;
      const rMid = (rIn + rOut) / 2;
      const arc = (2 * Math.PI * rMid * spans[i]) / 360;
      let size = Math.min(26, (along / Math.max(len, 1)) * 0.96, arc * 0.62);
      size = Math.max(12, size);
      minLabel = Math.min(minLabel, size);
      // 文字は中心から外へ向けて並べ、左半分では上下が逆にならないよう向きを返す
      const flip = mid > 180;
      const rot = flip ? mid + 90 : mid - 90;
      const tx = cx + Math.cos(((mid - 90) * Math.PI) / 180) * rMid;
      const ty = cy + Math.sin(((mid - 90) * Math.PI) / 180) * rMid;
      s += `<text class="cell-label" x="${tx}" y="${ty}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central" transform="rotate(${rot.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)})">${escapeXml(choices[i])}</text>`;
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
      + `<path d="M${cx - 6},${cy} L${cx - 3.2},${cy - armLen} L${cx + 3.2},${cy - armLen} L${cx + 6},${cy} Z" fill="${cat.paw}" stroke="${cat.line}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<g transform="translate(${cx} ${cy - armLen})">${catPaw(cat, pawSize)}</g>`
      + `</g>`;
    // 真ん中の猫
    const k = hub / 50;
    s += `<circle cx="${cx}" cy="${cy}" r="${hub + 6}" fill="${C.paper}" stroke="${cat.line}" stroke-width="3"/>`;
    s += `<g class="hub-cat" transform="translate(${cx} ${cy + hub * 0.08}) scale(${(k * 0.9).toFixed(3)})">${catFace(cat)}</g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      needle: svg.querySelector('.needle'),
      ring: svg.querySelector('.pick-ring'),
      hubCat: svg.querySelector('.hub-cat'),
    };
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
    const dur = 4600 + turns * 260;
    await frames(dur, (t) => {
      angle = from + total * ease.outQuart(t);
      setNeedle(angle);
      const sec = sectorAt(((angle % 360) + 360) % 360);
      if (sec !== lastSector) {
        lastSector = sec;
        const now = performance.now();
        if (now - lastTick > 40) { audio.tick(); lastTick = now; }
      }
      const nowL = performance.now();
      if (nowL - lastLook > 90) { lookAt(angle); lastLook = nowL; }
    });
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
    audio.fanfare(2);
    const choices = getChoices();
    showResult(result, 'きまったよ', choices[landed]);
    const c = centerOf(result);
    celebrate(2, c.x, c.y - 30);
    await wait(500);
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}

