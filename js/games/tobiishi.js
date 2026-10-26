// こねこの とびいし（決め方：盤を進む〈とびいし〉。見せ方の部品：川に じぐざぐに並ぶ とびいし）。
// 川の手前の岸から向こう岸へ、選択肢を書いた とびいしが じぐざぐに並ぶ。子猫が ぴょんと とびうつって進み、止まった石が結果になる。
// 同じ「盤を進む」系統の ねこ すごろく とは、進み方（すごろくは さいころの目、こちらは子猫が 1〜3こ先へ とぶ）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 子猫が岸で、どこまで行こうか 石を見くらべる。
// 2. ぴょん、ぴょんと とびうつる。石ごとに 次の石と その先の石を見くらべ、1こ先か もっと先か分からない。
// 3. さいごの石で ぐらっと ゆれて、すわりこむ。
// 結果は先に乱数で決め（RS01-S14）、とぶ回数と1回ごとの はばを、決めた石で止まるように組む。
// 石はどれも同じ大きさ（出やすさは表れない：RS01-S21）。下の石ほど手前、上の石ほど向こう岸に近い。
// v16：池を にぎやかに（依頼者の答え 12）。こい が およぎ、はすの葉と花、かえる。とびうつるたびに 水しぶき と 波紋。
// 石は 厚みのある 平らな石（下に こい色の あつみ・こけ）。選択肢は 石に じかに書く。
// 動きの ちがい（3B：4つ）：ふつう・こいが はねる・かえるが はすの葉へ とびうつる・ぬれた石で つるっ。
import { C } from '../art.js';
import { look as nowLook } from '../look.js';
import { warmDay } from '../kits.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

// とぶ はばの並び（1〜3）。合わせて decided + 1（岸を -1 として、石 decided に着く）。とぶ回数は 1〜5。rand() は 0 以上 1 未満
export function hopPlan(decided, rand = Math.random) {
  const dist = decided + 1;
  const want = Math.max(1, Math.min(5, Math.round(dist / 2.2) + (rand() < 0.5 ? 0 : 1)));
  const hops = Math.max(Math.ceil(dist / 3), Math.min(want, dist));
  // まず全部 1 にして、のこりを 3 を超えないように ばらまく
  const steps = new Array(hops).fill(1);
  let rest = dist - hops;
  while (rest > 0) {
    const k = Math.floor(rand() * hops);
    if (steps[k] < 3) { steps[k]++; rest--; }
  }
  return steps;
}

// 動きの時間（ミリ秒）。とぶ回数が少ない時は、岸で長く見くらべる
export const T = { look: 700, lookShort: 2200, hop: 440, pause: 380, wobble: 900, sit: 300 };
export function tobiDuration(hops) {
  return (hops <= 2 ? T.lookShort : T.look) + hops * (T.hop + T.pause) + T.wobble + T.sit;
}

export function createTobiishi({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;
  let g_frogTo = null;
  let g_frogFrom = null;

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const bankH = Math.max(36, Math.min(56, H * 0.1)); // 手前の岸（下）
    const farH = 16; // 向こう岸（上）
    const rowH = Math.min(64, (H - bankH - farH - 8) / n);
    const stoneH = Math.max(20, rowH * 0.8);
    const stoneW = Math.min(210, W * 0.5);
    const used = rowH * n;
    const top = farH + Math.max(0, (H - bankH - farH - used) / 2);
    // 石 i：下から i 番目。左右に じぐざぐ
    const stones = choices.map((_, i) => {
      const y = top + used - rowH * (i + 0.5);
      const x = i % 2 === 0 ? W * 0.32 : W * 0.68;
      return { x, y };
    });
    const catS = Math.max(0.16, Math.min(0.4, (rowH * 1.05) / 120));
    const bankAt = { x: W * 0.3, y: H - bankH * 0.45 };
    geo = { n, W, H, stones, stoneW, stoneH, catS, bankAt, bankH, top, used };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 川
    s += `<defs><linearGradient id="tb-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe4ea"/><stop offset="1" stop-color="#a6d5df"/></linearGradient></defs>`;
    s += `<rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="url(#tb-water)"/>`;
    // こい（石の下を およぐ。3びき）
    const koi = (k) => {
      const col = [['#ffffff', '#f08a5d'], ['#ffd27a', '#f6a23c'], ['#ffffff', '#4a3a33']][k % 3];
      return `<g class="tb-koi" data-k="${k}"><g transform="scale(${(1.25 + (k % 2) * 0.3).toFixed(2)})" opacity="0.92">`
        + `<path d="M-26,0 L-38,-9 Q-34,0 -38,9 Z" fill="${col[1]}" opacity="0.85"/>`
        + `<path d="M-28,0 C-18,-10 8,-11 20,-4 Q26,0 20,4 C8,11 -18,10 -28,0 Z" fill="${col[0]}" stroke="#e7a483" stroke-width="1"/>`
        + `<path d="M-6,-8 C2,-10 10,-7 12,-2 C4,-2 -2,-4 -6,-8 Z M-18,2 C-12,6 -4,7 0,5 C-6,2 -12,1 -18,2 Z" fill="${col[1]}"/>`
        + `<path d="M-4,-8 l-6,-6 M-4,8 l-6,6" stroke="${col[1]}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`
        + `<circle cx="13" cy="-2.4" r="1.3" fill="#4a3a33"/></g></g>`;
    };
    s += `<g class="tb-kois">${[0, 1, 2].map(koi).join('')}</g>`;
    for (let k = 0; k < 7; k++) {
      const y = 20 + k * ((H - bankH) / 7);
      s += `<path d="M${10 + (k % 2) * 30},${y.toFixed(1)} q20,-6 40,0 t40,0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.6"/>`;
      s += `<path d="M${W - 110 + (k % 2) * 20},${(y + 18).toFixed(1)} q16,-5 32,0 t32,0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.5"/>`;
    }
    // 向こう岸と手前の岸
    s += `<path d="M0,0 H${W} V${farH} Q${W / 2},${farH + 8} 0,${farH} Z" fill="#dfe9bf"/>`;
    s += `<path d="M0,${H - bankH} Q${W / 2},${H - bankH - 12} ${W},${H - bankH} V${H} H0 Z" fill="#dfe9bf"/>`;
    s += `<path d="M0,${H - bankH} Q${W / 2},${H - bankH - 12} ${W},${H - bankH}" stroke="#b9cc85" stroke-width="3" fill="none"/>`;
    s += [0.12, 0.55, 0.85].map((fx) => `<path d="M${(W * fx).toFixed(1)},${(H - 8).toFixed(1)} q3,-12 0,-20 M${(W * fx + 6).toFixed(1)},${(H - 8).toFixed(1)} q4,-10 6,-16" stroke="#a9c17a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('');
    // はすの葉と かえる（v12。石の ない 川の はし）
    const pad = (x, y, r, frog) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="M0,0 L${r},${-r * 0.2} A${r},${r * 0.55} 0 1 1 ${r * 0.9},${r * 0.25} Z" fill="#a3bd6e" stroke="#86a256" stroke-width="1.6"/>`
      + (frog ? `<g transform="translate(${-r * 0.2} ${-r * 0.35})"><ellipse rx="${r * 0.42}" ry="${r * 0.3}" fill="#86c26e" stroke="#5f9a4d" stroke-width="1.4"/><circle cx="${-r * 0.2}" cy="${-r * 0.28}" r="${r * 0.13}" fill="#ffffff" stroke="#5f9a4d" stroke-width="1"/><circle cx="${r * 0.2}" cy="${-r * 0.28}" r="${r * 0.13}" fill="#ffffff" stroke="#5f9a4d" stroke-width="1"/><circle cx="${-r * 0.2}" cy="${-r * 0.27}" r="${r * 0.05}" fill="#4a3a33"/><circle cx="${r * 0.2}" cy="${-r * 0.27}" r="${r * 0.05}" fill="#4a3a33"/></g>` : '') + '</g>';
    const pr = Math.max(12, Math.min(22, W * 0.05));
    const lotus = (x, y, r) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${[0, 1, 2, 3, 4].map((q) => `<ellipse cx="0" cy="${(-r * 0.45).toFixed(1)}" rx="${(r * 0.22).toFixed(1)}" ry="${(r * 0.45).toFixed(1)}" fill="#fbd9e2" stroke="#e391ad" stroke-width="1" transform="rotate(${q * 36 - 72})"/>`).join('')}<circle r="${(r * 0.16).toFixed(1)}" fill="#f6d55e"/></g>`;
    s += pad(W * 0.84, H - bankH - pr * 0.9, pr, warmDay(nowLook)) + pad(W * 0.1, farH + pr * 0.9, pr * 0.8, false)
      + pad(W * 0.07, H * 0.48, pr * 0.9, false) + lotus(W * 0.07 + pr * 0.3, H * 0.48 - pr * 0.3, pr * 0.7)
      + pad(W * 0.93, H * 0.3, pr * 0.85, false) + lotus(W * 0.93 + pr * 0.2, H * 0.3 - pr * 0.25, pr * 0.6);
    // かえるが とびうつる先の はすの葉（動きの ちがい）
    g_frogTo = { x: W * 0.93, y: H * 0.3 };
    s += `<g class="tb-frog" visibility="hidden"><ellipse rx="${(pr * 0.42).toFixed(1)}" ry="${(pr * 0.3).toFixed(1)}" fill="#86c26e" stroke="#5f9a4d" stroke-width="1.4"/><circle cx="${(-pr * 0.2).toFixed(1)}" cy="${(-pr * 0.28).toFixed(1)}" r="${(pr * 0.13).toFixed(1)}" fill="#ffffff" stroke="#5f9a4d" stroke-width="1"/><circle cx="${(pr * 0.2).toFixed(1)}" cy="${(-pr * 0.28).toFixed(1)}" r="${(pr * 0.13).toFixed(1)}" fill="#ffffff" stroke="#5f9a4d" stroke-width="1"/><circle cx="${(-pr * 0.2).toFixed(1)}" cy="${(-pr * 0.27).toFixed(1)}" r="${(pr * 0.05).toFixed(1)}" fill="#4a3a33"/><circle cx="${(pr * 0.2).toFixed(1)}" cy="${(-pr * 0.27).toFixed(1)}" r="${(pr * 0.05).toFixed(1)}" fill="#4a3a33"/></g>`;
    g_frogFrom = { x: W * 0.84 - pr * 0.2, y: H - bankH - pr * 0.9 - pr * 0.35 };
    s += `<g class="tb-fish" visibility="hidden"><path d="M-14,0 Q0,-9 12,0 Q0,9 -14,0 Z M12,0 L20,-6 L20,6 Z" fill="#ffffff" stroke="#e7a483" stroke-width="1.6"/><path d="M-6,-5 Q0,-7 5,-3 Q0,-1 -6,-5 Z" fill="#f08a5d"/><circle cx="-7" cy="-1.5" r="1.4" fill="#4a3a33"/></g>`;
    // とびいし
    let minLabel = Infinity;
    stones.forEach((p, i) => {
      const label = choices[i];
      const size = Math.max(12, Math.min(22, stoneH * 0.58, (stoneW - 28) / Math.max(charCount(label), 1)));
      minLabel = Math.min(minLabel, size);
      const tint = ['#efe8dc', '#e9e2d4', '#f2ece1'][i % 3];
      s += `<g class="cell" data-i="${i}">`
        + `<ellipse cx="${p.x.toFixed(1)}" cy="${(p.y + stoneH * 0.32).toFixed(1)}" rx="${(stoneW * 0.5).toFixed(1)}" ry="${(stoneH * 0.3).toFixed(1)}" fill="#a9cfd5" opacity="0.7"/>`
        + `<rect x="${(p.x - stoneW / 2).toFixed(1)}" y="${(p.y - stoneH / 2 + Math.max(4, stoneH * 0.18)).toFixed(1)}" width="${stoneW.toFixed(1)}" height="${stoneH.toFixed(1)}" rx="${(stoneH / 2).toFixed(1)}" fill="#9d9282" stroke="#857a6b" stroke-width="1.6"/>`
        + `<rect class="cell-bg" x="${(p.x - stoneW / 2).toFixed(1)}" y="${(p.y - stoneH / 2).toFixed(1)}" width="${stoneW.toFixed(1)}" height="${stoneH.toFixed(1)}" rx="${(stoneH / 2).toFixed(1)}" fill="${tint}" stroke="#b8ab98" stroke-width="2"/>`
        + `<ellipse cx="${(p.x - stoneW * 0.26).toFixed(1)}" cy="${(p.y - stoneH * 0.22).toFixed(1)}" rx="${(stoneW * 0.12).toFixed(1)}" ry="${(stoneH * 0.12).toFixed(1)}" fill="#ffffff" opacity="0.55"/>`
        + `<circle cx="${(p.x + stoneW * 0.38).toFixed(1)}" cy="${(p.y + stoneH * 0.18).toFixed(1)}" r="${Math.max(2, stoneH * 0.08).toFixed(1)}" fill="#b9cc85" opacity="0.8"/><circle cx="${(p.x + stoneW * 0.32).toFixed(1)}" cy="${(p.y + stoneH * 0.28).toFixed(1)}" r="${Math.max(1.5, stoneH * 0.05).toFixed(1)}" fill="#b9cc85" opacity="0.7"/>`
        + `<text class="cell-label" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g>`;
    });
    // 子猫（石の上では、石の はしに すわる。文字に かからないよう、石の外がわ）
    s += `<g class="tb-fx"></g><g class="tb-pos"><g class="tb-cat">${catSitting(cat, { look: { x: 0.3, y: -1 } })}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      pos: svg.querySelector('.tb-pos'),
      catG: svg.querySelector('.tb-cat'),
      fish: svg.querySelector('.tb-fish'),
      fx: svg.querySelector('.tb-fx'),
      frog: svg.querySelector('.tb-frog'),
      cells: Array.from(svg.querySelectorAll('.cell')),
    };
    placeCat(spotOf(-1));
    geo.frogTo = g_frogTo;
    geo.frogFrom = g_frogFrom;
    // こいは ずっと ゆっくり およぐ（右へ行って 向きを かえて もどる）
    svg.querySelectorAll('.tb-koi').forEach((el, k) => {
      const y = (H - bankH) * (0.22 + k * 0.27);
      const a = -50;
      const b = W + 50;
      el.animate([
        { transform: `translate(${a}px, ${y}px) scale(1,1)` },
        { transform: `translate(${b}px, ${y + 16}px) scale(1,1)`, offset: 0.49 },
        { transform: `translate(${b}px, ${y + 16}px) scale(-1,1)`, offset: 0.5 },
        { transform: `translate(${a}px, ${y}px) scale(-1,1)` },
      ], { duration: 16000 + k * 5000, delay: -k * 4300, iterations: Infinity, easing: 'linear' });
    });
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  // 子猫の すわる所（-1 は岸）。石の上では、石の外がわの はし
  function spotOf(i) {
    const { stones, stoneW, stoneH, catS, bankAt } = geo;
    if (i < 0) return { x: bankAt.x, y: bankAt.y - 70 * catS };
    const p = stones[i];
    const side = i % 2 === 0 ? -1 : 1;
    return { x: p.x + side * (stoneW / 2 - 4), y: p.y + stoneH * 0.25 - 78 * catS };
  }

  // 水しぶき と 波紋（石 i の まわり。-1 は なし）
  function splash(i) {
    if (i < 0) return;
    const p = geo.stones[i];
    const y = p.y + geo.stoneH * 0.45;
    const NS = 'http://www.w3.org/2000/svg';
    for (let q = 0; q < 2; q++) {
      const r = document.createElementNS(NS, 'ellipse');
      r.setAttribute('cx', p.x.toFixed(1));
      r.setAttribute('cy', y.toFixed(1));
      r.setAttribute('rx', (geo.stoneW * 0.5).toFixed(1));
      r.setAttribute('ry', (geo.stoneH * 0.32).toFixed(1));
      r.setAttribute('fill', 'none');
      r.setAttribute('stroke', '#ffffff');
      r.setAttribute('stroke-width', '2');
      refs.fx.appendChild(r);
      r.animate([{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(1.35)', opacity: 0 }], { duration: 900, delay: q * 220, easing: 'ease-out', fill: 'both' }).onfinish = () => r.remove();
      r.style.transformOrigin = `${p.x.toFixed(1)}px ${y.toFixed(1)}px`;
    }
    for (let q = 0; q < 6; q++) {
      const d = document.createElementNS(NS, 'circle');
      const side = q % 2 ? 1 : -1;
      const x0 = p.x + side * geo.stoneW * (0.42 + (q % 3) * 0.05);
      d.setAttribute('cx', x0.toFixed(1));
      d.setAttribute('cy', y.toFixed(1));
      d.setAttribute('r', (2 + (q % 3)).toFixed(1));
      d.setAttribute('fill', '#e6f6fa');
      d.setAttribute('stroke', '#8fc3cf');
      d.setAttribute('stroke-width', '1');
      refs.fx.appendChild(d);
      const dx = side * (8 + q * 3);
      d.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px,-${14 + q * 3}px)`, opacity: 1, offset: 0.45 }, { transform: `translate(${dx * 1.6}px,4px)`, opacity: 0 }], { duration: 560, easing: 'ease-out' }).onfinish = () => d.remove();
    }
  }

  function placeCat(p, squash = 1) {
    const k = geo.catS;
    refs.pos.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${(k / squash).toFixed(3)} ${(k * squash).toFixed(3)})`);
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  // 子猫の足もとに いちばん近い石
  function stoneAt(p) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < geo.n; i++) {
      const q = spotOf(i);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function lightCell(i, strong) {
    refs.cells.forEach((g, k) => {
      const bg = g.querySelector('.cell-bg');
      const on = k === i;
      bg.setAttribute('fill', on ? (strong ? '#fff1c4' : '#fff8e4') : ['#efe8dc', '#e9e2d4', '#f2ece1'][k % 3]);
      bg.setAttribute('stroke', on && strong ? C.momiji : on ? C.kaki : '#b8ab98');
      bg.setAttribute('stroke-width', on && strong ? '4' : on ? '3' : '2');
    });
  }

  // 見る向き（石 i のほう）
  function lookTo(from, i) {
    const q = spotOf(Math.min(i, geo.n - 1));
    return { x: Math.max(-1, Math.min(1, (q.x - from.x) / (geo.W * 0.3))), y: -1 };
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「とぶ」を おしてね');
    play.textContent = 'とぶ';
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
    const steps = hopPlan(decided);
    stage.dataset.steps = steps.join(',');
    // 1. 岸で 見くらべる
    showHint(result, 'どこまで いこうかな…');
    let at = -1;
    let pos = spotOf(-1);
    const lookMs = steps.length <= 2 ? T.lookShort : T.look;
    const looks = Math.max(2, Math.round(lookMs / 350));
    for (let k = 0; k < looks; k++) {
      setCat('normal', lookTo(pos, Math.floor(Math.random() * Math.min(n, 4))));
      audio.hover(k);
      await wait(lookMs / looks);
    }
    // 2. ぴょん、ぴょん
    const vr = Math.random();
    const variant = vr < 0.25 ? 'fish' : vr < 0.5 ? 'frog' : vr < 0.75 ? 'slip' : 'plain';
    stage.dataset.variant = variant;
    const fishAt = variant === 'fish' ? 0 : -1;
    for (let k = 0; k < steps.length; k++) {
      const to = at + steps[k];
      const target = spotOf(to);
      showHint(result, steps[k] >= 2 ? 'ぴょーん！' : 'ぴょん');
      setCat('normal', lookTo(pos, to));
      audio.hop(k);
      const from = pos;
      const h = 24 + Math.abs(target.y - from.y) * 0.5;
      await frames(T.hop, (t) => {
        const e = ease.inOutSine(t);
        placeCat({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e - Math.sin(Math.PI * t) * h }, 1 + 0.08 * Math.sin(Math.PI * t));
      });
      at = to;
      pos = target;
      placeCat(pos, 0.9);
      audio.step(k);
      lightCell(at, false);
      splash(at);
      const last = k === steps.length - 1;
      if (variant === 'frog' && k === 0) {
        // かえるが はすの葉から はすの葉へ ぴょーん
        showHint(result, 'けろっ');
        refs.frog.setAttribute('visibility', 'visible');
        audio.hop(5);
        const a = geo.frogFrom;
        const b = geo.frogTo;
        setCat('happy', { x: Math.sign(b.x - pos.x), y: -0.4 });
        await frames(600, (t) => refs.frog.setAttribute('transform', `translate(${(a.x + (b.x - a.x) * t).toFixed(1)} ${(a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * 50).toFixed(1)})`));
        refs.frog.setAttribute('visibility', 'hidden');
      }
      if (k === fishAt) {
        // こいが ぴょんと はねて、こねこが びっくり
        const fx = pos.x + (at % 2 === 0 ? 1 : -1) * geo.W * 0.22;
        const fy = pos.y + 78 * geo.catS;
        showHint(result, 'わっ！ こいが はねた！');
        setCat('strain', { x: Math.sign(fx - pos.x), y: 0 });
        refs.fish.setAttribute('visibility', 'visible');
        audio.pop();
        await frames(600, (t) => {
          refs.fish.setAttribute('transform', `translate(${(fx + (t - 0.5) * 40).toFixed(1)} ${(fy - Math.sin(Math.PI * t) * 56).toFixed(1)}) rotate(${(-40 + 80 * t).toFixed(0)}) scale(1.3)`);
          placeCat(pos, 1 + 0.1 * Math.sin(Math.PI * Math.min(1, t * 3)));
        });
        refs.fish.setAttribute('visibility', 'hidden');
        placeCat(pos, 0.9);
      }
      if (!last) {
        // 次の石と その先の石を見くらべる
        setCat('normal', lookTo(pos, at + 1));
        await wait(T.pause / 2);
        setCat('normal', lookTo(pos, at + 2));
        await wait(T.pause / 2);
      } else {
        await wait(T.pause);
      }
    }
    // 3. ぐらっと ゆれて、すわりこむ
    const slip = variant === 'slip';
    showHint(result, slip ? 'つるっ…！ おっとっと' : 'ぐらっ…');
    audio.heart();
    setCat('strain', { x: 0, y: 0.4 });
    await frames(T.wobble, (t) => placeCat({ x: pos.x + Math.sin(t * Math.PI * (slip ? 3 : 6)) * (slip ? 12 : 4) * (1 - t), y: pos.y }, 1 - 0.06 * Math.abs(Math.sin(t * Math.PI * 3))));
    placeCat(pos);
    await wait(T.sit);
    const landed = stoneAt(pos);
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    setCat('happy');
    audio.stamp();
    lightCell(landed, true);
    refs.cells[landed].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    showResult(result, landed === n - 1 ? 'いちばん むこうまで' : 'ここで ひとやすみ', getChoices()[landed]);
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
