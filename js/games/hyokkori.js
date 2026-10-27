// ひょっこり こねこ（決め方：隠して当てる〈あな〉。見せ方の部品：あなと名前の札）。
// 選択肢ごとの あなから、こねこが つぎつぎに ひょっこり 顔を出しては ひっこむ。さいごに 顔を出して、
// 手を ふって そのまま いる あなの札が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. こねこが あちこちの あなから ひょこひょこ 顔を出す（はじめは はやく、だんだん ゆっくり）。
// 2. しーんと した後、もういちど ひょっこり。
// 3. 顔を出した こねこが 手を ふって、そのまま いる。
// 結果は先に乱数で決め（RS01-S14）、顔を出す順を、決めた あなで終わるように組む。
// v17 の後（テーマパーク）：ゲームセンターの もぐらたたきの 機械（ミントの わく・電球の かんばん・ボタンの ある 前の台）。
// あなは 機械の 面に あいた まるい あな（色の ついた ふち・あつみ）。札は クレーンの 値札と おなじ パステルの札。
// 動きの ちがい（3B：4つ）：ふつう・2ひき・もぐら（こねこの かわりに もぐらが 出る）・
// みせかけ（さいごの こねこが いちど ひっこんで、また ひょっこり）。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, wander, other, TINTS, f } from './common.js';

export function peekPlan(n, decided, rand = Math.random) {
  return wander(n, 7 + Math.floor(rand() * 3), decided, rand);
}
// k 番目に顔を出している時間（ミリ秒）。total は 顔を出す回数
export const peekTime = (k, total) => 300 + 340 * Math.pow(total <= 1 ? 1 : k / (total - 1), 1.6);
export const T = { hush: 700, final: 520, wave: 700 };
// 動きの ちがい 2ひき：とちゅうで 2ひき いっしょに 顔を出す（「あれ？ 2ひき？」）
export const TWIN = 620;
export function hyokkoriDuration(count, twin = false) {
  let s = twin ? TWIN : 0;
  for (let k = 0; k < count - 1; k++) s += peekTime(k, count - 1);
  return s + T.hush + T.final + T.wave;
}

export function createHyokkori(deps) {
  const R = {};
  return createGame(deps, {
    play: 'ひょっこり',
    resultLabel: 'でてきたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const cols = n <= 6 ? 2 : 3;
      const signH = Math.round(Math.max(26, Math.min(40, H * 0.07)));
      const panelH = Math.round(Math.max(30, Math.min(48, H * 0.08)));
      const cells = grid(n, { x: 12, y: signH + 8, w: W - 24, h: H - signH - panelH - 16 }, cols, 6);
      const plateH = Math.max(22, Math.min(32, cells[0].h * 0.3));
      const hr = Math.max(14, Math.min(58, cells[0].w * 0.36, (cells[0].h - plateH) * 0.42));
      const holes = cells.map((c) => ({ cx: c.cx, cy: c.y + c.h - plateH - hr * 0.28 - 4 }));
      const fk = (hr * 1.9) / 100; // こねこの顔の大きさ
      Object.assign(g, { cells, plateH, hr, holes, fk });
      let s = '<defs>';
      holes.forEach((h, i) => { s += `<clipPath id="hk${i}"><rect x="${f(h.cx - hr * 1.4)}" y="${f(h.cy - hr * 3.4)}" width="${f(hr * 2.8)}" height="${f(hr * 3.4)}"/></clipPath>`; });
      s += '</defs>';
      // 機械の わく（ふちに あつみと かげ）・電球の かんばん・中の 面
      s += `<defs><linearGradient id="hy-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3f4ec"/><stop offset="1" stop-color="#f6eef7"/></linearGradient></defs>`;
      s += `<rect x="1" y="3" width="${W - 2}" height="${H - 3}" rx="16" fill="#5fa88c" opacity="0.25"/>`
        + `<rect x="0" y="0" width="${W}" height="${H - 3}" rx="16" fill="#a9dcc9" stroke="#5fa88c" stroke-width="2.4"/>`
        + `<rect x="8" y="${signH}" width="${W - 16}" height="${H - signH - panelH - 4}" rx="8" fill="url(#hy-back)" stroke="#7fbfa6" stroke-width="1.6"/>`;
      for (let yy = signH + 12; yy < H - panelH - 10; yy += 16) for (let xx = 18 + (Math.round(yy / 16) % 2) * 8; xx < W - 14; xx += 16) s += `<circle cx="${xx}" cy="${f(yy)}" r="1.4" fill="#b9e0cf" opacity="0.7"/>`;
      s += `<rect x="10" y="4" width="${W - 20}" height="${signH - 8}" rx="${f((signH - 8) / 2)}" fill="#fff6ea" stroke="#5fa88c" stroke-width="2"/>`
        + `<text x="${f(W / 2)}" y="${f(4 + (signH - 8) / 2)}" font-size="${f(Math.min(17, (signH - 8) * 0.62))}" font-weight="700" fill="#3f8a6e" text-anchor="middle" dominant-baseline="central" letter-spacing="2">ひょっこり こねこ</text>`;
      const nb = Math.max(4, Math.floor((W - 40) / 34));
      for (let k = 0; k < nb; k++) {
        const bx = 20 + (k * (W - 40)) / (nb - 1);
        if (Math.abs(bx - W / 2) < 84) continue;
        s += `<circle class="hy-bulb" cx="${f(bx)}" cy="${f(signH / 2)}" r="3.2" fill="#fff1c4" stroke="#e3bb84" stroke-width="1"/>`;
      }
      // 前の台（ボタンと コインの口）
      const py = H - panelH - 4;
      s += `<rect x="4" y="${f(py)}" width="${W - 8}" height="${panelH}" rx="8" fill="#8fcfb6" stroke="#5fa88c" stroke-width="2"/>`
        + `<rect x="8" y="${f(py + 2)}" width="${W - 16}" height="3" rx="1.5" fill="#ffffff" opacity="0.5"/>`
        + [['#f7a6a0', '#d97f7a'], ['#fde3a6', '#d9b04d'], ['#9fc5e8', '#6f9fcb']].map(([c1, c2], k) => `<ellipse cx="${f(W * 0.32 + k * 34)}" cy="${f(py + panelH * 0.58)}" rx="11" ry="7" fill="${c2}"/><ellipse cx="${f(W * 0.32 + k * 34)}" cy="${f(py + panelH * 0.5)}" rx="11" ry="7" fill="${c1}" stroke="${c2}" stroke-width="1.6"/>`).join('')
        + `<rect x="${f(W * 0.72)}" y="${f(py + panelH * 0.3)}" width="26" height="${f(panelH * 0.4)}" rx="4" fill="#5fa88c"/><rect x="${f(W * 0.72 + 11)}" y="${f(py + panelH * 0.36)}" width="4" height="${f(panelH * 0.28)}" rx="2" fill="#2f5a4a"/>`;
      cells.forEach((c, i) => {
        const h = holes[i];
        const [, edge] = TINTS[i % TINTS.length];
        // 機械の 面に あいた あな（色の ついた ふちに あつみ）
        s += `<ellipse cx="${f(h.cx)}" cy="${f(h.cy + hr * 0.1)}" rx="${f(hr * 1.3)}" ry="${f(hr * 0.46)}" fill="${edge}"/>`
          + `<ellipse cx="${f(h.cx)}" cy="${f(h.cy)}" rx="${f(hr * 1.3)}" ry="${f(hr * 0.46)}" fill="${TINTS[i % TINTS.length][0]}" stroke="${edge}" stroke-width="2"/>`
          + `<ellipse cx="${f(h.cx)}" cy="${f(h.cy)}" rx="${f(hr * 1.05)}" ry="${f(hr * 0.34)}" fill="#4f4a5a"/>`
          + `<g clip-path="url(#hk${i})"><g class="kit" data-i="${i}" transform="translate(${f(h.cx)} ${f(h.cy + hr * 1.9)})"><g transform="scale(${f(fk)})">${catFace(g.cat, { look: { x: 0, y: 0.3 } })}</g></g></g>`
          + `<path d="M${f(h.cx - hr * 1.2)},${f(h.cy)} A${f(hr * 1.2)},${f(hr * 0.42)} 0 0 0 ${f(h.cx + hr * 1.2)},${f(h.cy)}" fill="none" stroke="${TINTS[i % TINTS.length][0]}" stroke-width="${f(Math.max(3, hr * 0.16))}" stroke-linecap="round"/>`;
        s += plate(i, c.x, c.y + c.h - plateH, c.w, plateH, choices[i], { mat: 'pastel' }).svg;
      });
      s += '<g class="waver"></g>';
      return s;
    },
    after(g) {
      R.kits = Array.from(g.svg.querySelectorAll('.kit'));
      R.waver = g.svg.querySelector('.waver');
    },
    async perform(g, decided, say) {
      const plan = peekPlan(g.n, decided);
      const up = (i, p) => {
        const h = g.holes[i];
        R.kits[i].setAttribute('transform', `translate(${f(h.cx)} ${f(h.cy + g.hr * 1.9 - p * g.hr * 2.4)})`);
      };
      say('どこから でてくるかな…');
      const { stage, n } = g;
      const vr = Math.random();
      const variant = vr < 0.25 && n >= 3 ? 'twin' : vr < 0.5 ? 'mogura' : vr < 0.75 ? 'fake' : 'plain';
      stage.dataset.variant = variant;
      const twinAt = variant === 'twin' ? 2 + Math.floor(Math.random() * 3) : -1;
      const moguraAt = variant === 'mogura' ? 2 + Math.floor(Math.random() * 2) : -1;
      // 1. ひょこひょこ
      const shown = plan.length - 1;
      for (let k = 0; k < shown; k++) {
        const i = plan[k];
        const dur = peekTime(k, shown);
        audio.hop(k);
        await frames(dur, (t) => up(i, Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.min(1, dur / 500))));
        up(i, 0);
        if (k === Math.floor(shown / 2)) say('ひょこ、ひょこ…');
        if (k === moguraAt) {
          // もぐら：こねこの かわりに もぐらが 出る
          const j = plan[k + 1] === i ? other(n, i) : i;
          const face = R.kits[j].querySelector('g');
          const keep = face.innerHTML;
          face.innerHTML = '<circle r="44" fill="#8a6a55" stroke="#4a3a33" stroke-width="4"/><ellipse cx="0" cy="12" rx="16" ry="11" fill="#f2b8c4" stroke="#4a3a33" stroke-width="3"/><circle cx="-17" cy="-10" r="4.5" fill="#2f2622"/><circle cx="17" cy="-10" r="4.5" fill="#2f2622"/><path d="M-20,14 h-18 M-20,20 h-16 M20,14 h18 M20,20 h16" stroke="#4a3a33" stroke-width="2.4" stroke-linecap="round"/>';
          say('…もぐら！？');
          audio.pop();
          await frames(620, (t) => up(j, Math.sin(Math.PI * t) * 0.9));
          up(j, 0);
          face.innerHTML = keep;
          say('ひょこ、ひょこ…');
        }
        if (k === twinAt) {
          // 2ひき いっしょに
          const a = plan[k + 1] === i ? other(n, i) : i;
          const b = other(n, a);
          say('あれ？ 2ひき？');
          audio.hop(1);
          audio.hop(3);
          await frames(TWIN, (t) => { const p = Math.sin(Math.PI * t); up(a, p); up(b, p * 0.9); });
          up(a, 0);
          up(b, 0);
        }
      }
      // 2. しーん
      say('しーん…');
      await wait(T.hush);
      // 3. さいごに ひょっこり、手を ふる
      audio.pop();
      if (variant === 'fake') {
        // みせかけ：いちど ひっこむ
        await frames(T.final * 0.6, (t) => up(decided, Math.sin(Math.PI * t) * 0.8));
        up(decided, 0);
        say('…あれ？');
        await wait(300);
        audio.pop();
      }
      await frames(T.final, (t) => up(decided, ease.outBack(t)));
      const kit = R.kits[decided];
      kit.querySelector('g').innerHTML = catFace(g.cat, { mood: 'happy' });
      const h = g.holes[decided];
      const got = R.kits.findIndex((el) => el === kit); // 顔を出したままの あな
      say('ひょっこり！');
      R.waver.innerHTML = `<g transform="translate(${f(h.cx + g.hr * 0.9)} ${f(h.cy - g.hr * 0.9)})"><g class="wv">${catPaw(g.cat, Math.max(6, g.hr * 0.3))}</g></g>`;
      const wv = R.waver.querySelector('.wv');
      await frames(T.wave, (t) => wv.setAttribute('transform', `rotate(${f(Math.sin(t * Math.PI * 4) * 22)})`));
      return got;
    },
  });
}
