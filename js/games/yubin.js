// ねこの ゆうびんやさん（決め方：道をたどる〈とどける〉。見せ方の部品：いえと名前の札〈ゆうびんうけ〉）。
// ゆうびんやさんの猫が てがみを もって、選択肢ごとの いえを たずねて歩く。いえの前で「ここかな？」と見ては、
// 次の いえへ。さいごに てがみを ゆうびんうけに入れた いえの札が結果になる。いえの窓に あかりが ともる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が とことこ 歩いて、いえの前で止まり、首を かしげる（3〜4けん）。
// 2. さいごの いえで うなずいて、てがみを ゆうびんうけへ。
// 3. いえの窓が ぽっと明るくなる。
// 結果は先に乱数で決め（RS01-S14）、たずねる順を、決めた いえで終わるように組む。
import { C } from '../art.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, nearest, wander, TINTS, f } from './common.js';

export function visitPlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 3 : 3 + Math.floor(rand() * 2), decided, rand);
}
export const T = { walk: 820, look: 460, post: 600, light: 400 };
export const yubinDuration = (visits) => visits * T.walk + (visits - 1) * T.look + T.post + T.light + 200;

// いえ（下のまん中 0,0 から上へ・はば w・高さ h）
function house(w, h, k) {
  const [col, edge] = TINTS[k % TINTS.length];
  const roof = ['#e8664a', '#6f9fcb', '#86a256', '#a985c9', '#db8f4a'][k % 5];
  const bh = h * 0.58;
  return `<rect x="${f(-w * 0.42)}" y="${f(-bh)}" width="${f(w * 0.84)}" height="${f(bh)}" rx="3" fill="${col}" stroke="${edge}" stroke-width="2"/>`
    + `<path d="M${f(-w * 0.52)},${f(-bh + 2)} L0,${f(-h)} L${f(w * 0.52)},${f(-bh + 2)} Z" fill="${roof}" stroke="${C.line}" stroke-width="1.6" stroke-linejoin="round" opacity="0.92"/>`
    + `<rect class="win" x="${f(-w * 0.3)}" y="${f(-bh * 0.78)}" width="${f(w * 0.22)}" height="${f(bh * 0.32)}" rx="2" fill="#fffaf0" stroke="${edge}" stroke-width="1.4"/>`
    + `<rect x="${f(w * 0.06)}" y="${f(-bh * 0.6)}" width="${f(w * 0.22)}" height="${f(bh * 0.6)}" rx="3" fill="#c99a62"/>`
    + `<rect x="${f(-w * 0.12)}" y="${f(-bh * 0.32)}" width="${f(w * 0.12)}" height="${f(bh * 0.18)}" rx="2" fill="#e8664a" stroke="#9b5f3a" stroke-width="1"/>`;
}

// てがみ（中心 0,0・はば s）
function letter(s) {
  return `<rect x="${f(-s / 2)}" y="${f(-s * 0.34)}" width="${f(s)}" height="${f(s * 0.68)}" rx="2" fill="#ffffff" stroke="${C.chestnut}" stroke-width="1.4"/>`
    + `<path d="M${f(-s / 2)},${f(-s * 0.34)} L0,${f(s * 0.05)} L${f(s / 2)},${f(-s * 0.34)}" fill="none" stroke="${C.chestnut}" stroke-width="1.4"/>`
    + `<circle cx="${f(s * 0.3)}" cy="${f(s * 0.14)}" r="${f(s * 0.08)}" fill="#e8664a"/>`;
}

export function createYubin(deps) {
  const R = {};
  return createGame(deps, {
    play: 'とどける',
    resultLabel: 'とどけたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 8, y: 6, w: W - 16, h: H - 12 }, cols, 10);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.3));
      const hh = Math.max(26, Math.min(110, cells[0].h - plateH - 6));
      const hw = Math.min(cells[0].w * 0.7, hh * 1.1);
      const doors = cells.map((c) => ({ cx: c.cx, cy: c.y + c.h - plateH - 2 }));
      const sk = Math.max(0.14, Math.min(0.42, hh / 230));
      Object.assign(g, { cells, plateH, hh, hw, doors, sk });
      let s = '';
      cells.forEach((c, i) => {
        s += `<g transform="translate(${f(doors[i].cx)} ${f(doors[i].cy)})"><g class="house" data-i="${i}">${house(hw, hh, i)}</g></g>`;
        s += plate(i, c.x + 4, c.y + c.h - plateH, c.w - 8, plateH, choices[i]).svg;
      });
      g.start = { x: g.W - 30, y: doors[0].cy };
      s += `<g class="yb-pos" transform="translate(${f(g.start.x)} ${f(g.start.y)})"><g class="yb-in" transform="scale(${f(sk)})"><g class="yb-cat">${catSitting(g.cat, { look: { x: -1, y: 0 } })}</g></g><g class="yb-letter" transform="translate(0 ${f(-30 * sk)})">${letter(Math.max(12, 70 * sk))}</g></g>`;
      return s;
    },
    after(g) {
      R.pos = g.svg.querySelector('.yb-pos');
      R.inn = g.svg.querySelector('.yb-in');
      R.cat = g.svg.querySelector('.yb-cat');
      R.letter = g.svg.querySelector('.yb-letter');
      g.at = { ...g.start };
    },
    async perform(g, decided, say) {
      const plan = visitPlan(g.n, decided);
      // 猫の足もとが いえの前（いえの右どなり）に来るように歩く
      const spot = (i) => ({ x: g.doors[i].cx + g.hw * 0.5 + 6, y: g.doors[i].cy - 78 * g.sk });
      const walk = async (to) => {
        const a = { ...g.at };
        const steps = 5;
        await frames(T.walk, (t) => {
          const e = ease.inOutSine(t);
          const hop = Math.abs(Math.sin(t * Math.PI * steps)) * 5;
          g.at = { x: a.x + (to.x - a.x) * e, y: a.y + (to.y - a.y) * e };
          R.pos.setAttribute('transform', `translate(${f(g.at.x)} ${f(g.at.y - hop)})`);
          const st = Math.floor(t * steps);
          if (st !== walk.st) { walk.st = st; audio.step(st); }
        });
      };
      for (let k = 0; k < plan.length; k++) {
        const i = plan[k];
        say(k === 0 ? 'てがみを とどけに いくよ' : 'つぎの いえへ…');
        await walk(spot(i));
        if (k === plan.length - 1) break;
        say('ここかな…？');
        audio.hover(k);
        await frames(T.look, (t) => R.inn.setAttribute('transform', `rotate(${f(Math.sin(t * Math.PI) * -14)}) scale(${f(g.sk)})`));
        R.inn.setAttribute('transform', `scale(${f(g.sk)})`);
      }
      // ゆうびんうけへ
      say('ここだ！');
      R.cat.innerHTML = catSitting(g.cat, { mood: 'happy', look: { x: -1, y: 0 } });
      const got = nearest(g.doors, g.at.x - g.hw * 0.5 - 6, g.at.y + 78 * g.sk); // 猫が止まった いえ
      const box = { x: g.doors[got].cx - g.hw * 0.06 - g.at.x, y: g.doors[got].cy - g.hh * 0.58 * 0.23 - g.at.y };
      await frames(T.post, (t) => {
        const e = ease.inOutSine(t);
        R.letter.setAttribute('transform', `translate(${f(box.x * e)} ${f(-30 * g.sk + (box.y + 30 * g.sk) * e - Math.sin(Math.PI * t) * 16)}) scale(${f(1 - 0.6 * e)})`);
      });
      R.letter.setAttribute('opacity', '0');
      audio.pop();
      // 窓が明るくなる
      const win = g.svg.querySelector(`.house[data-i="${got}"] .win`);
      await frames(T.light, (t) => win.setAttribute('fill', t > 0.5 ? '#ffe58a' : '#fffaf0'));
      return got;
    },
  });
}
