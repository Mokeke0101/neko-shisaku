// 画面の背景（季節ごと。RS01-S13）。縦長の画面の下を基準に置き、短い画面では上が少し切れる。
// 季節の下地（空・木・地面・散らばる物・季節の小物）を、ここで描く。季節と行事の飾りは decor.js が、画面の上と下の角に重ねる。
// どの季節も明るい色だけで描く（暗い画面を出さない：RS01-S06）。
import { C, cloud, mapleLeaf, ginkgoLeaf, acorn, persimmon, dragonfly, autumnLeaf, sakuraPetal, snowflake, nextId } from './art.js';

const f = (n) => Math.round(n * 100) / 100;
const W = 390;
const H = 844;

// ---- 季節の色 ----
export const PALETTES = {
  haru: {
    sky: ['#fde6ec', '#fdf0f2', '#fff8f2'], tree: ['#f9c6d3', '#fbd9e2', '#f5b8cd'], trunk: '#b9784e',
    hillA: '#e8efc4', hillB: '#dbe7b2', field: '#e6eec0', fieldB: '#d9e6ae', grass: '#e3ecbc', bush: ['#b9d48a', '#a9c87a', '#c6dd9a'],
  },
  natsu: {
    sky: ['#d3edf6', '#e4f4f8', '#f6fbf4'], tree: ['#9fcb72', '#b5d98a', '#8cbf63'], trunk: '#a77048',
    hillA: '#dcecb4', hillB: '#cde2a0', field: '#d8eab0', fieldB: '#c9df9b', grass: '#d4e8a8', bush: ['#93c06a', '#86b25e', '#a5cf7a'],
  },
  aki: {
    sky: [C.skyTop, C.sky, C.cream], tree: [C.momiji, C.icho, C.kaki], trunk: C.chestnut,
    hillA: '#f6d9a8', hillB: '#f2c98e', field: '#eadfb0', fieldB: '#e2d39c', grass: '#e7e5b4', bush: ['#b9cc85', '#a9c17a', '#c3d494'],
  },
  fuyu: {
    sky: ['#e2edf5', '#edf4f8', '#f8fbfc'], tree: ['#f6f9fb', '#eef4f8', '#f9fbfd'], trunk: '#b9a08a', snowy: true,
    hillA: '#f2f6f9', hillB: '#e5edf3', field: '#eef3f7', fieldB: '#e3ebf1', grass: '#edf2f6', bush: ['#e9f0f5', '#dfe8ef', '#f1f5f8'],
  },
};

// 丸い木（冬は雪をかぶった白い木。ふちを付けて背景から見分ける）
function treeRound(x, y, r, color, P) {
  const edge = P.snowy ? ' stroke="#c9d9e4" stroke-width="2"' : '';
  let s = `<g><rect x="${f(x - r * 0.12)}" y="${f(y)}" width="${f(r * 0.24)}" height="${f(r * 1.0)}" rx="${f(r * 0.1)}" fill="${P.trunk}"/>`
    + `<circle cx="${f(x - r * 0.62)}" cy="${f(y + r * 0.28)}" r="${f(r * 0.66)}" fill="${color}"${edge}/>`
    + `<circle cx="${f(x + r * 0.62)}" cy="${f(y + r * 0.28)}" r="${f(r * 0.66)}" fill="${color}"${edge}/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}"${edge}/>`
    + `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.3)}" fill="#ffffff" opacity="0.18"/>`;
  if (P === PALETTES.haru) {
    // さくらの花の点
    for (let k = 0; k < 5; k++) s += `<circle cx="${f(x + Math.cos(k * 1.3) * r * 0.6)}" cy="${f(y + Math.sin(k * 1.3) * r * 0.5)}" r="${f(r * 0.09)}" fill="#ffffff" opacity="0.8"/>`;
  }
  return s + '</g>';
}

// 地面に散らばる物（季節ごと）
function groundPiece(season, i, size) {
  switch (season) {
    case 'haru': return sakuraPetal(size * 0.8, i);
    case 'natsu': {
      // 白と黄色の小さな花・クローバー
      const s = (v) => f(v * size);
      if (i % 3 === 2) return `<g fill="#9fcb72"><circle cx="${s(-0.2)}" cy="0" r="${s(0.22)}"/><circle cx="${s(0.2)}" cy="0" r="${s(0.22)}"/><circle cx="0" cy="${s(-0.22)}" r="${s(0.22)}"/></g>`;
      return `<g>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${s(Math.cos((a * Math.PI) / 180) * 0.24)}" cy="${s(Math.sin((a * Math.PI) / 180) * 0.24)}" r="${s(0.18)}" fill="#ffffff"/>`).join('')}<circle r="${s(0.14)}" fill="${C.icho}"/></g>`;
    }
    case 'fuyu': {
      const s = (v) => f(v * size);
      if (i % 3 === 0) return snowflake(size * 0.7);
      return `<ellipse cx="0" cy="0" rx="${s(0.6)}" ry="${s(0.22)}" fill="#ffffff" stroke="#d3e1ea" stroke-width="${s(0.05)}"/>`;
    }
    default: return autumnLeaf(i, size);
  }
}

function scatter(season, seed, count, area, sizeMin, sizeMax, opacity = 0.95) {
  // 決まった並びの散らし方（毎回同じ絵になるよう、簡単な疑似乱数を使う）
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = area.x + rnd() * area.w;
    const y = area.y + rnd() * area.h;
    const size = sizeMin + rnd() * (sizeMax - sizeMin);
    const rot = season === 'fuyu' ? 0 : rnd() * 360;
    out += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" opacity="${opacity}">${groundPiece(season, i, size)}</g>`;
  }
  return out;
}

// 季節の くだもの（机や床の小物）：春 いちご・夏 すいか・秋 かき・冬 みかん
function fruit(season, size = 16) {
  const s = (v) => f(v * size);
  switch (season) {
    case 'haru':
      return `<g><path d="M0,${s(0.8)} C${s(-0.8)},${s(0.3)} ${s(-0.7)},${s(-0.5)} 0,${s(-0.45)} C${s(0.7)},${s(-0.5)} ${s(0.8)},${s(0.3)} 0,${s(0.8)} Z" fill="#f08a8a" stroke="#d96c6c" stroke-width="${s(0.06)}"/>`
        + [[-0.25, 0], [0.2, -0.1], [0, 0.35], [-0.2, 0.4], [0.25, 0.3]].map(([x, y]) => `<circle cx="${s(x)}" cy="${s(y)}" r="${s(0.05)}" fill="#fff4c8"/>`).join('')
        + `<path d="M${s(-0.4)},${s(-0.5)} L0,${s(-0.3)} L${s(0.4)},${s(-0.5)} L${s(0.15)},${s(-0.7)} L0,${s(-0.5)} L${s(-0.15)},${s(-0.7)} Z" fill="${C.oliveDeep}"/></g>`;
    case 'natsu':
      return `<g><path d="M${s(-0.9)},0 A${s(0.9)},${s(0.9)} 0 0 0 ${s(0.9)},0 Z" fill="#9fcb72"/><path d="M${s(-0.78)},0 A${s(0.78)},${s(0.78)} 0 0 0 ${s(0.78)},0 Z" fill="#fff6e4"/><path d="M${s(-0.7)},0 A${s(0.7)},${s(0.7)} 0 0 0 ${s(0.7)},0 Z" fill="#f4908a"/>`
        + [[-0.35, 0.2], [0, 0.35], [0.35, 0.2]].map(([x, y]) => `<ellipse cx="${s(x)}" cy="${s(y)}" rx="${s(0.05)}" ry="${s(0.08)}" fill="#5a3e2e"/>`).join('') + '</g>';
    case 'fuyu':
      return `<g><circle r="${s(0.78)}" fill="#f6a24a" stroke="#e08a30" stroke-width="${s(0.06)}"/><ellipse cx="${s(-0.28)}" cy="${s(-0.22)}" rx="${s(0.18)}" ry="${s(0.12)}" fill="#ffd2a3" opacity="0.8"/><path d="M0,${s(-0.74)} l${s(0.25)},${s(-0.18)}" stroke="${C.oliveDeep}" stroke-width="${s(0.14)}" stroke-linecap="round"/></g>`;
    default:
      return persimmon(size);
  }
}

// 窓から見える季節の枝（窓の わくの中に描く）
function windowView(x, y, w, h, season) {
  const bx = x + w * 0.1;
  const by = y + h * 0.75;
  let s = `<path d="M${f(bx)},${f(by)} Q${f(x + w * 0.45)},${f(y + h * 0.55)} ${f(x + w * 0.9)},${f(y + h * 0.3)}" stroke="#a77048" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const dots = [[0.3, 0.62], [0.5, 0.5], [0.68, 0.42], [0.82, 0.33], [0.42, 0.6]];
  dots.forEach(([dx, dy], k) => {
    const px = x + w * dx;
    const py = y + h * dy;
    if (season === 'haru') s += `<g transform="translate(${f(px)} ${f(py - 6)})">${sakuraPetal(10, k)}</g>`;
    else if (season === 'natsu') s += `<ellipse cx="${f(px)}" cy="${f(py - 6)}" rx="8" ry="5" fill="#9fcb72" transform="rotate(${-20 + k * 15} ${f(px)} ${f(py - 6)})"/>`;
    else if (season === 'fuyu') s += `<ellipse cx="${f(px)}" cy="${f(py - 3)}" rx="7" ry="3" fill="#ffffff" stroke="#d3e1ea" stroke-width="1"/>${k % 2 ? `<circle cx="${f(px + 3)}" cy="${f(py + 3)}" r="3" fill="#e8664a"/>` : ''}`;
    else s += `<g transform="translate(${f(px)} ${f(py - 6)}) rotate(${k * 40})">${mapleLeaf(k % 2 ? C.momiji : C.kaki, k % 2 ? C.momijiDeep : C.kakiDeep, 9)}</g>`;
  });
  return s;
}

// 雪だるま（冬の小物）
function snowman(x, y, r = 16) {
  return `<g><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#ffffff" stroke="#c9d9e4" stroke-width="2"/>`
    + `<circle cx="${f(x)}" cy="${f(y - r * 1.4)}" r="${f(r * 0.68)}" fill="#ffffff" stroke="#c9d9e4" stroke-width="2"/>`
    + `<circle cx="${f(x - r * 0.24)}" cy="${f(y - r * 1.5)}" r="${f(r * 0.08)}" fill="${C.ink}"/><circle cx="${f(x + r * 0.24)}" cy="${f(y - r * 1.5)}" r="${f(r * 0.08)}" fill="${C.ink}"/>`
    + `<path d="M${f(x)},${f(y - r * 1.36)} l${f(r * 0.4)},${f(r * 0.08)} l${f(-r * 0.4)},${f(r * 0.08)} Z" fill="${C.kaki}"/>`
    + `<path d="M${f(x - r * 0.6)},${f(y - r * 0.9)} q${f(r * 0.6)},${f(r * 0.3)} ${f(r * 1.2)},0" stroke="${C.momiji}" stroke-width="${f(r * 0.22)}" fill="none" stroke-linecap="round"/></g>`;
}

// 季節の花（野原・川原の小さな花）
function smallFlower(season, x, y, r, k) {
  if (season === 'haru') {
    const col = k % 2 ? '#f6d55e' : '#ffffff';
    return `<path d="M${f(x)},${f(y + r)} q${f(r * 0.4)},${f(r * 3)} ${f(-r * 0.2)},${f(r * 6)}" stroke="${C.oliveDeep}" stroke-width="1.6" fill="none" opacity="0.6"/>`
      + [0, 72, 144, 216, 288].map((a) => `<circle cx="${f(x + Math.cos((a * Math.PI) / 180) * r * 0.7)}" cy="${f(y + Math.sin((a * Math.PI) / 180) * r * 0.7)}" r="${f(r * 0.55)}" fill="${col}" stroke="#e6d58a" stroke-width="0.8"/>`).join('')
      + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.4)}" fill="${C.icho}"/>`;
  }
  if (season === 'natsu') {
    return `<path d="M${f(x)},${f(y + r)} v${f(r * 6)}" stroke="${C.oliveDeep}" stroke-width="2" opacity="0.7"/>`
      + Array.from({ length: 10 }, (_, a) => `<ellipse cx="${f(x + Math.cos((a * 36 * Math.PI) / 180) * r)}" cy="${f(y + Math.sin((a * 36 * Math.PI) / 180) * r)}" rx="${f(r * 0.5)}" ry="${f(r * 0.24)}" fill="#f6c84a" transform="rotate(${a * 36} ${f(x + Math.cos((a * 36 * Math.PI) / 180) * r)} ${f(y + Math.sin((a * 36 * Math.PI) / 180) * r)})"/>`).join('')
      + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.6)}" fill="#a7744a"/>`;
  }
  if (season === 'fuyu') {
    // つばき（雪の中の赤い花）
    return `<ellipse cx="${f(x)}" cy="${f(y + r * 0.9)}" rx="${f(r * 1.6)}" ry="${f(r * 0.5)}" fill="#ffffff" stroke="#d3e1ea" stroke-width="1"/>`
      + `<ellipse cx="${f(x - r * 0.8)}" cy="${f(y + r * 0.2)}" rx="${f(r * 0.7)}" ry="${f(r * 0.35)}" fill="#86a256"/>`
      + [0, 72, 144, 216, 288].map((a) => `<circle cx="${f(x + Math.cos((a * Math.PI) / 180) * r * 0.5)}" cy="${f(y + Math.sin((a * Math.PI) / 180) * r * 0.5)}" r="${f(r * 0.5)}" fill="#ec7a7a"/>`).join('')
      + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.3)}" fill="${C.icho}"/>`;
  }
  const col = ['#f9c6d3', '#fde3ea', '#f5b8cd', '#ffffff'][k % 4];
  return `<path d="M${f(x)},${f(y + r)} q${f(r * 0.4)},${f(r * 3)} ${f(-r * 0.2)},${f(r * 6)}" stroke="${C.oliveDeep}" stroke-width="1.6" fill="none" opacity="0.6"/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}" stroke="#e9a1b8" stroke-width="1"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.32)}" fill="${C.icho}"/>`;
}

// 木の床（いた）
function planks(y0, n, h, alt = ['#f6dcb4', '#f3d5a8'], line = '#e2bd87') {
  let s = '';
  for (let i = 0; i < n; i++) s += `<rect x="0" y="${y0 + i * h}" width="${W}" height="${h}" fill="${alt[i % 2]}"/><path d="M0,${y0 + i * h} H${W}" stroke="${line}" stroke-width="2"/>`;
  return s;
}

// 背景をひとつ描く。kind は 'home'・ゲームの id・'settings'。lk は look（季節と行事）
export function sceneSVG(kind, lk = { season: 'aki', event: '' }) {
  const season = PALETTES[lk.season] ? lk.season : 'aki';
  const P = PALETTES[season];
  const T = P.tree;
  const id = nextId('sc');
  const sky = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="0.6" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#${id}g)"/>`;
  const tr = (x, y, r, c) => treeRound(x, y, r, c, P);
  const sc = (seed, count, area, a, b, op) => scatter(season, seed, count, area, a, b, op);
  const winter = season === 'fuyu';
  let body = '';
  if (kind === 'home') {
    body = `<g transform="translate(70 150)">${cloud(90)}</g><g transform="translate(320 100)">${cloud(70)}</g>`
      + `<path d="M0,690 Q100,640 200,670 T390,650 V844 H0 Z" fill="${P.hillA}"/>`
      + `<path d="M0,740 Q120,700 240,730 T390,720 V844 H0 Z" fill="${P.hillB}"/>`
      + tr(36, 660, 34, T[0]) + tr(354, 640, 38, T[1]) + tr(300, 690, 26, T[2]) + tr(90, 700, 24, T[1])
      + (winter ? snowman(196, 730, 15) : '')
      + sc(7, 10, { x: 10, y: 770, w: 370, h: 60 }, 9, 14);
  } else if (kind === 'roulette') {
    body = `<g transform="translate(60 110)">${cloud(80)}</g><g transform="translate(330 170)">${cloud(64)}</g>`
      + `<path d="M0,560 Q90,520 190,548 T390,530 V844 H0 Z" fill="${P.hillA}"/>`
      + tr(30, 540, 30, T[1]) + tr(366, 520, 34, T[0]) + tr(320, 556, 22, T[2]) + tr(70, 566, 20, T[0])
      + `<path d="M0,640 Q130,600 260,630 T390,620 V844 H0 Z" fill="${P.hillB}"/>`
      + (winter ? snowman(350, 640, 13) : '')
      + sc(11, 14, { x: 6, y: 660, w: 378, h: 170 }, 8, 13);
  } else if (kind === 'stamp') {
    // 明るい木の机。季節の小物（くだもの・木の実・葉っぱ）
    let pl = '';
    for (let i = 0; i < 6; i++) {
      const y = i * 150;
      pl += `<rect x="0" y="${y}" width="${W}" height="150" fill="${i % 2 ? '#f6dcb4' : '#f3d5a8'}"/>`
        + `<path d="M20,${y + 40} q80,-10 160,4 t180,-2 M40,${y + 100} q90,8 170,-4 t150,6" stroke="#e8c48f" stroke-width="2" fill="none" opacity="0.7"/>`
        + `<path d="M0,${y + 150} H${W}" stroke="#e2bd87" stroke-width="2"/>`;
    }
    body = pl
      + `<g transform="translate(36 120) rotate(-20)">${season === 'aki' ? acorn(16) : fruit(season, 15)}</g><g transform="translate(358 760) rotate(15)">${fruit(season, 16)}</g>`
      + `<g transform="translate(336 130) rotate(30)">${groundPiece(season, 0, 22)}</g>`
      + `<g transform="translate(40 780) rotate(-30)">${season === 'aki' ? ginkgoLeaf(C.icho, C.ichoDeep, 22) : groundPiece(season, 1, 22)}</g>`
      + `<g transform="translate(70 800) rotate(40)">${groundPiece(season, 2, 16)}</g>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  } else if (kind === 'nobi') {
    // 縁側：季節の枝（春 さくら・夏 青葉・秋 かき・冬 雪と南天）と、季節の草花
    let branch = '';
    [[300, 92], [350, 140], [262, 150], [330, 196]].forEach(([x, y], i) => {
      if (season === 'aki') {
        branch += `<path d="M${x},${y - 16} L${x - 6},${y - 34}" stroke="#8a5a36" stroke-width="3" stroke-linecap="round"/><g transform="translate(${x} ${y})">${persimmon(i % 2 ? 15 : 17)}</g>`;
      } else if (season === 'haru') {
        branch += `<g transform="translate(${x} ${y - 20})">${sakuraPetal(14, i)}</g><g transform="translate(${x + 12} ${y - 8}) rotate(60)">${sakuraPetal(12, i + 1)}</g>`;
      } else if (season === 'natsu') {
        branch += `<ellipse cx="${x}" cy="${y - 20}" rx="14" ry="8" fill="#9fcb72" transform="rotate(${-30 + i * 20} ${x} ${y - 20})"/>`;
      } else {
        branch += `<ellipse cx="${x}" cy="${y - 26}" rx="12" ry="5" fill="#ffffff" stroke="#d3e1ea" stroke-width="1.5"/><circle cx="${x - 4}" cy="${y - 16}" r="4" fill="#e8664a"/><circle cx="${x + 3}" cy="${y - 14}" r="4" fill="#e8664a"/>`;
      }
    });
    if (season === 'natsu') {
      // 風鈴
      branch += `<path d="M250,0 V112" stroke="#c99a62" stroke-width="1.5"/><path d="M236,128 Q236,112 250,112 Q264,112 264,128 Z" fill="#cfe8f2" stroke="#9fc8cf" stroke-width="2"/><path d="M250,128 v18" stroke="#c99a62" stroke-width="1.2"/><rect x="244" y="146" width="12" height="20" rx="2" fill="#fde3d6" stroke="#e7b98a" stroke-width="1"/>`;
    }
    let plants = '';
    [[24, 0], [46, 12], [64, -6], [350, 6], [372, -10]].forEach(([x, d], k) => {
      if (season === 'aki') {
        plants += `<path d="M${x},800 Q${x + d},700 ${x + 22 + d},640" stroke="#c9a670" stroke-width="3" fill="none" stroke-linecap="round"/>`
          + `<path d="M${x + 22 + d},640 q-4,24 -10,44 M${x + 22 + d},640 q8,20 6,40 M${x + 18 + d},652 q-14,18 -18,32" stroke="#e9d3a8" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      } else if (winter) {
        plants += `<ellipse cx="${x + 10}" cy="${716 + (k % 2) * 4}" rx="22" ry="9" fill="#ffffff" stroke="#d3e1ea" stroke-width="1.5"/>`;
      } else {
        plants += smallFlower(season, x + 14, 660 + (k % 3) * 10, 8, k);
      }
    });
    body = `<g transform="translate(80 140)">${cloud(80)}</g>`
      + `<path d="M390,60 Q300,70 230,120" stroke="#8a5a36" stroke-width="9" fill="none" stroke-linecap="round"/>`
      + `<path d="M330,66 Q340,120 352,128" stroke="#8a5a36" stroke-width="5" fill="none" stroke-linecap="round"/>`
      + (winter ? `<path d="M388,56 Q300,64 232,114" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.95"/>` : '')
      + branch
      + (season === 'aki' ? `<g transform="translate(300 300) rotate(-12)">${dragonfly(18)}</g><g transform="translate(250 420) rotate(16)">${dragonfly(14)}</g>` : '')
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/>`
      + `<path d="M0,760 H${W} M0,800 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + plants;
  } else if (kind === 'hana') {
    // 野原：遠くの丘と、季節の小さな花（春 菜の花・夏 ひまわり・秋 コスモス・冬 雪と つばき）
    let field = '';
    let sd = 5;
    const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < (winter ? 10 : 26); i++) {
      const x = rnd() * W;
      const y = 650 + rnd() * 180;
      const r = 4 + rnd() * 4;
      field += smallFlower(season, x, y, season === 'natsu' ? r * 1.2 : r, i);
    }
    body = `<g transform="translate(70 120)">${cloud(80)}</g><g transform="translate(320 190)">${cloud(60)}</g>`
      + `<path d="M0,600 Q110,560 220,590 T390,570 V844 H0 Z" fill="${P.field}"/>`
      + `<path d="M0,660 Q140,620 270,650 T390,640 V844 H0 Z" fill="${P.fieldB}"/>`
      + tr(354, 570, 30, T[0]) + tr(28, 590, 24, T[1])
      + field
      + (season === 'aki' ? `<g transform="translate(300 300) rotate(-12)">${dragonfly(16)}</g>` : '')
      + (winter ? snowman(300, 720, 14) : '');
  } else if (kind === 'kuji' || kind === 'mato') {
    // 縁日：kuji は上に ちょうちんの列、mato は しま模様の ひさし。下に木の床
    let top = '';
    if (kind === 'kuji') {
      top = `<path d="M-10,96 Q195,150 400,96" stroke="#9b5f3a" stroke-width="2.5" fill="none"/>`;
      for (let i = 0; i < 7; i++) {
        const x = 20 + i * 58;
        const y = 96 + Math.sin((i / 6) * Math.PI) * 26;
        top += `<path d="M${x},${y} v10" stroke="#9b5f3a" stroke-width="2"/>`
          + `<rect x="${x - 7}" y="${y + 8}" width="14" height="5" rx="2" fill="#9b5f3a"/>`
          + `<ellipse cx="${x}" cy="${y + 30}" rx="16" ry="20" fill="#fff6e4" stroke="#e7b98a" stroke-width="2"/>`
          + `<path d="M${x - 15},${y + 24} h30 M${x - 15},${y + 36} h30" stroke="${C.momiji}" stroke-width="3" opacity="0.8"/>`
          + `<rect x="${x - 7}" y="${y + 48}" width="14" height="5" rx="2" fill="#9b5f3a"/>`
          + (winter ? `<ellipse cx="${x}" cy="${y + 11}" rx="11" ry="4" fill="#ffffff" stroke="#d3e1ea" stroke-width="1"/>` : '');
      }
    } else {
      for (let i = 0; i < 9; i++) top += `<path d="M${i * 46 - 10},0 h46 v44 q-23,14 -46,0 Z" fill="${i % 2 ? '#fff6e4' : '#f7c4b4'}"/>`;
      top += `<path d="M0,1 H${W}" stroke="#e2bd87" stroke-width="3"/>`;
      if (winter) top += `<path d="M-10,0 H400 V10 Q195,20 -10,10 Z" fill="#ffffff" opacity="0.95"/>`;
    }
    body = top + planks(640, 4, 52, ['#f6dcb4', '#f3d5a8'])
      + `<g transform="translate(${kind === 'kuji' ? 40 : 46} ${kind === 'kuji' ? 760 : 770}) rotate(-24)">${groundPiece(season, 0, 16)}</g>`
      + `<g transform="translate(${kind === 'kuji' ? 350 : 344} ${kind === 'kuji' ? 790 : 800}) rotate(30)">${groundPiece(season, 1, 18)}</g>`;
  } else if (kind === 'amida') {
    // 庭の小道：芝と、散らばる物
    body = `<g transform="translate(300 120)">${cloud(80)}</g>`
      + `<path d="M0,560 Q120,520 240,548 T390,536 V844 H0 Z" fill="${P.grass}"/>`
      + `<path d="M150,844 Q180,700 260,640 T390,600 V640 Q300,670 250,720 T230,844 Z" fill="${winter ? '#ffffff' : '#f4e2c0'}"/>`
      + tr(40, 520, 30, T[2]) + tr(360, 500, 26, T[0])
      + sc(17, 12, { x: 6, y: 640, w: 378, h: 190 }, 8, 13);
  } else if (kind === 'race') {
    // 運動会の原っぱ：上に小さな旗の列
    let bunting = `<path d="M-10,70 Q195,112 400,70" stroke="#9b5f3a" stroke-width="2" fill="none"/>`;
    for (let i = 0; i < 14; i++) {
      const x = 4 + i * 28.5;
      const y = 70 + Math.sin(((x + 10) / 410) * Math.PI) * 21;
      const col = [C.momiji, C.icho, C.olive, '#9fc5e8', C.rose][i % 5];
      bunting += `<path d="M${f(x - 8)},${f(y)} L${f(x + 8)},${f(y + 1)} L${f(x)},${f(y + 18)} Z" fill="${col}" opacity="0.9"/>`;
    }
    body = bunting + `<g transform="translate(300 150)">${cloud(70)}</g>`
      + `<path d="M0,600 Q110,560 220,590 T390,570 V844 H0 Z" fill="${P.field}"/>`
      + tr(30, 580, 28, T[2]) + tr(362, 560, 30, T[1])
      + `<path d="M0,670 Q140,630 270,660 T390,650 V844 H0 Z" fill="${P.fieldB}"/>`
      + sc(29, 12, { x: 6, y: 680, w: 378, h: 150 }, 8, 13);
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
    body = shoji + `<g transform="translate(330 150) rotate(20)">${groundPiece(season, 0, 16)}</g>` + tatami
      + `<g transform="translate(50 780) rotate(-20)">${groundPiece(season, 2, 15)}</g>`
      + `<g transform="translate(340 640)">${fruit(season, 14)}</g>`;
  } else if (kind === 'otoshi') {
    // 台所の窓辺：窓に季節の枝、カーテン、チェックの テーブルクロス、季節の くだもの
    let cloth = '';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
      if ((i + j) % 2) cloth += `<rect x="${i * 46}" y="${650 + j * 50}" width="46" height="50" fill="#f6c9b8" opacity="0.55"/>`;
    }
    body = `<rect x="70" y="60" width="250" height="150" rx="14" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>`
      + windowView(74, 64, 242, 142, season)
      + `<path d="M195,60 V210 M70,135 H320" stroke="#e6c99a" stroke-width="4"/>`
      + `<path d="M60,50 Q90,140 70,220 L40,220 L40,50 Z M330,50 Q300,140 320,220 L350,220 L350,50 Z" fill="#f7c4b4" opacity="0.8"/>`
      + `<rect x="0" y="640" width="${W}" height="210" fill="#fff4e6"/>` + cloth
      + `<g transform="translate(50 600) rotate(-15)">${fruit(season, 16)}</g><g transform="translate(340 610) rotate(10)">${fruit(season, 14)}</g>`;
  } else if (kind === 'maigo') {
    // 庭の小道：生け垣の丸い しげみ（冬は雪をかぶる）
    const bush = (x, y, r, col) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"${winter ? ' stroke="#c9d9e4" stroke-width="2"' : ''}/><circle cx="${x - r * 0.7}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${col}"/><circle cx="${x + r * 0.7}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${col}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#ffffff" opacity="0.18"/></g>`;
    body = `<g transform="translate(80 120)">${cloud(80)}</g>`
      + `<path d="M0,590 Q120,560 240,580 T390,570 V844 H0 Z" fill="${P.grass}"/>`
      + bush(30, 600, 30, P.bush[0]) + bush(360, 590, 34, P.bush[1]) + bush(300, 640, 22, P.bush[2])
      + tr(70, 560, 26, T[2])
      + `<path d="M150,844 Q170,740 230,700 T330,660" stroke="${winter ? '#ffffff' : '#f4e2c0'}" stroke-width="40" fill="none" stroke-linecap="round"/>`
      + sc(37, 10, { x: 6, y: 680, w: 378, h: 150 }, 8, 13);
  } else if (kind === 'tower') {
    // 引っこしの日の へや：窓（季節の枝）、かべに 時計、下に木の床
    body = `<rect x="230" y="70" width="120" height="110" rx="10" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>`
      + windowView(234, 74, 112, 102, season)
      + `<path d="M290,70 V180 M230,125 H350" stroke="#e6c99a" stroke-width="4"/>`
      + `<circle cx="70" cy="110" r="26" fill="#fffaf0" stroke="#e6c99a" stroke-width="4"/><path d="M70,110 V94 M70,110 L82,116" stroke="${C.chestnut}" stroke-width="3" stroke-linecap="round"/>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + `<g transform="translate(40 700) rotate(-12)">${groundPiece(season, 2, 14)}</g>`;
  } else if (kind === 'sagasu') {
    // 子ども部屋：水玉の かべ紙、丸い窓（季節の枝）、木の床と まるい ラグ
    let dots = '';
    for (let r = 0; r < 9; r++) for (let k = 0; k < 7; k++) dots += `<circle cx="${k * 60 + (r % 2 ? 30 : 0)}" cy="${30 + r * 70}" r="5" fill="#f6d2bf" opacity="0.55"/>`;
    body = dots
      + `<circle cx="300" cy="120" r="56" fill="#fffaf0" stroke="#e6c99a" stroke-width="6"/>`
      + `<g clip-path="circle(52px at 300px 120px)">${windowView(248, 68, 104, 104, season)}</g>`
      + `<path d="M300,64 V176 M244,120 H356" stroke="#e6c99a" stroke-width="4"/>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + `<ellipse cx="195" cy="800" rx="150" ry="26" fill="#f7c4b4" opacity="0.7"/><ellipse cx="195" cy="800" rx="118" ry="18" fill="none" stroke="#fffaf0" stroke-width="3" opacity="0.8"/>`
      + `<g transform="translate(46 700) rotate(-14)">${season === 'aki' ? acorn(15) : fruit(season, 13)}</g><g transform="translate(350 705) rotate(18)">${groundPiece(season, 0, 14)}</g>`;
  } else if (kind === 'saikoro') {
    // あそびべや：木の床に、星の もようの ラグと つみき
    let stars = '';
    [[60, 760], [140, 790], [250, 770], [330, 800], [200, 812]].forEach(([x, y], i) => { stars += `<path d="M${x},${y - 7} L${x + 2},${y - 2} L${x + 7},${y - 2} L${x + 3},${y + 1} L${x + 5},${y + 6} L${x},${y + 3} L${x - 5},${y + 6} L${x - 3},${y + 1} L${x - 7},${y - 2} L${x - 2},${y - 2} Z" fill="${[C.icho, '#fffaf0', C.rose][i % 3]}"/>`; });
    const block = (x, y, s, col, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="4" fill="${col}" stroke="#d9b98e" stroke-width="2"/></g>`;
    body = `<g transform="translate(80 130)">${cloud(70)}</g><g transform="translate(310 180)">${cloud(56)}</g>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/><path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/>`
      + `<ellipse cx="195" cy="790" rx="170" ry="34" fill="#cfe0ea" opacity="0.8"/>` + stars
      + block(34, 700, 26, '#f7c4b4', -8) + block(60, 706, 20, '#fde3a6', 10) + block(352, 702, 24, '#cfe3c0', 6)
      + `<g transform="translate(330 690)">${groundPiece(season, 1, 12)}</g>`;
  } else if (kind === 'negaeri') {
    // ひるねの へや：レースの カーテン、つりさげの かざり、木の床
    let mobile = `<path d="M195,0 V60 M150,60 H240" stroke="#c99a62" stroke-width="2"/>`;
    [[150, 80, C.icho], [195, 96, C.rose], [240, 80, '#cfe0ea']].forEach(([x, y, c]) => { mobile += `<path d="M${x},60 V${y - 10}" stroke="#c99a62" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="10" fill="${c}" stroke="#e6c99a" stroke-width="2"/>`; });
    body = `<path d="M0,0 Q40,140 10,300 L0,300 Z M390,0 Q350,140 380,300 L390,300 Z" fill="#fffaf0" opacity="0.9"/>`
      + `<path d="M0,0 Q40,140 10,300 M390,0 Q350,140 380,300" stroke="#f1d7c2" stroke-width="3" fill="none"/>` + mobile
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/><path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + `<g transform="translate(52 702) rotate(-12)">${groundPiece(season, 2, 14)}</g>`;
  } else if (kind === 'mekuri') {
    // つくえの ある へや：かべの けいじ板、窓（季節の枝）、つくえの はし
    body = `<rect x="40" y="80" width="150" height="110" rx="10" fill="#f3dcbb" stroke="#e6c99a" stroke-width="5"/>`
      + `<rect x="58" y="98" width="44" height="34" fill="#fffaf0" transform="rotate(-6 80 115)"/><rect x="116" y="104" width="52" height="40" fill="#fde3d6" transform="rotate(5 142 124)"/><circle cx="80" cy="100" r="4" fill="${C.momiji}"/><circle cx="142" cy="106" r="4" fill="${C.olive}"/>`
      + `<rect x="240" y="70" width="110" height="120" rx="10" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>`
      + windowView(244, 74, 102, 112, season)
      + `<path d="M295,70 V190 M240,130 H350" stroke="#e6c99a" stroke-width="4"/>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#e9c591"/><path d="M0,720 H${W}" stroke="#c99a62" stroke-width="5"/><path d="M0,744 H${W}" stroke="#ddb37c" stroke-width="2"/>`
      + `<g transform="translate(350 704) rotate(16)">${season === 'aki' ? ginkgoLeaf(C.icho, C.ichoDeep, 15) : fruit(season, 13)}</g>`;
  } else if (kind === 'wanage') {
    // 縁日：上に 小さな ちょうちんの列、まわりに 木、下に土の みち
    let lanterns = `<path d="M-10,70 Q195,104 400,70" stroke="#9b5f3a" stroke-width="2" fill="none"/>`;
    for (let i = 0; i < 9; i++) {
      const x = 10 + i * 46;
      const y = 70 + Math.sin(((x + 10) / 410) * Math.PI) * 17;
      lanterns += `<path d="M${x},${y} v6" stroke="#9b5f3a" stroke-width="1.6"/><ellipse cx="${x}" cy="${y + 16}" rx="10" ry="12" fill="#fff6e4" stroke="#e7b98a" stroke-width="1.6"/><path d="M${x - 9},${y + 13} h18" stroke="${C.momiji}" stroke-width="2" opacity="0.8"/>`;
    }
    body = lanterns + tr(30, 560, 30, T[0]) + tr(362, 548, 32, T[1])
      + `<rect x="0" y="700" width="${W}" height="144" fill="${winter ? '#f2f6f9' : '#efd9b4'}"/><path d="M0,700 H${W}" stroke="${winter ? '#d3e1ea' : '#e2c592'}" stroke-width="3"/>`
      + sc(41, 10, { x: 6, y: 720, w: 378, h: 110 }, 8, 12);
  } else if (kind === 'tsuri') {
    // 池の ほとり：遠くの丘、木、季節の草（秋 すすき・冬 雪の しげみ・春夏 花）
    let reeds = '';
    [[22, 0], [44, 10], [348, -6], [370, 8]].forEach(([x, dd], k) => {
      if (season === 'aki') {
        reeds += `<path d="M${x},844 Q${x + dd},740 ${x + 18 + dd},690" stroke="#c9a670" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${x + 18 + dd},690 q-4,22 -9,40 M${x + 18 + dd},690 q7,18 5,36" stroke="#e9d3a8" stroke-width="6" fill="none" stroke-linecap="round"/>`;
      } else if (winter) {
        reeds += `<ellipse cx="${x + 10}" cy="${780 + (k % 2) * 10}" rx="24" ry="10" fill="#ffffff" stroke="#d3e1ea" stroke-width="1.5"/>`;
      } else {
        reeds += smallFlower(season, x + 14, 700 + (k % 2) * 16, 8, k);
      }
    });
    body = `<g transform="translate(80 110)">${cloud(70)}</g><path d="M0,260 Q100,190 200,240 T390,220 V320 H0 Z" fill="${P.hillB}" opacity="0.8"/>`
      + `<rect x="0" y="300" width="${W}" height="544" fill="${P.grass}"/>` + tr(40, 280, 26, T[2]) + tr(350, 270, 30, T[0]) + reeds;
  } else if (kind === 'tobiishi') {
    // 川原：遠くの はし、くさ（秋は とんぼ）
    body = `<g transform="translate(70 110)">${cloud(70)}</g>`
      + `<path d="M210,250 Q290,200 370,250" stroke="#e3a074" stroke-width="8" fill="none"/><path d="M222,250 V262 M250,232 V262 M280,224 V262 M310,224 V262 M340,232 V262 M358,244 V262" stroke="#e3a074" stroke-width="3"/>`
      + (winter ? `<path d="M210,246 Q290,196 370,246" stroke="#ffffff" stroke-width="4" fill="none"/>` : '')
      + `<rect x="0" y="262" width="${W}" height="582" fill="${P.grass}"/>` + tr(40, 250, 24, T[1])
      + (season === 'aki' ? `<g transform="translate(320 330) rotate(-14)">${dragonfly(16)}</g><g transform="translate(60 380) rotate(10)">${dragonfly(12)}</g>` : sc(53, 6, { x: 20, y: 300, w: 350, h: 120 }, 8, 12));
  } else if (kind === 'hidamari') {
    // えんがわ：上に にわの木と そら、下に 木の いた
    let boards = '';
    for (let i = 0; i < 6; i++) boards += `<rect x="0" y="${560 + i * 48}" width="${W}" height="48" fill="${i % 2 ? '#f3d5a8' : '#f6dcb4'}"/><path d="M0,${560 + i * 48} H${W}" stroke="#e2bd87" stroke-width="2"/>`;
    body = `<g transform="translate(90 110)">${cloud(80)}</g><g transform="translate(300 160)">${cloud(60)}</g>`
      + `<circle cx="340" cy="70" r="26" fill="#ffe58a" opacity="0.9"/>`
      + `<path d="M0,420 Q100,380 200,410 T390,390 V560 H0 Z" fill="${P.hillB}"/>` + tr(50, 420, 32, T[2]) + tr(330, 410, 28, T[0]) + boards
      + `<path d="M0,556 H${W}" stroke="#c99a62" stroke-width="6"/>`;
  } else if (kind === 'settings') {
    body = sc(23, 8, { x: 0, y: 0, w: W, h: H }, 10, 16, 0.18);
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${sky}${body}</svg>`;
}
