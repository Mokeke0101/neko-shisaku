// 行事の飾り（RS01-S13）。季節の背景（scenes.js）の上に重ねる。
// 行事の飾りは、ゲームごとに描き分ける（依頼者が決めた）。ゲームの場面に合わせて、飾りの組み合わせ・置き場・形を変える。
// 置き場は、ゲームの絵や文字に かからない所（上の左右・下の左右・場面の床や机）にする。
// 絵文字は使わず、図形で描く。暗い色の大きな面は作らない（RS01-S06）。
import { C, starShape, heartShape, snowflake, mapleLeaf, ginkgoLeaf, acorn, persimmon } from './art.js';
import { pawPrint } from './cats.js';

const f = (n) => Math.round(n * 100) / 100;

// ---- 飾りの絵（中心 0,0、大きさ s は おおよその半径） ----
const M = {
  // クリスマス
  tree: (s) => `<g><rect x="${f(-s * 0.1)}" y="${f(s * 0.7)}" width="${f(s * 0.2)}" height="${f(s * 0.3)}" fill="#b9784e"/>`
    + [0, 1, 2].map((k) => `<path d="M0,${f(-s + k * s * 0.5)} L${f(s * (0.45 + k * 0.17))},${f(-s * 0.35 + k * s * 0.5)} L${f(-s * (0.45 + k * 0.17))},${f(-s * 0.35 + k * s * 0.5)} Z" fill="${['#9fcb72', '#8fbf6a', '#86b25e'][k]}" stroke="#6f9a4f" stroke-width="${f(s * 0.04)}" stroke-linejoin="round"/>`).join('')
    + [[-0.2, -0.3, C.momiji], [0.25, 0.05, C.icho], [-0.3, 0.45, '#9fc5e8'], [0.3, 0.55, C.rose], [0.05, 0.25, '#ffffff']].map(([x, y, c]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.08)}" fill="${c}"/>`).join('')
    + `<g transform="translate(0 ${f(-s * 1.02)})">${starShape(s * 0.42)}</g></g>`,
  wreath: (s) => {
    let g = '';
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      g += `<ellipse cx="${f(Math.cos(a) * s * 0.72)}" cy="${f(Math.sin(a) * s * 0.72)}" rx="${f(s * 0.3)}" ry="${f(s * 0.17)}" fill="${k % 2 ? '#9fcb72' : '#86b25e'}" transform="rotate(${f((a * 180) / Math.PI + 90)} ${f(Math.cos(a) * s * 0.72)} ${f(Math.sin(a) * s * 0.72)})"/>`;
    }
    return `<g>${g}${[0.4, 2.1, 3.9, 5.2].map((a) => `<circle cx="${f(Math.cos(a) * s * 0.72)}" cy="${f(Math.sin(a) * s * 0.72)}" r="${f(s * 0.1)}" fill="${C.momiji}"/>`).join('')}`
      + `<path d="M0,${f(s * 0.72)} l${f(-s * 0.35)},${f(s * 0.25)} l${f(s * 0.1)},${f(-s * 0.3)} Z M0,${f(s * 0.72)} l${f(s * 0.35)},${f(s * 0.25)} l${f(-s * 0.1)},${f(-s * 0.3)} Z" fill="${C.momiji}"/><circle cx="0" cy="${f(s * 0.72)}" r="${f(s * 0.12)}" fill="${C.momijiDeep}"/></g>`;
  },
  ornament: (s, v = 0) => {
    const c = [C.momiji, '#9fc5e8', C.icho, C.rose][v % 4];
    return `<g><path d="M0,${f(-s * 1.6)} V${f(-s * 0.95)}" stroke="#c99a62" stroke-width="${f(s * 0.08)}"/><rect x="${f(-s * 0.22)}" y="${f(-s * 1.05)}" width="${f(s * 0.44)}" height="${f(s * 0.2)}" rx="${f(s * 0.06)}" fill="${C.icho}"/>`
      + `<circle r="${f(s * 0.85)}" fill="${c}" stroke="#ffffff" stroke-width="${f(s * 0.06)}" opacity="0.95"/><ellipse cx="${f(-s * 0.3)}" cy="${f(-s * 0.3)}" rx="${f(s * 0.22)}" ry="${f(s * 0.14)}" fill="#ffffff" opacity="0.6"/>`
      + `<path d="M${f(-s * 0.8)},${f(s * 0.1)} q${f(s * 0.8)},${f(s * 0.3)} ${f(s * 1.6)},0" stroke="#ffffff" stroke-width="${f(s * 0.08)}" fill="none" opacity="0.7"/></g>`;
  },
  present: (s, v = 0) => {
    const box = [['#f7c4b4', C.momiji], ['#cfe0ea', '#6f9fcb'], ['#fde3a6', C.olive], ['#fbd9e2', '#e3a3b8']][v % 4];
    return `<g><rect x="${f(-s)}" y="${f(-s * 0.7)}" width="${f(s * 2)}" height="${f(s * 1.5)}" rx="${f(s * 0.12)}" fill="${box[0]}" stroke="${box[1]}" stroke-width="${f(s * 0.08)}"/>`
      + `<rect x="${f(-s * 0.16)}" y="${f(-s * 0.7)}" width="${f(s * 0.32)}" height="${f(s * 1.5)}" fill="${box[1]}" opacity="0.85"/>`
      + `<path d="M0,${f(-s * 0.7)} q${f(-s * 0.6)},${f(-s * 0.6)} ${f(-s * 0.5)},0 Z M0,${f(-s * 0.7)} q${f(s * 0.6)},${f(-s * 0.6)} ${f(s * 0.5)},0 Z" fill="${box[1]}"/></g>`;
  },
  cane: (s) => `<g><path d="M${f(s * 0.3)},${f(s)} V${f(-s * 0.4)} Q${f(s * 0.3)},${f(-s)} ${f(-s * 0.2)},${f(-s)} Q${f(-s * 0.6)},${f(-s)} ${f(-s * 0.6)},${f(-s * 0.55)}" stroke="#ffffff" stroke-width="${f(s * 0.3)}" fill="none" stroke-linecap="round"/>`
    + `<path d="M${f(s * 0.3)},${f(s)} V${f(-s * 0.4)} Q${f(s * 0.3)},${f(-s)} ${f(-s * 0.2)},${f(-s)} Q${f(-s * 0.6)},${f(-s)} ${f(-s * 0.6)},${f(-s * 0.55)}" stroke="${C.momiji}" stroke-width="${f(s * 0.3)}" fill="none" stroke-linecap="round" stroke-dasharray="${f(s * 0.22)} ${f(s * 0.22)}"/></g>`,
  stocking: (s) => `<g><path d="M${f(-s * 0.4)},${f(-s)} H${f(s * 0.35)} V${f(s * 0.25)} Q${f(s * 0.35)},${f(s * 0.9)} ${f(-s * 0.3)},${f(s * 0.9)} H${f(-s * 0.7)} Q${f(-s * 1.05)},${f(s * 0.9)} ${f(-s * 0.95)},${f(s * 0.45)} Q${f(-s * 0.85)},${f(s * 0.2)} ${f(-s * 0.4)},${f(s * 0.15)} Z" fill="${C.momiji}" stroke="${C.momijiDeep}" stroke-width="${f(s * 0.06)}"/>`
    + `<rect x="${f(-s * 0.5)}" y="${f(-s * 1.1)}" width="${f(s * 0.95)}" height="${f(s * 0.35)}" rx="${f(s * 0.1)}" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.04)}"/></g>`,
  holly: (s) => `<g><ellipse cx="${f(-s * 0.45)}" cy="0" rx="${f(s * 0.55)}" ry="${f(s * 0.25)}" fill="#86b25e" transform="rotate(-20 ${f(-s * 0.45)} 0)"/><ellipse cx="${f(s * 0.45)}" cy="0" rx="${f(s * 0.55)}" ry="${f(s * 0.25)}" fill="#9fcb72" transform="rotate(20 ${f(s * 0.45)} 0)"/>`
    + `<circle cx="${f(-s * 0.12)}" cy="${f(-s * 0.12)}" r="${f(s * 0.16)}" fill="${C.momiji}"/><circle cx="${f(s * 0.12)}" cy="${f(-s * 0.18)}" r="${f(s * 0.16)}" fill="${C.momiji}"/><circle cx="0" cy="${f(s * 0.08)}" r="${f(s * 0.16)}" fill="${C.momijiDeep}"/></g>`,
  bell: (s, v = 0) => `<g><path d="M${f(-s * 0.7)},${f(s * 0.5)} Q${f(-s * 0.7)},${f(-s * 0.8)} 0,${f(-s * 0.8)} Q${f(s * 0.7)},${f(-s * 0.8)} ${f(s * 0.7)},${f(s * 0.5)} Z" fill="${v ? '#f6d55e' : C.icho}" stroke="${C.ichoDeep}" stroke-width="${f(s * 0.07)}"/>`
    + `<circle cx="0" cy="${f(s * 0.62)}" r="${f(s * 0.16)}" fill="${C.ichoDeep}"/>${M.holly(s * 0.5).replace('<g>', `<g transform="translate(0 ${f(-s * 0.85)})">`)}</g>`,
  // 大みそか
  soba: (s) => `<g><ellipse cx="0" cy="${f(-s * 0.1)}" rx="${f(s)}" ry="${f(s * 0.3)}" fill="#f6e7c8" stroke="#c99a62" stroke-width="${f(s * 0.06)}"/>`
    + `<path d="M${f(-s)},${f(-s * 0.1)} Q${f(-s * 0.9)},${f(s * 0.8)} 0,${f(s * 0.8)} Q${f(s * 0.9)},${f(s * 0.8)} ${f(s)},${f(-s * 0.1)} Z" fill="#f7c4b4" stroke="#e39a86" stroke-width="${f(s * 0.06)}"/>`
    + `<path d="M${f(-s * 0.7)},${f(-s * 0.15)} q${f(s * 0.3)},${f(-s * 0.1)} ${f(s * 0.6)},0 t${f(s * 0.6)},0" stroke="#c9a670" stroke-width="${f(s * 0.08)}" fill="none"/>`
    + `<ellipse cx="${f(s * 0.3)}" cy="${f(-s * 0.18)}" rx="${f(s * 0.22)}" ry="${f(s * 0.08)}" fill="#f6c84a"/>`
    + `<path d="M${f(-s * 0.2)},${f(-s * 0.5)} L${f(s * 0.9)},${f(-s * 1.2)} M${f(0)},${f(-s * 0.45)} L${f(s * 1.05)},${f(-s * 1.1)}" stroke="#c99a62" stroke-width="${f(s * 0.07)}" stroke-linecap="round"/>`
    + `<path d="M${f(-s * 0.4)},${f(-s * 0.6)} q${f(-s * 0.1)},${f(-s * 0.3)} 0,${f(-s * 0.5)} M${f(-s * 0.15)},${f(-s * 0.6)} q${f(-s * 0.1)},${f(-s * 0.3)} 0,${f(-s * 0.5)}" stroke="#d3e1ea" stroke-width="${f(s * 0.06)}" fill="none" stroke-linecap="round"/></g>`,
  temple: (s) => `<g><path d="M${f(-s * 0.9)},${f(-s)} H${f(s * 0.9)}" stroke="#b9784e" stroke-width="${f(s * 0.14)}" stroke-linecap="round"/><path d="M0,${f(-s)} V${f(-s * 0.75)}" stroke="#c99a62" stroke-width="${f(s * 0.08)}"/>`
    + `<path d="M${f(-s * 0.5)},${f(s * 0.6)} Q${f(-s * 0.55)},${f(-s * 0.75)} 0,${f(-s * 0.75)} Q${f(s * 0.55)},${f(-s * 0.75)} ${f(s * 0.5)},${f(s * 0.6)} Z" fill="#d9c3a1" stroke="#a7744a" stroke-width="${f(s * 0.06)}"/>`
    + `<path d="M${f(-s * 0.45)},0 H${f(s * 0.45)} M${f(-s * 0.48)},${f(s * 0.3)} H${f(s * 0.48)}" stroke="#a7744a" stroke-width="${f(s * 0.05)}"/>`
    + `<path d="M${f(s * 0.75)},${f(-s * 0.2)} q${f(s * 0.2)},${f(s * 0.2)} 0,${f(s * 0.4)} M${f(s * 0.95)},${f(-s * 0.35)} q${f(s * 0.3)},${f(s * 0.35)} 0,${f(s * 0.7)}" stroke="#c99a62" stroke-width="${f(s * 0.06)}" fill="none" stroke-linecap="round"/></g>`,
  broom: (s) => `<g transform="rotate(-20)"><path d="M0,${f(-s)} V${f(s * 0.2)}" stroke="#c99a62" stroke-width="${f(s * 0.1)}" stroke-linecap="round"/><path d="M${f(-s * 0.35)},${f(s * 0.95)} L${f(-s * 0.15)},${f(s * 0.2)} H${f(s * 0.15)} L${f(s * 0.35)},${f(s * 0.95)} Z" fill="#f2dcb0" stroke="#d1b07a" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.2)},${f(s * 0.35)} H${f(s * 0.2)}" stroke="${C.momiji}" stroke-width="${f(s * 0.08)}"/></g>`,
  clock: (s) => `<g><circle r="${f(s)}" fill="#fffaf0" stroke="#c99a62" stroke-width="${f(s * 0.12)}"/>${[0, 90, 180, 270].map((a) => `<circle cx="${f(Math.sin((a * Math.PI) / 180) * s * 0.75)}" cy="${f(-Math.cos((a * Math.PI) / 180) * s * 0.75)}" r="${f(s * 0.07)}" fill="#c99a62"/>`).join('')}`
    + `<path d="M0,0 V${f(-s * 0.7)} M0,0 L${f(-s * 0.08)},${f(-s * 0.5)}" stroke="${C.ink}" stroke-width="${f(s * 0.1)}" stroke-linecap="round"/><circle r="${f(s * 0.08)}" fill="${C.momiji}"/></g>`,
  // お正月
  kadomatsu: (s) => `<g><path d="M${f(-s * 0.3)},${f(-s * 0.9)} L${f(-s * 0.3)},${f(s * 0.3)} M0,${f(-s * 1.2)} L0,${f(s * 0.3)} M${f(s * 0.3)},${f(-s * 0.75)} L${f(s * 0.3)},${f(s * 0.3)}" stroke="#9fcb72" stroke-width="${f(s * 0.24)}" stroke-linecap="round"/>`
    + `<path d="M${f(-s * 0.3)},${f(-s * 0.9)} l${f(s * 0.12)},${f(-s * 0.15)} M0,${f(-s * 1.2)} l${f(s * 0.12)},${f(-s * 0.15)} M${f(s * 0.3)},${f(-s * 0.75)} l${f(s * 0.12)},${f(-s * 0.15)}" stroke="#86b25e" stroke-width="${f(s * 0.24)}" stroke-linecap="round"/>`
    + `<ellipse cx="${f(-s * 0.55)}" cy="${f(-s * 0.1)}" rx="${f(s * 0.3)}" ry="${f(s * 0.14)}" fill="#86a256"/><ellipse cx="${f(s * 0.55)}" cy="${f(-s * 0.05)}" rx="${f(s * 0.3)}" ry="${f(s * 0.14)}" fill="#86a256"/>`
    + `<circle cx="${f(-s * 0.5)}" cy="${f(-s * 0.3)}" r="${f(s * 0.12)}" fill="${C.momiji}"/><circle cx="${f(s * 0.55)}" cy="${f(-s * 0.25)}" r="${f(s * 0.12)}" fill="#fbd9e2"/>`
    + `<path d="M${f(-s * 0.7)},${f(s * 0.2)} H${f(s * 0.7)} L${f(s * 0.6)},${f(s)} H${f(-s * 0.6)} Z" fill="#e9c591" stroke="#b98a52" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.66)},${f(s * 0.5)} H${f(s * 0.66)}" stroke="#b98a52" stroke-width="${f(s * 0.06)}"/></g>`,
  mochi: (s) => `<g><path d="M${f(-s * 0.9)},${f(s * 0.7)} H${f(s * 0.9)} L${f(s * 0.7)},${f(s)} H${f(-s * 0.7)} Z" fill="#e9c591" stroke="#b98a52" stroke-width="${f(s * 0.05)}"/>`
    + `<path d="M${f(-s * 0.8)},${f(s * 0.7)} L${f(-s * 0.4)},${f(s * 0.4)} L0,${f(s * 0.7)} L${f(s * 0.4)},${f(s * 0.4)} L${f(s * 0.8)},${f(s * 0.7)} Z" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.04)}"/>`
    + `<ellipse cx="0" cy="${f(s * 0.3)}" rx="${f(s * 0.75)}" ry="${f(s * 0.3)}" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.05)}"/>`
    + `<ellipse cx="0" cy="${f(-s * 0.1)}" rx="${f(s * 0.55)}" ry="${f(s * 0.25)}" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.05)}"/>`
    + `<circle cx="0" cy="${f(-s * 0.45)}" r="${f(s * 0.24)}" fill="#f6a24a"/><ellipse cx="${f(s * 0.08)}" cy="${f(-s * 0.68)}" rx="${f(s * 0.12)}" ry="${f(s * 0.05)}" fill="#86a256"/></g>`,
  hagoita: (s) => `<g transform="rotate(20)"><rect x="${f(-s * 0.1)}" y="${f(s * 0.4)}" width="${f(s * 0.2)}" height="${f(s * 0.7)}" rx="${f(s * 0.08)}" fill="#c99a62"/>`
    + `<path d="M${f(-s * 0.45)},${f(s * 0.45)} L${f(-s * 0.5)},${f(-s * 0.85)} Q0,${f(-s * 1.1)} ${f(s * 0.5)},${f(-s * 0.85)} L${f(s * 0.45)},${f(s * 0.45)} Z" fill="#fde3d6" stroke="#e39a86" stroke-width="${f(s * 0.06)}"/>`
    + `<circle cx="0" cy="${f(-s * 0.35)}" r="${f(s * 0.2)}" fill="${C.momiji}"/><path d="M${f(-s * 0.3)},${f(s * 0.05)} q${f(s * 0.3)},${f(s * 0.2)} ${f(s * 0.6)},0" stroke="${C.icho}" stroke-width="${f(s * 0.1)}" fill="none"/></g>`
    + `<g transform="translate(${f(s * 0.9)} ${f(-s * 0.8)})"><circle r="${f(s * 0.14)}" fill="#3e3a38" opacity="0.7"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="${f(Math.cos((a * Math.PI) / 180) * s * 0.2)}" cy="${f(Math.sin((a * Math.PI) / 180) * s * 0.2 - s * 0.15)}" rx="${f(s * 0.06)}" ry="${f(s * 0.18)}" fill="${[C.momiji, C.icho, '#9fc5e8', C.olive, C.rose][a / 72]}" transform="rotate(${a} ${f(Math.cos((a * Math.PI) / 180) * s * 0.2)} ${f(Math.sin((a * Math.PI) / 180) * s * 0.2 - s * 0.15)})"/>`).join('')}</g>`,
  kite: (s) => `<g><path d="M0,${f(-s)} L${f(s * 0.8)},${f(-s * 0.1)} L0,${f(s * 0.9)} L${f(-s * 0.8)},${f(-s * 0.1)} Z" fill="#fde3d6" stroke="#e39a86" stroke-width="${f(s * 0.06)}"/>`
    + `<circle cx="0" cy="${f(-s * 0.05)}" r="${f(s * 0.3)}" fill="${C.momiji}"/>`
    + `<path d="M0,${f(s * 0.9)} q${f(s * 0.3)},${f(s * 0.4)} 0,${f(s * 0.8)} t0,${f(s * 0.8)}" stroke="#c99a62" stroke-width="${f(s * 0.05)}" fill="none"/>`
    + [0.5, 1.1].map((t) => `<path d="M${f(-s * 0.15)},${f(s * (0.9 + t))} h${f(s * 0.3)}" stroke="${C.icho}" stroke-width="${f(s * 0.12)}" stroke-linecap="round"/>`).join('') + '</g>',
  shime: (s) => `<g><path d="M${f(-s)},0 Q0,${f(s * 0.4)} ${f(s)},0" stroke="#e9c591" stroke-width="${f(s * 0.22)}" fill="none" stroke-linecap="round"/>`
    + `<path d="M${f(-s)},0 Q0,${f(s * 0.4)} ${f(s)},0" stroke="#c99a62" stroke-width="${f(s * 0.06)}" fill="none" stroke-dasharray="${f(s * 0.12)} ${f(s * 0.12)}"/>`
    + [-0.5, 0, 0.5].map((x) => `<path d="M${f(x * s)},${f(s * 0.15)} l${f(-s * 0.1)},${f(s * 0.25)} l${f(s * 0.2)},${f(s * 0.2)} l${f(-s * 0.1)},${f(s * 0.25)}" stroke="#ffffff" stroke-width="${f(s * 0.12)}" fill="none" stroke-linejoin="round"/>`).join('')
    + `<circle cx="0" cy="${f(s * 0.22)}" r="${f(s * 0.16)}" fill="#f6a24a"/></g>`,
  sunrise: (s) => `<g><path d="M${f(-s * 1.4)},${f(s * 0.3)} L${f(-s * 0.5)},${f(-s * 0.5)} L${f(-s * 0.2)},${f(-s * 0.3)} L${f(s * 0.3)},${f(-s * 0.7)} L${f(s * 1.4)},${f(s * 0.3)} Z" fill="#cfe0ea"/><path d="M${f(-s * 0.05)},${f(-s * 0.55)} L${f(s * 0.3)},${f(-s * 0.7)} L${f(s * 0.62)},${f(-s * 0.4)} Q${f(s * 0.3)},${f(-s * 0.48)} ${f(-s * 0.05)},${f(-s * 0.55)} Z" fill="#ffffff"/>`
    + `<circle cx="${f(-s * 0.9)}" cy="${f(-s * 0.6)}" r="${f(s * 0.32)}" fill="#f7a6a0"/>${[-60, -30, 0, 30].map((a) => `<path d="M${f(-s * 0.9 + Math.sin((a * Math.PI) / 180) * s * 0.42)},${f(-s * 0.6 - Math.cos((a * Math.PI) / 180) * s * 0.42)} l${f(Math.sin((a * Math.PI) / 180) * s * 0.18)},${f(-Math.cos((a * Math.PI) / 180) * s * 0.18)}" stroke="#f7a6a0" stroke-width="${f(s * 0.07)}" stroke-linecap="round"/>`).join('')}</g>`,
  // 節分
  masu: (s) => `<g><path d="M${f(-s * 0.8)},${f(-s * 0.3)} H${f(s * 0.8)} L${f(s * 0.7)},${f(s * 0.6)} H${f(-s * 0.7)} Z" fill="#f1d3a6" stroke="#b98a52" stroke-width="${f(s * 0.07)}"/>`
    + `<path d="M${f(-s * 0.8)},${f(-s * 0.3)} L${f(-s * 0.5)},${f(-s * 0.55)} H${f(s * 0.5)} L${f(s * 0.8)},${f(-s * 0.3)}" fill="#e3bb84" stroke="#b98a52" stroke-width="${f(s * 0.06)}"/>`
    + [[-0.3, -0.42], [0, -0.48], [0.3, -0.42], [-0.15, -0.55], [0.15, -0.56]].map(([x, y]) => `<ellipse cx="${f(x * s)}" cy="${f(y * s)}" rx="${f(s * 0.13)}" ry="${f(s * 0.11)}" fill="#f2dcb0" stroke="#d1b07a" stroke-width="${f(s * 0.03)}"/>`).join('')
    + `<text x="0" y="${f(s * 0.2)}" font-size="${f(s * 0.42)}" font-weight="700" fill="${C.chestnutDeep}" text-anchor="middle" dominant-baseline="central">ふく</text></g>`,
  oni: (s, v = 0) => {
    const face = v ? '#cfe0ea' : '#f7c4b4';
    const deep = v ? '#9fbdd0' : '#e39a86';
    return `<g><path d="M${f(-s * 0.55)},${f(-s * 0.55)} L${f(-s * 0.4)},${f(-s * 1.05)} L${f(-s * 0.2)},${f(-s * 0.6)} Z M${f(s * 0.55)},${f(-s * 0.55)} L${f(s * 0.4)},${f(-s * 1.05)} L${f(s * 0.2)},${f(-s * 0.6)} Z" fill="#fde3a6" stroke="#d9b04d" stroke-width="${f(s * 0.05)}"/>`
      + `<circle r="${f(s * 0.8)}" fill="${face}" stroke="${deep}" stroke-width="${f(s * 0.07)}"/>`
      + `<path d="M${f(-s * 0.7)},${f(-s * 0.35)} Q0,${f(-s * 0.9)} ${f(s * 0.7)},${f(-s * 0.35)}" fill="#c9a670" opacity="0.6"/>`
      + `<path d="M${f(-s * 0.4)},${f(-s * 0.05)} q${f(s * 0.12)},${f(-s * 0.14)} ${f(s * 0.24)},0 M${f(s * 0.16)},${f(-s * 0.05)} q${f(s * 0.12)},${f(-s * 0.14)} ${f(s * 0.24)},0" stroke="${C.ink}" stroke-width="${f(s * 0.07)}" fill="none" stroke-linecap="round"/>`
      + `<path d="M${f(-s * 0.25)},${f(s * 0.3)} Q0,${f(s * 0.5)} ${f(s * 0.25)},${f(s * 0.3)}" stroke="${C.ink}" stroke-width="${f(s * 0.07)}" fill="none" stroke-linecap="round"/>`
      + `<path d="M${f(-s * 0.15)},${f(s * 0.36)} l${f(s * 0.05)},${f(s * 0.12)} l${f(s * 0.05)},${f(-s * 0.1)} M${f(s * 0.05)},${f(s * 0.38)} l${f(s * 0.05)},${f(s * 0.12)} l${f(s * 0.05)},${f(-s * 0.12)}" fill="#ffffff" stroke="none"/>`
      + `<ellipse cx="${f(-s * 0.48)}" cy="${f(s * 0.18)}" rx="${f(s * 0.14)}" ry="${f(s * 0.09)}" fill="#f59a8a" opacity="0.6"/><ellipse cx="${f(s * 0.48)}" cy="${f(s * 0.18)}" rx="${f(s * 0.14)}" ry="${f(s * 0.09)}" fill="#f59a8a" opacity="0.6"/></g>`;
  },
  ehomaki: (s) => `<g transform="rotate(-25)"><rect x="${f(-s)}" y="${f(-s * 0.32)}" width="${f(s * 2)}" height="${f(s * 0.64)}" rx="${f(s * 0.3)}" fill="#7d8a6a"/>`
    + `<ellipse cx="${f(s)}" cy="0" rx="${f(s * 0.22)}" ry="${f(s * 0.32)}" fill="#ffffff" stroke="#7d8a6a" stroke-width="${f(s * 0.08)}"/>`
    + `<circle cx="${f(s)}" cy="${f(-s * 0.08)}" r="${f(s * 0.07)}" fill="#f6c84a"/><circle cx="${f(s * 0.98)}" cy="${f(s * 0.1)}" r="${f(s * 0.07)}" fill="#f08a8a"/><circle cx="${f(s * 1.06)}" cy="${f(s * 0.05)}" r="${f(s * 0.06)}" fill="#9fcb72"/></g>`,
  beans: (s) => [[-0.6, 0.1], [-0.2, -0.1], [0.25, 0.15], [0.6, -0.05], [0.05, 0.35], [-0.4, 0.4]].map(([x, y]) => `<ellipse cx="${f(x * s)}" cy="${f(y * s)}" rx="${f(s * 0.14)}" ry="${f(s * 0.12)}" fill="#f2dcb0" stroke="#d1b07a" stroke-width="${f(s * 0.03)}"/>`).join(''),
  // バレンタイン
  choco: (s) => `<g><path d="M0,${f(s * 0.85)} C${f(-s * 1.15)},${f(s * 0.05)} ${f(-s * 0.8)},${f(-s * 1.0)} 0,${f(-s * 0.45)} C${f(s * 0.8)},${f(-s * 1.0)} ${f(s * 1.15)},${f(s * 0.05)} 0,${f(s * 0.85)} Z" fill="#f4a3b4" stroke="#e07a92" stroke-width="${f(s * 0.07)}"/>`
    + `<path d="M${f(-s * 0.9)},${f(-s * 0.1)} Q0,${f(s * 0.15)} ${f(s * 0.9)},${f(-s * 0.1)}" stroke="#fff6e4" stroke-width="${f(s * 0.14)}" fill="none"/>`
    + `<path d="M0,${f(-s * 0.05)} q${f(-s * 0.4)},${f(-s * 0.4)} ${f(-s * 0.35)},0 Z M0,${f(-s * 0.05)} q${f(s * 0.4)},${f(-s * 0.4)} ${f(s * 0.35)},0 Z" fill="#fff6e4"/></g>`,
  cocoa: (s) => `<g><path d="M${f(-s * 0.6)},${f(-s * 0.3)} H${f(s * 0.6)} L${f(s * 0.5)},${f(s * 0.7)} H${f(-s * 0.5)} Z" fill="#fde3d6" stroke="#e39a86" stroke-width="${f(s * 0.06)}"/>`
    + `<path d="M${f(s * 0.58)},${f(-s * 0.1)} q${f(s * 0.4)},0 ${f(s * 0.35)},${f(s * 0.3)} q${f(-s * 0.05)},${f(s * 0.25)} ${f(-s * 0.4)},${f(s * 0.25)}" stroke="#e39a86" stroke-width="${f(s * 0.1)}" fill="none"/>`
    + `<ellipse cx="0" cy="${f(-s * 0.3)}" rx="${f(s * 0.6)}" ry="${f(s * 0.12)}" fill="#c9a07a"/>`
    + `<g transform="translate(0 ${f(-s * 0.55)})">${heartShape(s * 0.35, '#ffffff', '#f4a3b4')}</g>`
    + `<path d="M${f(-s * 0.2)},${f(-s * 0.8)} q${f(-s * 0.1)},${f(-s * 0.2)} 0,${f(-s * 0.4)}" stroke="#d3e1ea" stroke-width="${f(s * 0.05)}" fill="none"/></g>`,
  // 猫の日
  fishCookie: (s) => `<g><path d="M${f(-s)},0 Q${f(-s * 0.3)},${f(-s * 0.6)} ${f(s * 0.45)},0 Q${f(-s * 0.3)},${f(s * 0.6)} ${f(-s)},0 Z M${f(s * 0.4)},0 L${f(s)},${f(-s * 0.4)} L${f(s)},${f(s * 0.4)} Z" fill="#f3d39a" stroke="#d1a76a" stroke-width="${f(s * 0.06)}"/>`
    + `<circle cx="${f(-s * 0.55)}" cy="${f(-s * 0.06)}" r="${f(s * 0.07)}" fill="${C.chestnutDeep}"/><path d="M${f(-s * 0.2)},${f(-s * 0.2)} q${f(s * 0.12)},${f(s * 0.2)} 0,${f(s * 0.4)}" stroke="#d1a76a" stroke-width="${f(s * 0.05)}" fill="none"/></g>`,
  suzu: (s) => `<g><path d="M${f(-s * 0.9)},${f(-s * 0.9)} q${f(s * 0.9)},${f(s * 0.5)} ${f(s * 1.8)},0" stroke="${C.momiji}" stroke-width="${f(s * 0.2)}" fill="none" stroke-linecap="round"/>`
    + `<circle cx="0" cy="${f(-s * 0.05)}" r="${f(s * 0.55)}" fill="${C.icho}" stroke="${C.ichoDeep}" stroke-width="${f(s * 0.06)}"/>`
    + `<path d="M${f(-s * 0.5)},${f(-s * 0.1)} H${f(s * 0.5)}" stroke="${C.ichoDeep}" stroke-width="${f(s * 0.06)}"/><circle cx="0" cy="${f(s * 0.18)}" r="${f(s * 0.1)}" fill="${C.ichoDeep}"/><path d="M0,${f(s * 0.25)} V${f(s * 0.45)}" stroke="${C.ichoDeep}" stroke-width="${f(s * 0.06)}"/>`
    + `<ellipse cx="${f(-s * 0.2)}" cy="${f(-s * 0.3)}" rx="${f(s * 0.14)}" ry="${f(s * 0.09)}" fill="#ffffff" opacity="0.6"/></g>`,
  banner: (s, v = 0) => {
    const text = ['ねこの ひ', '2/22'][v % 2];
    return `<g><rect x="${f(-s * 1.3)}" y="${f(-s * 0.36)}" width="${f(s * 2.6)}" height="${f(s * 0.72)}" rx="${f(s * 0.2)}" fill="#fffaf0" stroke="#e3a3b8" stroke-width="${f(s * 0.07)}"/>`
      + `<text x="0" y="0" font-size="${f(s * 0.42)}" font-weight="700" fill="#d97f9a" text-anchor="middle" dominant-baseline="central">${text}</text></g>`;
  },
  paw: (s, v = 0) => `<g>${pawPrint(['#f7b4a6', '#e3a3b8', '#f5c451', '#9fc5e8'][v % 4], s)}</g>`,
  star: (s, v = 0) => starShape(s, [C.icho, '#fde3a6', C.rose][v % 3], C.ichoDeep),
  heart: (s, v = 0) => heartShape(s, ['#f4a3b4', '#f7c4b4', '#fbd9e2'][v % 3]),
  flake: (s) => snowflake(s),
};


// ---- 冬の小物（季節の飾り） ----
Object.assign(M, {
  snowman: (s) => `<g><circle cx="0" cy="${f(s * 0.45)}" r="${f(s * 0.55)}" fill="#ffffff" stroke="#c9d9e4" stroke-width="${f(s * 0.06)}"/>`
    + `<circle cx="0" cy="${f(-s * 0.35)}" r="${f(s * 0.4)}" fill="#ffffff" stroke="#c9d9e4" stroke-width="${f(s * 0.06)}"/>`
    + `<circle cx="${f(-s * 0.13)}" cy="${f(-s * 0.4)}" r="${f(s * 0.05)}" fill="${C.ink}"/><circle cx="${f(s * 0.13)}" cy="${f(-s * 0.4)}" r="${f(s * 0.05)}" fill="${C.ink}"/>`
    + `<path d="M0,${f(-s * 0.3)} l${f(s * 0.22)},${f(s * 0.05)} l${f(-s * 0.22)},${f(s * 0.05)} Z" fill="${C.kaki}"/>`
    + `<path d="M${f(-s * 0.38)},${f(-s * 0.05)} q${f(s * 0.38)},${f(s * 0.18)} ${f(s * 0.76)},0" stroke="${C.momiji}" stroke-width="${f(s * 0.14)}" fill="none" stroke-linecap="round"/>`
    + `<path d="M${f(-s * 0.3)},${f(-s * 0.68)} h${f(s * 0.6)} M${f(-s * 0.2)},${f(-s * 0.68)} v${f(-s * 0.25)} h${f(s * 0.4)} v${f(s * 0.25)}" stroke="#9fc5e8" stroke-width="${f(s * 0.1)}" fill="#cfe0ea" stroke-linejoin="round"/></g>`,
  usagi: (s) => `<g><ellipse cx="0" cy="${f(s * 0.25)}" rx="${f(s * 0.85)}" ry="${f(s * 0.55)}" fill="#ffffff" stroke="#c9d9e4" stroke-width="${f(s * 0.06)}"/>`
    + `<ellipse cx="${f(-s * 0.25)}" cy="${f(-s * 0.35)}" rx="${f(s * 0.14)}" ry="${f(s * 0.4)}" fill="#86b25e" transform="rotate(-15 ${f(-s * 0.25)} ${f(-s * 0.35)})"/><ellipse cx="${f(s * 0.1)}" cy="${f(-s * 0.38)}" rx="${f(s * 0.14)}" ry="${f(s * 0.4)}" fill="#9fcb72" transform="rotate(10 ${f(s * 0.1)} ${f(-s * 0.38)})"/>`
    + `<circle cx="${f(-s * 0.45)}" cy="${f(s * 0.1)}" r="${f(s * 0.09)}" fill="${C.momiji}"/><circle cx="${f(-s * 0.1)}" cy="${f(s * 0.1)}" r="${f(s * 0.09)}" fill="${C.momiji}"/></g>`,
  mikan: (s) => `<g><circle cx="${f(-s * 0.35)}" cy="${f(s * 0.2)}" r="${f(s * 0.5)}" fill="#f6a24a" stroke="#e08a30" stroke-width="${f(s * 0.05)}"/><circle cx="${f(s * 0.4)}" cy="${f(s * 0.25)}" r="${f(s * 0.45)}" fill="#f6a24a" stroke="#e08a30" stroke-width="${f(s * 0.05)}"/>`
    + `<circle cx="0" cy="${f(-s * 0.35)}" r="${f(s * 0.45)}" fill="#f8b15c" stroke="#e08a30" stroke-width="${f(s * 0.05)}"/><ellipse cx="${f(s * 0.08)}" cy="${f(-s * 0.8)}" rx="${f(s * 0.18)}" ry="${f(s * 0.07)}" fill="#86a256"/>`
    + `<ellipse cx="${f(-s * 0.15)}" cy="${f(-s * 0.48)}" rx="${f(s * 0.12)}" ry="${f(s * 0.08)}" fill="#ffd2a3" opacity="0.8"/></g>`,
  mittens: (s) => [[-0.45, '#f7c4b4', '#e39a86', -12], [0.45, '#cfe0ea', '#9fbdd0', 12]].map(([x, c, d, r]) => `<g transform="translate(${f(x * s)} 0) rotate(${r})"><path d="M${f(-s * 0.32)},${f(s * 0.6)} V${f(-s * 0.2)} Q${f(-s * 0.32)},${f(-s * 0.7)} ${f(s * 0.05)},${f(-s * 0.7)} Q${f(s * 0.36)},${f(-s * 0.7)} ${f(s * 0.36)},${f(-s * 0.2)} V${f(s * 0.6)} Z" fill="${c}" stroke="${d}" stroke-width="${f(s * 0.06)}"/><ellipse cx="${f(-s * 0.36)}" cy="${f(-s * 0.05)}" rx="${f(s * 0.14)}" ry="${f(s * 0.22)}" fill="${c}" stroke="${d}" stroke-width="${f(s * 0.05)}"/><rect x="${f(-s * 0.36)}" y="${f(s * 0.45)}" width="${f(s * 0.76)}" height="${f(s * 0.22)}" rx="${f(s * 0.06)}" fill="#ffffff" stroke="${d}" stroke-width="${f(s * 0.04)}"/></g>`).join(''),
  snowballs: (s) => `<g>${[[-0.5, 0.35, 0.42], [0.35, 0.4, 0.38], [-0.05, -0.15, 0.36]].map(([x, y, r]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(r * s)}" fill="#ffffff" stroke="#c9d9e4" stroke-width="${f(s * 0.06)}"/>`).join('')}</g>`,
  snowBranch: (s) => `<g><path d="M${f(-s)},${f(s * 0.5)} Q0,${f(-s * 0.1)} ${f(s)},${f(-s * 0.5)}" stroke="#a77048" stroke-width="${f(s * 0.12)}" fill="none" stroke-linecap="round"/>`
    + [[-0.5, 0.18], [0.1, -0.05], [0.6, -0.3]].map(([x, y]) => `<ellipse cx="${f(x * s)}" cy="${f(y * s - s * 0.08)}" rx="${f(s * 0.28)}" ry="${f(s * 0.1)}" fill="#ffffff" stroke="#d3e1ea" stroke-width="${f(s * 0.04)}"/>`).join('')
    + [[-0.2, 0.25], [-0.1, 0.32], [0.35, 0.05]].map(([x, y]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.08)}" fill="#e8664a"/>`).join('') + '</g>',
  bulb: (s, v = 0) => `<g><rect x="${f(-s * 0.18)}" y="${f(-s * 0.95)}" width="${f(s * 0.36)}" height="${f(s * 0.3)}" rx="${f(s * 0.06)}" fill="#c9a670"/><ellipse cx="0" cy="${f(-s * 0.2)}" rx="${f(s * 0.36)}" ry="${f(s * 0.55)}" fill="${[C.momiji, C.icho, '#9fcb72', '#9fc5e8', C.rose][v % 5]}" stroke="#ffffff" stroke-width="${f(s * 0.06)}"/><ellipse cx="${f(-s * 0.1)}" cy="${f(-s * 0.4)}" rx="${f(s * 0.08)}" ry="${f(s * 0.14)}" fill="#ffffff" opacity="0.7"/></g>`,
});

// ---- 飾りの3つの場所 ----
// top：画面の いちばん上（幅 390・高さ 64 の座標）に、ひもで つるす列や つらら。題名や「もどる」の後ろに隠れても困らない
// bl・br：下の左右の角（64×64 の座標）。遊ぶボタンの左右の すきまに、1つずつ置く
// どちらもゲームの絵より奥にあり、ゲームの絵や文字には重ならない。

// ひもに つるした 飾りの列（上の帯）
function strip(item, n, s, rope = '#c99a62', sag = 10) {
  s *= 1.35; // 画面で見える大きさにする
  sag = Math.min(sag, 4); // 題名の文字に かからないよう、ほとんど たるませない
  let g = `<path d="M-6,1 Q195,${1 + sag * 2} 396,1" stroke="${rope}" stroke-width="2" fill="none"/>`;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const x = -6 + 402 * t;
    const y = 1 + 4 * sag * t * (1 - t);
    g += `<g transform="translate(${f(x)} ${f(y + s * 0.75)})">${M[item](s, k)}</g>`;
  }
  return g;
}
function icicles(seed) {
  let g = `<path d="M0,0 H390 V8 Q195,14 0,8 Z" fill="#ffffff" stroke="#d3e1ea" stroke-width="1.5"/>`;
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let x = 6; x < 390; x += 16 + rnd() * 10) {
    const h = 10 + rnd() * 22;
    g += `<path d="M${f(x - 4)},8 L${f(x)},${f(8 + h)} L${f(x + 4)},8 Z" fill="#eef6fb" stroke="#bcd5e4" stroke-width="1.2" stroke-linejoin="round"/>`;
  }
  return g;
}
// 上の帯の種類（季節と行事ごと）
const TOPS = {
  fuyu: [(i) => icicles(i * 7 + 3), () => strip('flake', 9, 9, '#bcd5e4', 8), (i) => icicles(i * 5 + 11) + `<g transform="translate(330 30)">${M.snowBranch(26)}</g>`, () => strip('mittens', 6, 9, '#c99a62', 12)],
  christmas: [() => strip('ornament', 9, 8), () => strip('bulb', 12, 8, '#86a256', 8), () => strip('bell', 8, 9), () => strip('star', 9, 9, '#c99a62', 8), () => strip('holly', 8, 10, '#86a256', 6), () => strip('cane', 8, 9)],
  omisoka: [() => strip('bell', 7, 9), () => `<g transform="translate(330 34)">${M.temple(24)}</g>`, () => strip('clock', 6, 9)],
  oshogatsu: [() => `<g transform="translate(195 14)">${M.shime(40)}</g>`, () => strip('kite', 6, 10), () => `<g transform="translate(60 30)">${M.sunrise(24)}</g>`],
  setsubun: [() => strip('oni', 7, 10), () => strip('masu', 7, 10), () => strip('ehomaki', 7, 10), () => `<g transform="translate(340 32)">${M.oni(20, 1)}</g><g transform="translate(50 32)">${M.oni(18, 0)}</g>`],
  valentine: [() => strip('heart', 11, 9), () => strip('choco', 7, 9), () => strip('heart', 9, 10, '#e3a3b8', 12)],
  nekonohi: [() => strip('paw', 10, 9), () => strip('fishCookie', 7, 10), () => strip('suzu', 7, 10)],
};
// 下の角の物（季節と行事ごと）
const CORNERS = {
  fuyu: ['snowman', 'usagi', 'mikan', 'snowballs', 'mittens', 'snowBranch'],
  christmas: ['tree', 'present', 'stocking', 'wreath', 'cane', 'bell', 'holly'],
  omisoka: ['soba', 'temple', 'clock', 'broom'],
  oshogatsu: ['kadomatsu', 'mochi', 'hagoita', 'kite'],
  setsubun: ['masu', 'oni', 'ehomaki', 'beans'],
  valentine: ['choco', 'cocoa', 'present', 'heart'],
  nekonohi: ['fishCookie', 'suzu', 'paw', 'banner'],
};

// ---- 春・夏・秋と、その行事の飾りの絵 ----
const P5 = (s, r, fn) => [0, 72, 144, 216, 288].map((a) => fn(Math.cos((a * Math.PI) / 180) * r * s, Math.sin((a * Math.PI) / 180) * r * s, a)).join('');
Object.assign(M, {
  // 春
  sakuraFlower: (s, v = 0) => `<g>${P5(s, 0.42, (x, y, a) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.36)}" ry="${f(s * 0.3)}" fill="${['#fbd9e2', '#f9c6d3', '#fde8ee'][v % 3]}" stroke="#eaa7ba" stroke-width="${f(s * 0.05)}" transform="rotate(${a} ${f(x)} ${f(y)})"/>`)}<circle r="${f(s * 0.16)}" fill="#f6d55e"/></g>`,
  tulip: (s, v = 0) => `<g><path d="M0,${f(s)} V${f(-s * 0.1)}" stroke="#86b25e" stroke-width="${f(s * 0.12)}"/><ellipse cx="${f(s * 0.3)}" cy="${f(s * 0.55)}" rx="${f(s * 0.3)}" ry="${f(s * 0.12)}" fill="#9fcb72" transform="rotate(-40 ${f(s * 0.3)} ${f(s * 0.55)})"/>`
    + `<path d="M${f(-s * 0.4)},${f(-s * 0.6)} L${f(-s * 0.2)},${f(-s * 0.3)} L0,${f(-s * 0.7)} L${f(s * 0.2)},${f(-s * 0.3)} L${f(s * 0.4)},${f(-s * 0.6)} Q${f(s * 0.45)},0 0,${f(s * 0.02)} Q${f(-s * 0.45)},0 ${f(-s * 0.4)},${f(-s * 0.6)} Z" fill="${['#f7a6a0', '#f6d55e', '#f4a3b4'][v % 3]}" stroke="#e39a86" stroke-width="${f(s * 0.05)}" stroke-linejoin="round"/></g>`,
  butterfly: (s, v = 0) => { const c = ['#fde3a6', '#cfe0ea', '#fbd9e2'][v % 3]; return `<g><ellipse cx="${f(-s * 0.4)}" cy="${f(-s * 0.2)}" rx="${f(s * 0.42)}" ry="${f(s * 0.32)}" fill="${c}" stroke="#d9b04d" stroke-width="${f(s * 0.05)}"/><ellipse cx="${f(s * 0.4)}" cy="${f(-s * 0.2)}" rx="${f(s * 0.42)}" ry="${f(s * 0.32)}" fill="${c}" stroke="#d9b04d" stroke-width="${f(s * 0.05)}"/><ellipse cx="${f(-s * 0.3)}" cy="${f(s * 0.25)}" rx="${f(s * 0.28)}" ry="${f(s * 0.22)}" fill="${c}" stroke="#d9b04d" stroke-width="${f(s * 0.05)}"/><ellipse cx="${f(s * 0.3)}" cy="${f(s * 0.25)}" rx="${f(s * 0.28)}" ry="${f(s * 0.22)}" fill="${c}" stroke="#d9b04d" stroke-width="${f(s * 0.05)}"/><rect x="${f(-s * 0.06)}" y="${f(-s * 0.4)}" width="${f(s * 0.12)}" height="${f(s * 0.8)}" rx="${f(s * 0.06)}" fill="#a7744a"/></g>`; },
  dango: (s) => `<g><path d="M0,${f(s)} V${f(-s)}" stroke="#c99a62" stroke-width="${f(s * 0.1)}" stroke-linecap="round"/>${[['#f9c6d3', -0.55], ['#ffffff', 0], ['#b9d48a', 0.55]].map(([c, y]) => `<circle cx="0" cy="${f(y * s)}" r="${f(s * 0.3)}" fill="${c}" stroke="#d9c3a1" stroke-width="${f(s * 0.05)}"/>`).join('')}</g>`,
  hishimochi: (s) => `<g>${[['#f9c6d3', -0.45], ['#ffffff', 0], ['#b9d48a', 0.45]].map(([c, y]) => `<path d="M${f(-s * 0.8)},${f(y * s)} L0,${f(y * s - s * 0.28)} L${f(s * 0.8)},${f(y * s)} L0,${f(y * s + s * 0.28)} Z" fill="${c}" stroke="#d9c3a1" stroke-width="${f(s * 0.05)}"/>`).join('')}<path d="M${f(-s * 0.6)},${f(s * 0.85)} H${f(s * 0.6)}" stroke="#e39a86" stroke-width="${f(s * 0.14)}" stroke-linecap="round"/></g>`,
  bonbori: (s) => `<g><path d="M0,${f(s * 0.3)} V${f(s)}" stroke="#c99a62" stroke-width="${f(s * 0.1)}"/><ellipse cx="0" cy="${f(s)}" rx="${f(s * 0.35)}" ry="${f(s * 0.1)}" fill="#c99a62"/><path d="M${f(-s * 0.45)},${f(-s * 0.55)} Q${f(-s * 0.55)},${f(s * 0.3)} 0,${f(s * 0.35)} Q${f(s * 0.55)},${f(s * 0.3)} ${f(s * 0.45)},${f(-s * 0.55)} Z" fill="#fff4e0" stroke="#e7b98a" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.48)},${f(-s * 0.55)} H${f(s * 0.48)}" stroke="#c99a62" stroke-width="${f(s * 0.1)}"/>${M.sakuraFlower(s * 0.28).replace('<g>', `<g transform="translate(0 ${f(-s * 0.1)})">`)}</g>`,
  hina: (s) => { const doll = (x, col, hat) => `<g transform="translate(${f(x)} 0)"><path d="M${f(-s * 0.38)},${f(s * 0.8)} L${f(-s * 0.2)},${f(-s * 0.05)} H${f(s * 0.2)} L${f(s * 0.38)},${f(s * 0.8)} Z" fill="${col}" stroke="#d9a0b0" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.2)},${f(-s * 0.05)} L0,${f(s * 0.3)} L${f(s * 0.2)},${f(-s * 0.05)}" fill="#ffffff"/><circle cx="0" cy="${f(-s * 0.25)}" r="${f(s * 0.22)}" fill="#fff6ea" stroke="#e6cfae" stroke-width="${f(s * 0.04)}"/>${hat}</g>`;
    return `<g>${doll(-s * 0.45, '#cfe0ea', `<rect x="${f(-s * 0.08)}" y="${f(-s * 0.68)}" width="${f(s * 0.16)}" height="${f(s * 0.25)}" rx="${f(s * 0.04)}" fill="#7d8a6a"/>`)}${doll(s * 0.45, '#f7c4b4', `<path d="M${f(-s * 0.18)},${f(-s * 0.45)} L0,${f(-s * 0.62)} L${f(s * 0.18)},${f(-s * 0.45)}" stroke="#f6d55e" stroke-width="${f(s * 0.07)}" fill="none"/>`)}</g>`; },
  koinobori: (s, v = 0) => { const c = [['#9fc5e8', '#6f9fcb'], ['#f7a6a0', '#e08d7c'], ['#f6d55e', '#d9b04d']][v % 3]; return `<g><path d="M${f(-s)},${f(-s * 0.35)} Q0,${f(-s * 0.55)} ${f(s * 0.7)},${f(-s * 0.3)} L${f(s)},${f(-s * 0.5)} L${f(s * 0.85)},0 L${f(s)},${f(s * 0.5)} L${f(s * 0.7)},${f(s * 0.3)} Q0,${f(s * 0.55)} ${f(-s)},${f(s * 0.35)} Z" fill="${c[0]}" stroke="${c[1]}" stroke-width="${f(s * 0.06)}"/><circle cx="${f(-s * 0.6)}" cy="${f(-s * 0.05)}" r="${f(s * 0.18)}" fill="#ffffff" stroke="${c[1]}" stroke-width="${f(s * 0.04)}"/><circle cx="${f(-s * 0.6)}" cy="${f(-s * 0.05)}" r="${f(s * 0.08)}" fill="${C.ink}"/>${[-0.1, 0.25].map((x) => `<path d="M${f(x * s)},${f(-s * 0.25)} q${f(s * 0.15)},${f(s * 0.25)} 0,${f(s * 0.5)}" stroke="${c[1]}" stroke-width="${f(s * 0.05)}" fill="none"/>`).join('')}</g>`; },
  kabuto: (s) => `<g><path d="M${f(-s * 0.9)},${f(s * 0.5)} L0,${f(-s * 0.7)} L${f(s * 0.9)},${f(s * 0.5)} Z" fill="#cfe0ea" stroke="#9fbdd0" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.6)},${f(-s * 0.2)} L${f(-s * 0.9)},${f(-s * 0.8)} M${f(s * 0.6)},${f(-s * 0.2)} L${f(s * 0.9)},${f(-s * 0.8)}" stroke="#f6d55e" stroke-width="${f(s * 0.12)}" stroke-linecap="round"/><rect x="${f(-s * 0.95)}" y="${f(s * 0.4)}" width="${f(s * 1.9)}" height="${f(s * 0.3)}" rx="${f(s * 0.06)}" fill="#9fc5e8" stroke="#6f9fcb" stroke-width="${f(s * 0.05)}"/></g>`,
  kashiwa: (s) => `<g><ellipse cx="0" cy="0" rx="${f(s * 0.95)}" ry="${f(s * 0.6)}" fill="#9fcb72" stroke="#6f9a4f" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.8)},0 H${f(s * 0.8)}" stroke="#6f9a4f" stroke-width="${f(s * 0.05)}"/><ellipse cx="${f(s * 0.1)}" cy="${f(s * 0.1)}" rx="${f(s * 0.62)}" ry="${f(s * 0.38)}" fill="#fff6ea" stroke="#e6cfae" stroke-width="${f(s * 0.05)}"/></g>`,
  // 夏
  furin: (s, v = 0) => `<g><path d="M0,${f(-s)} V${f(-s * 0.45)}" stroke="#c99a62" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.45)},${f(s * 0.05)} Q${f(-s * 0.45)},${f(-s * 0.5)} 0,${f(-s * 0.5)} Q${f(s * 0.45)},${f(-s * 0.5)} ${f(s * 0.45)},${f(s * 0.05)} Z" fill="#e4f4f8" stroke="#9fc8cf" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.2)},${f(-s * 0.2)} q${f(s * 0.2)},${f(s * 0.12)} ${f(s * 0.4)},0" stroke="${['#f7a6a0', '#9fcb72', '#f6c84a'][v % 3]}" stroke-width="${f(s * 0.08)}" fill="none"/><path d="M0,${f(s * 0.05)} V${f(s * 0.35)}" stroke="#c99a62" stroke-width="${f(s * 0.04)}"/><rect x="${f(-s * 0.14)}" y="${f(s * 0.35)}" width="${f(s * 0.28)}" height="${f(s * 0.55)}" rx="${f(s * 0.04)}" fill="#fde3d6" stroke="#e7b98a" stroke-width="${f(s * 0.04)}"/></g>`,
  sunflower: (s) => `<g><path d="M0,${f(s * 0.4)} V${f(s)}" stroke="#86b25e" stroke-width="${f(s * 0.12)}"/>${Array.from({ length: 12 }, (_, k) => { const a = (k * 30 * Math.PI) / 180; const x = Math.cos(a) * s * 0.5; const y = Math.sin(a) * s * 0.5; return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.24)}" ry="${f(s * 0.11)}" fill="#f6c84a" transform="rotate(${k * 30} ${f(x)} ${f(y)})"/>`; }).join('')}<circle r="${f(s * 0.32)}" fill="#c99a62"/><circle r="${f(s * 0.2)}" fill="#a7744a" opacity="0.6"/></g>`,
  suika: (s) => `<g transform="rotate(-10)"><path d="M${f(-s)},0 A${f(s)},${f(s)} 0 0 0 ${f(s)},0 Z" fill="#9fcb72"/><path d="M${f(-s * 0.86)},0 A${f(s * 0.86)},${f(s * 0.86)} 0 0 0 ${f(s * 0.86)},0 Z" fill="#fff6e4"/><path d="M${f(-s * 0.76)},0 A${f(s * 0.76)},${f(s * 0.76)} 0 0 0 ${f(s * 0.76)},0 Z" fill="#f4908a"/>${[-0.4, 0, 0.4].map((x) => `<ellipse cx="${f(x * s)}" cy="${f(s * 0.3)}" rx="${f(s * 0.05)}" ry="${f(s * 0.09)}" fill="#5a3e2e"/>`).join('')}</g>`,
  uchiwa: (s, v = 0) => `<g transform="rotate(-15)"><rect x="${f(-s * 0.08)}" y="${f(s * 0.3)}" width="${f(s * 0.16)}" height="${f(s * 0.7)}" rx="${f(s * 0.06)}" fill="#c99a62"/><circle cx="0" cy="${f(-s * 0.2)}" r="${f(s * 0.6)}" fill="${['#cfe0ea', '#fde3d6', '#e4efd2'][v % 3]}" stroke="#9fbdd0" stroke-width="${f(s * 0.06)}"/>${M.sakuraFlower(s * 0.25, v).replace('<g>', `<g transform="translate(${f(s * 0.15)} ${f(-s * 0.3)})">`)}</g>`,
  kakigori: (s) => `<g><path d="M${f(-s * 0.7)},${f(s * 0.1)} H${f(s * 0.7)} L${f(s * 0.4)},${f(s * 0.7)} H${f(-s * 0.4)} Z" fill="#cfe8f2" stroke="#9fc8cf" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.7)},${f(s * 0.1)} Q${f(-s * 0.6)},${f(-s * 0.8)} 0,${f(-s * 0.8)} Q${f(s * 0.6)},${f(-s * 0.8)} ${f(s * 0.7)},${f(s * 0.1)} Z" fill="#ffffff" stroke="#d3e1ea" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.55)},${f(-s * 0.1)} Q0,${f(-s * 0.9)} ${f(s * 0.5)},${f(-s * 0.2)} Q0,${f(-s * 0.4)} ${f(-s * 0.55)},${f(-s * 0.1)} Z" fill="#f7a6a0" opacity="0.85"/><path d="M${f(s * 0.3)},${f(-s * 0.6)} L${f(s * 0.7)},${f(-s * 1.0)}" stroke="#f6c84a" stroke-width="${f(s * 0.08)}" stroke-linecap="round"/></g>`,
  kingyo: (s, v = 0) => `<g><path d="M${f(s * 0.4)},0 L${f(s * 0.95)},${f(-s * 0.4)} Q${f(s * 0.75)},0 ${f(s * 0.95)},${f(s * 0.4)} Z" fill="#f7a6a0" opacity="0.8"/><ellipse cx="0" cy="0" rx="${f(s * 0.55)}" ry="${f(s * 0.35)}" fill="${['#f4908a', '#f6a24a'][v % 2]}" stroke="#e07a6c" stroke-width="${f(s * 0.05)}"/><circle cx="${f(-s * 0.3)}" cy="${f(-s * 0.08)}" r="${f(s * 0.06)}" fill="${C.ink}"/></g>`,
  kingyoBag: (s) => `<g><path d="M${f(-s * 0.15)},${f(-s)} Q0,${f(-s * 1.2)} ${f(s * 0.15)},${f(-s)}" stroke="#f7a6a0" stroke-width="${f(s * 0.08)}" fill="none"/><path d="M${f(-s * 0.2)},${f(-s * 0.85)} Q${f(-s * 0.85)},${f(s * 0.1)} ${f(-s * 0.4)},${f(s * 0.8)} H${f(s * 0.4)} Q${f(s * 0.85)},${f(s * 0.1)} ${f(s * 0.2)},${f(-s * 0.85)} Z" fill="#e4f4f8" stroke="#9fc8cf" stroke-width="${f(s * 0.05)}" opacity="0.95"/><path d="M${f(-s * 0.55)},${f(-s * 0.1)} H${f(s * 0.55)}" stroke="#9fc8cf" stroke-width="${f(s * 0.04)}"/>${M.kingyo(s * 0.45, 0).replace('<g>', `<g transform="translate(0 ${f(s * 0.3)})">`)}</g>`,
  tanzaku: (s, v = 0) => `<g transform="rotate(${(v % 3) * 6 - 6})"><path d="M0,${f(-s)} V${f(-s * 0.7)}" stroke="#c99a62" stroke-width="${f(s * 0.05)}"/><rect x="${f(-s * 0.22)}" y="${f(-s * 0.7)}" width="${f(s * 0.44)}" height="${f(s * 1.5)}" rx="${f(s * 0.05)}" fill="${['#fbd9e2', '#cfe0ea', '#fde3a6', '#e4efd2', '#ece2f4'][v % 5]}" stroke="#d9c3a1" stroke-width="${f(s * 0.04)}"/>${starShape(s * 0.28, '#ffffff', '#e6cfae').replace('<path', `<path transform="translate(0 ${f(-s * 0.35)})"`)}</g>`,
  sasa: (s) => `<g><path d="M${f(-s * 0.2)},${f(s)} Q0,0 ${f(s * 0.2)},${f(-s)}" stroke="#86b25e" stroke-width="${f(s * 0.1)}" fill="none"/>${[[-0.4, 0.4, -40], [0.35, 0, 30], [-0.3, -0.4, -30], [0.4, -0.7, 40]].map(([x, y, r]) => `<ellipse cx="${f(x * s)}" cy="${f(y * s)}" rx="${f(s * 0.35)}" ry="${f(s * 0.1)}" fill="#9fcb72" transform="rotate(${r} ${f(x * s)} ${f(y * s)})"/>`).join('')}${[[0.3, 0.45, 1], [-0.45, -0.1, 3]].map(([x, y, v]) => `<rect x="${f(x * s - s * 0.08)}" y="${f(y * s)}" width="${f(s * 0.16)}" height="${f(s * 0.45)}" fill="${['#fbd9e2', '#cfe0ea', '#fde3a6', '#ece2f4'][v % 4]}"/>`).join('')}</g>`,
  chochin: (s, v = 0) => `<g><path d="M0,${f(-s)} V${f(-s * 0.75)}" stroke="#9b5f3a" stroke-width="${f(s * 0.06)}"/><rect x="${f(-s * 0.25)}" y="${f(-s * 0.8)}" width="${f(s * 0.5)}" height="${f(s * 0.14)}" rx="${f(s * 0.04)}" fill="#9b5f3a"/><ellipse cx="0" cy="0" rx="${f(s * 0.55)}" ry="${f(s * 0.7)}" fill="${['#fff6e4', '#fde3d6'][v % 2]}" stroke="#e7b98a" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.52)},${f(-s * 0.2)} H${f(s * 0.52)} M${f(-s * 0.52)},${f(s * 0.2)} H${f(s * 0.52)}" stroke="${C.momiji}" stroke-width="${f(s * 0.1)}" opacity="0.8"/><rect x="${f(-s * 0.25)}" y="${f(s * 0.66)}" width="${f(s * 0.5)}" height="${f(s * 0.14)}" rx="${f(s * 0.04)}" fill="#9b5f3a"/></g>`,
  hanabi: (s, v = 0) => { const c = [C.momiji, '#9fc5e8', C.icho, C.rose, '#9fcb72'][v % 5]; return `<g>${Array.from({ length: 12 }, (_, k) => { const a = (k * 30 * Math.PI) / 180; return `<path d="M${f(Math.cos(a) * s * 0.25)},${f(Math.sin(a) * s * 0.25)} L${f(Math.cos(a) * s * 0.8)},${f(Math.sin(a) * s * 0.8)}" stroke="${c}" stroke-width="${f(s * 0.08)}" stroke-linecap="round"/><circle cx="${f(Math.cos(a) * s * 0.92)}" cy="${f(Math.sin(a) * s * 0.92)}" r="${f(s * 0.07)}" fill="${c}"/>`; }).join('')}<circle r="${f(s * 0.12)}" fill="#fff6c8"/></g>`; },
  yoyo: (s, v = 0) => `<g><path d="M0,${f(-s)} V${f(-s * 0.55)}" stroke="#d9c3a1" stroke-width="${f(s * 0.04)}"/><circle cx="0" cy="0" r="${f(s * 0.55)}" fill="${['#cfe0ea', '#fbd9e2', '#fde3a6'][v % 3]}" stroke="#d9c3a1" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.45)},${f(-s * 0.2)} q${f(s * 0.45)},${f(s * 0.3)} ${f(s * 0.9)},0 M${f(-s * 0.4)},${f(s * 0.25)} q${f(s * 0.4)},${f(s * 0.2)} ${f(s * 0.8)},0" stroke="${[C.momiji, '#6f9fcb', C.olive][v % 3]}" stroke-width="${f(s * 0.08)}" fill="none"/></g>`,
  globe: (s) => `<g><path d="M${f(-s * 0.6)},${f(-s * 0.4)} L${f(-s * 0.45)},${f(-s * 0.95)} L${f(-s * 0.15)},${f(-s * 0.62)} Z M${f(s * 0.6)},${f(-s * 0.4)} L${f(s * 0.45)},${f(-s * 0.95)} L${f(s * 0.15)},${f(-s * 0.62)} Z" fill="#f7b4a6" stroke="#e39a86" stroke-width="${f(s * 0.05)}"/><circle r="${f(s * 0.7)}" fill="#cfe8f2" stroke="#9fc8cf" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.4)},${f(-s * 0.3)} q${f(s * 0.2)},${f(-s * 0.2)} ${f(s * 0.35)},0 q${f(s * 0.1)},${f(s * 0.35)} ${f(-s * 0.25)},${f(s * 0.35)} Z M${f(s * 0.1)},${f(s * 0.1)} q${f(s * 0.3)},${f(-s * 0.15)} ${f(s * 0.45)},${f(s * 0.1)} q${f(-s * 0.05)},${f(s * 0.3)} ${f(-s * 0.35)},${f(s * 0.3)} Z" fill="#9fcb72"/></g>`,
  // 秋
  momijiBranch: (s) => `<g><path d="M${f(-s)},${f(s * 0.5)} Q0,${f(-s * 0.1)} ${f(s)},${f(-s * 0.5)}" stroke="#a77048" stroke-width="${f(s * 0.1)}" fill="none" stroke-linecap="round"/>${[[-0.55, 0.22, 0], [0, 0, 1], [0.55, -0.25, 2]].map(([x, y, k]) => autumnLeafAt(x * s, y * s - s * 0.12, s * 0.45, k)).join('')}</g>`,
  kaki: (s) => `<g>${persimmon(s * 0.9)}</g>`,
  donguri: (s) => `<g>${acorn(s * 0.7).replace('<g>', `<g transform="translate(${f(-s * 0.35)} ${f(s * 0.1)}) rotate(-15)">`)}${acorn(s * 0.6).replace('<g>', `<g transform="translate(${f(s * 0.4)} ${f(s * 0.15)}) rotate(15)">`)}</g>`,
  kinoko: (s) => `<g><rect x="${f(-s * 0.2)}" y="0" width="${f(s * 0.4)}" height="${f(s * 0.7)}" rx="${f(s * 0.15)}" fill="#fff6ea" stroke="#e6cfae" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.8)},${f(s * 0.05)} Q${f(-s * 0.7)},${f(-s * 0.7)} 0,${f(-s * 0.7)} Q${f(s * 0.7)},${f(-s * 0.7)} ${f(s * 0.8)},${f(s * 0.05)} Z" fill="#f4908a" stroke="#e07a6c" stroke-width="${f(s * 0.05)}"/>${[[-0.35, -0.25], [0.2, -0.4], [0.45, -0.1]].map(([x, y]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.1)}" fill="#ffffff"/>`).join('')}</g>`,
  susuki: (s) => `<g>${[[-0.3, 0], [0, -0.15], [0.3, 0.05]].map(([x, y]) => `<path d="M${f(x * s)},${f(s)} Q${f(x * s)},${f(y * s)} ${f(x * s + s * 0.2)},${f(-s * 0.8)}" stroke="#c9a670" stroke-width="${f(s * 0.06)}" fill="none"/><path d="M${f(x * s + s * 0.2)},${f(-s * 0.8)} q${f(-s * 0.05)},${f(s * 0.3)} ${f(-s * 0.12)},${f(s * 0.55)}" stroke="#e9d3a8" stroke-width="${f(s * 0.16)}" fill="none" stroke-linecap="round"/>`).join('')}</g>`,
  tsukimiDango: (s) => `<g><path d="M${f(-s * 0.8)},${f(s * 0.7)} H${f(s * 0.8)} L${f(s * 0.6)},${f(s)} H${f(-s * 0.6)} Z" fill="#e9c591" stroke="#b98a52" stroke-width="${f(s * 0.05)}"/>${[[-0.4, 0.45], [0, 0.45], [0.4, 0.45], [-0.2, 0.1], [0.2, 0.1], [0, -0.25]].map(([x, y]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.22)}" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.04)}"/>`).join('')}</g>`,
  moon: (s) => `<g><circle r="${f(s * 0.8)}" fill="#fff3b8" stroke="#f1d27a" stroke-width="${f(s * 0.05)}"/><circle cx="${f(-s * 0.25)}" cy="${f(-s * 0.2)}" r="${f(s * 0.12)}" fill="#f6e39a" opacity="0.7"/><circle cx="${f(s * 0.2)}" cy="${f(s * 0.25)}" r="${f(s * 0.16)}" fill="#f6e39a" opacity="0.7"/></g>`,
  usagiMoon: (s) => `<g>${M.moon(s)}<g transform="translate(${f(s * 0.1)} ${f(s * 0.15)})"><ellipse cx="0" cy="${f(s * 0.12)}" rx="${f(s * 0.32)}" ry="${f(s * 0.24)}" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.04)}"/><ellipse cx="${f(-s * 0.1)}" cy="${f(-s * 0.25)}" rx="${f(s * 0.07)}" ry="${f(s * 0.2)}" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.03)}"/><ellipse cx="${f(s * 0.06)}" cy="${f(-s * 0.25)}" rx="${f(s * 0.07)}" ry="${f(s * 0.2)}" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.03)}"/><circle cx="${f(-s * 0.15)}" cy="${f(s * 0.05)}" r="${f(s * 0.03)}" fill="${C.momiji}"/></g></g>`,
  koban: (s, v = 0) => `<g transform="rotate(${(v % 3) * 10 - 10})"><ellipse rx="${f(s * 0.55)}" ry="${f(s * 0.8)}" fill="#f6d55e" stroke="#d9b04d" stroke-width="${f(s * 0.07)}"/>${[-0.45, -0.15, 0.15, 0.45].map((y) => `<path d="M${f(-s * 0.35)},${f(y * s)} H${f(s * 0.35)}" stroke="#e8c247" stroke-width="${f(s * 0.06)}"/>`).join('')}<ellipse cx="${f(-s * 0.18)}" cy="${f(-s * 0.4)}" rx="${f(s * 0.1)}" ry="${f(s * 0.18)}" fill="#ffffff" opacity="0.5"/></g>`,
  maneki: (s) => `<g><ellipse cx="0" cy="${f(s * 0.45)}" rx="${f(s * 0.55)}" ry="${f(s * 0.45)}" fill="#ffffff" stroke="#c9a670" stroke-width="${f(s * 0.06)}"/><path d="M${f(s * 0.35)},${f(s * 0.2)} Q${f(s * 0.7)},${f(-s * 0.1)} ${f(s * 0.6)},${f(-s * 0.55)}" stroke="#ffffff" stroke-width="${f(s * 0.24)}" fill="none" stroke-linecap="round"/><path d="M${f(s * 0.35)},${f(s * 0.2)} Q${f(s * 0.7)},${f(-s * 0.1)} ${f(s * 0.6)},${f(-s * 0.55)}" stroke="#c9a670" stroke-width="${f(s * 0.05)}" fill="none"/>`
    + `<circle cx="0" cy="${f(-s * 0.2)}" r="${f(s * 0.45)}" fill="#ffffff" stroke="#c9a670" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.4)},${f(-s * 0.4)} L${f(-s * 0.32)},${f(-s * 0.75)} L${f(-s * 0.1)},${f(-s * 0.58)} Z M${f(s * 0.4)},${f(-s * 0.4)} L${f(s * 0.32)},${f(-s * 0.75)} L${f(s * 0.1)},${f(-s * 0.58)} Z" fill="#ffffff" stroke="#c9a670" stroke-width="${f(s * 0.05)}"/>`
    + `<path d="M${f(-s * 0.2)},${f(-s * 0.2)} q${f(s * 0.06)},${f(-s * 0.08)} ${f(s * 0.12)},0 M${f(s * 0.08)},${f(-s * 0.2)} q${f(s * 0.06)},${f(-s * 0.08)} ${f(s * 0.12)},0" stroke="${C.ink}" stroke-width="${f(s * 0.05)}" fill="none" stroke-linecap="round"/><path d="M${f(-s * 0.3)},${f(s * 0.1)} H${f(s * 0.3)}" stroke="${C.momiji}" stroke-width="${f(s * 0.1)}"/><circle cx="0" cy="${f(s * 0.2)}" r="${f(s * 0.1)}" fill="#f6d55e"/>${M.koban(s * 0.25).replace('<g ', `<g transform="translate(${f(-s * 0.15)} ${f(s * 0.5)})"><g `)}</g></g>`,
  pumpkin: (s, v = 0) => `<g><path d="M0,${f(-s * 0.55)} q${f(s * 0.05)},${f(-s * 0.3)} ${f(s * 0.25)},${f(-s * 0.35)}" stroke="#86a256" stroke-width="${f(s * 0.12)}" fill="none" stroke-linecap="round"/>${[[-0.42, 0.42], [0.42, 0.42], [0, 0.5]].map(([x, rx]) => `<ellipse cx="${f(x * s)}" cy="${f(s * 0.05)}" rx="${f(rx * s)}" ry="${f(s * 0.6)}" fill="${['#f6a24a', '#f8b15c'][v % 2]}" stroke="#e08a30" stroke-width="${f(s * 0.05)}"/>`).join('')}<path d="M${f(-s * 0.3)},${f(-s * 0.05)} l${f(s * 0.12)},${f(-s * 0.15)} l${f(s * 0.12)},${f(s * 0.15)} Z M${f(s * 0.06)},${f(-s * 0.05)} l${f(s * 0.12)},${f(-s * 0.15)} l${f(s * 0.12)},${f(s * 0.15)} Z" fill="#fff3b8"/><path d="M${f(-s * 0.3)},${f(s * 0.25)} q${f(s * 0.3)},${f(s * 0.2)} ${f(s * 0.6)},0" stroke="#fff3b8" stroke-width="${f(s * 0.08)}" fill="none" stroke-linecap="round"/></g>`,
  ghost: (s) => `<g><path d="M${f(-s * 0.55)},${f(s * 0.6)} V${f(-s * 0.1)} Q${f(-s * 0.55)},${f(-s * 0.75)} 0,${f(-s * 0.75)} Q${f(s * 0.55)},${f(-s * 0.75)} ${f(s * 0.55)},${f(-s * 0.1)} V${f(s * 0.6)} L${f(s * 0.32)},${f(s * 0.42)} L${f(s * 0.1)},${f(s * 0.62)} L${f(-s * 0.12)},${f(s * 0.42)} L${f(-s * 0.34)},${f(s * 0.62)} Z" fill="#ffffff" stroke="#cdbfe0" stroke-width="${f(s * 0.06)}" stroke-linejoin="round"/><circle cx="${f(-s * 0.18)}" cy="${f(-s * 0.2)}" r="${f(s * 0.07)}" fill="${C.ink}"/><circle cx="${f(s * 0.18)}" cy="${f(-s * 0.2)}" r="${f(s * 0.07)}" fill="${C.ink}"/><ellipse cx="0" cy="${f(s * 0.02)}" rx="${f(s * 0.1)}" ry="${f(s * 0.07)}" fill="#f4a3b4"/></g>`,
  candy: (s, v = 0) => { const c = ['#f4a3b4', '#cdbfe0', '#f6c84a', '#9fcb72'][v % 4]; return `<g transform="rotate(${(v % 3) * 15 - 15})"><path d="M${f(-s * 0.9)},${f(-s * 0.35)} L${f(-s * 0.4)},0 L${f(-s * 0.9)},${f(s * 0.35)} Z M${f(s * 0.9)},${f(-s * 0.35)} L${f(s * 0.4)},0 L${f(s * 0.9)},${f(s * 0.35)} Z" fill="${c}" stroke="#d9c3a1" stroke-width="${f(s * 0.04)}"/><circle r="${f(s * 0.42)}" fill="${c}" stroke="#d9c3a1" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.25)},${f(-s * 0.3)} L${f(s * 0.25)},${f(s * 0.3)}" stroke="#ffffff" stroke-width="${f(s * 0.1)}" opacity="0.7"/></g>`; },
  witchHat: (s) => `<g><ellipse cx="0" cy="${f(s * 0.5)}" rx="${f(s * 0.95)}" ry="${f(s * 0.25)}" fill="#cdbfe0" stroke="#a98cc9" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.5)},${f(s * 0.45)} L${f(s * 0.1)},${f(-s)} Q${f(s * 0.25)},${f(-s * 0.6)} ${f(s * 0.5)},${f(s * 0.45)} Z" fill="#cdbfe0" stroke="#a98cc9" stroke-width="${f(s * 0.06)}" stroke-linejoin="round"/><path d="M${f(-s * 0.45)},${f(s * 0.3)} Q0,${f(s * 0.45)} ${f(s * 0.48)},${f(s * 0.3)}" stroke="#f6c84a" stroke-width="${f(s * 0.12)}" fill="none"/></g>`,
});
// 秋の葉（もみじの枝の中で使う）
function autumnLeafAt(x, y, s, k) {
  const col = [[C.momiji, C.momijiDeep], [C.icho, C.ichoDeep], [C.kaki, C.kakiDeep]][k % 3];
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${k * 35 - 20})">${k === 1 ? ginkgoLeaf(col[0], col[1], s) : mapleLeaf(col[0], col[1], s)}</g>`;
}

Object.assign(TOPS, {
  haru: [() => strip('sakuraFlower', 10, 9, '#c99a62', 6), () => strip('butterfly', 7, 9, '#c9d9a8'), () => strip('tulip', 9, 10, '#86b25e')],
  hinamatsuri: [() => strip('bonbori', 7, 11), () => strip('sakuraFlower', 11, 8, '#e3a3b8'), () => strip('hishimochi', 7, 10)],
  hanami: [() => strip('sakuraFlower', 12, 9, '#c99a62', 4), () => strip('chochin', 7, 11), () => strip('dango', 9, 10)],
  kodomonohi: [() => strip('koinobori', 5, 16, '#c99a62', 4), () => strip('kabuto', 7, 10), () => strip('koinobori', 6, 13, '#9fbdd0', 4)],
  natsu: [() => strip('furin', 7, 12), () => strip('sunflower', 8, 10, '#86b25e'), () => strip('uchiwa', 7, 11)],
  tanabata: [() => strip('tanzaku', 11, 11), () => strip('star', 11, 9, '#c9d9e4'), () => strip('tanzaku', 9, 12, '#86b25e')],
  natsumatsuri: [() => strip('chochin', 8, 11), () => strip('hanabi', 6, 13, 'none'), () => strip('yoyo', 8, 10)],
  sekainekonohi: [() => strip('paw', 10, 9), () => `<g transform="translate(330 30)">${M.globe(24)}</g>` + strip('paw', 6, 8), () => strip('fishCookie', 7, 10)],
  aki: [() => `<g transform="translate(70 26)">${M.momijiBranch(40)}</g><g transform="translate(330 22) scale(-1 1)">${M.momijiBranch(32)}</g>`, () => strip('donguri', 8, 10), () => strip('kaki', 8, 9, '#a77048')],
  otsukimi: [() => `<g transform="translate(330 28)">${M.usagiMoon(26)}</g>` + `<g transform="translate(50 30)">${M.susuki(26)}</g>`, () => strip('tsukimiDango', 6, 11), () => `<g transform="translate(60 28)">${M.moon(22)}</g>` + strip('susuki', 5, 10, 'none')],
  manekinekonohi: [() => strip('koban', 11, 9), () => strip('maneki', 6, 11), () => strip('suzu', 8, 10)],
  halloween: [() => strip('pumpkin', 8, 10, '#a98cc9'), () => strip('candy', 10, 9, '#a98cc9'), () => strip('ghost', 7, 11, '#cdbfe0')],
});
Object.assign(CORNERS, {
  haru: ['tulip', 'butterfly', 'dango', 'sakuraFlower'],
  hinamatsuri: ['hina', 'hishimochi', 'bonbori', 'sakuraFlower'],
  hanami: ['dango', 'chochin', 'sakuraFlower', 'butterfly'],
  kodomonohi: ['kabuto', 'kashiwa', 'koinobori', 'tulip'],
  natsu: ['sunflower', 'suika', 'kakigori', 'furin', 'uchiwa'],
  tanabata: ['sasa', 'tanzaku', 'star', 'uchiwa'],
  natsumatsuri: ['kingyoBag', 'yoyo', 'chochin', 'uchiwa', 'hanabi'],
  sekainekonohi: ['globe', 'fishCookie', 'suzu', 'paw'],
  aki: ['kaki', 'donguri', 'kinoko', 'momijiBranch'],
  otsukimi: ['tsukimiDango', 'susuki', 'usagiMoon', 'moon'],
  manekinekonohi: ['maneki', 'koban', 'suzu', 'paw'],
  halloween: ['pumpkin', 'ghost', 'candy', 'witchHat'],
});

// ---- 特別な絵（行事ごとに数本のゲームだけ、そのゲームのために描いた絵：依頼者が決めた「ウ」） ----
// 64×64 の角に置く絵は、中心 (32, 34)・大きさ 22 くらい。上の帯は 390×64
const cal = (text) => `<g transform="translate(32 34)"><rect x="-22" y="-22" width="44" height="44" rx="6" fill="#fffaf0" stroke="#d9b98e" stroke-width="2"/><rect x="-22" y="-22" width="44" height="12" rx="6" fill="${C.momiji}"/><rect x="-22" y="-16" width="44" height="6" fill="${C.momiji}"/>${[-12, 0, 12].map((x) => `<circle cx="${x}" cy="-22" r="2.5" fill="#fffaf0" stroke="#c99a62" stroke-width="1"/>`).join('')}<text x="0" y="7" font-size="${text.length > 3 ? 13 : 16}" font-weight="700" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${text}</text></g>`;
const at = (x, y, inner) => `<g transform="translate(${x} ${y})">${inner}</g>`;
const SP = {
  // クリスマス：つりぼり＝サンタの ぼうしの さかな、タワー＝プレゼントの塔、レース＝毛糸玉の オーナメント
  santaFish: () => at(32, 36, `<path d="M8,0 L20,-9 L20,9 Z" fill="#e08d7c"/><ellipse cx="0" cy="0" rx="14" ry="9" fill="#f7b5a6" stroke="#e08d7c" stroke-width="1.6"/><circle cx="-7" cy="-2" r="1.8" fill="${C.ink}"/><path d="M-12,-7 Q-6,-26 8,-20 L2,-8 Z" fill="${C.momiji}"/><circle cx="9" cy="-21" r="3.5" fill="#ffffff"/><path d="M-14,-7 Q-4,-11 4,-7" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  presentTower: () => at(32, 34, [[0, 16, 13, 0], [-2, 0, 10, 1], [1, -14, 8, 3]].map(([x, y, s, v]) => `<g transform="translate(${x} ${y})">${M.present(s, v)}</g>`).join('') + `<g transform="translate(1 -26)">${starShape(9)}</g>`),
  yarnOrnament: () => strip('yarnBall', 9, 9, '#86a256', 4),
  yarnBall: (s, v = 0) => { const c = [['#f4a7a3', '#d97f7a'], ['#9fc5e8', '#6f9fcb'], ['#f3d36b', '#d4b043'], ['#c6dfae', '#97b878']][v % 4]; return `<g><circle r="${f(s * 0.7)}" fill="${c[0]}" stroke="${c[1]}" stroke-width="${f(s * 0.07)}"/><path d="M${f(-s * 0.6)},${f(-s * 0.15)} Q0,${f(-s * 0.6)} ${f(s * 0.6)},${f(-s * 0.15)} M${f(-s * 0.6)},${f(s * 0.2)} Q0,${f(-s * 0.2)} ${f(s * 0.6)},${f(s * 0.2)}" stroke="${c[1]}" stroke-width="${f(s * 0.06)}" fill="none" opacity="0.8"/><path d="M0,${f(-s * 0.7)} V${f(-s)}" stroke="#c99a62" stroke-width="${f(s * 0.06)}"/></g>`; },
  // 大みそか：ねがえり＝こたつ、めくり＝12/31 のカレンダー
  kotatsu: () => at(32, 36, `<rect x="-24" y="-6" width="48" height="20" rx="4" fill="#f7c4b4" stroke="#e39a86" stroke-width="2"/><path d="M-24,4 H24" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 4"/><rect x="-26" y="-10" width="52" height="6" rx="2" fill="#c99a62"/><g transform="translate(14 -16)">${M.mikan(7)}</g>`),
  cal1231: () => cal('12/31'),
  // お正月：すごろく＝ふくわらいの猫、おみくじ＝大吉の おみくじの列、つりぼり＝たい
  fukuwarai: () => at(32, 34, `<ellipse cx="0" cy="0" rx="22" ry="20" fill="#fff6ea" stroke="#d9c3a1" stroke-width="2"/><path d="M-18,-12 L-14,-26 L-6,-16 Z M18,-12 L14,-26 L6,-16 Z" fill="#fff6ea" stroke="#d9c3a1" stroke-width="2"/><path d="M-12,-6 q4,-4 8,0" stroke="${C.ink}" stroke-width="2.2" fill="none" stroke-linecap="round" transform="rotate(-15 -8 -6)"/><path d="M5,-2 q4,-4 8,0" stroke="${C.ink}" stroke-width="2.2" fill="none" stroke-linecap="round" transform="rotate(20 9 -2)"/><path d="M-2,6 h5 l-2.5,3 Z" fill="${C.nose}" transform="translate(4 2)"/><path d="M-6,12 q4,4 8,0" stroke="${C.ink}" stroke-width="2" fill="none" transform="translate(-3 0)"/>`),
  omikujiStrip: () => `<path d="M-6,4 H396" stroke="#c99a62" stroke-width="2.5"/>` + Array.from({ length: 12 }, (_, k) => `<g transform="translate(${16 + k * 33} 4) rotate(${(k % 3) * 8 - 8})"><rect x="-6" y="0" width="12" height="26" rx="2" fill="#fffaf0" stroke="#d9c3a1" stroke-width="1.2"/><path d="M-6,6 H6" stroke="${C.momiji}" stroke-width="1.5"/>${k % 3 === 0 ? `<text x="0" y="16" font-size="7" font-weight="700" fill="${C.momiji}" text-anchor="middle" dominant-baseline="central">大吉</text>` : ''}</g>`).join(''),
  tai: () => at(32, 36, `<path d="M14,0 L26,-10 L24,0 L26,10 Z" fill="#f08a8a"/><path d="M-22,0 Q-8,-18 14,-6 L14,6 Q-8,18 -22,0 Z" fill="#f7a6a0" stroke="#e07a6c" stroke-width="1.8"/><path d="M-4,-12 L2,-18 L8,-10" fill="#f08a8a"/><circle cx="-14" cy="-2" r="2" fill="${C.ink}"/><path d="M-6,-6 q4,6 0,12" stroke="#e07a6c" stroke-width="1.4" fill="none"/>`),
  // 節分：おとし＝鬼の つのの猫、まとあて＝鬼の まとの列
  oniCat: () => at(32, 36, `<ellipse cx="0" cy="2" rx="18" ry="16" fill="#e8e6e9" stroke="#5f6b75" stroke-width="2"/><path d="M-15,-6 L-12,-22 L-4,-12 Z M15,-6 L12,-22 L4,-12 Z" fill="#e8e6e9" stroke="#5f6b75" stroke-width="2"/><path d="M-7,-13 L-4,-26 L0,-14 Z M7,-13 L4,-26 L0,-14" fill="#f6d55e" stroke="#d9b04d" stroke-width="1.5"/><path d="M-8,0 q3,-3 6,0 M2,0 q3,-3 6,0" stroke="${C.ink}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-3,7 h6 l-3,3 Z" fill="${C.nose}"/><ellipse cx="-11" cy="6" rx="4" ry="2.5" fill="#f59a8a" opacity="0.6"/><ellipse cx="11" cy="6" rx="4" ry="2.5" fill="#f59a8a" opacity="0.6"/>`),
  oniTarget: () => Array.from({ length: 7 }, (_, k) => `<g transform="translate(${30 + k * 55} 22)"><circle r="15" fill="#ffffff" stroke="${C.momiji}" stroke-width="2.5"/><circle r="9" fill="#fde3d6"/>${M.oni(7, k % 2).replace('<g>', '<g transform="translate(0 1)">')}</g>`).join(''),
  // バレンタイン：ひだまり＝ハートの ざぶとん、さがし＝チョコの箱
  heartCushion: () => at(32, 38, `<g transform="scale(1.1)">${heartShape(30, '#fbd9e2', '#e3a3b8')}</g><path d="M-12,-2 q12,8 24,0" stroke="#ffffff" stroke-width="2" stroke-dasharray="3 3" fill="none"/>`),
  chocoBox: () => at(32, 36, `<path d="M0,18 C-30,4 -20,-22 0,-10 C20,-22 30,4 0,18 Z" fill="#f4a3b4" stroke="#e07a92" stroke-width="2"/>${[[-8, -4], [6, -4], [-1, 6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#b98a6a" stroke="#9b6a4a" stroke-width="1"/>`).join('')}<path d="M-14,-16 L0,-10 L14,-16" stroke="#fde3a6" stroke-width="3" fill="none"/>`),
  // 猫の日：めくり＝2/22 のカレンダー、ルーレット＝にゃんにゃんにゃんの帯
  cal222: () => cal('2/22'),
  nyanStrip: () => strip('paw', 6, 8) + `<g transform="translate(195 30)"><rect x="-74" y="-11" width="148" height="22" rx="11" fill="#fffaf0" stroke="#e3a3b8" stroke-width="2"/><text x="0" y="0" font-size="13" font-weight="700" fill="#d97f9a" text-anchor="middle" dominant-baseline="central">にゃん にゃん にゃん</text></g>`,
  // ひな祭り：タワー＝ひなだん、めくり＝3/3
  hinaDan: () => at(32, 38, `${[[-24, 8, 48], [-18, -2, 36], [-12, -12, 24]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="10" fill="#f7a6a0" stroke="#e08d7c" stroke-width="1.5"/>`).join('')}<g transform="translate(0 -20) scale(0.4)">${M.hina(22)}</g>`),
  cal33: () => cal('3/3'),
  // 花見：ひだまり＝お花見の しきもの、とびいし＝川に かかる さくらの枝
  picnic: () => at(32, 40, `<path d="M-28,8 L-18,-10 H18 L28,8 Z" fill="#cfe0ea" stroke="#9fbdd0" stroke-width="1.5"/><path d="M-23,-1 H23 M-6,-10 L-10,8 M6,-10 L10,8" stroke="#ffffff" stroke-width="2"/><rect x="-10" y="-12" width="18" height="10" rx="2" fill="#f7c4b4" stroke="#e39a86" stroke-width="1.5"/><g transform="translate(14 -14) scale(0.6)">${M.dango(14)}</g>`),
  sakuraOverRiver: () => `<path d="M-10,8 Q120,40 250,18" stroke="#a77048" stroke-width="5" fill="none" stroke-linecap="round"/>` + Array.from({ length: 9 }, (_, k) => `<g transform="translate(${10 + k * 28} ${16 + Math.sin(k) * 8 + k * 1.2})">${M.sakuraFlower(9, k)}</g>`).join(''),
  // こどもの日：レース＝こいのぼりの さお、タワー＝かぶとの箱
  koinoboriPole: () => `<path d="M24,0 V64" stroke="#c99a62" stroke-width="4"/><circle cx="24" cy="4" r="4" fill="${C.icho}"/>` + [0, 1, 2].map((k) => `<g transform="translate(${70 + k * 70} ${14 + k * 15})">${M.koinobori(22 - k * 3, k)}</g>`).join(''),
  kabutoBox: () => at(32, 36, `<g transform="translate(0 12)">${M.present(14, 1)}</g><g transform="translate(0 -12)">${M.kabuto(14)}</g>`),
  // 七夕：めくり＝7/7、とびいし＝天の川（明るい星の川）
  cal77: () => cal('7/7'),
  milkyWay: () => `<path d="M-10,40 Q195,-10 400,30" stroke="#e4f0fa" stroke-width="22" fill="none" opacity="0.9"/>` + Array.from({ length: 16 }, (_, k) => `<g transform="translate(${10 + k * 25} ${30 - Math.sin((k / 15) * Math.PI) * 18 + (k % 3) * 4})">${starShape(k % 4 === 0 ? 9 : 5, [C.icho, '#fde3a6', '#ffffff'][k % 3], C.ichoDeep)}</g>`).join(''),
  // 夏祭り：つりぼり＝きんぎょすくいの ポイ、わなげ＝ねこの お面
  poi: () => at(32, 34, `<path d="M8,10 L24,26" stroke="#f6c84a" stroke-width="5" stroke-linecap="round"/><circle cx="-2" cy="0" r="16" fill="#fffaf0" stroke="#f6c84a" stroke-width="4"/><circle cx="-2" cy="0" r="12" fill="#e4f4f8" opacity="0.9"/>${M.kingyo(8, 0).replace('<g>', '<g transform="translate(-2 2)">')}`),
  nekoMask: () => at(32, 36, `<path d="M-20,-6 L-17,-24 L-6,-14 Z M20,-6 L17,-24 L6,-14 Z" fill="#ffffff" stroke="#e39a86" stroke-width="2"/><ellipse cx="0" cy="2" rx="22" ry="18" fill="#ffffff" stroke="#e39a86" stroke-width="2"/><path d="M-12,-2 q4,-5 8,0 M4,-2 q4,-5 8,0" stroke="${C.ink}" stroke-width="2" fill="none"/><path d="M-3,6 h6 l-3,3 Z" fill="${C.nose}"/><path d="M-20,8 q-6,2 -10,0 M20,8 q6,2 10,0" stroke="#e39a86" stroke-width="1.5"/><path d="M-14,-12 q6,-4 10,0" stroke="${C.momiji}" stroke-width="3" fill="none"/>`),
  // 世界猫の日：ひだまり＝猫の形の ケーキ、おみくじ＝ねこの地球
  catCake: () => at(32, 38, `<rect x="-20" y="-6" width="40" height="20" rx="4" fill="#fff4e0" stroke="#e6cfae" stroke-width="2"/><path d="M-20,-2 H20" stroke="#f7c4b4" stroke-width="4"/><path d="M-16,-6 L-12,-20 L-4,-10 Z M16,-6 L12,-20 L4,-10 Z" fill="#fff4e0" stroke="#e6cfae" stroke-width="2"/><circle cx="-6" cy="-12" r="2" fill="#f08a8a"/><circle cx="0" cy="-15" r="2" fill="#f6c84a"/><circle cx="6" cy="-12" r="2" fill="#9fcb72"/>`),
  bigGlobe: () => at(32, 36, M.globe(24)),
  // お月見：とびいし＝月と、とぶ うさぎ、ねがえり＝ねむる うさぎ
  moonRabbitTop: () => `<g transform="translate(320 30)">${M.moon(24)}</g>` + [0, 1, 2].map((k) => `<g transform="translate(${60 + k * 70} ${34 - (k % 2) * 10})"><ellipse cx="0" cy="4" rx="10" ry="7" fill="#ffffff" stroke="#e6cfae" stroke-width="1.5"/><ellipse cx="-4" cy="-6" rx="2.5" ry="7" fill="#ffffff" stroke="#e6cfae" stroke-width="1.2" transform="rotate(-20 -4 -6)"/><ellipse cx="2" cy="-6" rx="2.5" ry="7" fill="#ffffff" stroke="#e6cfae" stroke-width="1.2"/><circle cx="-6" cy="2" r="1.2" fill="${C.momiji}"/></g>`).join(''),
  sleepRabbit: () => at(32, 38, `<ellipse cx="0" cy="4" rx="20" ry="12" fill="#ffffff" stroke="#e6cfae" stroke-width="2"/><ellipse cx="-12" cy="-6" rx="4" ry="12" fill="#ffffff" stroke="#e6cfae" stroke-width="1.6" transform="rotate(-70 -12 -6)"/><path d="M-12,2 q3,2 6,0" stroke="${C.ink}" stroke-width="1.6" fill="none"/><text x="14" y="-12" font-size="10" font-weight="700" fill="${C.chestnut}">z</text>`),
  // 招き猫の日：おみくじ＝大きな招き猫、ルーレット＝小判の山
  bigManeki: () => at(32, 34, M.maneki(24)),
  kobanPile: () => at(32, 38, [[-10, 6], [10, 6], [0, -6]].map(([x, y], k) => `<g transform="translate(${x} ${y})">${M.koban(12, k)}</g>`).join('')),
  // ハロウィン：さがし＝かぼちゃの箱の猫、おとし＝おかしの ボウル
  pumpkinCat: () => at(32, 38, `${M.pumpkin(22, 0)}<g transform="translate(0 -18)"><path d="M-10,6 L-8,-6 L-2,0 Z M10,6 L8,-6 L2,0 Z" fill="#e8e6e9" stroke="#5f6b75" stroke-width="1.5"/><ellipse cx="0" cy="6" rx="11" ry="8" fill="#e8e6e9" stroke="#5f6b75" stroke-width="1.5"/><circle cx="-4" cy="5" r="1.5" fill="${C.ink}"/><circle cx="4" cy="5" r="1.5" fill="${C.ink}"/></g>`),
  candyBowl: () => at(32, 38, `<path d="M-24,-2 H24 Q22,18 0,18 Q-22,18 -24,-2 Z" fill="#cdbfe0" stroke="#a98cc9" stroke-width="2"/>${[[-12, -6, 0], [0, -10, 1], [12, -6, 2]].map(([x, y, v]) => `<g transform="translate(${x} ${y}) scale(0.6)">${M.candy(12, v)}</g>`).join('')}`),
};
Object.assign(M, { yarnBall: SP.yarnBall });
// 行事ごとの特別な絵：{ ゲーム: { top / bl / br: 絵の名前 } }
const SPECIAL = {
  christmas: { tsuri: { br: 'santaFish' }, tower: { bl: 'presentTower' }, race: { top: 'yarnOrnament' } },
  omisoka: { negaeri: { br: 'kotatsu' }, mekuri: { br: 'cal1231' } },
  oshogatsu: { sugoroku: { br: 'fukuwarai' }, kuji: { top: 'omikujiStrip' }, tsuri: { bl: 'tai' } },
  setsubun: { otoshi: { br: 'oniCat' }, mato: { top: 'oniTarget' } },
  valentine: { hidamari: { br: 'heartCushion' }, sagasu: { bl: 'chocoBox' } },
  nekonohi: { mekuri: { br: 'cal222' }, roulette: { top: 'nyanStrip' } },
  hinamatsuri: { tower: { bl: 'hinaDan' }, mekuri: { br: 'cal33' } },
  hanami: { hidamari: { br: 'picnic' }, tobiishi: { top: 'sakuraOverRiver' } },
  kodomonohi: { race: { top: 'koinoboriPole' }, tower: { bl: 'kabutoBox' } },
  tanabata: { mekuri: { br: 'cal77' }, tobiishi: { top: 'milkyWay' } },
  natsumatsuri: { tsuri: { br: 'poi' }, wanage: { bl: 'nekoMask' } },
  sekainekonohi: { hidamari: { br: 'catCake' }, kuji: { bl: 'bigGlobe' } },
  otsukimi: { tobiishi: { top: 'moonRabbitTop' }, negaeri: { br: 'sleepRabbit' } },
  manekinekonohi: { kuji: { br: 'bigManeki' }, roulette: { bl: 'kobanPile' } },
  halloween: { sagasu: { br: 'pumpkinCat' }, otoshi: { bl: 'candyBowl' } },
};

// 画面ごとの番号（並びを ずらして、ゲームごとに ちがう組み合わせにする）
const KINDS = ['home', 'roulette', 'saikoro', 'stamp', 'mekuri', 'nobi', 'tower', 'hana', 'negaeri', 'hidamari', 'kuji', 'sagasu', 'amida', 'maigo', 'race', 'mato', 'wanage', 'sugoroku', 'tobiishi', 'otoshi', 'tsuri', 'crane', 'gacha', 'kanransha', 'shabon', 'jarashi', 'bowling', 'hikoki', 'watage', 'himo', 'hyokkori', 'yubin', 'daruma', 'settings'];

// 飾りの3つの場所の絵（SVG の中身）。季節の飾り（いまは冬）と、行事の飾り（いまは12〜2月の行事）。無い時は空
export function decorLayers(kind, lk) {
  const key = TOPS[lk.event] ? lk.event : lk.season;
  const tops = TOPS[key];
  const corners = CORNERS[key];
  if (!tops || !corners || kind === 'settings') return { top: '', bl: '', br: '', key: '' };
  const i = Math.max(0, KINDS.indexOf(kind));
  const a = corners[i % corners.length];
  let b = corners[(i * 3 + 2) % corners.length];
  if (b === a) b = corners[(i + 1) % corners.length];
  const one = (m, v) => `<g transform="translate(32 34)">${M[m](22, v)}</g>`;
  const out = { top: tops[i % tops.length](i), bl: one(a, i), br: one(b, i + 1), key };
  // そのゲームのための特別な絵があれば、その場所を置きかえる
  const sp = (SPECIAL[key] || {})[kind];
  if (sp) for (const place of ['top', 'bl', 'br']) if (sp[place]) out[place] = SP[sp[place]]();
  return out;
}
export { M as MOTIF };
