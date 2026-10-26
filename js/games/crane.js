// ねこの クレーンゲーム（決め方：つかんで取る。見せ方の部品：アズと イズの ぬいぐるみと、首から下げた値札）。
// 本物の きかいと同じ つくり（v16 で作り直し）：上に かんばん、ガラスの箱、天井の レール（前後に動く はり と、左右に動く台車）、
// アーム、前の左すみの 落とし口（とうめいの かこい）、下の 操作台（とりだし口・レバー・ボタン・アズ）。
// 箱の中には、選択肢ごとに アズか イズの ぬいぐるみ（色ちがい・リボンや鈴）が すわっていて、首から 選択肢の値札を下げている。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. アームが 3〜4 体の上で止まり、ちょっと下がって「ここかな？」と まよう。
// 2. 下りて つかむ。持ち上げる途中で ぬいぐるみが ゆれて、落ちそうになる。
// 3. 落とし口まで運んで、ぽとん。下の とりだし口から ぬいぐるみが出てくる。
// 動きの ちがい（3B：まずは4つ）：ふつう・つるっ（すべって つかみ直す）・ぽふっ（まよう時に となりを つつく）・ぶらぶら（運ぶ時に大きく ゆれる）。
// 結果は先に乱数で決め（RS01-S14）、アームの止まる所を、決めた ぬいぐるみで終わるように組む。
import { C } from '../art.js';
import { catFace, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { ease, frames } from '../fx.js';
import { createGame, grid, nearest, wander, TINTS, fitSize, f } from './common.js';
import { escapeXml, charCount } from '../ui.js';

// アームが止まる ぬいぐるみの並び（最後が決めた ぬいぐるみ）
export function cranePlan(n, decided, rand = Math.random) {
  return wander(n, n <= 2 ? 3 : 3 + Math.floor(rand() * 2), decided, rand);
}
export const T = { move: 460, peek: 360, open: 380, down: 700, grab: 560, up: 760, wobble: 520, carry: 700, release: 340, drop: 480 };
// ときどき出る別の動き（v12）：持ち上げた ぬいぐるみが つるっと すべって落ち、もう一度 つかみ直す（まよう回数が3回の時だけ）
export const SLIP = T.up * 0.5 + 260 + T.down * 0.5 + T.grab;
export const slipOk = (stops) => stops <= 3;
export function craneDuration(stops, slip = false) {
  return (slip && slipOk(stops) ? SLIP : 0) + (stops - 1) * (T.move + T.peek) + T.move + T.open + T.down + T.grab + T.up + T.wobble + T.carry + T.release + T.drop;
}
// 動きの ちがいを選ぶ（slip は まよう回数が3回の時だけ。時間は どれも craneDuration のとおり）
export function craneVariant(stops, r = Math.random()) {
  if (r < 0.25) return slipOk(stops) ? 'slip' : 'bump';
  if (r < 0.5) return 'bump';
  if (r < 0.75) return 'swing';
  return 'plain';
}

// ぬいぐるみ（ガチャの景品で使う、ねこ・ねずみ・さかな。中心 0,0・大きさ s）
export function plush(k, [col, edge], s) {
  const e = `stroke="${edge}" stroke-width="${f(Math.max(1.4, s * 0.06))}" stroke-linejoin="round"`;
  const eye = (x, y) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.05)}" fill="#4a3a33"/>`;
  if (k % 3 === 0) {
    return `<path d="M${f(-s * 0.44)},${f(-s * 0.08)} L${f(-s * 0.36)},${f(-s * 0.5)} L${f(-s * 0.08)},${f(-s * 0.32)} Z M${f(s * 0.44)},${f(-s * 0.08)} L${f(s * 0.36)},${f(-s * 0.5)} L${f(s * 0.08)},${f(-s * 0.32)} Z" fill="${col}" ${e}/>`
      + `<ellipse rx="${f(s * 0.5)}" ry="${f(s * 0.4)}" fill="${col}" ${e}/>` + eye(-0.18, -0.04) + eye(0.18, -0.04)
      + `<path d="M${f(-s * 0.05)},${f(s * 0.08)} h${f(s * 0.1)} l${f(-s * 0.05)},${f(s * 0.05)} Z" fill="#ec8a80"/>`
      + `<ellipse cx="${f(-s * 0.3)}" cy="${f(s * 0.12)}" rx="${f(s * 0.08)}" ry="${f(s * 0.05)}" fill="#f59a8a" opacity="0.6"/><ellipse cx="${f(s * 0.3)}" cy="${f(s * 0.12)}" rx="${f(s * 0.08)}" ry="${f(s * 0.05)}" fill="#f59a8a" opacity="0.6"/>`;
  }
  if (k % 3 === 1) {
    return `<circle cx="${f(-s * 0.3)}" cy="${f(-s * 0.3)}" r="${f(s * 0.18)}" fill="${col}" ${e}/><circle cx="${f(s * 0.3)}" cy="${f(-s * 0.3)}" r="${f(s * 0.18)}" fill="${col}" ${e}/>`
      + `<ellipse rx="${f(s * 0.46)}" ry="${f(s * 0.38)}" fill="${col}" ${e}/>` + eye(-0.15, -0.04) + eye(0.15, -0.04)
      + `<circle cx="0" cy="${f(s * 0.1)}" r="${f(s * 0.06)}" fill="#f19bb0"/>`;
  }
  return `<path d="M${f(s * 0.36)},0 L${f(s * 0.58)},${f(-s * 0.22)} L${f(s * 0.58)},${f(s * 0.22)} Z" fill="${col}" ${e}/>`
    + `<ellipse rx="${f(s * 0.44)}" ry="${f(s * 0.3)}" fill="${col}" ${e}/>` + eye(-0.24, -0.04)
    + `<path d="M${f(-s * 0.02)},${f(-s * 0.2)} q${f(s * 0.1)},${f(s * 0.2)} 0,${f(s * 0.4)}" stroke="${edge}" stroke-width="${f(s * 0.04)}" fill="none" opacity="0.7"/>`;
}

// アズ（三毛）と イズ（サバトラ）の ぬいぐるみの色ちがい。アズは [生地・ぶちA・ぶちB]、イズは [生地・しま]
const AZ = [['#fffaf4', '#f6c39b', '#bcc4d8'], ['#fff0f2', '#f2a9b6', '#c8b7da'], ['#fbf1de', '#e1b282', '#9a8a80']];
const IZ = [['#c6cad2', '#878d9a'], ['#c4d8ea', '#7f9dbd'], ['#dcd2e8', '#9d8dba']];
const LINE = '#6b4a3a';
// 選択肢 i の ぬいぐるみ：アズと イズを交互に、色ちがいと飾り（リボン・鈴・花）を順に
export const plushKind = (i) => ({ cat: i % 2 ? 'iz' : 'az', tone: Math.floor(i / 2) % 3, acc: i % 3 });

// すわった ぬいぐるみ（中心 0,0。幅 およそ s・高さ およそ 1.21s。上は -0.6s、下は +0.61s）
export function plushCat(i, s) {
  const { cat, tone, acc } = plushKind(i);
  const u = s / 100;
  const p = (v) => f(v * u);
  const [col, edge] = TINTS[i % TINTS.length];
  const az = cat === 'az';
  const base = az ? AZ[tone][0] : IZ[tone][0];
  const mark = az ? AZ[tone][1] : IZ[tone][1];
  const mark2 = az ? AZ[tone][2] : IZ[tone][1];
  const sw = f(Math.max(1.2, 2.4 * u));
  const ln = `stroke="${LINE}" stroke-width="${sw}" stroke-linejoin="round"`;
  const seam = `stroke="${LINE}" stroke-width="${f(Math.max(0.7, 1.1 * u))}" stroke-dasharray="${p(2.4)} ${p(2.2)}" fill="none" opacity="0.45" stroke-linecap="round"`;
  const id = `pc${i}`;
  let s0 = '';
  // しっぽ（体の後ろ、右へ くるん）
  const tailD = `M${p(22)},${p(46)} C${p(48)},${p(52)} ${p(58)},${p(30)} ${p(46)},${p(14)}`;
  s0 += `<path d="${tailD}" stroke="${LINE}" stroke-width="${p(13.5)}" fill="none" stroke-linecap="round"/>`
    + `<path d="${tailD}" stroke="${az ? mark : base}" stroke-width="${p(9)}" fill="none" stroke-linecap="round"/>`;
  if (!az) s0 += `<path d="${tailD}" stroke="${mark}" stroke-width="${p(9)}" fill="none" stroke-dasharray="${p(4)} ${p(6)}"/>`;
  // 体（なし形）と足
  s0 += `<ellipse cx="0" cy="${p(32)}" rx="${p(33)}" ry="${p(27)}" fill="${base}" ${ln}/>`;
  if (!az) s0 += `<path d="M${p(-30)},${p(26)} q${p(7)},${p(3)} ${p(11)},${p(-1)} M${p(30)},${p(26)} q${p(-7)},${p(3)} ${p(-11)},${p(-1)} M${p(-31)},${p(37)} q${p(7)},${p(3)} ${p(10)},${p(-1)} M${p(31)},${p(37)} q${p(-7)},${p(3)} ${p(-10)},${p(-1)}" stroke="${mark}" stroke-width="${p(4)}" fill="none" stroke-linecap="round"/>`;
  else s0 += `<path d="M${p(10)},${p(12)} C${p(26)},${p(10)} ${p(34)},${p(22)} ${p(32)},${p(36)} C${p(22)},${p(38)} ${p(12)},${p(28)} ${p(10)},${p(12)} Z" fill="${mark2}" opacity="0.9"/>`;
  s0 += `<path d="M0,${p(30)} V${p(56)}" ${seam}/>`;
  s0 += `<ellipse cx="0" cy="${p(32)}" rx="${p(33)}" ry="${p(27)}" fill="url(#cr-shade)"/>`;
  for (const sg of [-1, 1]) {
    s0 += `<ellipse cx="${p(sg * 17)}" cy="${p(53)}" rx="${p(13)}" ry="${p(8.5)}" fill="${base}" ${ln}/>`
      + `<ellipse cx="${p(sg * 17)}" cy="${p(54.5)}" rx="${p(5.5)}" ry="${p(3.6)}" fill="#f7b4a6"/>`
      + `<ellipse cx="${p(sg * 25)}" cy="${p(36)}" rx="${p(9)}" ry="${p(11.5)}" fill="${base}" ${ln}/>`;
  }
  // 耳
  const ear = (sg, fill) => `<path d="M${p(sg * 42)},${p(-24)} C${p(sg * 46)},${p(-44)} ${p(sg * 42)},${p(-58)} ${p(sg * 34)},${p(-60)} C${p(sg * 26)},${p(-56)} ${p(sg * 16)},${p(-48)} ${p(sg * 10)},${p(-42)} Z" fill="${fill}" ${ln}/>`
    + `<path d="M${p(sg * 34)},${p(-34)} C${p(sg * 36)},${p(-44)} ${p(sg * 35)},${p(-51)} ${p(sg * 32)},${p(-52)} C${p(sg * 27)},${p(-49)} ${p(sg * 22)},${p(-45)} ${p(sg * 19)},${p(-41)} Z" fill="#f7b4a6" opacity="0.85"/>`;
  s0 += ear(-1, az ? mark : base) + ear(1, az ? mark2 : base);
  // 頭（ぶち・しまは 頭の形で切り抜く）
  const head = `<ellipse cx="0" cy="${p(-10)}" rx="${p(46)}" ry="${p(37)}"/>`;
  s0 += `<defs><clipPath id="${id}">${head}</clipPath></defs>`
    + `<ellipse cx="0" cy="${p(-10)}" rx="${p(46)}" ry="${p(37)}" fill="${base}"/>`
    + `<g clip-path="url(#${id})">`;
  if (az) {
    s0 += `<path d="M${p(-52)},${p(-52)} C${p(-22)},${p(-54)} ${p(-6)},${p(-38)} ${p(-8)},${p(-22)} C${p(-10)},${p(-8)} ${p(-28)},${p(-4)} ${p(-52)},${p(-6)} Z" fill="${mark}"/>`
      + `<path d="M${p(14)},${p(-52)} C${p(34)},${p(-54)} ${p(54)},${p(-44)} ${p(54)},${p(-28)} C${p(42)},${p(-20)} ${p(28)},${p(-24)} ${p(20)},${p(-32)} C${p(15)},${p(-38)} ${p(13)},${p(-44)} ${p(14)},${p(-52)} Z" fill="${mark2}"/>`;
  } else {
    s0 += `<path d="M${p(-11)},${p(-46)} v${p(11)} M0,${p(-47)} v${p(13)} M${p(11)},${p(-46)} v${p(11)}" stroke="${mark}" stroke-width="${p(4.4)}" stroke-linecap="round"/>`
      + `<path d="M${p(-48)},${p(-12)} h${p(11)} M${p(-48)},${p(-3)} h${p(9)} M${p(48)},${p(-12)} h${p(-11)} M${p(48)},${p(-3)} h${p(-9)}" stroke="${mark}" stroke-width="${p(3.8)}" stroke-linecap="round"/>`
      + `<ellipse cx="0" cy="${p(6)}" rx="${p(17)}" ry="${p(11)}" fill="#ffffff" opacity="0.55"/>`;
  }
  s0 += `<ellipse cx="0" cy="${p(-10)}" rx="${p(46)}" ry="${p(37)}" fill="url(#cr-shade)"/></g>`
    + `<ellipse cx="0" cy="${p(-10)}" rx="${p(46)}" ry="${p(37)}" fill="none" ${ln}/>`
    + `<path d="M0,${p(-47)} V${p(-36)}" ${seam}/>`;
  // ししゅうの顔（目・はな・口・ほお）
  for (const sg of [-1, 1]) {
    s0 += `<ellipse cx="${p(sg * 16)}" cy="${p(-8)}" rx="${p(5)}" ry="${p(6.2)}" fill="#4a3a33"/>`
      + `<circle cx="${p(sg * 16 - 1.6)}" cy="${p(-10.4)}" r="${p(1.9)}" fill="#ffffff"/>`
      + `<ellipse cx="${p(sg * 29)}" cy="${p(4)}" rx="${p(7)}" ry="${p(4)}" fill="#f59a8a" opacity="0.55"/>`;
  }
  s0 += `<path d="M${p(-3.4)},${p(0.5)} h${p(6.8)} l${p(-3.4)},${p(3.6)} Z" fill="#ec8a80"/>`
    + `<path d="M${p(-6.5)},${p(6)} q${p(3.2)},${p(4)} ${p(6.5)},0 q${p(3.2)},${p(4)} ${p(6.5)},0" stroke="${LINE}" stroke-width="${f(Math.max(0.9, 1.6 * u))}" fill="none" stroke-linecap="round"/>`;
  // 飾り：0 リボン（左耳の根もと）・1 鈴の首わ（あごの下）・2 花（右耳の根もと）
  if (acc === 0) {
    s0 += `<g transform="translate(${p(-24)} ${p(-42)}) rotate(-18)"><path d="M0,0 L${p(-12)},${p(-7)} L${p(-12)},${p(7)} Z M0,0 L${p(12)},${p(-7)} L${p(12)},${p(7)} Z" fill="${col}" stroke="${edge}" stroke-width="${sw}" stroke-linejoin="round"/><circle r="${p(3.6)}" fill="${edge}"/></g>`;
  } else if (acc === 1) {
    s0 += `<path d="M${p(-24)},${p(23)} Q0,${p(34)} ${p(24)},${p(23)}" stroke="${edge}" stroke-width="${p(7.5)}" fill="none" stroke-linecap="round"/>`
      + `<path d="M${p(-24)},${p(23)} Q0,${p(34)} ${p(24)},${p(23)}" stroke="${col}" stroke-width="${p(4.5)}" fill="none" stroke-linecap="round"/>`
      + `<circle cy="${p(32)}" r="${p(5.4)}" fill="#f6d55e" stroke="#c9a23a" stroke-width="${sw}"/><path d="M${p(-2.4)},${p(33.5)} h${p(4.8)}" stroke="#c9a23a" stroke-width="${sw}"/>`;
  } else {
    let fl = '';
    for (let k = 0; k < 5; k++) { const a = (k * 72 - 90) * Math.PI / 180; fl += `<circle cx="${p(Math.cos(a) * 5.4)}" cy="${p(Math.sin(a) * 5.4)}" r="${p(4.4)}" fill="${col}" stroke="${edge}" stroke-width="${f(Math.max(0.8, 1.4 * u))}"/>`; }
    s0 += `<g transform="translate(${p(26)} ${p(-40)})">${fl}<circle r="${p(3.4)}" fill="#f6d55e"/></g>`;
  }
  return s0;
}

// アーム（つり下げ口 0,0 から下へ。長さ L）。open は 0（とじる）〜1（ひらく）。
// 左右の つめは、ちょうつがい（±0.12L, 0.08L）を中心に まわる。とじると、つめの先が内側へ曲がって ぬいぐるみを はさむ
export const clawAngle = (open) => -6 + open * 46; // つめを外へ ひらく角度（度）
function claw(L, open) {
  const a = clawAngle(open);
  const w = Math.max(3.2, L * 0.1);
  const arm = (sgn) => {
    const px = sgn * L * 0.12;
    const d = `M0,0 C${f(sgn * L * 0.2)},${f(L * 0.16)} ${f(sgn * L * 0.34)},${f(L * 0.36)} ${f(sgn * L * 0.3)},${f(L * 0.62)} C${f(sgn * L * 0.27)},${f(L * 0.8)} ${f(sgn * L * 0.16)},${f(L * 0.86)} ${f(sgn * L * 0.04)},${f(L * 0.84)}`;
    return `<g transform="translate(${f(px)} ${f(L * 0.08)}) rotate(${f(-sgn * a)})">`
      + `<path d="${d}" stroke="#6f7480" stroke-width="${f(w + 2.6)}" fill="none" stroke-linecap="round"/>`
      + `<path d="${d}" stroke="#e4e8ee" stroke-width="${f(w)}" fill="none" stroke-linecap="round"/>`
      + `<path d="${d}" stroke="#ffffff" stroke-width="${f(w * 0.3)}" fill="none" stroke-linecap="round" opacity="0.8" transform="translate(${f(-sgn * w * 0.18)} 0)"/>`
      + `<circle cx="${f(sgn * L * 0.04)}" cy="${f(L * 0.84)}" r="${f(w * 0.75)}" fill="#f7c4b4" stroke="#6f7480" stroke-width="1.6"/>`
      + `<circle r="${f(w * 0.55)}" fill="#fffaf0" stroke="#6f7480" stroke-width="1.6"/></g>`;
  };
  return arm(-1) + arm(1)
    + `<rect x="${f(-L * 0.27)}" y="${f(-L * 0.16)}" width="${f(L * 0.54)}" height="${f(L * 0.3)}" rx="${f(L * 0.1)}" fill="#f7c4b4" stroke="#c97a6e" stroke-width="2"/>`
    + `<rect x="${f(-L * 0.2)}" y="${f(-L * 0.12)}" width="${f(L * 0.4)}" height="${f(L * 0.07)}" rx="${f(L * 0.035)}" fill="#ffffff" opacity="0.6"/>`
    + `<circle cy="${f(L * 0.02)}" r="${f(L * 0.05)}" fill="#fff1c4" stroke="#c97a6e" stroke-width="1.2"/>`;
}

export function createCrane(deps) {
  const R = {};
  // アームの いち：x（左右）・by（はりの高さ＝前後）・drop（ケーブルの のび）・open（つめ）
  const setClaw = (g, x, by, drop, open) => {
    const y = by + g.c0 + drop;
    R.beam.setAttribute('transform', `translate(0 ${f(by)})`);
    R.cart.setAttribute('transform', `translate(${f(x)} ${f(by)})`);
    R.cable.setAttribute('d', `M${f(x)},${f(by + 4)} V${f(y - g.L * 0.14)}`);
    R.claw.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
    R.claw.innerHTML = claw(g.L, open);
    // ぬいぐるみの上に落ちる アームの かげ（下りるほど小さく こくなる）
    const k = Math.min(1, drop / g.lift);
    R.shadow.setAttribute('cx', f(x));
    R.shadow.setAttribute('cy', f(by + g.c0 + g.lift + g.toyDrop + g.s * 0.42));
    R.shadow.setAttribute('rx', f(g.L * (0.62 - 0.22 * k)));
    R.shadow.setAttribute('opacity', f(0.1 + 0.12 * k));
    if (g.at && R.joy) {
      const tilt = Math.max(-28, Math.min(28, (x - g.at.x) * 6 + (by - g.at.by) * 3));
      R.joy.setAttribute('transform', `translate(${f(g.joy.x)} ${f(g.joy.y)}) rotate(${f(tilt)})`);
      const a = (tilt * Math.PI) / 180;
      R.paw.setAttribute('transform', `translate(${f(g.joy.x + 3 + Math.sin(a) * g.joy.len)} ${f(g.joy.y - Math.cos(a) * g.joy.len + 2)})`);
    }
    g.at = { x, by, drop, open };
  };
  const toyAt = (g, toy, x, y, sc = 1) => toy.setAttribute('transform', `translate(${f(x)} ${f(y)})${sc === 1 ? '' : ` scale(${f(sc)})`}`);
  const moveClaw = async (g, to, dur, carry = null, swing = 0) => {
    const a = { ...g.at };
    const b = { ...a, ...to };
    const inner = carry && carry.querySelector('.toy-in');
    await frames(dur, (t) => {
      const e = ease.inOutSine(t);
      const x = a.x + (b.x - a.x) * e;
      const by = a.by + (b.by - a.by) * e;
      const drop = a.drop + (b.drop - a.drop) * e;
      setClaw(g, x, by, drop, a.open + (b.open - a.open) * e);
      if (carry) toyAt(g, carry, x, by + g.c0 + drop + g.toyDrop, 1.06);
      if (inner && swing) inner.setAttribute('transform', `rotate(${f(Math.sin(t * Math.PI * 3) * swing * (1 - t * 0.5))})`);
    });
  };
  // ぬいぐるみ t の真上で、アームが「まだ下りていない」時の はりの高さ
  const hoverBy = (g, t) => t.cy - g.toyDrop - g.lift - g.c0;
  return createGame(deps, {
    play: 'つかむ',
    resultLabel: 'つかまえた！',
    draw(g) {
      const { n, W, H, choices } = g;
      // きかいの つくり：かんばん（上）・ガラスの箱・前の ふち（落とし口）・操作台（下）
      const signH = Math.round(Math.max(24, Math.min(40, H * 0.07)));
      const panelH = Math.round(Math.max(48, Math.min(66, H * 0.12)));
      const lipH = Math.round(Math.max(30, Math.min(44, H * 0.075)));
      const box = { x: 4, y: signH, w: W - 8, h: H - signH - panelH };
      const cols = n <= 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      const gx = box.x + 6;
      const gw = box.w - 12;
      const gBottom = box.y + box.h - lipH - 4;
      const cw = (gw - 5 * (cols - 1)) / cols;
      // 一番上の列の上に、アームが止まって まよう すきま（ぬいぐるみの大きさで決まる）を空ける
      let s = 40;
      let top = box.y + 30;
      let ch = 0;
      let plateH = 22;
      for (let k = 0; k < 3; k++) {
        ch = (gBottom - top - 5 * (rows - 1)) / rows;
        plateH = Math.max(22, Math.min(30, ch * 0.26));
        s = Math.max(22, Math.min(100, cw * 0.72, (ch - plateH + 2) / 1.21));
        const L = Math.max(22, Math.min(56, s * 0.8));
        top = box.y + 8 + L * 1.5 + 10 - s * 0.6;
        top = Math.max(box.y + 6, top);
      }
      const L = Math.max(22, Math.min(56, s * 0.8));
      const cells = grid(n, { x: gx, y: top, w: gw, h: gBottom - top }, cols, 5);
      // ぬいぐるみの中心（少しずつ ずらして、ならべた感じを なくす）
      // 値札の上に すわらせる（足が 札に少し かくれる）
      const toys = cells.map((c, i) => ({ cx: c.cx + [0, -3, 3, 1, -2][i % 5] * (cw > 90 ? 1 : 0.5), cy: c.y + c.h - plateH - s * 0.61 + 5 }));
      const hole = { x: box.x + 8, y: box.y + box.h - lipH, w: Math.min(86, box.w * 0.26), h: lipH - 6 };
      const exit = { x: hole.x + 2, y: H - panelH + 8, w: hole.w - 4, h: panelH - 16 };
      Object.assign(g, { cells, toys, s, L, ch, plateH, box, hole, exit, c0: 8, lift: L * 0.7, toyDrop: L * 0.78, grip: 0.72 });
      // grip：つかんだ時の つめの ひらき（頭の はばで止まり、顔に かからない）。toyDrop：アームの口から ぬいぐるみの中心まで
      // アームの 待つ所は 左上のすみ（札に かからない）。運ぶ先は 落とし口の上
      g.home = { x: box.x + 12 + L * 0.4, by: box.y + 4, drop: 0, open: 0.1 };
      g.over = { x: hole.x + hole.w / 2, by: hole.y - s * 0.3 - g.toyDrop - g.c0 };
      const glassT = '#eaf6fb';
      let o = `<defs><radialGradient id="cr-shade" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#6b4a3a" stop-opacity="0.16"/></radialGradient>`
        + `<linearGradient id="cr-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e6f7"/><stop offset="1" stop-color="#fde9ee"/></linearGradient>`
        + `<linearGradient id="cr-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f9"/><stop offset="1" stop-color="#b9bfc9"/></linearGradient></defs>`;
      // きかいの わく（ふちに あつみと かげ）
      o += `<rect x="1" y="3" width="${W - 2}" height="${H - 3}" rx="16" fill="#c97a6e" opacity="0.25"/>`
        + `<rect x="0" y="0" width="${W}" height="${H - 3}" rx="16" fill="#f7b4a6" stroke="#c97a6e" stroke-width="2.4"/>`;
      // かんばん
      o += `<rect x="10" y="4" width="${W - 20}" height="${signH - 8}" rx="${f((signH - 8) / 2)}" fill="#fff6ea" stroke="#d98a7a" stroke-width="2"/>`
        + `<text x="${f(W / 2)}" y="${f(4 + (signH - 8) / 2)}" font-size="${f(Math.min(17, (signH - 8) * 0.62))}" font-weight="700" fill="#c95f4c" text-anchor="middle" dominant-baseline="central" letter-spacing="2">ねこ キャッチャー</text>`;
      const nb = Math.max(4, Math.floor((W - 40) / 34));
      for (let k = 0; k < nb; k++) {
        const bx = 20 + (k * (W - 40)) / (nb - 1);
        if (Math.abs(bx - W / 2) < 84) continue;
        o += `<circle class="cr-bulb" cx="${f(bx)}" cy="${f(signH / 2)}" r="3.2" fill="#fff1c4" stroke="#e3bb84" stroke-width="1"/>`;
      }
      // ガラスの箱の中：おくの かべ・ゆか（フェルト）
      o += `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="url(#cr-back)"/>`
        + `<path d="M${box.x},${f(top + s * 0.2)} H${box.x + box.w} V${box.y + box.h} H${box.x} Z" fill="#fbe1e8" opacity="0.7"/>`;
      for (let yy = top + s * 0.3; yy < box.y + box.h - lipH; yy += 16) for (let xx = box.x + 10 + ((yy / 16) % 2) * 8; xx < box.x + box.w - 6; xx += 16) o += `<circle cx="${f(xx)}" cy="${f(yy)}" r="1.4" fill="#f2bccb" opacity="0.6"/>`;
      // 天井の レール（左右の はしの 棒。はりが その上を前後に動く）
      o += `<rect x="${box.x + 2}" y="${box.y + 2}" width="5" height="${f(box.h - lipH - 4)}" rx="2.5" fill="url(#cr-metal)" stroke="#8a8f99" stroke-width="1"/>`
        + `<rect x="${box.x + box.w - 7}" y="${box.y + 2}" width="5" height="${f(box.h - lipH - 4)}" rx="2.5" fill="url(#cr-metal)" stroke="#8a8f99" stroke-width="1"/>`;
      // ぬいぐるみと値札
      cells.forEach((c, i) => {
        const t = toys[i];
        // 札の幅は 文字に合わせる（ぬいぐるみより少し広く、マスの幅まで）
        const tw = Math.max(Math.min(s * 1.15, c.w - 2), Math.min(c.w - 2, charCount(choices[i]) * 17 + 14));
        const tc = c.cx - t.cx; // 札の真ん中（ぬいぐるみの中心から）
        const x0 = tc - tw / 2;
        const y0 = c.y + c.h - plateH - t.cy;
        const tilt = [-2, 1.5, -1, 2, -1.5][i % 5];
        const rot = [-5, 4, -2, 6, -4, 3][i % 6];
        const size = fitSize(choices[i], tw, plateH);
        const [col, edge] = TINTS[i % TINTS.length];
        o += `<g class="toy" data-i="${i}" transform="translate(${f(t.cx)} ${f(t.cy)})"><g class="toy-in">`
          + `<ellipse cx="0" cy="${f(s * 0.6)}" rx="${f(s * 0.42)}" ry="${f(s * 0.07)}" fill="#a0703f" opacity="0.14"/>`
          + `<g transform="rotate(${rot})">${plushCat(i, s)}</g>`
          // 首から下げた ひも と 値札（札が選択肢）
          + `<path d="M${f(-s * 0.12)},${f(s * 0.28)} Q${f(tc)},${f(y0 - 6)} ${f(tc)},${f(y0 + 1)} M${f(s * 0.12)},${f(s * 0.28)} Q${f(tc)},${f(y0 - 6)} ${f(tc)},${f(y0 + 1)}" stroke="${edge}" stroke-width="1.4" fill="none"/>`
          + `<g class="cell" data-i="${i}" transform="rotate(${tilt} ${f(tc)} ${f(y0 + plateH / 2)})">`
          + `<rect x="${f(x0 + 1)}" y="${f(y0 + 2)}" width="${f(tw)}" height="${f(plateH)}" rx="${f(Math.min(9, plateH / 2.4))}" fill="${edge}" opacity="0.45"/>`
          + `<rect class="cell-bg" x="${f(x0)}" y="${f(y0)}" width="${f(tw)}" height="${f(plateH)}" rx="${f(Math.min(9, plateH / 2.4))}" fill="${col}" stroke="${edge}" stroke-width="2"/>`
          + `<rect x="${f(x0 + 3)}" y="${f(y0 + 2.5)}" width="${f(tw - 6)}" height="${f(plateH * 0.28)}" rx="${f(plateH * 0.14)}" fill="#ffffff" opacity="0.45"/>`
          + `<circle cx="${f(tc)}" cy="${f(y0 + 1)}" r="2.6" fill="#fffaf0" stroke="${edge}" stroke-width="1.4"/>`
          + `<text class="cell-label" x="${f(tc)}" y="${f(y0 + plateH / 2 + 0.5)}" font-size="${f(size)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(choices[i])}</text></g>`
          + `</g></g>`;
      });
      // アームの かげ・はり・台車・ケーブル・アーム
      o += `<ellipse class="cr-shadow" cy="0" ry="${f(Math.max(2.4, s * 0.06))}" fill="#6b4a3a"/>`
        + `<g class="cr-beam"><rect x="${box.x + 2}" y="-4" width="${box.w - 4}" height="8" rx="4" fill="url(#cr-metal)" stroke="#8a8f99" stroke-width="1.2"/></g>`
        + `<g class="cr-cart"><rect x="-15" y="-7" width="30" height="14" rx="5" fill="#f7c4b4" stroke="#c97a6e" stroke-width="2"/><circle cx="-8" r="2" fill="#c97a6e"/><circle cx="8" r="2" fill="#c97a6e"/></g>`
        + `<path class="cable" stroke="#6f7480" stroke-width="2.2" fill="none"/>`
        + `<g class="claw"></g>`;
      // 前の ふち：落とし口（とうめいの かこい）
      const ly = box.y + box.h - lipH;
      o += `<rect class="cr-lip" x="${box.x}" y="${ly}" width="${box.w}" height="${lipH}" fill="#f9d2c8"/>`
        + `<path d="M${box.x},${ly} H${box.x + box.w}" stroke="#d98a7a" stroke-width="2"/>`
        + `<rect x="${f(hole.x)}" y="${f(hole.y + 3)}" width="${f(hole.w)}" height="${f(hole.h)}" rx="6" fill="#7a5a4c"/>`
        + `<rect x="${f(hole.x + 4)}" y="${f(hole.y + 3)}" width="${f(hole.w - 8)}" height="${f(hole.h * 0.45)}" rx="4" fill="#4e3a32" opacity="0.6"/>`;
      // 落とし口の かこい（とうめい板。アームと ぬいぐるみの前に重ねる）
      R.guard = `<g class="cr-guard"><rect x="${f(hole.x - 2)}" y="${f(hole.y + 1)}" width="${f(hole.w + 4)}" height="${f(hole.h * 0.5)}" rx="4" fill="${glassT}" fill-opacity="0.45" stroke="#9fc8cf" stroke-width="2"/>`
        + `<path d="M${f(hole.x + 6)},${f(hole.y + 5)} l10,0" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8"/></g>`;
      o += R.guard;
      // 前の ガラスの光
      o += `<path d="M${box.x + box.w - 30},${box.y + 12} l-22,34 M${box.x + box.w - 18},${box.y + 18} l-14,22" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.55"/>`
        + `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="none" stroke="#c97a6e" stroke-width="2.4"/>`;
      // 操作台：とりだし口（左）・ボタンと レバー・操作する アズ（右）
      const py = H - panelH;
      o += `<rect x="4" y="${py + 2}" width="${W - 8}" height="${panelH - 9}" rx="10" fill="#fde3a6" stroke="#d9b04d" stroke-width="2"/>`
        + `<rect x="${f(exit.x)}" y="${f(exit.y)}" width="${f(exit.w)}" height="${f(exit.h)}" rx="7" fill="#7a5a4c" stroke="#b98a52" stroke-width="2"/>`
        + `<g class="cr-exit-toy"></g>`
        + `<g class="cr-flap"><rect x="${f(exit.x + 2)}" y="${f(exit.y + 2)}" width="${f(exit.w - 4)}" height="${f(exit.h - 4)}" rx="6" fill="#f9d2c8" stroke="#d98a7a" stroke-width="1.6"/>`
        + `<rect x="${f(exit.x + exit.w / 2 - 10)}" y="${f(exit.y + exit.h - 10)}" width="20" height="4" rx="2" fill="#d98a7a"/></g>`;
      const fs = Math.max(0.3, Math.min(0.5, (panelH + 6) / 110));
      const fx = W - 46 * fs - 10;
      const fy = py + panelH * 0.42;
      const jx = fx - 60 * fs - 12;
      const jy = py + panelH - 12;
      g.joy = { x: jx, y: jy, len: Math.max(16, panelH * 0.42) };
      const bx = (exit.x + exit.w + jx) / 2;
      o += `<circle cx="${f(bx - 14)}" cy="${f(jy - 6)}" r="7" fill="#f7a6a0" stroke="#c97a6e" stroke-width="2"/><circle cx="${f(bx - 16)}" cy="${f(jy - 8)}" r="2.2" fill="#ffffff" opacity="0.7"/>`
        + `<circle cx="${f(bx + 6)}" cy="${f(jy - 6)}" r="7" fill="#cfe0ea" stroke="#7aa7c4" stroke-width="2"/><circle cx="${f(bx + 4)}" cy="${f(jy - 8)}" r="2.2" fill="#ffffff" opacity="0.7"/>`
        + `<ellipse cx="${f(jx)}" cy="${f(jy + 1)}" rx="11" ry="4" fill="#b98a52" opacity="0.5"/>`
        + `<g class="cr-joy" transform="translate(${f(jx)} ${f(jy)})"><path d="M0,0 V${f(-g.joy.len)}" stroke="#8c6e5a" stroke-width="3.6" stroke-linecap="round"/><circle cy="${f(-g.joy.len)}" r="6.5" fill="#e8664a" stroke="#cf5238" stroke-width="1.8"/><circle cx="-2" cy="${f(-g.joy.len - 2)}" r="2" fill="#ffffff" opacity="0.7"/></g>`
        + `<g transform="translate(${f(fx)} ${f(fy)}) scale(${f(fs)})"><g class="cr-face">${catFace(g.cat, { look: { x: -1, y: -0.6 } })}</g></g>`
        + `<g class="cr-paw" transform="translate(${f(jx + 3)} ${f(jy - g.joy.len + 2)})">${catPaw(g.cat, Math.max(8, 16 * fs))}</g>`;
      return o;
    },
    after(g) {
      const q = (c) => g.svg.querySelector(c);
      Object.assign(R, { beam: q('.cr-beam'), cart: q('.cr-cart'), cable: q('.cable'), claw: q('.claw'), shadow: q('.cr-shadow'), face: q('.cr-face'), joy: q('.cr-joy'), paw: q('.cr-paw'), guardEl: q('.cr-guard'), exitToy: q('.cr-exit-toy'), flap: q('.cr-flap') });
      R.bulbs = Array.from(g.svg.querySelectorAll('.cr-bulb'));
      R.toys = Array.from(g.svg.querySelectorAll('.toy'));
      g.at = null;
      setClaw(g, g.home.x, g.home.by, 0, 0.1);
    },
    async perform(g, decided, say) {
      const plan = cranePlan(g.n, decided);
      const { stage } = g;
      const variant = craneVariant(plan.length);
      stage.dataset.variant = variant;
      const blink = R.bulbs.map((el, k) => el.animate([{ fill: '#fff1c4' }, { fill: '#ffd36b' }, { fill: '#fff1c4' }], { duration: 600, delay: (k % 3) * 200, iterations: Infinity }));
      const face = (mood) => { R.face.innerHTML = catFace(g.cat, { mood, look: { x: -1, y: -0.6 } }); };
      const wob = (el, amp, dur) => frames(dur, (p) => el.setAttribute('transform', `rotate(${f(Math.sin(p * Math.PI * 4) * amp * (1 - p))})`));
      say('どれに しようかな…');
      // 1. まよいながら、ぬいぐるみの上を うつる（はりが前後、台車が左右に動く）
      for (let k = 0; k < plan.length; k++) {
        const t = g.toys[plan[k]];
        audio.slide(T.move / 1000);
        await moveClaw(g, { x: t.cx, by: hoverBy(g, t), drop: 0, open: 0.1 }, T.move);
        if (k === plan.length - 1) break;
        audio.tick();
        if (variant === 'bump' && k === 0) {
          // ぽふっ：のぞきこんだ アームが、ぬいぐるみの頭に こつんと当たる
          await moveClaw(g, { drop: g.lift * 0.75, open: 0.5 }, T.peek / 2);
          say('ぽふっ');
          audio.pop();
          const el = R.toys[plan[k]].querySelector('.toy-in');
          await Promise.all([wob(el, 10, T.peek), moveClaw(g, { drop: 0, open: 0.1 }, T.peek / 2)]);
          el.removeAttribute('transform');
          say('どれに しようかな…');
        } else {
          await moveClaw(g, { drop: g.lift * 0.35, open: 0.6 }, T.peek / 2);
          await moveClaw(g, { drop: 0, open: 0.1 }, T.peek / 2);
        }
      }
      // 2. 下りて つかむ
      say('ここだ！');
      const t = g.toys[decided];
      audio.slide(T.open / 1000);
      await moveClaw(g, { open: 1 }, T.open);
      audio.stretch(T.down / 1000);
      await moveClaw(g, { drop: g.lift }, T.down);
      // ぎゅっと とじる（はじめは速く、さいごは ゆっくり はさむ）
      say('ぎゅっ…');
      audio.tick();
      await frames(T.grab, (p) => setClaw(g, g.at.x, g.at.by, g.at.drop, 1 - (1 - g.grip) * ease.outCubic(p)));
      audio.pop();
      const clawY = () => g.at.by + g.c0 + g.at.drop;
      const got = nearest(g.toys, g.at.x, clawY() + g.toyDrop); // アームが つかんだ ぬいぐるみ
      const toy = R.toys[got];
      g.svg.insertBefore(toy, R.cable); // ほかの ぬいぐるみと はりより前、アームより後ろに出す
      toy.querySelector('ellipse').setAttribute('opacity', '0'); // 床の かげは 置いていく
      say('つかんだ…？');
      if (variant === 'slip') {
        // つるっ… すべって落ちたので、もう一度 つかむ
        await moveClaw(g, { drop: g.lift * 0.5 }, T.up * 0.5, toy);
        say('あっ！ つるっ…');
        audio.hop(1);
        await moveClaw(g, { open: 0.95 }, 120);
        const y1 = clawY() + g.toyDrop;
        await frames(140, (p) => toyAt(g, toy, t.cx, y1 + (t.cy - y1) * p * p));
        face('strain');
        say('もう いっかい！');
        await moveClaw(g, { drop: g.lift, open: 1 }, T.down * 0.5);
        await frames(T.grab, (p) => setClaw(g, g.at.x, g.at.by, g.at.drop, 1 - (1 - g.grip) * ease.outCubic(p)));
        audio.pop();
        say('こんどこそ…！');
      }
      await moveClaw(g, { drop: 0, open: g.grip }, T.up, toy);
      // 落ちそうに ゆれる
      say('おっとっと…');
      face('strain');
      const inner = toy.querySelector('.toy-in');
      audio.heart();
      await wob(inner, variant === 'swing' ? 26 : 16, T.wobble);
      inner.removeAttribute('transform');
      // 3. 落とし口へ運んで、ぽとん
      say(variant === 'swing' ? 'ぶらぶら…！' : 'はこんで…');
      await moveClaw(g, g.over, T.carry, toy, variant === 'swing' ? 14 : 4);
      inner.removeAttribute('transform');
      g.svg.insertBefore(R.guardEl, toy.nextSibling); // とうめいの かこいの後ろへ落とす
      say('ぱっ');
      audio.slide(T.release / 1000);
      await moveClaw(g, { open: 1 }, T.release);
      const x0 = g.at.x;
      const y0 = clawY() + g.toyDrop;
      const yHole = g.hole.y + g.hole.h * 0.5;
      audio.hop(3);
      // 落とし口に すいこまれて、下の とりだし口から出てくる
      await frames(T.drop * 0.5, (p) => {
        toyAt(g, toy, x0, y0 + (yHole - y0) * p * p, 1.06 - 0.5 * p);
        toy.setAttribute('opacity', f(1 - p));
      });
      toy.setAttribute('visibility', 'hidden');
      const sc = Math.min((g.exit.w - 4) / (g.cells[got].w + 4), (g.exit.h - 2) / (g.s * 1.25));
      R.exitToy.innerHTML = `<g transform="translate(${f(g.exit.x + g.exit.w / 2)} ${f(g.exit.y + g.exit.h * 0.52)}) scale(${f(sc)})"><g transform="translate(0 ${f(-g.s * 0.04)})">${plushCat(got, g.s)}</g></g>`;
      await frames(T.drop * 0.5, (p) => {
        R.flap.setAttribute('transform', `translate(0 ${f(g.exit.y)}) scale(1 ${f(1 - 0.85 * ease.outCubic(p))}) translate(0 ${f(-g.exit.y)})`);
      });
      face('happy');
      blink.forEach((x) => x.cancel());
      R.bulbs.forEach((el) => el.setAttribute('fill', '#ffd36b'));
      return got;
    },
  });
}
