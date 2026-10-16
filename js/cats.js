// 猫のキャラクター（RS01-S20）：パステル三毛猫とサバトラ。
// 見た目は、描いた案（下の DESIGNS）の中から依頼者が選んだ A の案に決まった（docs/決めたことの記録.md）。アプリは CAT_DESIGN の案だけを使う。
// B・C の案は、見比べの絵を描く道具（tools/render-cats.mjs）のために残している。アプリの画面には出ない。
// どのゲームにも2匹のどちらか1匹を出す。どちらが出るかは GAME_CAT が決める。
// 絵はすべてコードで描く SVG（RS01-S18）。絵文字は使わない（RS01-S14）。

export const GAME_CAT = { roulette: 'mike', stamp: 'mike', nobi: 'saba', hana: 'saba', kuji: 'mike', amida: 'saba', race: 'mike', mato: 'saba', sugoroku: 'mike', otoshi: 'saba', maigo: 'mike', tower: 'saba', sagasu: 'mike' };
export const CAT_NAMES = { mike: 'パステル三毛猫', saba: 'サバトラ' };
export const CAT_DESIGN = { mike: 'mike-a', saba: 'saba-a' };

const PINK = '#f7b4a6';
const EYE = '#4a3a33';

// 顔の模様（顔の中心 0,0・頭の楕円の中に切り抜いて描く）
const P = {
  mikeA: (d) => `<path d="M-56,-46 C-24,-50 -4,-34 -6,-16 C-8,-2 -26,4 -56,0 Z" fill="${d.patchA}"/>`
    + `<path d="M12,-46 C32,-50 56,-40 56,-22 C42,-14 26,-18 18,-28 C13,-34 11,-40 12,-46 Z" fill="${d.patchB}"/>`,
  mikeB: (d) => `<path d="M-56,-46 L-1,-46 C0,-30 -3,-16 -15,-9 C-27,-3 -42,-2 -56,-4 Z" fill="${d.patchA}"/>`
    + `<path d="M7,-46 L56,-46 L56,-8 C44,-12 32,-18 23,-27 C15,-34 9,-40 7,-46 Z" fill="${d.patchB}"/>`,
  mikeC: (d) => `<path d="M-16,-42 C-10,-50 12,-50 16,-40 C13,-30 -12,-30 -16,-42 Z" fill="${d.patchA}"/>`
    + `<ellipse cx="31" cy="3" rx="12" ry="9" fill="${d.patchB}"/>`
    + `<ellipse cx="-34" cy="-18" rx="7" ry="5" fill="${d.patchB}" opacity="0.9"/>`,
  sabaA: (d) => `<path d="M-12,-36 v11 M0,-37 v13 M12,-36 v11" stroke="${d.stripe}" stroke-width="4.2" stroke-linecap="round"/>`
    + `<path d="M-24,-30 q-6,6 -4,12 M24,-30 q6,6 4,12" stroke="${d.stripe}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`
    + `<path d="M-46,-3 h11 M-46,6 h9 M46,-3 h-11 M46,6 h-9" stroke="${d.stripe}" stroke-width="3.6" stroke-linecap="round"/>`,
  sabaB: (d) => `<path d="M-12,-36 v10 M0,-37 v12 M12,-36 v10" stroke="${d.stripe}" stroke-width="4.2" stroke-linecap="round"/>`
    + `<path d="M-46,-6 h9 M46,-6 h-9" stroke="${d.stripe}" stroke-width="3.6" stroke-linecap="round"/>`
    + `<path d="M0,-22 C-6,-10 -24,2 -48,8 L-48,46 L48,46 L48,8 C24,2 6,-10 0,-22 Z" fill="${d.white}"/>`,
  sabaC: (d) => `<path d="M-10,-36 q0,6 -2,10 M0,-37 v11 M10,-36 q0,6 2,10" stroke="${d.stripe}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    + `<path d="M-50,0 q8,-2 12,2 M50,0 q-8,-2 -12,2" stroke="${d.stripe}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
};

// 案。kind は mike（パステル三毛猫）か saba（サバトラ）
export const DESIGNS = [
  {
    id: 'mike-a', kind: 'mike', label: 'A', name: 'ももいろ みけ',
    desc: '白に、あんず色と青灰色のぶち。まるい顔に、光の入った黒い目。いちばん素直な三毛猫。',
    base: '#fffaf4', patchA: '#f6c39b', patchB: '#bcc4d8', line: '#6b4a3a', earL: '#f6c39b', earR: '#bcc4d8',
    nose: '#ef958b', blush: '#f7a596', muzzle: null, paw: '#fffaf4', chest: '#ffffff', head: { rx: 44, ry: 37 }, eyes: 'dot', fluff: false,
    face: P.mikeA, tail: '#f6c39b', tailTip: '#bcc4d8', body: 'mike',
  },
  {
    id: 'mike-b', kind: 'mike', label: 'B', name: 'ミルクティー みけ',
    desc: 'クリーム色に、ミルクティー色とラベンダー色の大きな ぶち。顔が左右で色分け。大きな目。',
    base: '#fff6ea', patchA: '#e8c19b', patchB: '#cbc3dd', line: '#6a4b3f', earL: '#e8c19b', earR: '#cbc3dd',
    nose: '#ee9a92', blush: '#f4a99c', muzzle: '#ffffff', paw: '#fffaf2', chest: '#ffffff', head: { rx: 46, ry: 36 }, eyes: 'big', fluff: false,
    face: P.mikeB, tail: '#cbc3dd', tailTip: '#e8c19b', body: 'mike',
  },
  {
    id: 'mike-c', kind: 'mike', label: 'C', name: 'わたあめ みけ',
    desc: 'ほとんど白で、小さな もも色と水色の ぶち。ほおの毛が ふわふわ。小さな まめの目。',
    base: '#fffdf8', patchA: '#f8cca6', patchB: '#b9d3d9', line: '#6d5044', earL: '#f8cca6', earR: '#fffdf8',
    nose: '#f0a097', blush: '#f8b2a5', muzzle: null, paw: '#fffdf8', chest: '#ffffff', head: { rx: 43, ry: 37 }, eyes: 'bean', fluff: true,
    face: P.mikeC, tail: '#fffdf8', tailTip: '#f8cca6', body: 'mike',
  },
  {
    id: 'saba-a', kind: 'saba', label: 'A', name: 'ぎんいろ サバトラ',
    desc: '銀色に近い灰色に、こい灰色のしま。おでこに「M」のしま。光の入った黒い目。',
    base: '#c6cad2', stripe: '#878d9a', line: '#55505a', earL: '#c6cad2', earR: '#c6cad2',
    nose: '#ec9a93', blush: '#f2a8a0', muzzle: '#eceef2', paw: '#c6cad2', chest: '#e6e8ec', head: { rx: 44, ry: 37 }, eyes: 'dot', fluff: false,
    face: P.sabaA, tail: '#c6cad2', tailTip: '#878d9a', body: 'saba',
  },
  {
    id: 'saba-b', kind: 'saba', label: 'B', name: 'サバしろ',
    desc: '灰色のしまに、白い口もと・胸・足。顔の下が「八」の字に白い。大きな目。',
    base: '#c0c5ce', stripe: '#808797', line: '#544f59', white: '#fffcf8', earL: '#c0c5ce', earR: '#c0c5ce',
    nose: '#ef9d95', blush: '#f3aaa1', muzzle: null, paw: '#fffcf8', chest: '#fffcf8', head: { rx: 46, ry: 36 }, eyes: 'big', fluff: false,
    face: P.sabaB, tail: '#c0c5ce', tailTip: '#808797', body: 'saba',
  },
  {
    id: 'saba-c', kind: 'saba', label: 'C', name: 'あおみ サバトラ',
    desc: '青みのある うすい灰色に、やわらかいしま。ほおの毛が ふわふわ。小さな まめの目。',
    base: '#bdc8d8', stripe: '#8b9ab0', line: '#525263', earL: '#bdc8d8', earR: '#bdc8d8',
    nose: '#ee9f98', blush: '#f2aca5', muzzle: '#eaf0f6', paw: '#bdc8d8', chest: '#e8eef5', head: { rx: 43, ry: 37 }, eyes: 'bean', fluff: true,
    face: P.sabaC, tail: '#bdc8d8', tailTip: '#8b9ab0', body: 'saba',
  },
];

export const designById = (id) => DESIGNS.find((d) => d.id === id);

let uid = 0;
const nid = (p) => `${p}${++uid}`;
const f = (n) => Math.round(n * 100) / 100;

// ---- 顔 ----
// 中心 0,0、だいたい半径 50。mood は 'normal'・'happy'（にっこり）・'strain'（ぐぬぬ）。look は目の向き（-1〜1）
export function catFace(d, { mood = 'normal', blink = false, look = null } = {}) {
  const L = d.line;
  const { rx, ry } = d.head;
  const clip = nid('cf');
  const lx = look ? Math.max(-1, Math.min(1, look.x)) * 2.6 : 0;
  const ly = look ? Math.max(-1, Math.min(1, look.y)) * 2.2 : 0;
  const ex = d.head.rx > 44 ? 17 : 16;
  let eyes;
  if (mood === 'happy') {
    eyes = `<path d="M${-ex - 7},0 Q${-ex},-9 ${-ex + 7},0 M${ex - 7},0 Q${ex},-9 ${ex + 7},0" stroke="${EYE}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else if (mood === 'strain') {
    eyes = `<path d="M${-ex - 6},-5 L${-ex + 5},0 L${-ex - 6},5 M${ex + 6},-5 L${ex - 5},0 L${ex + 6},5" stroke="${EYE}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (blink) {
    eyes = `<path d="M${-ex - 6},1 Q${-ex},4 ${-ex + 6},1 M${ex - 6},1 Q${ex},4 ${ex + 6},1" stroke="${EYE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  } else if (d.eyes === 'big') {
    eyes = [-ex, ex].map((x) => `<ellipse cx="${f(x + lx)}" cy="${f(ly)}" rx="6.8" ry="8.4" fill="${EYE}"/>`
      + `<circle cx="${f(x + lx + 2.2)}" cy="${f(ly - 3.2)}" r="2.6" fill="#ffffff"/><circle cx="${f(x + lx - 2.4)}" cy="${f(ly + 3)}" r="1.2" fill="#ffffff"/>`).join('');
  } else if (d.eyes === 'bean') {
    eyes = [-ex, ex].map((x) => `<ellipse cx="${f(x + lx)}" cy="${f(ly + 1)}" rx="3.8" ry="5.4" fill="${EYE}"/>`).join('');
  } else {
    eyes = [-ex, ex].map((x) => `<ellipse cx="${f(x + lx)}" cy="${f(ly)}" rx="5.2" ry="6.8" fill="${EYE}"/>`
      + `<circle cx="${f(x + lx + 1.8)}" cy="${f(ly - 2.6)}" r="2" fill="#ffffff"/>`).join('');
  }
  let mouth;
  if (mood === 'happy') mouth = `<path d="M-7,13 Q0,24 7,13 Z" fill="#e7776c" stroke="${L}" stroke-width="2.2" stroke-linejoin="round"/>`;
  else if (mood === 'strain') mouth = `<path d="M-7,16 q3.5,-3.5 7,0 q3.5,3.5 7,0" fill="none" stroke="${L}" stroke-width="2.4" stroke-linecap="round"/>`;
  else mouth = `<path d="M0,12 Q-3,18 -8,15 M0,12 Q3,18 8,15" fill="none" stroke="${L}" stroke-width="2.4" stroke-linecap="round"/>`;
  const earL = `M${-rx + 4},-14 L${-rx + 8},-48 L-10,-34 Z`;
  const earR = `M${rx - 4},-14 L${rx - 8},-48 L10,-34 Z`;
  const inL = `M${-rx + 10},-22 L${-rx + 12},-40 L-18,-32 Z`;
  const inR = `M${rx - 10},-22 L${rx - 12},-40 L18,-32 Z`;
  const fluff = d.fluff
    ? [-1, 1].map((s) => `<path d="M${s * (rx - 8)},-4 Q${s * (rx + 9)},0 ${s * (rx + 1)},8 Q${s * (rx + 8)},13 ${s * (rx - 6)},20 Z" fill="${d.base}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`).join('')
    : '';
  const muzzle = d.muzzle ? `<ellipse cx="0" cy="15" rx="18" ry="12.5" fill="${d.muzzle}"/>` : '';
  return `<g class="cat-face">`
    + `<defs><clipPath id="${clip}"><ellipse cx="0" cy="2" rx="${rx}" ry="${ry}"/></clipPath></defs>`
    + `<path d="${earL}" fill="${d.earL}" stroke="${L}" stroke-width="3.2" stroke-linejoin="round"/>`
    + `<path d="${earR}" fill="${d.earR}" stroke="${L}" stroke-width="3.2" stroke-linejoin="round"/>`
    + `<path d="${inL}" fill="${PINK}"/><path d="${inR}" fill="${PINK}"/>`
    + fluff
    + `<ellipse cx="0" cy="2" rx="${rx}" ry="${ry}" fill="${d.base}"/>`
    + `<g clip-path="url(#${clip})">${d.face(d)}${muzzle}</g>`
    + `<ellipse cx="0" cy="2" rx="${rx}" ry="${ry}" fill="none" stroke="${L}" stroke-width="3.2"/>`
    + eyes
    + `<ellipse cx="${-rx + 17}" cy="13" rx="7" ry="4.4" fill="${d.blush}" opacity="0.55"/><ellipse cx="${rx - 17}" cy="13" rx="7" ry="4.4" fill="${d.blush}" opacity="0.55"/>`
    + `<path d="M-4.2,8 h8.4 l-4.2,4.4 Z" fill="${d.nose}" stroke="${d.nose}" stroke-width="1.6" stroke-linejoin="round"/>`
    + mouth
    + `</g>`;
}

// ---- 肉球と前足 ----
export function pawPrint(color = PINK, size = 20) {
  const s = (v) => f(v * size);
  return `<g fill="${color}"><ellipse cx="0" cy="${s(0.3)}" rx="${s(0.5)}" ry="${s(0.4)}"/>`
    + `<ellipse cx="${s(-0.6)}" cy="${s(-0.22)}" rx="${s(0.19)}" ry="${s(0.24)}" transform="rotate(-18 ${s(-0.6)} ${s(-0.22)})"/>`
    + `<ellipse cx="${s(-0.22)}" cy="${s(-0.56)}" rx="${s(0.2)}" ry="${s(0.26)}"/>`
    + `<ellipse cx="${s(0.22)}" cy="${s(-0.56)}" rx="${s(0.2)}" ry="${s(0.26)}"/>`
    + `<ellipse cx="${s(0.6)}" cy="${s(-0.22)}" rx="${s(0.19)}" ry="${s(0.24)}" transform="rotate(18 ${s(0.6)} ${s(-0.22)})"/></g>`;
}

export function catPaw(d, size = 30) {
  const s = (v) => f(v * size);
  return `<g><ellipse cx="0" cy="0" rx="${s(1)}" ry="${s(0.92)}" fill="${d.paw}" stroke="${d.line}" stroke-width="${s(0.1)}"/>`
    + `<path d="M${s(-0.34)},${s(-0.84)} v${s(0.28)} M${s(0.34)},${s(-0.84)} v${s(0.28)}" stroke="${d.line}" stroke-width="${s(0.08)}" stroke-linecap="round"/>`
    + `<g transform="translate(0 ${s(0.12)})">${pawPrint(PINK, size * 0.62)}</g>`
    + `</g>`;
}

// ---- 体の模様（縦に長い胴のための模様）----
// 胴の左右 x0〜x1、下の基準 yBase から上へ、高さ h の範囲に描く。k は大きさの倍率
export function torsoPattern(d, { x0, x1, yBase, h, k = 1 }) {
  const w = x1 - x0;
  let s = '';
  if (d.body === 'saba') {
    const step = 22 * k;
    for (let i = 0; i < Math.ceil(h / step) + 2; i++) {
      const y = yBase - i * step;
      s += `<path d="M${f(x0)},${f(y)} h${f(w * 0.24)} M${f(x1)},${f(y - step / 2)} h${f(-w * 0.24)}" stroke="${d.stripe}" stroke-width="${f(4 * k)}" stroke-linecap="round"/>`;
    }
  } else {
    // 三毛：ぶちを、下から交互に置く
    const step = 86 * k;
    for (let i = 0; i < Math.ceil(h / step) + 1; i++) {
      const y = yBase - 30 * k - i * step;
      const left = i % 2 === 0;
      const c = left ? d.patchA : d.patchB;
      const cx = left ? x0 + w * 0.12 : x1 - w * 0.12;
      s += `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(w * 0.34)}" ry="${f(22 * k)}" fill="${c}"/>`;
    }
  }
  return s;
}

// しっぽ（太い線）。path は d 属性の文字列。太さ w
export function tail(d, path, w) {
  const id = nid('tl');
  let pattern = '';
  if (d.body === 'saba') {
    pattern = `<path d="${path}" stroke="${d.stripe}" stroke-width="${f(w * 0.66)}" fill="none" stroke-linecap="round" stroke-dasharray="${f(w * 0.45)} ${f(w * 0.8)}"/>`;
  }
  return `<path d="${path}" stroke="${d.line}" stroke-width="${f(w + 6)}" fill="none" stroke-linecap="round"/>`
    + `<path d="${path}" stroke="${d.tail}" stroke-width="${f(w)}" fill="none" stroke-linecap="round" id="${id}"/>`
    + pattern;
}

// ---- 座った姿（猫の案の画面・ホーム）----
// 中心 0,0。おおよそ x -80〜80、y -80〜78
export function catSitting(d, { mood = 'normal', look = null } = {}) {
  const L = d.line;
  const clip = nid('bd');
  const tailPath = 'M30,62 C74,66 84,24 62,2';
  let pat = '';
  if (d.body === 'saba') {
    pat = `<path d="M-44,26 q12,4 18,-2 M-46,44 q12,4 18,-2 M44,26 q-12,4 -18,-2 M46,44 q-12,4 -18,-2" stroke="${d.stripe}" stroke-width="4.2" fill="none" stroke-linecap="round"/>`;
  } else {
    pat = `<ellipse cx="-34" cy="22" rx="20" ry="16" fill="${d.patchA}"/><ellipse cx="36" cy="50" rx="18" ry="14" fill="${d.patchB}"/>`;
  }
  return `<g class="cat-sitting">`
    + `<ellipse cx="0" cy="78" rx="58" ry="7" fill="#a0703f" opacity="0.16"/>`
    + tail(d, tailPath, 13)
    + `<path d="${tailPath}" stroke="${d.tailTip}" stroke-width="13" fill="none" stroke-linecap="round" stroke-dasharray="0 96 30 200"/>`
    + `<defs><clipPath id="${clip}"><ellipse cx="0" cy="40" rx="46" ry="40"/></clipPath></defs>`
    + `<ellipse cx="0" cy="40" rx="46" ry="40" fill="${d.base}"/>`
    + `<g clip-path="url(#${clip})">${pat}<ellipse cx="0" cy="34" rx="22" ry="30" fill="${d.chest}"/></g>`
    + `<ellipse cx="0" cy="40" rx="46" ry="40" fill="none" stroke="${L}" stroke-width="3.2"/>`
    + `<rect x="-24" y="44" width="18" height="32" rx="9" fill="${d.paw}" stroke="${L}" stroke-width="3"/>`
    + `<rect x="6" y="44" width="18" height="32" rx="9" fill="${d.paw}" stroke="${L}" stroke-width="3"/>`
    + `<path d="M-18,72 v4 M-12,72 v4 M12,72 v4 M18,72 v4" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`
    + `<g transform="translate(0 -20)">${catFace(d, { mood, look })}</g>`
    + `</g>`;
}
