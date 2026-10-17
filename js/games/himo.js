// ひもひき くじ（決め方：隠して当てる〈ひも〉。見せ方の部品：つり下げた名前の札と、からまった ひも）。
// 上に つり下げた 選択肢の札から、ひもが からまりながら下へのびて、猫の前で ひとたばに まとまっている。
// 猫が1本を ひっぱると、その ひもの先の札が ぴょこんと上がる。上がった札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が ひもを1本ずつ つまんで「これかな？」と 少し ひく（札が ぴくっと うごく）。3〜4回。
// 2. 1本を ぐーっと ひっぱると、ひもに そって 色が 上へ のぼっていく。
// 3. 色が 札に とどくと、札が ぴょこんと上がる。
// 結果は先に乱数で決め（RS01-S14）、ひっぱる ひもを、決めた札の ひもにする。
// ひもの からまり方は 毎回 かわる（どの ひもが どの札か、たばの所では分からない）。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, wander, shuffle, f } from './common.js';

export function tugPlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 3 : 3 + Math.floor(rand() * 2), decided, rand);
}
export const T = { tug: 780, pull: 1900, lift: 560 };
export const himoDuration = (tugs) => (tugs - 1) * (T.tug + 120) + T.pull + T.lift + 300;

export function createHimo(deps) {
  const R = {};
  return createGame(deps, {
    play: 'ひっぱる',
    resultLabel: 'ひいたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const footH = Math.max(70, Math.min(150, H * 0.3));
      const cols = n <= 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      const plateH = Math.max(22, Math.min(34, (H - footH - 20) / rows - 14));
      const cells = grid(n, { x: 10, y: 14, w: W - 20, h: H - footH - 18 }, cols, 8).map((c) => ({ ...c, py: c.y + (c.h - plateH) / 2 }));
      const fs = Math.min(0.5, (footH * 0.4) / 100); // 猫の顔の大きさ（ゲームの場所の下に収める）
      const faceY = H - 50 * fs - 2;
      const knot = { x: W * 0.5, y: faceY - 50 * fs - 16 };
      // たばの所の ひもの並び（札の並びと まぜる）
      const slots = shuffle([...Array(n).keys()]);
      const spread = Math.min(W * 0.3, n * 9);
      const ends = cells.map((_, i) => ({ x: knot.x - spread / 2 + (slots.indexOf(i) + 0.5) * (spread / n), y: knot.y }));
      Object.assign(g, { cells, plateH, knot, ends, footH });
      let s = cells.map((c) => `<path d="M${f(c.cx)},6 V${f(c.py)}" stroke="#c99a62" stroke-width="1.6"/>`).join('')
        + `<path d="M6,6 H${W - 6}" stroke="#c99a62" stroke-width="5" stroke-linecap="round"/>`;
      // ひも（札の後ろに描く）
      s += '<g class="strings">';
      cells.forEach((c, i) => {
        const top = { x: c.cx, y: c.py + plateH };
        const e = ends[i];
        const sx = (Math.random() - 0.5) * W * 0.7;
        const d = `M${f(top.x)},${f(top.y)} C${f(top.x + sx * 0.4)},${f(top.y + (e.y - top.y) * 0.45)} ${f(e.x - sx)},${f(e.y - (e.y - top.y) * 0.4)} ${f(e.x)},${f(e.y)}`;
        s += `<path class="str" data-i="${i}" d="${d}" stroke="#c9b9a4" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      });
      s += '</g><g class="glow"></g>';
      cells.forEach((c, i) => { s += `<g class="hang" data-i="${i}">${plate(i, c.x + 2, c.py, c.w - 4, plateH, choices[i]).svg}</g>`; });
      // たばと猫
      s += `<ellipse cx="${f(knot.x)}" cy="${f(knot.y + 4)}" rx="${f(spread / 2 + 8)}" ry="7" fill="#f6e3c3" stroke="#c99a62" stroke-width="2"/>`;
      s += `<g transform="translate(${f(knot.x)} ${f(faceY)}) scale(${f(fs)})"><g class="hm-face">${catFace(g.cat, { look: { x: 0, y: -1 } })}</g></g>`
        + `<g class="hm-paw" transform="translate(${f(knot.x)} ${f(knot.y + 18)})">${catPaw(g.cat, Math.max(8, footH * 0.08))}</g>`;
      return s;
    },
    after(g) {
      R.strs = Array.from(g.svg.querySelectorAll('.str'));
      R.hangs = Array.from(g.svg.querySelectorAll('.hang'));
      R.glow = g.svg.querySelector('.glow');
      R.paw = g.svg.querySelector('.hm-paw');
      R.face = g.svg.querySelector('.hm-face');
    },
    async perform(g, decided, say) {
      const plan = tugPlan(g.n, decided);
      const pawAt = (x, y) => R.paw.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
      // 1. つまんで 少し ひく
      for (let k = 0; k < plan.length - 1; k++) {
        const i = plan[k];
        const e = g.ends[i];
        say(k === 0 ? 'どれに しようかな…' : 'これかな…？');
        audio.pluck(k);
        R.strs[i].setAttribute('stroke', '#e3a074');
        await frames(T.tug, (t) => {
          const p = Math.sin(Math.PI * t);
          pawAt(e.x, e.y + 14 + p * 8);
          R.hangs[i].setAttribute('transform', `translate(0 ${f(p * 4)})`);
        });
        R.strs[i].setAttribute('stroke', '#c9b9a4');
        R.hangs[i].removeAttribute('transform');
        await wait(120);
      }
      // 2. ぐーっと ひっぱる：色が ひもに そって のぼる
      say('えいっ、ぐーっ…');
      const pulled = R.strs[decided];
      const e = g.ends[decided];
      const line = pulled.cloneNode();
      line.setAttribute('stroke', C.momiji);
      line.setAttribute('stroke-width', '4');
      const len = pulled.getTotalLength();
      line.setAttribute('stroke-dasharray', `${f(len)} ${f(len)}`);
      R.glow.appendChild(line);
      R.face.innerHTML = catFace(g.cat, { mood: 'strain', look: { x: 0, y: -1 } });
      audio.stretch(T.pull / 1000);
      await frames(T.pull, (t) => {
        line.setAttribute('stroke-dashoffset', f(-len * (1 - ease.inOutSine(t))));
        pawAt(e.x, e.y + 14 + 18 * Math.min(1, t * 3));
      });
      // 3. 色が とどいた札が ぴょこんと上がる
      const got = Number(line.dataset.i); // ひっぱった ひもの先の札
      audio.pop();
      await frames(T.lift, (t) => R.hangs[got].setAttribute('transform', `translate(0 ${f(-Math.sin(Math.PI * Math.min(1, t * 1.4)) * 10)})`));
      R.hangs[got].removeAttribute('transform');
      R.face.innerHTML = catFace(g.cat, { mood: 'happy', look: { x: 0, y: -1 } });
      return got;
    },
  });
}
