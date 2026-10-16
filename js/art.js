// 絵（すべてコードで描く SVG。外部の画像・素材集は使わない：RS01-S18）。
// 絵文字は使わない。記号が要る所も図形で描く（RS01-S14）。
// 猫は cats.js が描く（RS01-S20）。
import { catFace, catPaw, pawPrint } from './cats.js';

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
  } else if (kind === 'settings') {
    body = scatter(23, 8, { x: 0, y: 0, w: W, h: H }, 10, 16).replaceAll('opacity="0.95"', 'opacity="0.18"');
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${sky}${body}</svg>`;
}
