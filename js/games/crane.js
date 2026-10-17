// ねこの クレーンゲーム（決め方：つかんで取る。見せ方の部品：ぬいぐるみと名前の札）。
// ガラスの箱の中に、選択肢ごとの ぬいぐるみが並ぶ。アームが右へ左へ まよってから、1つの ぬいぐるみの上で下りてつかみ、
// とりだし口まで運んで落とす。アームが つかんだ ぬいぐるみの札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. アームが3〜4か所で止まり、ちょっと下がって「ここかな？」と まよう。
// 2. 下りて つかむ。持ち上げる途中で ぬいぐるみが ゆれて、落ちそうになる。
// 3. とりだし口まで運んで、ぽとん。
// 結果は先に乱数で決め（RS01-S14）、アームの止まる所を、決めた ぬいぐるみで終わるように組む。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, nearest, wander, TINTS, f } from './common.js';

// アームが止まる ぬいぐるみの並び（最後が決めた ぬいぐるみ）
export function cranePlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 3 : 3 + Math.floor(rand() * 2), decided, rand);
}
export const T = { move: 460, peek: 320, down: 700, grab: 300, up: 760, wobble: 520, carry: 700, drop: 480 };
export function craneDuration(stops) {
  return (stops - 1) * (T.move + T.peek) + T.move + T.down + T.grab + T.up + T.wobble + T.carry + T.drop;
}

// ぬいぐるみ（中心 0,0・大きさ s）。ねこ・ねずみ・さかな を順に
export function plush(k, [col, edge], s) {
  const e = `stroke="${edge}" stroke-width="${f(Math.max(1.4, s * 0.06))}" stroke-linejoin="round"`;
  const eye = (x, y) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.05)}" fill="#4a3a33"/>`;
  if (k % 3 === 0) {
    return `<path d="M${f(-s * 0.44)},${f(-s * 0.08)} L${f(-s * 0.36)},${f(-s * 0.5)} L${f(-s * 0.08)},${f(-s * 0.32)} Z M${f(s * 0.44)},${f(-s * 0.08)} L${f(s * 0.36)},${f(-s * 0.5)} L${f(s * 0.08)},${f(-s * 0.32)} Z" fill="${col}" ${e}/>`
      + `<ellipse rx="${f(s * 0.5)}" ry="${f(s * 0.4)}" fill="${col}" ${e}/>` + eye(-0.18, -0.04) + eye(0.18, -0.04)
      + `<path d="M${f(-s * 0.05)},${f(s * 0.08)} h${f(s * 0.1)} l${f(-s * 0.05)},${f(s * 0.05)} Z" fill="#ec8a80"/>`
      + `<ellipse cx="${f(-s * 0.3)}" cy="${f(s * 0.12)}" rx="${f(s * 0.08)}" ry="${f(s * 0.05)}" fill="#f59a8a" opacity="0.6"/><ellipse cx="${f(s * 0.3)}" cy="${f(s * 0.12)}" rx="${f(s * 0.08)}" ry="${f(s * 0.05)}" fill="#f59a8a" opacity="0.6"/>`;
  }
  if (k % 3 === 1) {
    return `<circle cx="${f(-s * 0.3)}" cy="${f(-s * 0.3)}" r="${f(s * 0.18)}" fill="${col}" ${e}/><circle cx="${f(s * 0.3)}" cy="${f(-s * 0.3)}" r="${f(s * 0.18)}" fill="${col}" ${e}/>`
      + `<ellipse rx="${f(s * 0.46)}" ry="${f(s * 0.38)}" fill="${col}" ${e}/>` + eye(-0.15, -0.04) + eye(0.15, -0.04)
      + `<circle cx="0" cy="${f(s * 0.1)}" r="${f(s * 0.06)}" fill="#f19bb0"/>`;
  }
  return `<path d="M${f(s * 0.36)},0 L${f(s * 0.58)},${f(-s * 0.22)} L${f(s * 0.58)},${f(s * 0.22)} Z" fill="${col}" ${e}/>`
    + `<ellipse rx="${f(s * 0.44)}" ry="${f(s * 0.3)}" fill="${col}" ${e}/>` + eye(-0.24, -0.04)
    + `<path d="M${f(-s * 0.02)},${f(-s * 0.2)} q${f(s * 0.1)},${f(s * 0.2)} 0,${f(s * 0.4)}" stroke="${edge}" stroke-width="${f(s * 0.04)}" fill="none" opacity="0.7"/>`;
}

// アーム（つり下げ口 0,0 から下へ）。open は 0（とじる）〜1（ひらく）
function claw(k, open) {
  const a = 8 + open * 26;
  const arm = (sgn) => `<g transform="rotate(${f(sgn * a)})"><path d="M0,0 C${f(sgn * 4 * k)},${f(10 * k)} ${f(sgn * 10 * k)},${f(16 * k)} ${f(sgn * 4 * k)},${f(26 * k)}" stroke="#8c6e5a" stroke-width="${f(4.6 * k)}" fill="none" stroke-linecap="round"/><path d="M0,0 C${f(sgn * 4 * k)},${f(10 * k)} ${f(sgn * 10 * k)},${f(16 * k)} ${f(sgn * 4 * k)},${f(26 * k)}" stroke="#d9dde2" stroke-width="${f(2.4 * k)}" fill="none" stroke-linecap="round"/></g>`;
  return arm(-1) + arm(1) + `<rect x="${f(-9 * k)}" y="${f(-8 * k)}" width="${f(18 * k)}" height="${f(11 * k)}" rx="${f(4 * k)}" fill="#f7c4b4" stroke="#d98a7a" stroke-width="2"/>`;
}

export function createCrane(deps) {
  const R = {};
  const setClaw = (g, x, y, open) => {
    R.cable.setAttribute('d', `M${f(x)},${f(g.railY)} V${f(y - 6 * g.k)}`);
    R.cart.setAttribute('transform', `translate(${f(x)} ${f(g.railY)})`);
    R.claw.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
    R.claw.innerHTML = claw(g.k, open);
    g.at = { x, y, open };
  };
  const moveClaw = async (g, x, y, dur, open = g.at.open, carry = null) => {
    const a = { ...g.at };
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      const cx = a.x + (x - a.x) * e;
      const cy = a.y + (y - a.y) * e;
      setClaw(g, cx, cy, a.open + (open - a.open) * e);
      if (carry) carry.setAttribute('transform', `translate(${f(cx)} ${f(cy + g.toyDrop)})`);
    });
  };
  return createGame(deps, {
    play: 'つかむ',
    resultLabel: 'つかまえた！',
    draw(g) {
      const { n, W, H, choices } = g;
      const topH = Math.max(70, Math.min(120, H * 0.24));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 10, y: topH + 4, w: W - 20, h: H - topH - 12 }, cols, 8);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.36));
      const toyS = Math.max(18, Math.min(70, cells[0].w * 0.5, cells[0].h - plateH - 6));
      const toys = cells.map((c) => ({ cx: c.cx, cy: c.y + (c.h - plateH) / 2 }));
      Object.assign(g, { topH, cells, toys, toyS, railY: 12, k: Math.max(0.7, Math.min(1.25, toyS / 40)), chute: { x: 14, y: topH - 40, w: 54, h: 36 } });
      g.restY = g.railY + 28;
      g.toyDrop = 22 * g.k + toyS * 0.32; // つかんだ時の、アームの口から ぬいぐるみの中心まで
      let s = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="18" fill="#eaf6fb" fill-opacity="0.72" stroke="#9fc8cf" stroke-width="3"/>`
        + `<path d="M${W - 30},16 l-26,40 M${W - 18},22 l-18,28" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`
        + `<rect x="8" y="${f(topH)}" width="${W - 16}" height="${f(H - topH - 8)}" rx="12" fill="#fff6ea" fill-opacity="0.75"/>`
        + `<path d="M8,${g.railY} H${W - 8}" stroke="#c99a62" stroke-width="5" stroke-linecap="round"/>`
        + `<rect x="${g.chute.x}" y="${f(g.chute.y)}" width="${g.chute.w}" height="${g.chute.h}" rx="8" fill="#f3d9b0" stroke="#c99a62" stroke-width="2.4"/>`
        + `<rect x="${g.chute.x + 7}" y="${f(g.chute.y + 7)}" width="${g.chute.w - 14}" height="${g.chute.h - 14}" rx="5" fill="#a0703f" opacity="0.4"/>`;
      // 操作する猫（右上）
      const fs = Math.max(0.24, Math.min(0.42, (topH - 30) / 120));
      s += `<g transform="translate(${W - 34} ${f(topH * 0.58)}) scale(${f(fs)})"><g class="cr-face">${catFace(g.cat, { look: { x: -1, y: 0.4 } })}</g></g>`
        + `<g transform="translate(${W - 60} ${f(topH * 0.58 + 40 * fs)})">${catPaw(g.cat, 9)}</g>`;
      cells.forEach((c, i) => {
        s += plate(i, c.x, c.y + c.h - plateH, c.w, plateH, choices[i]).svg;
        s += `<g class="toy" data-i="${i}" transform="translate(${f(toys[i].cx)} ${f(toys[i].cy)})"><g class="toy-in">${plush(i, TINTS[i % TINTS.length], toyS)}</g></g>`;
      });
      s += `<path class="cable" stroke="#8c6e5a" stroke-width="2.4" fill="none"/>`
        + `<g class="cart"><rect x="-14" y="-8" width="28" height="14" rx="5" fill="#cfe0ea" stroke="#7aa7c4" stroke-width="2"/></g>`
        + `<g class="claw"></g>`;
      return s;
    },
    after(g) {
      R.cable = g.svg.querySelector('.cable');
      R.cart = g.svg.querySelector('.cart');
      R.claw = g.svg.querySelector('.claw');
      R.face = g.svg.querySelector('.cr-face');
      R.toys = Array.from(g.svg.querySelectorAll('.toy'));
      setClaw(g, g.chute.x + g.chute.w / 2, g.restY, 0.2);
    },
    async perform(g, decided, say) {
      const plan = cranePlan(g.n, decided);
      say('どれに しようかな…');
      // 1. まよいながら、ぬいぐるみの上を うつる
      for (let k = 0; k < plan.length; k++) {
        const t = g.toys[plan[k]];
        audio.slide(T.move / 1000);
        await moveClaw(g, t.cx, g.restY, T.move, 0.2);
        if (k === plan.length - 1) break;
        audio.tick();
        await moveClaw(g, t.cx, g.restY + 14, T.peek / 2, 0.5);
        await moveClaw(g, t.cx, g.restY, T.peek / 2, 0.2);
      }
      // 2. 下りて つかむ
      say('ここだ！');
      const t = g.toys[decided];
      await moveClaw(g, t.cx, g.restY, 200, 1);
      audio.stretch(T.down / 1000);
      await moveClaw(g, t.cx, t.cy - g.toyDrop, T.down, 1);
      await moveClaw(g, t.cx, t.cy - g.toyDrop, T.grab, 0);
      audio.pop();
      const got = nearest(g.toys, g.at.x, g.at.y + g.toyDrop); // アームが つかんだ ぬいぐるみ
      const toy = R.toys[got];
      g.svg.insertBefore(toy, R.cable); // ほかの ぬいぐるみより前、アームより後ろに出す
      say('つかんだ…？');
      await moveClaw(g, t.cx, g.restY + 20, T.up, 0, toy);
      // 落ちそうに ゆれる
      say('おっとっと…');
      R.face.innerHTML = catFace(g.cat, { mood: 'strain', look: { x: -1, y: 0.4 } });
      const inner = toy.querySelector('.toy-in');
      audio.heart();
      await frames(T.wobble, (p) => inner.setAttribute('transform', `rotate(${f(Math.sin(p * Math.PI * 4) * 18 * (1 - p))})`));
      inner.removeAttribute('transform');
      // 3. とりだし口へ運んで、ぽとん
      say('はこんで…');
      await moveClaw(g, g.chute.x + g.chute.w / 2, g.restY + 20, T.carry, 0, toy);
      await moveClaw(g, g.chute.x + g.chute.w / 2, g.restY + 20, 160, 1);
      const y0 = g.restY + 20 + g.toyDrop;
      const x0 = g.chute.x + g.chute.w / 2;
      audio.hop(3);
      await frames(T.drop, (p) => {
        toy.setAttribute('transform', `translate(${f(x0)} ${f(y0 + (g.chute.y + g.chute.h / 2 - y0) * p * p)}) scale(${f(1 - 0.4 * p)})`);
        toy.setAttribute('opacity', f(1 - p * 0.6));
      });
      R.face.innerHTML = catFace(g.cat, { mood: 'happy', look: { x: -1, y: 0.4 } });
      return got;
    },
  });
}
