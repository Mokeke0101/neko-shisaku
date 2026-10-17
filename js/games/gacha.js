// ねこ ガチャ（決め方：隠して当てる〈カプセル〉。見せ方の部品：番号と色つきの一覧）。
// 猫が ガチャの ハンドルを まわすと、カプセルが ころんと出てくる。ぱかっと ひらくと、中の番号の選択肢が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. ハンドルを「ガチャ、ガチャ」と3回まわす。まわすたびに、まるい窓の中の カプセルが ゆれる。
// 2. カプセルが出口から ころがり出て、ぽよんと はねる。
// 3. カプセルが ぶるぶる ゆれてから、ぱかっと ひらき、番号が出る。
// 結果は先に乱数で決め（RS01-S14）、出てくる カプセルを その結果の色と番号にする。
// 一覧の欄はどれも同じ大きさ（RS01-S21）。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, hintPlate, TINTS, f } from './common.js';

export const TURNS = 3;
export const T = { turn: 620, out: 760, bounce: 380, shake: 900, open: 560 };
export const gachaDuration = () => TURNS * T.turn + T.out + T.bounce + T.shake + T.open + 600;

// カプセル（中心 0,0・半径 r）。上が色、下が白。番号は ひらいた時に見せる
function capsule(i, r) {
  const [col, edge] = TINTS[i % TINTS.length];
  return `<g class="cap-bottom"><path d="M${f(-r)},0 A${f(r)},${f(r)} 0 0 0 ${f(r)},0 Z" fill="#ffffff" stroke="${edge}" stroke-width="2"/></g>`
    + `<g class="cap-num" opacity="0"><circle r="${f(r * 0.62)}" fill="${C.paper}" stroke="${edge}" stroke-width="2"/><text y="1" font-size="${f(r * 0.8)}" font-weight="700" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${i + 1}</text></g>`
    + `<g class="cap-top"><path d="M${f(-r)},0 A${f(r)},${f(r)} 0 0 1 ${f(r)},0 Z" fill="${col}" stroke="${edge}" stroke-width="2"/><ellipse cx="${f(-r * 0.35)}" cy="${f(-r * 0.5)}" rx="${f(r * 0.18)}" ry="${f(r * 0.1)}" fill="#ffffff" opacity="0.7"/></g>`;
}

export function createGacha(deps) {
  const R = {};
  return createGame(deps, {
    play: 'まわす',
    resultLabel: 'でてきたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const cols = n <= 5 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      const rowH = Math.max(24, Math.min(40, (H * 0.52) / rows));
      const listH = rows * rowH + (rows - 1) * 5 + 16;
      const topH = H - listH - 6;
      const cells = grid(n, { x: 12, y: topH + 8, w: W - 24, h: listH - 16 }, cols, 6);
      // ガチャの台
      const mh = topH - 8;
      const domeR = Math.max(26, Math.min(82, mh * 0.3, W * 0.2));
      const bodyW = domeR * 1.9;
      const bodyH = Math.max(30, Math.min(domeR * 1.5, mh - domeR * 2 - 10));
      const mx = W * 0.44;
      const domeY = Math.max(6, (topH - domeR * 2 - bodyH + 6) / 2) + domeR;
      const bodyY = domeY + domeR - 6;
      const capR = Math.max(9, Math.min(22, domeR * 0.28));
      Object.assign(g, { cells, mx, domeR, domeY, bodyY, bodyW, bodyH, capR });
      g.outlet = { x: mx - bodyW * 0.2, y: bodyY + bodyH - capR - 6 };
      g.tray = { x: Math.max(capR + 8, mx - bodyW / 2 - capR * 1.9), y: bodyY + bodyH - capR };
      g.handle = { x: mx + bodyW * 0.18, y: bodyY + bodyH * 0.42, r: Math.min(bodyH * 0.3, domeR * 0.38) };
      let s = `<ellipse cx="${f(mx)}" cy="${f(bodyY + bodyH + 2)}" rx="${f(bodyW * 0.75)}" ry="6" fill="#a0703f" opacity="0.16"/>`
        + `<rect x="${f(mx - bodyW / 2)}" y="${f(bodyY)}" width="${f(bodyW)}" height="${f(bodyH)}" rx="12" fill="#f7a6a0" stroke="#d97f7a" stroke-width="3"/>`
        + `<rect x="${f(mx - bodyW / 2 + 6)}" y="${f(bodyY + 6)}" width="${f(bodyW - 12)}" height="${f(Math.min(16, bodyH * 0.2))}" rx="5" fill="#fffaf0" opacity="0.85"/>`
        + `<rect x="${f(g.outlet.x - capR * 1.3)}" y="${f(g.outlet.y - capR * 1.1)}" width="${f(capR * 2.6)}" height="${f(capR * 2.2)}" rx="${f(capR * 0.6)}" fill="#a0703f" opacity="0.45"/>`
        + `<circle cx="${f(mx)}" cy="${f(domeY)}" r="${f(domeR)}" fill="#eaf6fb" fill-opacity="0.85" stroke="#9fc8cf" stroke-width="3"/>`;
      // まるい窓の中の カプセル（選択肢の数だけ。12より少ない時も、すきまが空かないように足す）
      const inside = Math.max(n, 9);
      s += '<g class="dome-caps">';
      for (let k = 0; k < inside; k++) {
        const a = k * 2.399;
        const rr = (domeR - capR - 4) * Math.sqrt((k + 0.5) / inside);
        const x = mx + Math.cos(a) * rr;
        const y = domeY + domeR * 0.15 + Math.sin(a) * rr * 0.75;
        s += `<g class="dcap" data-x="${f(x)}" data-y="${f(y)}" transform="translate(${f(x)} ${f(y)}) rotate(${(k * 47) % 360})">${capsule(k % n, capR * 0.82)}</g>`;
      }
      s += '</g>'
        + `<path d="M${f(mx - domeR * 0.55)},${f(domeY - domeR * 0.5)} q${f(domeR * 0.2)},${f(-domeR * 0.25)} ${f(domeR * 0.5)},${f(-domeR * 0.3)}" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>`
        + `<g class="handle" transform="translate(${f(g.handle.x)} ${f(g.handle.y)})"><circle r="${f(g.handle.r)}" fill="#fffaf0" stroke="#d97f7a" stroke-width="3"/><rect x="${f(-g.handle.r * 0.95)}" y="${f(-g.handle.r * 0.22)}" width="${f(g.handle.r * 1.9)}" height="${f(g.handle.r * 0.44)}" rx="${f(g.handle.r * 0.2)}" fill="#f6d58a" stroke="#d9b04d" stroke-width="2"/></g>`;
      // 猫（右）
      const fs = Math.max(0.28, Math.min(0.6, domeR / 110));
      s += `<g transform="translate(${f(Math.min(W - 52 * fs - 4, mx + bodyW / 2 + 60 * fs))} ${f(domeY + domeR * 0.4)}) scale(${f(fs)})"><g class="ga-face">${catFace(g.cat, { look: { x: -1, y: 0.6 } })}</g></g>`
        + `<g class="ga-paw" transform="translate(${f(g.handle.x + g.handle.r * 0.9)} ${f(g.handle.y - g.handle.r * 0.2)})">${catPaw(g.cat, Math.max(7, g.handle.r * 0.55))}</g>`;
      s += `<g class="out-cap" opacity="0"></g>`;
      // 一覧
      s += `<rect x="6" y="${f(topH + 2)}" width="${W - 12}" height="${f(listH)}" rx="16" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="3"/>`;
      cells.forEach((c, i) => { s += plate(i, c.x, c.y, c.w, c.h, choices[i], { badge: i + 1, tint: TINTS[i % TINTS.length] }).svg; });
      return s;
    },
    after(g) {
      R.handle = g.svg.querySelector('.handle');
      R.caps = Array.from(g.svg.querySelectorAll('.dcap'));
      R.out = g.svg.querySelector('.out-cap');
      R.face = g.svg.querySelector('.ga-face');
    },
    async perform(g, decided, say) {
      const { svg, n } = g;
      // 1. ハンドルを3回まわす
      let lit = -1;
      for (let k = 0; k < TURNS; k++) {
        say(k === 0 ? 'ガチャ…' : k === 1 ? 'ガチャ…ガチャ…' : 'ガチャ ガチャ…！');
        audio.rattle();
        const a0 = k * 120;
        await frames(T.turn, (t) => {
          R.handle.setAttribute('transform', `translate(${f(g.handle.x)} ${f(g.handle.y)}) rotate(${f(a0 + 120 * ease.inOutSine(t))})`);
          R.caps.forEach((el, j) => {
            const x = Number(el.dataset.x) + Math.sin(t * 9 + j) * 3;
            const y = Number(el.dataset.y) + Math.cos(t * 7 + j * 2) * 3;
            el.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f((j * 47 + t * 90 * (j % 2 ? 1 : -1)) % 360)})`);
          });
          const want = Math.floor(t * 3 + k * 3) % n;
          if (want !== lit) { if (lit >= 0) hintPlate(svg, lit, false); lit = (want * 5 + k) % n; hintPlate(svg, lit, true); }
        });
        audio.tick();
        await wait(90);
      }
      if (lit >= 0) hintPlate(svg, lit, false);
      // 2. カプセルが ころがり出る
      say('ころん！');
      R.out.innerHTML = `<g class="spin">${capsule(decided, g.capR)}</g>`;
      R.out.dataset.i = String(decided);
      R.out.setAttribute('opacity', '1');
      const spin = R.out.querySelector('.spin');
      const a = g.outlet;
      const b = g.tray;
      audio.slide(T.out / 1000);
      await frames(T.out, (t) => {
        const e = ease.outCubic(t);
        R.out.setAttribute('transform', `translate(${f(a.x + (b.x - a.x) * e)} ${f(a.y + (b.y - a.y) * e)})`);
        spin.setAttribute('transform', `rotate(${f(-360 * e)})`);
      });
      audio.hop(2);
      await frames(T.bounce, (t) => R.out.setAttribute('transform', `translate(${f(b.x)} ${f(b.y - Math.sin(Math.PI * t) * g.capR * 0.9)})`));
      // 3. ぶるぶる ゆれてから ひらく
      say('なにが でるかな…');
      audio.heart();
      await frames(T.shake, (t) => spin.setAttribute('transform', `rotate(${f(Math.sin(t * Math.PI * 10) * 10 * (0.4 + t))})`));
      spin.removeAttribute('transform');
      audio.pop();
      const top = R.out.querySelector('.cap-top');
      const num = R.out.querySelector('.cap-num');
      await frames(T.open, (t) => {
        const e = ease.outBack(t);
        top.setAttribute('transform', `translate(${f(g.capR * 0.9 * e)} ${f(-g.capR * 1.3 * e)}) rotate(${f(40 * e)})`);
        num.setAttribute('opacity', f(Math.min(1, t * 2)));
        num.setAttribute('transform', `scale(${f(0.5 + 0.7 * e)}) translate(0 ${f(-g.capR * 0.3 * e)})`);
      });
      R.face.innerHTML = catFace(g.cat, { mood: 'happy', look: { x: -1, y: 0.6 } });
      await wait(300);
      return Number(R.out.dataset.i); // ひらいた カプセルの番号
    },
  });
}
