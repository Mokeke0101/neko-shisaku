// ねこじゃらし とびつき（決め方：猫の気まぐれ〈とびつく〉。見せ方の部品：ねこじゃらしと名前の札）。
// 選択肢ごとに ねこじゃらしが立っている。風で つぎつぎに ゆれる ねこじゃらしを、猫が目で おいかけ、
// おしりを ふりふり してから、1本に とびつく。とびついた ねこじゃらしの札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. ねこじゃらしが1本ずつ ゆれ、猫の目が そのたびに そちらを見る。
// 2. 猫が ひくく かまえて、おしりを ふりふり（3回）。
// 3. ぴょーんと とびついて、ねこじゃらしが しなる。
// 結果は先に乱数で決め（RS01-S14）、ゆれる順を、決めた ねこじゃらしで終わるように組む。
import { C } from '../art.js';
import { look as nowLook } from '../look.js';
import { seasonFlier } from '../kits.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, nearest, wander, f } from './common.js';

// ゆれる ねこじゃらしの並び（最後が決めた1本）
export function swayPlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 4 : 4 + Math.floor(rand() * 2), decided, rand);
}
export const T = { sway: 640, wiggle: 300, wiggles: 3, crouch: 280, jump: 620, bend: 520 };
// ときどき出る別の動き（v12）：とびつく ふりを して、もう いちど おしりを ふる（フェイント）
export const FEINT = 380 + T.wiggle;
export const jarashiDuration = (steps, feint = false) => steps * T.sway + T.crouch + T.wiggles * T.wiggle + T.jump + T.bend + (feint ? FEINT : 0);

// ねこじゃらし（根もと 0,0 から上へ、高さ h）
function foxtail(h, k) {
  const head = ['#d9cf8a', '#e6d9a0', '#cfc283'][k % 3];
  let hairs = '';
  for (let j = 0; j < 7; j++) {
    const y = -h + h * 0.06 + j * h * 0.045;
    hairs += `<path d="M0,${f(y)} l${f(-h * 0.1)},${f(-h * 0.05)} M0,${f(y)} l${f(h * 0.1)},${f(-h * 0.05)}" stroke="#b9ad6e" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  return `<path d="M0,0 Q${f(h * 0.06)},${f(-h * 0.5)} 0,${f(-h * 0.62)}" stroke="#86a256" stroke-width="${f(Math.max(2, h * 0.04))}" fill="none" stroke-linecap="round"/>`
    + `<path d="M0,${f(-h * 0.2)} q${f(h * 0.16)},${f(-h * 0.02)} ${f(h * 0.22)},${f(-h * 0.14)}" stroke="#a3bd6e" stroke-width="${f(Math.max(2, h * 0.035))}" fill="none" stroke-linecap="round"/>`
    + hairs
    + `<ellipse cx="0" cy="${f(-h * 0.8)}" rx="${f(h * 0.09)}" ry="${f(h * 0.2)}" fill="${head}" stroke="#b9ad6e" stroke-width="1.4"/>`;
}

export function createJarashi(deps) {
  const R = {};
  const swayTo = (el, deg) => el.setAttribute('transform', `rotate(${f(deg)})`);
  return createGame(deps, {
    play: 'ふりふり',
    resultLabel: 'とびついたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const catH = Math.max(60, Math.min(130, H * 0.24));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 4, y: catH + 6, w: W - 8, h: H - catH - 12 }, cols, 6);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.34));
      const th = Math.max(26, Math.min(110, cells[0].h - plateH - 2));
      const roots = cells.map((c) => ({ cx: c.cx, cy: c.y + c.h - plateH - 1 }));
      const sk = catH / 175;
      Object.assign(g, { cells, plateH, th, roots, sk, home: { x: W * 0.5, y: catH * 0.52 } });
      let s = '';
      cells.forEach((c, i) => {
        // 根もとの 草（かざり）
        s += `<path d="M${f(roots[i].cx - th * 0.22)},${f(roots[i].cy)} q${f(th * 0.04)},${f(-th * 0.2)} ${f(-th * 0.06)},${f(-th * 0.26)} M${f(roots[i].cx - th * 0.16)},${f(roots[i].cy)} q${f(th * 0.06)},${f(-th * 0.14)} ${f(th * 0.1)},${f(-th * 0.18)} M${f(roots[i].cx + th * 0.2)},${f(roots[i].cy)} q${f(-th * 0.02)},${f(-th * 0.16)} ${f(th * 0.08)},${f(-th * 0.22)}" stroke="#a3bd6e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
        s += `<g transform="translate(${f(roots[i].cx)} ${f(roots[i].cy)})"><g class="tail" data-i="${i}">${foxtail(th, i)}</g></g>`;
        s += plate(i, c.x, c.y + c.h - plateH, c.w, plateH, choices[i]).svg;
      });
      // 毛糸玉（アズの よこ）と、ひらひら とぶ 季節の生き物（v13：kits.js の seasonFlier）
      const yr = Math.max(9, catH * 0.13);
      s += `<g transform="translate(${f(g.home.x - catH * 0.7)} ${f(g.home.y + catH * 0.38)})"><circle r="${f(yr)}" fill="#f4a7a3" stroke="#d97f7a" stroke-width="2"/><path d="M${f(-yr * 0.8)},${f(-yr * 0.2)} Q0,${f(-yr)} ${f(yr * 0.8)},${f(-yr * 0.2)} M${f(-yr * 0.8)},${f(yr * 0.3)} Q0,${f(-yr * 0.5)} ${f(yr * 0.8)},${f(yr * 0.3)}" stroke="#d97f7a" stroke-width="1.4" fill="none"/><path d="M${f(yr * 0.7)},${f(yr * 0.6)} q${f(yr)},${f(yr * 0.5)} ${f(yr * 1.8)},${f(yr * 0.1)}" stroke="#d97f7a" stroke-width="1.4" fill="none"/></g>`;
      s += `<g transform="translate(${f(W * 0.82)} ${f(catH * 0.35)})"><g class="jr-fly">${seasonFlier(nowLook).svg}</g></g>`;
      s += `<g class="jr-pos" transform="translate(${f(g.home.x)} ${f(g.home.y)}) scale(${f(sk)})"><g class="jr-cat">${catSitting(g.cat, { look: { x: 0, y: 1 } })}</g></g>`;
      return s;
    },
    after(g) {
      R.tails = Array.from(g.svg.querySelectorAll('.tail'));
      R.pos = g.svg.querySelector('.jr-pos');
      R.cat = g.svg.querySelector('.jr-cat');
      const fly = g.svg.querySelector('.jr-fly');
      fly.animate([{ transform: 'translate(0px,0px) scaleX(1)' }, { transform: 'translate(-30px,-10px) scaleX(0.6)' }, { transform: 'translate(-50px,6px) scaleX(1)' }, { transform: 'translate(-20px,14px) scaleX(0.6)' }, { transform: 'translate(0px,0px) scaleX(1)' }], { duration: 4200, iterations: Infinity, easing: 'ease-in-out' });
    },
    async perform(g, decided, say) {
      const plan = swayPlan(g.n, decided);
      const look = (i) => {
        const r = g.roots[i];
        return { x: Math.max(-1, Math.min(1, (r.cx - g.home.x) / (g.W * 0.35))), y: 1 };
      };
      // 1. ゆれる ねこじゃらしを 目で おう
      for (let k = 0; k < plan.length; k++) {
        const i = plan[k];
        say(k === 0 ? 'ゆらゆら…' : k < plan.length - 1 ? 'あっちも ゆらゆら…' : 'じーっ…');
        R.cat.innerHTML = catSitting(g.cat, { look: look(i) });
        audio.hover(k);
        await frames(T.sway, (t) => swayTo(R.tails[i], Math.sin(t * Math.PI * 3) * 16 * (1 - t * 0.5)));
        swayTo(R.tails[i], 0);
      }
      // 2. かまえて おしりを ふりふり
      say('ふり ふり…');
      const at = (x, y, sy = 1, rot = 0) => R.pos.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(g.sk)} ${f(g.sk * sy)})`);
      await frames(T.crouch, (t) => at(g.home.x, g.home.y + 8 * t, 1 - 0.12 * t));
      for (let k = 0; k < T.wiggles; k++) {
        audio.wiggle(k);
        await frames(T.wiggle, (t) => at(g.home.x + Math.sin(t * Math.PI * 2) * 5, g.home.y + 8, 0.88, Math.sin(t * Math.PI * 2) * 5));
      }
      // ときどき：とびつく ふりを して、もう いちど ふりふり
      delete g.stage.dataset.variant;
      if (Math.random() < 0.3) {
        g.stage.dataset.variant = 'feint';
        say('…と みせかけて');
        await frames(380, (t) => at(g.home.x, g.home.y + 8 - Math.sin(Math.PI * t) * 16, 0.88 + 0.12 * Math.sin(Math.PI * t)));
        say('まだ まだ… ふり ふり');
        audio.wiggle(3);
        await frames(T.wiggle, (t) => at(g.home.x + Math.sin(t * Math.PI * 2) * 6, g.home.y + 8, 0.88, Math.sin(t * Math.PI * 2) * 6));
      }
      // 3. とびつく
      say('えいっ！');
      const r = g.roots[decided];
      // 猫の足もとが 札の すぐ上に来る所（札の文字に かからない）
      const to = { x: r.cx, y: Math.min(r.cy - g.th * 0.55, r.cy - 4 - 78 * g.sk * 0.75) };
      R.cat.innerHTML = catSitting(g.cat, { mood: 'happy', look: look(decided) });
      audio.toss();
      await frames(T.jump, (t) => {
        const e = ease.inOutSine(t);
        const k = 1 - 0.25 * e;
        R.pos.setAttribute('transform', `translate(${f(g.home.x + (to.x - g.home.x) * e)} ${f(g.home.y + 8 + (to.y - g.home.y - 8) * e - Math.sin(Math.PI * t) * g.th * 0.5)}) scale(${f(g.sk * k)})`);
      });
      const got = nearest(g.roots, to.x, to.y + 78 * g.sk * 0.75 + 4); // とびついた ねこじゃらし（猫の足もとの1本）
      audio.stamp();
      await frames(T.bend, (t) => swayTo(R.tails[got], Math.sin(t * Math.PI * 2.5) * 22 * (1 - t)));
      return got;
    },
  });
}
