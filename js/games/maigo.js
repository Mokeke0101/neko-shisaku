// まいごの こねこ（決め方：分かれ道をたどる。見せ方の部品：枝分かれする小道と、右はしの札）。
// 子猫が、左から枝分かれする小道を歩く。分かれ道のたびに、どっちへ行くか まよう。たどり着いた出口の札が結果になる。
// 同じ「線をたどる」系統の あしあと あみだ とは、道の形（あみだは横の線と橋、こちらは木の枝のように分かれる道）と、
// 迷い方（こちらは分かれ道ごとに止まって迷う）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 子猫が、あたりを見回してから歩きだす。
// 2. 分かれ道に来るたびに止まり、道を見比べる。ときどき違う道へ一歩入りかけて、戻ってくる。
// 道の形は4種類（v16）：分かれ道・あみだ（かくかく）・くねくね道・橋のある道（小川と橋）。どれも同じ「木」の形で、描き方だけが違う。
// 道の形は ゲームを開いた時（と選択肢の数が変わった時）に決め、遊んでいる間は かえない（v15 までは「あるく」を押すと
// 描き直しで 道が作り直され、見えていた道と ちがう道を歩く不具合があった）。子猫は 描いた道と同じ線を歩く。
// 出口は 木の立てふだ（選択肢を じかに書く）。
// 結果は先に乱数で決め（RS01-S14）、分かれ道ごとに、決めた出口へ続く道を選ぶ。
// 出口の札はどれも同じ大きさ（出やすさは札の大きさに表れない：RS01-S21）。
import { C } from '../art.js';
import { look as nowLook } from '../look.js';
import { seasonFlier } from '../kits.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

// 道の木を作る。葉（出口）は 0〜n-1 を上から順に持つ。
// 3つまでは1つの分かれ道で分ける。4つ以上は2つに分ける（分け方は少し ばらつかせる）。rand() は 0 以上 1 未満
export function makeTree(n, rand = Math.random) {
  const build = (lo, hi, depth) => {
    const count = hi - lo;
    if (count === 1) return { leaf: lo, depth, children: [] };
    let parts;
    if (count <= 3) parts = Array.from({ length: count }, (_, k) => [lo + k, lo + k + 1]);
    else {
      const half = count / 2;
      const cut = lo + Math.max(1, Math.min(count - 1, Math.round(half + (count >= 5 ? (rand() < 0.5 ? -0.5 : 0.5) : 0))));
      parts = [[lo, cut], [cut, hi]];
    }
    return { leaf: -1, depth, children: parts.map(([a, b]) => build(a, b, depth + 1)) };
  };
  return build(0, n, 0);
}

// 木の深さ（いちばん深い葉までの分かれ道の数）
export function treeDepth(node) {
  return node.children.length ? 1 + Math.max(...node.children.map(treeDepth)) : 0;
}

// 決めた出口 target へ続く、分かれ道ごとの選び方（子の番号の並び）
export function routeTo(node, target) {
  const route = [];
  let cur = node;
  while (cur.children.length) {
    const k = cur.children.findIndex((c) => leafRange(c).includes(target));
    if (k < 0) throw new Error(`出口が木に無い: ${target}`);
    route.push(k);
    cur = cur.children[k];
  }
  if (cur.leaf !== target) throw new Error(`たどり着いた出口が違う: ${cur.leaf}・${target}`);
  return route;
}

export function leafRange(node) {
  return node.children.length ? node.children.flatMap(leafRange) : [node.leaf];
}

export const PATTERNS = ['fork', 'kaku', 'kune', 'bridge'];
export const PATTERN_NAMES = { fork: '分かれ道', kaku: 'あみだ', kune: 'くねくね道', bridge: '橋のある道' };

export function createMaigo({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;
  let tree = null;
  let treeN = 0;
  let pattern = 'fork';
  let patternNo = Math.floor(Math.random() * PATTERNS.length);

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    // 道は 選択肢の数が変わった時だけ 作り直す（遊ぶたびの描き直しでは かえない）
    if (!tree || treeN !== n) {
      tree = makeTree(n);
      treeN = n;
      pattern = PATTERNS[patternNo % PATTERNS.length];
      patternNo++;
    }
    const D = Math.max(1, treeDepth(tree));
    const cardX = 4;
    const cardW = W - 8;
    const spacing = Math.min(n <= 4 ? 92 : 76, (H - 40) / n);
    const top = (H - spacing * n) / 2 + spacing / 2;
    const ys = choices.map((_, i) => top + i * spacing);
    const cardY = ys[0] - spacing / 2 - 6;
    const cardH = spacing * n + 12;
    const tagW = Math.max(112, Math.min(146, W * 0.37));
    const tagX = cardX + cardW - 8 - tagW;
    const xRoot = cardX + 44;
    const xEnd = tagX - 10;
    const th = Math.max(22, Math.min(40, spacing - 6));
    const road = Math.max(8, Math.min(16, spacing * 0.36));
    const kit = Math.max(24, Math.min(54, spacing * 1.1));
    // 分かれ道の位置：深さで x を決め、y は その先の出口の真ん中
    const place = (node) => {
      node.x = node.children.length ? xRoot + ((xEnd - 40 - xRoot) * node.depth) / D : xEnd;
      if (node.children.length) {
        node.children.forEach(place);
        const ly = leafRange(node).map((i) => ys[i]);
        node.y = (Math.min(...ly) + Math.max(...ly)) / 2;
      } else node.y = ys[node.leaf];
    };
    place(tree);
    geo = { n, W, H, ys, spacing, tagX, tagW, th, xRoot, xEnd, road, kit, cardX };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 芝生の紙
    s += `<rect x="${cardX + 3}" y="${cardY + 6}" width="${cardW}" height="${cardH}" rx="22" fill="#a9c98f" opacity="0.35"/>`;
    s += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="22" fill="#dcecc4" stroke="#a9c98f" stroke-width="3"/>`;
    for (let k = 0; k < 16; k++) {
      const gx = cardX + 12 + ((k * 71) % (cardW - 24));
      const gy = cardY + 10 + ((k * 43) % Math.max(10, cardH - 20));
      s += `<path d="M${gx},${gy} l-3,-6 M${gx},${gy} l0,-8 M${gx},${gy} l3,-6" stroke="#a9c98f" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>`;
    }
    // 道（ふちの色を下に、道の色を上に）
    const edges = [];
    const walkEdges = (node) => node.children.forEach((c) => { edges.push([node, c]); walkEdges(c); });
    walkEdges(tree);
    const F = (v) => v.toFixed(1);
    const wig = Math.max(4, Math.min(11, spacing * 0.3));
    const edgeD = ([a, b]) => {
      const bx = b.children.length ? b.x : Math.min(b.x, a.x + Math.max(40, (xEnd - 40 - xRoot) / D));
      const tail = !b.children.length && bx < xEnd ? ` L${F(xEnd)},${F(b.y)}` : '';
      if (pattern === 'kaku') {
        // あみだ：横 → たて → 横 の かくかく道
        const mx = a.x + Math.max(10, (bx - a.x) * 0.3);
        return `M${F(a.x)},${F(a.y)} H${F(mx)} V${F(b.y)} H${F(bx)}${tail}`;
      }
      const c1 = a.x + Math.min(36, (bx - a.x) * 0.5);
      const c2 = bx - Math.min(36, (bx - a.x) * 0.5);
      if (pattern === 'kune') {
        // くねくね道：分かれ道の曲線に、両はしで 0 になる ゆれを足す
        const N = 24;
        const pts = [];
        for (let q = 0; q <= N; q++) {
          const t = q / N;
          const u = 1 - t;
          const x = u * u * u * a.x + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * bx;
          const y = u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y;
          pts.push(`${F(x)},${F(y + Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI) * wig)}`);
        }
        return `M${pts.join(' L')}${tail}`;
      }
      return `M${F(a.x)},${F(a.y)} C${F(c1)},${F(a.y)} ${F(c2)},${F(b.y)} ${F(bx)},${F(b.y)}${tail}`;
    };
    const ds = edges.map(edgeD);
    // 橋のある道：出口の手前を たてに ながれる 小川
    const riverW = Math.max(14, Math.min(24, spacing * 0.6));
    const xr = xEnd - riverW / 2 - 10;
    if (pattern === 'bridge') {
      let rv = `M${F(xr)},${F(cardY + 2)}`;
      for (let y = cardY + 2; y < cardY + cardH - 2; y += 24) rv += ` Q${F(xr + 6)},${F(y + 12)} ${F(xr)},${F(Math.min(cardY + cardH - 2, y + 24))}`;
      s += `<path d="${rv}" stroke="#9fc8cf" stroke-width="${F(riverW + 4)}" fill="none"/><path d="${rv}" stroke="#cfe8ef" stroke-width="${F(riverW)}" fill="none"/>`
        + `<path d="${rv}" stroke="#ffffff" stroke-width="1.6" fill="none" stroke-dasharray="6 14" opacity="0.8"/>`;
    }
    const roadD = `M${F(cardX + 14)},${F(tree.y)} L${F(tree.x)},${F(tree.y)} ${ds.join(' ')}`;
    s += `<path d="${roadD}" stroke="#d9b886" stroke-width="${road + 5}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${roadD}" stroke="#f6e3bf" stroke-width="${road}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (pattern === 'bridge') {
      // 出口へ行く道ごとに 木の橋
      ys.forEach((y) => {
        const bw = riverW + 12;
        const bh = road + 6;
        s += `<rect x="${F(xr - bw / 2)}" y="${F(y - bh / 2)}" width="${F(bw)}" height="${F(bh)}" rx="2" fill="#e3bb84" stroke="#9b6b3a" stroke-width="1.4"/>`
          + Array.from({ length: 4 }, (_, q) => `<path d="M${F(xr - bw / 2 + ((q + 1) * bw) / 5)},${F(y - bh / 2)} v${F(bh)}" stroke="#b98a52" stroke-width="1"/>`).join('')
          + `<path d="M${F(xr - bw / 2)},${F(y - bh / 2)} h${F(bw)} M${F(xr - bw / 2)},${F(y + bh / 2)} h${F(bw)}" stroke="#9b6b3a" stroke-width="2"/>`;
      });
    }
    // 分かれ道の小さな花
    const forks = [];
    const walkForks = (node) => { if (node.children.length) { forks.push(node); node.children.forEach(walkForks); } };
    walkForks(tree);
    forks.forEach((f, k) => {
      const fx = f.x - 6;
      const fy = f.y - road * 0.9 - 4;
      const col = [C.rose, C.icho, '#cfb0e6'][k % 3];
      s += `<g transform="translate(${fx.toFixed(1)} ${fy.toFixed(1)})">`
        + [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-3.2" rx="2.4" ry="3.4" fill="${col}" transform="rotate(${a})"/>`).join('')
        + `<circle r="1.8" fill="${C.ichoDeep}"/></g>`;
    });
    // 紙の すみの しげみ（v12）
    const bush = (x, y, k) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})"><circle cx="-9" cy="0" r="9" fill="#bdd68c"/><circle cx="6" cy="-3" r="11" fill="#a3bd6e"/><circle cx="16" cy="3" r="7" fill="#bdd68c"/><path d="M-6,-4 l2,-3 M8,-8 l2,-3" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/></g>`;
    if (tree.y - cardY > 90) s += bush(cardX + 30, cardY + 30, 1);
    if (cardY + cardH - tree.y > 90) s += bush(cardX + 30, cardY + cardH - 26, 0.9);
    // 入口の 立てふだ（v12）
    const sx = cardX + 16;
    const sy = tree.y - road - 4;
    if (sy - cardY > 40) {
      s += `<path d="M${sx},${sy.toFixed(1)} V${(sy - 34).toFixed(1)}" stroke="#9b5f3a" stroke-width="3"/>`
        + `<path d="M${sx - 10},${(sy - 40).toFixed(1)} h22 l6,6 l-6,6 h-22 Z" fill="#f3d9b0" stroke="#9b5f3a" stroke-width="1.6"/>`
        + `<text x="${sx + 3}" y="${(sy - 33.5).toFixed(1)}" font-size="12" font-weight="700" fill="#9b5f3a" text-anchor="middle" dominant-baseline="central">？</text>`;
    }
    s += `<g class="mg-fly" visibility="hidden">${seasonFlier(nowLook).svg}</g>`;
    // 足あと
    s += `<g class="prints"></g>`;
    // 出口の札
    let minLabel = Infinity;
    ys.forEach((y, i) => {
      const len = Math.max(charCount(choices[i]), 1);
      const size = Math.max(12, Math.min(22, th * 0.62, ((tagW - 16) / len) * 0.98));
      minLabel = Math.min(minLabel, size);
      s += `<g class="tag" data-i="${i}">`
        + `<rect x="${tagX + 2}" y="${y - th / 2 + 3}" width="${tagW}" height="${th}" rx="${Math.min(8, th / 2)}" fill="#9b6b3a"/>`
        + `<rect class="tag-bg" x="${tagX}" y="${y - th / 2}" width="${tagW}" height="${th}" rx="${Math.min(8, th / 2)}" fill="#f2d3a2" stroke="#b98a52" stroke-width="2"/>`
        + `<circle cx="${tagX + 6}" cy="${y}" r="1.6" fill="#b98a52"/><circle cx="${tagX + tagW - 6}" cy="${y}" r="1.6" fill="#b98a52"/>`
        + `<text class="cell-label" x="${tagX + tagW / 2}" y="${y}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(choices[i])}</text>`
        + `</g>`;
    });
    // 子猫（座った姿を小さく。歩く時は はずむ）
    s += `<g class="kitten"><g class="kitten-in">${catSitting(cat, { look: { x: 1, y: 0 } })}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      prints: svg.querySelector('.prints'),
      kitten: svg.querySelector('.kitten'),
      kittenIn: svg.querySelector('.kitten-in'),
      tags: Array.from(svg.querySelectorAll('.tag')),
      fly: svg.querySelector('.mg-fly'),
    };
    geo.edgeD = edgeD;
    geo.start = { x: cardX + 22, y: tree.y };
    placeKitten(geo.start.x, geo.start.y);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
    stage.dataset.pattern = pattern;
    // 道の木の形（分かれ方と 出口の並び）。押す前と後で 同じかを確かめる道具が使う
    const sig = (nd) => (nd.children.length ? `(${nd.children.map(sig).join(',')})` : String(nd.leaf));
    stage.dataset.tree = `${pattern}:${sig(tree)}`;
  }

  function placeKitten(x, y, lift = 0, flip = false) {
    const k = geo.kit / 170;
    refs.kitten.setAttribute('transform', `translate(${x.toFixed(2)} ${(y - lift - geo.kit * 0.25).toFixed(2)}) scale(${(flip ? -k : k).toFixed(3)} ${k.toFixed(3)})`);
  }

  function setLook(mood, look) {
    refs.kittenIn.innerHTML = catSitting(cat, { mood, look });
  }

  // 1本の道（SVG の path の d）を、長さで たどれる点の列にする
  function pathPoints(d) {
    const p = svgEl('path', { d });
    refs.prints.appendChild(p);
    const L = p.getTotalLength();
    const pts = [];
    const steps = Math.max(8, Math.ceil(L / 3));
    for (let k = 0; k <= steps; k++) {
      const q = p.getPointAtLength((L * k) / steps);
      pts.push({ x: q.x, y: q.y });
    }
    p.remove();
    return { pts, L };
  }

  let printNo = 0;
  let nextPrint = 0;
  let walked = 0;
  function dropPrint(p, dir) {
    const g = svgEl('g', { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${((Math.atan2(dir.y, dir.x) * 180) / Math.PI + 90).toFixed(1)})`, opacity: '0.6' });
    const side = printNo % 2 ? 1 : -1;
    g.innerHTML = `<ellipse cx="${side * 3}" cy="0" rx="2.4" ry="3.2" fill="${C.chestnut}"/>`;
    refs.prints.appendChild(g);
    printNo++;
  }

  // 点の列を、一定の速さで歩く（leave は足あとを残すか）
  async function walkAlong(pts, speed, leave = true) {
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      seg.push({ a: pts[i - 1], b: pts[i], from: total, l });
      total += l;
    }
    if (total < 0.5) return;
    const dur = (total / speed) * 1000;
    await frames(dur, (t) => {
      const d = total * t;
      const sg = seg.find((x) => d <= x.from + x.l) || seg[seg.length - 1];
      const u = sg.l ? (d - sg.from) / sg.l : 1;
      const p = { x: sg.a.x + (sg.b.x - sg.a.x) * u, y: sg.a.y + (sg.b.y - sg.a.y) * u };
      const dir = { x: sg.b.x - sg.a.x, y: sg.b.y - sg.a.y };
      placeKitten(p.x, p.y, Math.abs(Math.sin((walked + d) / 7)) * 4, dir.x < -0.1);
      if (leave && walked + d >= nextPrint) { dropPrint(p, dir); nextPrint += 13; }
    });
    walked += total;
  }

  function reset() {
    clearCelebration();
    tree = null; // ゲームを開くたびに 新しい道（形も 4種類を順に）
    render();
    showHint(result, '「あるく」を おしてね');
    play.textContent = 'あるく';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, start } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const route = routeTo(tree, decided);
    printNo = 0; nextPrint = 6; walked = 0;
    // 1. あたりを見回す
    showHint(result, 'あれれ、まいごかな…');
    for (const look of [{ x: -1, y: -0.6 }, { x: 1, y: 0.6 }, { x: 1, y: 0 }]) {
      setLook('normal', look);
      audio.hover(0);
      await wait(320);
    }
    // ときどき出る別の動き（v12）：ちょうちょ（季節の生き物）が とんできて、目で おいかける
    // 動きの ちがい（3B：4つ）：ふつう・とぶ生き物を目で おう・分かれ道で ひとやすみ（あくび）・さいごに かけだす
    const vr = Math.random();
    const variant = vr < 0.25 ? 'fly' : vr < 0.5 ? 'rest' : vr < 0.75 ? 'dash' : 'plain';
    stage.dataset.variant = variant;
    const restAt = route.length ? Math.floor(Math.random() * route.length) : -1;
    if (variant === 'fly') {
      showHint(result, `あ、${seasonFlier(nowLook).name}…`);
      refs.fly.setAttribute('visibility', 'visible');
      const y0 = start.y - geo.kit * 1.2;
      await frames(900, (t) => {
        const x = start.x + 20 + t * geo.W * 0.5;
        const y = y0 - Math.sin(t * Math.PI * 3) * 14 - t * 20;
        refs.fly.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1.4 * (1 - 0.3 * Math.abs(Math.sin(t * 24)))).toFixed(2)} 1.4)`);
        if (Math.floor(t * 6) !== Math.floor((t - 0.02) * 6)) setLook('happy', { x: 1, y: -1 });
      });
      refs.fly.setAttribute('visibility', 'hidden');
      setLook('normal', { x: 1, y: 0 });
      showHint(result, 'あれれ、まいごかな…');
    }
    const speed = Math.max(95, Math.min(150, (geo.xEnd - geo.xRoot) / 1.6));
    // 入口から最初の分かれ道まで
    await walkAlong([start, { x: tree.x, y: tree.y }], speed);
    // 2. 分かれ道ごとに まよって、決めた出口へ続く道を選ぶ
    const peekAt = route.length ? Math.floor(Math.random() * route.length) : -1; // ここで違う道へ一歩入りかける
    let node = tree;
    for (let k = 0; k < route.length; k++) {
      showHint(result, 'どっちに いこうかな…');
      const kids = node.children;
      const order = kids.map((_, j) => j).sort(() => Math.random() - 0.5);
      for (const j of order.slice(0, Math.min(3, order.length))) {
        setLook('normal', { x: 0.7, y: Math.max(-1, Math.min(1, (kids[j].y - node.y) / 40)) });
        audio.hop(j + k);
        await wait(k === route.length - 1 ? 320 : 210);
      }
      const go = kids[route[k]];
      if (variant === 'rest' && k === restAt) {
        // ひとやすみ：すわって ふわぁ…
        showHint(result, 'ちょっと ひとやすみ… ふわぁ');
        setLook('puff', { x: 0, y: -1 });
        audio.heart();
        await wait(520);
        setLook('normal', { x: 1, y: 0 });
      }
      if (k === peekAt && kids.length > 1) {
        // 違う道へ一歩入りかけて、戻る
        const wrongJ = route[k] === 0 ? 1 : route[k] - 1;
        const wrong = pathPoints(geo.edgeD([node, kids[wrongJ]])).pts;
        const cut = wrong.slice(0, Math.max(3, Math.floor(wrong.length * 0.28)));
        await walkAlong(cut, speed * 0.8, false);
        setLook('strain', { x: -1, y: 0 });
        showHint(result, 'あれ？ こっちじゃない…');
        audio.heart();
        await wait(420);
        await walkAlong([...cut].reverse(), speed * 0.9, false);
        setLook('normal', { x: 1, y: (go.y - node.y) / 40 });
        await wait(160);
      }
      const { pts } = pathPoints(geo.edgeD([node, go]));
      const lastLeg = k === route.length - 1;
      if (lastLeg && variant === 'dash') { showHint(result, 'わーい！ かけだすよ'); setLook('happy', { x: 1, y: 0 }); await frames(400, (t) => placeKitten(node.x, node.y, Math.abs(Math.sin(t * Math.PI * 2)) * 8)); } else showHint(result, lastLeg ? 'もうすぐ でぐち…' : 'こっちだ！');
      await walkAlong(pts, speed * (lastLeg ? (variant === 'dash' ? 1.3 : 0.75) : 1));
      node = go;
    }
    // 3. 出口に着いた
    const landed = node.leaf;
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    const tag = refs.tags[landed];
    tag.querySelector('.tag-bg').setAttribute('fill', '#fff1c4');
    tag.querySelector('.tag-bg').setAttribute('stroke', C.momiji);
    tag.querySelector('.tag-bg').setAttribute('stroke-width', '4');
    tag.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 240, easing: 'ease-out' });
    setLook('happy');
    const end = { x: geo.xEnd - 4, y: geo.ys[landed] };
    frames(500, (t) => placeKitten(end.x, end.y, Math.abs(Math.sin(t * Math.PI * 2)) * 10));
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'でぐちに ついたよ', choices[landed]);
    const c = centerOf(result);
    celebrate(level, c.x, c.y - 30);
    await wait(700);
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
