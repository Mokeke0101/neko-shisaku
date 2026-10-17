// しゃぼんだま（決め方：猫の気まぐれ〈のこる〉。見せ方の部品：しゃぼんだまと名前の札）。
// 猫が しゃぼんだまを ふくと、選択肢ごとの しゃぼんだまが ふわふわ ならぶ。猫が 前足で つぎつぎに わっていき、
// さいごに のこった しゃぼんだまの札が結果になる。
// はなびら うらない（花びらを抜く）とは、わる物と、さいごの2つで 前足が まよう所が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. しゃぼんだまが1つずつ ふくらんで、ならぶ。
// 2. 前足が しゃぼんだまを わっていく（はじめは はやく、だんだん ゆっくり）。
// 3. のこり2つで、前足が いったり きたり まよってから、片方を わる。
// 結果は先に乱数で決め（RS01-S14）、わる順を、決めた しゃぼんだまが のこるように組む。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, shuffle, f } from './common.js';

// わる順：決めた しゃぼんだま以外を ちょうど1回ずつ
export function popOrder(n, decided, rand = Math.random) {
  return shuffle([...Array(n).keys()].filter((i) => i !== decided), rand);
}
// k 番目に わるまでの間（ミリ秒）。total は わる数
export const popGap = (k, total) => 180 + 320 * Math.pow(total <= 1 ? 1 : k / (total - 1), 2);
export const T = { blow: 1300, reach: 200, sway: 380, last: 520 };
// のこり2つで まよう回数（選択肢が少ない時は多め）
export const waverOf = (n) => (n <= 4 ? 3 : 2);
export function shabonDuration(n) {
  let s = T.blow;
  for (let k = 0; k < n - 2; k++) s += T.reach + popGap(k, n - 1);
  return s + waverOf(n) * T.sway * 2 + T.reach + 200 + T.last;
}

// しゃぼんだま（中心 0,0・半径 r）。にじ色の ふち と 光
function bubble(r, k) {
  const hues = ['#f29bc0', '#8fc2ef', '#a6dc98', '#f2c95e'];
  return `<circle r="${f(r)}" fill="#f4fbff" fill-opacity="0.78" stroke="${hues[k % 4]}" stroke-width="${f(Math.max(2.6, r * 0.09))}"/>`
    + `<circle r="${f(r * 0.86)}" fill="none" stroke="${hues[(k + 1) % 4]}" stroke-width="1.4" opacity="0.5"/>`
    + `<path d="M${f(-r * 0.62)},${f(-r * 0.1)} A${f(r * 0.66)},${f(r * 0.66)} 0 0 1 ${f(-r * 0.1)},${f(-r * 0.62)}" stroke="#ffffff" stroke-width="${f(Math.max(2, r * 0.1))}" fill="none" stroke-linecap="round" opacity="0.9"/>`
    + `<circle cx="${f(r * 0.4)}" cy="${f(r * 0.38)}" r="${f(r * 0.08)}" fill="#ffffff" opacity="0.85"/>`;
}

export function createShabon(deps) {
  const R = {};
  let bob = null;
  return createGame(deps, {
    play: 'ふーっ',
    resultLabel: 'のこったのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const catH = Math.max(46, Math.min(84, H * 0.15));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 8, y: 6, w: W - 16, h: H - catH - 12 }, cols, 8);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.34));
      const br = Math.max(12, Math.min(cells[0].w * 0.36, (cells[0].h - plateH - 4) / 2));
      const bubbles = cells.map((c) => ({ cx: c.cx, cy: c.y + (c.h - plateH) / 2 }));
      Object.assign(g, { cells, plateH, br, bubbles, catH });
      g.wand = { x: W * 0.5 + catH * 0.55, y: H - catH * 0.75 };
      let s = '';
      cells.forEach((c, i) => {
        s += `<g class="bub" data-i="${i}" transform="translate(${f(bubbles[i].cx)} ${f(bubbles[i].cy)})"><g class="bub-in" opacity="0">${bubble(br, i)}</g></g>`;
        s += plate(i, c.x + 4, c.y + c.h - plateH, c.w - 8, plateH, choices[i]).svg;
      });
      // 猫と しゃぼんだまの わ
      const fs = catH / 112;
      s += `<g transform="translate(${f(W * 0.5)} ${f(H - catH * 0.48)}) scale(${f(fs)})"><g class="sb-face">${catFace(g.cat, { look: { x: 0, y: -1 } })}</g></g>`
        + `<g transform="translate(${f(g.wand.x)} ${f(g.wand.y)})"><path d="M0,${f(catH * 0.1)} L${f(-catH * 0.18)},${f(catH * 0.42)}" stroke="#86a256" stroke-width="3" stroke-linecap="round"/><circle r="${f(catH * 0.12)}" fill="none" stroke="#86a256" stroke-width="3"/></g>`
        + `<g class="sb-paw" transform="translate(${f(W * 0.5 - catH * 0.6)} ${f(H - catH * 0.3)})">${catPaw(g.cat, Math.max(9, br * 0.36))}</g>`
        + '<g class="drops"></g>';
      return s;
    },
    after(g) {
      R.bubs = Array.from(g.svg.querySelectorAll('.bub'));
      R.paw = g.svg.querySelector('.sb-paw');
      R.face = g.svg.querySelector('.sb-face');
      R.drops = g.svg.querySelector('.drops');
      g.pawHome = { x: g.W * 0.5 - g.catH * 0.6, y: g.H - g.catH * 0.3 };
      g.paw = { ...g.pawHome };
      if (bob) bob.forEach((a) => a.cancel());
      bob = null;
      // 遊ぶ前から しゃぼんだまを ならべておく（押すと ふき直す）
      R.bubs.forEach((el) => el.querySelector('.bub-in').setAttribute('opacity', '1'));
    },
    async perform(g, decided, say) {
      const { n } = g;
      // 1. ふくらませて ならべる
      say('ふーっ…');
      audio.stretch(T.blow / 1000);
      await frames(T.blow, (t) => {
        R.bubs.forEach((el, i) => {
          const p = Math.max(0, Math.min(1, t * (n + 2) / 2 - (i * n) / (2 * n)));
          const e = ease.outBack(p);
          const b = g.bubbles[i];
          const x = g.wand.x + (b.cx - g.wand.x) * ease.outCubic(p);
          const y = g.wand.y + (b.cy - g.wand.y) * ease.outCubic(p);
          el.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
          const inn = el.querySelector('.bub-in');
          inn.setAttribute('opacity', p > 0 ? '1' : '0');
          inn.setAttribute('transform', `scale(${f(Math.max(0.05, e))})`);
        });
      });
      // ふわふわ ゆれる
      bob = R.bubs.map((el, i) => el.querySelector('.bub-in').animate([{ transform: 'translate(0,0)' }, { transform: `translate(${i % 2 ? 2 : -2}px,-3px)` }, { transform: 'translate(0,0)' }], { duration: 1400 + i * 90, iterations: Infinity }));
      // 2. わっていく
      const order = popOrder(n, decided);
      const popAt = async (i) => {
        const b = g.bubbles[i];
        await movePaw(g, b.cx + g.br * 0.3, b.cy + g.br * 0.4, T.reach);
        burst(g, i);
        audio.pop();
      };
      say('ぱちん、ぱちん！');
      for (let k = 0; k < order.length - 1; k++) {
        await popAt(order[k]);
        await wait(popGap(k, n - 1));
      }
      // 3. のこり2つで まよう
      const lastOther = order[order.length - 1];
      say('どっちを わろうかな…');
      R.face.innerHTML = catFace(g.cat, { look: { x: 0, y: -1 } });
      const pair = Math.random() < 0.5 ? [decided, lastOther] : [lastOther, decided];
      for (let k = 0; k < waverOf(n); k++) {
        for (const i of pair) {
          const b = g.bubbles[i];
          audio.hover(k + (i === decided ? 1 : 0));
          await movePaw(g, b.cx + g.br * 0.3, b.cy + g.br * 1.1, T.sway);
        }
      }
      say('えいっ！');
      await popAt(lastOther);
      await wait(200);
      await movePaw(g, g.pawHome.x, g.pawHome.y, T.last);
      R.face.innerHTML = catFace(g.cat, { mood: 'happy', look: { x: 0, y: -1 } });
      return R.bubs.findIndex((el) => el.dataset.popped !== '1'); // のこった しゃぼんだま
    },
  });

  async function movePaw(g, x, y, dur) {
    const a = { ...g.paw };
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      g.paw = { x: a.x + (x - a.x) * e, y: a.y + (y - a.y) * e };
      R.paw.setAttribute('transform', `translate(${f(g.paw.x)} ${f(g.paw.y)})`);
    });
  }

  // しゃぼんだまが はじける（しずくが とぶ。札は うすくする）
  function burst(g, i) {
    const el = R.bubs[i];
    el.dataset.popped = '1';
    const inn = el.querySelector('.bub-in');
    inn.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 220, fill: 'forwards' });
    const b = g.bubbles[i];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const d = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      d.setAttribute('cx', f(b.cx + Math.cos(a) * g.br * 0.8));
      d.setAttribute('cy', f(b.cy + Math.sin(a) * g.br * 0.8));
      d.setAttribute('r', f(Math.max(1.6, g.br * 0.08)));
      d.setAttribute('fill', '#b5d8f7');
      R.drops.appendChild(d);
      d.animate([{ transform: 'translate(0,0)', opacity: 0.9 }, { transform: `translate(${f(Math.cos(a) * g.br * 0.5)}px,${f(Math.sin(a) * g.br * 0.5 + 6)}px)`, opacity: 0 }], { duration: 420, fill: 'forwards' }).onfinish = () => d.remove();
    }
    const cell = g.svg.querySelector(`.cell[data-i="${i}"]`);
    cell.setAttribute('opacity', '0.45');
  }
}
