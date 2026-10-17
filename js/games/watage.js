// たんぽぽの わたげ（決め方：上から落ちて入る〈風で とぶ〉。見せ方の部品：花だんと名前の札）。
// 猫が たんぽぽを「ふーっ」と ふくと、わたげが とびちる。ひとつだけ光る わたげが、風に ゆられて
// あちこちの花だんの上を ただよい、さいごに おりた花だんに 小さな花が さく。その花だんの札が結果になる。
// かみひこうき（すーっと とぶ）とは、ゆっくり ゆれながら 落ちる所と、風で もどされる所が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が ふーっと ふき、わたげが いっせいに とんでいく。
// 2. 光る わたげが、ふわふわ ゆれながら 3〜4か所の花だんの上を ただよう。風が ふくと 横へ もどされる。
// 3. さいごは ゆっくり おりて、花が ぽんと さく。
// 結果は先に乱数で決め（RS01-S14）、ただよう道を、決めた花だんで終わるように組む。
import { C } from '../art.js';
import { catFace } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, nearest, wander, along, f } from './common.js';

export function driftPlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 3 : 3 + Math.floor(rand() * 2), decided, rand);
}
export const T = { blow: 900, drift: 3600, bloom: 500 };
export const watageDuration = () => T.blow + T.drift + T.bloom;

// わたげ（中心 0,0・大きさ s）
function seed(s, glow = false) {
  let rays = '';
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * 0.3;
    rays += `<path d="M0,${f(s * 0.3)} L${f(Math.cos(a) * s * 0.5)},${f(Math.sin(a) * s * 0.5)}" stroke="#c9c1b0" stroke-width="1"/>`;
  }
  return (glow ? `<circle r="${f(s * 0.62)}" fill="#fff3b8" opacity="0.6"/>` : '')
    + rays + `<circle cx="0" cy="${f(-s * 0.08)}" r="${f(s * 0.36)}" fill="#ffffff" opacity="0.85"/>`
    + `<path d="M0,${f(s * 0.3)} v${f(s * 0.3)}" stroke="#b9a46c" stroke-width="1.6"/><ellipse cx="0" cy="${f(s * 0.66)}" rx="${f(s * 0.06)}" ry="${f(s * 0.1)}" fill="#a0703f"/>`;
}

// たんぽぽの花（中心 0,0・半径 r）
function flower(r) {
  let p = '';
  for (let k = 0; k < 12; k++) p += `<ellipse cx="0" cy="${f(-r * 0.6)}" rx="${f(r * 0.2)}" ry="${f(r * 0.45)}" fill="#f6d55e" stroke="#e0b030" stroke-width="1" transform="rotate(${k * 30})"/>`;
  return p + `<circle r="${f(r * 0.35)}" fill="#f2b53a"/>`;
}

export function createWatage(deps) {
  const R = {};
  return createGame(deps, {
    play: 'ふーっ',
    resultLabel: 'さいたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const skyH = Math.max(66, Math.min(130, H * 0.24));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 8, y: skyH + 4, w: W - 16, h: H - skyH - 10 }, cols, 8);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.34));
      const beds = cells.map((c) => ({ cx: c.cx, cy: Math.max(c.y + (c.h - plateH) * 0.62, c.y + c.h - plateH - 24) })); // 札の すぐ上
      const ss = Math.max(14, Math.min(30, cells[0].w * 0.2));
      const head = { x: W * 0.3, y: skyH * 0.42 };
      Object.assign(g, { cells, plateH, beds, ss, skyH, head });
      let s = `<path d="M${f(head.x)},${f(head.y + 8)} Q${f(head.x - 8)},${f(skyH * 0.8)} ${f(head.x + 4)},${f(skyH + 6)}" stroke="#86a256" stroke-width="3" fill="none"/>`;
      cells.forEach((c, i) => {
        const b = beds[i];
        const rx = Math.min(c.w * 0.38, 44);
        const ry = Math.max(6, Math.min(14, (c.h - plateH) * 0.2));
        s += `<ellipse cx="${f(b.cx)}" cy="${f(b.cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#e9c591" stroke="#c99a62" stroke-width="2"/>`
          + [-0.6, -0.2, 0.25, 0.62].map((d, k) => `<path d="M${f(b.cx + d * rx)},${f(b.cy - 1)} l${k % 2 ? 3 : -3},${f(-ry * 0.9)}" stroke="#86a256" stroke-width="2" stroke-linecap="round"/>`).join('')
          + `<g class="bloom" data-i="${i}" transform="translate(${f(b.cx)} ${f(b.cy - ry * 0.6)}) scale(0)">${flower(Math.max(8, Math.min(20, rx * 0.36)))}</g>`;
        s += plate(i, c.x + 4, c.y + c.h - plateH, c.w - 8, plateH, choices[i]).svg;
      });
      // わたげの玉（いくつかの わたげ）と猫
      s += '<g class="puff">';
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        s += `<g transform="translate(${f(head.x + Math.cos(a) * ss * 0.55)} ${f(head.y + Math.sin(a) * ss * 0.55)})"><g class="ws"><g transform="rotate(${f((a * 180) / Math.PI + 90)})">${seed(ss * 0.7)}</g></g></g>`;
      }
      s += `</g><circle cx="${f(head.x)}" cy="${f(head.y + 4)}" r="${f(ss * 0.18)}" fill="#a3bd6e" stroke="#86a256" stroke-width="1.4"/><g class="hero" transform="translate(${f(head.x)} ${f(head.y)})"><g transform="scale(1.4)">${seed(ss, true)}</g></g>`;
      const fs = skyH / 150;
      s += `<g transform="translate(${f(head.x + 56 * fs + 30)} ${f(head.y + 10)}) scale(${f(fs)})"><g class="wt-face">${catFace(g.cat, { look: { x: -1, y: 0 } })}</g></g><g class="wind"></g>`;
      return s;
    },
    after(g) {
      R.hero = g.svg.querySelector('.hero');
      R.puff = Array.from(g.svg.querySelectorAll('.ws'));
      R.face = g.svg.querySelector('.wt-face');
      R.wind = g.svg.querySelector('.wind');
    },
    async perform(g, decided, say) {
      const { W, H } = g;
      say('ふーっ！');
      R.face.innerHTML = catFace(g.cat, { mood: 'strain', look: { x: -1, y: 0 } });
      audio.stretch(T.blow / 1000);
      // 1. ほかの わたげが いっせいに とぶ
      R.puff.forEach((el, k) => {
        const dx = -60 - Math.random() * 120 + (k % 3) * 40;
        const dy = -40 - Math.random() * 90 + k * 8;
        el.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${f(dx)}px,${f(dy)}px)`, opacity: 0 }], { duration: 1600 + k * 120, easing: 'ease-out', fill: 'forwards' });
      });
      await wait(T.blow);
      R.face.innerHTML = catFace(g.cat, { look: { x: -1, y: 0.6 } });
      // 2. 光る わたげが ただよう
      const plan = driftPlan(g.n, decided);
      const pts = [g.head, { x: Math.min(W - 20, g.head.x + W * 0.3), y: Math.max(10, g.head.y - 20) }];
      plan.forEach((i, k) => {
        const b = g.beds[i];
        const last = k === plan.length - 1;
        pts.push({ x: b.cx, y: last ? b.cy - g.ss * 0.6 : Math.min(H - 20, b.cy - Math.max(24, g.cells[0].h * 0.42)) });
      });
      say('ふわ ふわ…');
      let blew = 0;
      let said = 0;
      await frames(T.drift, (t) => {
        const u = t < 0.8 ? t * 0.88 / 0.8 : 0.88 + 0.12 * ease.outCubic((t - 0.8) / 0.2);
        const p = along(pts, u);
        const sway = Math.sin(t * Math.PI * 7) * 8 * (1 - u);
        R.hero.setAttribute('transform', `translate(${f(p.x + sway)} ${f(p.y)}) rotate(${f(sway * 2)})`);
        if (Math.floor(t * 3) > blew) { blew = Math.floor(t * 3); gust(p); audio.slide(0.25); }
        if (u > 0.6 && !said) { said = 1; say('どこに おりるかな…'); audio.heart(); }
      });
      // 3. おりて 花が さく
      const end = along(pts, 1);
      const got = nearest(g.beds, end.x, end.y + g.ss * 0.6); // わたげが おりた花だん
      R.hero.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      const bloom = g.svg.querySelector(`.bloom[data-i="${got}"]`);
      const base = bloom.getAttribute('transform').replace(/ scale\([^)]*\)/, '');
      audio.pop();
      await frames(T.bloom, (t) => bloom.setAttribute('transform', `${base} scale(${f(ease.outBack(t))})`));
      R.face.innerHTML = catFace(g.cat, { mood: 'happy', look: { x: -1, y: 0.6 } });
      return got;
    },
  });

  function gust(p) {
    const d = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    d.setAttribute('d', `M${f(p.x - 46)},${f(p.y - 10)} q18,-8 36,0 t36,0`);
    d.setAttribute('stroke', '#b5d0e0');
    d.setAttribute('stroke-width', '3');
    d.setAttribute('fill', 'none');
    d.setAttribute('stroke-linecap', 'round');
    R.wind.appendChild(d);
    d.animate([{ transform: 'translateX(0)', opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { transform: 'translateX(36px)', opacity: 0 }], { duration: 700 }).onfinish = () => d.remove();
  }
}
