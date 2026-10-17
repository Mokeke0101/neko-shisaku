// ねこの ボウリング（決め方：当てる〈のこった ピン〉。見せ方の部品：ピンと名前の札）。
// 猫が 毛糸玉を ころがすと、選択肢ごとの ピンが つぎつぎに たおれていく。さいごまで 立っていた ピンの札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が 毛糸玉を ころがし、玉が ピンの間を ころころ 進む。
// 2. 玉の近くの ピンから、ぱたぱたと たおれていく（はじめは はやく、だんだん ゆっくり）。
// 3. のこり1本が ぐらぐら ゆれて、たおれそうになってから、もちこたえる。
// 結果は先に乱数で決め（RS01-S14）、たおれる順を、決めた ピンが のこるように組む。
import { C } from '../art.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, f } from './common.js';

// たおれる順：決めた ピン以外を、玉の通り道 (x, y) に近い順に。少しだけ順を入れかえる
export function fallOrder(pins, decided, from, rand = Math.random) {
  return pins.map((p, i) => ({ i, d: Math.hypot(p.cx - from.x, p.cy - from.y) * (0.8 + rand() * 0.4) }))
    .filter((p) => p.i !== decided).sort((a, b) => a.d - b.d).map((p) => p.i);
}
export const fallGap = (k, total) => 140 + 420 * Math.pow(total <= 1 ? 1 : k / (total - 1), 2);
export const T = { aim: 800, roll: 1300, fall: 260, wobble: 1300, settle: 300 };
export function bowlingDuration(n) {
  let s = T.aim + T.roll;
  for (let k = 0; k < n - 1; k++) s += fallGap(k, n - 1);
  return s + T.wobble + T.settle;
}

// ピン（足もと 0,0 から上へ、高さ h）
function pin(h, k) {
  const band = ['#e8664a', '#6f9fcb', '#86a256', '#e391ad'][k % 4];
  const w = h * 0.36;
  return `<ellipse cx="0" cy="0" rx="${f(w * 0.7)}" ry="${f(h * 0.06)}" fill="#a0703f" opacity="0.18"/>`
    + `<path d="M0,${f(-h)} C${f(w * 0.42)},${f(-h)} ${f(w * 0.42)},${f(-h * 0.7)} ${f(w * 0.22)},${f(-h * 0.62)} C${f(w * 0.6)},${f(-h * 0.45)} ${f(w * 0.56)},${f(-h * 0.1)} ${f(w * 0.3)},0 L${f(-w * 0.3)},0 C${f(-w * 0.56)},${f(-h * 0.1)} ${f(-w * 0.6)},${f(-h * 0.45)} ${f(-w * 0.22)},${f(-h * 0.62)} C${f(-w * 0.42)},${f(-h * 0.7)} ${f(-w * 0.42)},${f(-h)} 0,${f(-h)} Z" fill="#fffaf0" stroke="#c9b9a4" stroke-width="1.8"/>`
    + `<path d="M${f(-w * 0.27)},${f(-h * 0.62)} H${f(w * 0.27)}" stroke="${band}" stroke-width="${f(Math.max(2, h * 0.07))}"/>`
    + `<circle cx="${f(-w * 0.08)}" cy="${f(-h * 0.84)}" r="${f(h * 0.035)}" fill="#4a3a33"/><circle cx="${f(w * 0.08)}" cy="${f(-h * 0.84)}" r="${f(h * 0.035)}" fill="#4a3a33"/>`;
}

// 毛糸玉（中心 0,0・半径 r）
function yarn(r) {
  return `<circle r="${f(r)}" fill="#f4a7a3" stroke="#d97f7a" stroke-width="2"/>`
    + `<path d="M${f(-r * 0.8)},${f(-r * 0.3)} Q0,${f(-r * 1.1)} ${f(r * 0.8)},${f(-r * 0.3)} M${f(-r * 0.9)},${f(r * 0.2)} Q0,${f(-r * 0.6)} ${f(r * 0.9)},${f(r * 0.2)} M${f(-r * 0.6)},${f(r * 0.7)} Q0,0 ${f(r * 0.6)},${f(r * 0.7)}" stroke="#d97f7a" stroke-width="1.4" fill="none"/>`;
}

export function createBowling(deps) {
  const R = {};
  return createGame(deps, {
    play: 'ころがす',
    resultLabel: 'のこったのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const laneH = Math.max(52, Math.min(110, H * 0.2));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 8, y: 6, w: W - 16, h: H - laneH - 12 }, cols, 8);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.34));
      const ph = Math.max(22, Math.min(84, cells[0].h - plateH - 4));
      const pins = cells.map((c) => ({ cx: c.cx, cy: c.y + c.h - plateH - 2 }));
      const br = Math.max(8, Math.min(18, laneH * 0.16));
      Object.assign(g, { cells, plateH, ph, pins, br, laneH, start: { x: W * 0.5, y: H - laneH * 0.3 } });
      let s = `<rect x="${f(W * 0.5 - laneH * 0.55)}" y="${f(H - laneH - 6)}" width="${f(laneH * 1.1)}" height="${f(laneH + 4)}" rx="10" fill="#f6dcb4" stroke="#e2bd87" stroke-width="2"/>`
        + `<path d="M${f(W * 0.5)},${f(H - laneH)} v${f(laneH - 10)}" stroke="#e2bd87" stroke-width="2" stroke-dasharray="5 6"/>`;
      cells.forEach((c, i) => {
        s += plate(i, c.x + 4, c.y + c.h - plateH, c.w - 8, plateH, choices[i]).svg;
        s += `<g transform="translate(${f(pins[i].cx)} ${f(pins[i].cy)})"><g class="pin" data-i="${i}">${pin(ph, i)}</g></g>`;
      });
      const sk = laneH / 210;
      s += `<g transform="translate(${f(W * 0.5 + laneH * 0.95)} ${f(H - laneH * 0.45)}) scale(${f(sk)})"><g class="bw-cat">${catSitting(g.cat, { look: { x: -0.6, y: -1 } })}</g></g>`;
      s += `<g class="ball" transform="translate(${f(g.start.x)} ${f(g.start.y)})"><g class="ball-in">${yarn(br)}</g></g>`;
      return s;
    },
    after(g) {
      R.pins = Array.from(g.svg.querySelectorAll('.pin'));
      R.ball = g.svg.querySelector('.ball');
      R.ballIn = g.svg.querySelector('.ball-in');
      R.cat = g.svg.querySelector('.bw-cat');
    },
    async perform(g, decided, say) {
      const { n } = g;
      // 1. ねらって ころがす
      say('ねらって…');
      audio.aim(0);
      await frames(T.aim, (t) => R.ball.setAttribute('transform', `translate(${f(g.start.x + Math.sin(t * Math.PI * 2) * 8)} ${f(g.start.y)})`));
      say('ころころ…');
      const end = { x: g.W * (0.3 + Math.random() * 0.4), y: g.cells[0].y + 4 };
      const dx = end.x - g.start.x;
      let rolled = 0;
      await frames(T.roll, (t) => {
        const e = ease.outCubic(t);
        R.ball.setAttribute('transform', `translate(${f(g.start.x + dx * e + Math.sin(e * Math.PI * 2) * 10)} ${f(g.start.y + (end.y - g.start.y) * e)})`);
        R.ballIn.setAttribute('transform', `rotate(${f(e * 720)})`);
        if (Math.floor(e * 8) > rolled) { rolled = Math.floor(e * 8); audio.roll(rolled); }
      });
      R.ball.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      // 2. たおれていく
      say('ぱたぱた…');
      const order = fallOrder(g.pins, decided, { x: end.x, y: (end.y + g.start.y) / 2 });
      for (let k = 0; k < order.length; k++) {
        const i = order[k];
        const dir = g.pins[i].cx < end.x ? -1 : 1;
        R.pins[i].dataset.down = '1';
        audio.ping(k, dir);
        R.pins[i].animate([{ transform: 'rotate(0deg) scale(1, 1)', opacity: 1 }, { transform: `rotate(${dir * 14}deg) scale(1.05, 0.28)`, opacity: 0.4 }], { duration: T.fall, easing: 'ease-in', fill: 'forwards' }); // うしろへ ぱたんと たおれる（となりの札に かからない）
        g.svg.querySelector(`.cell[data-i="${i}"]`).setAttribute('opacity', '0.5');
        await wait(fallGap(k, n - 1));
      }
      // 3. のこり1本が ぐらぐら
      say('ぐらぐら…！');
      audio.heart();
      const stand = R.pins.find((el) => el.dataset.down !== '1');
      await frames(T.wobble, (t) => stand.setAttribute('transform', `rotate(${f(Math.sin(t * Math.PI * 4) * 24 * (1 - t))})`));
      stand.removeAttribute('transform');
      await wait(T.settle);
      R.cat.innerHTML = catSitting(g.cat, { mood: 'happy', look: { x: -0.6, y: -1 } });
      return Number(stand.dataset.i); // さいごまで 立っていた ピン
    },
  });
}
