// ねこの ゆうびんやさん（決め方：道をたどる〈とどける〉。見せ方の部品：いえと名前の札〈ゆうびんうけ〉）。
// ゆうびんやさんの猫が てがみを もって、選択肢ごとの いえを たずねて歩く。いえの前で「ここかな？」と見ては、
// 次の いえへ。さいごに てがみを ゆうびんうけに入れた いえの札が結果になる。いえの窓に あかりが ともる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が とことこ 歩いて、いえの前で止まり、首を かしげる（3〜4けん）。
// 2. さいごの いえで うなずいて、てがみを ゆうびんうけへ。
// 3. いえの窓が ぽっと明るくなる。
// 結果は先に乱数で決め（RS01-S14）、たずねる順を、決めた いえで終わるように組む。
// v17 の後（テーマパーク）：おもちゃの まちの ジオラマ台（ミントの 台に あつみ）と 小道。いえは 横の かべで あつみ。名前は パステルの札（common.js の plate）。
// 動きの ちがい（3B：4つ）：ふつう・かぜ（てがみが とばされる）・ピンポン（よびりんを ならすと るすだった）・
// ちがった（ゆうびんうけに 入れかけて「あっ、ちがった」）。
import { C } from '../art.js';
import { catSitting, catName } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, nearest, wander, TINTS, f } from './common.js';

export function visitPlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 3 : 3 + Math.floor(rand() * 2), decided, rand);
}
export const T = { walk: 820, look: 460, post: 600, light: 400 };
// 動きの ちがい かぜ：風で てがみが とばされ、ぴょんと とんで つかまえる
export const GUST = 640;
export const yubinDuration = (visits, gust = false) => visits * T.walk + (visits - 1) * T.look + T.post + T.light + 200 + (gust ? GUST : 0);

// いえ（下のまん中 0,0 から上へ・はば w・高さ h）
function house(w, h, k) {
  const [col, edge] = TINTS[k % TINTS.length];
  const roof = ['#e8664a', '#6f9fcb', '#86a256', '#a985c9', '#db8f4a'][k % 5];
  const bh = h * 0.58;
  return `<path d="M${f(w * 0.42)},${f(-bh + 2)} l${f(w * 0.08)},${f(-w * 0.06)} V${f(-w * 0.06)} l${f(-w * 0.08)},${f(w * 0.06)} Z" fill="${edge}" opacity="0.8"/>`
    + `<rect x="${f(-w * 0.42)}" y="${f(-bh)}" width="${f(w * 0.84)}" height="${f(bh)}" rx="3" fill="${col}" stroke="${edge}" stroke-width="2"/>`
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
      const cells = grid(n, { x: 4, y: 6, w: W - 8, h: H - 12 }, cols, 6);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.3));
      const hh = Math.max(26, Math.min(110, cells[0].h - plateH - 6));
      const hw = Math.min(cells[0].w * 0.7, hh * 1.1);
      const doors = cells.map((c) => ({ cx: c.cx, cy: c.y + c.h - plateH - 2 }));
      const sk = Math.max(0.16, Math.min(0.56, hh / 175));
      Object.assign(g, { cells, plateH, hh, hw, doors, sk });
      let s = `<rect x="4" y="11" width="${W - 8}" height="${f(H - 14)}" rx="16" fill="#6fb39b" opacity="0.25"/>`
        + `<rect x="4" y="9" width="${W - 8}" height="${f(H - 14)}" rx="16" fill="#a9dcc9" stroke="#6fb39b" stroke-width="2"/>`
        + `<rect x="4" y="4" width="${W - 8}" height="${f(H - 14)}" rx="16" fill="#e3f4ec" stroke="#6fb39b" stroke-width="2.4"/>`
        + `<rect x="12" y="8" width="${W - 24}" height="4" rx="2" fill="#ffffff" opacity="0.6"/>`;
      // いえの前の 小道
      cells.forEach((c, i) => { s += `<rect x="${f(c.x + 2)}" y="${f(doors[i].cy - 4)}" width="${f(c.w - 4)}" height="8" rx="4" fill="#fbe9d0" stroke="#e3bb84" stroke-width="1.2"/>`; });
      cells.forEach((c, i) => {
        s += `<g transform="translate(${f(doors[i].cx)} ${f(doors[i].cy)})"><g class="house" data-i="${i}">${house(hw, hh, i)}</g></g>`;
        // いえの よこの 木（かざり。となりの いえに かからない所）
        if (i % 2 === 0) s += `<g transform="translate(${f(doors[i].cx - hw * 0.62)} ${f(doors[i].cy)})"><path d="M0,0 V${f(-hh * 0.3)}" stroke="#9b5f3a" stroke-width="2.4"/><circle cy="${f(-hh * 0.4)}" r="${f(hh * 0.13)}" fill="#a3bd6e" stroke="#86a256" stroke-width="1.6"/></g>`;
        s += plate(i, c.x, c.y + c.h - plateH, c.w, plateH, choices[i]).svg;
      });
      g.start = { x: g.W - 30, y: doors[0].cy };
      s += `<g class="yb-pos" transform="translate(${f(g.start.x)} ${f(g.start.y)})"><g class="yb-in" transform="scale(${f(sk)})"><g class="yb-cat">${catSitting(g.cat, { look: { x: -1, y: 0 } })}</g>`
        // ゆうびやさんの ぼうしと かばん
        + `<path d="M-30,-58 Q0,-92 30,-58 Z" fill="#6f9fcb" stroke="#4f78a3" stroke-width="3"/><path d="M-38,-56 H34 q8,0 8,6 H-38 Z" fill="#4f78a3"/><circle cy="-70" r="6" fill="#fde3a6" stroke="#d9b04d" stroke-width="2"/>`
        + `<path d="M-30,10 L30,46" stroke="#9b5f3a" stroke-width="5"/><rect x="18" y="38" width="38" height="30" rx="6" fill="#d9a066" stroke="#9b5f3a" stroke-width="3"/><path d="M18,48 H56" stroke="#9b5f3a" stroke-width="3"/></g><g class="yb-letter" transform="translate(${f(46 * sk)} ${f(14 * sk)})">${letter(Math.max(12, 70 * sk))}</g></g>`;
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
      const vr = Math.random();
      const variant = vr < 0.25 && plan.length >= 3 ? 'gust' : vr < 0.5 ? 'pinpon' : vr < 0.75 ? 'chigau' : 'plain';
      g.stage.dataset.variant = variant;
      // かぜ：てがみが とばされる（1けん目の後）
      const gust = variant === 'gust';
      for (let k = 0; k < plan.length; k++) {
        const i = plan[k];
        say(k === 0 ? `${catName(g.cat)}が てがみを とどけに いくよ` : 'つぎの いえへ…');
        await walk(spot(i));
        if (gust && k === 1) {
          say('あっ！ てがみが とんだ！');
          audio.toss();
          const ly = 14 * g.sk;
          const lx = 46 * g.sk;
          await frames(GUST * 0.55, (t) => R.letter.setAttribute('transform', `translate(${f(lx - Math.sin(t * Math.PI) * 24)} ${f(ly - t * 60)}) rotate(${f(t * 300)})`));
          say('ぴょん！ セーフ');
          audio.hop(2);
          await frames(GUST * 0.45, (t) => {
            R.inn.setAttribute('transform', `translate(0 ${f(-Math.sin(Math.PI * t) * 40)}) scale(${f(g.sk)})`);
            R.letter.setAttribute('transform', `translate(${f(lx)} ${f(ly - 60 * (1 - t))}) rotate(${f(300 * (1 - t))})`);
          });
          R.inn.setAttribute('transform', `scale(${f(g.sk)})`);
          R.letter.setAttribute('transform', `translate(${f(lx)} ${f(ly)})`);
        }
        if (k === plan.length - 1) break;
        if (variant === 'pinpon' && k === 0) {
          // ピンポン：よびりんを ならすと、窓が ぱっと ついて、すぐ きえる（るす）
          say('ピンポーン');
          audio.bell(88, 0, 0.12);
          audio.bell(84, 0.25, 0.12);
          const w0 = g.svg.querySelector(`.house[data-i="${i}"] .win`);
          await wait(300);
          w0.setAttribute('fill', '#ffe58a');
          await wait(200);
          w0.setAttribute('fill', '#fffaf0');
          say('…るす みたい');
          await wait(200);
          continue;
        }
        if (variant === 'chigau' && k === plan.length - 2) {
          // ちがった：ゆうびんうけに 入れかけて、ひっこめる
          const lx = 46 * g.sk;
          const ly = 14 * g.sk;
          const bx = g.doors[i].cx - g.hw * 0.06 - g.at.x;
          const by = g.doors[i].cy - g.hh * 0.58 * 0.23 - g.at.y;
          say('ここだ！… ');
          await frames(360, (t) => R.letter.setAttribute('transform', `translate(${f(lx + (bx - lx) * 0.8 * ease.inOutSine(t))} ${f(ly + (by - ly) * 0.8 * ease.inOutSine(t))})`));
          R.cat.innerHTML = catSitting(g.cat, { mood: 'strain', look: { x: -1, y: 0 } });
          say('あっ、ちがった');
          audio.heart();
          await frames(300, (t) => R.letter.setAttribute('transform', `translate(${f(lx + (bx - lx) * 0.8 * (1 - t))} ${f(ly + (by - ly) * 0.8 * (1 - t))})`));
          R.cat.innerHTML = catSitting(g.cat, { look: { x: -1, y: 0 } });
          continue;
        }
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
        R.letter.setAttribute('transform', `translate(${f(46 * g.sk + (box.x - 46 * g.sk) * e)} ${f(14 * g.sk + (box.y - 14 * g.sk) * e - Math.sin(Math.PI * t) * 16)}) scale(${f(1 - 0.6 * e)})`);
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
