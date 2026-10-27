// ねこ ガチャ（決め方：隠して当てる〈カプセル〉。見せ方の部品：番号と色つきの一覧）。
// だがしやの店先に、ねこの耳が付いた ガチャの台が ある。イズが コインを ちゃりんと入れ、ハンドルを まわすと、
// カプセルが ころんと出てくる。ぱかっと ひらくと、中の番号の選択肢が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 0. イズが コインを入れる（ちゃりん）。台の ランプが ともる。
// 1. ハンドルを「ガチャ、ガチャ」と3回まわす。まわすたびに、まるい窓の中の カプセルが ゆれる。
// 2. ふたが ひらいて、カプセルが ころがり出て、ぽよんと はねる。
// 3. カプセルが ぶるぶる ゆれてから、ぱかっと ひらき、番号が出る。
// 結果は先に乱数で決め（RS01-S14）、出てくる カプセルを その結果の色と番号にする。
// 一覧の欄はどれも同じ大きさ（RS01-S21）。
// v17 の後（テーマパーク）：一覧は ガチャの 台と おなじ ピンクの カウンターに ならべた パステルの札（common.js の plate）。景品の板も パステル。
// 動きの ちがい（3B：4つ）：ふつう・キラキラ（カプセルが 光る）・かたい（ハンドルが かたくて、ぐぐっと もう ひとまわし）・
// あかない（カプセルが なかなか あかず、とんとん はねさせると ぱかっ）。
import { C } from '../art.js';
import { catSitting, catPaw, catName } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames, wait } from '../fx.js';
import { createGame, grid, plate, hintPlate, TINTS, f } from './common.js';
import { plush } from './crane.js';

export const TURNS = 3;
export const T = { coin: 900, turn: 620, out: 760, bounce: 380, shake: 900, open: 560 };
// 動きの ちがい キラキラ：出てきた カプセルが 光る（あけるまで少し長く ためる）
export const SHINE = 420;
export const gachaDuration = (shine = false) => T.coin + TURNS * (T.turn + 90) + T.out + T.bounce + T.shake + T.open + 300 + (shine ? SHINE : 0);

// カプセル（中心 0,0・半径 r）。上が色、下が白。番号は ひらいた時に見せる
function capsule(i, r) {
  const [col, edge] = TINTS[i % TINTS.length];
  return `<g class="cap-bottom"><path d="M${f(-r)},0 A${f(r)},${f(r)} 0 0 0 ${f(r)},0 Z" fill="#ffffff" stroke="${edge}" stroke-width="2"/></g>`
    + `<g class="cap-num" opacity="0"><circle r="${f(r * 0.62)}" fill="${C.paper}" stroke="${edge}" stroke-width="2"/><text y="1" font-size="${f(r * 0.8)}" font-weight="700" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${i + 1}</text></g>`
    + `<g class="cap-top"><path d="M${f(-r)},0 A${f(r)},${f(r)} 0 0 1 ${f(r)},0 Z" fill="${col}" stroke="${edge}" stroke-width="2"/><ellipse cx="${f(-r * 0.35)}" cy="${f(-r * 0.5)}" rx="${f(r * 0.18)}" ry="${f(r * 0.1)}" fill="#ffffff" opacity="0.7"/></g>`;
}

// ハンドルの つまみの位置（ハンドルの中心から。deg はハンドルの回転）
const knobAt = (h, deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: h.x + Math.cos(a) * h.r * 0.8, y: h.y + Math.sin(a) * h.r * 0.8 };
};

export function createGacha(deps) {
  const R = {};
  // イズの腕（肩から前足まで）。前足は (x, y)
  const setArm = (g, x, y) => {
    const s = g.shoulder;
    const d = `M${f(s.x)},${f(s.y)} Q${f((s.x + x) / 2)},${f(Math.max(s.y, y) + g.cs * 10)} ${f(x)},${f(y)}`;
    R.armLine.setAttribute('d', d);
    R.armFill.setAttribute('d', d);
    R.paw.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
    g.pawAt = { x, y };
  };
  const movePaw = async (g, x, y, dur) => {
    const a = { ...g.pawAt };
    await frames(dur, (t) => { const e = ease.inOutSine(t); setArm(g, a.x + (x - a.x) * e, a.y + (y - a.y) * e - Math.sin(Math.PI * t) * 6); });
  };
  return createGame(deps, {
    play: 'まわす',
    resultLabel: 'でてきたのは',
    draw(g) {
      const { n, W, H, choices, cat } = g;
      const cols = n <= 5 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      const rowH = Math.max(24, Math.min(40, (H * 0.5) / rows));
      const listH = rows * rowH + (rows - 1) * 5 + 16;
      const topH = H - listH - 6;
      const cells = grid(n, { x: 12, y: topH + 8, w: W - 24, h: listH - 16 }, cols, 6);
      // ガチャの台（ねこの耳つきの まるい窓・看板・コインの口・ハンドル・とりだし口）
      const floor = topH - 6;
      const domeR = Math.max(26, Math.min(86, (floor - 30) * 0.27, W * 0.2));
      const bodyW = domeR * 2.1;
      const bodyH = Math.max(34, Math.min(domeR * 1.45, floor - domeR * 2.3 - 8));
      const mx = W * 0.36;
      const bodyY = floor - bodyH;
      const domeY = bodyY - domeR + 8;
      const capR = Math.max(9, Math.min(22, domeR * 0.28));
      Object.assign(g, { cells, mx, domeR, domeY, bodyY, bodyW, bodyH, capR, floor });
      g.outlet = { x: mx - bodyW * 0.22, y: bodyY + bodyH * 0.74 };
      g.tray = { x: Math.max(capR + 6, mx - bodyW / 2 - capR * 1.6), y: floor - capR };
      g.handle = { x: mx + bodyW * 0.24, y: bodyY + bodyH * 0.64, r: Math.min(bodyH * 0.26, domeR * 0.36) };
      g.slot = { x: mx + bodyW * 0.32, y: bodyY + bodyH * 0.24 };
      let s = `<ellipse cx="${f(mx)}" cy="${f(floor + 2)}" rx="${f(bodyW * 0.75)}" ry="6" fill="#a0703f" opacity="0.18"/>`;
      // 耳（まるい窓の上）
      const ear = (sg) => `<path d="M${f(mx + sg * domeR * 0.3)},${f(domeY - domeR * 0.92)} L${f(mx + sg * domeR * 0.74)},${f(domeY - domeR * 1.24)} L${f(mx + sg * domeR * 0.82)},${f(domeY - domeR * 0.56)} Z" fill="#f7a6a0" stroke="#d97f7a" stroke-width="3" stroke-linejoin="round"/>`
        + `<path d="M${f(mx + sg * domeR * 0.46)},${f(domeY - domeR * 0.92)} L${f(mx + sg * domeR * 0.7)},${f(domeY - domeR * 1.1)} L${f(mx + sg * domeR * 0.74)},${f(domeY - domeR * 0.74)} Z" fill="#fde3e6"/>`;
      s += ear(-1) + ear(1);
      // 台
      s += `<rect x="${f(mx - bodyW / 2)}" y="${f(bodyY)}" width="${f(bodyW)}" height="${f(bodyH)}" rx="14" fill="#f7a6a0" stroke="#d97f7a" stroke-width="3"/>`
        + `<rect x="${f(mx - bodyW / 2 - 4)}" y="${f(bodyY - 4)}" width="${f(bodyW + 8)}" height="12" rx="6" fill="#fde3a6" stroke="#d9b04d" stroke-width="2"/>`;
      // 看板「ねこガチャ」と、ランプ
      // 看板は 台の左はしから コインの口の手前まで。文字は 看板の まるい はしに かからない大きさにする
      // （台が小さい時に 文字が看板から はみ出していた：v12 の後に依頼者が見つけた）。とても小さい時は「ガチャ」だけ
      const signH = Math.max(16, bodyH * 0.22);
      const signX = mx - bodyW * 0.46;
      const signW = g.slot.x - capR * 0.7 - 4 - signX;
      const signY = bodyY + bodyH * 0.13;
      const fit = (len) => Math.min(signH * 0.64, (signW - signH * 0.8) / (len + 0.1));
      const signText = fit(5) >= 8.5 ? 'ねこガチャ' : 'ガチャ';
      s += `<rect x="${f(signX)}" y="${f(signY)}" width="${f(signW)}" height="${f(signH)}" rx="${f(signH / 2)}" fill="#fffaf0" stroke="#d97f7a" stroke-width="2"/>`
        + `<text class="ga-sign" x="${f(signX + signW / 2)}" y="${f(signY + signH / 2 + 0.5)}" font-size="${f(fit(signText.length))}" font-weight="700" fill="#c8615c" text-anchor="middle" dominant-baseline="central">${signText}</text>`;
      for (let k = 0; k < 3; k++) s += `<circle class="lamp" cx="${f(signX + signW * (0.2 + k * 0.3))}" cy="${f(signY + signH + Math.max(7, bodyH * 0.1))}" r="${f(Math.max(3, bodyH * 0.05))}" fill="#fff1c4" stroke="#d9b04d" stroke-width="1.4"/>`;
      // コインの口
      s += `<rect x="${f(g.slot.x - capR * 0.7)}" y="${f(g.slot.y - capR * 0.45)}" width="${f(capR * 1.4)}" height="${f(capR * 0.9)}" rx="${f(capR * 0.25)}" fill="#fffaf0" stroke="#d97f7a" stroke-width="2"/>`
        + `<rect x="${f(g.slot.x - 1.6)}" y="${f(g.slot.y - capR * 0.3)}" width="3.2" height="${f(capR * 0.6)}" rx="1.6" fill="#8c6e5a"/>`;
      // とりだし口（ふた）
      s += `<rect x="${f(g.outlet.x - capR * 1.3)}" y="${f(g.outlet.y - capR * 1.0)}" width="${f(capR * 2.6)}" height="${f(capR * 2.0)}" rx="${f(capR * 0.6)}" fill="#a0703f" opacity="0.5"/>`
        + `<path class="flap" d="M${f(g.outlet.x - capR * 1.15)},${f(g.outlet.y - capR * 0.85)} h${f(capR * 2.3)} v${f(capR * 1.1)} h${f(-capR * 2.3)} Z" fill="#fbd0cc" stroke="#d97f7a" stroke-width="2"/>`;
      // まるい窓
      s += `<circle cx="${f(mx)}" cy="${f(domeY)}" r="${f(domeR)}" fill="#eaf6fb" fill-opacity="0.85" stroke="#9fc8cf" stroke-width="3"/>`;
      const inside = Math.max(n, 9);
      s += '<g class="dome-caps">';
      for (let k = 0; k < inside; k++) {
        const a = k * 2.399;
        const rr = (domeR - capR - 4) * Math.sqrt((k + 0.5) / inside);
        const x = mx + Math.cos(a) * rr;
        const y = domeY + domeR * 0.15 + Math.sin(a) * rr * 0.75;
        s += `<g class="dcap" data-x="${f(x)}" data-y="${f(y)}" transform="translate(${f(x)} ${f(y)}) rotate(${(k * 47) % 360})">${capsule(k % n, capR * 0.82)}</g>`;
      }
      s += '</g>'
        + `<path d="M${f(mx - domeR * 0.55)},${f(domeY - domeR * 0.5)} q${f(domeR * 0.2)},${f(-domeR * 0.25)} ${f(domeR * 0.5)},${f(-domeR * 0.3)}" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>`
        + `<g class="handle" transform="translate(${f(g.handle.x)} ${f(g.handle.y)})"><circle r="${f(g.handle.r)}" fill="#fffaf0" stroke="#d97f7a" stroke-width="3"/><rect x="${f(-g.handle.r * 0.95)}" y="${f(-g.handle.r * 0.22)}" width="${f(g.handle.r * 1.9)}" height="${f(g.handle.r * 0.44)}" rx="${f(g.handle.r * 0.2)}" fill="#f6d58a" stroke="#d9b04d" stroke-width="2"/></g>`;
      // イズ（右に すわって、ハンドルへ 手を のばす）
      const cs = Math.max(0.3, Math.min(0.72, domeR / 92));
      const catX = Math.min(W - 50 * cs - 4, mx + bodyW / 2 + 54 * cs);
      const catY = floor - 78 * cs;
      g.cs = cs;
      g.shoulder = { x: catX - 26 * cs, y: catY + 18 * cs };
      g.home = knobAt(g.handle, 0);
      // 景品の板（右上。場所が あれば）
      const boardX = mx + bodyW / 2 + 12;
      const boardW = W - 10 - boardX;
      const boardTop = 8;
      const boardH = Math.min(boardW * 0.9, catY - 76 * cs - 8 - boardTop);
      if (boardW > 70 && boardH > 54) {
        const ps = Math.min(boardW / 3.8, boardH * 0.36);
        const fs = Math.max(12, Math.min(17, boardH * 0.16, (boardW - 10) / 7));
        s += `<rect x="${f(boardX + 2)}" y="${f(boardTop + 4)}" width="${f(boardW)}" height="${f(boardH)}" rx="8" fill="#c97a6e" opacity="0.3"/>`
          + `<rect x="${f(boardX)}" y="${f(boardTop)}" width="${f(boardW)}" height="${f(boardH)}" rx="10" fill="#fde3e8" stroke="#e391ad" stroke-width="2.4"/>`
          + `<text x="${f(boardX + boardW / 2)}" y="${f(boardTop + 6 + fs * 0.7)}" font-size="${f(fs)}" font-weight="700" fill="#c8615c" text-anchor="middle" dominant-baseline="central">あたり いろいろ</text>`;
        for (let k = 0; k < 3; k++) {
          s += `<g transform="translate(${f(boardX + boardW * (0.2 + k * 0.3))} ${f(boardTop + 10 + fs * 1.4 + (boardH - 10 - fs * 1.4) / 2)})">${plush(k, TINTS[(k * 4 + 1) % TINTS.length], ps)}</g>`;
        }
      }
      // 床に ころがった カプセル（かざり）
      s += `<g transform="translate(${f(W - 16)} ${f(floor - capR * 0.7)}) rotate(-30)">${capsule(4, capR * 0.7)}</g>`;
      s += `<g transform="translate(${f(catX)} ${f(catY)}) scale(${f(cs)})"><g class="ga-cat">${catSitting(cat, { look: { x: -1, y: 0.3 } })}</g></g>`
        + `<path class="ga-arm-line" stroke="${cat.line}" stroke-width="${f(16 * cs + 5)}" stroke-linecap="round" fill="none"/>`
        + `<path class="ga-arm" stroke="${cat.paw}" stroke-width="${f(16 * cs)}" stroke-linecap="round" fill="none"/>`
        + `<g class="ga-paw">${catPaw(cat, Math.max(7, 12 * cs))}</g>`;
      s += `<g class="coin" opacity="0"><circle r="${f(capR * 0.42)}" fill="#f6d55e" stroke="#d4b043" stroke-width="2"/><path d="M0,${f(-capR * 0.2)} v${f(capR * 0.4)}" stroke="#d4b043" stroke-width="2" stroke-linecap="round"/></g>`;
      s += `<g class="out-cap" opacity="0"></g>`;
      // 一覧
      s += `<rect x="8" y="${f(topH + 8)}" width="${W - 12}" height="${f(listH)}" rx="12" fill="#5a3a22" opacity="0.3"/>`
        + `<rect x="6" y="${f(topH + 6)}" width="${W - 12}" height="${f(listH)}" rx="12" fill="#e8998c"/>`
        + `<rect x="6" y="${f(topH + 2)}" width="${W - 12}" height="${f(listH)}" rx="12" fill="#f7b4a6" stroke="#c97a6e" stroke-width="2.4"/>`
        + `<rect x="12" y="${f(topH + 4)}" width="${W - 24}" height="3" rx="1.5" fill="#ffffff" opacity="0.5"/>`;
      cells.forEach((c, i) => { s += plate(i, c.x, c.y, c.w, c.h, choices[i], { badge: i + 1, tint: TINTS[i % TINTS.length] }).svg; });
      return s;
    },
    after(g) {
      R.handle = g.svg.querySelector('.handle');
      R.caps = Array.from(g.svg.querySelectorAll('.dcap'));
      R.out = g.svg.querySelector('.out-cap');
      R.cat = g.svg.querySelector('.ga-cat');
      R.armLine = g.svg.querySelector('.ga-arm-line');
      R.armFill = g.svg.querySelector('.ga-arm');
      R.paw = g.svg.querySelector('.ga-paw');
      R.coin = g.svg.querySelector('.coin');
      R.lamps = Array.from(g.svg.querySelectorAll('.lamp'));
      R.flap = g.svg.querySelector('.flap');
      setArm(g, g.home.x, g.home.y);
    },
    async perform(g, decided, say) {
      const { svg, n, cat } = g;
      const vr = Math.random();
      const variant = vr < 0.25 ? 'shine' : vr < 0.5 ? 'katai' : vr < 0.75 ? 'akanai' : 'plain';
      g.stage.dataset.variant = variant;
      // 0. コインを入れる
      say(`${catName(cat)}が コインを いれるよ`);
      await movePaw(g, g.slot.x + g.capR * 0.3, g.slot.y - g.capR * 1.1, T.coin * 0.45);
      R.coin.setAttribute('opacity', '1');
      await frames(T.coin * 0.3, (t) => {
        R.coin.setAttribute('transform', `translate(${f(g.slot.x)} ${f(g.slot.y - g.capR * 1.0 + g.capR * 0.9 * t)})`);
        R.coin.setAttribute('opacity', f(1 - Math.max(0, t - 0.6) * 2.5));
      });
      R.coin.setAttribute('opacity', '0');
      audio.coin();
      const glow = R.lamps.map((el, k) => el.animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { duration: 480, delay: k * 120, iterations: Infinity }));
      R.lamps.forEach((el) => el.setAttribute('fill', '#ffd36b'));
      await movePaw(g, g.home.x, g.home.y, T.coin * 0.25);
      // 1. ハンドルを3回まわす
      let lit = -1;
      for (let k = 0; k < TURNS; k++) {
        say(k === 0 ? 'ガチャ…' : k === 1 ? 'ガチャ…ガチャ…' : 'ガチャ ガチャ…！');
        audio.rattle();
        const a0 = k * 120;
        await frames(T.turn, (t) => {
          const deg = a0 + 120 * ease.inOutSine(t);
          R.handle.setAttribute('transform', `translate(${f(g.handle.x)} ${f(g.handle.y)}) rotate(${f(deg)})`);
          const kn = knobAt(g.handle, deg);
          setArm(g, kn.x, kn.y);
          R.caps.forEach((el, j) => {
            const x = Number(el.dataset.x) + Math.sin(t * 9 + j) * 3;
            const y = Number(el.dataset.y) + Math.cos(t * 7 + j * 2) * 3;
            el.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f((j * 47 + t * 90 * (j % 2 ? 1 : -1)) % 360)})`);
          });
          const want = Math.floor(t * 3 + k * 3) % n;
          if (want !== lit) { if (lit >= 0) hintPlate(svg, lit, false); lit = (want * 5 + k) % n; hintPlate(svg, lit, true); }
        });
        audio.tick();
        await wait(90);
      }
      if (lit >= 0) hintPlate(svg, lit, false);
      if (variant === 'katai') {
        // かたい：ハンドルが かたくて、ぐぐっと もう ひとまわし
        say('…かたい！');
        R.cat.innerHTML = catSitting(cat, { mood: 'strain', look: { x: -1, y: 0.3 } });
        audio.heart();
        await frames(360, (t) => {
          const deg = TURNS * 120 + Math.sin(t * Math.PI * 6) * 4;
          R.handle.setAttribute('transform', `translate(${f(g.handle.x)} ${f(g.handle.y)}) rotate(${f(deg)})`);
          const kn = knobAt(g.handle, deg);
          setArm(g, kn.x, kn.y);
        });
        say('ぐぐっ… ガチャ！');
        audio.rattle();
        await frames(300, (t) => {
          const deg = TURNS * 120 + 120 * ease.outCubic(t);
          R.handle.setAttribute('transform', `translate(${f(g.handle.x)} ${f(g.handle.y)}) rotate(${f(deg)})`);
          const kn = knobAt(g.handle, deg);
          setArm(g, kn.x, kn.y);
        });
        R.cat.innerHTML = catSitting(cat, { look: { x: -1, y: 0.3 } });
      }
      // 2. ふたが ひらいて、カプセルが ころがり出る
      say('ころん！');
      R.flap.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${f(g.capR * 0.8)}px)` }, { transform: 'translateY(0)' }], { duration: 520 });
      R.out.innerHTML = `<g class="spin">${capsule(decided, g.capR)}</g>`;
      R.out.dataset.i = String(decided);
      R.out.setAttribute('opacity', '1');
      const spin = R.out.querySelector('.spin');
      const a = g.outlet;
      const b = g.tray;
      audio.slide(T.out / 1000);
      await frames(T.out, (t) => {
        const e = ease.outCubic(t);
        R.out.setAttribute('transform', `translate(${f(a.x + (b.x - a.x) * e)} ${f(a.y + (b.y - a.y) * e)})`);
        spin.setAttribute('transform', `rotate(${f(-360 * e)})`);
      });
      audio.hop(2);
      await frames(T.bounce, (t) => R.out.setAttribute('transform', `translate(${f(b.x)} ${f(b.y - Math.sin(Math.PI * t) * g.capR * 0.9)})`));
      // キラキラ：カプセルが 光る
      if (variant === 'shine') {
        say('キラキラ…！？');
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        let rays = `<circle r="${f(g.capR * 1.5)}" fill="#fff1c4" opacity="0.85"/>`;
        for (let k = 0; k < 8; k++) rays += `<path d="M0,${f(-g.capR * 1.7)} V${f(-g.capR * 2.4)}" stroke="#ffd36b" stroke-width="3" stroke-linecap="round" transform="rotate(${k * 45})"/>`;
        glow.innerHTML = rays;
        R.out.insertBefore(glow, R.out.firstChild);
        audio.bell(96, 0, 0.12);
        audio.bell(100, 0.12, 0.1);
        await frames(SHINE, (t) => glow.setAttribute('transform', `rotate(${f(t * 90)}) scale(${f(0.6 + 0.4 * Math.sin(Math.PI * t * 2) ** 2)})`));
      }
      // 3. ぶるぶる ゆれてから ひらく
      say('なにが でるかな…');
      R.cat.innerHTML = catSitting(cat, { look: { x: -1, y: 0.8 } });
      audio.heart();
      await frames(T.shake, (t) => spin.setAttribute('transform', `rotate(${f(Math.sin(t * Math.PI * 10) * 10 * (0.4 + t))})`));
      spin.removeAttribute('transform');
      if (variant === 'akanai') {
        // あかない：ふたが ちょっと うくだけ。とんとん はねさせる
        say('…あかない');
        const top0 = R.out.querySelector('.cap-top');
        await frames(320, (t) => top0.setAttribute('transform', `translate(0 ${f(-Math.sin(Math.PI * t) * g.capR * 0.2)})`));
        R.cat.innerHTML = catSitting(cat, { mood: 'strain', look: { x: -1, y: 0.8 } });
        const tr = g.tray;
        say('えいっ、えいっ');
        for (let q = 0; q < 2; q++) {
          audio.tap();
          await frames(220, (t) => R.out.setAttribute('transform', `translate(${f(tr.x)} ${f(tr.y - Math.sin(Math.PI * t) * g.capR * 0.5)})`));
        }
      }
      audio.pop();
      const top = R.out.querySelector('.cap-top');
      const num = R.out.querySelector('.cap-num');
      await frames(T.open, (t) => {
        const e = ease.outBack(t);
        top.setAttribute('transform', `translate(${f(g.capR * 0.9 * e)} ${f(-g.capR * 1.3 * e)}) rotate(${f(40 * e)})`);
        num.setAttribute('opacity', f(Math.min(1, t * 2)));
        num.setAttribute('transform', `scale(${f(0.5 + 0.7 * e)}) translate(0 ${f(-g.capR * 0.3 * e)})`);
      });
      R.cat.innerHTML = catSitting(cat, { mood: 'happy', look: { x: -1, y: 0.8 } });
      glow.forEach((x) => x.cancel());
      await wait(300);
      return Number(R.out.dataset.i); // ひらいた カプセルの番号
    },
  });
}
