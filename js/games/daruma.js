// だるまさんが ころんだ（決め方：競争する〈とまって すすむ〉。見せ方の部品：横の みちと名前の札）。
// 左の札の前から、選択肢ごとの こねこが 右の おに（猫）へ むかって すすむ。おにが「だるまさんが…」と
// いっている間だけ すすみ、「ころんだ！」で ふりむくと ぴたっと止まる。さいしょに おにへ タッチした こねこの札が結果になる。
// けいとだま レース（ずっと ころがる）とは、すすむ・止まるを くり返す所が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 「だるまさんが…」で こねこたちが すすみ、「ころんだ！」で止まる。これを 3〜4回。先頭が 入れかわる。
// 2. さいごの「だるまさんが…」で、1ぴきが おにへ タッチ。
// 結果は先に乱数で決め（RS01-S14）、すすむ量を、決めた こねこが さいしょに着くように組む。
import { C } from '../art.js';
import { catFace, catSitting, tail } from '../cats.js';
import { look as nowLook } from '../look.js';
import { kitFor } from '../kits.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, plate, f } from './common.js';

// すすむ量の組（rounds 回ぶん）。pos[r][i] は r 回目の後の こねこ i の位置（0〜1。1 が おに）。
// 決めた こねこだけが さいごに 1 に着き、ほかは 0.93 より手前。とちゅうでは 決めた こねこが先頭とは かぎらない
export function dashPlan(n, decided, rounds, rand = Math.random) {
  const fin = Array.from({ length: n }, (_, i) => (i === decided ? 1 : 0.55 + rand() * 0.37));
  const pos = [];
  const parts = fin.map(() => {
    const w = Array.from({ length: rounds }, () => 0.5 + rand());
    const s = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / s);
  });
  // 決めた こねこは、さいごの回に大きく すすむ（とちゅうは 目立たない）
  const pd = parts[decided];
  const lastBoost = Math.max(pd[rounds - 1], 0.34);
  const rest = (1 - lastBoost) / pd.slice(0, -1).reduce((a, b) => a + b, 0);
  for (let r = 0; r < rounds - 1; r++) pd[r] *= rest;
  pd[rounds - 1] = lastBoost;
  for (let r = 0; r < rounds; r++) {
    pos.push(fin.map((F, i) => F * parts[i].slice(0, r + 1).reduce((a, b) => a + b, 0)));
  }
  return pos;
}
export const ROUNDS = 4;
export const T = { chant: 1000, turn: 260, freeze: 420, touch: 500 };
// ときどき出る別の動き（v12）：1回だけ おにが はやくちで いって、すぐ ふりむく（こねこたちが あわてて止まる）
export const FAST = 0.5;
export const darumaDuration = (fast = false) => ROUNDS * (T.chant + T.turn + T.freeze) + T.touch - (fast ? T.chant * (1 - FAST) : 0);

export function createDaruma(deps) {
  const R = {};
  let pos = [];
  const place = (g) => R.kits.forEach((el, i) => {
    const x = g.x0 + (g.x1 - g.x0) * pos[i];
    el.setAttribute('transform', `translate(${f(x)} ${f(g.lanes[i])})`);
  });
  return createGame(deps, {
    play: 'はじめる',
    resultLabel: 'タッチしたのは',
    draw(g) {
      const { n, W, H, choices } = g;
      const top = 4;
      const laneH = Math.max(24, Math.min(72, (H - top - 6) / n));
      const plateH = Math.max(22, Math.min(32, laneH - 4));
      const plateW = Math.min(150, Math.max(116, W * 0.36));
      const oniW = Math.max(56, Math.min(96, W * 0.2));
      const y0 = top + Math.max(0, (H - top - 6 - laneH * n) / 2);
      const lanes = choices.map((_, i) => y0 + laneH * (i + 0.5));
      const ks = Math.max(0.17, Math.min(0.52, (laneH * 0.86) / 100));
      Object.assign(g, { lanes, laneH, plateW, oniW, ks, x0: 8 + plateW + 50 * ks + 2, x1: W - oniW - 50 * ks });
      // おにの いる 大きな木（v15：季節と行事の木。おには 木のみきに むかって かぞえる）
      const tx = W - oniW / 2 - 6;
      const K = kitFor(nowLook);
      const P = K.pal;
      const cr = oniW * 0.62;
      const cy = Math.max(cr * 0.9, H * 0.13);
      const tw = oniW * 0.46;
      const edge = P.snowy ? ` stroke="#c9d9e4" stroke-width="2"` : '';
      // えだと、えだの先の 小さな葉の かたまり
      const branch = (y, dx, dy, r, c) => `<path d="M${f(tx)},${f(y)} Q${f(tx + dx * 0.5)},${f(y + dy * 0.2)} ${f(tx + dx)},${f(y + dy)}" stroke="${P.trunk}" stroke-width="${f(tw * 0.32)}" fill="none" stroke-linecap="round"/>`
        + `<circle cx="${f(tx + dx)}" cy="${f(y + dy)}" r="${f(r)}" fill="${c}"${edge}/><circle cx="${f(tx + dx + r * 0.7)}" cy="${f(y + dy + r * 0.35)}" r="${f(r * 0.7)}" fill="${c}"${edge}/>`;
      let s = `<ellipse cx="${f(tx)}" cy="${f(H - 8)}" rx="${f(oniW * 0.62)}" ry="7" fill="#a0703f" opacity="0.16"/>`
        + `<path d="M${f(tx - tw / 2)},${f(cy)} L${f(tx - tw * 0.62)},${f(H - 10)} Q${f(tx - tw)},${f(H - 4)} ${f(tx - tw * 1.1)},${f(H - 4)} H${f(tx + tw * 1.1)} Q${f(tx + tw)},${f(H - 4)} ${f(tx + tw * 0.62)},${f(H - 10)} L${f(tx + tw / 2)},${f(cy)} Z" fill="${P.trunk}" stroke="#7a5236" stroke-width="2.4" stroke-linejoin="round"/>`
        + `<path d="M${f(tx - tw * 0.18)},${f(cy + 40)} q-4,30 2,60 M${f(tx + tw * 0.2)},${f(H * 0.62)} q4,26 -2,50" stroke="#7a5236" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45"/>`
        + branch(H * 0.36, -oniW * 0.5, -H * 0.06, oniW * 0.3, P.tree[1])
        + branch(H * 0.72, -oniW * 0.46, -H * 0.05, oniW * 0.26, P.tree[2])
        + K.tree(tx, cy, cr, P.tree[0], 0, P)
        + `<path d="M${f(g.x1 + 50 * ks)},6 V${f(H - 6)}" stroke="${C.momiji}" stroke-width="2" stroke-dasharray="6 6" opacity="0.6"/>`;
      choices.forEach((label, i) => {
        s += `<path d="M${f(8 + plateW)},${f(lanes[i] + laneH * 0.18)} H${f(g.x1 + 50 * ks)}" stroke="#f1d9b0" stroke-width="${f(Math.max(6, laneH * 0.3))}" stroke-linecap="round" opacity="0.75"/>`
          + `<path d="M${f(8 + plateW)},${f(lanes[i])} H${f(g.x1)}" stroke="#e2bd87" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>`;
        if (i % 2 === 1) s += `<path d="M${f((8 + plateW + g.x1) / 2)},${f(lanes[i] + laneH * 0.42)} q-2,-7 -6,-9 M${f((8 + plateW + g.x1) / 2)},${f(lanes[i] + laneH * 0.42)} q2,-8 6,-10" stroke="#a3bd6e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        s += plate(i, 8, lanes[i] - plateH / 2, plateW, plateH, label).svg;
      });
      choices.forEach((_, i) => { s += `<g class="kit" data-i="${i}"><g class="kit-in" transform="scale(${f(ks)})">${catFace(g.cat, { look: { x: 1, y: 0 } })}</g></g>`; });
      // おに（右）。はじめは うしろを向く
      const os = Math.max(0.3, Math.min(0.8, (oniW - 10) / 110));
      g.oniAt = { x: W - oniW / 2 - 6, y: H * 0.5, s: os };
      s += `<g transform="translate(${f(g.oniAt.x)} ${f(g.oniAt.y)}) scale(${f(os)})"><g class="oni"></g></g>`
        + `<g class="call" opacity="0"><rect x="${f(W - oniW - 4)}" y="${f(H * 0.5 - 70 * os - 30)}" width="${f(oniW - 4)}" height="24" rx="12" fill="#ffffff" stroke="${C.momiji}" stroke-width="2"/><text x="${f(W - oniW / 2 - 6)}" y="${f(H * 0.5 - 70 * os - 18)}" font-size="13" font-weight="700" fill="${C.momiji}" text-anchor="middle" dominant-baseline="central">ころんだ</text></g>`;
      return s;
    },
    after(g) {
      R.kits = Array.from(g.svg.querySelectorAll('.kit'));
      R.oni = g.svg.querySelector('.oni');
      R.call = g.svg.querySelector('.call');
      pos = new Array(g.n).fill(0);
      place(g);
      backOf(g);
    },
    async perform(g, decided, say) {
      const plan = dashPlan(g.n, decided, ROUNDS);
      const words = ['だ', 'る', 'ま', 'さ', 'ん', 'が'];
      delete g.stage.dataset.variant;
      const fastAt = Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 2) : -1;
      for (let r = 0; r < ROUNDS; r++) {
        const fast = r === fastAt;
        if (fast) g.stage.dataset.variant = 'fast';
        // だるまさんが…（すすむ）
        backOf(g);
        R.call.setAttribute('opacity', '0');
        const from = pos.slice();
        const to = plan[r];
        let said = -1;
        await frames(fast ? T.chant * FAST : T.chant, (t) => {
          const w = Math.min(words.length - 1, Math.floor(t * words.length));
          if (w !== said) { said = w; say(fast ? 'だるまさんが ころんだっ！（はやい！）' : `${words.slice(0, w + 1).join('')}…`); audio.step(w); }
          pos = from.map((p, i) => p + (to[i] - p) * ease.inOutSine(t));
          place(g);
          R.kits.forEach((el, i) => el.querySelector('.kit-in').setAttribute('transform', `translate(0 ${f(-Math.abs(Math.sin(t * Math.PI * 4 + i)) * 4)}) scale(${f(g.ks)})`));
        });
        if (r === ROUNDS - 1) break;
        // ころんだ！（ふりむく。こねこは止まる）
        say('だるまさんが ころんだ！');
        audio.readyGo(1);
        faceOf(g);
        R.call.setAttribute('opacity', '1');
        R.kits.forEach((el) => el.querySelector('.kit-in').setAttribute('transform', `scale(${f(g.ks)})`));
        if (fast) {
          // あわてて止まる：こねこが ぷるぷる
          await frames(T.turn + T.freeze, (t) => R.kits.forEach((el, i) => el.querySelector('.kit-in').setAttribute('transform', `translate(${f(Math.sin(t * 40 + i) * 1.6 * (1 - t))} 0) scale(${f(g.ks)})`)));
        } else {
          await wait(T.turn + T.freeze);
        }
      }
      // タッチ
      const got = pos.indexOf(Math.max(...pos)); // さいしょに おにへ着いた こねこ
      say('タッチ！');
      audio.pop();
      faceOf(g, 'happy');
      const el = R.kits[got].querySelector('.kit-in');
      el.innerHTML = catFace(g.cat, { mood: 'happy', look: { x: 1, y: 0 } });
      await frames(T.touch, (t) => el.setAttribute('transform', `translate(${f(Math.sin(Math.PI * t) * 8)} 0) scale(${f(g.ks * (1 + 0.15 * Math.sin(Math.PI * t)))})`));
      return got;
    },
  });

  // おにの うしろすがた（耳と まるい頭・しっぽ）と、ふりむいた顔。v15：イズの しま模様を、頭・せなか・しっぽにも描く
  function backOf(g) {
    const d = g.cat;
    const hc = `dh${g.n}`;
    const bc = `db${g.n}`;
    const back = d.body === 'saba'
      ? [50, 62, 74, 86, 98].map((y) => `<path d="M-44,${y} q22,8 44,0 q22,-8 44,0" stroke="${d.stripe}" stroke-width="4.6" fill="none" stroke-linecap="round"/>`).join('')
        + `<path d="M0,38 V102" stroke="${d.stripe}" stroke-width="5" stroke-linecap="round"/>`
      : `<ellipse cx="-22" cy="56" rx="22" ry="16" fill="${d.patchA}"/><ellipse cx="24" cy="84" rx="20" ry="15" fill="${d.patchB}"/>`;
    const nape = d.body === 'saba'
      ? `<path d="M-12,-34 v18 M0,-36 v22 M12,-34 v18 M-30,-24 q-4,10 0,20 M30,-24 q4,10 0,20 M-${d.head.rx},6 h14 M${d.head.rx},6 h-14 M-${d.head.rx - 4},18 h12 M${d.head.rx - 4},18 h-12" stroke="${d.stripe}" stroke-width="4.4" fill="none" stroke-linecap="round"/>`
      : d.face(d);
    R.oni.innerHTML = `<ellipse cx="0" cy="104" rx="46" ry="7" fill="#a0703f" opacity="0.18"/>`
      + tail(d, 'M30,96 C66,100 72,62 54,42', 11)
      + `<defs><clipPath id="${bc}"><ellipse cx="0" cy="70" rx="40" ry="34"/></clipPath><clipPath id="${hc}"><ellipse cx="0" cy="2" rx="${d.head.rx}" ry="${d.head.ry}"/></clipPath></defs>`
      + `<ellipse cx="0" cy="70" rx="40" ry="34" fill="${d.base}"/><g clip-path="url(#${bc})">${back}</g><ellipse cx="0" cy="70" rx="40" ry="34" fill="none" stroke="${d.line}" stroke-width="3.2"/>`
      + `<path d="M-${d.head.rx - 4},-14 L-${d.head.rx - 8},-48 L-10,-34 Z M${d.head.rx - 4},-14 L${d.head.rx - 8},-48 L10,-34 Z" fill="${d.earL}" stroke="${d.line}" stroke-width="3.2" stroke-linejoin="round"/>`
      + `<ellipse cx="0" cy="2" rx="${d.head.rx}" ry="${d.head.ry}" fill="${d.base}"/><g clip-path="url(#${hc})">${nape}</g>`
      + `<ellipse cx="0" cy="2" rx="${d.head.rx}" ry="${d.head.ry}" fill="none" stroke="${d.line}" stroke-width="3.2"/>`;
  }
  function faceOf(g, mood = 'normal') {
    R.oni.innerHTML = `<g transform="translate(0 24)">${catSitting(g.cat, { mood, look: { x: -1, y: 0 } })}</g>`;
  }
}
