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
import { C } from '../art.js';
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
    s += `<rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="#cfe8eb"/>`;
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
    s += pad(W * 0.84, H - bankH - pr * 0.9, pr, true) + pad(W * 0.1, farH + pr * 0.9, pr * 0.8, false);
    s += `<g class="tb-fish" visibility="hidden"><path d="M-14,0 Q0,-9 12,0 Q0,9 -14,0 Z M12,0 L20,-6 L20,6 Z" fill="#f7b4a6" stroke="#d98a7a" stroke-width="1.6"/><circle cx="-7" cy="-1.5" r="1.4" fill="#4a3a33"/></g>`;
    // とびいし
    let minLabel = Infinity;
    stones.forEach((p, i) => {
      const label = choices[i];
      const size = Math.max(12, Math.min(22, stoneH * 0.58, (stoneW - 28) / Math.max(charCount(label), 1)));
      minLabel = Math.min(minLabel, size);
      const tint = ['#efe8dc', '#e9e2d4', '#f2ece1'][i % 3];
      s += `<g class="cell" data-i="${i}">`
        + `<ellipse cx="${p.x.toFixed(1)}" cy="${(p.y + stoneH * 0.32).toFixed(1)}" rx="${(stoneW * 0.5).toFixed(1)}" ry="${(stoneH * 0.3).toFixed(1)}" fill="#a9cfd5" opacity="0.7"/>`
        + `<rect class="cell-bg" x="${(p.x - stoneW / 2).toFixed(1)}" y="${(p.y - stoneH / 2).toFixed(1)}" width="${stoneW.toFixed(1)}" height="${stoneH.toFixed(1)}" rx="${(stoneH / 2).toFixed(1)}" fill="${tint}" stroke="#b8ab98" stroke-width="2"/>`
        + `<ellipse cx="${(p.x - stoneW * 0.26).toFixed(1)}" cy="${(p.y - stoneH * 0.22).toFixed(1)}" rx="${(stoneW * 0.12).toFixed(1)}" ry="${(stoneH * 0.12).toFixed(1)}" fill="#ffffff" opacity="0.55"/>`
        + `<circle cx="${(p.x + stoneW * 0.38).toFixed(1)}" cy="${(p.y + stoneH * 0.18).toFixed(1)}" r="${Math.max(2, stoneH * 0.08).toFixed(1)}" fill="#b9cc85" opacity="0.8"/><circle cx="${(p.x + stoneW * 0.32).toFixed(1)}" cy="${(p.y + stoneH * 0.28).toFixed(1)}" r="${Math.max(1.5, stoneH * 0.05).toFixed(1)}" fill="#b9cc85" opacity="0.7"/>`
        + `<text class="cell-label" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
        + `</g>`;
    });
    // 子猫（石の上では、石の はしに すわる。文字に かからないよう、石の外がわ）
    s += `<g class="tb-pos"><g class="tb-cat">${catSitting(cat, { look: { x: 0.3, y: -1 } })}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      pos: svg.querySelector('.tb-pos'),
      catG: svg.querySelector('.tb-cat'),
      fish: svg.querySelector('.tb-fish'),
      cells: Array.from(svg.querySelectorAll('.cell')),
    };
    placeCat(spotOf(-1));
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
    delete stage.dataset.variant;
    const fishAt = steps.length >= 2 && Math.random() < 0.3 ? 0 : -1;
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
      const last = k === steps.length - 1;
      if (k === fishAt) {
        // ときどき出る別の動き（v12）：さかなが ぴょんと はねて、こねこが びっくり
        stage.dataset.variant = 'fish';
        const fx = pos.x + (at % 2 === 0 ? 1 : -1) * geo.W * 0.22;
        const fy = pos.y + 78 * geo.catS;
        showHint(result, 'わっ！ さかな！');
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
    showHint(result, 'ぐらっ…');
    audio.heart();
    setCat('strain', { x: 0, y: 0.4 });
    await frames(T.wobble, (t) => placeCat({ x: pos.x + Math.sin(t * Math.PI * 6) * 4 * (1 - t), y: pos.y }, 1 - 0.06 * Math.abs(Math.sin(t * Math.PI * 3))));
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
