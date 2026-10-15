// にくきゅうルーレット（見せ方の部品：回る円盤）。
// 盤は動かさず、猫の手の針だけが回る。文字が回らないので、カメラ越しでも選択肢が読みやすい。
import { C, catFace, catPaw } from '../art.js';
import { audio } from '../audio.js';
import { pickIndex, jitter } from '../random.js';
import { celebrate, clearCelebration, ease, frames, wait } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

const FILLS = ['#fbd6a2', '#fde8b2', '#f8cbbb', '#e2ecc0', '#fbe0c6', '#f5d09a'];

export function createRoulette({ view, stage, result, play, getChoices }) {
  let angle = 0; // 針の向き（度。0 が真上、時計回り）
  let geo = null;
  let busy = false;
  let refs = {};

  function sectorFill(i, n) {
    let c = FILLS[i % FILLS.length];
    if (i === n - 1 && n % FILLS.length === 1) c = FILLS[2]; // 最後と最初が同じ色で隣り合わないように
    return c;
  }

  function render() {
    const choices = getChoices();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const R = Math.min(W, H) / 2 - 6;
    const cx = W / 2;
    const cy = H / 2;
    const rs = R - 15; // 扇の半径
    const hub = Math.max(30, R * 0.22);
    const seg = 360 / n;
    geo = { n, seg, cx, cy, R, rs, hub };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    s += `<ellipse cx="${cx}" cy="${cy + R * 0.96}" rx="${R * 0.82}" ry="${R * 0.09}" fill="#d9b07a" opacity="0.35"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.chestnut}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R - 3}" fill="none" stroke="#cf9468" stroke-width="2"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R - 8}" fill="none" stroke="#f3dcc0" stroke-width="2" stroke-dasharray="5 6" opacity="0.8"/>`;
    // 扇
    for (let i = 0; i < n; i++) {
      const a0 = ((i * seg - 90) * Math.PI) / 180;
      const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
      const large = seg > 180 ? 1 : 0;
      const d = `M${cx},${cy} L${cx + Math.cos(a0) * rs},${cy + Math.sin(a0) * rs} A${rs},${rs} 0 ${large} 1 ${cx + Math.cos(a1) * rs},${cy + Math.sin(a1) * rs} Z`;
      s += `<path class="sector" data-i="${i}" d="${d}" fill="${sectorFill(i, n)}" stroke="#fffaf0" stroke-width="3" stroke-linejoin="round"/>`;
    }
    // 選ばれた扇を示す縁（最初は隠す）
    s += `<path class="pick-ring" d="" fill="#ffffff" fill-opacity="0.35" stroke="${C.momiji}" stroke-width="5" stroke-linejoin="round" opacity="0"/>`;
    // 文字
    for (let i = 0; i < n; i++) {
      const mid = i * seg + seg / 2; // 真上から時計回り
      const len = charCount(choices[i]);
      const rIn = hub + 12;
      const rOut = rs - Math.max(11, R * 0.075) * 2 - 6; // 肉球の下に文字が隠れないように
      const along = rOut - rIn;
      const rMid = (rIn + rOut) / 2;
      const arc = (2 * Math.PI * rMid * seg) / 360;
      let size = Math.min(26, (along / Math.max(len, 1)) * 0.96, arc * 0.62);
      size = Math.max(12, size);
      // 文字は中心から外へ向けて並べ、左半分では上下が逆にならないよう向きを返す
      const flip = mid > 180;
      const rot = flip ? mid + 90 : mid - 90;
      const tx = cx + Math.cos(((mid - 90) * Math.PI) / 180) * rMid;
      const ty = cy + Math.sin(((mid - 90) * Math.PI) / 180) * rMid;
      s += `<text class="cell-label" x="${tx}" y="${ty}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central" transform="rotate(${rot.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)})">${escapeXml(choices[i])}</text>`;
    }
    // 縁の鋲
    for (let i = 0; i < n; i++) {
      const a = ((i * seg - 90) * Math.PI) / 180;
      s += `<circle cx="${cx + Math.cos(a) * (R - 8)}" cy="${cy + Math.sin(a) * (R - 8)}" r="3.6" fill="#fff3df" stroke="#9b5f3a" stroke-width="1"/>`;
    }
    // 針（猫の手）：細い腕の先の肉球が、縁の近くを指す。文字の上は細い腕だけが通る
    const pawSize = Math.max(11, R * 0.075);
    const armLen = rs - pawSize * 0.9;
    s += `<g class="needle" transform="rotate(${angle} ${cx} ${cy})">`
      + `<path d="M${cx - 6},${cy} L${cx - 3.2},${cy - armLen} L${cx + 3.2},${cy - armLen} L${cx + 6},${cy} Z" fill="${C.fur}" stroke="${C.line}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<g transform="translate(${cx} ${cy - armLen})">${catPaw(pawSize)}</g>`
      + `</g>`;
    // 真ん中の猫
    const k = hub / 50;
    s += `<circle cx="${cx}" cy="${cy}" r="${hub + 6}" fill="${C.paper}" stroke="${C.line}" stroke-width="3"/>`;
    s += `<g class="hub-cat" transform="translate(${cx} ${cy + hub * 0.08}) scale(${(k * 0.9).toFixed(3)})">${catFace()}</g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      needle: svg.querySelector('.needle'),
      ring: svg.querySelector('.pick-ring'),
      hubCat: svg.querySelector('.hub-cat'),
    };
    stage.dataset.count = String(n);
  }

  function setNeedle(a) {
    refs.needle.setAttribute('transform', `rotate(${a.toFixed(3)} ${geo.cx} ${geo.cy})`);
  }

  function setCat(mood) {
    refs.hubCat.innerHTML = catFace({ mood });
  }

  function showRing(i) {
    const { cx, cy, rs, seg } = geo;
    const a0 = ((i * seg - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
    const large = seg > 180 ? 1 : 0;
    const r = rs - 2;
    refs.ring.setAttribute('d', `M${cx},${cy} L${cx + Math.cos(a0) * r},${cy + Math.sin(a0) * r} A${r},${r} 0 ${large} 1 ${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r} Z`);
    refs.ring.setAttribute('opacity', '1');
    refs.ring.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 900, easing: 'ease-out' });
  }

  function reset() {
    clearCelebration();
    render();
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
    const { n, seg } = geo;
    const decided = pickIndex(n); // 結果を先に決める
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const start = angle;
    const within = seg * (0.5 + jitter(-0.3, 0.3));
    const targetMod = decided * seg + within;
    const turns = 4 + pickIndex(2);
    const delta = 360 * turns + ((targetMod - (start % 360) + 360) % 360);
    // ため（少し戻す）
    await frames(260, (t) => { angle = start - 10 * ease.inOutSine(t); setNeedle(angle); });
    const from = angle;
    const total = delta + 10;
    let lastSector = Math.floor((((from % 360) + 360) % 360) / seg);
    let lastTick = 0;
    const dur = 4600 + turns * 260;
    await frames(dur, (t) => {
      angle = from + total * ease.outQuart(t);
      setNeedle(angle);
      const sec = Math.floor((((angle % 360) + 360) % 360) / seg);
      if (sec !== lastSector) {
        lastSector = sec;
        const now = performance.now();
        if (now - lastTick > 40) { audio.tick(); lastTick = now; }
      }
    });
    angle = ((angle % 360) + 360) % 360;
    // ゆらり（扇の中に収まる小さな揺れ）
    const settle = angle;
    await frames(420, (t) => { setNeedle(settle + Math.sin(t * Math.PI * 3) * 2.2 * (1 - t)); });
    setNeedle(settle);
    const landed = Math.floor(settle / seg);
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

