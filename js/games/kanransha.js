// ねこの かんらんしゃ（決め方：回って止まる〈ゴンドラ〉。見せ方の部品：番号と色つきの一覧）。
// 選択肢の数だけ ゴンドラが付いた かんらんしゃ。係の アズが レバーを ひくと、電球が ともって ぐるぐる まわる。
// まわる速さに合わせて、空の雲・鳥・風船が ながれていく。だんだん ゆっくりになって止まり、
// 「てっぺん」に止まった ゴンドラの後ろに 花火が上がる。そのゴンドラの番号の選択肢が結果になる。
// にくきゅうルーレット（針が止まる）とは、止まる所が「てっぺん」で、景色が ながれ、花火で知らせる所が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. アズが レバーを ガチャンと ひく。電球が ともる。
// 2. かんらんしゃが ぐるぐる まわり、雲や鳥が びゅーんと ながれる。だんだん ゆっくりに。てっぺんの ゴンドラの札が うすく光る。
// 3. 1つ手前で止まりそうになり、ひと息 おいて、もう少し進む。
// 4. てっぺんの ゴンドラが ゆれて、花火が ぱーんと上がる。
// 結果は先に乱数で決め（RS01-S14）、止まる角度を、決めた ゴンドラが てっぺんに来る角度にする。
import { C, cloud } from '../art.js';
import { catSitting, catName } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, hintPlate, TINTS, f } from './common.js';

export const T = { lever: 520, spin: 3700, pause: 420, creep: 900, fire: 900 };
// ときどき出る別の動き（v12）：止まりそうな所から「もう いっしゅう！」と もう1回 まわる
export const EXTRA = 900;
export const kanranshaDuration = (extra = false) => T.lever + T.spin + T.pause + T.creep + T.fire + 100 + (extra ? EXTRA : 0);

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

// 空を ながれる物（雲・鳥・風船）。k は種類、x・y は はじめの場所、depth は 遠さ（大きいほど ゆっくり）
const FLOATERS = [
  { k: 'cloud', x: 0.12, y: 0.12, s: 1, depth: 1.6 }, { k: 'cloud', x: 0.7, y: 0.3, s: 0.8, depth: 2.2 },
  { k: 'cloud', x: 0.4, y: 0.55, s: 0.65, depth: 2.8 }, { k: 'bird', x: 0.85, y: 0.18, s: 1, depth: 1 },
  { k: 'bird', x: 0.25, y: 0.38, s: 0.8, depth: 1.2 }, { k: 'balloon', x: 0.08, y: 0.62, s: 1, depth: 1.4 },
  { k: 'balloon', x: 0.93, y: 0.5, s: 0.85, depth: 1.8 },
];
function floater(k, s, i) {
  if (k === 'cloud') return cloud(70 * s);
  if (k === 'bird') return `<path d="M${f(-9 * s)},0 q${f(4.5 * s)},${f(-6 * s)} ${f(9 * s)},0 q${f(4.5 * s)},${f(-6 * s)} ${f(9 * s)},0" stroke="#8b7d78" stroke-width="2" fill="none" stroke-linecap="round" transform="translate(${f(-4.5 * s)} 0)"/>`;
  const [col, edge] = TINTS[(i * 5) % TINTS.length];
  return `<path d="M0,${f(12 * s)} q${f(-4 * s)},${f(10 * s)} 0,${f(20 * s)}" stroke="#b9a48a" stroke-width="1.4" fill="none"/>`
    + `<ellipse rx="${f(9 * s)}" ry="${f(11 * s)}" fill="${col}" stroke="${edge}" stroke-width="2"/><ellipse cx="${f(-3 * s)}" cy="${f(-4 * s)}" rx="${f(2.2 * s)}" ry="${f(3.2 * s)}" fill="#ffffff" opacity="0.7"/>`;
}

export function createKanransha(deps) {
  const R = {};
  let rot = 0;
  const place = (g, r) => {
    rot = r;
    R.wheel.setAttribute('transform', `translate(${f(g.cx)} ${f(g.cy)}) rotate(${f(r)})`);
    R.gons.forEach((el, i) => {
      const a = ((baseAngle(i, g.n) + r) * Math.PI) / 180;
      el.setAttribute('transform', `translate(${f(g.cx + Math.cos(a) * g.rw)} ${f(g.cy + Math.sin(a) * g.rw)})`);
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
      const cols = n <= 5 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      const rowH = Math.max(24, Math.min(40, (H * 0.5) / rows));
      const listH = rows * rowH + (rows - 1) * 5 + 16;
      const topH = H - listH - 6;
      const cells = grid(n, { x: 12, y: topH + 8, w: W - 24, h: listH - 16 }, cols, 6);
      const mark = 40; // てっぺんの しるしの場所
      let rw = Math.min(W * 0.33, (topH - mark - 16) / 2.4);
      const gw = Math.max(14, Math.min(44, ((2 * Math.PI * rw) / Math.max(n, 6)) * 0.62, rw * 0.42));
      const gh = gw * 1.05;
      rw = Math.max(30, Math.min(W * 0.33, (topH - mark - 8 - gh * 1.3) / 2));
      const cx = W * 0.42;
      const cy = mark + rw;
      const skyH = topH - 10;
      Object.assign(g, { cells, rw, gw, gh, cx, cy, topH, skyH });
      g.fx = FLOATERS.map((fl) => fl.x * W);
      g.fy = FLOATERS.map((fl) => fl.y * skyH);
      const ground = Math.min(topH - 2, cy + rw + gh * 1.3);
      // 空を ながれる物（かんらんしゃの後ろ）
      let s = '<g class="kr-sky">';
      FLOATERS.forEach((fl, k) => { s += `<g class="kr-float" transform="translate(${f(g.fx[k])} ${f(g.fy[k])})">${floater(fl.k, fl.s, k)}</g>`; });
      s += '</g><g class="kr-fire"></g>';
      s += `<path d="M${f(cx)},${f(cy)} L${f(cx - rw * 0.62)},${f(ground)} M${f(cx)},${f(cy)} L${f(cx + rw * 0.62)},${f(ground)}" stroke="#c99a62" stroke-width="${f(Math.max(4, rw * 0.07))}" stroke-linecap="round"/>`
        + `<rect x="${f(cx - gw * 1.2)}" y="${f(ground - 6)}" width="${f(gw * 2.4)}" height="8" rx="3" fill="#e3bb84" stroke="#b98a52" stroke-width="1.6"/>`;
      // 輪と柱（輪ごと回す）。ふちに 電球
      let wheel = `<circle r="${f(rw)}" fill="none" stroke="#f7a6a0" stroke-width="${f(Math.max(3, rw * 0.05))}"/><circle r="${f(rw * 0.86)}" fill="none" stroke="#fde3a6" stroke-width="2"/>`;
      for (let i = 0; i < Math.max(n, 8); i++) {
        const a = (i / Math.max(n, 8)) * Math.PI * 2;
        wheel += `<path d="M0,0 L${f(Math.cos(a) * rw)},${f(Math.sin(a) * rw)}" stroke="#f1d3a6" stroke-width="2"/>`;
      }
      const nb = 18;
      for (let i = 0; i < nb; i++) {
        const a = ((i + 0.5) / nb) * Math.PI * 2;
        wheel += `<circle class="bulb" cx="${f(Math.cos(a) * rw * 0.93)}" cy="${f(Math.sin(a) * rw * 0.93)}" r="${f(Math.max(2.2, rw * 0.035))}" fill="#fffaf0" stroke="#e3bb84" stroke-width="1"/>`;
      }
      wheel += `<circle r="${f(rw * 0.12)}" fill="#fffaf0" stroke="#d97f7a" stroke-width="3"/>`;
      s += `<g class="wheel">${wheel}</g>`;
      // ゴンドラ（つり下がって、いつも上を向く）
      for (let i = 0; i < n; i++) {
        const [col, edge] = TINTS[i % TINTS.length];
        s += `<g class="gon" data-i="${i}"><path d="M0,0 V${f(gh * 0.2)}" stroke="#9b5f3a" stroke-width="2"/>`
          + `<g class="gon-body"><rect x="${f(-gw / 2)}" y="${f(gh * 0.18)}" width="${f(gw)}" height="${f(gh)}" rx="${f(gw * 0.3)}" fill="${col}" stroke="${edge}" stroke-width="2"/>`
          + `<rect x="${f(-gw * 0.34)}" y="${f(gh * 0.3)}" width="${f(gw * 0.68)}" height="${f(gh * 0.48)}" rx="${f(gw * 0.14)}" fill="#fffaf0"/>`
          + `<text y="${f(gh * 0.55)}" font-size="${f(gh * 0.4)}" font-weight="700" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${i + 1}</text></g></g>`;
      }
      // てっぺんの しるし（星と、下向きの三角）
      s += `<rect x="${f(cx - 17)}" y="${f(mark * 0.62 - 12)}" width="84" height="24" rx="12" fill="#fffaf0" stroke="#e2bd87" stroke-width="2"/>`
        + `<g transform="translate(${f(cx)} ${f(mark * 0.62)})"><path d="M0,-9 L2.6,-3 L9,-2.6 L4,1.6 L5.6,8 L0,4.6 L-5.6,8 L-4,1.6 L-9,-2.6 L-2.6,-3 Z" fill="#fde3a6" stroke="#d9b04d" stroke-width="1.6" stroke-linejoin="round"/></g>`
        + `<text x="${f(cx + 13)}" y="${f(mark * 0.62 + 0.5)}" font-size="13" font-weight="700" fill="#c8615c" dominant-baseline="central">てっぺん</text>`;
      // 係の アズと レバー（右下）
      const cs = Math.max(0.26, Math.min(0.5, rw / 190));
      const catX = Math.min(W - 50 * cs - 4, cx + rw + gw * 0.5 + 60 * cs);
      const catY = ground - 76 * cs;
      const box = { x: catX - 70 * cs - 18, y: ground - 30 * cs - 14, w: 26, h: 30 * cs + 14 };
      g.lever = { x: box.x + box.w / 2, y: box.y + 4, len: 30 * cs + 10 };
      s += `<rect x="${f(box.x)}" y="${f(box.y)}" width="${f(box.w)}" height="${f(box.h)}" rx="5" fill="#cfe0ea" stroke="#7aa7c4" stroke-width="2"/>`
        + `<g class="kr-lever" transform="translate(${f(g.lever.x)} ${f(g.lever.y)}) rotate(-35)"><path d="M0,0 V${f(-g.lever.len)}" stroke="#8c6e5a" stroke-width="3" stroke-linecap="round"/><circle cy="${f(-g.lever.len)}" r="5" fill="#f7a6a0" stroke="#d97f7a" stroke-width="1.6"/></g>`
        + `<g transform="translate(${f(catX)} ${f(catY)}) scale(${f(cs)})"><g class="kr-cat">${catSitting(cat, { look: { x: -1, y: -0.6 } })}</g></g>`;
      // 一覧
      s += `<rect x="6" y="${f(topH + 2)}" width="${W - 12}" height="${f(listH)}" rx="16" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="3"/>`;
      cells.forEach((c, i) => { s += plate(i, c.x, c.y, c.w, c.h, choices[i], { badge: i + 1, tint: TINTS[i % TINTS.length] }).svg; });
      return s;
    },
    after(g) {
      R.wheel = g.svg.querySelector('.wheel');
      R.gons = Array.from(g.svg.querySelectorAll('.gon'));
      R.cat = g.svg.querySelector('.kr-cat');
      R.lever = g.svg.querySelector('.kr-lever');
      R.floats = Array.from(g.svg.querySelectorAll('.kr-float'));
      R.bulbs = Array.from(g.svg.querySelectorAll('.bulb'));
      R.fire = g.svg.querySelector('.kr-fire');
      place(g, Math.random() * 360);
    },
    async perform(g, decided, say) {
      const { svg, n, cat } = g;
      // 1. アズが レバーを ひく
      say(`${catName(cat)}が レバーを ひくよ`);
      await frames(T.lever, (t) => {
        const e = ease.outBack(Math.min(1, t * 1.6));
        R.lever.setAttribute('transform', `translate(${f(g.lever.x)} ${f(g.lever.y)}) rotate(${f(-35 + 70 * e)})`);
      });
      audio.stamp();
      R.cat.innerHTML = catSitting(cat, { mood: 'happy', look: { x: -1, y: -1 } });
      // 2. まわる（景色が ながれる）
      const r0 = rot;
      const step = 360 / n;
      const target = stopAfter(n, decided, r0);
      const near = target - step * 0.55; // 1つ手前で止まりそうになる所
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
      delete g.stage.dataset.variant;
      if (Math.random() < 0.3) {
        g.stage.dataset.variant = 'extra';
        say('もう いっしゅう！');
        audio.stamp();
        R.cat.innerHTML = catSitting(cat, { mood: 'happy', look: { x: -1, y: -1 } });
        await frames(T.creep + EXTRA, (t) => { place(g, near + (target + 360 - near) * ease.inOutSine(t)); tickFrame(); });
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
    const top = { x: g.cx, y: g.cy - g.rw + g.gh * 0.6 };
    const spots = [{ x: top.x, y: top.y - g.gh * 0.2, r: g.rw * 0.55 }, { x: top.x - g.rw * 0.7, y: top.y + g.rw * 0.15, r: g.rw * 0.4 }, { x: top.x + g.rw * 0.75, y: top.y + g.rw * 0.05, r: g.rw * 0.42 }];
    R.fire.textContent = '';
    // てっぺんの ゴンドラの後ろを 光らせる
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', f(top.x));
    glow.setAttribute('cy', f(top.y));
    glow.setAttribute('r', f(g.gw * 0.95));
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
