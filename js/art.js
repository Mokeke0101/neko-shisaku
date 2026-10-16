// 絵（すべてコードで描く SVG。外部の画像・素材集は使わない：RS01-S18）。
// 絵文字は使わない。記号が要る所も図形で描く（RS01-S14）。
// 猫は cats.js が描く（RS01-S20）。
import { catFace, catPaw, pawPrint, catSitting, catCurled } from './cats.js';

export const C = {
  fur: '#f7c48b',
  furShade: '#eeab6c',
  stripe: '#e39556',
  line: '#6b4632',
  white: '#fff9f0',
  pink: '#f7b4a6',
  eye: '#4a3226',
  nose: '#ec8a80',
  blush: '#f59a8a',
  momiji: '#e8664a',
  momijiDeep: '#cf5238',
  kaki: '#f29a4a',
  kakiDeep: '#db7f30',
  icho: '#f5c451',
  ichoDeep: '#dfa933',
  olive: '#a3bd6e',
  oliveDeep: '#86a256',
  rose: '#f6bfae',
  chestnut: '#b9784e',
  chestnutDeep: '#9b5f3a',
  wood: '#f1d3a6',
  woodDeep: '#ddb37c',
  paper: '#fffbf2',
  cream: '#fff4e0',
  sky: '#fde9d2',
  skyTop: '#fbe0c6',
  ink: '#5a3e2e',
  inkSoft: '#8c6e5a',
};

let uid = 0;
export const nextId = (p) => `${p}${++uid}`;

const f = (n) => Math.round(n * 100) / 100;

// ---- 葉っぱ ----
// もみじ：5つの裂片に、細かいぎざぎざを付けた形（中心 0,0、半径 1 の座標）
function mapleOutline() {
  const lobes = [
    { a: -195, r: 0.66, w: 20 },
    { a: -142, r: 0.94, w: 22 },
    { a: -90, r: 1.0, w: 22 },
    { a: -38, r: 0.94, w: 22 },
    { a: 15, r: 0.66, w: 20 },
  ];
  const side = [
    [-1.0, 0.42], [-0.78, 0.6], [-0.66, 0.56], [-0.5, 0.76], [-0.38, 0.72], [-0.2, 0.9], [0, 1.0],
  ];
  const pts = [];
  const at = (deg, r) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];
  pts.push(at(90, 0.16));
  for (const L of lobes) {
    for (const [o, rf] of side) pts.push(at(L.a + o * L.w, L.r * rf));
    for (let i = side.length - 2; i >= 0; i--) pts.push(at(L.a - side[i][0] * L.w, L.r * side[i][1]));
  }
  return pts;
}
const MAPLE = mapleOutline();
export function mapleLeaf(color = C.momiji, vein = C.momijiDeep, size = 20) {
  const d = 'M' + MAPLE.map(([x, y]) => `${f(x * size)},${f(y * size)}`).join(' L') + ' Z';
  const veins = [-142, -90, -38, -195, 15]
    .map((a) => {
      const r = (a === -195 || a === 15 ? 0.45 : 0.68) * size;
      return `M0,${f(0.1 * size)} L${f(Math.cos((a * Math.PI) / 180) * r)},${f(Math.sin((a * Math.PI) / 180) * r)}`;
    })
    .join(' ');
  return `<g><path d="M0,${f(0.1 * size)} L${f(0.06 * size)},${f(0.62 * size)}" stroke="${vein}" stroke-width="${f(size * 0.08)}" stroke-linecap="round"/>`
    + `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="${f(size * 0.08)}" stroke-linejoin="round"/>`
    + `<path d="${veins}" stroke="${vein}" stroke-width="${f(size * 0.05)}" stroke-linecap="round" fill="none" opacity="0.75"/></g>`;
}

// いちょう：扇の形
export function ginkgoLeaf(color = C.icho, vein = C.ichoDeep, size = 20) {
  const s = (v) => f(v * size);
  const d = `M0,${s(0.5)} C${s(-0.18)},${s(0.36)} ${s(-0.92)},${s(-0.16)} ${s(-0.82)},${s(-0.5)}`
    + ` Q${s(-0.42)},${s(-0.9)} ${s(-0.06)},${s(-0.66)} L0,${s(-0.48)} L${s(0.06)},${s(-0.66)}`
    + ` Q${s(0.42)},${s(-0.9)} ${s(0.82)},${s(-0.5)} C${s(0.92)},${s(-0.16)} ${s(0.18)},${s(0.36)} 0,${s(0.5)} Z`;
  const v = [-0.6, -0.3, 0, 0.3, 0.6].map((x) => `M0,${s(0.45)} L${s(x)},${s(-0.55 + Math.abs(x) * 0.1)}`).join(' ');
  return `<g><path d="M0,${s(0.45)} L0,${s(0.95)}" stroke="${vein}" stroke-width="${s(0.08)}" stroke-linecap="round"/>`
    + `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="${s(0.05)}" stroke-linejoin="round"/>`
    + `<path d="${v}" stroke="${vein}" stroke-width="${s(0.035)}" fill="none" opacity="0.55"/></g>`;
}

export function acorn(size = 20) {
  const s = (v) => f(v * size);
  return `<g><ellipse cx="0" cy="${s(0.18)}" rx="${s(0.5)}" ry="${s(0.62)}" fill="${C.chestnut}"/>`
    + `<ellipse cx="${s(-0.18)}" cy="${s(0.1)}" rx="${s(0.12)}" ry="${s(0.28)}" fill="#d69a6c" opacity="0.8"/>`
    + `<path d="M${s(-0.6)},${s(-0.18)} Q${s(-0.6)},${s(-0.72)} 0,${s(-0.72)} Q${s(0.6)},${s(-0.72)} ${s(0.6)},${s(-0.18)} Z" fill="${C.chestnutDeep}"/>`
    + `<path d="M${s(-0.4)},${s(-0.42)} h${s(0.8)} M${s(-0.5)},${s(-0.26)} h${s(1.0)}" stroke="#86502f" stroke-width="${s(0.06)}" stroke-linecap="round"/>`
    + `<path d="M0,${s(-0.72)} q${s(0.05)},${s(-0.2)} ${s(0.18)},${s(-0.26)}" stroke="${C.chestnutDeep}" stroke-width="${s(0.1)}" fill="none" stroke-linecap="round"/></g>`;
}

export function persimmon(size = 20) {
  const s = (v) => f(v * size);
  return `<g><ellipse cx="0" cy="${s(0.08)}" rx="${s(0.9)}" ry="${s(0.78)}" fill="${C.kaki}"/>`
    + `<ellipse cx="${s(-0.34)}" cy="${s(-0.12)}" rx="${s(0.2)}" ry="${s(0.14)}" fill="#ffd2a3" opacity="0.8"/>`
    + `<path d="M0,${s(-0.62)} l${s(0.42)},${s(-0.1)} l${s(-0.22)},${s(0.26)} l${s(0.2)},${s(0.28)} l${s(-0.4)},${s(-0.12)} l${s(-0.4)},${s(0.12)} l${s(0.2)},${s(-0.28)} l${s(-0.22)},${s(-0.26)} Z" fill="${C.oliveDeep}" stroke="${C.oliveDeep}" stroke-width="${s(0.08)}" stroke-linejoin="round"/>`
    + `<path d="M0,${s(-0.66)} v${s(-0.2)}" stroke="#7a5a3a" stroke-width="${s(0.1)}" stroke-linecap="round"/></g>`;
}

export function dragonfly(size = 20) {
  const s = (v) => f(v * size);
  return `<g><ellipse cx="${s(-0.32)}" cy="${s(-0.22)}" rx="${s(0.42)}" ry="${s(0.14)}" fill="#ffffff" opacity="0.85" transform="rotate(-12)"/>`
    + `<ellipse cx="${s(0.32)}" cy="${s(-0.22)}" rx="${s(0.42)}" ry="${s(0.14)}" fill="#ffffff" opacity="0.85" transform="rotate(12)"/>`
    + `<ellipse cx="${s(-0.3)}" cy="${s(0.0)}" rx="${s(0.36)}" ry="${s(0.12)}" fill="#ffffff" opacity="0.85" transform="rotate(8)"/>`
    + `<ellipse cx="${s(0.3)}" cy="${s(0.0)}" rx="${s(0.36)}" ry="${s(0.12)}" fill="#ffffff" opacity="0.85" transform="rotate(-8)"/>`
    + `<path d="M0,${s(-0.3)} L0,${s(0.9)}" stroke="${C.momiji}" stroke-width="${s(0.13)}" stroke-linecap="round"/>`
    + `<circle cx="0" cy="${s(-0.36)}" r="${s(0.12)}" fill="${C.momijiDeep}"/></g>`;
}

export function cloud(w = 80) {
  const s = (v) => f(v * w);
  return `<path d="M${s(-0.5)},${s(0.12)} Q${s(-0.52)},${s(-0.08)} ${s(-0.32)},${s(-0.08)} Q${s(-0.26)},${s(-0.3)} ${s(-0.04)},${s(-0.24)} Q${s(0.08)},${s(-0.4)} ${s(0.26)},${s(-0.2)} Q${s(0.5)},${s(-0.2)} ${s(0.5)},${s(0.12)} Z" fill="#ffffff" opacity="0.9"/>`;
}

// 秋の葉っぱを1枚（種類を順に替える）
export function autumnLeaf(i, size = 20) {
  switch (i % 4) {
    case 0: return mapleLeaf(C.momiji, C.momijiDeep, size);
    case 1: return ginkgoLeaf(C.icho, C.ichoDeep, size);
    case 2: return mapleLeaf(C.kaki, C.kakiDeep, size);
    default: return mapleLeaf(C.icho, C.ichoDeep, size);
  }
}

// ---- 小さな図形の印（絵文字の代わり） ----
export const icons = {
  back: `<svg viewBox="0 0 24 24"><path d="M15 4 L7 12 L15 20" fill="none" stroke="${C.ink}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24"><path d="M9 4 L17 12 L9 20" fill="none" stroke="${C.line}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5 V19 M5 12 H19" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round"/></svg>`,
  cross: `<svg viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round"/></svg>`,
  gear: (() => {
    const teeth = Array.from({ length: 8 }, (_, i) => `<rect x="10.2" y="1.6" width="3.6" height="5" rx="1.4" fill="${C.ink}" transform="rotate(${i * 45} 12 12)"/>`).join('');
    return `<svg viewBox="0 0 24 24">${teeth}<circle cx="12" cy="12" r="7.2" fill="${C.ink}"/><circle cx="12" cy="12" r="3" fill="${C.paper}"/></svg>`;
  })(),
  // おまかせ：少し かたむいた さいころ（目は肉球の色）
  dice: `<svg viewBox="0 0 24 24"><g transform="rotate(-12 12 12)"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="${C.paper}" stroke="${C.ink}" stroke-width="2.2"/>`
    + [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${C.momiji}"/>`).join('') + '</g></svg>',
};

// ---- まとまった絵 ----
// ホームの見出しの絵：パステル三毛猫とサバトラが並ぶ
export function logoSVG(mike, saba) {
  return `<svg viewBox="-110 -62 220 120">${mapleLeaf(C.momiji, C.momijiDeep, 15).replace('<g>', '<g transform="translate(92 -40) rotate(-20)">')}`
    + `<g transform="translate(48 8) scale(0.92)">${catFace(saba, { mood: 'happy' })}</g>`
    + `<g transform="translate(-48 4)">${catFace(mike)}</g></svg>`;
}

export function rotateSVG(d) {
  return `<svg viewBox="-70 -70 140 140">`
    + `<rect x="-26" y="-46" width="52" height="92" rx="10" fill="${C.paper}" stroke="${C.line}" stroke-width="4"/>`
    + `<g transform="scale(0.38)">${catFace(d, { mood: 'happy' })}</g>`
    + `<path d="M-52,-20 A56,56 0 0 1 -20,-52" fill="none" stroke="${C.kaki}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M-26,-60 L-18,-52 L-28,-46" fill="none" stroke="${C.kaki}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
    + `</svg>`;
}

// ホームの献立の小さな絵
export function menuArt(kind, d) {
  if (kind === 'roulette') {
    const cols = [C.kaki, C.icho, '#f9dcc0', C.rose, C.olive, '#fbe3a6'];
    const n = 6;
    const segs = cols.map((c, i) => {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      return `<path d="M0,0 L${f(Math.cos(a0) * 26)},${f(Math.sin(a0) * 26)} A26,26 0 0 1 ${f(Math.cos(a1) * 26)},${f(Math.sin(a1) * 26)} Z" fill="${c}"/>`;
    }).join('');
    return `<svg viewBox="-36 -36 72 72"><circle r="30" fill="${C.chestnut}"/>${segs}`
      + `<path d="M0,0 L0,-20" stroke="${C.line}" stroke-width="3" stroke-linecap="round" transform="rotate(35)"/>`
      + `<g transform="rotate(35) translate(0 -20)">${pawPrint(C.momiji, 6)}</g>`
      + `<g transform="scale(0.2)">${catFace(d)}</g></svg>`;
  }
  if (kind === 'stamp') {
    let cells = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      cells += `<rect x="${-24 + c * 17}" y="${-10 + r * 14}" width="14" height="12" rx="3" fill="#ffffff" stroke="${C.line}" stroke-width="1" opacity="0.9"/>`;
    }
    // カードの上から猫がのぞく（猫を先に描き、カードで顔の下を隠す）
    return `<svg viewBox="-36 -36 72 72"><g transform="translate(12 -19) scale(0.24)">${catFace(d)}</g>`
      + `<rect x="-30" y="-16" width="60" height="48" rx="8" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="2"/>${cells}`
      + `<g transform="translate(10 7)">${pawPrint(C.momiji, 6)}</g>`
      + `<g transform="translate(20 26) scale(0.62)">${catPaw(d, 16)}</g></svg>`;
  }
  if (kind === 'hana') {
    // コスモスの花と、花びらを1枚つまむ猫の手
    const petals = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * 360;
      const col = ['#f9c6d3', '#fde3ea', '#f5b8cd'][i % 3];
      return `<ellipse cx="0" cy="-15" rx="7.5" ry="13" fill="${col}" stroke="#e9a1b8" stroke-width="1.2" transform="rotate(${f(a)})"/>`;
    }).join('');
    return `<svg viewBox="-36 -36 72 72"><path d="M-2,8 Q2,22 -4,36" stroke="${C.oliveDeep}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      + `<g transform="translate(-4 -4)">${petals}<circle r="6.5" fill="${C.icho}" stroke="${C.ichoDeep}" stroke-width="1.4"/></g>`
      + `<g transform="translate(24 -22) rotate(30)"><ellipse cx="0" cy="0" rx="5" ry="9" fill="#f5b8cd" stroke="#e9a1b8" stroke-width="1.2"/></g>`
      + `<g transform="translate(22 24) scale(0.2)">${catFace(d)}</g></svg>`;
  }
  if (kind === 'kuji') {
    // おみくじの箱と、出てきた棒の番号
    return `<svg viewBox="-36 -36 72 72"><g transform="rotate(-14)">`
      + `<rect x="1" y="-30" width="6" height="26" rx="2.5" fill="#f6e3c3" stroke="#c99a62" stroke-width="1.4"/>`
      + `<rect x="-10" y="-8" width="28" height="40" rx="6" fill="#f3d9b0" stroke="#c99a62" stroke-width="2"/>`
      + `<rect x="-9" y="2" width="26" height="12" fill="${C.momiji}"/>`
      + `<circle cx="4" cy="-30" r="8" fill="${C.paper}" stroke="${C.momiji}" stroke-width="2"/></g>`
      + `<g transform="translate(-21 16) scale(0.24)">${catFace(d, { mood: 'happy' })}</g></svg>`;
  }
  if (kind === 'amida') {
    // あみだくじの線と、足あと
    const rows = [-20, -4, 12, 28];
    let lines = rows.map((y) => `<path d="M-28,${y} H22" stroke="${C.chestnut}" stroke-width="2.4" stroke-linecap="round"/>`).join('');
    lines += `<path d="M-12,-20 V-4 M6,-4 V12 M-4,12 V28 M14,-20 V-4" stroke="${C.chestnut}" stroke-width="2.4" stroke-linecap="round"/>`;
    lines += `<path d="M-28,-4 H-12 V-20 H14 V-4 H22" stroke="${C.momiji}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`;
    lines += rows.map((y) => `<rect x="22" y="${y - 5}" width="11" height="10" rx="3" fill="#ffffff" stroke="${C.woodDeep}" stroke-width="1.4"/>`).join('');
    return `<svg viewBox="-36 -36 72 72">${lines}<g transform="translate(22 -4) scale(0.18)">${catFace(d)}</g></svg>`;
  }
  if (kind === 'race') {
    // 3つの毛糸玉と、のこした糸。右はしに ゴールの旗
    const balls = [{ y: -16, x: 12, fill: '#f4a7a3', deep: '#d97f7a' }, { y: 2, x: 2, fill: '#9fc5e8', deep: '#6f9fcb' }, { y: 20, x: -6, fill: '#f3d36b', deep: '#d4b043' }];
    let s = `<path d="M24,-32 V34" stroke="${C.momiji}" stroke-width="2.6" stroke-linecap="round"/>`
      + [-24, -8, 8, 24].map((y, k) => `<path d="M25,${y - 4} l7,4 l-7,4 Z" fill="${[C.momiji, C.icho, C.olive][k % 3]}"/>`).join('');
    for (const { y, x, fill, deep } of balls) {
      s += `<path d="M-30,${y + 5} H${x - 4}" stroke="${deep}" stroke-width="2" stroke-linecap="round"/>`
        + `<circle cx="${x}" cy="${y}" r="7.5" fill="${fill}" stroke="${deep}" stroke-width="1.4"/>`
        + `<path d="M${x - 6},${y - 2} Q${x},${y - 8} ${x + 6},${y - 2} M${x - 6},${y + 3} Q${x},${y - 3} ${x + 6},${y + 3}" stroke="${deep}" stroke-width="1.1" fill="none" opacity="0.8"/>`;
    }
    return `<svg viewBox="-36 -36 72 72">${s}<g transform="translate(17 -22) scale(0.17)">${catFace(d, { look: { x: -1, y: 0.4 } })}</g></svg>`;
  }
  if (kind === 'mato') {
    // 棚に立つ2つの的と、肉球の ねらい
    const plate = (x, y, rim) => `<rect x="${x}" y="${y}" width="30" height="16" rx="5" fill="#ffffff" stroke="${rim}" stroke-width="1.8"/>`
      + `<circle cx="${x + 8}" cy="${y + 8}" r="5" fill="${rim}" opacity="0.85"/><circle cx="${x + 8}" cy="${y + 8}" r="2" fill="#ffffff"/>`
      + `<path d="M${x + 14},${y + 8} h12" stroke="${C.inkSoft}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`;
    return `<svg viewBox="-36 -36 72 72"><rect x="-32" y="-12" width="64" height="4" rx="2" fill="${C.woodDeep}"/><rect x="-32" y="12" width="64" height="4" rx="2" fill="${C.woodDeep}"/>`
      + plate(-30, -29, C.momiji) + plate(2, -29, C.olive) + plate(-30, -5, '#6f9fcb') + plate(2, -5, C.kaki)
      + `<g transform="translate(-22 -21)"><circle r="9" fill="#ffffff" opacity="0.7"/><circle r="9" fill="none" stroke="${C.momiji}" stroke-width="1.6" stroke-dasharray="3 2"/>${pawPrint(C.momiji, 7)}</g>`
      + `<g transform="translate(14 25) scale(0.2)">${catFace(d, { look: { x: -0.4, y: -1 } })}</g><circle cx="-6" cy="26" r="5" fill="#fff6e4" stroke="${C.momiji}" stroke-width="1.4"/></svg>`;
  }
  if (kind === 'sugoroku') {
    // つづら折りの ますと、さいころ
    const sq = [[-30, 6, '#fde2d6', '#e8664a'], [-8, 6, '#fdefc8', '#e0a93a'], [14, 6, '#e4efd2', '#86a256'], [14, -16, '#dde9f6', '#6f9fcb'], [-8, -16, '#ece2f4', '#a985c9'], [-30, -16, '#fbe3ea', '#e391ad']];
    let s = `<path d="M-21,15 H23 V-7 H-21" stroke="#f1dcb8" stroke-width="8" fill="none" stroke-linejoin="round"/>`;
    for (const [x, y, fill, edge] of sq) s += `<rect x="${x}" y="${y}" width="18" height="18" rx="4" fill="${fill}" stroke="${edge}" stroke-width="1.6"/>`;
    s += `<g transform="translate(18 26) rotate(-12)"><rect x="-8" y="-8" width="16" height="16" rx="3.5" fill="#ffffff" stroke="${C.line}" stroke-width="1.6"/><circle r="2.6" fill="${C.momiji}"/></g>`;
    return `<svg viewBox="-36 -36 72 72">${s}<g transform="translate(-21 -7) scale(0.15)">${catFace(d)}</g></svg>`;
  }
  if (kind === 'otoshi') {
    // くぎの板と、お皿に入るカリカリ
    let s = '';
    for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
      const x = -24 + k * 12 + (r % 2 ? 6 : 0);
      if (x > 26) continue;
      s += `<circle cx="${x}" cy="${-22 + r * 9}" r="1.8" fill="${C.woodDeep}"/>`;
    }
    const bowls = ['#fde2d6', '#fdefc8', '#e4efd2', '#dde9f6'];
    bowls.forEach((col, k) => { s += `<rect x="${-28 + k * 14.5}" y="14" width="12.5" height="18" rx="3.5" fill="${col}" stroke="${['#e8664a', '#e0a93a', '#86a256', '#6f9fcb'][k]}" stroke-width="1.4"/>`; });
    s += `<path d="M-2,-30 q-4,8 2,13 q6,6 -2,13 q-5,6 1,12" stroke="${C.momiji}" stroke-width="1.4" fill="none" stroke-dasharray="2 2" opacity="0.7"/>`;
    s += `<g transform="translate(1 24) rotate(20)"><path d="M-5,0 Q-1,-5 3,-1 L5,-3 L5,3 L3,1 Q-1,5 -5,0 Z" fill="${C.chestnut}" stroke="${C.chestnutDeep}" stroke-width="0.8"/></g>`;
    return `<svg viewBox="-36 -36 72 72">${s}<g transform="translate(22 -24) scale(0.16)">${catFace(d, { look: { x: -1, y: 0.6 } })}</g></svg>`;
  }
  if (kind === 'maigo') {
    // 枝分かれする小道と、出口の札
    const road = 'M-32,2 L-20,2 C-10,2 -12,-16 0,-16 L6,-16 M-20,2 C-10,2 -12,20 0,20 M0,-16 C8,-16 6,-26 16,-26 L22,-26 M0,-16 C8,-16 6,-8 16,-8 L22,-8 M0,20 L22,20';
    let s = `<path d="${road}" stroke="#e6c99a" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${road}" stroke="#fbf1dc" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += [-26, -8, 20].map((y) => `<rect x="22" y="${y - 5}" width="11" height="10" rx="3" fill="#ffffff" stroke="${C.woodDeep}" stroke-width="1.4"/>`).join('');
    return `<svg viewBox="-36 -36 72 72">${s}<g transform="translate(-22 -6) scale(0.13)">${catSitting(d, { look: { x: 1, y: 0 } })}</g></svg>`;
  }
  if (kind === 'tower') {
    // 積み上がった だんボール箱と、てっぺんの猫
    let s = '';
    [[0, 22, '#e9c591'], [2, 8, '#e3bb84'], [-1, -6, '#eecd9d']].forEach(([dx, y, col]) => {
      s += `<rect x="${-14 + dx}" y="${y - 6}" width="28" height="13" rx="2" fill="${col}" stroke="#b98a52" stroke-width="1.4"/><rect x="${-2.5 + dx}" y="${y - 6}" width="5" height="13" fill="#f6dfb8"/>`;
    });
    s += [26, 12, -2, -16].map((y) => `<path d="M20,${y} h10" stroke="${C.chestnut}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`).join('');
    return `<svg viewBox="-36 -36 72 72">${s}<g transform="translate(0 -22) scale(0.15)">${catSitting(d, { mood: 'happy' })}</g></svg>`;
  }
  if (kind === 'sagasu') {
    // たなの2つの箱。左の箱から猫のしっぽ、右の箱から ねずみの おもちゃ
    const boxAt = (x, col) => `<path d="M${x - 12},-2 l-5,-9 l9,0 Z M${x + 12},-2 l5,-9 l-9,0 Z" fill="#f0d19f" stroke="#b98a52" stroke-width="1.2" stroke-linejoin="round"/>`
      + `<rect x="${x - 13}" y="-2" width="26" height="24" rx="2.5" fill="${col}" stroke="#b98a52" stroke-width="1.4"/>`
      + `<rect x="${x - 9}" y="5" width="18" height="10" rx="2" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="1"/>`;
    return `<svg viewBox="-36 -36 72 72"><rect x="-34" y="22" width="68" height="4" rx="2" fill="${C.woodDeep}"/>`
      + `<path d="M-17,0 C-17,-12 -11,-12 -12,-20" stroke="${d.line}" stroke-width="6.5" fill="none" stroke-linecap="round"/><path d="M-17,0 C-17,-12 -11,-12 -12,-20" stroke="${d.tail}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`
      + boxAt(-16, '#e9c591')
      + `<g transform="translate(17 -6)"><path d="M5,1 q4,-4 8,0" stroke="#8f8499" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse rx="6" ry="4.2" fill="#e3dde9" stroke="#8f8499" stroke-width="1"/><circle cx="-2" cy="-4" r="2.2" fill="#e3dde9" stroke="#8f8499" stroke-width="0.9"/><circle cx="-3.4" cy="-0.6" r="0.7" fill="#4a3a33"/><circle cx="-6" cy="0.4" r="0.9" fill="#f19bb0"/></g>`
      + boxAt(16, '#eecd9d')
      + `<g transform="translate(-20 -24) scale(0.15)">${catFace(d, { look: { x: 1, y: 0.6 } })}</g></svg>`;
  }
  if (kind === 'saikoro') {
    // 大きな さいころと、前足でつつく猫
    const pip = (x, y, c = C.ink) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c}"/>`;
    return `<svg viewBox="-36 -36 72 72"><ellipse cx="-4" cy="30" rx="22" ry="4" fill="#a0703f" opacity="0.18"/>`
      + `<g transform="translate(-6 8) rotate(-14)"><rect x="-19" y="-19" width="38" height="38" rx="8" fill="#ffffff" stroke="${C.line}" stroke-width="2"/>${pip(-9, -9)}${pip(9, -9)}${pip(0, 0, C.momiji)}${pip(-9, 9)}${pip(9, 9)}</g>`
      + `<g transform="translate(24 18) scale(0.55)">${catPaw(d, 14)}</g>`
      + `<g transform="translate(18 -22) scale(0.18)">${catFace(d, { look: { x: -1, y: 0.6 } })}</g></svg>`;
  }
  if (kind === 'negaeri') {
    // まるい ラグの上で まるくなる猫と、まわりの札
    return `<svg viewBox="-36 -36 72 72"><circle r="24" fill="#fde3d6" stroke="#f1b8a3" stroke-width="2"/>`
      + [[0, -31], [29, 0], [0, 31], [-29, 0]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 4}" width="12" height="8" rx="4" fill="#ffffff" stroke="${C.woodDeep}" stroke-width="1.2"/>`).join('')
      + `<ellipse cx="-2" cy="2" rx="15" ry="11" fill="${d.base}" stroke="${d.line}" stroke-width="1.4"/>`
      + `<g transform="translate(9 -6) rotate(30) scale(0.2)">${catFace(d, { blink: true })}</g>`
      + `<text x="14" y="-16" font-size="9" font-weight="700" fill="${C.chestnut}">z</text></svg>`;
  }
  if (kind === 'mekuri') {
    // 上で とじた めくりカード。1まい めくれかけ
    return `<svg viewBox="-36 -36 72 72"><rect x="-26" y="-24" width="44" height="50" rx="6" fill="#efe0c8" stroke="${C.woodDeep}" stroke-width="1.6"/>`
      + `<rect x="-23" y="-20" width="38" height="43" rx="4" fill="#fffaf0" stroke="#e6cfae" stroke-width="1.2"/>`
      + `<path d="M-17,4 h26 M-17,12 h18" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" opacity="0.75"/>`
      + `<circle cx="-4" cy="-10" r="5" fill="#fde3d6"/>`
      + `<path d="M-23,-20 L15,-20 L15,-30 Q-4,-36 -23,-28 Z" fill="#fff6ea" stroke="#e6cfae" stroke-width="1.2"/>`
      + [-14, -4, 6].map((x) => `<rect x="${x - 2}" y="-28" width="4" height="9" rx="2" fill="#fffaf0" stroke="${C.chestnut}" stroke-width="1.2"/>`).join('')
      + `<g transform="translate(24 18) scale(0.17)">${catFace(d, { look: { x: -1, y: 0 } })}</g></svg>`;
  }
  if (kind === 'wanage') {
    // しばふに立つ2本の棒と、入った わ
    const peg = (x) => `<rect x="${x - 2.5}" y="-14" width="5" height="22" rx="2" fill="#e3bb84" stroke="#b98a52" stroke-width="1.2"/><circle cx="${x}" cy="-14" r="3.5" fill="#f1d3a6" stroke="#b98a52" stroke-width="1.2"/><rect x="${x - 13}" y="10" width="26" height="9" rx="4" fill="#ffffff" stroke="${C.woodDeep}" stroke-width="1.2"/>`;
    return `<svg viewBox="-36 -36 72 72"><rect x="-33" y="-22" width="66" height="46" rx="10" fill="#dfe9bf" stroke="#b9cc85" stroke-width="1.6"/>${peg(-15)}${peg(15)}`
      + `<ellipse cx="-15" cy="6" rx="9" ry="3.6" fill="none" stroke="#d97f7a" stroke-width="3.4"/><ellipse cx="-15" cy="6" rx="9" ry="3.6" fill="none" stroke="#f7a6a0" stroke-width="2"/>`
      + `<g transform="translate(20 -26) rotate(-25)"><ellipse rx="8" ry="3.2" fill="none" stroke="#6f9fcb" stroke-width="3"/></g>`
      + `<g transform="translate(0 28) scale(0.15)">${catFace(d, { look: { x: 0, y: -1 } })}</g></svg>`;
  }
  if (kind === 'tsuri') {
    // 池の さかなと、うき・つりざお
    return `<svg viewBox="-36 -36 72 72"><rect x="-33" y="-6" width="66" height="38" rx="10" fill="#cfe8eb" stroke="#9fc8cf" stroke-width="1.6"/>`
      + `<path d="M30,-30 Q8,-36 -2,-22" stroke="#9b5f3a" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-2,-22 V-8" stroke="#6b5a4e" stroke-width="1"/>`
      + `<ellipse cx="-2" cy="-6" rx="3.4" ry="4.4" fill="#ffffff" stroke="${C.ink}" stroke-width="1"/><path d="M-2,-6 V14" stroke="#6b5a4e" stroke-width="1"/>`
      + `<g transform="translate(-14 16)"><path d="M9,0 L14,-4 L14,4 Z" fill="#e08d7c"/><ellipse rx="10" ry="5.5" fill="#f7b5a6" stroke="#e08d7c" stroke-width="1"/><circle cx="-5" cy="-1" r="1.2" fill="#4a3a33"/></g>`
      + `<g transform="translate(18 6) scale(-1 1)"><path d="M9,0 L14,-4 L14,4 Z" fill="#7aa7cf"/><ellipse rx="9" ry="5" fill="#a9cbe8" stroke="#7aa7cf" stroke-width="1"/></g>`
      + `<g transform="translate(24 -24) scale(0.15)">${catFace(d, { look: { x: -1, y: 0.6 } })}</g></svg>`;
  }
  if (kind === 'tobiishi') {
    // 川に じぐざぐの とびいしと、とびうつる子猫
    const st = (x, y) => `<rect x="${x - 13}" y="${y - 5}" width="26" height="10" rx="5" fill="#efe8dc" stroke="#b8ab98" stroke-width="1.2"/>`;
    return `<svg viewBox="-36 -36 72 72"><rect x="-34" y="-34" width="68" height="68" rx="12" fill="#cfe8eb"/>${st(-12, 22)}${st(12, 8)}${st(-12, -6)}${st(12, -20)}`
      + `<path d="M-12,14 Q0,0 10,-2" stroke="${C.momiji}" stroke-width="1.4" stroke-dasharray="2 2" fill="none"/>`
      + `<g transform="translate(-14 -16) scale(0.13)">${catSitting(d, { look: { x: 1, y: -1 } })}</g></svg>`;
  }
  if (kind === 'hidamari') {
    // ひだまりの ざぶとんで まるくなる猫
    return `<svg viewBox="-36 -36 72 72"><defs><radialGradient id="mhd" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff3b8"/><stop offset="1" stop-color="#fff3b8" stop-opacity="0"/></radialGradient></defs>`
      + `<rect x="-28" y="-8" width="56" height="32" rx="9" fill="#cfe0ea" stroke="#9fbdd0" stroke-width="1.6"/><ellipse cx="0" cy="8" rx="34" ry="24" fill="url(#mhd)"/>`
      + `<g transform="translate(0 6) scale(0.36)">${catCurled(d)}</g>`
      + `<circle cx="22" cy="-24" r="7" fill="#ffe58a"/>` + [0, 60, 120, 180, 240, 300].map((a) => `<path d="M22,-24 m${(Math.cos((a * Math.PI) / 180) * 10).toFixed(1)},${(Math.sin((a * Math.PI) / 180) * 10).toFixed(1)} l${(Math.cos((a * Math.PI) / 180) * 4).toFixed(1)},${(Math.sin((a * Math.PI) / 180) * 4).toFixed(1)}" stroke="#f5c451" stroke-width="2" stroke-linecap="round"/>`).join('') + '</svg>';
  }
  // nobi
  return `<svg viewBox="-36 -36 72 72"><rect x="-26" y="-34" width="14" height="70" rx="3" fill="${C.wood}" stroke="${C.woodDeep}" stroke-width="1.5"/>`
    + `<path d="M-26,-18 h14 M-26,-2 h14 M-26,14 h14" stroke="${C.momiji}" stroke-width="2.4" stroke-linecap="round"/>`
    + `<rect x="2" y="-8" width="20" height="40" rx="9" fill="${d.base}" stroke="${d.line}" stroke-width="2"/>`
    + (d.body === 'saba' ? `<path d="M2,6 h5 M22,12 h-5 M2,18 h5 M22,24 h-5" stroke="${d.stripe}" stroke-width="2" stroke-linecap="round"/>` : '')
    + `<g transform="translate(12 -16) scale(0.24)">${catFace(d, { mood: 'happy' })}</g>`
    + `<circle cx="-2" cy="-26" r="5" fill="${d.paw}" stroke="${d.line}" stroke-width="2"/><circle cx="26" cy="-26" r="5" fill="${d.paw}" stroke="${d.line}" stroke-width="2"/></svg>`;
}

// ---- 背景（秋）。縦長の画面の下を基準に置き、短い画面では上が少し切れる ----
function treeRound(x, y, r, color, trunk = C.chestnut) {
  return `<g><rect x="${f(x - r * 0.12)}" y="${f(y)}" width="${f(r * 0.24)}" height="${f(r * 1.0)}" rx="${f(r * 0.1)}" fill="${trunk}"/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}"/>`
    + `<circle cx="${f(x - r * 0.62)}" cy="${f(y + r * 0.28)}" r="${f(r * 0.66)}" fill="${color}"/>`
    + `<circle cx="${f(x + r * 0.62)}" cy="${f(y + r * 0.28)}" r="${f(r * 0.66)}" fill="${color}"/>`
    + `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.3)}" fill="#ffffff" opacity="0.18"/></g>`;
}

function scatter(seed, count, area, sizeMin, sizeMax) {
  // 決まった並びの散らし方（毎回同じ絵になるよう、簡単な疑似乱数を使う）
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = area.x + rnd() * area.w;
    const y = area.y + rnd() * area.h;
    const size = sizeMin + rnd() * (sizeMax - sizeMin);
    const rot = rnd() * 360;
    out += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" opacity="0.95">${autumnLeaf(i, size)}</g>`;
  }
  return out;
}

export function sceneSVG(kind) {
  const id = nextId('sc');
  const W = 390;
  const H = 844;
  const sky = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.skyTop}"/><stop offset="0.6" stop-color="${C.sky}"/><stop offset="1" stop-color="${C.cream}"/></linearGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#${id}g)"/>`;
  let body = '';
  if (kind === 'home') {
    body = `<g transform="translate(70 150)">${cloud(90)}</g><g transform="translate(320 100)">${cloud(70)}</g>`
      + `<path d="M0,690 Q100,640 200,670 T390,650 V844 H0 Z" fill="#f6d9a8"/>`
      + `<path d="M0,740 Q120,700 240,730 T390,720 V844 H0 Z" fill="#f2c98e"/>`
      + treeRound(36, 660, 34, C.momiji) + treeRound(354, 640, 38, C.icho) + treeRound(300, 690, 26, C.kaki)
      + treeRound(90, 700, 24, C.icho)
      + scatter(7, 10, { x: 10, y: 770, w: 370, h: 60 }, 9, 14);
  } else if (kind === 'roulette') {
    body = `<g transform="translate(60 110)">${cloud(80)}</g><g transform="translate(330 170)">${cloud(64)}</g>`
      + `<path d="M0,560 Q90,520 190,548 T390,530 V844 H0 Z" fill="#f7dcae"/>`
      + treeRound(30, 540, 30, C.icho) + treeRound(366, 520, 34, C.momiji) + treeRound(320, 556, 22, C.kaki) + treeRound(70, 566, 20, C.momiji)
      + `<path d="M0,640 Q130,600 260,630 T390,620 V844 H0 Z" fill="#f3cf98"/>`
      + scatter(11, 14, { x: 6, y: 660, w: 378, h: 170 }, 8, 13);
  } else if (kind === 'stamp') {
    // 明るい木の机
    let planks = '';
    for (let i = 0; i < 6; i++) {
      const y = i * 150;
      planks += `<rect x="0" y="${y}" width="${W}" height="150" fill="${i % 2 ? '#f6dcb4' : '#f3d5a8'}"/>`
        + `<path d="M20,${y + 40} q80,-10 160,4 t180,-2 M40,${y + 100} q90,8 170,-4 t150,6" stroke="#e8c48f" stroke-width="2" fill="none" opacity="0.7"/>`
        + `<path d="M0,${y + 150} H${W}" stroke="#e2bd87" stroke-width="2"/>`;
    }
    body = planks
      + `<g transform="translate(36 120) rotate(-20)">${acorn(16)}</g><g transform="translate(358 760) rotate(15)">${acorn(18)}</g>`
      + `<g transform="translate(336 130) rotate(30)">${mapleLeaf(C.momiji, C.momijiDeep, 22)}</g>`
      + `<g transform="translate(40 780) rotate(-30)">${ginkgoLeaf(C.icho, C.ichoDeep, 22)}</g>`
      + `<g transform="translate(70 800) rotate(40)">${mapleLeaf(C.kaki, C.kakiDeep, 16)}</g>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  } else if (kind === 'nobi') {
    // 縁側：柿の木の枝と、すすきと、赤とんぼ
    let kaki = '';
    [[300, 92], [350, 140], [262, 150], [330, 196]].forEach(([x, y], i) => {
      kaki += `<path d="M${x},${y - 16} L${x - 6},${y - 34}" stroke="#8a5a36" stroke-width="3" stroke-linecap="round"/>`
        + `<g transform="translate(${x} ${y})">${persimmon(i % 2 ? 15 : 17)}</g>`;
    });
    let susuki = '';
    [[24, 0], [46, 12], [64, -6], [350, 6], [372, -10]].forEach(([x, d]) => {
      susuki += `<path d="M${x},800 Q${x + d},700 ${x + 22 + d},640" stroke="#c9a670" stroke-width="3" fill="none" stroke-linecap="round"/>`
        + `<path d="M${x + 22 + d},640 q-4,24 -10,44 M${x + 22 + d},640 q8,20 6,40 M${x + 18 + d},652 q-14,18 -18,32" stroke="#e9d3a8" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    });
    body = `<g transform="translate(80 140)">${cloud(80)}</g>`
      + `<path d="M390,60 Q300,70 230,120" stroke="#8a5a36" stroke-width="9" fill="none" stroke-linecap="round"/>`
      + `<path d="M330,66 Q340,120 352,128" stroke="#8a5a36" stroke-width="5" fill="none" stroke-linecap="round"/>`
      + `<g transform="translate(238 108) rotate(-30)">${mapleLeaf(C.oliveDeep, '#6f8a45', 14)}</g>`
      + `<g transform="translate(372 84) rotate(20)">${mapleLeaf(C.kaki, C.kakiDeep, 14)}</g>`
      + kaki
      + `<g transform="translate(300 300) rotate(-12)">${dragonfly(18)}</g><g transform="translate(250 420) rotate(16)">${dragonfly(14)}</g>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/>`
      + `<path d="M0,760 H${W} M0,800 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + susuki;
  } else if (kind === 'hana') {
    // 秋の野原：遠くの丘と、コスモスの小さな花
    let field = '';
    let sd = 5;
    const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = 650 + rnd() * 180;
      const r = 4 + rnd() * 4;
      const col = ['#f9c6d3', '#fde3ea', '#f5b8cd', '#ffffff'][i % 4];
      field += `<path d="M${f(x)},${f(y + r)} q${f(r * 0.4)},${f(r * 3)} ${f(-r * 0.2)},${f(r * 6)}" stroke="${C.oliveDeep}" stroke-width="1.6" fill="none" opacity="0.6"/>`
        + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}" stroke="#e9a1b8" stroke-width="1"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.32)}" fill="${C.icho}"/>`;
    }
    body = `<g transform="translate(70 120)">${cloud(80)}</g><g transform="translate(320 190)">${cloud(60)}</g>`
      + `<path d="M0,600 Q110,560 220,590 T390,570 V844 H0 Z" fill="#eadfb0"/>`
      + `<path d="M0,660 Q140,620 270,650 T390,640 V844 H0 Z" fill="#e2d39c"/>`
      + treeRound(354, 570, 30, C.momiji) + treeRound(28, 590, 24, C.icho)
      + field
      + `<g transform="translate(300 300) rotate(-12)">${dragonfly(16)}</g>`;
  } else if (kind === 'kuji') {
    // 縁日：上に ちょうちんの列、下に木の床
    let lanterns = `<path d="M-10,96 Q195,150 400,96" stroke="#9b5f3a" stroke-width="2.5" fill="none"/>`;
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 58;
      const y = 96 + Math.sin((i / 6) * Math.PI) * 26;
      lanterns += `<path d="M${x},${y} v10" stroke="#9b5f3a" stroke-width="2"/>`
        + `<rect x="${x - 7}" y="${y + 8}" width="14" height="5" rx="2" fill="#9b5f3a"/>`
        + `<ellipse cx="${x}" cy="${y + 30}" rx="16" ry="20" fill="#fff6e4" stroke="#e7b98a" stroke-width="2"/>`
        + `<path d="M${x - 15},${y + 24} h30 M${x - 15},${y + 36} h30" stroke="${C.momiji}" stroke-width="3" opacity="0.8"/>`
        + `<rect x="${x - 7}" y="${y + 48}" width="14" height="5" rx="2" fill="#9b5f3a"/>`;
    }
    let planks = '';
    for (let i = 0; i < 4; i++) {
      planks += `<rect x="0" y="${640 + i * 52}" width="${W}" height="52" fill="${i % 2 ? '#f3d5a8' : '#f6dcb4'}"/>`
        + `<path d="M0,${640 + i * 52} H${W}" stroke="#e2bd87" stroke-width="2"/>`;
    }
    body = lanterns + planks
      + `<g transform="translate(40 760) rotate(-24)">${mapleLeaf(C.momiji, C.momijiDeep, 16)}</g>`
      + `<g transform="translate(350 790) rotate(30)">${ginkgoLeaf(C.icho, C.ichoDeep, 18)}</g>`;
  } else if (kind === 'amida') {
    // 庭の小道：明るい芝と、落ち葉
    body = `<g transform="translate(300 120)">${cloud(80)}</g>`
      + `<path d="M0,560 Q120,520 240,548 T390,536 V844 H0 Z" fill="#e7e5b4"/>`
      + `<path d="M150,844 Q180,700 260,640 T390,600 V640 Q300,670 250,720 T230,844 Z" fill="#f4e2c0"/>`
      + treeRound(40, 520, 30, C.kaki) + treeRound(360, 500, 26, C.momiji)
      + scatter(17, 12, { x: 6, y: 640, w: 378, h: 190 }, 8, 13);
  } else if (kind === 'race') {
    // 運動会の原っぱ：上に小さな旗の列、遠くの丘と木
    let bunting = `<path d="M-10,70 Q195,112 400,70" stroke="#9b5f3a" stroke-width="2" fill="none"/>`;
    for (let i = 0; i < 14; i++) {
      const x = 4 + i * 28.5;
      const y = 70 + Math.sin(((x + 10) / 410) * Math.PI) * 21;
      const col = [C.momiji, C.icho, C.olive, '#9fc5e8', C.rose][i % 5];
      bunting += `<path d="M${f(x - 8)},${f(y)} L${f(x + 8)},${f(y + 1)} L${f(x)},${f(y + 18)} Z" fill="${col}" opacity="0.9"/>`;
    }
    body = bunting + `<g transform="translate(300 150)">${cloud(70)}</g>`
      + `<path d="M0,600 Q110,560 220,590 T390,570 V844 H0 Z" fill="#eadfb0"/>`
      + treeRound(30, 580, 28, C.kaki) + treeRound(362, 560, 30, C.icho)
      + `<path d="M0,670 Q140,630 270,660 T390,650 V844 H0 Z" fill="#e2d39c"/>`
      + scatter(29, 12, { x: 6, y: 680, w: 378, h: 150 }, 8, 13);
  } else if (kind === 'mato') {
    // 縁日の屋台：上に しま模様の ひさし、下に木の床
    let awning = '';
    for (let i = 0; i < 9; i++) {
      awning += `<path d="M${i * 46 - 10},0 h46 v44 q-23,14 -46,0 Z" fill="${i % 2 ? '#fff6e4' : '#f7c4b4'}"/>`;
    }
    let planks = '';
    for (let i = 0; i < 4; i++) {
      planks += `<rect x="0" y="${640 + i * 52}" width="${W}" height="52" fill="${i % 2 ? '#f3d5a8' : '#f6dcb4'}"/>`
        + `<path d="M0,${640 + i * 52} H${W}" stroke="#e2bd87" stroke-width="2"/>`;
    }
    body = awning + `<path d="M0,1 H${W}" stroke="#e2bd87" stroke-width="3"/>` + planks
      + `<g transform="translate(46 770) rotate(-20)">${mapleLeaf(C.kaki, C.kakiDeep, 16)}</g>`
      + `<g transform="translate(344 800) rotate(24)">${ginkgoLeaf(C.icho, C.ichoDeep, 18)}</g>`;
  } else if (kind === 'sugoroku') {
    // 和室：上に しょうじ、下に たたみ
    let shoji = `<rect x="0" y="0" width="${W}" height="210" fill="#fffaf0"/>`;
    for (let x = 0; x <= W; x += 65) shoji += `<path d="M${x},0 V210" stroke="#e6c99a" stroke-width="3"/>`;
    for (let y = 0; y <= 210; y += 52) shoji += `<path d="M0,${y} H${W}" stroke="#e6c99a" stroke-width="3"/>`;
    shoji += `<path d="M0,212 H${W}" stroke="#c99a62" stroke-width="7"/>`;
    let tatami = '';
    for (let i = 0; i < 3; i++) {
      tatami += `<rect x="${i % 2 ? -100 : 0}" y="${600 + i * 82}" width="${W + 100}" height="82" fill="${i % 2 ? '#e8e3b8' : '#ece8c4'}" stroke="#d5cd98" stroke-width="2"/>`;
      tatami += `<path d="M${i % 2 ? 160 : 260},${600 + i * 82} V${682 + i * 82}" stroke="#b9a46c" stroke-width="5"/>`;
    }
    body = shoji + `<g transform="translate(330 150) rotate(20)">${mapleLeaf(C.momiji, C.momijiDeep, 16)}</g>` + tatami
      + `<g transform="translate(50 780) rotate(-20)">${mapleLeaf(C.kaki, C.kakiDeep, 15)}</g>`;
  } else if (kind === 'otoshi') {
    // 台所の窓辺：上に窓と カーテン、下に チェックの テーブルクロス
    let cloth = '';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
      if ((i + j) % 2) cloth += `<rect x="${i * 46}" y="${650 + j * 50}" width="46" height="50" fill="#f6c9b8" opacity="0.55"/>`;
    }
    body = `<rect x="70" y="60" width="250" height="150" rx="14" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>`
      + `<path d="M195,60 V210 M70,135 H320" stroke="#e6c99a" stroke-width="4"/>`
      + `<g transform="translate(250 100)">${cloud(60)}</g>`
      + `<path d="M60,50 Q90,140 70,220 L40,220 L40,50 Z M330,50 Q300,140 320,220 L350,220 L350,50 Z" fill="#f7c4b4" opacity="0.8"/>`
      + `<rect x="0" y="640" width="${W}" height="210" fill="#fff4e6"/>` + cloth
      + `<g transform="translate(50 600) rotate(-15)">${persimmon(16)}</g><g transform="translate(340 610) rotate(10)">${persimmon(14)}</g>`;
  } else if (kind === 'maigo') {
    // 庭の小道：生け垣の丸い しげみと、落ち葉
    const bush = (x, y, r, col) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x - r * 0.7}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${col}"/><circle cx="${x + r * 0.7}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${col}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#ffffff" opacity="0.18"/></g>`;
    body = `<g transform="translate(80 120)">${cloud(80)}</g>`
      + `<path d="M0,590 Q120,560 240,580 T390,570 V844 H0 Z" fill="#dfe6b5"/>`
      + bush(30, 600, 30, '#b9cc85') + bush(360, 590, 34, '#a9c17a') + bush(300, 640, 22, '#c3d494')
      + treeRound(70, 560, 26, C.kaki)
      + `<path d="M150,844 Q170,740 230,700 T330,660" stroke="#f4e2c0" stroke-width="40" fill="none" stroke-linecap="round"/>`
      + scatter(37, 10, { x: 6, y: 680, w: 378, h: 150 }, 8, 13);
  } else if (kind === 'tower') {
    // 引っこしの日の へや：上に窓、かべに 時計、下に木の床
    body = `<rect x="230" y="70" width="120" height="110" rx="10" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>`
      + `<path d="M290,70 V180 M230,125 H350" stroke="#e6c99a" stroke-width="4"/>`
      + `<g transform="translate(300 108)">${cloud(46)}</g>`
      + `<circle cx="70" cy="110" r="26" fill="#fffaf0" stroke="#e6c99a" stroke-width="4"/><path d="M70,110 V94 M70,110 L82,116" stroke="${C.chestnut}" stroke-width="3" stroke-linecap="round"/>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + `<g transform="translate(40 700) rotate(-12)">${mapleLeaf(C.kaki, C.kakiDeep, 14)}</g>`;
  } else if (kind === 'sagasu') {
    // 子ども部屋：水玉の かべ紙、丸い窓、木の床と まるい ラグ
    let dots = '';
    for (let r = 0; r < 9; r++) for (let k = 0; k < 7; k++) {
      dots += `<circle cx="${k * 60 + (r % 2 ? 30 : 0)}" cy="${30 + r * 70}" r="5" fill="#f6d2bf" opacity="0.55"/>`;
    }
    body = dots
      + `<circle cx="300" cy="120" r="56" fill="#fffaf0" stroke="#e6c99a" stroke-width="6"/><path d="M300,64 V176 M244,120 H356" stroke="#e6c99a" stroke-width="4"/>`
      + `<g transform="translate(316 108)">${cloud(40)}</g>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + `<ellipse cx="195" cy="800" rx="150" ry="26" fill="#f7c4b4" opacity="0.7"/><ellipse cx="195" cy="800" rx="118" ry="18" fill="none" stroke="#fffaf0" stroke-width="3" opacity="0.8"/>`
      + `<g transform="translate(46 700) rotate(-14)">${acorn(15)}</g><g transform="translate(350 705) rotate(18)">${mapleLeaf(C.kaki, C.kakiDeep, 14)}</g>`;
  } else if (kind === 'saikoro') {
    // あそびべや：木の床に、星の もようの ラグと つみき
    let stars = '';
    [[60, 760], [140, 790], [250, 770], [330, 800], [200, 812]].forEach(([x, y], i) => { stars += `<path d="M${x},${y - 7} L${x + 2},${y - 2} L${x + 7},${y - 2} L${x + 3},${y + 1} L${x + 5},${y + 6} L${x},${y + 3} L${x - 5},${y + 6} L${x - 3},${y + 1} L${x - 7},${y - 2} L${x - 2},${y - 2} Z" fill="${[C.icho, '#fffaf0', C.rose][i % 3]}"/>`; });
    const block = (x, y, s, col, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="4" fill="${col}" stroke="#d9b98e" stroke-width="2"/></g>`;
    body = `<g transform="translate(80 130)">${cloud(70)}</g><g transform="translate(310 180)">${cloud(56)}</g>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/><path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/>`
      + `<ellipse cx="195" cy="790" rx="170" ry="34" fill="#cfe0ea" opacity="0.8"/>` + stars
      + block(34, 700, 26, '#f7c4b4', -8) + block(60, 706, 20, '#fde3a6', 10) + block(352, 702, 24, '#cfe3c0', 6);
  } else if (kind === 'negaeri') {
    // ひるねの へや：レースの カーテン、つりさげの かざり、木の床
    let mobile = `<path d="M195,0 V60 M150,60 H240" stroke="#c99a62" stroke-width="2"/>`;
    [[150, 80, C.icho], [195, 96, C.rose], [240, 80, '#cfe0ea']].forEach(([x, y, c]) => { mobile += `<path d="M${x},60 V${y - 10}" stroke="#c99a62" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="10" fill="${c}" stroke="#e6c99a" stroke-width="2"/>`; });
    body = `<path d="M0,0 Q40,140 10,300 L0,300 Z M390,0 Q350,140 380,300 L390,300 Z" fill="#fffaf0" opacity="0.9"/>`
      + `<path d="M0,0 Q40,140 10,300 M390,0 Q350,140 380,300" stroke="#f1d7c2" stroke-width="3" fill="none"/>` + mobile
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/><path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + `<g transform="translate(52 702) rotate(-12)">${mapleLeaf(C.kaki, C.kakiDeep, 14)}</g>`;
  } else if (kind === 'mekuri') {
    // つくえの ある へや：かべの けいじ板、窓、つくえの はし
    body = `<rect x="40" y="80" width="150" height="110" rx="10" fill="#f3dcbb" stroke="#e6c99a" stroke-width="5"/>`
      + `<rect x="58" y="98" width="44" height="34" fill="#fffaf0" transform="rotate(-6 80 115)"/><rect x="116" y="104" width="52" height="40" fill="#fde3d6" transform="rotate(5 142 124)"/><circle cx="80" cy="100" r="4" fill="${C.momiji}"/><circle cx="142" cy="106" r="4" fill="${C.olive}"/>`
      + `<rect x="240" y="70" width="110" height="120" rx="10" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/><path d="M295,70 V190 M240,130 H350" stroke="#e6c99a" stroke-width="4"/>`
      + `<g transform="translate(300 108)">${cloud(40)}</g>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#e9c591"/><path d="M0,720 H${W}" stroke="#c99a62" stroke-width="5"/><path d="M0,744 H${W}" stroke="#ddb37c" stroke-width="2"/>`
      + `<g transform="translate(350 704) rotate(16)">${ginkgoLeaf(C.icho, C.ichoDeep, 15)}</g>`;
  } else if (kind === 'wanage') {
    // 縁日の夕方まえ：上に 小さな ちょうちんの列、まわりに 木、下に土の みち
    let lanterns = `<path d="M-10,70 Q195,104 400,70" stroke="#9b5f3a" stroke-width="2" fill="none"/>`;
    for (let i = 0; i < 9; i++) { const x = 10 + i * 46; const y = 70 + Math.sin(((x + 10) / 410) * Math.PI) * 17; lanterns += `<path d="M${x},${y} v6" stroke="#9b5f3a" stroke-width="1.6"/><ellipse cx="${x}" cy="${y + 16}" rx="10" ry="12" fill="#fff6e4" stroke="#e7b98a" stroke-width="1.6"/><path d="M${x - 9},${y + 13} h18" stroke="${C.momiji}" stroke-width="2" opacity="0.8"/>`; }
    body = lanterns + treeRound(30, 560, 30, C.momiji) + treeRound(362, 548, 32, C.icho)
      + `<rect x="0" y="700" width="${W}" height="144" fill="#efd9b4"/><path d="M0,700 H${W}" stroke="#e2c592" stroke-width="3"/>`
      + scatter(41, 10, { x: 6, y: 720, w: 378, h: 110 }, 8, 12);
  } else if (kind === 'tsuri') {
    // 池の ほとり：遠くの山、すすき、くさ
    let reeds = '';
    [[22, 0], [44, 10], [348, -6], [370, 8]].forEach(([x, dd]) => { reeds += `<path d="M${x},844 Q${x + dd},${740} ${x + 18 + dd},${690}" stroke="#c9a670" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${x + 18 + dd},690 q-4,22 -9,40 M${x + 18 + dd},690 q7,18 5,36" stroke="#e9d3a8" stroke-width="6" fill="none" stroke-linecap="round"/>`; });
    body = `<g transform="translate(80 110)">${cloud(70)}</g><path d="M0,260 Q100,190 200,240 T390,220 V320 H0 Z" fill="#e7e2c2" opacity="0.8"/>`
      + `<rect x="0" y="300" width="${W}" height="544" fill="#e2e8bf"/>` + treeRound(40, 280, 26, C.kaki) + treeRound(350, 270, 30, C.momiji) + reeds;
  } else if (kind === 'tobiishi') {
    // 川原：遠くの はし、くさ、とんぼ
    body = `<g transform="translate(70 110)">${cloud(70)}</g>`
      + `<path d="M210,250 Q290,200 370,250" stroke="#e3a074" stroke-width="8" fill="none"/><path d="M222,250 V262 M250,232 V262 M280,224 V262 M310,224 V262 M340,232 V262 M358,244 V262" stroke="#e3a074" stroke-width="3"/>`
      + `<rect x="0" y="262" width="${W}" height="582" fill="#e2e8bf"/>` + treeRound(40, 250, 24, C.icho)
      + `<g transform="translate(320 330) rotate(-14)">${dragonfly(16)}</g><g transform="translate(60 380) rotate(10)">${dragonfly(12)}</g>`;
  } else if (kind === 'hidamari') {
    // えんがわ：上に にわの みどりと そら、下に 木の いた
    let boards = '';
    for (let i = 0; i < 6; i++) boards += `<rect x="0" y="${560 + i * 48}" width="${W}" height="48" fill="${i % 2 ? '#f3d5a8' : '#f6dcb4'}"/><path d="M0,${560 + i * 48} H${W}" stroke="#e2bd87" stroke-width="2"/>`;
    body = `<g transform="translate(90 110)">${cloud(80)}</g><g transform="translate(300 160)">${cloud(60)}</g>`
      + `<circle cx="340" cy="70" r="26" fill="#ffe58a" opacity="0.9"/>`
      + `<path d="M0,420 Q100,380 200,410 T390,390 V560 H0 Z" fill="#dfe6b5"/>` + treeRound(50, 420, 32, C.kaki) + treeRound(330, 410, 28, C.momiji) + boards
      + `<path d="M0,556 H${W}" stroke="#c99a62" stroke-width="6"/>`;
  } else if (kind === 'settings') {
    body = scatter(23, 8, { x: 0, y: 0, w: W, h: H }, 10, 16).replaceAll('opacity="0.95"', 'opacity="0.18"');
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${sky}${body}</svg>`;
}
