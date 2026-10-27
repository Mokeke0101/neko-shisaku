// ねこの ねがえり（決め方：猫の気まぐれ〈ねどこ〉。見せ方の部品：選択肢を書いた クッション）。
// へやの ゆかに、選択肢を書いた クッションが 左右に並ぶ（v16 で作り直し。8A）。まん中の ラグで アズが ねている。
// 「ごろん」を押すと、アズは「いちばん ふかふかの クッションで ねたい」と、まるまったまま ごろんごろん ころがって
// クッションを たずねる。のって ふみふみ して「ちがうにゃ」と次へ。さいごに 気に入った クッションに のって、まるくなって ねる。
// アズが ねた クッションの選択肢が結果になる。選択肢は 2〜8 個（RS01-S08：12個は扱えない）。
// ころがる道は まん中の通り道を通る（ほかの クッションの上を ころがらない）。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. アズが すやすや ねている（Z が のぼる）。目を さまして「ふかふかの クッションは どれかにゃ」。
// 2. ごろんごろん ころがって クッションに のり、ふみふみ。「ちがうにゃ…」と次へ（2〜3か所）。
// 3. さいごの クッションの前で止まって「ここかな…？」。ぴょんと のって、ふみふみ、まるくなって ねる。
// 動きの ちがい（3B：4つ）：ふつう・はなちょうちん（ぱちん！）・ぐるぐる（ラグの上を ひとまわり）・いきすぎ（とおりすぎて もどる）。
// 結果は先に乱数で決め（RS01-S14）、たずねる クッションの並びを、決めた クッションで終わるように組む。
// クッションは どれも同じ大きさ（出やすさは表れない：RS01-S21）。
import { C } from '../art.js';
import { catCurled, pawPrint } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, nearest, TINTS, fitSize, f } from './common.js';
import { escapeXml } from '../ui.js';

export const MAX = 8;

// たずねる クッションの並び：決めた クッション decided で終わり、続けて同じ クッションにならない。
// 回数は 3〜4（2つの時は 3）。rand() は 0 以上 1 未満
export function rollSequence(n, decided, rand = Math.random) {
  const count = n <= 2 ? 3 : 3 + Math.floor(rand() * 2);
  const seq = [decided];
  while (seq.length < count) {
    const next = seq[0];
    let j = Math.floor(rand() * (n - 1));
    if (j >= next) j++;
    seq.unshift(j);
  }
  return seq;
}

// from の向き（度）から to の向きへ、近い方へまわる角度の差（-180〜180）
export const turnDelta = (from, to) => ((((to - from) % 360) + 540) % 360) - 180;

// 押してから結果が出るまでの、おおよその時間（ミリ秒）。count は たずねる回数
export const T = { wake: 900, roll: 820, knead: 520, last: 700, doubt: 500, hop: 650 };
export function negaeriDuration(count) {
  return T.wake + (count - 1) * (T.roll + T.knead) + T.last + T.doubt + T.hop;
}
export const VARIANTS = ['plain', 'bubble', 'loop', 'pass'];
export const negaeriVariant = (r = Math.random()) => VARIANTS[Math.min(3, Math.floor(r * 4))];

// クッションの置き場：左右2列（まん中は ころがる通り道）。数が奇数の時、さいごの1つは 下の まん中
export function cushionLayout(n, W, H) {
  const rows = Math.ceil(n / 2);
  const cw = Math.max(112, Math.min(140, (W - 12) * 0.33));
  const lane = W - 12 - 2 * cw;
  const rowH = (H - 12) / rows;
  const topH = Math.max(24, Math.min(50, rowH * 0.42));
  const frontH = Math.max(22, Math.min(30, rowH * 0.27));
  const ch = topH + frontH;
  const cx = W / 2;
  const list = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / 2);
    const single = n % 2 === 1 && i === n - 1;
    const x = single ? cx : i % 2 === 0 ? 6 + cw / 2 : W - 6 - cw / 2;
    const y = 6 + r * rowH + (rowH - ch) / 2 + topH / 2 + (rowH - ch) * 0.12;
    return { x, y };
  });
  // アズが はじめに ねている所（まん中の通り道。奇数の時は 下の クッションより上）
  const lastRow = n % 2 === 1 ? rows - 1 : rows;
  const home = { x: cx, y: 6 + (lastRow * rowH) / 2 + (n % 2 === 1 && rows === 1 ? -rowH * 0.3 : 0) };
  if (n === 1 || (n % 2 === 1 && rows === 1)) home.y = 6 + rowH * 0.25;
  return { rows, lane, cw, rowH, topH, frontH, ch, cx, list, home };
}

// クッション（上の面の まん中が 0,0）。上の面は ふっくら、前の面に選択肢を書く
function cushion(i, label, L) {
  const { cw, topH, frontH } = L;
  const [col, edge] = TINTS[i % TINTS.length];
  const w = cw;
  const x0 = -w / 2;
  const y0 = -topH / 2;
  const bulge = Math.min(6, topH * 0.16);
  // ふっくらした上の面（四すみが まるく、ふちが ふくらむ）
  const top = `M${f(x0 + 8)},${f(y0)} Q0,${f(y0 - bulge)} ${f(-x0 - 8)},${f(y0)} Q${f(-x0 + 2)},${f(y0)} ${f(-x0)},${f(y0 + 8)} Q${f(-x0 + bulge)},0 ${f(-x0)},${f(-y0 - 2)} L${f(x0)},${f(-y0 - 2)} Q${f(x0 - bulge)},0 ${f(x0)},${f(y0 + 8)} Q${f(x0 - 2)},${f(y0)} ${f(x0 + 8)},${f(y0)} Z`;
  const fy = -y0 - 4;
  const size = fitSize(label, w, frontH, 20);
  // 生地の もよう（水玉・しま・こうし を順に）
  let pat = '';
  const kind = i % 3;
  if (kind === 0) for (let yy = y0 + 6; yy < -y0 - 4; yy += 9) for (let xx = x0 + 9 + ((yy / 9) % 2) * 6; xx < -x0 - 6; xx += 12) pat += `<circle cx="${f(xx)}" cy="${f(yy)}" r="1.8"/>`;
  else if (kind === 1) for (let xx = x0 + 10; xx < -x0 - 4; xx += 12) pat += `<rect x="${f(xx)}" y="${f(y0 + 2)}" width="5" height="${f(topH - 4)}"/>`;
  else { for (let xx = x0 + 10; xx < -x0 - 4; xx += 14) pat += `<rect x="${f(xx)}" y="${f(y0 + 2)}" width="3" height="${f(topH - 4)}"/>`; for (let yy = y0 + 8; yy < -y0 - 4; yy += 10) pat += `<rect x="${f(x0 + 2)}" y="${f(yy)}" width="${f(w - 4)}" height="3"/>`; }
  const clip = `ngc${i}`;
  return `<ellipse cx="2" cy="${f(fy + frontH - 2)}" rx="${f(w * 0.52)}" ry="${f(Math.max(5, frontH * 0.3))}" fill="#a0703f" opacity="0.16"/>`
    // 前の面（あつみ。選択肢を書く）
    + `<g class="cell" data-i="${i}"><rect class="cell-bg" x="${f(x0)}" y="${f(fy)}" width="${f(w)}" height="${f(frontH)}" rx="${f(Math.min(10, frontH * 0.42))}" fill="${col}" stroke="${edge}" stroke-width="2"/>`
    + `<path d="M${f(x0 + 6)},${f(fy + frontH - 4)} H${f(-x0 - 6)}" stroke="${edge}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.6"/>`
    + `<text class="cell-label" x="0" y="${f(fy + frontH / 2 + 0.5)}" font-size="${f(size)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text></g>`
    // 上の面
    + `<g class="ng-top" data-i="${i}"><path d="${top}" fill="${col}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>`
    + `<defs><clipPath id="${clip}"><path d="${top}"/></clipPath></defs>`
    + `<g clip-path="url(#${clip})" fill="#ffffff" opacity="0.38">${pat}</g>`
    + `<path d="${top}" fill="#ffffff" opacity="0.12"/>`
    // ふっくら（まん中が明るく、ふちが こい）と、まん中の ボタンどめ（短い しわ）
    + `<ellipse cx="0" cy="${f(-topH * 0.06)}" rx="${f(w * 0.36)}" ry="${f(topH * 0.3)}" fill="#ffffff" opacity="0.22"/>`
    + `<path d="${top}" fill="none" stroke="${edge}" stroke-width="5" opacity="0.18" clip-path="url(#${clip})"/>`
    + `<path d="M-7,-3 q3,2 5,2 M7,-3 q-3,2 -5,2 M-7,3 q3,-2 5,-2 M7,3 q-3,-2 -5,-2" stroke="${edge}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.7"/>`
    + `<circle r="${f(Math.max(2.4, topH * 0.07))}" fill="${edge}"/><circle cx="-0.8" cy="-0.8" r="0.9" fill="#ffffff" opacity="0.7"/></g>`
    // すみの ふさ
    + [x0 + 2, -x0 - 2].map((x) => `<circle cx="${f(x)}" cy="${f(y0 + 3)}" r="3" fill="${edge}"/>`).join('');
}

export function createNegaeri(deps) {
  const R = {};
  let rot = 0;
  let pos = { x: 0, y: 0 };
  // 猫を置く（x・y・まわり・つぶれ）
  const setCat = (g, p, r, sq = 1) => {
    pos = p;
    rot = r;
    R.cat.setAttribute('transform', `translate(${f(p.x)} ${f(p.y)})`);
    R.rot.setAttribute('transform', `rotate(${f(r)}) scale(${f(g.catS)})`);
    R.squash.setAttribute('transform', `scale(${f(2 - sq)} ${f(sq)})`);
  };
  const face = (g, opts) => { R.catIn.innerHTML = catCurled(g.cat, opts); };
  const puffZ = (g) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', f(pos.x + 26 * g.catS));
    t.setAttribute('y', f(pos.y - 30 * g.catS));
    t.setAttribute('font-size', '18');
    t.setAttribute('font-weight', '700');
    t.setAttribute('fill', C.chestnut);
    t.textContent = 'z';
    R.z.appendChild(t);
    t.animate([{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { transform: 'translate(14px,-30px)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => t.remove();
  };
  // クッション i の上で ねる所
  // （猫の下の はしが 前の面に かからない高さ。選択肢の文字が かくれない）
  const bedOf = (g, i) => ({ x: g.L.list[i].x, y: g.L.list[i].y + g.L.topH / 2 - 2 - 52 * g.catS });
  // 通り道を通って p から q へ ごろんごろん ころがる（道の長さだけ まわる。まわり終わりは まっすぐ）
  const rollTo = async (g, q, dur, { loop = false } = {}) => {
    const p = { ...pos };
    const pts = [p];
    const lx = g.L.cx;
    if (Math.abs(p.x - lx) > 2) pts.push({ x: lx, y: p.y });
    if (loop) {
      // ぐるぐる：通り道で 小さく ひとまわり
      const r = Math.min(g.L.lane * 0.3, 30);
      const c = { x: lx, y: (p.y + q.y) / 2 };
      for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI * 2; pts.push({ x: c.x + Math.sin(a) * r, y: c.y - r + Math.cos(a) * r }); }
    }
    if (Math.abs(q.x - lx) > 2) pts.push({ x: lx, y: q.y });
    pts.push(q);
    const seg = pts.slice(1).map((b, k) => Math.hypot(b.x - pts[k].x, b.y - pts[k].y));
    const total = seg.reduce((a, b) => a + b, 0) || 1;
    const rad = 40 * g.catS;
    const dir = q.x >= p.x ? 1 : -1;
    const r0 = rot;
    const r1 = r0 + dir * Math.max(360, Math.round(((total / rad) * 180) / Math.PI / 360) * 360);
    let lastTick = 0;
    audio.roll(Math.floor(Math.random() * 5));
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      let d = e * total;
      let k = 0;
      while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++; }
      const a = pts[k];
      const b = pts[k + 1];
      const u = seg[k] ? Math.min(1, d / seg[k]) : 1;
      const r = r0 + (r1 - r0) * e;
      setCat(g, { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, r, 1 - 0.07 * Math.abs(Math.sin((r * Math.PI) / 180)));
      if (Math.floor((r - r0) / 180) !== lastTick) { lastTick = Math.floor((r - r0) / 180); audio.tick(); }
    });
    setCat(g, q, r1 % 360);
  };
  // ふみふみ：クッションの上の面が へこむ
  const knead = async (g, i, dur) => {
    const top = R.tops[i];
    await frames(dur, (t) => {
      const s = 1 - 0.06 * Math.abs(Math.sin(t * Math.PI * 3));
      top.setAttribute('transform', `scale(1 ${f(s)})`);
      R.squash.setAttribute('transform', `scale(${f(1 + (1 - s) * 0.6)} ${f(s)})`);
    });
    top.removeAttribute('transform');
    R.squash.removeAttribute('transform');
  };
  return createGame(deps, {
    play: 'ごろん',
    resultLabel: 'ここで ねるよ',
    draw(g) {
      const { n, W, H, choices } = g;
      const L = cushionLayout(n, W, H);
      g.L = L;
      g.catS = Math.max(0.34, Math.min(0.8, (L.cw * 0.7) / 116, (L.topH + 16) / 80, L.lane / 128));
      g.beds = L.list.map((c) => ({ cx: c.x, cy: c.y }));
      // へやの ゆか（板）と、まん中の ラグ
      // v17 の後（テーマパーク）：ゆかは パステルの ふわふわ マット（水玉。ふちに あつみ）
      let s = `<rect x="0" y="4" width="${W}" height="${H - 4}" rx="16" fill="#cdbfe0"/>`
        + `<rect x="0" y="0" width="${W}" height="${H - 4}" rx="16" fill="#f3eef8" stroke="#a985c9" stroke-width="2.4"/>`;
      for (let y = 16; y < H - 10; y += 18) for (let x = 14 + (Math.round(y / 18) % 2) * 9; x < W - 8; x += 18) s += `<circle cx="${x}" cy="${y}" r="1.6" fill="#e2d6ef"/>`;
      // 窓の ひだまり
      s += `<path d="M${f(W * 0.3)},0 L${f(W * 0.72)},0 L${f(W * 0.62)},${f(H * 0.5)} L${f(W * 0.18)},${f(H * 0.5)} Z" fill="#fff6dc" opacity="0.45"/>`;
      const rugRx = Math.min(L.lane * 0.46, 70);
      const rugRy = Math.min(L.rowH * 0.55, 60);
      s += `<ellipse cx="${f(L.home.x)}" cy="${f(L.home.y + 4)}" rx="${f(rugRx + 6)}" ry="${f(rugRy + 5)}" fill="#f7c4b4" opacity="0.6"/>`
        + `<ellipse cx="${f(L.home.x)}" cy="${f(L.home.y + 4)}" rx="${f(rugRx)}" ry="${f(rugRy)}" fill="#fde3d6" stroke="#f1b8a3" stroke-width="2.4"/>`
        + `<ellipse cx="${f(L.home.x)}" cy="${f(L.home.y + 4)}" rx="${f(rugRx * 0.72)}" ry="${f(rugRy * 0.72)}" fill="none" stroke="#fffaf0" stroke-width="2.4" stroke-dasharray="4 6" stroke-linecap="round"/>`;
      // 通り道の あしあと（うすく）
      for (let y = 20; y < H - 10; y += 28) s += `<g transform="translate(${f(L.cx + (y % 56 ? -7 : 7))} ${y}) rotate(180)" opacity="0.18">${pawPrint('#b98a52', 7)}</g>`;
      // ねずみの おもちゃ
      s += `<g transform="translate(${f(L.cx + rugRx * 0.7)} ${f(L.home.y + rugRy * 0.8)})"><ellipse rx="9" ry="5.5" fill="#d6cfc0" stroke="#8f8499" stroke-width="1.6"/><circle cx="-6" cy="-4" r="2.8" fill="#d6cfc0" stroke="#8f8499" stroke-width="1.2"/><path d="M9,0 q7,2 9,-5" stroke="#8f8499" stroke-width="1.6" fill="none"/><circle cx="-7" cy="-1" r="1" fill="#4a3a33"/></g>`;
      // クッション
      L.list.forEach((c, i) => { s += `<g class="ng-cush" transform="translate(${f(c.x)} ${f(c.y)})">${cushion(i, choices[i], L)}</g>`; });
      // 猫と Z
      s += `<g class="ng-cat"><g class="ng-rot"><g class="ng-squash"><g class="ng-in">${catCurled(g.cat)}</g></g></g></g><g class="ng-z"></g>`;
      return s;
    },
    after(g) {
      const q = (c) => g.svg.querySelector(c);
      Object.assign(R, { cat: q('.ng-cat'), rot: q('.ng-rot'), squash: q('.ng-squash'), catIn: q('.ng-in'), z: q('.ng-z') });
      R.tops = Array.from(g.svg.querySelectorAll('.ng-top'));
      setCat(g, { ...g.L.home }, 0);
    },
    async perform(g, decided, say) {
      const { n } = g;
      const seq = rollSequence(n, decided);
      const variant = negaeriVariant();
      g.stage.dataset.variant = variant;
      // 1. すやすや → 目を さます
      say('すやすや…');
      puffZ(g);
      await wait(T.wake * 0.5);
      face(g, { sleep: false });
      say('ふかふかの クッションは どれかにゃ…');
      await frames(T.wake * 0.5, (t) => setCat(g, pos, rot, 1 + 0.1 * Math.sin(Math.PI * t)));
      // 2. ごろんごろん ころがって、のって ふみふみ。「ちがうにゃ」
      for (let k = 0; k < seq.length - 1; k++) {
        say('ごろん ごろん…');
        await rollTo(g, bedOf(g, seq[k]), T.roll, { loop: variant === 'loop' && k === 0 });
        if (variant === 'bubble' && k === 0) {
          // はなちょうちん：ふみふみの かわりに うとうと… ぱちん！
          say('うとうと… すぴー');
          const b = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          b.setAttribute('cx', f(pos.x + 34 * g.catS));
          b.setAttribute('cy', f(pos.y + 6 * g.catS));
          b.setAttribute('fill', '#eaf6fb');
          b.setAttribute('fill-opacity', '0.75');
          b.setAttribute('stroke', '#9fc8cf');
          b.setAttribute('stroke-width', '1.6');
          R.z.appendChild(b);
          face(g, { sleep: true });
          await frames(T.knead * 0.8, (t) => b.setAttribute('r', f(2 + 16 * g.catS * t)));
          audio.pop();
          b.remove();
          face(g, { sleep: false });
          say('ぱちん！ ちがうにゃ');
          await wait(T.knead * 0.2);
        } else {
          say('ふみふみ…');
          await knead(g, seq[k], T.knead * 0.7);
          say('ちがうにゃ…');
          await wait(T.knead * 0.3);
        }
      }
      // 3. さいごの クッションの前（通り道）まで ころがって、「ここかな…？」。ぴょんと のる
      const bed = bedOf(g, decided);
      const before = { x: g.L.cx, y: bed.y + (Math.abs(bed.x - g.L.cx) < 2 ? -g.L.topH * 0.9 : 0) };
      say('ごろん ごろん…');
      if (variant === 'pass') {
        // いきすぎ：となりの段まで ころがってから もどる
        const over = { x: g.L.cx, y: Math.min(g.H - 30, Math.max(30, before.y + (before.y > g.H / 2 ? -1 : 1) * g.L.rowH * 0.7)) };
        await rollTo(g, over, T.last * 0.6);
        say('いきすぎた！');
        await rollTo(g, before, T.last * 0.4);
      } else {
        await rollTo(g, before, T.last);
      }
      say('ここかな…？');
      audio.heart();
      await frames(T.doubt, (t) => setCat(g, pos, rot + Math.sin(t * Math.PI * 2) * 8, 1));
      const from = { ...pos };
      audio.hop(2);
      await frames(T.hop * 0.5, (t) => {
        const e = ease.inOutSine(t);
        setCat(g, { x: from.x + (bed.x - from.x) * e, y: from.y + (bed.y - from.y) * e - Math.sin(Math.PI * t) * 26 }, rot, 1);
      });
      const got = nearest(g.beds, pos.x, pos.y); // アズが のった クッション
      say('ふみふみ…');
      await knead(g, got, T.hop * 0.5);
      // まるくなって ねる
      face(g, { sleep: true });
      puffZ(g);
      return got;
    },
  });
}
