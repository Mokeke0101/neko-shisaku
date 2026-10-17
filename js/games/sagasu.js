// おもちゃ さがし（決め方：隠して当てる〈さがす〉。見せ方の部品：たなに並ぶ だんボール箱）。
// たなの箱のどれかに、ねずみの おもちゃが入っている。猫が箱から箱へ飛び移り、中に もぐって さがす。
// おもちゃが出てきた箱が結果になる。
// 同じ「隠して当てる」系統の まねきねこ おみくじ とは、当て方（おみくじは棒を引く、こちらは猫が1つずつ さがす）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が たなの上から、箱を見くらべる。
// 2. 箱に飛び移って中に もぐる。箱が ごそごそ ゆれて、しっぽだけが見える。
// 3. 何もなければ顔を出して、次の箱へ。いくつ目で見つかるかは、見つかるまで分からない。
// 結果は先に乱数で決め（RS01-S14）、さがす箱の順を、決めた箱で終わるように組む。
// 何もなかった箱は ふたが開いたままになるだけで、選択肢の文字は そのまま読める（どの選択肢も残念がらせない：RS01-S15）。
// 箱はどれも同じ大きさ（出やすさは箱の大きさに表れない：RS01-S21）。
import { C } from '../art.js';
import { catSitting, tail } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

// さがす箱の順。決めた箱 decided で終わり、同じ箱を2回さがさない。
// さがす数は 1〜3（箱が2つなら 1〜2）。rand() は 0 以上 1 未満
export function searchPlan(n, decided, rand = Math.random) {
  const u = rand();
  const count = n <= 2 ? (u < 0.4 ? 1 : 2) : u < 0.2 ? 1 : u < 0.6 ? 2 : 3;
  const pool = Array.from({ length: n }, (_, i) => i).filter((i) => i !== decided);
  const order = [];
  while (order.length < count - 1) order.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  order.push(decided);
  return order;
}

// 動きの時間（ミリ秒）。さがす数 count が多い時は、1つずつを少し速くする。
// 1つで見つかる時は、はじめに長く見くらべて、4秒を下回らないようにする（RS01-S19）
export function searchTimes(count) {
  const sp = count >= 3 ? 0.85 : 1;
  return {
    intro: count === 1 ? 2600 : count === 2 ? 1500 : 900, // たなの上で見くらべる
    hop: 520 * sp, // 箱へ飛び移る
    peer: 300 * sp, // 箱の ふちで のぞきこむ
    rustle: 800 * sp, // 何もない箱で ごそごそ
    out: 600 * sp, // 顔を出して見回す
    rustleLast: 1050, // おもちゃのある箱で ごそごそ
    toy: 520, // おもちゃが飛び出す
    back: 560, // 猫が たなの上へ もどる
  };
}

// 押してから結果が出るまでの、おおよその時間（ミリ秒）
export function searchDuration(count) {
  const t = searchTimes(count);
  return t.intro + count * (t.hop + t.peer + 140) + (count - 1) * (t.rustle + t.out) + t.rustleLast + t.toy + t.back;
}

// ねずみの おもちゃ（中心 0,0、左を向く。幅は約 2.6s）
function toyMouse(s) {
  const r = (v) => (v * s).toFixed(2);
  const L = '#8f8499';
  return `<path d="M${r(0.9)},${r(0.15)} q${r(0.7)},${r(-0.6)} ${r(1.1)},${r(-0.05)} t${r(0.5)},${r(0.35)}" stroke="${L}" stroke-width="${r(0.13)}" fill="none" stroke-linecap="round"/>`
    + `<ellipse cx="0" cy="0" rx="${r(1)}" ry="${r(0.68)}" fill="#e3dde9" stroke="${L}" stroke-width="${r(0.12)}"/>`
    + `<circle cx="${r(-0.3)}" cy="${r(-0.62)}" r="${r(0.34)}" fill="#e3dde9" stroke="${L}" stroke-width="${r(0.12)}"/>`
    + `<circle cx="${r(-0.3)}" cy="${r(-0.62)}" r="${r(0.17)}" fill="#f6b8c4"/>`
    + `<circle cx="${r(-0.55)}" cy="${r(-0.12)}" r="${r(0.1)}" fill="#4a3a33"/>`
    + `<circle cx="${r(-1)}" cy="${r(0.06)}" r="${r(0.13)}" fill="#f19bb0"/>`
    + `<path d="M${r(0.15)},${r(-0.66)} v${r(-0.3)} m${r(-0.18)},0 h${r(0.36)}" stroke="#c99a62" stroke-width="${r(0.12)}" stroke-linecap="round"/>`;
}

export function createSagasu({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
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
    const rows = Math.ceil(n / 2);
    const topRoom = Math.max(58, Math.min(84, H * 0.16)); // たなの上（猫が座る所）
    const sTop = Math.min(0.44, (topRoom - 4) / 158);
    const shelfX = 6;
    const shelfW = W - 12;
    const roofT = 8;
    const plankT = 6;
    const pad = 10;
    const colGap = 12;
    const avail = H - 4 - topRoom - roofT;
    const rowH = Math.min(150, avail / rows);
    const shelfTop = topRoom + Math.max(0, (avail - rowH * rows) / 2); // たなの天板の上の面
    const shelfH = roofT + rowH * rows + 4;
    const headroom = Math.max(12, Math.min(40, rowH * 0.3)); // 箱の上の すきま（しっぽが見える所）
    const boxH = rowH - plankT - headroom;
    const boxW = (shelfW - pad * 2 - colGap) / 2;
    const stW = boxW * 0.84; // 選択肢を書いた紙（箱の前）
    const stH = Math.min(boxH * 0.74, 50);
    const sHop = Math.max(0.2, Math.min(sTop, (rowH * 0.9) / 160));
    const boxes = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / 2);
      const c = i % 2;
      const inRow = r === rows - 1 ? n - r * 2 : 2;
      const offset = inRow === 1 ? (boxW + colGap) / 2 : 0; // 最後の段に1つだけの時は真ん中
      const cx = shelfX + pad + boxW / 2 + offset + c * (boxW + colGap);
      const base = shelfTop + roofT + rowH * (r + 1) - plankT; // 箱の底（棚板の上の面）
      boxes.push({ cx, base, rim: base - boxH, r });
    }
    const home = { x: shelfX + 14 + 80 * sTop, y: shelfTop - 78 * sTop, s: sTop };
    const toyS = Math.max(7, Math.min(12, topRoom * 0.15));
    const toyHome = { x: home.x + 100 * sTop + toyS * 1.4, y: shelfTop - toyS * 0.68 - 1 };
    const tailW = Math.max(4, Math.min(11, headroom * 0.32));
    geo = { n, W, H, rows, boxW, boxH, headroom, boxes, home, toyHome, toyS, sTop, sHop, shelfTop };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // たなの奥の板
    s += `<rect x="${shelfX}" y="${shelfTop.toFixed(1)}" width="${shelfW}" height="${shelfH.toFixed(1)}" rx="10" fill="#f8e6c8" stroke="${C.woodDeep}" stroke-width="3"/>`;
    // 段（下の段から描く。上の段の板と箱が、下の箱の上に はみ出た しっぽを隠す）
    let minLabel = Infinity;
    for (let r = rows - 1; r >= 0; r--) {
      const plankY = shelfTop + roofT + rowH * (r + 1) - plankT;
      s += `<rect x="${shelfX + 2}" y="${plankY.toFixed(1)}" width="${shelfW - 4}" height="${plankT}" fill="${C.woodDeep}"/>`
        + `<path d="M${shelfX + 2},${(plankY + plankT).toFixed(1)} H${shelfX + shelfW - 2}" stroke="#c99a62" stroke-width="1.5" opacity="0.7"/>`;
      boxes.forEach((b, i) => {
        if (b.r !== r) return;
        const label = choices[i];
        const len = Math.max(charCount(label), 1);
        const size = Math.max(12, Math.min(24, (stW - 12) / len, stH * 0.72));
        minLabel = Math.min(minLabel, size);
        const fill = ['#e9c591', '#e3bb84', '#eecd9d'][i % 3];
        s += `<g class="sg-box" data-i="${i}" transform="translate(${b.cx.toFixed(1)} ${b.base.toFixed(1)})"><g class="sg-shake">`
          + `<g class="sg-flaps">${flaps(false)}</g>`
          + `<path d="M${(-boxW / 2 + 3).toFixed(1)},${-boxH} L${(-boxW / 2 + 10).toFixed(1)},${(-boxH - 5).toFixed(1)} H${(boxW / 2 - 10).toFixed(1)} L${(boxW / 2 - 3).toFixed(1)},${-boxH} Z" fill="#a8783f" opacity="0.6"/>`
          + `<g class="sg-tail" visibility="hidden">${tail(cat, tailPath(), tailW)}</g>`
          + `<rect x="${(-boxW / 2).toFixed(1)}" y="${(-boxH).toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" rx="4" fill="${fill}" stroke="#b98a52" stroke-width="2"/>`
          + `<path d="M${(-boxW / 2 + 4).toFixed(1)},${(-boxH + 4).toFixed(1)} H${(boxW / 2 - 4).toFixed(1)}" stroke="#c99a62" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`
          + `<g class="cell" data-i="${i}">`
          + `<rect class="cell-bg" x="${(-stW / 2).toFixed(1)}" y="${(-boxH / 2 - stH / 2).toFixed(1)}" width="${stW.toFixed(1)}" height="${stH.toFixed(1)}" rx="${Math.min(8, stH / 3).toFixed(1)}" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="1.6"/>`
          + `<text class="cell-label" x="0" y="${(-boxH / 2).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
          + `</g></g></g>`;
      });
    }
    // 天板（猫が座る所）
    s += `<rect x="${shelfX - 2}" y="${shelfTop.toFixed(1)}" width="${shelfW + 4}" height="${roofT}" rx="3" fill="${C.woodDeep}"/>`;
    // 天板の上の 本と 植木ばち（右はし。v12）
    const ox = shelfX + shelfW - 16;
    const oy = shelfTop;
    const bkH = Math.min(30, topRoom * 0.5);
    s += [['#f7a6a0', 0], ['#9fc5e8', 9], ['#a6dc98', 17]].map(([col, dx]) => `<rect x="${(ox - 70 + dx).toFixed(1)}" y="${(oy - bkH + (dx === 9 ? 3 : 0)).toFixed(1)}" width="8" height="${(bkH - (dx === 9 ? 3 : 0)).toFixed(1)}" rx="1.5" fill="${col}" stroke="#8c6e5a" stroke-width="1.4"/>`).join('')
      + `<path d="M${(ox - 22).toFixed(1)},${(oy - bkH * 0.55).toFixed(1)} h18 l-3,${(bkH * 0.55).toFixed(1)} h-12 Z" fill="#db8f4a" stroke="#9b5f3a" stroke-width="1.6"/>`
      + `<path d="M${(ox - 13).toFixed(1)},${(oy - bkH * 0.55).toFixed(1)} q-8,-10 -4,-18 M${(ox - 13).toFixed(1)},${(oy - bkH * 0.55).toFixed(1)} q6,-12 10,-14 M${(ox - 13).toFixed(1)},${(oy - bkH * 0.55).toFixed(1)} q0,-12 0,-20" stroke="#86a256" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    s += `<g class="sg-sock" visibility="hidden"><path d="M-6,-14 h12 v14 q0,8 8,10 q4,6 -4,8 q-14,0 -16,-10 Z" fill="#cfe0ea" stroke="#7aa7c4" stroke-width="2"/><path d="M-6,-10 h12 M-6,-6 h12" stroke="#f7a6a0" stroke-width="2"/></g>`;
    // おもちゃと猫（いちばん上に描く）
    s += `<g class="sg-toy" visibility="hidden">${toyMouse(toyS)}</g>`;
    s += `<g class="sg-cat-pos"><g class="sg-cat">${catSitting(cat, { look: { x: 0.4, y: 0.8 } })}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    const boxEls = Array.from(svg.querySelectorAll('.sg-box')).sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i));
    refs = {
      shakes: boxEls.map((g) => g.querySelector('.sg-shake')),
      flaps: boxEls.map((g) => g.querySelector('.sg-flaps')),
      tails: boxEls.map((g) => g.querySelector('.sg-tail')),
      cells: boxEls.map((g) => g.querySelector('.cell')),
      toy: svg.querySelector('.sg-toy'),
      catPos: svg.querySelector('.sg-cat-pos'),
      catG: svg.querySelector('.sg-cat'),
      sock: svg.querySelector('.sg-sock'),
    };
    placeCat(home);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  // 箱の ふた（左右の2枚と、奥の1枚）。open は さがした後の、外へ大きく開いた形
  function flaps(open) {
    const { boxW: w, boxH: h, headroom } = geo;
    const fh = Math.min(headroom * 0.7, 18);
    const dd = Math.min(14, w * 0.09);
    const side = (dir) => {
      // 開いた形は、となりの箱の ふたと重なりにくいよう、少し短く見せる
      const a = ((open ? 62 : 16) * Math.PI) / 180;
      const len = open ? fh * 0.65 : fh;
      const vx = dir * Math.sin(a) * len;
      const vy = -Math.cos(a) * len;
      const x0 = (dir * w) / 2;
      const x1 = x0 - dir * dd;
      return `<path d="M${x0.toFixed(1)},${-h} L${x1.toFixed(1)},${-h - 3} L${(x1 + vx).toFixed(1)},${(-h - 3 + vy).toFixed(1)} L${(x0 + vx).toFixed(1)},${(-h + vy).toFixed(1)} Z" fill="#f0d19f" stroke="#b98a52" stroke-width="1.6" stroke-linejoin="round"/>`;
    };
    const back = open ? fh * 0.35 : fh * 0.8;
    return `<rect x="${(-w / 2 + 10).toFixed(1)}" y="${(-h - 4 - back).toFixed(1)}" width="${(w - 20).toFixed(1)}" height="${(back + 4).toFixed(1)}" rx="2" fill="#e6c48f" stroke="#b98a52" stroke-width="1.6"/>`
      + side(-1) + side(1);
  }

  // 箱の中から上へ のびる しっぽ（箱の底を 0,0 とする）
  function tailPath() {
    const { boxW: w, boxH: h, headroom: hr } = geo;
    return `M${(-w * 0.05).toFixed(1)},${(-h + 10).toFixed(1)} C${(-w * 0.05).toFixed(1)},${(-h - hr * 0.5).toFixed(1)} ${(w * 0.08).toFixed(1)},${(-h - hr * 0.45).toFixed(1)} ${(w * 0.07).toFixed(1)},${(-h - hr * 0.82).toFixed(1)}`;
  }

  function placeCat(p) {
    refs.catPos.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${p.s.toFixed(3)})`);
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  function placeToy(x, y, rot = 0) {
    refs.toy.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)})`);
  }

  // 猫の目を、箱 b のほうへ向ける
  function lookAt(from, b) {
    const dx = (b.cx - from.x) / (geo.W * 0.4);
    const dy = (b.rim - from.y) / (geo.H * 0.4);
    return { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
  }

  // 猫の足もとに いちばん近い箱（猫が実際に もぐった箱）
  function boxAt(x, y) {
    let best = -1;
    let bestD = Infinity;
    geo.boxes.forEach((b, i) => {
      const d = Math.hypot(b.cx - x, b.rim - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  async function hop(from, to, dur) {
    // 下の段へ移る時も、いったん上へ跳ねてから降りる（文字の前を すべり落ちて見えないように）
    const h = 30 + Math.abs(to.x - from.x) * 0.12 + Math.abs(from.y - to.y) * 0.32;
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      placeCat({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - Math.sin(Math.PI * t) * h, s: from.s + (to.s - from.s) * e });
    });
    placeCat(to);
  }

  // 箱の中で ごそごそ：箱が ゆれて、しっぽが ふれる
  async function rustle(i, dur) {
    const g = refs.shakes[i];
    const tl = refs.tails[i];
    const pivot = `${(-geo.boxW * 0.05).toFixed(1)} ${(-geo.boxH).toFixed(1)}`;
    tl.setAttribute('visibility', 'visible');
    let lastSound = -1;
    await frames(dur, (t) => {
      const a = Math.sin(t * Math.PI * 7) * 2.6 * Math.sin(Math.PI * Math.min(1, t * 1.3));
      g.setAttribute('transform', `rotate(${a.toFixed(2)}) translate(0 ${(-Math.abs(Math.sin(t * Math.PI * 7)) * 1.5).toFixed(2)})`);
      tl.setAttribute('transform', `rotate(${(Math.sin(t * Math.PI * 5) * 20).toFixed(1)} ${pivot})`);
      const step = Math.floor((t * dur) / 270);
      if (step !== lastSound) { lastSound = step; audio.rustle(); }
    });
    g.removeAttribute('transform');
    tl.setAttribute('visibility', 'hidden');
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「さがす」を おしてね');
    play.textContent = 'さがす';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, boxes, home, sHop } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const order = searchPlan(n, decided);
    const T = searchTimes(order.length);

    // 1. たなの上から、箱を見くらべる
    showHint(result, 'どの はこかな…');
    const looks = Math.max(2, Math.round(T.intro / 420));
    let prevLook = -1;
    for (let k = 0; k < looks; k++) {
      let j;
      do { j = Math.floor(Math.random() * n); } while (n > 1 && j === prevLook);
      prevLook = j;
      setCat('normal', lookAt(home, boxes[j]));
      audio.hover(k);
      await wait(T.intro / looks);
    }

    // 2. 箱に飛び移って もぐる。何もなければ顔を出して、次の箱へ
    let pos = home;
    let dove = -1;
    delete stage.dataset.variant;
    const sockAt = order.length >= 2 && Math.random() < 0.3 ? 0 : -1;
    for (let k = 0; k < order.length; k++) {
      const b = boxes[order[k]];
      const last = k === order.length - 1;
      const to = { x: b.cx, y: b.rim - 78 * sHop, s: sHop };
      showHint(result, k === 0 ? 'この はこ…？' : 'つぎは…');
      setCat('normal', { x: Math.sign(to.x - pos.x) * 0.6, y: 0.6 });
      audio.hop(k);
      await hop(pos, to, T.hop);
      pos = to;
      // ふちで のぞきこむ
      setCat('normal', { x: 0, y: 1 });
      if (last || Math.random() < 0.5) audio.heart();
      await wait(T.peer);
      // もぐる
      await frames(140, (t) => placeCat({ x: pos.x, y: pos.y + 40 * sHop * t * t, s: pos.s * (1 - 0.3 * t) }));
      refs.catPos.setAttribute('visibility', 'hidden');
      dove = boxAt(pos.x, pos.y + 78 * sHop);
      showHint(result, 'ごそごそ…');
      await rustle(dove, last ? T.rustleLast : T.rustle);
      if (last) break;
      // 何もない：ふたを開けたままにして、顔を出す
      refs.flaps[dove].innerHTML = flaps(true);
      if (k === sockAt) {
        // ときどき出る別の動き（v12）：おもちゃの かわりに くつしたが とびだす
        stage.dataset.variant = 'sock';
        const bx = boxes[dove];
        showHint(result, 'あった！… と おもったら くつした');
        audio.pop();
        refs.sock.setAttribute('visibility', 'visible');
        await frames(560, (t) => {
          refs.sock.setAttribute('transform', `translate(${(bx.cx + 30 * t).toFixed(1)} ${(bx.rim - 10 - Math.sin(Math.PI * t) * 40 + t * 20).toFixed(1)}) rotate(${(t * 200).toFixed(0)}) scale(1.6)`);
          refs.sock.setAttribute('opacity', (1 - Math.max(0, t - 0.6) * 2.5).toFixed(2));
        });
        refs.sock.setAttribute('visibility', 'hidden');
      }
      showHint(result, 'ここじゃ ないみたい');
      setCat('normal', { x: -1, y: 0 });
      refs.catPos.setAttribute('visibility', 'visible');
      await frames(T.out * 0.35, (t) => placeCat({ x: pos.x, y: pos.y + 40 * sHop * (1 - ease.outBack(t)), s: pos.s }));
      await wait(T.out * 0.3);
      setCat('normal', { x: 1, y: 0 });
      await wait(T.out * 0.35);
    }

    // 3. 見つけた：おもちゃが飛び出し、猫が たなの上へ もどる
    const landed = dove;
    const b = boxes[landed];
    refs.flaps[landed].innerHTML = flaps(true);
    showHint(result, 'あった！');
    audio.pop();
    const { toyHome } = geo;
    const toyFrom = { x: b.cx, y: b.rim - 4 };
    refs.toy.setAttribute('visibility', 'visible');
    await frames(T.toy, (t) => {
      const e = ease.inOutSine(t);
      placeToy(toyFrom.x + (toyHome.x - toyFrom.x) * e, toyFrom.y + (toyHome.y - toyFrom.y) * e - Math.sin(Math.PI * t) * 60, 360 * t);
    });
    placeToy(toyHome.x, toyHome.y);
    setCat('happy');
    refs.catPos.setAttribute('visibility', 'visible');
    audio.hop(order.length + 1);
    await hop({ x: pos.x, y: pos.y + 30 * sHop, s: pos.s * 0.8 }, home, T.back);
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    const bg = refs.cells[landed].querySelector('.cell-bg');
    bg.setAttribute('fill', '#fff1c4');
    bg.setAttribute('stroke', C.momiji);
    bg.setAttribute('stroke-width', '3.5');
    refs.shakes[landed].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'みつけた！', choices[landed]);
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
