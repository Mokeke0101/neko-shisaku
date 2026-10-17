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
export const T = { move: 460, peek: 360, open: 380, down: 700, grab: 560, up: 760, wobble: 520, carry: 700, release: 340, drop: 480 };
// ときどき出る別の動き（v12）：持ち上げた ぬいぐるみが つるっと すべって落ち、もう一度 つかみ直す（まよう回数が3回の時だけ）
export const SLIP = T.up * 0.5 + 260 + T.down * 0.5 + T.grab;
export const slipOk = (stops) => stops <= 3;
export function craneDuration(stops, slip = false) {
  return (slip && slipOk(stops) ? SLIP : 0) + (stops - 1) * (T.move + T.peek) + T.move + T.open + T.down + T.grab + T.up + T.wobble + T.carry + T.release + T.drop;
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

// アーム（つり下げ口 0,0 から下へ。長さ L）。open は 0（とじる）〜1（ひらく）。
// 左右の つめは、ちょうつがい（±0.12L, 0.08L）を中心に まわる。とじると、つめの先が内側へ曲がって ぬいぐるみを はさむ
export const clawAngle = (open) => -6 + open * 46; // つめを外へ ひらく角度（度）
function claw(L, open) {
  const a = clawAngle(open);
  const w = Math.max(3.2, L * 0.1);
  const arm = (sgn) => {
    const px = sgn * L * 0.12;
    const d = `M0,0 C${f(sgn * L * 0.2)},${f(L * 0.16)} ${f(sgn * L * 0.34)},${f(L * 0.36)} ${f(sgn * L * 0.3)},${f(L * 0.62)} C${f(sgn * L * 0.27)},${f(L * 0.8)} ${f(sgn * L * 0.16)},${f(L * 0.86)} ${f(sgn * L * 0.04)},${f(L * 0.84)}`;
    return `<g transform="translate(${f(px)} ${f(L * 0.08)}) rotate(${f(-sgn * a)})">`
      + `<path d="${d}" stroke="#7d6656" stroke-width="${f(w + 2.4)}" fill="none" stroke-linecap="round"/>`
      + `<path d="${d}" stroke="#d9dde2" stroke-width="${f(w)}" fill="none" stroke-linecap="round"/>`
      + `<circle cx="${f(sgn * L * 0.04)}" cy="${f(L * 0.84)}" r="${f(w * 0.75)}" fill="#f7c4b4" stroke="#7d6656" stroke-width="1.6"/>`
      + `<circle r="${f(w * 0.55)}" fill="#fffaf0" stroke="#7d6656" stroke-width="1.6"/></g>`;
  };
  return arm(-1) + arm(1)
    + `<rect x="${f(-L * 0.26)}" y="${f(-L * 0.14)}" width="${f(L * 0.52)}" height="${f(L * 0.26)}" rx="${f(L * 0.09)}" fill="#f7c4b4" stroke="#d98a7a" stroke-width="2"/>`
    + `<circle cy="${f(-L * 0.01)}" r="${f(L * 0.05)}" fill="#fffaf0" opacity="0.9"/>`;
}

export function createCrane(deps) {
  const R = {};
  const setClaw = (g, x, y, open) => {
    R.cable.setAttribute('d', `M${f(x)},${f(g.railY)} V${f(y - g.L * 0.12)}`);
    R.cart.setAttribute('transform', `translate(${f(x)} ${f(g.railY)})`);
    R.claw.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
    R.claw.innerHTML = claw(g.L, open);
    if (g.at && R.joy) {
      const tilt = Math.max(-28, Math.min(28, (x - g.at.x) * 6));
      R.joy.setAttribute('transform', `translate(${f(g.joy.x)} ${f(g.joy.y - 4)}) rotate(${f(tilt)})`);
      const a = (tilt * Math.PI) / 180;
      R.paw.setAttribute('transform', `translate(${f(g.joy.x + 4 + Math.sin(a) * g.joy.len)} ${f(g.joy.y - 4 - Math.cos(a) * g.joy.len)})`);
    }
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
      const cells = grid(n, { x: 8, y: topH + 4, w: W - 16, h: H - topH - 12 }, cols, 6);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.36));
      const toyS = Math.max(18, Math.min(70, cells[0].w * 0.5, cells[0].h - plateH - 6));
      const toys = cells.map((c) => ({ cx: c.cx, cy: c.y + (c.h - plateH) / 2 }));
      Object.assign(g, { topH, cells, toys, toyS, railY: 12, L: Math.max(26, Math.min(64, toyS * 0.95)), chute: { x: 14, y: topH - 40, w: 54, h: 36 } });
      g.restY = g.railY + 10 + g.L * 0.14;
      g.toyDrop = g.L * 0.5; // つかんだ時の、アームの口から ぬいぐるみの中心まで（つめの先が ぬいぐるみの下を はさむ）
      let s = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="18" fill="#eaf6fb" fill-opacity="0.72" stroke="#9fc8cf" stroke-width="3"/>`
        + `<path d="M${W - 30},16 l-26,40 M${W - 18},22 l-18,28" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`
        + `<rect x="8" y="${f(topH)}" width="${W - 16}" height="${f(H - topH - 8)}" rx="12" fill="#fff6ea" fill-opacity="0.75"/>`
        + `<path d="M8,${g.railY} H${W - 8}" stroke="#c99a62" stroke-width="5" stroke-linecap="round"/>`
        + `<rect x="${g.chute.x}" y="${f(g.chute.y)}" width="${g.chute.w}" height="${g.chute.h}" rx="8" fill="#f3d9b0" stroke="#c99a62" stroke-width="2.4"/>`
        + `<rect x="${g.chute.x + 7}" y="${f(g.chute.y + 7)}" width="${g.chute.w - 14}" height="${g.chute.h - 14}" rx="5" fill="#a0703f" opacity="0.4"/>`;
      // レールの電球（ゲームの きかいらしく）
      for (let k = 0; k < 9; k++) s += `<circle class="cr-bulb" cx="${f(24 + (k * (W - 48)) / 8)}" cy="${g.railY + 7}" r="3.2" fill="#fff1c4" stroke="#e3bb84" stroke-width="1"/>`;
      // 操作する アズ（右上）と、レバー・ボタン
      const fs = Math.max(0.3, Math.min(0.56, (topH - 22) / 100));
      const fx = W - 44 * fs - 8;
      const fy = topH - 40 * fs - 6;
      const jx = fx - 62 * fs - 14;
      const jy = topH - 8;
      g.joy = { x: jx, y: jy, len: Math.max(16, 34 * fs) };
      s += `<rect x="${f(jx - 16)}" y="${f(jy - 8)}" width="${f(W - jx + 4)}" height="12" rx="5" fill="#f7c4b4" stroke="#d98a7a" stroke-width="2"/>`
        + `<circle cx="${f(jx + 22)}" cy="${f(jy - 2)}" r="4.5" fill="#f6d55e" stroke="#d4b043" stroke-width="1.6"/>`
        + `<g class="cr-joy" transform="translate(${f(jx)} ${f(jy - 4)})"><path d="M0,0 V${f(-g.joy.len)}" stroke="#8c6e5a" stroke-width="3.4" stroke-linecap="round"/><circle cy="${f(-g.joy.len)}" r="6" fill="#f7a6a0" stroke="#d97f7a" stroke-width="1.8"/></g>`
        + `<g transform="translate(${f(fx)} ${f(fy)}) scale(${f(fs)})"><g class="cr-face">${catFace(g.cat, { look: { x: -1, y: 0.4 } })}</g></g>`
        + `<g class="cr-paw" transform="translate(${f(jx + 4)} ${f(jy - 4 - g.joy.len)})">${catPaw(g.cat, Math.max(8, 17 * fs))}</g>`;
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
      R.joy = g.svg.querySelector('.cr-joy');
      R.paw = g.svg.querySelector('.cr-paw');
      R.bulbs = Array.from(g.svg.querySelectorAll('.cr-bulb'));
      R.toys = Array.from(g.svg.querySelectorAll('.toy'));
      setClaw(g, g.chute.x + g.chute.w / 2, g.restY, 0.1);
    },
    async perform(g, decided, say) {
      const plan = cranePlan(g.n, decided);
      const { stage } = g;
      delete stage.dataset.variant;
      const slip = slipOk(plan.length) && Math.random() < 0.3;
      const blink = R.bulbs.map((el, k) => el.animate([{ fill: '#fff1c4' }, { fill: '#ffd36b' }, { fill: '#fff1c4' }], { duration: 600, delay: (k % 3) * 200, iterations: Infinity }));
      say('どれに しようかな…');
      // 1. まよいながら、ぬいぐるみの上を うつる
      for (let k = 0; k < plan.length; k++) {
        const t = g.toys[plan[k]];
        audio.slide(T.move / 1000);
        await moveClaw(g, t.cx, g.restY, T.move, 0.1);
        if (k === plan.length - 1) break;
        audio.tick();
        await moveClaw(g, t.cx, g.restY + 14, T.peek / 2, 0.6);
        await moveClaw(g, t.cx, g.restY, T.peek / 2, 0.1);
      }
      // 2. 下りて つかむ
      say('ここだ！');
      const t = g.toys[decided];
      // つめを大きく ひらいてから下りる
      audio.slide(T.open / 1000);
      await moveClaw(g, t.cx, g.restY, T.open, 1);
      audio.stretch(T.down / 1000);
      await moveClaw(g, t.cx, t.cy - g.toyDrop, T.down, 1);
      // ぎゅっと とじる（はじめは速く、さいごは ゆっくり はさむ）
      say('ぎゅっ…');
      audio.tick();
      const gy = t.cy - g.toyDrop;
      await frames(T.grab, (p) => setClaw(g, t.cx, gy, 1 - ease.outCubic(p)));
      audio.pop();
      const got = nearest(g.toys, g.at.x, g.at.y + g.toyDrop); // アームが つかんだ ぬいぐるみ
      const toy = R.toys[got];
      g.svg.insertBefore(toy, R.cable); // ほかの ぬいぐるみより前、アームより後ろに出す
      say('つかんだ…？');
      if (slip) {
        // つるっ… すべって落ちたので、もう一度 つかむ
        stage.dataset.variant = 'slip';
        await moveClaw(g, t.cx, (gy + g.restY + 20) / 2, T.up * 0.5, 0, toy);
        say('あっ！ つるっ…');
        audio.hop(1);
        await moveClaw(g, t.cx, (gy + g.restY + 20) / 2, 120, 0.6);
        await frames(140, (p) => toy.setAttribute('transform', `translate(${f(t.cx)} ${f((gy + g.restY + 20) / 2 + g.toyDrop + (t.cy - (gy + g.restY + 20) / 2 - g.toyDrop) * p * p)})`));
        R.face.innerHTML = catFace(g.cat, { mood: 'strain', look: { x: -1, y: 0.4 } });
        say('もう いっかい！');
        await moveClaw(g, t.cx, gy, T.down * 0.5, 1);
        await frames(T.grab, (p) => setClaw(g, t.cx, gy, 1 - ease.outCubic(p)));
        audio.pop();
        say('こんどこそ…！');
      }
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
      say('ぱっ');
      audio.slide(T.release / 1000);
      await moveClaw(g, g.chute.x + g.chute.w / 2, g.restY + 20, T.release, 1);
      const y0 = g.restY + 20 + g.toyDrop;
      const x0 = g.chute.x + g.chute.w / 2;
      audio.hop(3);
      await frames(T.drop, (p) => {
        toy.setAttribute('transform', `translate(${f(x0)} ${f(y0 + (g.chute.y + g.chute.h / 2 - y0) * p * p)}) scale(${f(1 - 0.4 * p)})`);
        toy.setAttribute('opacity', f(1 - p * 0.6));
      });
      R.face.innerHTML = catFace(g.cat, { mood: 'happy', look: { x: -1, y: 0.4 } });
      blink.forEach((x) => x.cancel());
      R.bulbs.forEach((el) => el.setAttribute('fill', '#ffd36b'));
      return got;
    },
  });
}
