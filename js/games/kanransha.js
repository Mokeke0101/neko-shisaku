// ねこの かんらんしゃ（決め方：回って止まる〈ゴンドラ〉。見せ方の部品：ゴンドラに じかに書いた選択肢）。
// 選択肢の数だけ ゴンドラが付いた かんらんしゃ。選択肢は ゴンドラの胴に じかに書く（v16 で 下の一覧を やめた。長い名前は2行）。
// 係の アズが レバーを ひくと、電球が ともって ぐるぐる まわる。まわる速さに合わせて、空の雲・鳥・風船が ながれていく。
// だんだん ゆっくりになって止まり、「てっぺん」に止まった ゴンドラの後ろに 花火が上がる。そのゴンドラの選択肢が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. アズが レバーを ガチャンと ひく。電球が ともる。
// 2. かんらんしゃが ぐるぐる まわり、雲や鳥が びゅーんと ながれる。だんだん ゆっくりに。てっぺんの ゴンドラが うすく光る。
// 3. 止まりそうで止まらない。動きの ちがい（3B：4つ）：
//    ふつう（1つ手前で ひと息 おいて、もう少し進む）・もう いっしゅう・いきすぎて もどる・止まってから アズが もう1回 レバー
// 4. てっぺんの ゴンドラが ゆれて、花火が ぱーんと上がる。
// 結果は先に乱数で決め（RS01-S14）、止まる角度を、決めた ゴンドラが てっぺんに来る角度にする。
import { C, cloud } from '../art.js';
import { catSitting, catName } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, hintPlate, TINTS, f } from './common.js';
import { charCount, escapeXml } from '../ui.js';

export const T = { lever: 520, spin: 3700, pause: 420, creep: 900, fire: 900 };
// 長い動きの ちがい（もう いっしゅう・もう1回 レバー）で足す時間
export const EXTRA = 900;
export const kanranshaDuration = (extra = false) => T.lever + T.spin + T.pause + T.creep + T.fire + 100 + (extra ? EXTRA : 0);
export const VARIANTS = ['plain', 'extra', 'back', 'again'];
export const kanranshaVariant = (r = Math.random()) => VARIANTS[Math.min(3, Math.floor(r * 4))];

// ゴンドラ i の、まわり始めの角度（度。0 が右、-90 が上）
export const baseAngle = (i, n) => -90 + (360 * i) / n;
// 止まる時の回転（度）：いまの回転 r0 から2回以上まわって、決めた ゴンドラが てっぺん（-90 度）に来る回転
export function stopAfter(n, decided, r0) {
  const want = -baseAngle(decided, n) - 90;
  return want + 360 * Math.ceil((r0 + 720 - want) / 360);
}
// 回転 rot の時、てっぺんに いちばん近い ゴンドラ
export function atTop(n, rot) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < n; i++) {
    const a = (((baseAngle(i, n) + rot + 90) % 360) + 540) % 360 - 180;
    if (Math.abs(a) < bd) { bd = Math.abs(a); best = i; }
  }
  return best;
}

// 選択肢を ゴンドラに書く行に分ける（2行の時は 前を長く）
export const splitLabel = (label, lines, room = 0) => {
  const ch = [...label];
  if (lines === 1 || ch.length < 2 || charCount(label) <= room) return [label];
  const k = Math.ceil(ch.length / 2);
  return [ch.slice(0, k).join(''), ch.slice(k).join('')];
};
// ゴンドラの大きさ・文字の大きさ・行の数・輪の半径を決める。
// となりの ゴンドラの文字が どの角度でも重ならない半径（2つの中心の きょり ＞ 札の対角線）にする
export function wheelLayout(labels, W, H) {
  const n = labels.length;
  const topH = 26;
  const hang = 12; // つり手と屋根
  const groundH = 16;
  const sin = n <= 2 ? 1 : Math.sin(Math.PI / n);
  for (const lines of [1, 2]) {
    const longest = Math.max(1, ...labels.map((l) => Math.max(...splitLabel(l, lines).map((x) => charCount(x)))));
    for (let size = 20; size >= 12; size -= 0.5) {
      const gw = Math.max(40, longest * size + 10);
      const win = lines === 1 ? size * 0.7 : 0; // 1行の時は 文字の上に まど
      const gh = Math.max(26, lines * size * 1.1 + 7 + win);
      const need = Math.hypot(gw + 2, gh + 2) / (2 * sin);
      const rMax = Math.min(W / 2 - gw / 2 - 3, (H - topH - hang - gh - groundH) / 2, W * 0.42);
      if (need <= rMax) return { lines, size, gw, gh, win, R: rMax, topH, hang, groundH };
    }
  }
  const size = 12;
  const gw = 4 * size + 10;
  const gh = 2 * size * 1.1 + 7;
  return { lines: 2, size, gw, gh, win: 0, R: Math.min(W / 2 - gw / 2 - 3, (H - topH - hang - gh - groundH) / 2), topH, hang, groundH };
}

// 空を ながれる物（雲・鳥・風船）。k は種類、x・y は はじめの場所、depth は 遠さ（大きいほど ゆっくり）
const FLOATERS = [
  { k: 'cloud', x: 0.12, y: 0.12, s: 1, depth: 1.6 }, { k: 'cloud', x: 0.7, y: 0.3, s: 0.8, depth: 2.2 },
  { k: 'cloud', x: 0.4, y: 0.55, s: 0.65, depth: 2.8 }, { k: 'bird', x: 0.85, y: 0.18, s: 1, depth: 1 },
  { k: 'bird', x: 0.25, y: 0.38, s: 0.8, depth: 1.2 }, { k: 'balloon', x: 0.08, y: 0.62, s: 1, depth: 1.4 },
  { k: 'balloon', x: 0.93, y: 0.5, s: 0.85, depth: 1.8 },
];
function floater(k, s, i) {
  if (k === 'cloud') return `<g opacity="0.85">${cloud(70 * s)}</g>`;
  if (k === 'bird') return `<path d="M${f(-9 * s)},0 q${f(4.5 * s)},${f(-6 * s)} ${f(9 * s)},0 q${f(4.5 * s)},${f(-6 * s)} ${f(9 * s)},0" stroke="#8b7d78" stroke-width="2" fill="none" stroke-linecap="round" transform="translate(${f(-4.5 * s)} 0)"/>`;
  const [col, edge] = TINTS[(i * 5) % TINTS.length];
  return `<path d="M0,${f(12 * s)} q${f(-4 * s)},${f(10 * s)} 0,${f(20 * s)}" stroke="#b9a48a" stroke-width="1.4" fill="none"/>`
    + `<ellipse rx="${f(9 * s)}" ry="${f(11 * s)}" fill="${col}" stroke="${edge}" stroke-width="2"/><ellipse cx="${f(-3 * s)}" cy="${f(-4 * s)}" rx="${f(2.2 * s)}" ry="${f(3.2 * s)}" fill="#ffffff" opacity="0.7"/>`;
}

// ゴンドラ（つり手 0,0 から下へ）。屋根・胴（選択肢を書く）・床の あつみ・まどの光
function gondola(i, label, L) {
  const { gw, gh, size, lines } = L;
  const [col, edge] = TINTS[i % TINTS.length];
  const y0 = L.hang;
  const rx = Math.min(12, gh * 0.36);
  const parts = splitLabel(label, lines, (gw - 10) / size);
  const lh = size * 1.1;
  const win = L.win;
  let s = `<path d="M0,0 V${f(y0 - 4)}" stroke="#9b5f3a" stroke-width="2.2"/><circle r="3" fill="#fffaf0" stroke="#9b5f3a" stroke-width="1.6"/>`
    // 屋根（まるい ふた と てっぺんの玉）
    + `<path d="M${f(-gw * 0.4)},${f(y0 + 2)} Q0,${f(y0 - 9)} ${f(gw * 0.4)},${f(y0 + 2)} Z" fill="${edge}"/>`
    + `<circle cy="${f(y0 - 4.5)}" r="2.6" fill="${edge}"/>`
    // 床の あつみ（下に ずらした こい色）
    + `<rect x="${f(-gw / 2)}" y="${f(y0 + 3.5)}" width="${f(gw)}" height="${f(gh)}" rx="${f(rx)}" fill="${edge}"/>`
    + `<g class="cell" data-i="${i}"><rect class="cell-bg" x="${f(-gw / 2)}" y="${f(y0)}" width="${f(gw)}" height="${f(gh)}" rx="${f(rx)}" fill="${col}" stroke="${edge}" stroke-width="2"/>`
    + (win ? `<rect x="${f(-gw / 2 + 5)}" y="${f(y0 + 4)}" width="${f(gw - 10)}" height="${f(win)}" rx="${f(win * 0.4)}" fill="#e6f3f7" stroke="${edge}" stroke-width="1.2"/>`
      + `<path d="M${f(-gw / 2 + 10)},${f(y0 + 4 + win * 0.7)} l${f(win * 0.5)},${f(-win * 0.45)}" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`
      : `<rect x="${f(-gw / 2 + 4)}" y="${f(y0 + 3)}" width="${f(gw - 8)}" height="${f(Math.max(4, gh * 0.2))}" rx="${f(Math.max(2, gh * 0.1))}" fill="#ffffff" opacity="0.5"/>`);
  parts.forEach((p, k) => {
    const ty = y0 + win + (gh - win) / 2 + (k - (parts.length - 1) / 2) * lh + (win ? 1 : 0.5);
    s += `<text class="cell-label" x="0" y="${f(ty)}" font-size="${f(size)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(p)}</text>`;
  });
  return s + '</g>';
}

export function createKanransha(deps) {
  const R = {};
  let rot = 0;
  // ゴンドラは まわる速さに合わせて ふりこのように ゆれる（つり手が中心）
  let sway = 0;
  const place = (g, r) => {
    sway = sway * 0.85 + Math.max(-16, Math.min(16, -(r - rot) * 2.2)) * 0.15;
    if (Math.abs(r - rot) > 60) sway = 0; // はじめに置く時
    rot = r;
    R.bodies.forEach((el) => el.setAttribute('transform', `rotate(${f(sway)})`));
    R.wheel.setAttribute('transform', `translate(${f(g.cx)} ${f(g.cy)}) rotate(${f(r)})`);
    R.gons.forEach((el, i) => {
      const a = ((baseAngle(i, g.n) + r) * Math.PI) / 180;
      el.setAttribute('transform', `translate(${f(g.cx + Math.cos(a) * g.R)} ${f(g.cy + Math.sin(a) * g.R)})`);
    });
  };
  // 空の物を、回った分だけ ながす（dr は回った角度）
  const flow = (g, dr) => {
    R.floats.forEach((el, k) => {
      const fl = FLOATERS[k];
      g.fx[k] -= (dr * 0.9) / fl.depth;
      if (fl.k === 'balloon') g.fy[k] -= (dr * 0.12) / fl.depth;
      const span = g.W + 120;
      const x = ((((g.fx[k] + 60) % span) + span) % span) - 60;
      const hy = g.skyH + 30;
      const y = ((((g.fy[k] + 30) % hy) + hy) % hy) - 30;
      el.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
    });
  };
  // 電球：まわっている間は 光が おいかけっこ
  const bulbs = (on, phase = 0) => {
    R.bulbs.forEach((el, k) => el.setAttribute('fill', !on ? '#fffaf0' : (k + Math.floor(phase)) % 3 === 0 ? '#ffd36b' : '#fff1c4'));
  };
  return createGame(deps, {
    play: 'まわす',
    resultLabel: 'てっぺんは',
    draw(g) {
      const { n, W, H, choices, cat } = g;
      const L = wheelLayout(choices, W, H);
      const { R: rw, gw, gh, topH, hang, groundH } = L;
      const cx = W / 2;
      const ground = H - groundH;
      // 輪の高さ：上の すきまと 下の すきまを だいたい半分ずつ（大きい画面で 上や下に よりすぎない）
      const hiCy = topH + rw + 2;
      const cy = hiCy + Math.max(0, ground - 10 - gh - hang - rw - hiCy) * 0.55;
      Object.assign(g, { L, R: rw, gw, gh, cx, cy, skyH: H - groundH });
      g.fx = FLOATERS.map((fl) => fl.x * W);
      g.fy = FLOATERS.map((fl) => fl.y * g.skyH);
      // 空を ながれる物（かんらんしゃの後ろ）
      let s = '<g class="kr-sky">';
      FLOATERS.forEach((fl, k) => { s += `<g class="kr-float" transform="translate(${f(g.fx[k])} ${f(g.fy[k])})">${floater(fl.k, fl.s, k)}</g>`; });
      s += '</g><g class="kr-fire"></g>';
      // 地面の しばふ と、のりばの台
      s += `<path d="M0,${f(ground + 4)} Q${f(W / 2)},${f(ground - 8)} ${W},${f(ground + 4)} V${H} H0 Z" fill="#cfe3c0"/>`
        + `<path d="M0,${f(ground + 4)} Q${f(W / 2)},${f(ground - 8)} ${W},${f(ground + 4)}" stroke="#a9c98f" stroke-width="2.4" fill="none"/>`;
      // 柱（Aの字）
      const leg = Math.max(5, rw * 0.06);
      s += `<path d="M${f(cx)},${f(cy)} L${f(cx - rw * 0.56)},${f(ground)} M${f(cx)},${f(cy)} L${f(cx + rw * 0.56)},${f(ground)}" stroke="#b98a52" stroke-width="${f(leg + 2.4)}" stroke-linecap="round"/>`
        + `<path d="M${f(cx)},${f(cy)} L${f(cx - rw * 0.56)},${f(ground)} M${f(cx)},${f(cy)} L${f(cx + rw * 0.56)},${f(ground)}" stroke="#f1d3a6" stroke-width="${f(leg)}" stroke-linecap="round"/>`
        + `<path d="M${f(cx - rw * 0.3)},${f(cy + (ground - cy) * 0.54)} H${f(cx + rw * 0.3)}" stroke="#d9b886" stroke-width="3" stroke-linecap="round"/>`;
      // 輪（輪ごと回す）。外の輪と内の輪、ほね、ふちの電球
      let wheel = `<circle r="${f(rw)}" fill="none" stroke="#d97f7a" stroke-width="${f(Math.max(4.4, rw * 0.05) + 2)}"/><circle r="${f(rw)}" fill="none" stroke="#f7a6a0" stroke-width="${f(Math.max(4.4, rw * 0.05))}"/>`
        + `<circle r="${f(rw * 0.84)}" fill="none" stroke="#fde3a6" stroke-width="2.4"/><circle r="${f(rw * 0.42)}" fill="none" stroke="#fde3a6" stroke-width="2"/>`;
      const spokes = Math.max(n, 8);
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const b = ((i + 0.5) / spokes) * Math.PI * 2;
        wheel += `<path d="M0,0 L${f(Math.cos(a) * rw)},${f(Math.sin(a) * rw)}" stroke="#f1d3a6" stroke-width="2.2"/>`
          + `<path d="M${f(Math.cos(a) * rw * 0.84)},${f(Math.sin(a) * rw * 0.84)} L${f(Math.cos(b) * rw)},${f(Math.sin(b) * rw)}" stroke="#f6e0bd" stroke-width="1.4"/>`;
      }
      const nb = Math.round(Math.max(16, rw / 7));
      for (let i = 0; i < nb; i++) {
        const a = ((i + 0.5) / nb) * Math.PI * 2;
        wheel += `<circle class="bulb" cx="${f(Math.cos(a) * rw)}" cy="${f(Math.sin(a) * rw)}" r="${f(Math.max(2, rw * 0.026))}" fill="#fffaf0" stroke="#e3bb84" stroke-width="1"/>`;
      }
      wheel += `<circle r="${f(rw * 0.13)}" fill="#fffaf0" stroke="#d97f7a" stroke-width="3"/><circle r="${f(rw * 0.05)}" fill="#f7a6a0"/>`;
      s += `<g class="wheel">${wheel}</g>`;
      // ゴンドラ（つり下がって、いつも上を向く）
      for (let i = 0; i < n; i++) s += `<g class="gon" data-i="${i}"><g class="gon-body">${gondola(i, choices[i], L)}</g></g>`;
      // てっぺんの しるし（星の旗。てっぺんの つり手の真上）
      const my = Math.max(12, cy - rw - 13);
      s += `<g transform="translate(${f(cx)} ${f(my)})"><path d="M0,9 l-5,-7 h10 Z" fill="#e8664a"/>`
        + `<rect x="-42" y="-11" width="84" height="18" rx="9" fill="#fffaf0" stroke="#e8664a" stroke-width="2"/>`
        + `<path transform="translate(-28 -2) scale(0.62)" d="M0,-9 L2.6,-3 L9,-2.6 L4,1.6 L5.6,8 L0,4.6 L-5.6,8 L-4,1.6 L-9,-2.6 L-2.6,-3 Z" fill="#fde3a6" stroke="#d9b04d" stroke-width="2.4" stroke-linejoin="round"/>`
        + `<text x="6" y="-1.5" font-size="12.5" font-weight="700" fill="#c8615c" text-anchor="middle" dominant-baseline="central">てっぺん</text></g>`;
      // 係の アズと レバー（右下のすみ）
      const cs = Math.max(0.24, Math.min(0.4, W / 900));
      const catX = W - 46 * cs - 2;
      const catY = ground - 70 * cs;
      const box = { x: catX - 60 * cs - 22, y: ground - 24 * cs - 12, w: 22, h: 24 * cs + 12 };
      g.lever = { x: box.x + box.w / 2, y: box.y + 4, len: 24 * cs + 10 };
      s += `<rect x="${f(box.x)}" y="${f(box.y)}" width="${f(box.w)}" height="${f(box.h)}" rx="5" fill="#cfe0ea" stroke="#7aa7c4" stroke-width="2"/>`
        + `<g class="kr-lever" transform="translate(${f(g.lever.x)} ${f(g.lever.y)}) rotate(-35)"><path d="M0,0 V${f(-g.lever.len)}" stroke="#8c6e5a" stroke-width="3" stroke-linecap="round"/><circle cy="${f(-g.lever.len)}" r="5" fill="#f7a6a0" stroke="#d97f7a" stroke-width="1.6"/></g>`
        + `<g transform="translate(${f(catX)} ${f(catY)}) scale(${f(cs)})"><g class="kr-cat">${catSitting(cat, { look: { x: -1, y: -0.6 } })}</g></g>`;
      return s;
    },
    after(g) {
      R.wheel = g.svg.querySelector('.wheel');
      R.gons = Array.from(g.svg.querySelectorAll('.gon'));
      R.bodies = R.gons.map((el) => el.querySelector('.gon-body'));
      sway = 0;
      R.cat = g.svg.querySelector('.kr-cat');
      R.lever = g.svg.querySelector('.kr-lever');
      R.floats = Array.from(g.svg.querySelectorAll('.kr-float'));
      R.bulbs = Array.from(g.svg.querySelectorAll('.bulb'));
      R.fire = g.svg.querySelector('.kr-fire');
      place(g, Math.random() * 360);
    },
    async perform(g, decided, say) {
      const { svg, n, cat } = g;
      const variant = kanranshaVariant();
      g.stage.dataset.variant = variant;
      const pull = (dur) => frames(dur, (t) => {
        const e = ease.outBack(Math.min(1, t * 1.6));
        R.lever.setAttribute('transform', `translate(${f(g.lever.x)} ${f(g.lever.y)}) rotate(${f(-35 + 70 * e)})`);
      });
      // 1. アズが レバーを ひく
      say(`${catName(cat)}が レバーを ひくよ`);
      await pull(T.lever);
      audio.stamp();
      R.cat.innerHTML = catSitting(cat, { mood: 'happy', look: { x: -1, y: -1 } });
      // 2. まわる（景色が ながれる）
      const r0 = rot;
      const step = 360 / n;
      const target = stopAfter(n, decided, r0);
      // 止まりそうになる所：ふつうは1つ手前。いきすぎは 半分 すぎた所。もう1回 レバーは 2つ手前
      const near = variant === 'back' ? target + step * 0.45 : variant === 'again' ? target - step * 1.5 : target - step * 0.55;
      say('まわる まわる…');
      let lit = -1;
      let ticked = atTop(n, r0);
      let prev = r0;
      const tickFrame = () => {
        flow(g, rot - prev);
        bulbs(true, rot / 20);
        prev = rot;
        const b = atTop(n, rot);
        if (b !== lit) { if (lit >= 0) hintPlate(svg, lit, false); lit = b; hintPlate(svg, b, true); }
        if (b !== ticked) { ticked = b; audio.tick(); }
      };
      let asked = false;
      await frames(T.spin, (t) => {
        if (t > 0.55 && !asked) { asked = true; say('てっぺんは どれ…？'); }
        place(g, r0 + (near - r0) * ease.outQuart(t));
        tickFrame();
      });
      say('とまる…？');
      R.cat.innerHTML = catSitting(cat, { look: { x: -0.6, y: -1 } });
      audio.heart();
      await wait(T.pause);
      if (variant === 'extra') {
        say('もう いっしゅう！');
        audio.stamp();
        R.cat.innerHTML = catSitting(cat, { mood: 'happy', look: { x: -1, y: -1 } });
        await frames(T.creep + EXTRA, (t) => { place(g, near + (target + 360 - near) * ease.inOutSine(t)); tickFrame(); });
      } else if (variant === 'back') {
        // いきすぎた… と思ったら、ゆらりと もどる
        say('あれ？ もどる…！');
        R.cat.innerHTML = catSitting(cat, { mood: 'strain', look: { x: -1, y: -1 } });
        await frames(T.creep, (t) => { place(g, near + (target - near) * ease.inOutSine(t)); tickFrame(); });
      } else if (variant === 'again') {
        // 止まっちゃった… アズが もう1回 レバーを ひく
        say('とまっちゃった…？');
        await wait(EXTRA * 0.4);
        say('もう 1かい ガチャン！');
        R.lever.setAttribute('transform', `translate(${f(g.lever.x)} ${f(g.lever.y)}) rotate(-35)`);
        await pull(EXTRA * 0.6);
        audio.stamp();
        R.cat.innerHTML = catSitting(cat, { mood: 'happy', look: { x: -1, y: -1 } });
        await frames(T.creep, (t) => { place(g, near + (target - near) * ease.inOutSine(t)); tickFrame(); });
      } else {
        say('もうちょっと…');
        await frames(T.creep, (t) => { place(g, near + (target - near) * ease.inOutSine(t)); tickFrame(); });
      }
      if (lit >= 0) hintPlate(svg, lit, false);
      // 4. てっぺん！ 花火
      const got = atTop(n, rot); // てっぺんに止まった ゴンドラ
      say('てっぺん！');
      R.gons[got].querySelector('.gon-body').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0deg)' }], { duration: 700 });
      fireworks(g, got);
      R.cat.innerHTML = catSitting(cat, { mood: 'happy', look: { x: -0.6, y: -1 } });
      for (let k = 0; k < 6; k++) setTimeout(() => bulbs(k % 2 === 0, 0), k * 140);
      await wait(T.fire);
      bulbs(true, 0);
      return got;
    },
  });

  // てっぺんの ゴンドラの後ろに 花火を3つ
  function fireworks(g, i) {
    const top = { x: g.cx, y: g.cy - g.R + g.L.hang + g.gh / 2 };
    const spots = [{ x: top.x, y: top.y - g.gh * 0.4, r: g.R * 0.5 }, { x: top.x - g.R * 0.7, y: top.y + g.R * 0.2, r: g.R * 0.36 }, { x: top.x + g.R * 0.72, y: top.y + g.R * 0.1, r: g.R * 0.38 }];
    R.fire.textContent = '';
    // てっぺんの ゴンドラの後ろを 光らせる
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    glow.setAttribute('cx', f(top.x));
    glow.setAttribute('cy', f(top.y));
    glow.setAttribute('rx', f(g.gw * 0.7));
    glow.setAttribute('ry', f(g.gh * 0.7 + 10));
    glow.setAttribute('fill', '#fff1c4');
    glow.setAttribute('stroke', '#ffd36b');
    glow.setAttribute('stroke-width', '4');
    R.fire.appendChild(glow);
    spots.forEach((p, k) => {
      const [col, edge] = TINTS[(i + k * 3) % TINTS.length];
      let rays = '';
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * Math.PI * 2;
        rays += `<path d="M${f(Math.cos(a) * p.r * 0.3)},${f(Math.sin(a) * p.r * 0.3)} L${f(Math.cos(a) * p.r)},${f(Math.sin(a) * p.r)}" stroke="${j % 2 ? col : edge}" stroke-width="4" stroke-linecap="round"/>`
          + `<circle cx="${f(Math.cos(a) * p.r * 1.08)}" cy="${f(Math.sin(a) * p.r * 1.08)}" r="2.6" fill="${edge}"/>`;
      }
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      outer.setAttribute('transform', `translate(${f(p.x)} ${f(p.y)})`);
      outer.innerHTML = `<g>${rays}</g>`;
      R.fire.appendChild(outer);
      outer.firstChild.animate([{ transform: 'scale(0.15)', opacity: 0 }, { transform: 'scale(0.6)', opacity: 1, offset: 0.2 }, { transform: 'scale(1.1)', opacity: 0.9, offset: 0.7 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 1300, delay: k * 200, fill: 'both' });
      setTimeout(() => audio.pop(), k * 200);
    });
  }
}
