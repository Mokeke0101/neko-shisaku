// たんぽぽの わたげ（決め方：上から落ちて入る〈風で とぶ〉。見せ方の部品：花だんの 前板に書いた選択肢）。
// 野原に 大きな たんぽぽの つぼみ。押すと ぱあっと 明るい黄色の花が「さいた！」。花は すぐに まっしろな わたげの玉になり、
// イズが「ふーっ」と ふくと わたげが とびちる。ひとつだけ光る わたげが 風に ゆられて 花だんの上を ただよい、
// さいごに おりた花だんに 小さな たんぽぽが さく。その花だんの 前板に書いた選択肢が結果になる（v16 で作り直し）。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. つぼみが ふくらんで、ぱあっと さく（黄色の花びらが ひらく・きらきら）。
// 2. 花が わたげの玉に かわり、イズが ふーっと ふく。わたげが いっせいに とんでいく。
// 3. 光る わたげが、ふわふわ ゆれながら 3〜4か所の花だんの上を ただよう。風が ふくと 横へ もどされる。
// 4. さいごは ゆっくり おりて、花が ぽんと さく。
// 動きの ちがい（3B：4つ）：ふつう・つむじかぜ（くるくる）・とぶ生き物が わたげを つつく・わたげが ふたつ（ひとつは とおくへ）。
// 結果は先に乱数で決め（RS01-S14）、ただよう道を、決めた花だんで終わるように組む。
import { C } from '../art.js';
import { look as nowLook } from '../look.js';
import { seasonFlier } from '../kits.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, nearest, wander, along, fitSize, TINTS, pastelTag, f } from './common.js';
import { escapeXml } from '../ui.js';

export function driftPlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 3 : 3 + Math.floor(rand() * 2), decided, rand);
}
export const T = { open: 1000, blow: 700, drift: 3200, bloom: 500 };
export const watageDuration = () => T.open + T.blow + T.drift + T.bloom;
export const VARIANTS = ['plain', 'whirl', 'flier', 'twin'];

const YEL = '#ffe14d';
const YEL_EDGE = '#f2b705';

// わたげ（中心 0,0・大きさ s）
function seed(s, glow = false) {
  let rays = '';
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * 0.3;
    rays += `<path d="M0,${f(s * 0.3)} L${f(Math.cos(a) * s * 0.5)},${f(Math.sin(a) * s * 0.5)}" stroke="#d8d2c4" stroke-width="1"/>`;
  }
  return (glow ? `<circle r="${f(s * 0.72)}" fill="#fff6c8" opacity="0.9" stroke="${YEL_EDGE}" stroke-width="1.6"/>` : '')
    + rays + `<circle cx="0" cy="${f(-s * 0.08)}" r="${f(s * 0.36)}" fill="#ffffff" opacity="0.9"/>`
    + `<path d="M0,${f(s * 0.3)} v${f(s * 0.3)}" stroke="#b9a46c" stroke-width="1.6"/><ellipse cx="0" cy="${f(s * 0.66)}" rx="${f(s * 0.06)}" ry="${f(s * 0.1)}" fill="#a0703f"/>`;
}

// たんぽぽの花（中心 0,0・半径 r）。外と内の 二重の花びら、明るい黄色
export function dandelion(r) {
  let p = '';
  for (let k = 0; k < 16; k++) p += `<ellipse cx="0" cy="${f(-r * 0.62)}" rx="${f(r * 0.17)}" ry="${f(r * 0.4)}" fill="${YEL}" stroke="${YEL_EDGE}" stroke-width="1" transform="rotate(${f(k * 22.5)})"/>`;
  for (let k = 0; k < 12; k++) p += `<ellipse cx="0" cy="${f(-r * 0.36)}" rx="${f(r * 0.13)}" ry="${f(r * 0.28)}" fill="#fff07a" stroke="${YEL_EDGE}" stroke-width="0.8" transform="rotate(${f(k * 30 + 15)})"/>`;
  return p + `<circle r="${f(r * 0.24)}" fill="#ffc21a"/><circle cx="${f(-r * 0.08)}" cy="${f(-r * 0.08)}" r="${f(r * 0.08)}" fill="#ffffff" opacity="0.6"/>`;
}
// わたげの玉（中心 0,0・半径 r）
function puffBall(r) {
  let s = `<circle r="${f(r)}" fill="#ffffff" opacity="0.55"/>`;
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    s += `<path d="M0,0 L${f(Math.cos(a) * r)},${f(Math.sin(a) * r)}" stroke="#e4ded2" stroke-width="1"/><circle cx="${f(Math.cos(a) * r)}" cy="${f(Math.sin(a) * r)}" r="${f(r * 0.16)}" fill="#ffffff" stroke="#e4ded2" stroke-width="0.8"/>`;
  }
  return s + `<circle r="${f(r * 0.18)}" fill="#c9b27a"/>`;
}

export function createWatage(deps) {
  const R = {};
  return createGame(deps, {
    play: 'ふーっ',
    resultLabel: 'さいたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const skyH = Math.max(90, Math.min(170, H * 0.3));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 6, y: skyH + 8, w: W - 12, h: H - skyH - 12 }, cols, 6);
      const plankH = Math.max(22, Math.min(30, cells[0].h * 0.34));
      // 花だんの 土の まん中（わたげが おりる所）
      const soilH = (c) => Math.min(60, (c.h - plankH) * 0.6);
      const beds = cells.map((c) => ({ cx: c.cx, cy: c.y + c.h - plankH - soilH(c) * 0.55 }));
      const ss = Math.max(16, Math.min(34, cells[0].w * 0.24));
      const fr = Math.max(20, Math.min(40, skyH * 0.25)); // 大きな たんぽぽの 半径
      const head = { x: W * 0.24, y: skyH * 0.36 };
      Object.assign(g, { cells, plankH, beds, ss, skyH, head, fr });
      // v17 の後（テーマパーク）：野原で おおわず、季節の背景の 上に パステルの うえきばちと 花だん
      let s = `<ellipse cx="${f(head.x)}" cy="${f(skyH + 2)}" rx="${f(fr * 1.3)}" ry="${f(fr * 0.36)}" fill="#e391ad"/>`
        + `<ellipse cx="${f(head.x)}" cy="${f(skyH - 2)}" rx="${f(fr * 1.3)}" ry="${f(fr * 0.36)}" fill="#fbd9e2" stroke="#e391ad" stroke-width="2"/>`
        + `<ellipse cx="${f(head.x)}" cy="${f(skyH - 2)}" rx="${f(fr * 1.05)}" ry="${f(fr * 0.24)}" fill="#a07a5a"/>`;
      // 大きな たんぽぽ（くき・ぎざぎざの葉・つぼみ / 花 / わたげの玉）
      const gy = skyH - 4;
      s += `<path d="M${f(head.x - 4)},${f(gy)} Q${f(head.x - 14)},${f((gy + head.y) / 2)} ${f(head.x)},${f(head.y + fr * 0.5)}" stroke="#7fae4f" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      for (const sg of [-1, 1]) s += `<path d="M${f(head.x - 4)},${f(gy)} l${f(sg * 10)},-6 l${f(-sg * 2)},-4 l${f(sg * 10)},-4 l${f(-sg * 2)},-5 l${f(sg * 12)},-3 q${f(-sg * 8)},14 ${f(-sg * 28)},22 Z" fill="#9cc96b" stroke="#7fae4f" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += `<g transform="translate(${f(head.x)} ${f(head.y)})">`
        + `<g class="wt-bud"><path d="M0,${f(fr * 0.55)} C${f(-fr * 0.5)},${f(fr * 0.3)} ${f(-fr * 0.34)},${f(-fr * 0.5)} 0,${f(-fr * 0.7)} C${f(fr * 0.34)},${f(-fr * 0.5)} ${f(fr * 0.5)},${f(fr * 0.3)} 0,${f(fr * 0.55)} Z" fill="#a3cf72" stroke="#7fae4f" stroke-width="1.6"/><path d="M0,${f(-fr * 0.5)} V${f(fr * 0.4)}" stroke="#7fae4f" stroke-width="1.2"/><path d="M${f(-fr * 0.12)},${f(-fr * 0.66)} q${f(fr * 0.12)},${f(-fr * 0.14)} ${f(fr * 0.24)},0" stroke="${YEL_EDGE}" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`
        + `<g class="wt-flower" transform="scale(0)">${dandelion(fr)}</g>`
        + `<g class="wt-ball" opacity="0">${puffBall(fr * 1.05)}</g>`
        + `<g class="wt-spark"></g></g>`;
      // とびちる わたげと、光る わたげ
      s += '<g class="puff">';
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        s += `<g transform="translate(${f(head.x + Math.cos(a) * fr * 0.7)} ${f(head.y + Math.sin(a) * fr * 0.7)})"><g class="ws" opacity="0"><g transform="rotate(${f((a * 180) / Math.PI + 90)})">${seed(ss * 0.7)}</g></g></g>`;
      }
      s += `</g><g class="hero" transform="translate(${f(head.x)} ${f(head.y)})" opacity="0"><g transform="scale(1.5)">${seed(ss, true)}</g></g>`
        + `<g class="twin" transform="translate(${f(head.x)} ${f(head.y)})" opacity="0"><g transform="scale(1.3)">${seed(ss, true)}</g></g>`;
      // 花だん（土と 草の芽。前板に 選択肢）
      cells.forEach((c, i) => {
        const sh = soilH(c);
        const sy = c.y + c.h - plankH - sh + 4; // 土の上の はし
        const sx = c.x + 3;
        const sw = c.w - 6;
        const size = fitSize(choices[i], c.w, plankH);
        const [pc, pe] = TINTS[i % TINTS.length];
        s += `<rect x="${f(sx)}" y="${f(sy)}" width="${f(sw)}" height="${f(sh)}" rx="${f(Math.min(12, sh * 0.4))}" fill="${pc}" stroke="${pe}" stroke-width="2"/>`
          + `<rect x="${f(sx + 4)}" y="${f(sy + 3)}" width="${f(sw - 8)}" height="${f(sh - 6)}" rx="${f(Math.min(10, sh * 0.34))}" fill="#a07a5a"/>`;
        for (let q = 0; q < 5; q++) s += `<circle cx="${f(sx + 10 + ((q * 37) % (sw - 20)))}" cy="${f(sy + 7 + ((q * 7) % Math.max(4, sh - 14)))}" r="1.5" fill="#8a6548"/>`;
        [-0.32, 0, 0.32].forEach((d, q) => { const x = c.cx + d * sw; const y = sy + 4; s += `<path d="M${f(x)},${f(y + 4)} q-5,-6 -8,-4 M${f(x)},${f(y + 4)} q5,-7 8,-5 M${f(x)},${f(y + 4)} v-6" stroke="#7fae4f" stroke-width="2" fill="none" stroke-linecap="round" opacity="${q === 1 ? 1 : 0.85}"/>`; });
        const br = Math.max(11, Math.min(28, c.w * 0.2, (c.h - plankH) * 0.32));
        s += `<g class="bloom" data-i="${i}" transform="translate(${f(beds[i].cx)} ${f(sy + sh * 0.4 - br * 0.9)}) scale(0)"><path d="M0,0 V${f(br * 0.9 + sh * 0.2)}" stroke="#7fae4f" stroke-width="3"/>${dandelion(br)}</g>`;
        // 前の札（クレーンの 値札と おなじ パステルの札）
        s += `<g class="cell" data-i="${i}">` + pastelTag(i, c.x, c.y + c.h - plankH, c.w, plankH)
          + `<text class="cell-label" x="${f(c.cx)}" y="${f(c.y + c.h - plankH / 2 + 0.5)}" font-size="${f(size)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(choices[i])}</text></g>`;
      });
      // イズ（たんぽぽの右に すわる）
      const cs = Math.max(0.36, Math.min(0.7, skyH / 230));
      const cx = Math.min(W - 60 * cs, head.x + fr + 70 * cs);
      s += `<g transform="translate(${f(cx)} ${f(gy - 80 * cs)}) scale(${f(cs)})"><g class="wt-cat">${catSitting(g.cat, { look: { x: -1, y: -0.4 } })}</g></g>`;
      // とぶ生き物（季節で かわる。わたげを つつく 動きで出る）
      const fl = seasonFlier(nowLook);
      g.flierName = fl.name;
      s += `<g class="wt-flier" opacity="0">${fl.svg}</g><g class="wind"></g>`;
      return s;
    },
    after(g) {
      const q = (c) => g.svg.querySelector(c);
      Object.assign(R, { hero: q('.hero'), twin: q('.twin'), cat: q('.wt-cat'), wind: q('.wind'), bud: q('.wt-bud'), flower: q('.wt-flower'), ball: q('.wt-ball'), spark: q('.wt-spark'), flier: q('.wt-flier') });
      R.puff = Array.from(g.svg.querySelectorAll('.ws'));
    },
    async perform(g, decided, say) {
      const { W, H, fr } = g;
      const look = { x: -1, y: -0.4 };
      const r = Math.random();
      const variant = VARIANTS[Math.min(3, Math.floor(r * 4))];
      g.stage.dataset.variant = variant;
      // 1. つぼみが ふくらんで、ぱあっと さく
      say('つぼみが ふくらんで…');
      audio.stretch(T.open * 0.4 / 1000);
      await frames(T.open * 0.4, (t) => R.bud.setAttribute('transform', `scale(${f(1 + 0.25 * t)} ${f(1 + 0.12 * t)})`));
      R.bud.setAttribute('opacity', '0');
      say('さいた！');
      audio.pop();
      let sp = '';
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; sp += `<path d="M${f(Math.cos(a) * fr * 1.2)},${f(Math.sin(a) * fr * 1.2)} L${f(Math.cos(a) * fr * 1.55)},${f(Math.sin(a) * fr * 1.55)}" stroke="${YEL_EDGE}" stroke-width="2.6" stroke-linecap="round"/>`; }
      R.spark.innerHTML = sp;
      R.spark.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, offset: 0.3 }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 700, fill: 'forwards' });
      R.cat.innerHTML = catSitting(g.cat, { mood: 'happy', look });
      await frames(T.open * 0.35, (t) => R.flower.setAttribute('transform', `scale(${f(ease.outBack(t))})`));
      await wait(T.open * 0.1);
      // 2. わたげの玉に かわって、ふーっ
      say('わたげに なった！');
      await frames(T.open * 0.15, (t) => { R.flower.setAttribute('opacity', f(1 - t)); R.ball.setAttribute('opacity', f(t)); });
      say('ふーっ！');
      R.cat.innerHTML = catSitting(g.cat, { mood: 'puff', look });
      audio.stretch(T.blow / 1000);
      R.ball.setAttribute('opacity', '0');
      R.hero.setAttribute('opacity', '1');
      R.puff.forEach((el, k) => {
        el.setAttribute('opacity', '1');
        const dx = 60 + Math.random() * 120 - (k % 3) * 30;
        const dy = -30 - Math.random() * 80 + k * 6;
        el.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${f(dx)}px,${f(dy)}px)`, opacity: 0 }], { duration: 1600 + k * 120, easing: 'ease-out', fill: 'forwards' });
      });
      await wait(T.blow);
      R.cat.innerHTML = catSitting(g.cat, { look: { x: 0.4, y: 0.6 } });
      // 3. 光る わたげが ただよう
      const plan = driftPlan(g.n, decided);
      const pts = [g.head, { x: Math.min(W - 20, g.head.x + W * 0.32), y: Math.max(10, g.head.y - 20) }];
      if (variant === 'whirl') {
        const c = { x: Math.min(W - 50, g.head.x + W * 0.32), y: Math.max(40, g.skyH * 0.5) };
        const rr = Math.min(30, g.skyH * 0.24);
        for (let q = 0; q <= 8; q++) pts.push({ x: c.x + Math.cos(q * 0.8) * rr * (1 - q * 0.05), y: c.y + Math.sin(q * 0.8) * rr * 0.7 });
      }
      plan.forEach((i, k) => {
        const b = g.beds[i];
        const last = k === plan.length - 1;
        pts.push({ x: b.cx, y: last ? b.cy - g.ss * 0.6 : Math.min(H - 20, b.cy - Math.max(24, g.cells[0].h * 0.42)) });
      });
      // ふたつめの わたげは 右上へ とおく とんでいく
      const twinPts = [g.head, { x: g.head.x + W * 0.2, y: g.head.y - 10 }, { x: W * 0.8, y: g.skyH * 0.3 }, { x: W + 40, y: -20 }];
      if (variant === 'twin') { R.twin.setAttribute('opacity', '1'); say('わたげが ふたつ！'); } else say('ふわ ふわ…');
      let blew = 0;
      let said = 0;
      let spun = 0;
      let poked = 0;
      await frames(T.drift, (t) => {
        const u = t < 0.8 ? t * 0.88 / 0.8 : 0.88 + 0.12 * ease.outCubic((t - 0.8) / 0.2);
        const p = along(pts, u);
        let sway = Math.sin(t * Math.PI * 7) * 8 * (1 - u);
        if (variant === 'flier' && u > 0.3 && u < 0.5) {
          // とぶ生き物が よこから来て、わたげを つつく
          const v = (u - 0.3) / 0.2;
          R.flier.setAttribute('opacity', f(Math.sin(Math.PI * v)));
          R.flier.setAttribute('transform', `translate(${f(p.x + 40 - 40 * v)} ${f(p.y - 14 + Math.sin(v * 9) * 4)})`);
          if (v > 0.5) sway += Math.sin((v - 0.5) * Math.PI * 2) * 18;
          if (!poked && v > 0.5) { poked = 1; say(`あ、${g.flierName}！`); audio.pop(); }
        }
        R.hero.setAttribute('transform', `translate(${f(p.x + sway)} ${f(p.y)}) rotate(${f(sway * 2)})`);
        if (variant === 'twin') {
          const q = along(twinPts, Math.min(1, t * 1.6));
          R.twin.setAttribute('transform', `translate(${f(q.x)} ${f(q.y)})`);
          if (t > 0.5) R.twin.setAttribute('opacity', '0');
        }
        if (Math.floor(t * 3) > blew) { blew = Math.floor(t * 3); gust(p); audio.slide(0.25); }
        if (variant === 'whirl' && u > 0.1 && !spun) { spun = 1; say('くるくる… つむじかぜ！'); audio.hop(3); }
        if (u > 0.6 && !said) { said = 1; say('どこに おりるかな…'); audio.heart(); }
      });
      R.flier.setAttribute('opacity', '0');
      // 4. おりて 花が さく
      const end = along(pts, 1);
      const got = nearest(g.beds, end.x, end.y + g.ss * 0.6); // わたげが おりた花だん
      R.hero.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      const bloom = g.svg.querySelector(`.bloom[data-i="${got}"]`);
      const base = bloom.getAttribute('transform').replace(/ scale\([^)]*\)/, '');
      audio.pop();
      await frames(T.bloom, (t) => bloom.setAttribute('transform', `${base} scale(${f(ease.outBack(t))})`));
      R.cat.innerHTML = catSitting(g.cat, { mood: 'happy', look: { x: 0.4, y: 0.6 } });
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
