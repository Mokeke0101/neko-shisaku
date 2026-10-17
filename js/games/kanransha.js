// ねこの かんらんしゃ（決め方：回って止まる〈ゴンドラ〉。見せ方の部品：番号と色つきの一覧）。
// 選択肢の数だけ ゴンドラが付いた かんらんしゃが まわり、ゆっくり止まる。いちばん下の のりばに来た ゴンドラに
// 猫が のりこむ。そのゴンドラの番号の選択肢が結果になる。
// にくきゅうルーレット（針が止まる）とは、止まる所が「下の のりば」で、猫が のりこむ所が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. かんらんしゃが くるくる まわり、だんだん ゆっくりになる。のりばに来た ゴンドラの札が うすく光る。
// 2. 1つ手前の ゴンドラで止まりそうになり、ひと息 おいて、もう少し進む。
// 3. 止まった ゴンドラへ、猫が ぴょんと のりこむ。
// 結果は先に乱数で決め（RS01-S14）、止まる角度を、決めた ゴンドラが のりばに来る角度にする。
import { C } from '../art.js';
import { catFace } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, hintPlate, TINTS, f } from './common.js';

export const T = { spin: 3600, pause: 420, creep: 900, hop: 560 };
export const kanranshaDuration = () => T.spin + T.pause + T.creep + T.hop + 200;

// ゴンドラ i の、まわり始めの角度（度。0 が右、90 が下）
export const baseAngle = (i, n) => -90 + (360 * i) / n;
// 止まる時の回転（度）：いまの回転 r0 から2回以上まわって、決めた ゴンドラが下（90 度）に来る回転
export function stopAfter(n, decided, r0) {
  const want = 90 - baseAngle(decided, n);
  return want + 360 * Math.ceil((r0 + 720 - want) / 360);
}
// 回転 rot の時、のりば（下）に いちばん近い ゴンドラ
export function atBottom(n, rot) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < n; i++) {
    const a = (((baseAngle(i, n) + rot - 90) % 360) + 540) % 360 - 180;
    if (Math.abs(a) < bd) { bd = Math.abs(a); best = i; }
  }
  return best;
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
  return createGame(deps, {
    play: 'のる',
    resultLabel: 'のったのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const cols = n <= 5 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      const rowH = Math.max(24, Math.min(40, (H * 0.5) / rows));
      const listH = rows * rowH + (rows - 1) * 5 + 16;
      const topH = H - listH - 6;
      const cells = grid(n, { x: 12, y: topH + 8, w: W - 24, h: listH - 16 }, cols, 6);
      let rw = Math.min(W * 0.3, (topH - 16) / 2.4);
      const gw = Math.max(14, Math.min(44, ((2 * Math.PI * rw) / Math.max(n, 6)) * 0.62, rw * 0.42));
      const gh = gw * 1.05;
      rw = Math.max(30, Math.min(W * 0.3, (topH - 10 - gh * 1.3) / 2));
      const cx = W * 0.46;
      const cy = 4 + gh * 0.55 + rw;
      Object.assign(g, { cells, rw, gw, gh, cx, cy, topH });
      const ground = Math.min(topH - 2, cy + rw + gh * 0.75);
      let s = `<path d="M${f(cx)},${f(cy)} L${f(cx - rw * 0.62)},${f(ground)} M${f(cx)},${f(cy)} L${f(cx + rw * 0.62)},${f(ground)}" stroke="#c99a62" stroke-width="${f(Math.max(4, rw * 0.07))}" stroke-linecap="round"/>`
        + `<rect x="${f(cx - gw * 1.2)}" y="${f(ground - 6)}" width="${f(gw * 2.4)}" height="8" rx="3" fill="#e3bb84" stroke="#b98a52" stroke-width="1.6"/>`;
      // 輪と柱（輪ごと回す）
      let wheel = `<circle r="${f(rw)}" fill="none" stroke="#f7a6a0" stroke-width="${f(Math.max(3, rw * 0.05))}"/><circle r="${f(rw * 0.86)}" fill="none" stroke="#fde3a6" stroke-width="2"/>`;
      for (let i = 0; i < Math.max(n, 8); i++) {
        const a = (i / Math.max(n, 8)) * Math.PI * 2;
        wheel += `<path d="M0,0 L${f(Math.cos(a) * rw)},${f(Math.sin(a) * rw)}" stroke="#f1d3a6" stroke-width="2"/>`;
      }
      wheel += `<circle r="${f(rw * 0.12)}" fill="#fffaf0" stroke="#d97f7a" stroke-width="3"/>`;
      s += `<g class="wheel">${wheel}</g>`;
      // ゴンドラ（つり下がって、いつも上を向く）
      for (let i = 0; i < n; i++) {
        const [col, edge] = TINTS[i % TINTS.length];
        s += `<g class="gon" data-i="${i}"><path d="M0,0 V${f(gh * 0.2)}" stroke="#9b5f3a" stroke-width="2"/>`
          + `<g class="gon-body"><rect x="${f(-gw / 2)}" y="${f(gh * 0.18)}" width="${f(gw)}" height="${f(gh)}" rx="${f(gw * 0.3)}" fill="${col}" stroke="${edge}" stroke-width="2"/>`
          + `<rect x="${f(-gw * 0.34)}" y="${f(gh * 0.3)}" width="${f(gw * 0.68)}" height="${f(gh * 0.48)}" rx="${f(gw * 0.14)}" fill="#fffaf0"/>`
          + `<text y="${f(gh * 0.55)}" font-size="${f(gh * 0.4)}" font-weight="700" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`
          + `<g class="rider"></g></g></g>`;
      }
      // のりばで まつ猫
      const fs = Math.max(0.16, Math.min(0.4, gh / 70));
      g.wait = { x: Math.min(W - 50 * fs - 2, cx + rw + gw * 0.2 + 30 * fs), y: ground - 44 * fs };
      g.fs = fs;
      s += `<g class="kr-cat" transform="translate(${f(g.wait.x)} ${f(g.wait.y)}) scale(${f(fs)})">${catFace(g.cat, { look: { x: -1, y: -0.6 } })}</g>`;
      // 一覧
      s += `<rect x="6" y="${f(topH + 2)}" width="${W - 12}" height="${f(listH)}" rx="16" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="3"/>`;
      cells.forEach((c, i) => { s += plate(i, c.x, c.y, c.w, c.h, choices[i], { badge: i + 1, tint: TINTS[i % TINTS.length] }).svg; });
      return s;
    },
    after(g) {
      R.wheel = g.svg.querySelector('.wheel');
      R.gons = Array.from(g.svg.querySelectorAll('.gon'));
      R.cat = g.svg.querySelector('.kr-cat');
      place(g, Math.random() * 360);
    },
    async perform(g, decided, say) {
      const { svg, n } = g;
      const r0 = rot;
      const step = 360 / n;
      const target = stopAfter(n, decided, r0);
      const near = target - step * 0.55; // 1つ手前で止まりそうになる所
      say('まわる まわる…');
      let lit = -1;
      let ticked = atBottom(n, r0);
      const mark = () => {
        const b = atBottom(n, rot);
        if (b !== lit) { if (lit >= 0) hintPlate(svg, lit, false); lit = b; hintPlate(svg, b, true); }
        if (b !== ticked) { ticked = b; audio.tick(); }
      };
      await frames(T.spin, (t) => { place(g, r0 + (near - r0) * ease.outQuart(t)); mark(); });
      say('とまる…？');
      audio.heart();
      await wait(T.pause);
      say('もうちょっと…');
      await frames(T.creep, (t) => { place(g, near + (target - near) * ease.inOutSine(t)); mark(); });
      if (lit >= 0) hintPlate(svg, lit, false);
      // のりこむ
      const got = atBottom(n, rot); // のりばに止まった ゴンドラ
      const gon = R.gons[got];
      const a = ((baseAngle(got, n) + rot) * Math.PI) / 180;
      const to = { x: g.cx + Math.cos(a) * g.rw, y: g.cy + Math.sin(a) * g.rw + g.gh * 0.6 };
      say('のりこむよ');
      audio.hop(1);
      const from = { ...g.wait };
      await frames(T.hop, (t) => {
        const e = ease.inOutSine(t);
        const k = g.fs * (1 - 0.45 * e);
        R.cat.setAttribute('transform', `translate(${f(from.x + (to.x - from.x) * e)} ${f(from.y + (to.y - from.y) * e - Math.sin(Math.PI * t) * 30)}) scale(${f(k)})`);
      });
      R.cat.setAttribute('opacity', '0');
      gon.querySelector('.rider').innerHTML = `<g transform="translate(0 ${f(g.gh * 0.58)}) scale(${f(g.gw / 150)})">${catFace(g.cat, { mood: 'happy' })}</g>`;
      gon.querySelector('.gon-body').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0deg)' }], { duration: 600 });
      audio.pop();
      return got;
    },
  });
}
