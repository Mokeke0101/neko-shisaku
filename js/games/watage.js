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
import { look as nowLook } from '../look.js';
import { warmDay } from '../kits.js';
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
  return (glow ? `<circle r="${f(s * 0.7)}" fill="#fff3b8" opacity="0.85" stroke="#f2c95e" stroke-width="1.6"/>` : '')
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
      const skyH = Math.max(70, Math.min(150, H * 0.26));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 4, y: skyH + 4, w: W - 8, h: H - skyH - 10 }, cols, 6);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.34));
      const beds = cells.map((c) => ({ cx: c.cx, cy: Math.max(c.y + (c.h - plateH) * 0.62, c.y + c.h - plateH - 24) })); // 札の すぐ上
      const ss = Math.max(16, Math.min(40, cells[0].w * 0.28));
      const head = { x: W * 0.2, y: skyH * 0.5 };
      Object.assign(g, { cells, plateH, beds, ss, skyH, head });
      let s = `<path d="M${f(head.x)},${f(head.y + 8)} Q${f(head.x - 8)},${f(skyH * 0.8)} ${f(head.x + 4)},${f(skyH + 6)}" stroke="#86a256" stroke-width="3" fill="none"/>`;
      cells.forEach((c, i) => {
        const b = beds[i];
        const rx = Math.min(c.w * 0.44, 54);
        const ry = Math.max(6, Math.min(14, (c.h - plateH) * 0.2));
        s += `<ellipse cx="${f(b.cx)}" cy="${f(b.cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#e9c591" stroke="#c99a62" stroke-width="2"/>`
          + [-0.6, -0.2, 0.25, 0.62].map((d, k) => `<path d="M${f(b.cx + d * rx)},${f(b.cy - 1)} l${k % 2 ? 3 : -3},${f(-ry * 0.9)}" stroke="#86a256" stroke-width="2" stroke-linecap="round"/>`).join('')
          + `<g class="bloom" data-i="${i}" transform="translate(${f(b.cx)} ${f(b.cy - ry * 0.6)}) scale(0)">${flower(Math.max(8, Math.min(20, rx * 0.36)))}</g>`;
        s += plate(i, c.x, c.y + c.h - plateH, c.w, plateH, choices[i]).svg;
      });
      // わたげの玉（いくつかの わたげ）と猫
      s += '<g class="puff">';
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        s += `<g transform="translate(${f(head.x + Math.cos(a) * ss * 0.55)} ${f(head.y + Math.sin(a) * ss * 0.55)})"><g class="ws"><g transform="rotate(${f((a * 180) / Math.PI + 90)})">${seed(ss * 0.7)}</g></g></g>`;
      }
      s += `</g><circle cx="${f(head.x)}" cy="${f(head.y + 4)}" r="${f(ss * 0.18)}" fill="#a3bd6e" stroke="#86a256" stroke-width="1.4"/><g class="hero" transform="translate(${f(head.x)} ${f(head.y)})"><g transform="scale(1.6)">${seed(ss, true)}</g></g>`;
      // 空の はしの 小さな たんぽぽ（かざり）と、てんとうむし
      [[W * 0.06, 0.95, 0.8], [W * 0.94, 0.9, 1], [W * 0.86, 0.98, 0.7]].forEach(([x, yk, k]) => {
        s += `<path d="M${f(x)},${f(skyH * yk + 6)} V${f(skyH * yk - 18 * k)}" stroke="#86a256" stroke-width="2"/><g transform="translate(${f(x)} ${f(skyH * yk - 20 * k)})">${flower(7 * k)}</g>`;
      });
      // てんとうむしは あたたかい季節の昼だけ（v13）。冬・夜・秋は、動かない すがたを 消しておく
      s += `<g transform="translate(${f(W * 0.9)} ${f(skyH * 0.3)})"${warmDay(nowLook) ? '' : ' visibility="hidden"'}><g class="wt-bug"><ellipse rx="7" ry="6" fill="#e8664a" stroke="#9b3b2a" stroke-width="1.4"/><path d="M0,-6 V6" stroke="#9b3b2a" stroke-width="1.2"/><circle cx="-3" cy="-1" r="1.4" fill="#4a3a33"/><circle cx="3" cy="2" r="1.4" fill="#4a3a33"/><circle cx="0" cy="-7" r="3" fill="#4a3a33"/></g></g>`;
      const fs = skyH / 120;
      s += `<g transform="translate(${f(head.x + 50 * fs + 44)} ${f(Math.max(48 * fs, head.y))}) scale(${f(fs)})"><g class="wt-face">${catFace(g.cat, { look: { x: -1, y: 0 } })}</g></g><g class="wind"></g>`;
      return s;
    },
    after(g) {
      R.hero = g.svg.querySelector('.hero');
      R.puff = Array.from(g.svg.querySelectorAll('.ws'));
      R.face = g.svg.querySelector('.wt-face');
      R.wind = g.svg.querySelector('.wind');
      g.svg.querySelector('.wt-bug').animate([{ transform: 'translate(0px,0px) rotate(0deg)' }, { transform: 'translate(-18px,-8px) rotate(-20deg)' }, { transform: 'translate(-6px,10px) rotate(10deg)' }, { transform: 'translate(0px,0px) rotate(0deg)' }], { duration: 5200, iterations: Infinity, easing: 'ease-in-out' });
    },
    async perform(g, decided, say) {
      const { W, H } = g;
      say('ふーっ！');
      R.face.innerHTML = catFace(g.cat, { mood: 'puff', look: { x: -1, y: 0 } });
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
      // ときどき：つむじかぜで くるくる まわる
      delete g.stage.dataset.variant;
      const whirl = Math.random() < 0.3;
      if (whirl) {
        g.stage.dataset.variant = 'whirl';
        const c = { x: Math.min(W - 50, g.head.x + W * 0.3), y: Math.max(40, g.skyH * 0.6) };
        const r = Math.min(30, g.skyH * 0.28);
        for (let q = 0; q <= 8; q++) pts.push({ x: c.x + Math.cos(q * 0.8) * r * (1 - q * 0.05), y: c.y + Math.sin(q * 0.8) * r * 0.7 });
      }
      plan.forEach((i, k) => {
        const b = g.beds[i];
        const last = k === plan.length - 1;
        pts.push({ x: b.cx, y: last ? b.cy - g.ss * 0.6 : Math.min(H - 20, b.cy - Math.max(24, g.cells[0].h * 0.42)) });
      });
      say('ふわ ふわ…');
      let blew = 0;
      let said = 0;
      let spun = 0;
      await frames(T.drift, (t) => {
        const u = t < 0.8 ? t * 0.88 / 0.8 : 0.88 + 0.12 * ease.outCubic((t - 0.8) / 0.2);
        const p = along(pts, u);
        const sway = Math.sin(t * Math.PI * 7) * 8 * (1 - u);
        R.hero.setAttribute('transform', `translate(${f(p.x + sway)} ${f(p.y)}) rotate(${f(sway * 2)})`);
        if (Math.floor(t * 3) > blew) { blew = Math.floor(t * 3); gust(p); audio.slide(0.25); }
        if (whirl && u > 0.1 && !spun) { spun = 1; say('くるくる… つむじかぜ！'); audio.hop(3); }
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
