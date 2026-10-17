// 画面の背景（季節と行事ごと。RS01-S13）。縦長の画面の下を基準に置き、短い画面では上が少し切れる。
// 木・小物・花・飛ぶ物などは、季節と行事の部品セット（kits.js）から描く。行事の時は、行事のセットで場面ごと描きかえる。
// 季節と行事の飾りの帯（decor.js）は、画面の上と下の角に重ねる。
// 夜の行事（大みそか・七夕・夏祭り・お月見）だけは夜空にする（依頼者が決めた例外。docs/決めたことの記録.md §9）。ほかは明るい色だけで描く（RS01-S06）。
import { C, nextId } from './art.js';
import { kitFor, at, f } from './kits.js';

const W = 390;
const H = 844;

// 地面に散らす物（決まった並びにするため、簡単な疑似乱数を使う）
function scatter(K, seed, count, area, sizeMin, sizeMax, opacity = 0.95) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = area.x + rnd() * area.w;
    const y = area.y + rnd() * area.h;
    const size = sizeMin + rnd() * (sizeMax - sizeMin);
    const rot = K.pal.snowy ? 0 : rnd() * 360;
    out += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" opacity="${opacity}">${K.piece(i, size)}</g>`;
  }
  return out;
}

// 窓から見える季節の枝（窓の わくの中に描く。夜は ガラスを夜空の色にする）
function windowView(x, y, w, h, K) {
  let s = K.glass ? `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${K.glass}"/>` : '';
  if (K.night) [[0.2, 0.2], [0.6, 0.15], [0.8, 0.55], [0.35, 0.4]].forEach(([dx, dy]) => { s += `<circle cx="${f(x + w * dx)}" cy="${f(y + h * dy)}" r="1.6" fill="#ffffff"/>`; });
  const bx = x + w * 0.1;
  const by = y + h * 0.75;
  s += `<path d="M${f(bx)},${f(by)} Q${f(x + w * 0.45)},${f(y + h * 0.55)} ${f(x + w * 0.9)},${f(y + h * 0.3)}" stroke="#a77048" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  [[0.3, 0.62], [0.5, 0.5], [0.68, 0.42], [0.82, 0.33], [0.42, 0.6]].forEach(([dx, dy], k) => { s += K.winItem(x + w * dx, y + h * dy, k); });
  return s;
}

// 木の床（いた）
function planks(y0, n, h, alt = ['#f6dcb4', '#f3d5a8'], line = '#e2bd87') {
  let s = '';
  for (let i = 0; i < n; i++) s += `<rect x="0" y="${y0 + i * h}" width="${W}" height="${h}" fill="${alt[i % 2]}"/><path d="M0,${y0 + i * h} H${W}" stroke="${line}" stroke-width="2"/>`;
  return s;
}

// 背景をひとつ描く。kind は 'home'・ゲームの id・'settings'。lk は look（季節と行事）
export function sceneSVG(kind, lk = { season: 'aki', event: '' }) {
  const K = kitFor(lk);
  const P = K.pal;
  const T = P.tree;
  const id = nextId('sc');
  const pat = K.pattern;
  const defs = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="0.6" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient>`
    + (pat ? `<pattern id="${id}p" width="${pat.w}" height="${pat.h}" patternUnits="userSpaceOnUse">${pat.svg}</pattern>` : '') + '</defs>';
  const sky = defs + `<rect width="${W}" height="${H}" fill="url(#${id}g)"/>` + (pat ? `<rect width="${W}" height="${H}" fill="url(#${id}p)" opacity="${pat.op}"/>` : '');
  const tr = (x, y, r, c, i = 0) => K.tree(x, y, r, c, i, P);
  const cl = (x, y, w) => at(x, y, K.cloud(w));
  const sc = (seed, count, area, a, b, op) => scatter(K, seed, count, area, a, b, op);
  const air = (x, y, s, k, rot = 0) => at(x, y, K.air(k, s), rot);
  const yard = (x, y, s, k = 0) => K.yard(x, y, s, k);
  const snowy = !!P.snowy;
  const lanternGlow = (x, y) => (K.night ? `<circle cx="${x}" cy="${y}" r="26" fill="#ffd9a8" opacity="0.3"/>` : '');
  let body = '';
  if (kind === 'home') {
    body = cl(70, 150, 90) + cl(320, 100, 70)
      + `<path d="M0,690 Q100,640 200,670 T390,650 V844 H0 Z" fill="${P.hillA}"/>`
      + `<path d="M0,740 Q120,700 240,730 T390,720 V844 H0 Z" fill="${P.hillB}"/>`
      + tr(36, 660, 34, T[0], 0) + tr(354, 640, 38, T[1], 1) + tr(300, 690, 26, T[2], 2) + tr(90, 700, 24, T[1], 3)
      + yard(196, 736, 30, 0)
      + sc(7, 10, { x: 10, y: 770, w: 370, h: 60 }, 9, 14)
      + air(42, 214, 15, 0, -10) + air(350, 196, 13, 1, 12);
  } else if (kind === 'roulette') {
    body = cl(60, 110, 80) + cl(330, 170, 64)
      + `<path d="M0,560 Q90,520 190,548 T390,530 V844 H0 Z" fill="${P.hillA}"/>`
      + tr(30, 540, 30, T[1], 0) + tr(366, 520, 34, T[0], 1) + tr(320, 556, 22, T[2], 2) + tr(70, 566, 20, T[0], 3)
      + `<path d="M0,640 Q130,600 260,630 T390,620 V844 H0 Z" fill="${P.hillB}"/>`
      + yard(350, 652, 24, 1)
      + sc(11, 14, { x: 6, y: 660, w: 378, h: 170 }, 8, 13)
      + air(24, 250, 13, 0, -8) + air(366, 300, 12, 2, 10);
  } else if (kind === 'stamp') {
    // 明るい木の机。季節と行事の小物（くだもの・木の実・葉っぱ）
    let pl = '';
    for (let i = 0; i < 6; i++) {
      const y = i * 150;
      pl += `<rect x="0" y="${y}" width="${W}" height="150" fill="${i % 2 ? '#f6dcb4' : '#f3d5a8'}"/>`
        + `<path d="M20,${y + 40} q80,-10 160,4 t180,-2 M40,${y + 100} q90,8 170,-4 t150,6" stroke="#e8c48f" stroke-width="2" fill="none" opacity="0.7"/>`
        + `<path d="M0,${y + 150} H${W}" stroke="#e2bd87" stroke-width="2"/>`;
    }
    body = pl
      + at(36, 122, K.fruit(16, 1), -20) + at(358, 760, K.fruit(16, 0), 15)
      + at(336, 130, K.piece(0, 22), 30) + at(40, 780, K.fruit(15, 2), -20) + at(74, 804, K.piece(2, 16), 40)
      + at(352, 470, K.piece(3, 18), -10) + at(28, 430, K.piece(4, 16), 20);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}${K.sky(kind)}</svg>`;
  } else if (kind === 'nobi') {
    // 縁側：枝の季節の物（春 さくら・夏 青葉・秋 かき・冬 雪と南天）と、季節の草花
    let branch = '';
    [[300, 92], [350, 140], [262, 150], [330, 196]].forEach(([x, y], i) => { branch += K.branch(x, y, i); });
    if (K.season === 'natsu' && !K.event) {
      // 風鈴
      branch += `<path d="M250,0 V112" stroke="#c99a62" stroke-width="1.5"/><path d="M236,128 Q236,112 250,112 Q264,112 264,128 Z" fill="#cfe8f2" stroke="#9fc8cf" stroke-width="2"/><path d="M250,128 v18" stroke="#c99a62" stroke-width="1.2"/><rect x="244" y="146" width="12" height="20" rx="2" fill="#fde3d6" stroke="#e7b98a" stroke-width="1"/>`;
    }
    let plants = '';
    [24, 52, 338, 366].forEach((x, k) => { plants += K.plant(x, 770, k); });
    body = cl(80, 140, 80)
      + `<path d="M390,60 Q300,70 230,120" stroke="#8a5a36" stroke-width="9" fill="none" stroke-linecap="round"/>`
      + `<path d="M330,66 Q340,120 352,128" stroke="#8a5a36" stroke-width="5" fill="none" stroke-linecap="round"/>`
      + (snowy ? `<path d="M388,56 Q300,64 232,114" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.95"/>` : '')
      + branch
      + air(300, 300, 18, 0, -12) + air(250, 420, 14, 1, 16)
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/>`
      + `<path d="M0,760 H${W} M0,800 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + plants;
  } else if (kind === 'hana') {
    // 野原：遠くの丘と、季節の小さな花
    let field = '';
    let sd = 5;
    const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 22; i++) {
      const x = rnd() * W;
      const y = 650 + rnd() * 180;
      const r = 4 + rnd() * 4;
      field += K.flower(x, y, r, i);
    }
    body = cl(70, 120, 80) + cl(320, 190, 60)
      + `<path d="M0,600 Q110,560 220,590 T390,570 V844 H0 Z" fill="${P.field}"/>`
      + `<path d="M0,660 Q140,620 270,650 T390,640 V844 H0 Z" fill="${P.fieldB}"/>`
      + tr(354, 570, 30, T[0], 0) + tr(28, 590, 24, T[1], 1)
      + field
      + air(300, 300, 16, 0, -12) + air(60, 380, 13, 1, 10)
      + yard(330, 700, 22, 1);
  } else if (kind === 'kuji' || kind === 'mato') {
    // 縁日：kuji は上に ちょうちんの列、mato は しま模様の ひさし。下に木の床
    let top = '';
    if (kind === 'kuji') {
      top = `<path d="M-10,96 Q195,150 400,96" stroke="#9b5f3a" stroke-width="2.5" fill="none"/>`;
      for (let i = 0; i < 7; i++) {
        const x = 20 + i * 58;
        const y = 96 + Math.sin((i / 6) * Math.PI) * 26;
        top += lanternGlow(x, y + 30)
          + `<path d="M${x},${y} v10" stroke="#9b5f3a" stroke-width="2"/>`
          + `<rect x="${x - 7}" y="${y + 8}" width="14" height="5" rx="2" fill="#9b5f3a"/>`
          + `<ellipse cx="${x}" cy="${y + 30}" rx="16" ry="20" fill="#fff6e4" stroke="#e7b98a" stroke-width="2"/>`
          + `<path d="M${x - 15},${y + 24} h30 M${x - 15},${y + 36} h30" stroke="${C.momiji}" stroke-width="3" opacity="0.8"/>`
          + `<rect x="${x - 7}" y="${y + 48}" width="14" height="5" rx="2" fill="#9b5f3a"/>`
          + (snowy ? `<ellipse cx="${x}" cy="${y + 11}" rx="11" ry="4" fill="#ffffff" stroke="#d3e1ea" stroke-width="1"/>` : '');
      }
    } else {
      for (let i = 0; i < 9; i++) top += `<path d="M${i * 46 - 10},0 h46 v44 q-23,14 -46,0 Z" fill="${i % 2 ? '#fff6e4' : '#f7c4b4'}"/>`;
      top += `<path d="M0,1 H${W}" stroke="#e2bd87" stroke-width="3"/>`;
      if (snowy) top += `<path d="M-10,0 H400 V10 Q195,20 -10,10 Z" fill="#ffffff" opacity="0.95"/>`;
    }
    body = top + planks(640, 4, 52, ['#f6dcb4', '#f3d5a8'])
      + at(kind === 'kuji' ? 40 : 46, kind === 'kuji' ? 760 : 770, K.piece(0, 16), -24)
      + at(kind === 'kuji' ? 350 : 344, kind === 'kuji' ? 790 : 800, K.piece(1, 18), 30)
      + at(kind === 'kuji' ? 352 : 34, 610, K.fruit(18, kind === 'kuji' ? 0 : 1));
  } else if (kind === 'amida') {
    // 庭の小道：芝と、散らばる物
    body = cl(300, 120, 80)
      + `<path d="M0,560 Q120,520 240,548 T390,536 V844 H0 Z" fill="${P.grass}"/>`
      + `<path d="M150,844 Q180,700 260,640 T390,600 V640 Q300,670 250,720 T230,844 Z" fill="${snowy ? '#ffffff' : K.night ? '#b8b4c8' : '#f4e2c0'}"/>`
      + tr(40, 520, 30, T[2], 0) + tr(360, 500, 26, T[0], 1)
      + sc(17, 12, { x: 6, y: 640, w: 378, h: 190 }, 8, 13)
      + air(64, 140, 13, 0, -10);
  } else if (kind === 'race') {
    // 運動会の原っぱ：上に小さな旗の列
    let bunting = `<path d="M-10,70 Q195,112 400,70" stroke="#9b5f3a" stroke-width="2" fill="none"/>`;
    for (let i = 0; i < 14; i++) {
      const x = 4 + i * 28.5;
      const y = 70 + Math.sin(((x + 10) / 410) * Math.PI) * 21;
      const col = [C.momiji, C.icho, C.olive, '#9fc5e8', C.rose][i % 5];
      bunting += `<path d="M${f(x - 8)},${f(y)} L${f(x + 8)},${f(y + 1)} L${f(x)},${f(y + 18)} Z" fill="${col}" opacity="0.9"/>`;
    }
    body = bunting + cl(300, 150, 70)
      + `<path d="M0,600 Q110,560 220,590 T390,570 V844 H0 Z" fill="${P.field}"/>`
      + tr(30, 580, 28, T[2], 0) + tr(362, 560, 30, T[1], 1)
      + `<path d="M0,670 Q140,630 270,660 T390,650 V844 H0 Z" fill="${P.fieldB}"/>`
      + sc(29, 12, { x: 6, y: 680, w: 378, h: 150 }, 8, 13)
      + air(40, 170, 13, 0, -6);
  } else if (kind === 'sugoroku') {
    // 和室：上に しょうじ、下に たたみ
    let shoji = `<rect x="0" y="0" width="${W}" height="210" fill="${K.night ? '#fff1d0' : '#fffaf0'}"/>`;
    for (let x = 0; x <= W; x += 65) shoji += `<path d="M${x},0 V210" stroke="#e6c99a" stroke-width="3"/>`;
    for (let y = 0; y <= 210; y += 52) shoji += `<path d="M0,${y} H${W}" stroke="#e6c99a" stroke-width="3"/>`;
    shoji += `<path d="M0,212 H${W}" stroke="#c99a62" stroke-width="7"/>`;
    let tatami = '';
    for (let i = 0; i < 3; i++) {
      tatami += `<rect x="${i % 2 ? -100 : 0}" y="${600 + i * 82}" width="${W + 100}" height="82" fill="${i % 2 ? '#e8e3b8' : '#ece8c4'}" stroke="#d5cd98" stroke-width="2"/>`;
      tatami += `<path d="M${i % 2 ? 160 : 260},${600 + i * 82} V${682 + i * 82}" stroke="#b9a46c" stroke-width="5"/>`;
    }
    body = shoji + at(330, 150, K.piece(0, 16), 20) + tatami
      + at(50, 780, K.piece(2, 15), -20)
      + at(340, 640, K.fruit(16, 0)) + at(44, 600, K.fruit(14, 1));
  } else if (kind === 'otoshi') {
    // 台所の窓辺：窓に季節の枝、カーテン、チェックの テーブルクロス、季節の くだもの
    let cloth = '';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
      if ((i + j) % 2) cloth += `<rect x="${i * 46}" y="${650 + j * 50}" width="46" height="50" fill="#f6c9b8" opacity="0.55"/>`;
    }
    body = `<rect x="70" y="60" width="250" height="150" rx="14" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>`
      + windowView(74, 64, 242, 142, K)
      + `<path d="M195,60 V210 M70,135 H320" stroke="#e6c99a" stroke-width="4"/>`
      + `<path d="M60,50 Q90,140 70,220 L40,220 L40,50 Z M330,50 Q300,140 320,220 L350,220 L350,50 Z" fill="#f7c4b4" opacity="0.8"/>`
      + `<rect x="0" y="640" width="${W}" height="210" fill="#fff4e6"/>` + cloth
      + at(50, 600, K.fruit(16, 0), -15) + at(340, 610, K.fruit(14, 1), 10);
  } else if (kind === 'maigo') {
    // 庭の小道：生け垣の丸い しげみ（冬は雪をかぶる）
    const bush = (x, y, r, col) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"${snowy ? ' stroke="#c9d9e4" stroke-width="2"' : ''}/><circle cx="${x - r * 0.7}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${col}"/><circle cx="${x + r * 0.7}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${col}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#ffffff" opacity="0.18"/></g>`;
    body = cl(80, 120, 80)
      + `<path d="M0,590 Q120,560 240,580 T390,570 V844 H0 Z" fill="${P.grass}"/>`
      + bush(30, 600, 30, P.bush[0]) + bush(360, 590, 34, P.bush[1]) + bush(300, 640, 22, P.bush[2])
      + tr(70, 560, 26, T[2], 0)
      + `<path d="M150,844 Q170,740 230,700 T330,660" stroke="${snowy ? '#ffffff' : K.night ? '#b8b4c8' : '#f4e2c0'}" stroke-width="40" fill="none" stroke-linecap="round"/>`
      + sc(37, 10, { x: 6, y: 680, w: 378, h: 150 }, 8, 13)
      + air(330, 150, 13, 1, 8);
  } else if (kind === 'tower') {
    // 引っこしの日の へや：窓（季節の枝）、かべに 時計、下に木の床
    body = `<rect x="230" y="70" width="120" height="110" rx="10" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>`
      + windowView(234, 74, 112, 102, K)
      + `<path d="M290,70 V180 M230,125 H350" stroke="#e6c99a" stroke-width="4"/>`
      + `<circle cx="70" cy="110" r="26" fill="#fffaf0" stroke="#e6c99a" stroke-width="4"/><path d="M70,110 V94 M70,110 L82,116" stroke="${C.chestnut}" stroke-width="3" stroke-linecap="round"/>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + at(40, 700, K.piece(2, 14), -12) + at(352, 700, K.fruit(14, 1));
  } else if (kind === 'sagasu') {
    // 子ども部屋：水玉の かべ紙、丸い窓（季節の枝）、木の床と まるい ラグ
    let dots = '';
    for (let r = 0; r < 9; r++) for (let k = 0; k < 7; k++) dots += `<circle cx="${k * 60 + (r % 2 ? 30 : 0)}" cy="${30 + r * 70}" r="5" fill="#f6d2bf" opacity="0.55"/>`;
    body = dots
      + `<circle cx="300" cy="120" r="56" fill="#fffaf0" stroke="#e6c99a" stroke-width="6"/>`
      + `<g clip-path="circle(52px at 300px 120px)">${windowView(248, 68, 104, 104, K)}</g>`
      + `<path d="M300,64 V176 M244,120 H356" stroke="#e6c99a" stroke-width="4"/>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/>`
      + `<path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + `<ellipse cx="195" cy="800" rx="150" ry="26" fill="#f7c4b4" opacity="0.7"/><ellipse cx="195" cy="800" rx="118" ry="18" fill="none" stroke="#fffaf0" stroke-width="3" opacity="0.8"/>`
      + at(46, 700, K.fruit(15, 1), -14) + at(350, 705, K.piece(0, 14), 18);
  } else if (kind === 'saikoro') {
    // あそびべや：木の床に、星の もようの ラグと つみき
    let starsRug = '';
    [[60, 760], [140, 790], [250, 770], [330, 800], [200, 812]].forEach(([x, y], i) => { starsRug += `<path d="M${x},${y - 7} L${x + 2},${y - 2} L${x + 7},${y - 2} L${x + 3},${y + 1} L${x + 5},${y + 6} L${x},${y + 3} L${x - 5},${y + 6} L${x - 3},${y + 1} L${x - 7},${y - 2} L${x - 2},${y - 2} Z" fill="${[C.icho, '#fffaf0', C.rose][i % 3]}"/>`; });
    const block = (x, y, s, col, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="4" fill="${col}" stroke="#d9b98e" stroke-width="2"/></g>`;
    body = cl(80, 130, 70) + cl(310, 180, 56)
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/><path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/>`
      + `<ellipse cx="195" cy="790" rx="170" ry="34" fill="#cfe0ea" opacity="0.8"/>` + starsRug
      + block(34, 700, 26, '#f7c4b4', -8) + block(60, 706, 20, '#fde3a6', 10) + block(352, 702, 24, '#cfe3c0', 6)
      + at(330, 690, K.piece(1, 12)) + at(300, 700, K.fruit(14, 2));
  } else if (kind === 'negaeri') {
    // ひるねの へや：レースの カーテン、つりさげの かざり、木の床
    let mobile = `<path d="M195,0 V60 M150,60 H240" stroke="#c99a62" stroke-width="2"/>`;
    [[150, 80, C.icho], [195, 96, C.rose], [240, 80, '#cfe0ea']].forEach(([x, y, c]) => { mobile += `<path d="M${x},60 V${y - 10}" stroke="#c99a62" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="10" fill="${c}" stroke="#e6c99a" stroke-width="2"/>`; });
    body = `<path d="M0,0 Q40,140 10,300 L0,300 Z M390,0 Q350,140 380,300 L390,300 Z" fill="#fffaf0" opacity="0.9"/>`
      + `<path d="M0,0 Q40,140 10,300 M390,0 Q350,140 380,300" stroke="#f1d7c2" stroke-width="3" fill="none"/>` + mobile
      + `<rect x="0" y="720" width="${W}" height="124" fill="#efd0a0"/><path d="M0,720 H${W}" stroke="#ddb37c" stroke-width="4"/><path d="M0,770 H${W} M0,815 H${W}" stroke="#e2bd87" stroke-width="2"/>`
      + at(52, 702, K.piece(2, 14), -12) + at(340, 700, K.fruit(14, 0));
  } else if (kind === 'mekuri') {
    // つくえの ある へや：かべの けいじ板、窓（季節の枝）、つくえの はし
    body = `<rect x="40" y="80" width="150" height="110" rx="10" fill="#f3dcbb" stroke="#e6c99a" stroke-width="5"/>`
      + `<rect x="58" y="98" width="44" height="34" fill="#fffaf0" transform="rotate(-6 80 115)"/><rect x="116" y="104" width="52" height="40" fill="#fde3d6" transform="rotate(5 142 124)"/><circle cx="80" cy="100" r="4" fill="${C.momiji}"/><circle cx="142" cy="106" r="4" fill="${C.olive}"/>`
      + at(80, 160, K.piece(1, 16)) + at(150, 165, K.piece(2, 14))
      + `<rect x="240" y="70" width="110" height="120" rx="10" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>`
      + windowView(244, 74, 102, 112, K)
      + `<path d="M295,70 V190 M240,130 H350" stroke="#e6c99a" stroke-width="4"/>`
      + `<rect x="0" y="720" width="${W}" height="124" fill="#e9c591"/><path d="M0,720 H${W}" stroke="#c99a62" stroke-width="5"/><path d="M0,744 H${W}" stroke="#ddb37c" stroke-width="2"/>`
      + at(350, 704, K.fruit(13, 1), 16) + at(40, 704, K.fruit(13, 0));
  } else if (kind === 'wanage') {
    // 縁日：上に 小さな ちょうちんの列、まわりに 木、下に土の みち
    let lanterns = `<path d="M-10,70 Q195,104 400,70" stroke="#9b5f3a" stroke-width="2" fill="none"/>`;
    for (let i = 0; i < 9; i++) {
      const x = 10 + i * 46;
      const y = 70 + Math.sin(((x + 10) / 410) * Math.PI) * 17;
      lanterns += lanternGlow(x, y + 16) + `<path d="M${x},${y} v6" stroke="#9b5f3a" stroke-width="1.6"/><ellipse cx="${x}" cy="${y + 16}" rx="10" ry="12" fill="#fff6e4" stroke="#e7b98a" stroke-width="1.6"/><path d="M${x - 9},${y + 13} h18" stroke="${C.momiji}" stroke-width="2" opacity="0.8"/>`;
    }
    body = lanterns + tr(30, 560, 30, T[0], 0) + tr(362, 548, 32, T[1], 1)
      + `<rect x="0" y="700" width="${W}" height="144" fill="${snowy ? '#f2f6f9' : K.night ? '#c9b8a8' : '#efd9b4'}"/><path d="M0,700 H${W}" stroke="${snowy ? '#d3e1ea' : '#e2c592'}" stroke-width="3"/>`
      + sc(41, 10, { x: 6, y: 720, w: 378, h: 110 }, 8, 12)
      + air(40, 170, 13, 0, -8);
  } else if (kind === 'tsuri') {
    // 池の ほとり：遠くの丘、木、季節の背の高い草
    let reeds = '';
    [12, 40, 340, 366].forEach((x, k) => { reeds += K.plant(x, 836, k); });
    body = cl(80, 110, 70) + `<path d="M0,260 Q100,190 200,240 T390,220 V320 H0 Z" fill="${P.hillB}" opacity="0.8"/>`
      + `<rect x="0" y="300" width="${W}" height="544" fill="${P.grass}"/>` + tr(40, 280, 26, T[2], 0) + tr(350, 270, 30, T[0], 1) + reeds
      + air(200, 190, 13, 0, 8);
  } else if (kind === 'tobiishi') {
    // 川原：遠くの はし、くさ、飛ぶ物
    body = cl(70, 110, 70)
      + `<path d="M210,250 Q290,200 370,250" stroke="#e3a074" stroke-width="8" fill="none"/><path d="M222,250 V262 M250,232 V262 M280,224 V262 M310,224 V262 M340,232 V262 M358,244 V262" stroke="#e3a074" stroke-width="3"/>`
      + (snowy ? `<path d="M210,246 Q290,196 370,246" stroke="#ffffff" stroke-width="4" fill="none"/>` : '')
      + `<rect x="0" y="262" width="${W}" height="582" fill="${P.grass}"/>` + tr(40, 250, 24, T[1], 0)
      + air(320, 330, 16, 0, -14) + air(60, 380, 12, 1, 10)
      + sc(53, 6, { x: 20, y: 300, w: 350, h: 120 }, 8, 12);
  } else if (kind === 'hidamari') {
    // えんがわ：上に にわの木と そら（夜は お月さま）、下に 木の いた
    let boards = '';
    for (let i = 0; i < 6; i++) boards += `<rect x="0" y="${560 + i * 48}" width="${W}" height="48" fill="${i % 2 ? '#f3d5a8' : '#f6dcb4'}"/><path d="M0,${560 + i * 48} H${W}" stroke="#e2bd87" stroke-width="2"/>`;
    body = cl(90, 110, 80) + cl(300, 160, 60)
      + (K.night ? '' : `<circle cx="340" cy="70" r="26" fill="#ffe58a" opacity="0.9"/>`)
      + `<path d="M0,420 Q100,380 200,410 T390,390 V560 H0 Z" fill="${P.hillB}"/>` + tr(50, 420, 32, T[2], 0) + tr(330, 410, 28, T[0], 1)
      + yard(196, 520, 26, 0) + boards
      + `<path d="M0,556 H${W}" stroke="#c99a62" stroke-width="6"/>`;
  } else if (kind === 'kanransha' || kind === 'hikoki' || kind === 'watage') {
    // 遊園地の丘（かんらんしゃ）・ひろい原っぱ（かみひこうき）・川ぞいの野原（わたげ）
    let field = '';
    if (kind === 'watage') {
      let sd = 19;
      const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < 18; i++) field += K.flower(rnd() * W, 690 + rnd() * 140, 4 + rnd() * 4, i);
    }
    body = cl(70, 120, 84) + cl(300, 180, 66) + (kind === 'hikoki' ? cl(200, 260, 50) : '')
      + `<path d="M0,580 Q110,540 220,566 T390,550 V844 H0 Z" fill="${kind === 'watage' ? P.field : P.hillA}"/>`
      + (kind === 'watage' ? `<path d="M0,640 Q200,610 390,650 V680 Q200,640 0,672 Z" fill="${snowy ? '#e6eef4' : K.night ? '#8f9cc0' : '#cfe8eb'}"/>` : '')
      + tr(34, 570, 30, T[0], 0) + tr(360, 556, 34, T[1], 1) + (kind === 'kanransha' ? tr(310, 600, 22, T[2], 2) : '')
      + `<path d="M0,690 Q130,656 260,680 T390,670 V844 H0 Z" fill="${kind === 'watage' ? P.fieldB : P.hillB}"/>`
      + field + yard(kind === 'hikoki' ? 340 : 54, 712, 24, kind === 'hikoki' ? 1 : 0)
      + sc(kind === 'kanransha' ? 61 : 67, 10, { x: 6, y: 720, w: 378, h: 110 }, 8, 13)
      + air(40, 230, 14, 0, -8) + air(352, 290, 12, 1, 10);
  } else if (kind === 'shabon' || kind === 'jarashi' || kind === 'hyokkori') {
    // 庭の しばふ：花（しゃぼんだま）、背の高い草（ねこじゃらし）、丸い しげみ（ひょっこり）
    let extra = '';
    if (kind === 'shabon') [[30, 760], [70, 800], [320, 770], [360, 805], [200, 815]].forEach(([x, y], i) => { extra += K.flower(x, y, 6, i); });
    if (kind === 'jarashi') [16, 44, 346, 374].forEach((x, k) => { extra += K.plant(x, 836, k); });
    if (kind === 'hyokkori') {
      const bush = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x - r * 0.7}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${col}"/><circle cx="${x + r * 0.7}" cy="${y + r * 0.3}" r="${r * 0.7}" fill="${col}"/>` + (snowy ? `<path d="M${x - r * 1.2},${y - r * 0.2} q${r * 1.2},${-r * 1.1} ${r * 2.4},0" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/>` : '');
      extra = bush(26, 610, 26, P.bush[0]) + bush(366, 600, 30, P.bush[1]);
    }
    body = cl(90, 130, 80) + cl(310, 170, 60)
      + `<path d="M0,560 Q120,526 240,550 T390,540 V844 H0 Z" fill="${P.grass}"/>`
      + tr(36, 540, 28, T[1], 0) + tr(356, 526, 32, T[2], 1)
      + extra + yard(196, 560, 22, kind === 'hyokkori' ? 1 : 0)
      + sc(kind === 'shabon' ? 71 : 73, 10, { x: 6, y: 660, w: 378, h: 170 }, 8, 13)
      + air(330, 300, 14, 0, 10) + air(54, 360, 12, 1, -8);
  } else if (kind === 'yubin' || kind === 'daruma') {
    // 町はずれ（ゆうびん）・公園（だるまさんが ころんだ）：とおくの いえ並み、木、土の ひろば
    let town = '';
    if (kind === 'yubin') {
      [[40, 540, '#f7c4b4'], [110, 552, '#cfe0ea'], [300, 546, '#fde3a6'], [360, 556, '#cfe3c0']].forEach(([x, y, c]) => {
        town += `<rect x="${x - 20}" y="${y - 26}" width="40" height="30" fill="${c}" stroke="#e2bd87" stroke-width="2"/><path d="M${x - 26},${y - 24} L${x},${y - 46} L${x + 26},${y - 24} Z" fill="#e3a074"/>` + (snowy ? `<path d="M${x - 24},${y - 26} L${x},${y - 44} L${x + 24},${y - 26}" stroke="#ffffff" stroke-width="5" fill="none"/>` : '') + `<rect x="${x - 6}" y="${y - 18}" width="10" height="9" fill="${K.night ? '#ffe58a' : '#fffaf0'}"/>`;
      });
    }
    body = cl(80, 120, 76) + cl(300, 170, 60)
      + `<path d="M0,560 Q120,530 240,552 T390,544 V844 H0 Z" fill="${P.hillB}"/>` + town
      + tr(kind === 'yubin' ? 200 : 40, 556, 26, T[0], 0) + tr(kind === 'yubin' ? 250 : 356, 566, 22, T[1], 1)
      + `<rect x="0" y="600" width="${W}" height="244" fill="${snowy ? '#f2f6f9' : K.night ? '#c9b8a8' : '#efd9b4'}"/><path d="M0,600 H${W}" stroke="${snowy ? '#d3e1ea' : '#e2c592'}" stroke-width="3"/>`
      + sc(kind === 'yubin' ? 79 : 83, 10, { x: 6, y: 640, w: 378, h: 190 }, 8, 12)
      + air(46, 220, 13, 0, -8);
  } else if (kind === 'bowling' || kind === 'himo' || kind === 'gacha' || kind === 'crane') {
    // へやの中：ボウリングの ろうか、だがしやの たな（ひも・ガチャ）、ゲームの かど（クレーン）
    let wall = '';
    if (kind === 'crane') {
      wall = `<rect x="0" y="0" width="${W}" height="640" fill="#fff4f6"/>`;
      for (let i = 0; i < 9; i++) wall += `<rect x="${i * 46}" y="0" width="23" height="640" fill="#fbe3ea"/>`;
      for (let i = 0; i < 12; i++) wall += `<circle cx="${18 + i * 32}" cy="40" r="5" fill="${[C.icho, C.rose, '#cfe0ea'][i % 3]}"/>`;
    } else if (kind === 'gacha' || kind === 'himo') {
      for (let i = 0; i < 9; i++) wall += `<path d="M${i * 46 - 10},0 h46 v40 q-23,12 -46,0 Z" fill="${i % 2 ? '#fff6e4' : kind === 'gacha' ? '#cfe0ea' : '#cfe3c0'}"/>`;
      wall += `<path d="M0,1 H${W}" stroke="#e2bd87" stroke-width="3"/>`;
      // たなの びん
      [[40, 600], [86, 604], [304, 600], [350, 604]].forEach(([x, y], k) => { wall += `<rect x="${x - 15}" y="${y - 30}" width="30" height="34" rx="8" fill="#eaf6fb" stroke="#9fc8cf" stroke-width="2"/><rect x="${x - 12}" y="${y - 36}" width="24" height="8" rx="3" fill="${[C.momiji, C.olive, C.kaki, '#a985c9'][k]}"/>` + [0, 1, 2].map((j) => `<circle cx="${x - 7 + j * 7}" cy="${y - 8 - (j % 2) * 6}" r="4" fill="${[C.icho, C.rose, '#cfe3c0'][(j + k) % 3]}"/>`).join(''); });
      wall += `<rect x="0" y="604" width="${W}" height="8" fill="#ddb37c"/>`;
    } else {
      wall = `<rect x="240" y="70" width="110" height="110" rx="10" fill="#fffaf0" stroke="#e6c99a" stroke-width="5"/>` + windowView(244, 74, 102, 102, K) + `<path d="M295,70 V180 M240,125 H350" stroke="#e6c99a" stroke-width="4"/>`;
    }
    body = wall + planks(640, 4, 52, kind === 'bowling' ? ['#f9e3bd', '#f4d9ab'] : ['#f6dcb4', '#f3d5a8'])
      + (kind === 'bowling' ? `<path d="M120,844 L170,640 M270,844 L220,640" stroke="#e2bd87" stroke-width="3"/>` : '')
      + at(46, 770, K.piece(0, 16), -20) + at(346, 790, K.piece(1, 18), 24)
      + at(kind === 'crane' ? 40 : 352, 680, K.fruit(16, kind === 'gacha' ? 0 : 1));
  } else if (kind === 'settings') {
    body = sc(23, 8, { x: 0, y: 0, w: W, h: H }, 10, 16, 0.18);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${sky}${body}</svg>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${sky}${body}${K.sky(kind)}</svg>`;
}

// 動く物（夜空の星・花火、クリスマスの電球、ハロウィンの おばけ など）。背景の上に、背景と同じ置き方で重ねる
export function sceneFX(kind, lk = { season: 'aki', event: '' }) {
  // せってい・机の上（スタンプ）・和室（すごろく）は、空が見えないので出さない
  if (kind === 'settings' || kind === 'stamp' || kind === 'sugoroku') return '';
  const html = kitFor(lk).fx(kind);
  return html ? `<div class="scene-fx" aria-hidden="true">${html}</div>` : '';
}
