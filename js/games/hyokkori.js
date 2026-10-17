// ひょっこり こねこ（決め方：隠して当てる〈あな〉。見せ方の部品：あなと名前の札）。
// 選択肢ごとの あなから、こねこが つぎつぎに ひょっこり 顔を出しては ひっこむ。さいごに 顔を出して、
// 手を ふって そのまま いる あなの札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. こねこが あちこちの あなから ひょこひょこ 顔を出す（はじめは はやく、だんだん ゆっくり）。
// 2. しーんと した後、もういちど ひょっこり。
// 3. 顔を出した こねこが 手を ふって、そのまま いる。
// 結果は先に乱数で決め（RS01-S14）、顔を出す順を、決めた あなで終わるように組む。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, wander, f } from './common.js';

export function peekPlan(n, decided, rand = Math.random) {
  return wander(n, 7 + Math.floor(rand() * 3), decided, rand);
}
// k 番目に顔を出している時間（ミリ秒）。total は 顔を出す回数
export const peekTime = (k, total) => 300 + 340 * Math.pow(total <= 1 ? 1 : k / (total - 1), 1.6);
export const T = { hush: 700, final: 520, wave: 700 };
export function hyokkoriDuration(count) {
  let s = 0;
  for (let k = 0; k < count - 1; k++) s += peekTime(k, count - 1);
  return s + T.hush + T.final + T.wave;
}

export function createHyokkori(deps) {
  const R = {};
  return createGame(deps, {
    play: 'ひょっこり',
    resultLabel: 'でてきたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 8, y: 6, w: W - 16, h: H - 12 }, cols, 8);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.32));
      const hr = Math.max(14, Math.min(46, cells[0].w * 0.3, (cells[0].h - plateH) * 0.5));
      const holes = cells.map((c) => ({ cx: c.cx, cy: c.y + c.h - plateH - hr * 0.28 - 4 }));
      const fk = (hr * 1.6) / 100; // こねこの顔の大きさ
      Object.assign(g, { cells, plateH, hr, holes, fk });
      let s = '<defs>';
      holes.forEach((h, i) => { s += `<clipPath id="hk${i}"><rect x="${f(h.cx - hr * 1.4)}" y="${f(h.cy - hr * 3)}" width="${f(hr * 2.8)}" height="${f(hr * 3)}"/></clipPath>`; });
      s += '</defs>';
      cells.forEach((c, i) => {
        const h = holes[i];
        s += `<ellipse cx="${f(h.cx)}" cy="${f(h.cy)}" rx="${f(hr * 1.05)}" ry="${f(hr * 0.34)}" fill="#7a5233"/>`
          + `<g clip-path="url(#hk${i})"><g class="kit" data-i="${i}" transform="translate(${f(h.cx)} ${f(h.cy + hr * 1.6)})"><g transform="scale(${f(fk)})">${catFace(g.cat, { look: { x: 0, y: 0.3 } })}</g></g></g>`
          + `<path d="M${f(h.cx - hr * 1.2)},${f(h.cy)} A${f(hr * 1.2)},${f(hr * 0.42)} 0 0 0 ${f(h.cx + hr * 1.2)},${f(h.cy)}" fill="none" stroke="#c99a62" stroke-width="${f(Math.max(3, hr * 0.16))}" stroke-linecap="round"/>`;
        s += plate(i, c.x + 4, c.y + c.h - plateH, c.w - 8, plateH, choices[i]).svg;
      });
      s += '<g class="waver"></g>';
      return s;
    },
    after(g) {
      R.kits = Array.from(g.svg.querySelectorAll('.kit'));
      R.waver = g.svg.querySelector('.waver');
    },
    async perform(g, decided, say) {
      const plan = peekPlan(g.n, decided);
      const up = (i, p) => {
        const h = g.holes[i];
        R.kits[i].setAttribute('transform', `translate(${f(h.cx)} ${f(h.cy + g.hr * 1.6 - p * g.hr * 2.0)})`);
      };
      say('どこから でてくるかな…');
      // 1. ひょこひょこ
      const shown = plan.length - 1;
      for (let k = 0; k < shown; k++) {
        const i = plan[k];
        const dur = peekTime(k, shown);
        audio.hop(k);
        await frames(dur, (t) => up(i, Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.min(1, dur / 500))));
        up(i, 0);
        if (k === Math.floor(shown / 2)) say('ひょこ、ひょこ…');
      }
      // 2. しーん
      say('しーん…');
      await wait(T.hush);
      // 3. さいごに ひょっこり、手を ふる
      audio.pop();
      await frames(T.final, (t) => up(decided, ease.outBack(t)));
      const kit = R.kits[decided];
      kit.querySelector('g').innerHTML = catFace(g.cat, { mood: 'happy' });
      const h = g.holes[decided];
      const got = R.kits.findIndex((el) => el === kit); // 顔を出したままの あな
      say('ひょっこり！');
      R.waver.innerHTML = `<g transform="translate(${f(h.cx + g.hr * 0.9)} ${f(h.cy - g.hr * 0.9)})"><g class="wv">${catPaw(g.cat, Math.max(6, g.hr * 0.3))}</g></g>`;
      const wv = R.waver.querySelector('.wv');
      await frames(T.wave, (t) => wv.setAttribute('transform', `rotate(${f(Math.sin(t * Math.PI * 4) * 22)})`));
      return got;
    },
  });
}
