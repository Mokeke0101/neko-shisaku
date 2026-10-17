// 季節と行事の背景の部品（RS01-S13）。scenes.js は、ここの部品で20本の場面を描く。
// 季節ごとに「部品のセット」を持ち、行事の時は行事のセットで置きかえる（v10：依頼者の答え。docs/決めたことの記録.md §9）。
// 部品：tree 木・piece 地面の小物・fruit 机や床の物・flower 野の花・plant 背の高い草・branch 枝の物・winItem 窓の外の物・
//       air 空を飛ぶ物・yard 庭の大きな物・cloud 雲・sky 空の飾り（場面の最後に重ねる）・pattern うすい模様・fx 動く物。
// 夜の行事（大みそか・七夕・夏祭り・お月見）は夜空にする（依頼者が決めた例外。RS01-S06 の「暗い画面を出さない」の外）。
import { C, cloud as plainCloud, mapleLeaf, ginkgoLeaf, acorn, persimmon, dragonfly, autumnLeaf, sakuraPetal, snowflake, starShape, heartShape } from './art.js';
import { MOTIF as M } from './decor.js';
import { pawPrint } from './cats.js';

const f = (n) => Math.round(n * 100) / 100;
const at = (x, y, inner, rot = 0, sc = 1) => `<g transform="translate(${f(x)} ${f(y)})${rot ? ` rotate(${f(rot)})` : ''}${sc !== 1 ? ` scale(${f(sc)})` : ''}">${inner}</g>`;
const ring = (n, r, fn, start = -90) => Array.from({ length: n }, (_, k) => {
  const deg = start + (k * 360) / n;
  const a = (deg * Math.PI) / 180;
  return fn(Math.cos(a) * r, Math.sin(a) * r, deg, k);
}).join('');
const rand = (seed) => { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };

// ---- 共通の小さな絵（中心 0,0、大きさ s） ----
// 5枚の花びらの花
function blossom(s, fill = '#fbd9e2', edge = '#eaa7ba', center = '#f6d55e', n = 5) {
  return `<g>${ring(n, s * 0.45, (x, y, d) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.36)}" ry="${f(s * 0.3)}" fill="${fill}" stroke="${edge}" stroke-width="${f(s * 0.06)}" transform="rotate(${f(d + 90)} ${f(x)} ${f(y)})"/>`)}<circle r="${f(s * 0.2)}" fill="${center}"/></g>`;
}
const ume = (s, v = 0) => blossom(s, ['#f7a6b4', '#ffffff', '#f48fa0'][v % 3], '#e07a92', '#f6d55e');
const momo = (s, v = 0) => blossom(s, ['#f6a5bd', '#f9c0d0'][v % 2], '#e0839f', '#fde3a6');
const sakura = (s, v = 0) => blossom(s, ['#fbd9e2', '#fde8ee', '#f9c6d3'][v % 3], '#eaa7ba', '#f6d55e');
const tanpopo = (s) => `<g>${ring(12, s * 0.42, (x, y, d) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.3)}" ry="${f(s * 0.12)}" fill="#f6d55e" transform="rotate(${f(d)} ${f(x)} ${f(y)})"/>`)}<circle r="${f(s * 0.28)}" fill="#f2c13a"/></g>`;
const clover = (s) => `<g fill="#9fcb72">${ring(3, s * 0.3, (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.3)}"/>`)}</g>`;
const asagao = (s, v = 0) => { const c = [['#a9c4f0', '#7f9fdc'], ['#d6b2ec', '#b48ad6'], ['#f6b2cc', '#e08aab']][v % 3]; return `<g><circle r="${f(s * 0.6)}" fill="${c[0]}" stroke="${c[1]}" stroke-width="${f(s * 0.06)}"/>${ring(5, s * 0.4, (x, y) => `<path d="M0,0 L${f(x)},${f(y)}" stroke="#ffffff" stroke-width="${f(s * 0.07)}" opacity="0.8"/>`)}<circle r="${f(s * 0.16)}" fill="#ffffff"/></g>`; };
const bean = (s) => `<g><ellipse rx="${f(s * 0.36)}" ry="${f(s * 0.3)}" fill="#f2dcb0" stroke="#d1b07a" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.12)},${f(-s * 0.06)} q${f(s * 0.1)},${f(s * 0.1)} ${f(s * 0.22)},0" stroke="#d1b07a" stroke-width="${f(s * 0.05)}" fill="none"/></g>`;
const dot = (r, c, o = 1) => `<circle r="${f(r)}" fill="${c}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
// ふわっと光る輪（夜の明かり）
const glow = (r, c = '#fff1b8', o = 0.35) => `<circle r="${f(r)}" fill="${c}" opacity="${o}"/><circle r="${f(r * 0.6)}" fill="${c}" opacity="${o}"/>`;

// 鳥・虫・風船など
const uguisu = (s) => `<g><ellipse cx="0" cy="0" rx="${f(s * 0.6)}" ry="${f(s * 0.45)}" fill="#c6d58e" stroke="#9fb26a" stroke-width="${f(s * 0.06)}"/><path d="M${f(s * 0.5)},${f(-s * 0.05)} L${f(s * 0.95)},${f(-s * 0.25)} L${f(s * 0.85)},${f(s * 0.1)} Z" fill="#b5c87c"/><circle cx="${f(-s * 0.3)}" cy="${f(-s * 0.12)}" r="${f(s * 0.07)}" fill="${C.ink}"/><path d="M${f(-s * 0.58)},${f(-s * 0.05)} l${f(-s * 0.18)},${f(s * 0.06)} l${f(s * 0.18)},${f(s * 0.05)} Z" fill="#e3a92c"/><path d="M${f(-s * 0.1)},${f(-s * 0.05)} q${f(s * 0.3)},${f(-s * 0.3)} ${f(s * 0.5)},0" stroke="#9fb26a" stroke-width="${f(s * 0.06)}" fill="none"/></g>`;
const shimaenaga = (s) => `<g><path d="M${f(s * 0.45)},${f(s * 0.05)} L${f(s * 1.2)},${f(-s * 0.1)} L${f(s * 1.2)},${f(s * 0.12)} Z" fill="#8a8f98"/><ellipse rx="${f(s * 0.62)}" ry="${f(s * 0.52)}" fill="#ffffff" stroke="#c9d3dc" stroke-width="${f(s * 0.06)}"/><path d="M${f(s * 0.05)},${f(-s * 0.1)} q${f(s * 0.3)},${f(s * 0.25)} ${f(s * 0.5)},${f(s * 0.05)}" stroke="#b9c2cc" stroke-width="${f(s * 0.08)}" fill="none"/><circle cx="${f(-s * 0.25)}" cy="${f(-s * 0.1)}" r="${f(s * 0.06)}" fill="${C.ink}"/><circle cx="${f(-s * 0.05)}" cy="${f(-s * 0.1)}" r="${f(s * 0.06)}" fill="${C.ink}"/><path d="M${f(-s * 0.18)},${f(0)} l${f(s * 0.04)},${f(s * 0.06)} l${f(s * 0.04)},${f(-s * 0.06)} Z" fill="#8a8f98"/></g>`;
const swallow = (s) => `<g><path d="M${f(-s)},${f(-s * 0.1)} Q${f(-s * 0.4)},${f(-s * 0.2)} 0,0 Q${f(s * 0.4)},${f(-s * 0.2)} ${f(s)},${f(-s * 0.1)} Q${f(s * 0.4)},${f(s * 0.1)} 0,${f(s * 0.2)} Q${f(-s * 0.4)},${f(s * 0.1)} ${f(-s)},${f(-s * 0.1)} Z" fill="#5d6f9a"/><ellipse cx="0" cy="${f(s * 0.12)}" rx="${f(s * 0.16)}" ry="${f(s * 0.12)}" fill="#ffffff"/><circle cx="0" cy="${f(-s * 0.05)}" r="${f(s * 0.06)}" fill="#e8664a"/></g>`;
const bubble = (s) => `<g><circle r="${f(s * 0.6)}" fill="#e8f6fb" opacity="0.55" stroke="#9fc8e0" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.35)},${f(-s * 0.15)} a${f(s * 0.4)},${f(s * 0.4)} 0 0 1 ${f(s * 0.25)},${f(-s * 0.25)}" stroke="#ffffff" stroke-width="${f(s * 0.1)}" fill="none" stroke-linecap="round"/><path d="M${f(s * 0.25)},${f(s * 0.35)} a${f(s * 0.45)},${f(s * 0.45)} 0 0 0 ${f(s * 0.2)},${f(-s * 0.2)}" stroke="#f6c2d6" stroke-width="${f(s * 0.07)}" fill="none" stroke-linecap="round"/></g>`;
const balloonOn = (x, baseY, h, inner) => `<path d="M${f(x)},${f(baseY)} q${f(-8)},${f(-h * 0.5)} 0,${f(-h)}" stroke="#c9b8a6" stroke-width="1.5" fill="none"/>${at(x, baseY - h - 14, inner)}`;
const bat = (s, c = '#cdbfe0', d = '#a98cc9') => `<g><path d="M0,${f(-s * 0.1)} Q${f(-s * 0.4)},${f(-s * 0.5)} ${f(-s)},${f(-s * 0.3)} Q${f(-s * 0.8)},${f(0)} ${f(-s * 0.9)},${f(s * 0.25)} Q${f(-s * 0.6)},${f(s * 0.05)} ${f(-s * 0.4)},${f(s * 0.25)} Q${f(-s * 0.2)},${f(s * 0.05)} 0,${f(s * 0.25)} Q${f(s * 0.2)},${f(s * 0.05)} ${f(s * 0.4)},${f(s * 0.25)} Q${f(s * 0.6)},${f(s * 0.05)} ${f(s * 0.9)},${f(s * 0.25)} Q${f(s * 0.8)},${f(0)} ${f(s)},${f(-s * 0.3)} Q${f(s * 0.4)},${f(-s * 0.5)} 0,${f(-s * 0.1)} Z" fill="${c}" stroke="${d}" stroke-width="${f(s * 0.05)}" stroke-linejoin="round"/><circle cx="0" cy="${f(-s * 0.05)}" r="${f(s * 0.24)}" fill="${c}" stroke="${d}" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.18)},${f(-s * 0.22)} l${f(s * 0.04)},${f(-s * 0.16)} l${f(s * 0.08)},${f(s * 0.1)} M${f(s * 0.18)},${f(-s * 0.22)} l${f(-s * 0.04)},${f(-s * 0.16)} l${f(-s * 0.08)},${f(s * 0.1)}" fill="${c}" stroke="${d}" stroke-width="${f(s * 0.04)}"/><circle cx="${f(-s * 0.08)}" cy="${f(-s * 0.06)}" r="${f(s * 0.04)}" fill="${C.ink}"/><circle cx="${f(s * 0.08)}" cy="${f(-s * 0.06)}" r="${f(s * 0.04)}" fill="${C.ink}"/></g>`;

// 食べ物・小物
const ichigo = (s) => `<g><path d="M0,${f(s * 0.8)} C${f(-s * 0.8)},${f(s * 0.3)} ${f(-s * 0.7)},${f(-s * 0.5)} 0,${f(-s * 0.45)} C${f(s * 0.7)},${f(-s * 0.5)} ${f(s * 0.8)},${f(s * 0.3)} 0,${f(s * 0.8)} Z" fill="#f08a8a" stroke="#d96c6c" stroke-width="${f(s * 0.06)}"/>${[[-0.25, 0], [0.2, -0.1], [0, 0.35], [-0.2, 0.4], [0.25, 0.3]].map(([x, y]) => `<circle cx="${f(s * x)}" cy="${f(s * y)}" r="${f(s * 0.05)}" fill="#fff4c8"/>`).join('')}<path d="M${f(-s * 0.4)},${f(-s * 0.5)} L0,${f(-s * 0.3)} L${f(s * 0.4)},${f(-s * 0.5)} L${f(s * 0.15)},${f(-s * 0.7)} L0,${f(-s * 0.5)} L${f(-s * 0.15)},${f(-s * 0.7)} Z" fill="${C.oliveDeep}"/></g>`;
const sakuramochi = (s) => `<g><ellipse cx="0" cy="${f(s * 0.1)}" rx="${f(s * 0.8)}" ry="${f(s * 0.5)}" fill="#86a256"/><path d="M${f(-s * 0.6)},${f(s * 0.1)} H${f(s * 0.6)}" stroke="#6f8a46" stroke-width="${f(s * 0.05)}"/><ellipse cx="${f(-s * 0.05)}" cy="${f(-s * 0.05)}" rx="${f(s * 0.62)}" ry="${f(s * 0.38)}" fill="#f9c6d3" stroke="#eaa7ba" stroke-width="${f(s * 0.05)}"/><circle cx="${f(s * 0.1)}" cy="${f(-s * 0.2)}" r="${f(s * 0.06)}" fill="#fff4f6"/></g>`;
const watermelon = (s) => `<g><circle r="${f(s * 0.8)}" fill="#86b25e" stroke="#6f9a4f" stroke-width="${f(s * 0.05)}"/>${[-0.45, -0.15, 0.15, 0.45].map((x) => `<path d="M${f(x * s)},${f(-s * 0.76)} q${f(s * 0.14)},${f(s * 0.76)} 0,${f(s * 1.52)}" stroke="#4f7a3c" stroke-width="${f(s * 0.08)}" fill="none" stroke-linejoin="round"/>`).join('')}<ellipse cx="${f(-s * 0.3)}" cy="${f(-s * 0.35)}" rx="${f(s * 0.16)}" ry="${f(s * 0.1)}" fill="#ffffff" opacity="0.4"/></g>`;
const melonSlice = (s) => `<g><path d="M${f(-s * 0.9)},0 A${f(s * 0.9)},${f(s * 0.9)} 0 0 0 ${f(s * 0.9)},0 Z" fill="#9fcb72"/><path d="M${f(-s * 0.78)},0 A${f(s * 0.78)},${f(s * 0.78)} 0 0 0 ${f(s * 0.78)},0 Z" fill="#fff6e4"/><path d="M${f(-s * 0.7)},0 A${f(s * 0.7)},${f(s * 0.7)} 0 0 0 ${f(s * 0.7)},0 Z" fill="#f4908a"/>${[[-0.35, 0.2], [0, 0.35], [0.35, 0.2]].map(([x, y]) => `<ellipse cx="${f(s * x)}" cy="${f(s * y)}" rx="${f(s * 0.05)}" ry="${f(s * 0.08)}" fill="#5a3e2e"/>`).join('')}</g>`;
const corn = (s) => `<g transform="rotate(-30)"><ellipse rx="${f(s * 0.32)}" ry="${f(s * 0.8)}" fill="#f6d55e" stroke="#e3b53a" stroke-width="${f(s * 0.05)}"/>${[-0.5, -0.2, 0.1, 0.4].map((y) => `<path d="M${f(-s * 0.28)},${f(y * s)} H${f(s * 0.28)}" stroke="#e3b53a" stroke-width="${f(s * 0.04)}"/>`).join('')}<path d="M${f(-s * 0.1)},${f(s * 0.8)} Q${f(-s * 0.6)},${f(s * 0.2)} ${f(-s * 0.35)},${f(-s * 0.5)} M${f(s * 0.1)},${f(s * 0.8)} Q${f(s * 0.6)},${f(s * 0.2)} ${f(s * 0.35)},${f(-s * 0.5)}" stroke="#9fcb72" stroke-width="${f(s * 0.16)}" fill="none" stroke-linecap="round"/></g>`;
const kuri = (s) => `<g><path d="M0,${f(-s * 0.7)} Q${f(s * 0.75)},${f(-s * 0.1)} ${f(s * 0.6)},${f(s * 0.45)} Q0,${f(s * 0.7)} ${f(-s * 0.6)},${f(s * 0.45)} Q${f(-s * 0.75)},${f(-s * 0.1)} 0,${f(-s * 0.7)} Z" fill="#a9673f" stroke="#86502f" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.55)},${f(s * 0.3)} Q0,${f(s * 0.5)} ${f(s * 0.55)},${f(s * 0.3)} L${f(s * 0.5)},${f(s * 0.48)} Q0,${f(s * 0.68)} ${f(-s * 0.5)},${f(s * 0.48)} Z" fill="#e9c591"/><ellipse cx="${f(-s * 0.2)}" cy="${f(-s * 0.2)}" rx="${f(s * 0.1)}" ry="${f(s * 0.18)}" fill="#ffffff" opacity="0.3"/></g>`;
const nanten = (s) => `<g><path d="M0,${f(s * 0.6)} V${f(-s * 0.2)}" stroke="#86a256" stroke-width="${f(s * 0.08)}"/>${[[-0.5, -0.3, -30], [0.5, -0.3, 30]].map(([x, y, r]) => `<ellipse cx="${f(x * s)}" cy="${f(y * s)}" rx="${f(s * 0.35)}" ry="${f(s * 0.14)}" fill="#86b25e" transform="rotate(${r} ${f(x * s)} ${f(y * s)})"/>`).join('')}${[[-0.15, 0], [0.12, 0.05], [0, 0.25], [-0.25, 0.22], [0.22, 0.28]].map(([x, y]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.12)}" fill="#e8664a"/>`).join('')}</g>`;
const snowLump = (s) => `<ellipse rx="${f(s * 0.6)}" ry="${f(s * 0.22)}" fill="#ffffff" stroke="#d3e1ea" stroke-width="${f(s * 0.05)}"/>`;
const kinokoPair = (s) => `${at(-s * 0.3, 0, M.kinoko(s * 0.8))}${at(s * 0.45, s * 0.15, M.kinoko(s * 0.55))}`;
const leafPile = (s) => `<g><path d="M${f(-s)},${f(s * 0.3)} Q0,${f(-s * 0.6)} ${f(s)},${f(s * 0.3)} Z" fill="#f2b06a"/>${[[-0.5, 0.05, 0], [0, -0.2, 1], [0.45, 0.05, 2], [-0.2, 0.15, 3], [0.2, 0.12, 0]].map(([x, y, k]) => at(x * s, y * s, autumnLeaf(k, s * 0.38), k * 50)).join('')}</g>`;
const tulips = (s) => `${at(-s * 0.5, 0, M.tulip(s * 0.7, 0))}${at(0, -s * 0.15, M.tulip(s * 0.8, 2))}${at(s * 0.5, s * 0.05, M.tulip(s * 0.7, 1))}`;
const cake = (s) => `<g><rect x="${f(-s * 0.8)}" y="${f(-s * 0.2)}" width="${f(s * 1.6)}" height="${f(s * 0.8)}" rx="${f(s * 0.12)}" fill="#fff6ea" stroke="#e6cfae" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.8)},${f(s * 0.15)} H${f(s * 0.8)}" stroke="#f7a6a0" stroke-width="${f(s * 0.12)}"/><path d="M${f(-s * 0.8)},${f(-s * 0.2)} q${f(s * 0.2)},${f(s * 0.2)} ${f(s * 0.4)},0 t${f(s * 0.4)},0 t${f(s * 0.4)},0 t${f(s * 0.4)},0" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.05)}"/>${[-0.45, 0, 0.45].map((x) => `<g transform="translate(${f(x * s)} ${f(-s * 0.36)}) scale(${f(s * 0.022)})">${ichigo(10)}</g>`).join('')}</g>`;
const poinsettia = (s) => `<g>${ring(6, s * 0.42, (x, y, d) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.42)}" ry="${f(s * 0.18)}" fill="#ec7a7a" stroke="#d65f5f" stroke-width="${f(s * 0.04)}" transform="rotate(${f(d)} ${f(x)} ${f(y)})"/>`)}${ring(3, s * 0.08, (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.08)}" fill="#f6d55e"/>`)}</g>`;
const bento = (s) => `<g><rect x="${f(-s * 0.85)}" y="${f(-s * 0.5)}" width="${f(s * 1.7)}" height="${f(s)}" rx="${f(s * 0.12)}" fill="#f7a6a0" stroke="#e08d7c" stroke-width="${f(s * 0.06)}"/><rect x="${f(-s * 0.72)}" y="${f(-s * 0.38)}" width="${f(s * 1.44)}" height="${f(s * 0.76)}" rx="${f(s * 0.08)}" fill="#fff6ea"/><path d="M${f(s * 0.05)},${f(-s * 0.38)} V${f(s * 0.38)}" stroke="#e6cfae" stroke-width="${f(s * 0.05)}"/>${[[-0.45, -0.1], [-0.2, 0.15], [-0.5, 0.18]].map(([x, y]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.14)}" fill="#ffffff" stroke="#e6cfae" stroke-width="${f(s * 0.03)}"/>`).join('')}<circle cx="${f(s * 0.3)}" cy="${f(-s * 0.1)}" r="${f(s * 0.16)}" fill="#f6d55e"/><circle cx="${f(s * 0.52)}" cy="${f(s * 0.16)}" r="${f(s * 0.13)}" fill="#f08a8a"/><ellipse cx="${f(s * 0.3)}" cy="${f(s * 0.2)}" rx="${f(s * 0.14)}" ry="${f(s * 0.08)}" fill="#9fcb72"/></g>`;
const chimaki = (s) => `<g><path d="M0,${f(-s)} L${f(s * 0.4)},${f(s * 0.6)} H${f(-s * 0.4)} Z" fill="#9fcb72" stroke="#6f9a4f" stroke-width="${f(s * 0.06)}" stroke-linejoin="round"/>${[-0.2, 0.15].map((y) => `<path d="M${f(-s * 0.3)},${f(y * s)} L${f(s * 0.3)},${f(y * s + s * 0.08)}" stroke="#e9c591" stroke-width="${f(s * 0.08)}"/>`).join('')}</g>`;
const ringoame = (s) => `<g><path d="M0,${f(s * 0.1)} V${f(s)}" stroke="#e9c591" stroke-width="${f(s * 0.1)}" stroke-linecap="round"/><circle cy="${f(-s * 0.2)}" r="${f(s * 0.5)}" fill="#ec6f6f" stroke="#d65050" stroke-width="${f(s * 0.06)}"/><ellipse cx="${f(-s * 0.18)}" cy="${f(-s * 0.4)}" rx="${f(s * 0.14)}" ry="${f(s * 0.08)}" fill="#ffffff" opacity="0.7"/><path d="M0,${f(-s * 0.7)} q${f(s * 0.1)},${f(-s * 0.15)} ${f(s * 0.2)},${f(-s * 0.15)}" stroke="#86a256" stroke-width="${f(s * 0.08)}" fill="none"/></g>`;
const wataame = (s) => `<g><path d="M0,${f(s * 0.1)} V${f(s)}" stroke="#e9c591" stroke-width="${f(s * 0.1)}" stroke-linecap="round"/>${[[-0.3, -0.2, 0.42], [0.3, -0.25, 0.4], [0, -0.55, 0.42], [0, -0.1, 0.4]].map(([x, y, r]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(r * s)}" fill="#fbd9e2"/>`).join('')}</g>`;
const can = (s) => `<g><rect x="${f(-s * 0.6)}" y="${f(-s * 0.35)}" width="${f(s * 1.2)}" height="${f(s * 0.7)}" rx="${f(s * 0.1)}" fill="#cfe0ea" stroke="#9fbdd0" stroke-width="${f(s * 0.06)}"/><ellipse cy="${f(-s * 0.35)}" rx="${f(s * 0.6)}" ry="${f(s * 0.14)}" fill="#e6eff5" stroke="#9fbdd0" stroke-width="${f(s * 0.05)}"/>${at(0, s * 0.05, M.fishCookie(s * 0.35))}</g>`;
const yarn = (s, v = 0) => { const c = [['#f4a7a3', '#d97f7a'], ['#9fc5e8', '#6f9fcb'], ['#f3d36b', '#d4b043'], ['#c6dfae', '#97b878']][v % 4]; return `<g><circle r="${f(s * 0.6)}" fill="${c[0]}" stroke="${c[1]}" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.5)},${f(-s * 0.15)} Q0,${f(-s * 0.5)} ${f(s * 0.5)},${f(-s * 0.15)} M${f(-s * 0.55)},${f(s * 0.15)} Q0,${f(-s * 0.2)} ${f(s * 0.55)},${f(s * 0.15)} M${f(-s * 0.35)},${f(s * 0.42)} Q0,${f(s * 0.1)} ${f(s * 0.35)},${f(s * 0.42)}" stroke="${c[1]}" stroke-width="${f(s * 0.05)}" fill="none"/></g>`; };
const yarnPile = (s) => `${at(-s * 0.45, s * 0.1, yarn(s * 0.7, 0))}${at(s * 0.45, s * 0.12, yarn(s * 0.65, 1))}${at(0, -s * 0.35, yarn(s * 0.6, 2))}`;
const presentPile = (s, a = 0) => `${at(-s * 0.45, s * 0.2, M.present(s * 0.45, a))}${at(s * 0.5, s * 0.25, M.present(s * 0.38, a + 1))}${at(0, -s * 0.35, M.present(s * 0.35, a + 2))}`;
const pumpkinPile = (s) => `${at(-s * 0.5, s * 0.15, M.pumpkin(s * 0.6, 0))}${at(s * 0.5, s * 0.2, M.pumpkin(s * 0.5, 1))}${at(0, -s * 0.3, M.pumpkin(s * 0.5, 1))}`;
const juubako = (s) => `<g><rect x="${f(-s * 0.7)}" y="${f(-s * 0.6)}" width="${f(s * 1.4)}" height="${f(s * 1.2)}" rx="${f(s * 0.08)}" fill="#ec7a7a" stroke="#c95c5c" stroke-width="${f(s * 0.06)}"/><path d="M${f(-s * 0.7)},${f(-s * 0.2)} H${f(s * 0.7)} M${f(-s * 0.7)},${f(s * 0.2)} H${f(s * 0.7)}" stroke="#f6d55e" stroke-width="${f(s * 0.06)}"/>${at(0, -s * 0.4, ume(s * 0.24, 1))}</g>`;
const hagoitaHane = (s) => M.hagoita(s);
const kobanPile = (s) => `${at(-s * 0.4, s * 0.15, M.koban(s * 0.45, 0))}${at(s * 0.4, s * 0.15, M.koban(s * 0.45, 1))}${at(0, -s * 0.25, M.koban(s * 0.45, 2))}`;
const taiyaki = (s) => `<g><path d="M${f(s * 0.5)},0 L${f(s * 0.95)},${f(-s * 0.35)} L${f(s * 0.95)},${f(s * 0.35)} Z" fill="#e9b26a" stroke="#c98a42" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.9)},0 Q${f(-s * 0.3)},${f(-s * 0.6)} ${f(s * 0.55)},0 Q${f(-s * 0.3)},${f(s * 0.6)} ${f(-s * 0.9)},0 Z" fill="#f2c27e" stroke="#c98a42" stroke-width="${f(s * 0.06)}"/><circle cx="${f(-s * 0.5)}" cy="${f(-s * 0.08)}" r="${f(s * 0.07)}" fill="${C.ink}"/>${[-0.2, 0.1].map((x) => `<path d="M${f(x * s)},${f(-s * 0.25)} q${f(s * 0.1)},${f(s * 0.25)} 0,${f(s * 0.5)}" stroke="#c98a42" stroke-width="${f(s * 0.04)}" fill="none"/>`).join('')}</g>`;
const hinaArare = (s) => `<g><path d="M${f(-s * 0.75)},${f(-s * 0.1)} Q${f(-s * 0.7)},${f(s * 0.6)} 0,${f(s * 0.6)} Q${f(s * 0.7)},${f(s * 0.6)} ${f(s * 0.75)},${f(-s * 0.1)} Z" fill="#cfe0ea" stroke="#9fbdd0" stroke-width="${f(s * 0.05)}"/>${[[-0.4, -0.2, '#f9c6d3'], [-0.15, -0.3, '#ffffff'], [0.1, -0.22, '#b9d48a'], [0.35, -0.28, '#fde3a6'], [0, -0.42, '#f9c6d3'], [-0.3, -0.4, '#b9d48a'], [0.25, -0.45, '#ffffff']].map(([x, y, c]) => `<circle cx="${f(x * s)}" cy="${f(y * s)}" r="${f(s * 0.12)}" fill="${c}" stroke="#e6cfae" stroke-width="${f(s * 0.02)}"/>`).join('')}</g>`;
const soumen = (s) => `<g><path d="M${f(-s * 0.8)},${f(-s * 0.1)} Q${f(-s * 0.7)},${f(s * 0.6)} 0,${f(s * 0.6)} Q${f(s * 0.7)},${f(s * 0.6)} ${f(s * 0.8)},${f(-s * 0.1)} Z" fill="#e4f4f8" stroke="#9fc8cf" stroke-width="${f(s * 0.05)}"/><path d="M${f(-s * 0.5)},${f(-s * 0.15)} q${f(s * 0.25)},${f(-s * 0.15)} ${f(s * 0.5)},0 t${f(s * 0.5)},0" stroke="#ffffff" stroke-width="${f(s * 0.12)}" fill="none"/><path d="M${f(-s * 0.55)},${f(s * 0.1)} q${f(s * 0.25)},${f(-s * 0.15)} ${f(s * 0.55)},0 t${f(s * 0.5)},0" stroke="#fffaf0" stroke-width="${f(s * 0.1)}" fill="none" opacity="0.9"/>${at(s * 0.4, -s * 0.2, starShape(s * 0.3, '#fde3a6', '#e6c46a'))}</g>`;

// ---- 木 ----
// 丸い木（冬は雪をかぶった白い木。ふちを付けて背景から見分ける）
function roundTree(x, y, r, color, P, dots = '') {
  const edge = P.snowy ? ' stroke="#c9d9e4" stroke-width="2"' : '';
  return `<g><rect x="${f(x - r * 0.12)}" y="${f(y)}" width="${f(r * 0.24)}" height="${f(r * 1.0)}" rx="${f(r * 0.1)}" fill="${P.trunk}"/>`
    + `<circle cx="${f(x - r * 0.62)}" cy="${f(y + r * 0.28)}" r="${f(r * 0.66)}" fill="${color}"${edge}/>`
    + `<circle cx="${f(x + r * 0.62)}" cy="${f(y + r * 0.28)}" r="${f(r * 0.66)}" fill="${color}"${edge}/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}"${edge}/>`
    + `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.3)}" fill="#ffffff" opacity="0.18"/>${dots}</g>`;
}
// 木の まるい葉の上に、小さな物を散らす（花・実）
function onCanopy(x, y, r, n, draw, seed = 3) {
  const rnd = rand(seed + Math.round(x));
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r * 0.85;
    s += at(x + Math.cos(a) * d * 1.3, y + r * 0.12 + Math.sin(a) * d * 0.75, draw(k));
  }
  return s;
}
// 雪の もみの木
function firTree(x, y, r, { snow = true, col = ['#8fbf6a', '#86b25e', '#7aa654'], deco = false } = {}) {
  const h = r * 2.6;
  const top = y - h * 0.55;
  let s = `<rect x="${f(x - r * 0.12)}" y="${f(y + r * 0.6)}" width="${f(r * 0.24)}" height="${f(r * 0.5)}" fill="#b9784e"/>`;
  for (let k = 0; k < 3; k++) {
    const ty = top + k * h * 0.26;
    const w = r * (0.55 + k * 0.28);
    const by = ty + h * 0.42;
    s += `<path d="M${f(x)},${f(ty)} L${f(x + w)},${f(by)} Q${f(x)},${f(by + r * 0.12)} ${f(x - w)},${f(by)} Z" fill="${col[k]}" stroke="#6f9a4f" stroke-width="1.5" stroke-linejoin="round"/>`;
    if (snow) s += `<path d="M${f(x - w * 0.95)},${f(by - 1)} Q${f(x - w * 0.5)},${f(by - r * 0.16)} ${f(x)},${f(by - r * 0.04)} Q${f(x + w * 0.5)},${f(by - r * 0.18)} ${f(x + w * 0.95)},${f(by - 1)} Q${f(x)},${f(by + r * 0.1)} ${f(x - w * 0.95)},${f(by - 1)} Z" fill="#ffffff" opacity="0.95"/>`;
  }
  if (deco) {
    const cols = [C.momiji, C.icho, '#9fc5e8', C.rose, '#ffffff'];
    [[-0.3, 0.05], [0.25, -0.15], [-0.5, 0.55], [0.45, 0.4], [0, 0.3], [-0.15, -0.45], [0.6, 0.85], [-0.65, 0.95], [0.1, 0.8]].forEach(([dx, dy], k) => {
      s += `<circle cx="${f(x + dx * r)}" cy="${f(y + dy * r - r * 0.3)}" r="${f(r * 0.1)}" fill="${cols[k % 5]}" stroke="#ffffff" stroke-width="1"/>`;
    });
    s += `<path d="M${f(x - r * 0.45)},${f(y - r * 0.55)} Q${f(x)},${f(y - r * 0.3)} ${f(x + r * 0.5)},${f(y - r * 0.6)} M${f(x - r * 0.7)},${f(y + r * 0.3)} Q${f(x)},${f(y + r * 0.6)} ${f(x + r * 0.75)},${f(y + r * 0.25)}" stroke="#f6d55e" stroke-width="2" fill="none" stroke-dasharray="3 3"/>`;
    s += at(x, top - r * 0.08, starShape(r * 0.55));
  }
  return `<g>${s}</g>`;
}
// 松（お正月）：曲がった幹と、平たい雲のような葉
function matsuTree(x, y, r) {
  const g = '#6f9a5c';
  const pad = (px, py, w) => `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(w)}" ry="${f(w * 0.38)}" fill="${g}" stroke="#58804a" stroke-width="1.5"/><ellipse cx="${f(px - w * 0.2)}" cy="${f(py - w * 0.12)}" rx="${f(w * 0.5)}" ry="${f(w * 0.16)}" fill="#86b06e" opacity="0.8"/>`;
  return `<g><path d="M${f(x)},${f(y + r)} Q${f(x - r * 0.3)},${f(y + r * 0.3)} ${f(x + r * 0.1)},${f(y - r * 0.2)} T${f(x - r * 0.1)},${f(y - r * 0.9)}" stroke="#a77048" stroke-width="${f(r * 0.22)}" fill="none" stroke-linecap="round"/>`
    + `<path d="M${f(x + r * 0.05)},${f(y - r * 0.1)} Q${f(x + r * 0.5)},${f(y - r * 0.3)} ${f(x + r * 0.9)},${f(y - r * 0.2)}" stroke="#a77048" stroke-width="${f(r * 0.12)}" fill="none" stroke-linecap="round"/>`
    + pad(x - r * 0.1, y - r * 0.95, r * 0.75) + pad(x - r * 0.55, y - r * 0.35, r * 0.6) + pad(x + r * 0.75, y - r * 0.25, r * 0.6) + '</g>';
}
// 枝の多い木（梅・桃）：花を枝に付ける
function blossomBranches(x, y, r, flower) {
  const br = [[0, 0, -0.1, -1.1], [0, -0.4, -0.85, -0.95], [0, -0.3, 0.8, -1.0], [-0.4, -0.7, -0.9, -1.45], [0.4, -0.65, 0.5, -1.5], [0, -0.7, 0.15, -1.6]];
  let s = `<path d="M${f(x)},${f(y + r)} L${f(x)},${f(y)}" stroke="#8a5a3c" stroke-width="${f(r * 0.2)}" stroke-linecap="round"/>`;
  br.forEach(([x0, y0, x1, y1]) => { s += `<path d="M${f(x + x0 * r)},${f(y + y0 * r)} Q${f(x + (x0 + x1) * 0.5 * r + r * 0.1)},${f(y + (y0 + y1) * 0.5 * r)} ${f(x + x1 * r)},${f(y + y1 * r)}" stroke="#8a5a3c" stroke-width="${f(r * 0.08)}" fill="none" stroke-linecap="round"/>`; });
  const rnd = rand(Math.round(x) + 7);
  br.forEach(([x0, y0, x1, y1], k) => {
    for (let j = 0; j < 4; j++) {
      const t = 0.35 + j * 0.2;
      s += at(x + (x0 + (x1 - x0) * t) * r + (rnd() - 0.5) * r * 0.2, y + (y0 + (y1 - y0) * t) * r + (rnd() - 0.5) * r * 0.2, flower(r * 0.2, k + j));
    }
  });
  return `<g>${s}</g>`;
}
// ハートの形の木
function heartTree(x, y, r, color, P) {
  return `<g><rect x="${f(x - r * 0.12)}" y="${f(y)}" width="${f(r * 0.24)}" height="${f(r * 1.05)}" rx="${f(r * 0.1)}" fill="${P.trunk}"/>`
    + at(x, y - r * 0.05, heartShape(r * 2.3, color, '#e48aa4'))
    + `<circle cx="${f(x - r * 0.45)}" cy="${f(y - r * 0.55)}" r="${f(r * 0.2)}" fill="#ffffff" opacity="0.35"/>`
    + onCanopy(x, y - r * 0.3, r * 0.6, 4, (k) => heartShape(r * 0.32, ['#ffffff', '#fde3ea'][k % 2], '#f4b8c8'), 5) + '</g>';
}
// 猫の形に刈った木（猫の日）
function catTopiary(x, y, r, color, P) {
  const edge = '#6f9a4f';
  return `<g><rect x="${f(x - r * 0.12)}" y="${f(y + r * 0.5)}" width="${f(r * 0.24)}" height="${f(r * 0.6)}" rx="${f(r * 0.1)}" fill="${P.trunk}"/>`
    + `<path d="M${f(x - r * 0.85)},${f(y - r * 0.35)} L${f(x - r * 0.7)},${f(y - r * 1.1)} L${f(x - r * 0.25)},${f(y - r * 0.8)} Z M${f(x + r * 0.85)},${f(y - r * 0.35)} L${f(x + r * 0.7)},${f(y - r * 1.1)} L${f(x + r * 0.25)},${f(y - r * 0.8)} Z" fill="${color}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.85)}" fill="${color}" stroke="${edge}" stroke-width="1.5"/>`
    + `<path d="M${f(x - r * 0.45)},${f(y - r * 0.05)} q${f(r * 0.15)},${f(-r * 0.15)} ${f(r * 0.3)},0 M${f(x + r * 0.15)},${f(y - r * 0.05)} q${f(r * 0.15)},${f(-r * 0.15)} ${f(r * 0.3)},0" stroke="#58804a" stroke-width="2" fill="none" stroke-linecap="round"/>`
    + `<path d="M${f(x - r * 0.08)},${f(y + r * 0.18)} h${f(r * 0.16)} l${f(-r * 0.08)},${f(r * 0.1)} Z" fill="#f4a3b4"/>`
    + `<ellipse cx="${f(x - r * 0.55)}" cy="${f(y + r * 0.25)}" rx="${f(r * 0.15)}" ry="${f(r * 0.08)}" fill="#f4a3b4" opacity="0.6"/><ellipse cx="${f(x + r * 0.55)}" cy="${f(y + r * 0.25)}" rx="${f(r * 0.15)}" ry="${f(r * 0.08)}" fill="#f4a3b4" opacity="0.6"/></g>`;
}
// 笹（七夕）：たんざくを つるした竹
function sasaTree(x, y, r) {
  let s = '';
  const top = y - r * 1.6;
  s += `<path d="M${f(x)},${f(y + r)} Q${f(x - r * 0.1)},${f(y - r * 0.4)} ${f(x + r * 0.15)},${f(top)}" stroke="#7fae5c" stroke-width="${f(r * 0.14)}" fill="none" stroke-linecap="round"/>`;
  for (let k = 0; k < 4; k++) s += `<path d="M${f(x - r * 0.04)},${f(y + r * 0.6 - k * r * 0.55)} h${f(r * 0.12)}" stroke="#5f8f45" stroke-width="2"/>`;
  [[-1, -1.3, -40], [1, -1.15, 35], [-1, -0.7, -30], [1, -0.5, 30], [-1, -0.1, -35], [1, 0.1, 40], [0.3, -1.5, 10]].forEach(([d, yy, rot]) => {
    const bx = x + d * r * 0.1;
    const by = y + yy * r;
    s += `<path d="M${f(bx)},${f(by)} q${f(d * r * 0.4)},${f(-r * 0.1)} ${f(d * r * 0.75)},${f(r * 0.05)}" stroke="#7fae5c" stroke-width="2" fill="none"/>`;
    for (let j = 0; j < 3; j++) s += `<ellipse cx="${f(bx + d * r * (0.3 + j * 0.2))}" cy="${f(by + r * 0.05 + j * 3)}" rx="${f(r * 0.2)}" ry="${f(r * 0.06)}" fill="#9fcb72" transform="rotate(${rot + j * 10} ${f(bx + d * r * (0.3 + j * 0.2))} ${f(by + r * 0.05 + j * 3)})"/>`;
  });
  [[-0.5, -1.0, 0], [0.55, -0.85, 1], [-0.45, -0.3, 2], [0.5, -0.15, 3], [0.1, -1.35, 4], [-0.2, 0.25, 1]].forEach(([dx, dy, v]) => { s += at(x + dx * r, y + dy * r, M.tanzaku(r * 0.3, v)); });
  return `<g>${s}</g>`;
}
// 小判の なる木（招き猫の日）
const kobanTree = (x, y, r, color, i, P) => roundTree(x, y, r, color, P, onCanopy(x, y, r, 6, (k) => M.koban(r * 0.2, k), 9));
// ちょっと ふしぎな木（ハロウィン）：うすむらさきの葉に、かぼちゃの ちょうちん
const spookyTree = (x, y, r, color, i, P) => roundTree(x, y, r, color, P,
  `<path d="M${f(x - r * 0.3)},${f(y + r * 0.2)} q${f(r * 0.15)},${f(-r * 0.12)} ${f(r * 0.3)},0 M${f(x + r * 0.05)},${f(y + r * 0.2)} q${f(r * 0.15)},${f(-r * 0.12)} ${f(r * 0.3)},0" stroke="#8f78b6" stroke-width="2" fill="none" stroke-linecap="round"/>`
  + `<path d="M${f(x + r * 0.7)},${f(y + r * 0.35)} v${f(r * 0.3)}" stroke="#8f78b6" stroke-width="1.5"/>${at(x + r * 0.7, y + r * 0.85, M.pumpkin(r * 0.32, 0))}`
  + `<path d="M${f(x - r * 0.75)},${f(y + r * 0.4)} v${f(r * 0.2)}" stroke="#8f78b6" stroke-width="1.5"/>${at(x - r * 0.75, y + r * 0.78, M.candy(r * 0.25, 1))}`);

// ---- 背の高い物（地面 baseY から上へ） ----
const nanohana = (x, baseY, k) => {
  const h = 70 + (k % 3) * 14;
  let s = `<path d="M${f(x)},${f(baseY)} Q${f(x + 6)},${f(baseY - h * 0.5)} ${f(x + 2)},${f(baseY - h)}" stroke="#86a256" stroke-width="3" fill="none"/>`
    + `<ellipse cx="${f(x - 8)}" cy="${f(baseY - h * 0.35)}" rx="10" ry="4" fill="#9fcb72" transform="rotate(-30 ${f(x - 8)} ${f(baseY - h * 0.35)})"/>`;
  [[0, 0], [-6, 6], [6, 5], [-3, 12], [4, 13], [0, -6]].forEach(([dx, dy]) => { s += `<circle cx="${f(x + 2 + dx)}" cy="${f(baseY - h + dy)}" r="4.2" fill="#f6d55e" stroke="#e3b53a" stroke-width="0.8"/>`; });
  return s;
};
const tsukushi = (x, baseY, k) => {
  const h = 40 + (k % 2) * 12;
  return `<path d="M${f(x)},${f(baseY)} V${f(baseY - h)}" stroke="#d9c3a1" stroke-width="4" stroke-linecap="round"/>`
    + `<ellipse cx="${f(x)}" cy="${f(baseY - h - 8)}" rx="4.5" ry="10" fill="#b98a6a"/>`
    + [0.3, 0.6].map((t) => `<path d="M${f(x - 4)},${f(baseY - h * t)} h8" stroke="#a7744a" stroke-width="2"/>`).join('');
};
const tallSunflower = (x, baseY, k) => {
  const h = 110 + (k % 3) * 18;
  return `<path d="M${f(x)},${f(baseY)} Q${f(x - 5)},${f(baseY - h * 0.5)} ${f(x)},${f(baseY - h)}" stroke="#86b25e" stroke-width="4" fill="none"/>`
    + `<ellipse cx="${f(x + 12)}" cy="${f(baseY - h * 0.45)}" rx="13" ry="6" fill="#9fcb72" transform="rotate(-25 ${f(x + 12)} ${f(baseY - h * 0.45)})"/>`
    + `<ellipse cx="${f(x - 12)}" cy="${f(baseY - h * 0.25)}" rx="13" ry="6" fill="#9fcb72" transform="rotate(25 ${f(x - 12)} ${f(baseY - h * 0.25)})"/>`
    + at(x, baseY - h, M.sunflower(30));
};
const susukiAt = (x, baseY, k) => {
  const d = [0, 10, -6, 8][k % 4];
  return `<path d="M${f(x)},${f(baseY)} Q${f(x + d)},${f(baseY - 100)} ${f(x + 22 + d)},${f(baseY - 150)}" stroke="#c9a670" stroke-width="3" fill="none" stroke-linecap="round"/>`
    + `<path d="M${f(x + 22 + d)},${f(baseY - 150)} q-4,24 -10,44 M${f(x + 22 + d)},${f(baseY - 150)} q8,20 6,40 M${f(x + 18 + d)},${f(baseY - 138)} q-14,18 -18,32" stroke="#e9d3a8" stroke-width="7" fill="none" stroke-linecap="round"/>`;
};
const nantenBush = (x, baseY, k) => at(x + 10, baseY - 26, nanten(30 + (k % 2) * 6)) + `<ellipse cx="${f(x + 10)}" cy="${f(baseY - 2)}" rx="24" ry="8" fill="#ffffff" stroke="#d3e1ea" stroke-width="1.5"/>`;
const onPole = (x, baseY, h, inner, col = '#c99a62') => `<path d="M${f(x)},${f(baseY)} V${f(baseY - h)}" stroke="${col}" stroke-width="4" stroke-linecap="round"/>${at(x, baseY - h, inner)}`;
const nekojarashi = (x, baseY, k) => {
  const h = 90 + (k % 3) * 16;
  const tx = x + 26;
  const ty = baseY - h;
  return `<path d="M${f(x)},${f(baseY)} Q${f(x + 4)},${f(baseY - h * 0.6)} ${f(tx)},${f(ty)}" stroke="#9fb26a" stroke-width="3" fill="none"/>`
    + `<path d="M${f(tx)},${f(ty)} q14,8 18,26" stroke="#d8d39a" stroke-width="13" fill="none" stroke-linecap="round"/>`
    + `<path d="M${f(tx)},${f(ty)} q14,8 18,26" stroke="#ece8b8" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="2 3"/>`
    + `<ellipse cx="${f(x - 10)}" cy="${f(baseY - h * 0.3)}" rx="14" ry="4" fill="#9fcb72" transform="rotate(-35 ${f(x - 10)} ${f(baseY - h * 0.3)})"/>`;
};
const koinoboriPole = (x, baseY, h, dir = 1) => {
  let s = `<path d="M${f(x)},${f(baseY)} V${f(baseY - h)}" stroke="#c99a62" stroke-width="5" stroke-linecap="round"/>${at(x, baseY - h - 6, `<circle r="7" fill="${C.icho}" stroke="${C.ichoDeep}" stroke-width="1.5"/>`)}`
    + `<path d="M${f(x)},${f(baseY - h + 6)} l${f(dir * 18)},-4 M${f(x)},${f(baseY - h + 6)} l${f(dir * 16)},10" stroke="#c99a62" stroke-width="2"/>`;
  [[0, 34, 0], [1, 28, 1], [2, 24, 2]].forEach(([k, sz, v]) => { s += `<g transform="translate(${f(x + dir * (sz + 6))} ${f(baseY - h + 22 + k * 36)}) scale(${dir} 1)">${M.koinobori(sz, v)}</g>`; });
  return s;
};
const nobori = (x, baseY, h, text = 'まねき', bg = '#fffaf0', fg = '#e8664a') => `<path d="M${f(x)},${f(baseY)} V${f(baseY - h)}" stroke="#a77048" stroke-width="3"/><path d="M${f(x)},${f(baseY - h + 4)} h26" stroke="#a77048" stroke-width="3"/>`
  + `<rect x="${f(x + 2)}" y="${f(baseY - h + 6)}" width="24" height="${f(h * 0.62)}" fill="${bg}" stroke="${fg}" stroke-width="2"/>`
  + `<rect x="${f(x + 2)}" y="${f(baseY - h + 6)}" width="24" height="8" fill="${fg}"/>`
  + [...text].map((ch, k) => `<text x="${f(x + 14)}" y="${f(baseY - h + 26 + k * 15)}" font-size="13" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="central">${ch}</text>`).join('');

// ---- 空の飾り（場面の最後に重ねる。座標は 390×844） ----
// ひもに つるした物の列（y0 の高さ、たるみ sag）
function garland(y0, sag, n, draw, rope = '#c99a62', x0 = -10, x1 = 400) {
  let s = `<path d="M${x0},${y0} Q${(x0 + x1) / 2},${y0 + sag * 2} ${x1},${y0}" stroke="${rope}" stroke-width="2" fill="none"/>`;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + 4 * sag * t * (1 - t);
    s += at(x, y, draw(k));
  }
  return s;
}
// 場所の目安：上の帯（題名の後ろ）は飾りの帯（decor.js）が使う。場面の空の飾りは、その下の左右に置く。
// 星をちらす（夜空）
function stars(seed, n, area, big = 0.25) {
  const rnd = rand(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = area.x + rnd() * area.w;
    const y = area.y + rnd() * area.h;
    s += rnd() < big ? at(x, y, starShape(6 + rnd() * 4, '#fff3b8', '#f1d27a')) : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.8 + rnd() * 1.4)}" fill="#ffffff" opacity="${f(0.55 + rnd() * 0.4)}"/>`;
  }
  return s;
}
const bigMoon = (x, y, r, rabbit = false) => `<g><circle cx="${x}" cy="${y}" r="${f(r * 1.5)}" fill="#fff6c8" opacity="0.12"/><circle cx="${x}" cy="${y}" r="${f(r * 1.2)}" fill="#fff6c8" opacity="0.18"/>`
  + `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff3b8" stroke="#f1d27a" stroke-width="2"/><circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.25)}" r="${f(r * 0.14)}" fill="#f6e39a" opacity="0.7"/><circle cx="${f(x + r * 0.3)}" cy="${f(y + r * 0.3)}" r="${f(r * 0.2)}" fill="#f6e39a" opacity="0.7"/>`
  + (rabbit ? `<g transform="translate(${f(x + r * 0.05)} ${f(y + r * 0.1)}) scale(${f(r / 40)})" fill="#f1d27a" opacity="0.8"><ellipse cx="0" cy="8" rx="14" ry="10"/><ellipse cx="-6" cy="-10" rx="3.5" ry="11" transform="rotate(-15 -6 -10)"/><ellipse cx="3" cy="-10" rx="3.5" ry="11" transform="rotate(10 3 -10)"/><rect x="10" y="-2" width="4" height="22" rx="2" transform="rotate(25 12 9)"/></g>` : '')
  + '</g>';
const crescent = (x, y, r) => `<path d="M${f(x)},${f(y - r)} A${r},${r} 0 1 0 ${f(x)},${f(y + r)} A${f(r * 0.75)},${f(r * 0.85)} 0 1 1 ${f(x)},${f(y - r)} Z" fill="#fff3b8" stroke="#f1d27a" stroke-width="1.5"/>`;
const milkyWay = () => {
  const rnd = rand(21);
  let s = `<path d="M-20,330 Q170,180 410,120" stroke="#9aa6e0" stroke-width="70" fill="none" opacity="0.18" stroke-linecap="round"/><path d="M-20,330 Q170,180 410,120" stroke="#c9d0f4" stroke-width="30" fill="none" opacity="0.22" stroke-linecap="round"/>`;
  for (let k = 0; k < 70; k++) {
    const t = rnd();
    const x = -20 + 430 * t;
    const y = 330 - 210 * t + (rnd() - 0.5) * 60 + Math.sin(t * 3) * 10;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + rnd() * 1.3)}" fill="#ffffff" opacity="${f(0.5 + rnd() * 0.5)}"/>`;
  }
  return s;
};
// 夜の雲（うすい）
const nightCloud = (w) => `<g opacity="0.35">${plainCloud(w)}</g>`;
// 入道雲（夏）
const tallCloud = (w) => {
  const s = (v) => f(v * w);
  return `<g><path d="M${s(-0.6)},${s(0.15)} Q${s(-0.66)},${s(-0.1)} ${s(-0.4)},${s(-0.12)} Q${s(-0.42)},${s(-0.42)} ${s(-0.14)},${s(-0.4)} Q${s(-0.1)},${s(-0.75)} ${s(0.18)},${s(-0.62)} Q${s(0.42)},${s(-0.55)} ${s(0.36)},${s(-0.3)} Q${s(0.66)},${s(-0.28)} ${s(0.62)},${s(0.15)} Z" fill="#ffffff" stroke="#d3e6f0" stroke-width="2"/>`
    + `<path d="M${s(-0.5)},${s(0.15)} Q${s(0)},${s(0.02)} ${s(0.55)},${s(0.15)}" stroke="#e1edf3" stroke-width="${s(0.08)}" fill="none"/></g>`;
};
const auspiciousCloud = (w) => `<g>${plainCloud(w).replace('opacity="0.9"', 'stroke="#f3c27a" stroke-width="2" opacity="0.95"')}</g>`;
const hatsuhinode = (x, y, r) => `<g><circle cx="${x}" cy="${y}" r="${f(r * 1.6)}" fill="#ffd8b0" opacity="0.35"/>${ring(12, r * 1.35, (dx, dy, d) => `<path d="M${f(x + dx * 0.85)},${f(y + dy * 0.85)} L${f(x + dx * 1.1)},${f(y + dy * 1.1)}" stroke="#f7a6a0" stroke-width="4" stroke-linecap="round"/>`)}<circle cx="${x}" cy="${y}" r="${r}" fill="#f7867a" stroke="#ec6f6f" stroke-width="2"/><ellipse cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" rx="${f(r * 0.25)}" ry="${f(r * 0.15)}" fill="#ffffff" opacity="0.4"/></g>`;
const fuji = (x, y, w) => `<path d="M${f(x - w)},${f(y)} L${f(x - w * 0.22)},${f(y - w * 0.55)} H${f(x + w * 0.22)} L${f(x + w)},${f(y)} Z" fill="#cfdcef"/><path d="M${f(x - w * 0.22)},${f(y - w * 0.55)} H${f(x + w * 0.22)} L${f(x + w * 0.4)},${f(y - w * 0.38)} L${f(x + w * 0.2)},${f(y - w * 0.42)} L${f(x)},${f(y - w * 0.34)} L${f(x - w * 0.2)},${f(y - w * 0.42)} L${f(x - w * 0.4)},${f(y - w * 0.38)} Z" fill="#ffffff"/>`;
const kohakuMaku = (y0, h) => {
  let s = '';
  for (let k = 0; k < 13; k++) s += `<rect x="${k * 30}" y="${y0}" width="30" height="${h}" fill="${k % 2 ? '#ffffff' : '#f28a8a'}"/>`;
  s += `<path d="M0,${y0 + h} ${Array.from({ length: 14 }, (_, k) => `Q${k * 30 + 15},${y0 + h + 14} ${(k + 1) * 30},${y0 + h}`).join(' ')} V${y0} H0 Z" fill="#ffffff" opacity="0"/>`;
  return `<g opacity="0.92">${s}<path d="M0,${y0} H390" stroke="#c99a62" stroke-width="3"/></g>`;
};
const tsurushiBina = (x, y0, len, k0) => {
  let s = `<path d="M${x},${y0} V${y0 + len}" stroke="#e3a3b8" stroke-width="1.5"/>`;
  const items = [(s2) => momo(s2, 0), (s2) => `<circle r="${f(s2 * 0.5)}" fill="#f7a6a0" stroke="#e08d7c" stroke-width="1"/><path d="M${f(-s2 * 0.5)},0 H${f(s2 * 0.5)}" stroke="#fde3a6" stroke-width="2"/>`, (s2) => M.hishimochi(s2 * 0.6), (s2) => blossom(s2, '#fde3a6', '#e6c46a'), (s2) => `<path d="M0,${f(-s2 * 0.5)} L${f(s2 * 0.4)},0 L0,${f(s2 * 0.5)} L${f(-s2 * 0.4)},0 Z" fill="#cfe0ea" stroke="#9fbdd0" stroke-width="1"/>`];
  for (let j = 0; j < 5; j++) s += at(x, y0 + 18 + j * (len - 18) / 5, items[(j + k0) % items.length](13));
  return s;
};

// ---- 動く物（.scene-fx の中。390×844 の中の % で置く。CSS のアニメーションで動かす） ----
// 位置は data-p に「左・上・幅・高さ（%）・遅れ（秒）」で書き、app.js が style に移す（CSP で style 属性が使えないため）
const fxItem = (cls, x, y, w, svg, delay = 0, h = w) => `<div class="${cls}" data-p="${[f((x - w / 2) / 3.9), f((y - h / 2) / 8.44), f(w / 3.9), f(h / 8.44), f(delay)].join(',')}"><svg viewBox="-50 -50 100 100">${svg}</svg></div>`;
const firework = (c1, c2) => `<g>${ring(16, 40, (x, y) => `<path d="M${f(x * 0.35)},${f(y * 0.35)} L${f(x)},${f(y)}" stroke="${c1}" stroke-width="3.2" stroke-linecap="round"/><circle cx="${f(x * 1.1)}" cy="${f(y * 1.1)}" r="3" fill="${c2}"/>`)}${ring(8, 18, (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="2.5" fill="${c2}"/>`, -67)}<circle r="5" fill="#fff6c8"/></g>`;
const twinkle = () => `<g>${starShape(70, '#fff3b8', '#f1d27a')}</g>`;
const fireflyDot = () => `<circle r="22" fill="#f6f7a8" opacity="0.35"/><circle r="10" fill="#fbfcc8"/>`;
function twinkles(seed, n, area, size = 16) {
  const rnd = rand(seed);
  let s = '';
  for (let k = 0; k < n; k++) s += fxItem('fx-twinkle', area.x + rnd() * area.w, area.y + rnd() * area.h, size * (0.7 + rnd() * 0.6), twinkle(), -rnd() * 3);
  return s;
}

// ================= 季節のセット =================
const SEASON = {
  haru: {
    pal: {
      sky: ['#fde6ec', '#fdf0f2', '#fff8f2'], tree: ['#f9c6d3', '#fbd9e2', '#f5b8cd'], trunk: '#b9784e',
      hillA: '#e8efc4', hillB: '#dbe7b2', field: '#e6eec0', fieldB: '#d9e6ae', grass: '#e3ecbc', bush: ['#b9d48a', '#a9c87a', '#c6dd9a'],
    },
    pattern: { id: 'haru', w: 64, h: 64, svg: `<g transform="translate(14 16) rotate(30)">${sakuraPetal(7, 0)}</g><g transform="translate(46 44) rotate(-40)">${sakuraPetal(6, 1)}</g>`, op: 0.4 },
    tree: (x, y, r, c, i, P) => roundTree(x, y, r, c, P, onCanopy(x, y, r, 7, (k) => sakura(r * 0.18, k), i + 2)),
    piece: (i, s) => [() => sakuraPetal(s * 0.8, i), () => tanpopo(s * 0.7), () => sakuraPetal(s * 0.7, i + 1), () => clover(s * 0.7)][i % 4](),
    fruit: (s, i = 0) => [ichigo, sakuramochi, (z) => at(0, 0, M.dango(z * 0.9), 70)][i % 3](s),
    flower: (x, y, r, k) => (k % 3 === 2 ? at(x, y, tanpopo(r * 2)) : smallFlowerHaru(x, y, r, k)),
    plant: (x, baseY, k) => (k % 2 ? tsukushi(x, baseY, k) : nanohana(x, baseY, k)),
    branch: (x, y, i) => at(x, y - 18, sakura(15, i)) + at(x + 14, y - 4, sakura(11, i + 1)),
    winItem: (px, py, k) => at(px, py - 6, sakura(9, k)),
    air: (k, s) => (k % 3 === 2 ? uguisu(s) : M.butterfly(s, k)),
    yard: (x, y, s) => at(x, y, tulips(s)),
  },
  natsu: {
    pal: {
      sky: ['#c7e8f6', '#e0f3f9', '#f6fbf4'], tree: ['#8cc266', '#a3d17a', '#7ab658'], trunk: '#a77048',
      hillA: '#d6eaa8', hillB: '#c4de92', field: '#d2e8a4', fieldB: '#c2dd90', grass: '#cfe6a0', bush: ['#8cbf63', '#7fb258', '#9fcf72'],
    },
    tree: (x, y, r, c, i, P) => roundTree(x, y, r, c, P, `<circle cx="${f(x + r * 0.35)}" cy="${f(y + r * 0.2)}" r="${f(r * 0.35)}" fill="#ffffff" opacity="0.12"/><circle cx="${f(x - r * 0.75)}" cy="${f(y + r * 0.35)}" r="${f(r * 0.25)}" fill="#ffffff" opacity="0.12"/>`),
    cloud: tallCloud,
    piece: (i, s) => [() => clover(s * 0.7), () => blossom(s * 0.55, '#ffffff', '#e6e0c8', C.icho), () => asagao(s * 0.6, i)][i % 3](),
    fruit: (s, i = 0) => [melonSlice, corn, (z) => M.kakigori(z * 0.9)][i % 3](s),
    flower: (x, y, r, k) => (k % 2 ? at(x, y, asagao(r * 1.6, k)) + `<path d="M${f(x)},${f(y + r)} v${f(r * 4)}" stroke="${C.oliveDeep}" stroke-width="1.6" opacity="0.6"/>` : smallFlowerNatsu(x, y, r)),
    plant: (x, baseY, k) => tallSunflower(x, baseY, k),
    branch: (x, y, i) => at(x, y - 16, mapleLeaf(['#a9cf7f', '#8fbf6a', '#bfe08f'][i % 3], '#6f9a4f', 13), i * 40),
    winItem: (px, py, k) => at(px, py - 6, mapleLeaf(['#a9cf7f', '#8fbf6a'][k % 2], '#6f9a4f', 9), k * 30),
    air: (k, s) => (k % 3 === 2 ? M.butterfly(s, 1) : bubble(s)),
    yard: (x, y, s) => at(x, y, watermelon(s * 0.8)),
  },
  aki: {
    pal: {
      sky: [C.skyTop, C.sky, C.cream], tree: [C.momiji, C.icho, C.kaki], trunk: C.chestnut,
      hillA: '#f6d9a8', hillB: '#f2c98e', field: '#eadfb0', fieldB: '#e2d39c', grass: '#e7e5b4', bush: ['#b9cc85', '#a9c17a', '#c3d494'],
    },
    piece: (i, s) => (i % 5 === 4 ? acorn(s * 0.7) : autumnLeaf(i, s)),
    fruit: (s, i = 0) => [persimmon, (z) => M.donguri(z), kuri][i % 3](s),
    flower: (x, y, r, k) => smallFlowerAki(x, y, r, k),
    plant: susukiAt,
    branch: (x, y, i) => `<path d="M${x},${y - 16} L${x - 6},${y - 34}" stroke="#8a5a36" stroke-width="3" stroke-linecap="round"/>${at(x, y, persimmon(i % 2 ? 15 : 17))}`,
    winItem: (px, py, k) => at(px, py - 6, mapleLeaf(k % 2 ? C.momiji : C.kaki, k % 2 ? C.momijiDeep : C.kakiDeep, 9), k * 40),
    air: (k, s) => dragonfly(s),
    yard: (x, y, s, k = 0) => at(x, y, k % 2 ? kinokoPair(s) : leafPile(s)),
  },
  fuyu: {
    pal: {
      sky: ['#e2edf5', '#edf4f8', '#f8fbfc'], tree: ['#f6f9fb', '#eef4f8', '#f9fbfd'], trunk: '#b9a08a', snowy: true,
      hillA: '#f2f6f9', hillB: '#e5edf3', field: '#eef3f7', fieldB: '#e3ebf1', grass: '#edf2f6', bush: ['#e9f0f5', '#dfe8ef', '#f1f5f8'],
    },
    pattern: { id: 'fuyu', w: 56, h: 56, svg: '<circle cx="12" cy="14" r="2.4" fill="#ffffff"/><circle cx="40" cy="30" r="1.8" fill="#ffffff"/><circle cx="24" cy="46" r="2.1" fill="#ffffff"/>', op: 1 },
    tree: (x, y, r, c, i, P) => (i % 2 ? firTree(x, y + r * 0.2, r * 0.9) : roundTree(x, y, r, c, P)),
    piece: (i, s) => (i % 4 === 3 ? nanten(s * 0.7) : i % 3 === 0 ? snowflake(s * 0.7) : snowLump(s)),
    fruit: (s, i = 0) => [(z) => M.mikan(z), (z) => M.usagi(z), (z) => M.mittens(z * 0.9)][i % 3](s),
    flower: (x, y, r, k) => smallFlowerFuyu(x, y, r, k),
    plant: nantenBush,
    branch: (x, y) => `<ellipse cx="${x}" cy="${y - 26}" rx="12" ry="5" fill="#ffffff" stroke="#d3e1ea" stroke-width="1.5"/><circle cx="${x - 4}" cy="${y - 16}" r="4" fill="#e8664a"/><circle cx="${x + 3}" cy="${y - 14}" r="4" fill="#e8664a"/>`,
    winItem: (px, py, k) => `<ellipse cx="${f(px)}" cy="${f(py - 3)}" rx="7" ry="3" fill="#ffffff" stroke="#d3e1ea" stroke-width="1"/>${k % 2 ? `<circle cx="${f(px + 3)}" cy="${f(py + 3)}" r="3" fill="#e8664a"/>` : ''}`,
    air: (k, s) => shimaenaga(s),
    yard: (x, y, s, k = 0) => (k % 2 ? at(x, y, M.usagi(s * 0.8)) : at(x, y - s * 0.3, M.snowman(s))),
  },
};

// 季節の野の花
function smallFlowerHaru(x, y, r, k) {
  const col = k % 2 ? '#f6d55e' : '#ffffff';
  return `<path d="M${f(x)},${f(y + r)} q${f(r * 0.4)},${f(r * 3)} ${f(-r * 0.2)},${f(r * 6)}" stroke="${C.oliveDeep}" stroke-width="1.6" fill="none" opacity="0.6"/>`
    + ring(5, r * 0.7, (dx, dy) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(r * 0.55)}" fill="${col}" stroke="#e6d58a" stroke-width="0.8"/>`, 0)
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.4)}" fill="${C.icho}"/>`;
}
function smallFlowerNatsu(x, y, r) {
  return `<path d="M${f(x)},${f(y + r)} v${f(r * 6)}" stroke="${C.oliveDeep}" stroke-width="2" opacity="0.7"/>`
    + ring(10, r, (dx, dy, d) => `<ellipse cx="${f(x + dx)}" cy="${f(y + dy)}" rx="${f(r * 0.5)}" ry="${f(r * 0.24)}" fill="#f6c84a" transform="rotate(${f(d)} ${f(x + dx)} ${f(y + dy)})"/>`, 0)
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.6)}" fill="#a7744a"/>`;
}
function smallFlowerFuyu(x, y, r, k) {
  if (k % 3 === 2) {
    // すいせん
    return `<path d="M${f(x)},${f(y + r)} v${f(r * 4)}" stroke="#86a256" stroke-width="1.6"/>` + at(x, y, blossom(r * 1.5, '#ffffff', '#e6e0c8', '#f6c84a', 6));
  }
  return `<ellipse cx="${f(x)}" cy="${f(y + r * 0.9)}" rx="${f(r * 1.6)}" ry="${f(r * 0.5)}" fill="#ffffff" stroke="#d3e1ea" stroke-width="1"/>`
    + `<ellipse cx="${f(x - r * 0.8)}" cy="${f(y + r * 0.2)}" rx="${f(r * 0.7)}" ry="${f(r * 0.35)}" fill="#86a256"/>`
    + ring(5, r * 0.5, (dx, dy) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(r * 0.5)}" fill="#ec7a7a"/>`, 0)
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.3)}" fill="${C.icho}"/>`;
}
function smallFlowerAki(x, y, r, k) {
  const col = ['#f9c6d3', '#fde3ea', '#f5b8cd', '#ffffff'][k % 4];
  return `<path d="M${f(x)},${f(y + r)} q${f(r * 0.4)},${f(r * 3)} ${f(-r * 0.2)},${f(r * 6)}" stroke="${C.oliveDeep}" stroke-width="1.6" fill="none" opacity="0.6"/>`
    + ring(8, r * 0.75, (dx, dy, d) => `<ellipse cx="${f(x + dx)}" cy="${f(y + dy)}" rx="${f(r * 0.5)}" ry="${f(r * 0.28)}" fill="${col}" stroke="#e9a1b8" stroke-width="0.8" transform="rotate(${f(d)} ${f(x + dx)} ${f(y + dy)})"/>`, 0)
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.32)}" fill="${C.icho}"/>`;
}

// ================= 行事のセット（季節のセットの上に重ねる） =================
// 夜の地面（明るすぎず、暗すぎない色）
const NIGHT_GROUND = { hillA: '#8f9fb8', hillB: '#7e8fab', field: '#93a3ba', fieldB: '#8394ae', grass: '#8d9db6', bush: ['#6f86a3', '#647b98', '#7a90ac'], trunk: '#7a6a72' };
const NIGHT_TREE = ['#7690ad', '#6a84a2', '#829bb6'];
const tail = (s) => `<path d="M0,${f(s * 0.5)} q${f(-s * 0.2)},${f(s * 0.5)} 0,${f(s)}" stroke="#d9c3a1" stroke-width="1.2" fill="none"/>`;
const flag = (c) => `<path d="M-10,0 H10 L0,22 Z" fill="${c}"/>`;
const santaSnowman = (s) => `<g>${M.snowman(s)}<path d="M${f(-s * 0.32)},${f(-s * 0.68)} Q0,${f(-s * 1.5)} ${f(s * 0.4)},${f(-s * 0.9)} L${f(s * 0.3)},${f(-s * 0.66)} Z" fill="${C.momiji}"/><circle cx="${f(s * 0.42)}" cy="${f(-s * 0.92)}" r="${f(s * 0.1)}" fill="#ffffff"/><rect x="${f(-s * 0.38)}" y="${f(-s * 0.74)}" width="${f(s * 0.76)}" height="${f(s * 0.14)}" rx="${f(s * 0.07)}" fill="#ffffff"/></g>`;
const toro = (s) => `<g>${glow(s * 0.7, '#ffe9a8', 0.35)}<rect x="${f(-s * 0.15)}" y="${f(-s * 0.1)}" width="${f(s * 0.3)}" height="${f(s * 0.7)}" fill="#c9c3b8"/><path d="M${f(-s * 0.5)},${f(-s * 0.2)} H${f(s * 0.5)} L${f(s * 0.3)},${f(-s * 0.45)} H${f(-s * 0.3)} Z" fill="#b9b2a6"/><rect x="${f(-s * 0.3)}" y="${f(-s * 0.2)}" width="${f(s * 0.6)}" height="${f(s * 0.32)}" fill="#ffe9a8" stroke="#b9b2a6" stroke-width="2"/><path d="M${f(-s * 0.55)},${f(-s * 0.45)} Q0,${f(-s * 0.85)} ${f(s * 0.55)},${f(-s * 0.45)} Z" fill="#ffffff"/></g>`;
const yagura = (s) => `<g>${glow(s, '#ffd9a8', 0.25)}<path d="M${f(-s * 0.7)},${f(s * 0.6)} L${f(-s * 0.45)},${f(-s * 0.3)} H${f(s * 0.45)} L${f(s * 0.7)},${f(s * 0.6)}" stroke="#c99a62" stroke-width="3" fill="none"/><path d="M${f(-s * 0.6)},${f(s * 0.2)} H${f(s * 0.6)}" stroke="#c99a62" stroke-width="3"/><rect x="${f(-s * 0.55)}" y="${f(-s * 0.45)}" width="${f(s * 1.1)}" height="${f(s * 0.25)}" fill="#fff6e4" stroke="#e8664a" stroke-width="2"/><path d="M${f(-s * 0.7)},${f(-s * 0.45)} L0,${f(-s * 0.85)} L${f(s * 0.7)},${f(-s * 0.45)} Z" fill="#e8a080"/></g>`;
const picnicSheet = (s) => `<path d="M${f(-s)},${f(s * 0.3)} L${f(-s * 0.7)},${f(-s * 0.2)} H${f(s * 0.7)} L${f(s)},${f(s * 0.3)} Z" fill="#cfe0ea" stroke="#9fbdd0" stroke-width="1.5"/><path d="M${f(-s * 0.85)},${f(s * 0.05)} H${f(s * 0.85)} M${f(-s * 0.25)},${f(-s * 0.2)} L${f(-s * 0.35)},${f(s * 0.3)} M${f(s * 0.25)},${f(-s * 0.2)} L${f(s * 0.35)},${f(s * 0.3)}" stroke="#ffffff" stroke-width="2"/>${at(0, -s * 0.2, bento(s * 0.4))}`;
const shobu = (x, y, r) => `<path d="M${f(x)},${f(y + r)} v${f(r * 5)}" stroke="#86a256" stroke-width="2"/><path d="M${f(x)},${f(y + r * 2)} q${f(-r * 1.5)},${f(-r * 2)} ${f(-r * 0.6)},${f(-r * 4)}" stroke="#9fcb72" stroke-width="2" fill="none"/>`
  + at(x, y, `<path d="M0,0 Q${f(-r * 1.4)},${f(-r * 0.4)} ${f(-r * 0.8)},${f(r * 0.8)} Q0,${f(r * 0.2)} 0,0 Q${f(r * 1.4)},${f(-r * 0.4)} ${f(r * 0.8)},${f(r * 0.8)} Q0,${f(r * 0.2)} 0,0 Z M0,0 Q${f(-r * 0.4)},${f(-r * 1.6)} 0,${f(-r * 1.6)} Q${f(r * 0.4)},${f(-r * 1.6)} 0,0 Z" fill="#b48ad6" stroke="#8f66b8" stroke-width="1"/><circle r="${f(r * 0.2)}" fill="#f6d55e"/>`);
const onStem = (x, y, r, inner, col = '#86a256') => `<path d="M${f(x)},${f(y + r)} v${f(r * 4)}" stroke="${col}" stroke-width="1.6"/>` + at(x, y, inner);
const hangOn = (x, y, inner, col) => `<path d="M${x},${y - 30} V${y - 18}" stroke="${col}" stroke-width="1.5"/>` + at(x, y - 8, inner);

const EVENT = {
  christmas: {
    pal: { sky: ['#d5ece2', '#eaf5ef', '#fbf8f2'], tree: ['#8fbf6a', '#86b25e', '#9fcb72'], trunk: '#b9784e', snowy: true, hillA: '#f4f8f9', hillB: '#e6eff2', field: '#f0f5f6', fieldB: '#e4edf0', grass: '#eef4f5', bush: ['#9fcb72', '#86b25e', '#b5d98a'] },
    pattern: { id: 'xmas', w: 60, h: 60, svg: '<circle cx="10" cy="12" r="2.2" fill="#ffffff"/><circle cx="40" cy="30" r="1.6" fill="#ffffff"/><circle cx="24" cy="48" r="2" fill="#ffffff"/>', op: 0.9 },
    tree: (x, y, r) => firTree(x, y + r * 0.2, r * 1.05, { deco: true }),
    piece: (i, s) => [() => M.ornament(s * 0.45, i), () => M.present(s * 0.45, i), () => starShape(s * 0.8), () => snowflake(s * 0.7)][i % 4](),
    fruit: (s, i = 0) => [cake, (z) => M.cane(z * 0.8), (z) => M.present(z * 0.7, i)][i % 3](s),
    flower: (x, y, r) => `<ellipse cx="${f(x)}" cy="${f(y + r)}" rx="${f(r * 1.6)}" ry="${f(r * 0.5)}" fill="#ffffff" stroke="#d3e1ea" stroke-width="1"/>` + at(x, y, poinsettia(r * 2)),
    plant: (x, baseY, k) => (k % 2 ? at(x + 8, baseY - 30, M.cane(26)) : firTree(x + 8, baseY - 36, 22, { deco: true })),
    branch: (x, y, i) => at(x, y - 6, M.ornament(10, i)),
    winItem: (px, py, k) => (k % 2 ? at(px, py - 4, starShape(10)) : `<ellipse cx="${f(px)}" cy="${f(py - 3)}" rx="7" ry="3" fill="#ffffff" stroke="#d3e1ea" stroke-width="1"/>`),
    air: (k, s) => (k % 2 ? M.bell(s * 0.8, k) : starShape(s * 0.9)),
    yard: (x, y, s, k = 0) => at(x, y, k % 2 ? presentPile(s) : santaSnowman(s)),
    sky: (kind) => (kind === 'home' ? '' : garland(120, 22, 13, (k) => M.bulb(7, k), '#86a256')),
    // 電球の列が またたく
    fx: () => Array.from({ length: 13 }, (_, k) => { const t = (k + 0.5) / 13; return fxItem('fx-blink', -10 + 410 * t, 120 + 88 * t * (1 - t) + 2, 22, '<circle r="40" fill="#fff6c8" opacity="0.7"/>', -(k % 4) * 0.5); }).join(''),
  },
  omisoka: {
    night: true,
    pal: { sky: ['#2c3566', '#46508a', '#8d88b6'], tree: NIGHT_TREE, snowy: true, ...NIGHT_GROUND, hillA: '#c9d3e4', hillB: '#b7c3d8', field: '#c4cfe1', fieldB: '#b3c0d6', grass: '#c0cbde', bush: ['#aebbd2', '#a2b0c9', '#b9c5da'] },
    tree: (x, y, r) => firTree(x, y + r * 0.2, r, { col: ['#6f8fa0', '#668798', '#7a99a8'] }),
    cloud: nightCloud,
    piece: (i, s) => (i % 3 === 0 ? snowflake(s * 0.7) : snowLump(s)),
    fruit: (s, i = 0) => [(z) => M.soba(z * 0.8), (z) => M.mikan(z)][i % 2](s),
    plant: nantenBush,
    air: (k, s) => starShape(s * 0.7, '#fff3b8', '#f1d27a'),
    yard: (x, y, s, k = 0) => at(x, y, k % 2 ? `<g>${glow(s * 0.9, '#ffe9a8', 0.3)}${M.temple(s * 0.8)}</g>` : toro(s)),
    sky: () => crescent(330, 200, 26) + stars(31, 40, { x: 0, y: 60, w: 390, h: 300 }),
    fx: () => twinkles(5, 8, { x: 10, y: 80, w: 370, h: 260 }),
  },
  oshogatsu: {
    pal: { sky: ['#fde0d2', '#fff0e2', '#fffaf0'], tree: ['#7fa86a', '#6f9a5c', '#8fb878'], trunk: '#a77048', hillA: '#eaf0d8', hillB: '#dbe6c4', field: '#e6eed2', fieldB: '#d8e4c0', grass: '#e4ecd0', bush: ['#7fa86a', '#6f9a5c', '#8fb878'] },
    pattern: { id: 'seigaiha', w: 40, h: 20, svg: '<path d="M0,20 A20,20 0 0 1 40,20 M6,20 A14,14 0 0 1 34,20 M12,20 A8,8 0 0 1 28,20" stroke="#f0c48a" stroke-width="1.6" fill="none"/>', op: 0.28 },
    tree: (x, y, r) => matsuTree(x, y, r),
    cloud: auspiciousCloud,
    piece: (i, s) => (i % 2 ? `<rect x="${f(-s * 0.3)}" y="${f(-s * 0.18)}" width="${f(s * 0.6)}" height="${f(s * 0.36)}" rx="${f(s * 0.08)}" fill="${['#ec7a7a', '#ffffff', '#f6d55e'][i % 3]}" stroke="#e6cfae" stroke-width="1"/>` : ume(s * 0.6, i)),
    fruit: (s, i = 0) => [(z) => M.mochi(z), juubako, (z) => M.mikan(z)][i % 3](s),
    flower: (x, y, r, k) => onStem(x, y, r, ume(r * 1.8, k), '#8a5a3c'),
    plant: (x, baseY) => at(x + 10, baseY - 30, M.kadomatsu(34)),
    branch: (x, y, i) => at(x, y - 14, ume(14, i)) + at(x + 12, y - 2, ume(10, i + 1)),
    winItem: (px, py, k) => at(px, py - 6, ume(9, k)),
    air: (k, s) => (k % 2 ? M.kite(s * 0.8) : hagoitaHane(s * 0.7)),
    yard: (x, y, s, k = 0) => at(x, y, k % 2 ? M.mochi(s * 0.9) : M.kadomatsu(s)),
    sky: (kind) => (OUTDOOR.has(kind) ? fuji(300, 300, 120) : '') + (kind === 'home' ? hatsuhinode(346, 64, 20) : hatsuhinode(330, 170, 30)),
  },
  setsubun: {
    pal: { sky: ['#fde9c4', '#fff4de', '#fffaf0'], tree: ['#a3bd6e', '#b5cc84', '#93b062'], trunk: '#8a5a3c', hillA: '#e6eec4', hillB: '#d8e4b0', field: '#e2ebbe', fieldB: '#d4e2aa', grass: '#e0e9ba', bush: ['#a9c47a', '#9fbb70', '#b5cc84'] },
    pattern: { id: 'mame', w: 46, h: 46, svg: '<ellipse cx="12" cy="12" rx="4" ry="3.4" fill="#e9cf9a"/><ellipse cx="34" cy="34" rx="4" ry="3.4" fill="#e9cf9a"/>', op: 0.35 },
    tree: (x, y, r, c, i) => blossomBranches(x, y, r, (s, k) => ume(s, k + i)),
    piece: (i, s) => (i % 3 === 2 ? ume(s * 0.55, i) : bean(s)),
    fruit: (s, i = 0) => [(z) => M.masu(z * 0.9), (z) => M.ehomaki(z * 0.8), (z) => M.beans(z)][i % 3](s),
    flower: (x, y, r, k) => onStem(x, y, r, k % 2 ? ume(r * 1.8, k) : blossom(r * 1.8, '#f6d55e', '#e3b53a', '#c99a62', 8), '#8a5a3c'),
    plant: (x, baseY) => onPole(x + 10, baseY, 60, M.holly(18)),
    branch: (x, y, i) => at(x, y - 14, ume(14, i)) + at(x + 12, y - 2, ume(10, i + 1)),
    winItem: (px, py, k) => at(px, py - 6, ume(9, k)),
    air: (k, s) => bean(s * 0.8),
    yard: (x, y, s, k = 0) => at(x, y, M.oni(s * 0.75, k % 2)),
    sky: (kind) => (kind === 'home' ? '' : garland(116, 18, 9, (k) => `<path d="M0,0 v5" stroke="#c99a62" stroke-width="1.5"/>${at(0, 18, M.oni(12, k % 2))}`, '#c99a62')),
  },
  valentine: {
    pal: { sky: ['#fddbe6', '#feecf2', '#fff8f4'], tree: ['#f6a9bf', '#f9c0d0', '#f4b8c8'], trunk: '#c98a6a', hillA: '#f8e0e8', hillB: '#f2d0dc', field: '#f6e4ea', fieldB: '#efd3dd', grass: '#f4e2e8', bush: ['#f4b8c8', '#eea8bc', '#f8c8d6'] },
    pattern: { id: 'heart', w: 56, h: 56, svg: `<g transform="translate(14 14)">${heartShape(12, '#f9c6d3', '#f9c6d3')}</g><g transform="translate(42 42)">${heartShape(9, '#ffffff', '#ffffff')}</g>`, op: 0.6 },
    tree: (x, y, r, c, i, P) => heartTree(x, y, r, c, P),
    piece: (i, s) => heartShape(s * 0.8, ['#f4a3b4', '#f7c4b4', '#fbd9e2', '#ffffff'][i % 4]),
    fruit: (s, i = 0) => [(z) => M.choco(z * 0.9), (z) => M.cocoa(z * 0.9), (z) => M.present(z * 0.7, 3)][i % 3](s),
    flower: (x, y, r, k) => onStem(x, y, r, heartShape(r * 2, ['#f4a3b4', '#ffffff', '#f7c4b4'][k % 3])),
    plant: (x, baseY, k) => balloonOn(x + 10, baseY, 70 + (k % 2) * 20, heartShape(30, ['#f4a3b4', '#f7a6a0'][k % 2])),
    branch: (x, y, i) => hangOn(x, y, heartShape(16, ['#f4a3b4', '#fbd9e2'][i % 2]), '#e3a3b8'),
    winItem: (px, py, k) => at(px, py - 5, heartShape(10, ['#f4a3b4', '#ffffff'][k % 2])),
    air: (k, s) => tail(s) + heartShape(s * 1.1, ['#f4a3b4', '#f7a6a0', '#fbd9e2'][k % 3]),
    yard: (x, y, s) => at(x, y, presentPile(s, 3)),
    sky: (kind) => (kind === 'home' ? '' : garland(116, 18, 12, (k) => heartShape(16, ['#f4a3b4', '#ffffff', '#f7a6a0'][k % 3]), '#e3a3b8')),
  },
  nekonohi: {
    pal: { sky: ['#fde3d6', '#fff0e6', '#fff9f2'], tree: ['#9fcb72', '#b5d98a', '#8cbf63'], trunk: '#b9784e', hillA: '#e6efc4', hillB: '#d8e6b0', field: '#e2ecbe', fieldB: '#d4e2aa', grass: '#e0eaba', bush: ['#a9cf7f', '#9fc574', '#b5d98a'] },
    pattern: { id: 'paw', w: 60, h: 60, svg: `<g transform="translate(16 16)">${pawPrint('#f6c8b8', 9)}</g><g transform="translate(46 44) rotate(20)">${pawPrint('#f6c8b8', 7)}</g>`, op: 0.55 },
    tree: (x, y, r, c, i, P) => catTopiary(x, y, r, c, P),
    piece: (i, s) => pawPrint(['#f7b4a6', '#e3a3b8', '#f5c451', '#9fc5e8'][i % 4], s * 0.6),
    fruit: (s, i = 0) => [(z) => M.fishCookie(z * 0.8), can, (z) => yarn(z * 0.9, i)][i % 3](s),
    flower: (x, y, r, k) => onStem(x, y, r, pawPrint(['#f7b4a6', '#f5c451', '#e3a3b8'][k % 3], r * 1.6)),
    plant: nekojarashi,
    branch: (x, y) => hangOn(x, y, M.suzu(12), '#e3a3b8'),
    winItem: (px, py, k) => at(px, py - 5, pawPrint(['#f7b4a6', '#e3a3b8'][k % 2], 8)),
    air: (k, s) => tail(s) + M.fishCookie(s * 0.9),
    yard: (x, y, s) => at(x, y, yarnPile(s)),
    sky: (kind) => (kind === 'home' ? '' : garland(116, 16, 11, (k) => flag(['#f7b4a6', '#fde3a6', '#cfe0ea', '#fbd9e2'][k % 4]) + at(0, 7, pawPrint('#ffffff', 6)), '#c99a62')),
  },
  hinamatsuri: {
    pal: { sky: ['#fde0e6', '#fff0f0', '#fffaf4'], tree: ['#f6a5bd', '#f9c0d0', '#f39ab4'], trunk: '#8a5a3c', hillA: '#e6efc4', hillB: '#d8e6b0', field: '#e4edc2', fieldB: '#d6e4ae', grass: '#e2ebbe', bush: ['#b9d48a', '#a9c87a', '#c6dd9a'] },
    pattern: { id: 'hishi', w: 44, h: 44, svg: '<path d="M22,6 L34,22 L22,38 L10,22 Z" fill="none" stroke="#f3b6c6" stroke-width="1.5"/>', op: 0.45 },
    tree: (x, y, r, c, i) => blossomBranches(x, y, r, (s, k) => momo(s * 1.1, k + i)),
    piece: (i, s) => (i % 2 ? momo(s * 0.55, i) : dot(s * 0.25, ['#f9c6d3', '#b9d48a', '#ffffff', '#fde3a6'][i % 4])),
    fruit: (s, i = 0) => [(z) => M.hishimochi(z * 0.9), hinaArare, (z) => momo(z * 0.9, i)][i % 3](s),
    flower: (x, y, r, k) => smallFlowerHaru(x, y, r, 1 + k * 2),
    plant: (x, baseY, k) => (k % 2 ? at(x + 10, baseY - 26, M.bonbori(24)) : nanohana(x, baseY, k)),
    branch: (x, y, i) => at(x, y - 16, momo(15, i)) + at(x + 13, y - 3, momo(11, i + 1)),
    winItem: (px, py, k) => at(px, py - 6, momo(9, k)),
    air: (k, s) => M.butterfly(s, k + 2),
    yard: (x, y, s) => at(x, y, M.hina(s)),
    sky: () => tsurushiBina(26, 70, 230, 0) + tsurushiBina(364, 70, 230, 2),
  },
  hanami: {
    pal: { sky: ['#fbd6e2', '#fde8ee', '#fff6f4'], tree: ['#f9c6d3', '#fbd9e2', '#f5b8cd'], trunk: '#a7704e', hillA: '#e6eec2', hillB: '#d8e4ae', field: '#e4ecbe', fieldB: '#d6e2aa', grass: '#e2eaba', bush: ['#b9d48a', '#a9c87a', '#c6dd9a'] },
    pattern: { id: 'hanabira', w: 50, h: 50, svg: `<g transform="translate(12 14) rotate(30)">${sakuraPetal(8, 0)}</g><g transform="translate(38 36) rotate(-40)">${sakuraPetal(7, 1)}</g>`, op: 0.6 },
    tree: (x, y, r, c, i, P) => roundTree(x, y, r * 1.12, c, P, onCanopy(x, y, r * 1.12, 14, (k) => sakura(r * 0.2, k), i + 11)),
    piece: (i, s) => sakuraPetal(s * 0.8, i),
    fruit: (s, i = 0) => [(z) => at(0, 0, M.dango(z * 0.9), 70), bento, sakuramochi][i % 3](s),
    flower: (x, y, r, k) => (k % 2 ? at(x, y, tanpopo(r * 2)) : smallFlowerHaru(x, y, r, k)),
    plant: (x, baseY, k) => onPole(x + 10, baseY, 80, M.chochin(16, k)),
    branch: (x, y, i) => at(x, y - 18, sakura(16, i)) + at(x + 14, y - 4, sakura(12, i + 1)) + at(x - 12, y - 6, sakura(10, i + 2)),
    winItem: (px, py, k) => at(px, py - 6, sakura(10, k)),
    air: (k, s) => (k % 2 ? M.butterfly(s, k) : sakuraPetal(s * 0.8, k)),
    yard: (x, y, s) => at(x, y, picnicSheet(s)),
    sky: (kind) => (kind === 'home' ? '' : garland(118, 18, 8, (k) => `<path d="M0,0 v6" stroke="#9b5f3a" stroke-width="1.5"/>${at(0, 18, M.chochin(13, k))}`, '#9b5f3a')),
  },
  kodomonohi: {
    pal: { sky: ['#c9e6f8', '#e2f1fb', '#f8fbf4'], tree: ['#8cc266', '#a3d17a', '#7ab658'], trunk: '#a77048', hillA: '#d2eaa8', hillB: '#c0de92', field: '#cfe6a4', fieldB: '#bedb90', grass: '#cce4a0', bush: ['#8cbf63', '#7fb258', '#9fcf72'] },
    pattern: null,
    tree: SEASON.natsu.tree,
    piece: (i, s) => (i % 2 ? M.kashiwa(s * 0.5) : clover(s * 0.7)),
    fruit: (s, i = 0) => [(z) => M.kashiwa(z * 0.8), chimaki, (z) => M.kabuto(z * 0.7)][i % 3](s),
    flower: (x, y, r) => shobu(x, y, r),
    plant: (x, baseY, k) => koinoboriPole(x, baseY, 120, k % 2 ? -1 : 1),
    branch: SEASON.natsu.branch,
    winItem: (px, py, k) => (k % 2 ? at(px, py - 4, M.koinobori(9, k)) : SEASON.natsu.winItem(px, py, k)),
    air: (k, s) => (k % 2 ? M.koinobori(s * 0.8, k) : swallow(s)),
    yard: (x, y, s) => at(x, y, M.kabuto(s * 0.8)),
    sky: (kind) => (OUTDOOR.has(kind) && kind !== 'home' ? koinoboriPole(22, 560, 400, 1) : ''),
  },
  tanabata: {
    night: true,
    pal: { sky: ['#252d5c', '#3d4884', '#7c7eb4'], tree: NIGHT_TREE, ...NIGHT_GROUND },
    tree: (x, y, r) => sasaTree(x, y, r),
    cloud: () => '',
    piece: (i, s) => starShape(s * 0.6, ['#fff3b8', '#ffffff', '#fde3a6'][i % 3], '#e6c46a'),
    fruit: (s, i = 0) => [soumen, (z) => starShape(z, '#fde3a6', '#e6c46a'), melonSlice][i % 3](s),
    flower: (x, y, r, k) => at(x, y, asagao(r * 1.6, k)),
    plant: (x, baseY) => sasaTree(x + 10, baseY - 50, 34),
    branch: (x, y, i) => at(x, y - 10, M.tanzaku(14, i)),
    winItem: (px, py) => at(px, py - 4, starShape(9, '#fff3b8', '#f1d27a')),
    air: (k, s) => starShape(s * 0.6, '#fff3b8', '#f1d27a'),
    yard: (x, y, s) => sasaTree(x, y - s * 0.6, s * 0.9),
    sky: () => milkyWay() + stars(41, 30, { x: 0, y: 60, w: 390, h: 320 }),
    fx: () => twinkles(9, 9, { x: 10, y: 80, w: 370, h: 280 }) + [[40, 420], [350, 460], [70, 560], [330, 600], [30, 300], [360, 340]].map(([x, y], k) => fxItem('fx-firefly', x, y, 14, fireflyDot(), -k * 0.8)).join(''),
  },
  natsumatsuri: {
    night: true,
    pal: { sky: ['#272c60', '#4a4688', '#c58aa2'], tree: NIGHT_TREE, ...NIGHT_GROUND },
    cloud: () => '',
    piece: (i, s) => [() => M.yoyo(s * 0.5, i), () => dot(s * 0.22, ['#f7a6a0', '#fde3a6', '#cfe0ea'][i % 3]), () => M.kingyo(s * 0.5, i)][i % 3](),
    fruit: (s, i = 0) => [ringoame, wataame, (z) => M.kakigori(z * 0.9)][i % 3](s),
    flower: (x, y, r, k) => at(x, y, asagao(r * 1.6, k)),
    plant: (x, baseY, k) => onPole(x + 10, baseY, 80, glow(26, '#ffd9a8', 0.4) + M.chochin(16, k)),
    branch: (x, y, i) => at(x, y - 8, glow(16, '#ffd9a8', 0.35) + M.chochin(10, i)),
    winItem: (px, py, k) => at(px, py - 4, M.hanabi(10, k)),
    air: () => '',
    yard: (x, y, s, k = 0) => at(x, y, k % 2 ? M.kingyoBag(s * 0.8) : yagura(s)),
    sky: (kind) => stars(51, 26, { x: 0, y: 60, w: 390, h: 260 }) + (kind === 'home' ? '' : garland(116, 22, 9, (k) => `<path d="M0,0 v6" stroke="#9b5f3a" stroke-width="1.5"/>${at(0, 18, glow(22, '#ffd9a8', 0.35) + M.chochin(13, k))}`, '#9b5f3a')),
    fx: (kind) => (kind === 'home' ? [[48, 96, 70, 0, '#f7a6a0', '#fde3a6'], [344, 110, 80, 1.6, '#9fc5e8', '#ffffff']] : [[90, 230, 120, 0, '#f7a6a0', '#fde3a6'], [300, 190, 140, 1.1, '#9fc5e8', '#ffffff'], [200, 300, 100, 2.0, '#f6d55e', '#f7a6a0'], [330, 330, 90, 2.8, '#b5e0a0', '#fde3a6']]).map(([x, y, w, d, c1, c2]) => fxItem('fx-firework', x, y, w, firework(c1, c2), -d)).join(''),
  },
  sekainekonohi: {
    pal: { sky: ['#cfeaf0', '#e4f4f4', '#f8fbf4'], tree: ['#8cc266', '#a3d17a', '#7ab658'], trunk: '#a77048', hillA: '#d6eaa8', hillB: '#c4de92', field: '#d2e8a4', fieldB: '#c2dd90', grass: '#cfe6a0', bush: ['#8cbf63', '#7fb258', '#9fcf72'] },
    pattern: { id: 'paw2', w: 60, h: 60, svg: `<g transform="translate(16 16)">${pawPrint('#ffffff', 9)}</g><g transform="translate(46 44) rotate(20)">${pawPrint('#ffffff', 7)}</g>`, op: 0.6 },
    tree: (x, y, r, c, i, P) => catTopiary(x, y, r, c, P),
    piece: (i, s) => pawPrint(['#f7b4a6', '#9fc5e8', '#f5c451', '#b5d98a'][i % 4], s * 0.6),
    fruit: (s, i = 0) => [(z) => M.fishCookie(z * 0.8), can, (z) => M.globe(z * 0.8)][i % 3](s),
    flower: (x, y, r, k) => SEASON.natsu.flower(x, y, r, k),
    plant: nekojarashi,
    branch: (x, y) => hangOn(x, y, M.suzu(12), '#9fbdd0'),
    winItem: (px, py, k) => at(px, py - 5, pawPrint(['#9fc5e8', '#f7b4a6'][k % 2], 8)),
    air: (k, s) => tail(s) + M.globe(s * 0.8),
    yard: (x, y, s) => at(x, y, yarnPile(s)),
    sky: (kind) => (kind === 'home' ? '' : garland(116, 16, 11, (k) => flag(['#9fc5e8', '#b5d98a', '#fde3a6', '#f7b4a6'][k % 4]) + at(0, 7, pawPrint('#ffffff', 6)), '#9fbdd0')),
  },
  otsukimi: {
    night: true,
    pal: { sky: ['#283363', '#47538c', '#9497c0'], tree: NIGHT_TREE, ...NIGHT_GROUND },
    cloud: nightCloud,
    piece: (i, s) => (i % 2 ? M.susuki(s * 0.5) : dot(s * 0.24, '#ffffff')),
    fruit: (s, i = 0) => [(z) => M.tsukimiDango(z * 0.9), kuri, (z) => M.usagi(z * 0.8)][i % 3](s),
    flower: (x, y, r, k) => `<path d="M${f(x)},${f(y + r)} q${f(r)},${f(r * 2)} 0,${f(r * 4)}" stroke="#9fb26a" stroke-width="1.5" fill="none"/>` + at(x, y, blossom(r * 1.2, ['#e8a6c8', '#f2c2da'][k % 2], '#c97fa6', '#f6d55e')),
    plant: susukiAt,
    branch: (x, y) => at(x, y - 14, M.susuki(14)),
    winItem: (px, py, k) => (k === 2 ? at(px, py, M.moon(14)) : ''),
    air: () => '',
    yard: (x, y, s, k = 0) => at(x, y, k % 2 ? M.usagi(s * 0.7) : `<g>${at(-s * 0.2, 0, M.tsukimiDango(s * 0.7))}${at(s * 0.55, -s * 0.2, M.susuki(s * 0.7))}</g>`),
    sky: (kind) => stars(61, 34, { x: 0, y: 60, w: 390, h: 300 }) + (kind === 'home' ? bigMoon(342, 70, 28, true) : bigMoon(300, 210, 48, true) + `<g opacity="0.55">${at(250, 240, plainCloud(110))}</g>`),
    fx: () => twinkles(13, 7, { x: 10, y: 80, w: 250, h: 260 }),
  },
  manekinekonohi: {
    pal: { sky: ['#ffeccf', '#fff6e4', '#fffbf2'], tree: ['#9fcb72', '#b5d98a', '#8cbf63'], trunk: '#a77048', hillA: '#eef0c8', hillB: '#e2e6b2', field: '#ebeec2', fieldB: '#dfe4ae', grass: '#e8ecbe', bush: ['#a9cf7f', '#9fc574', '#b5d98a'] },
    pattern: { id: 'koban', w: 54, h: 54, svg: '<ellipse cx="14" cy="14" rx="5" ry="7.5" fill="#f6d55e"/><ellipse cx="40" cy="40" rx="5" ry="7.5" fill="#f6d55e"/>', op: 0.35 },
    tree: kobanTree,
    piece: (i, s) => M.koban(s * 0.5, i),
    fruit: (s, i = 0) => [kobanPile, taiyaki, (z) => M.maneki(z * 0.8)][i % 3](s),
    flower: (x, y, r, k) => onStem(x, y, r, blossom(r * 1.6, ['#ec7a7a', '#ffffff'][k % 2], '#d65f5f', '#f6d55e')),
    plant: (x, baseY, k) => nobori(x + 4, baseY, 120, k % 2 ? 'ふく' : 'まねき'),
    branch: (x, y) => hangOn(x, y, M.suzu(12), C.momiji),
    winItem: (px, py, k) => at(px, py - 4, M.koban(7, k)),
    air: (k, s) => starShape(s * 0.7, '#f6d55e', '#d9b04d'),
    yard: (x, y, s) => at(x, y, M.maneki(s)),
    sky: (kind) => (kind === 'home' ? '' : kohakuMaku(98, 30)),
  },
  halloween: {
    pal: { sky: ['#efd9ee', '#f9e6e6', '#fff2e2'], tree: ['#cdbfe0', '#d8cce8', '#bfaed8'], trunk: '#9a7fb8', hillA: '#efdcc0', hillB: '#e9cfae', field: '#ecdcc0', fieldB: '#e4cfae', grass: '#eadcc4', bush: ['#cdbfe0', '#bfaed8', '#d8cce8'] },
    pattern: { id: 'boo', w: 64, h: 64, svg: `<g transform="translate(16 18)">${starShape(8, '#ffffff', '#ffffff')}</g><g transform="translate(46 46)">${starShape(6, '#fde3c0', '#fde3c0')}</g>`, op: 0.7 },
    tree: spookyTree,
    piece: (i, s) => (i % 2 ? M.candy(s * 0.5, i) : M.pumpkin(s * 0.45, i)),
    fruit: (s, i = 0) => [(z) => M.pumpkin(z * 0.8, i), (z) => M.candy(z * 0.8, i), (z) => M.witchHat(z * 0.8)][i % 3](s),
    flower: (x, y, r, k) => onStem(x, y, r, M.pumpkin(r * 1.3, k)),
    plant: (x, baseY, k) => (k % 2 ? onPole(x + 10, baseY, 50, M.ghost(22), '#a98cc9') : onPole(x + 10, baseY, 44, M.pumpkin(20, k), '#a98cc9')),
    branch: (x, y, i) => hangOn(x, y, M.candy(10, i), '#a98cc9'),
    winItem: (px, py, k) => (k % 2 ? at(px, py - 4, bat(9)) : ''),
    air: (k, s) => (k % 2 ? bat(s) : M.ghost(s * 0.9)),
    yard: (x, y, s) => at(x, y, pumpkinPile(s)),
    sky: (kind) => (kind === 'home' ? '' : garland(116, 18, 12, (k) => flag(['#f8b15c', '#cdbfe0', '#fde3a6'][k % 3]), '#a98cc9')),
    fx: () => [[40, 330, 0], [352, 300, 1.4], [330, 470, 2.6]].map(([x, y, d]) => fxItem('fx-float', x, y, 34, M.ghost(30), -d)).join(''),
  },
};

// 外の場面（空と地面が見える）。この場面にだけ、大きな空の物（富士・こいのぼり）を置く
export const OUTDOOR = new Set(['home', 'roulette', 'hana', 'amida', 'race', 'maigo', 'wanage', 'tsuri', 'tobiishi', 'kuji', 'mato', 'nobi', 'hidamari']);

const DEFAULTS = {
  night: false,
  tree: (x, y, r, c, i, P) => roundTree(x, y, r, c, P),
  cloud: plainCloud,
  sky: () => '',
  fx: () => '',
  pattern: null,
  glass: null,
};

// いまの季節と行事の部品セット
export function kitFor(lk) {
  const season = SEASON[lk.season] ? lk.season : 'aki';
  const base = { ...DEFAULTS, ...SEASON[season], season, event: '' };
  const ev = EVENT[lk.event];
  if (!ev) return base;
  const kit = { ...base, ...ev, event: lk.event, pal: { ...base.pal, ...ev.pal } };
  if (kit.night) kit.glass = kit.pal.sky[1];
  return kit;
}
export const isNight = (lk) => !!(EVENT[lk.event] && EVENT[lk.event].night);
export { at, f, rand };
