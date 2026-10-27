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
// v16 作り直し：名前の札は 白い板を やめ、あつみの ある 木の札（common.js の plate）。
// 動きの ちがい（3B：4つ）：ふつう・かぜ（しゃぼんだまが いっせいに ゆれる）・にげる（わろうとした 1つが すいっと にげる）・
// くしゅん（ちいさな しゃぼんだまが 鼻で はじけて くしゃみ）。
import { C } from '../art.js';
import { catFace, catPaw, catName } from '../cats.js';
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
// 動きの ちがい かぜ：ふき おわった後に 風が ふいて、しゃぼんだまが いっせいに ゆれる（選択肢 8 個まで）
export const WIND = 640;
export const windOk = (n) => n <= 8;
export function shabonDuration(n, wind = false) {
  let s = T.blow + (wind && windOk(n) ? WIND : 0);
  for (let k = 0; k < n - 2; k++) s += T.reach + popGap(k, n - 1);
  return s + waverOf(n) * T.sway * 2 + T.reach + 200 + T.last;
}

// しゃぼんだま（中心 0,0・半径 r）。中は すき通って、ふちだけ うすく にじ色。光の すじと 点
const HUES = [['#f29bc0', '#8fc2ef'], ['#8fc2ef', '#a6dc98'], ['#a6dc98', '#f2c95e'], ['#f2c95e', '#f29bc0']];
let gradSeq = 0;
function bubbleDefs(id) {
  return '<defs>' + HUES.map(([a, b], k) => `<radialGradient id="${id}-${k}" cx="0.42" cy="0.4" r="0.62">`
    + `<stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.72" stop-color="#ffffff" stop-opacity="0.04"/>`
    + `<stop offset="0.9" stop-color="${a}" stop-opacity="0.22"/><stop offset="1" stop-color="${b}" stop-opacity="0.42"/></radialGradient>`).join('') + '</defs>';
}
function bubble(r, k, id) {
  const [a, b] = HUES[k % 4];
  const sw = Math.max(1.4, r * 0.045);
  return `<circle r="${f(r)}" fill="url(#${id}-${k % 4})"/>`
    + `<circle r="${f(r)}" fill="none" stroke="#ffffff" stroke-width="${f(sw)}" opacity="0.85"/>`
    + `<path d="M${f(r * 0.94)},${f(r * 0.3)} A${f(r * 0.99)},${f(r * 0.99)} 0 0 1 ${f(-r * 0.3)},${f(r * 0.94)}" stroke="${a}" stroke-width="${f(sw * 1.6)}" fill="none" stroke-linecap="round" opacity="0.6"/>`
    + `<path d="M${f(-r * 0.97)},${f(r * 0.2)} A${f(r * 0.99)},${f(r * 0.99)} 0 0 1 ${f(-r * 0.2)},${f(-r * 0.97)}" stroke="${b}" stroke-width="${f(sw * 1.4)}" fill="none" stroke-linecap="round" opacity="0.5"/>`
    + `<path d="M${f(-r * 0.6)},${f(-r * 0.18)} A${f(r * 0.64)},${f(r * 0.64)} 0 0 1 ${f(-r * 0.18)},${f(-r * 0.6)}" stroke="#ffffff" stroke-width="${f(Math.max(2, r * 0.1))}" fill="none" stroke-linecap="round" opacity="0.95"/>`
    + `<circle cx="${f(r * 0.42)}" cy="${f(r * 0.4)}" r="${f(r * 0.07)}" fill="#ffffff" opacity="0.9"/>`;
}

export function createShabon(deps) {
  const R = {};
  let bob = null;
  return createGame(deps, {
    play: 'ふーっ',
    resultLabel: 'のこったのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const catH = Math.max(56, Math.min(118, H * 0.21));
      const cols = n <= 4 ? 2 : 3;
      const cells = grid(n, { x: 4, y: 6, w: W - 8, h: H - catH - 12 }, cols, 6);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.34));
      const br = Math.max(12, Math.min(cells[0].w * 0.36, (cells[0].h - plateH - 4) / 2));
      const bubbles = cells.map((c) => ({ cx: c.cx, cy: c.y + (c.h - plateH) / 2 }));
      Object.assign(g, { cells, plateH, br, bubbles, catH });
      const fs = catH / 112;
      g.face = { x: W * 0.5, y: H - catH * 0.48, fs };
      const mouth = { x: g.face.x, y: g.face.y + 17 * fs };
      g.wandR = catH * 0.19;
      g.wand = { x: mouth.x + catH * 0.5, y: mouth.y - catH * 0.08 }; // 口の前の わ（ここから しゃぼんだまが出る）
      g.gid = `sbg${gradSeq++}`;
      let s = bubbleDefs(g.gid);
      cells.forEach((c, i) => {
        s += `<g class="bub" data-i="${i}" transform="translate(${f(bubbles[i].cx)} ${f(bubbles[i].cy)})"><g class="bub-in" opacity="0">${bubble(br, i, g.gid)}</g></g>`;
        s += plate(i, c.x, c.y + c.h - plateH, c.w, plateH, choices[i]).svg;
      });
      // しゃぼんえきの びんと、おさら（イズの左右）
      const bx = Math.min(W - catH * 0.3, g.wand.x + catH * 0.62);
      const by = H - 4;
      s += `<g transform="translate(${f(bx)} ${f(by)})"><path d="M${f(-catH * 0.14)},0 V${f(-catH * 0.4)} q0,${f(-catH * 0.08)} ${f(catH * 0.08)},${f(-catH * 0.1)} V${f(-catH * 0.6)} h${f(catH * 0.12)} V${f(-catH * 0.5)} q${f(catH * 0.08)},${f(catH * 0.02)} ${f(catH * 0.08)},${f(catH * 0.1)} V0 Z" fill="#d9eef7" fill-opacity="0.85" stroke="#7aa7c4" stroke-width="2"/>`
        + `<rect x="${f(-catH * 0.14)}" y="${f(-catH * 0.3)}" width="${f(catH * 0.28)}" height="${f(catH * 0.14)}" fill="#f7b4a6" opacity="0.85"/>`
        + `<rect x="${f(-catH * 0.07)}" y="${f(-catH * 0.68)}" width="${f(catH * 0.14)}" height="${f(catH * 0.09)}" rx="2" fill="#86a256"/>`
        + `<ellipse cx="0" cy="${f(-catH * 0.15)}" rx="${f(catH * 0.1)}" ry="${f(catH * 0.04)}" fill="#ffffff" opacity="0.6"/></g>`;
      const dx = Math.max(catH * 0.42, g.face.x - catH * 1.05);
      s += `<g transform="translate(${f(dx)} ${f(H - 6)})"><ellipse rx="${f(catH * 0.34)}" ry="${f(catH * 0.1)}" fill="#cfe0ea" stroke="#7aa7c4" stroke-width="2"/><ellipse cy="${f(-catH * 0.02)}" rx="${f(catH * 0.26)}" ry="${f(catH * 0.06)}" fill="#eaf6fb"/>`
        + `<g transform="translate(${f(catH * 0.12)} ${f(-catH * 0.12)})">${bubble(catH * 0.08, 1, g.gid)}</g><g transform="translate(${f(-catH * 0.1)} ${f(-catH * 0.16)})">${bubble(catH * 0.06, 3, g.gid)}</g></g>`;
      // イズと、しゃぼんだまの わ（右の前足で 口の前に もつ）
      const hold = { x: g.wand.x + catH * 0.16, y: H - catH * 0.14 };
      s += `<g transform="translate(${f(g.face.x)} ${f(g.face.y)}) scale(${f(fs)})"><g class="sb-face">${catFace(g.cat, { look: { x: 0, y: -1 } })}</g></g>`
        + `<g class="sb-wand"><path d="M${f(g.wand.x + g.wandR * 0.7)},${f(g.wand.y + g.wandR * 0.7)} L${f(hold.x)},${f(hold.y)}" stroke="#86a256" stroke-width="3.4" stroke-linecap="round"/>`
        + `<circle cx="${f(g.wand.x)}" cy="${f(g.wand.y)}" r="${f(g.wandR)}" fill="#eaf6fb" fill-opacity="0.35" stroke="#86a256" stroke-width="3.4"/>`
        + `<g transform="translate(${f(hold.x)} ${f(hold.y)})">${catPaw(g.cat, Math.max(8, catH * 0.13))}</g></g>`
        + '<g class="mini"></g>'
        + `<g class="sb-paw" transform="translate(${f(W * 0.5 - catH * 0.6)} ${f(H - catH * 0.3)})">${catPaw(g.cat, Math.max(11, catH * 0.15))}</g>`
        + '<g class="drops"></g>';
      return s;
    },
    after(g) {
      R.bubs = Array.from(g.svg.querySelectorAll('.bub'));
      R.paw = g.svg.querySelector('.sb-paw');
      R.face = g.svg.querySelector('.sb-face');
      R.drops = g.svg.querySelector('.drops');
      R.mini = g.svg.querySelector('.mini');
      g.pawHome = { x: g.W * 0.5 - g.catH * 0.6, y: g.H - g.catH * 0.3 };
      g.paw = { ...g.pawHome };
      if (bob) bob.forEach((a) => a.cancel());
      bob = null;
      // 遊ぶ前から しゃぼんだまを ならべておく（押すと ふき直す）
      R.bubs.forEach((el) => el.querySelector('.bub-in').setAttribute('opacity', '1'));
    },
    async perform(g, decided, say) {
      const { n, stage } = g;
      const vr = Math.random();
      const variant = vr < 0.25 && windOk(n) ? 'wind' : vr < 0.5 && n >= 3 ? 'nigeru' : vr < 0.75 ? 'kushun' : 'plain';
      stage.dataset.variant = variant;
      // 1. ふくらませて ならべる
      say(`${catName(g.cat)}が ふーっ…`);
      R.face.innerHTML = catFace(g.cat, { mood: 'puff', look: { x: 0, y: -1 } });
      audio.stretch(T.blow / 1000);
      for (let k = 0; k < 8; k++) miniBubble(g, k * (T.blow / 8));
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
      R.face.innerHTML = catFace(g.cat, { look: { x: 0, y: -1 } });
      if (variant === 'kushun') {
        // くしゅん：ちいさな しゃぼんだまが 鼻に ついて はじける
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        el.innerHTML = bubble(g.wandR * 0.45, 2, g.gid);
        R.mini.appendChild(el);
        const nose = { x: g.face.x, y: g.face.y + 6 * g.face.fs };
        await frames(520, (t) => el.setAttribute('transform', `translate(${f(g.wand.x + (nose.x - g.wand.x) * t)} ${f(g.wand.y + (nose.y - g.wand.y) * t - Math.sin(Math.PI * t) * g.catH * 0.3)})`));
        el.remove();
        audio.pop();
        R.face.innerHTML = catFace(g.cat, { mood: 'strain', look: { x: 0, y: -1 } });
        say('はっ… くしゅん！');
        await frames(260, (t) => R.face.setAttribute('transform', `translate(0 ${f(Math.sin(Math.PI * t) * 8)})`));
        R.face.removeAttribute('transform');
        R.face.innerHTML = catFace(g.cat, { look: { x: 0, y: -1 } });
        await wait(120);
      }
      // かぜ：しゃぼんだまが いっせいに ゆれる
      if (variant === 'wind') {
        say('ひゅう～っ… かぜだ！');
        audio.stretch(WIND / 1000);
        await frames(WIND, (t) => {
          const k = Math.sin(t * Math.PI);
          R.bubs.forEach((el, i) => {
            const b = g.bubbles[i];
            el.setAttribute('transform', `translate(${f(b.cx + k * g.br * 0.55 + Math.sin(t * 9 + i) * 2)} ${f(b.cy - k * g.br * 0.15)})`);
          });
        });
        R.bubs.forEach((el, i) => el.setAttribute('transform', `translate(${f(g.bubbles[i].cx)} ${f(g.bubbles[i].cy)})`));
      }
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
        if (variant === 'nigeru' && k === 0) {
          // にげる：前足が ちかづくと、しゃぼんだまが すいっと にげる
          const i = order[k];
          const b = g.bubbles[i];
          await movePaw(g, b.cx + g.br * 0.3, b.cy + g.br * 1.2, T.reach * 1.5);
          const dx = (b.cx > g.W / 2 ? -1 : 1) * g.br * 0.7;
          say('あっ、にげた！');
          await frames(300, (t) => R.bubs[i].setAttribute('transform', `translate(${f(b.cx + dx * ease.outCubic(t))} ${f(b.cy - g.br * 0.4 * ease.outCubic(t))})`));
          g.bubbles[i] = { cx: b.cx + dx, cy: b.cy - g.br * 0.4 };
          say('まてまて～');
        }
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

  // ふいている間に、わから こまかい しゃぼんだまが ふわっと とんで消える（かざり）
  function miniBubble(g, delay) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const r = g.wandR * (0.25 + Math.random() * 0.3);
    el.innerHTML = bubble(r, Math.floor(Math.random() * 4), g.gid);
    el.setAttribute('transform', `translate(${f(g.wand.x)} ${f(g.wand.y)})`);
    el.setAttribute('opacity', '0');
    R.mini.appendChild(el);
    const dx = (Math.random() - 0.3) * g.W * 0.35;
    const dy = -(g.catH * 0.6 + Math.random() * g.H * 0.25);
    el.animate([{ transform: `translate(${f(g.wand.x)}px,${f(g.wand.y)}px)`, opacity: 0.95 }, { transform: `translate(${f(g.wand.x + dx)}px,${f(g.wand.y + dy)}px)`, opacity: 0 }], { duration: 1300, delay, easing: 'ease-out' }).onfinish = () => el.remove();
  }

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
