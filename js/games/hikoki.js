// かみひこうき（決め方：上から落ちて入る〈とんで おりる〉。見せ方の部品：おりる場所と名前の札）。
// 猫が かみひこうきを とばすと、風に のって あちこちの上を とび、さいごに1つの場所へ すーっと おりる。
// おりた場所の札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が かまえて、ひこうきを ぽいっと とばす。
// 2. ひこうきが 風に のって、3〜4か所の上を ふわっと とおる（おりそうで おりない）。
// 3. さいごは ゆっくり すべるように おりて、ぴたっと止まる。
// 結果は先に乱数で決め（RS01-S14）、とぶ道を、決めた場所で終わるように組む。
import { C } from '../art.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, nearest, wander, along, f } from './common.js';

// 上を とおる場所の並び（最後が決めた場所）
export function flightPlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 3 : 3 + Math.floor(rand() * 2), decided, rand);
}
export const T = { ready: 600, fly: 3600, skid: 360 };
export const hikokiDuration = () => T.ready + T.fly + T.skid;

// かみひこうき（中心 0,0・右を向く・大きさ s）
function plane(s) {
  return `<path d="M${f(s * 0.6)},0 L${f(-s * 0.5)},${f(-s * 0.36)} L${f(-s * 0.26)},0 Z" fill="#ffffff" stroke="#9fbdd0" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<path d="M${f(s * 0.6)},0 L${f(-s * 0.5)},${f(s * 0.3)} L${f(-s * 0.26)},0 Z" fill="#e3eef6" stroke="#9fbdd0" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<path d="M${f(s * 0.6)},0 L${f(-s * 0.36)},${f(s * 0.08)}" stroke="#9fbdd0" stroke-width="1.2"/>`;
}

export function createHikoki(deps) {
  const R = {};
  return createGame(deps, {
    play: 'とばす',
    resultLabel: 'おりたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const skyH = Math.max(60, Math.min(120, H * 0.22));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 8, y: skyH + 4, w: W - 16, h: H - skyH - 10 }, cols, 8);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.34));
      const mats = cells.map((c) => ({ cx: c.cx, cy: Math.max(c.y + (c.h - plateH) * 0.55, c.y + c.h - plateH - 30) })); // 札の すぐ上
      const ps = Math.max(18, Math.min(40, cells[0].w * 0.26));
      const sk = skyH / 190;
      Object.assign(g, { cells, plateH, mats, ps, skyH, sk, start: { x: 40 + 70 * sk, y: skyH * 0.45 } });
      let s = '';
      cells.forEach((c, i) => {
        const m = mats[i];
        const rx = Math.min(c.w * 0.36, 40);
        const ry = Math.max(6, Math.min(14, (c.h - plateH) * 0.18));
        s += `<ellipse cx="${f(m.cx)}" cy="${f(m.cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#e4efd2" stroke="#a3bd6e" stroke-width="2"/>`
          + `<ellipse cx="${f(m.cx)}" cy="${f(m.cy)}" rx="${f(rx * 0.5)}" ry="${f(ry * 0.5)}" fill="none" stroke="#a3bd6e" stroke-width="1.6" stroke-dasharray="3 4"/>`;
        s += plate(i, c.x + 4, c.y + c.h - plateH, c.w - 8, plateH, choices[i]).svg;
      });
      s += `<g transform="translate(${f(40)} ${f(skyH * 0.52)}) scale(${f(sk)})"><g class="hk-cat">${catSitting(g.cat, { look: { x: 1, y: 0 } })}</g></g>`;
      s += `<g class="wind"></g><g class="plane" transform="translate(${f(g.start.x)} ${f(g.start.y)})">${plane(ps)}</g>`;
      return s;
    },
    after(g) {
      R.plane = g.svg.querySelector('.plane');
      R.cat = g.svg.querySelector('.hk-cat');
      R.wind = g.svg.querySelector('.wind');
    },
    async perform(g, decided, say) {
      const { W } = g;
      say('せーの…');
      audio.wiggle(0);
      await frames(T.ready, (t) => R.plane.setAttribute('transform', `translate(${f(g.start.x - Math.sin(t * Math.PI) * 10)} ${f(g.start.y + Math.sin(t * Math.PI) * 4)}) rotate(${f(-20 * Math.sin(t * Math.PI))})`));
      // 道：とばした所 → 高く上がる → 場所の上を とおる → 決めた場所へ おりる
      const plan = flightPlan(g.n, decided);
      const pts = [g.start, { x: W * 0.55, y: Math.max(8, g.skyH * 0.2) }];
      plan.forEach((i, k) => {
        const m = g.mats[i];
        const last = k === plan.length - 1;
        pts.push({ x: m.cx + (last ? 0 : (k % 2 ? 1 : -1) * 14), y: last ? m.cy : m.cy - Math.max(30, g.cells[0].h * 0.55) });
      });
      // 最後の1つ前に、決めた場所の上（高い所）を足して、すーっと おりるようにする
      const fin = g.mats[decided];
      pts.splice(pts.length - 1, 0, { x: fin.cx - g.ps * 1.6, y: fin.cy - Math.max(26, g.cells[0].h * 0.4) });
      say('ひゅーん…');
      audio.toss();
      R.cat.innerHTML = catSitting(g.cat, { look: { x: 1, y: 0.4 } });
      let said = 0;
      let blew = 0;
      await frames(T.fly, (t) => {
        const u = t < 0.82 ? t * 0.9 / 0.82 : 0.9 + 0.1 * ease.outCubic((t - 0.82) / 0.18);
        const p = along(pts, u);
        const deg = Math.max(-50, Math.min(50, (p.a * 180) / Math.PI));
        R.plane.setAttribute('transform', `translate(${f(p.x)} ${f(p.y)}) rotate(${f(deg)})`);
        if (u > 0.5 && !said) { said = 1; say('どこに おりるかな…'); audio.heart(); }
        if (Math.floor(t * 4) > blew) { blew = Math.floor(t * 4); gust(g, p); audio.slide(0.3); }
      });
      // ぴたっと止まる
      const end = along(pts, 1);
      audio.step(1);
      await frames(T.skid, (t) => R.plane.setAttribute('transform', `translate(${f(end.x + Math.sin(t * Math.PI) * 4)} ${f(end.y)}) rotate(${f(-6 * (1 - t))})`));
      R.cat.innerHTML = catSitting(g.cat, { mood: 'happy', look: { x: 1, y: 0.6 } });
      return nearest(g.mats, end.x, end.y); // ひこうきが おりた場所
    },
  });

  // 風の すじ
  function gust(g, p) {
    const d = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    d.setAttribute('d', `M${f(p.x - 50)},${f(p.y + 12)} q20,-8 40,0 t40,0`);
    d.setAttribute('stroke', '#b5d0e0');
    d.setAttribute('stroke-width', '3');
    d.setAttribute('fill', 'none');
    d.setAttribute('stroke-linecap', 'round');
    R.wind.appendChild(d);
    d.animate([{ transform: 'translateX(0)', opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { transform: 'translateX(40px)', opacity: 0 }], { duration: 700 }).onfinish = () => d.remove();
  }
}
