// のびのび せいくらべ（見せ方の部品：柱のきず。v16 で作り直し：依頼者が選んだ B の案）。
// えんがわの 太い柱に、えんぴつで 高さの印と選択肢が書いてある。イズが 柱の前に おすわりして、
// りょう手を ばんざいに のばし、胴を ぐーんと のばす（猫の のび。人の立ち方には しない：依頼者の希望 2026-10-27）。
// となりの はしごで アズが いっしょに のぼり、止まった所で 手の先の高さに えんぴつで 印を付ける。印を付けた高さの選択肢が結果になる。
// 段階の出やすさは、お楽しみ袋の選択肢ごとに選んだもの（RS01-S21）。どの段階もお祝いし、段階が上がるほどお祝いを大きくする（RS01-S09・S15）。
//
// のびる体は 部品を重ねて描く（おしり・胴・うで・頭・手）。胴と うでが のび、しまは 胴の長さぶん 出てくるので、
// どれだけ のびても 形が くずれない（依頼者の不安への手当て。docs/決めたことの記録.md 16.2）。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. じゅんび：イズが かがんで、おしりを ふりふり（飛びつく前の猫のしぐさ）。アズが はしごの下で「はかるよー」。
// 2. 印に届くたびに、ぷるぷる ふんばって止まる。「まだ のびる…？」。次の印の文字が、そっと光る。アズも はしごを のぼる。
//    どの印でも同じ ふんばり方をするので、止まるのか、まだのびるのかは、ふんばりが終わるまで分からない。
// 3. 決めた印で ふんばりが終わったら「ぴたっ」と止まり、アズが えんぴつで しゅっと 印を付ける。
// 動きの ちがい（3B：4つ）：ふつう・ずるっ（すべって もう いちど）・ちょいちょい（かた手だけ 上の印を ちょいちょい。アズが「かたては なしだよ」）・はしご（アズの はしごが ぐらっ）。
// のびすぎて戻る動きは使わない（一番小さい段階を残念がる見せ方にしない：RS01-S15）。
import { C } from '../art.js';
import { catFace, catSitting, catPaw, pawPrint, torsoPattern, tail, DESIGNS, CAT_DESIGN } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait } from '../fx.js';
import { showHint, showResult, setBusy, charCount, svgEl, escapeXml } from '../ui.js';

// 「いちばん うえまで」は一番上の印だけ。ほかは、お祝いの大きさの段階で言葉を選ぶ
const MESSAGES = { 1: 'とどいたよ', 2: 'よく のびたね', 3: 'たかく のびたね' };
const TOP_MESSAGE = 'いちばん うえまで';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const f = (n) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
const AZ = DESIGNS.find((x) => x.id === CAT_DESIGN.mike);
const PENCIL = '#5a4636';

// 印ごとの、のびる時間と ふんばる時間（ミリ秒）。決めた結果によらず、印の番号と印の数だけで決まる
export function nobiTiming(n) {
  const moveBase = clamp(2000 / n, 240, 650);
  const holdBase = clamp(3000 / n, 300, 1100);
  const r = (j) => (n > 1 ? j / (n - 1) : 0);
  return {
    prep: 300 + 3 * 330,
    move: (j) => (j === 0 ? 1100 : moveBase * (1 + 0.5 * r(j))),
    hold: (j) => (j === 0 ? Math.max(1300, holdBase) : holdBase * (1 + 0.3 * r(j))),
    settle: 420,
  };
}
export const NOBI_VARIANTS = ['plain', 'slip', 'choi', 'ladder'];

// 柱と イズと はしごの置き場。labels は選択肢（いちばん長い文字で、柱に書く所の幅を決める）
export function pillarLayout(labels, W, H) {
  const n = labels.length;
  const k = clamp(H / 520, 0.6, 1);
  const floorY = H - 14 * k;
  const longest = Math.max(1, ...labels.map((l) => charCount(l)));
  const textW = clamp(longest * 15 + 10, 112, W * 0.42);
  const textX = 12;
  const izuX = textX + textW + 8 + 50 * k; // 手と 頭が 文字に かからない
  const ladderX = izuX + 60 * k; // はしごの左の柱
  const ladderW = 34 * k;
  const baseTop = floorY - 54 * k; // おしりの上（ここから上が のびる胴）
  const restReach = floorY - 152 * k; // のびる前の 手の先
  const lowMark = restReach - 24 * k;
  const topMark = 24;
  const step = n > 1 ? (lowMark - topMark) / (n - 1) : 0;
  const marks = Array.from({ length: n }, (_, i) => lowMark - step * i);
  const size = Math.min(...labels.map((l) => clamp(Math.min(20, (step || 40) * 0.74, (textW - 8) / Math.max(charCount(l), 1)), 0, 20)));
  return { n, k, floorY, textX, textW, izuX, ladderX, ladderW, baseTop, restReach, marks, step, size, pillarR: izuX + 30 * k };
}

export function createNobi({ view, stage, result, play, getStages, getWeights, getCat }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let reach = 0; // いまの イズの 手の先の高さ（画面の y 座標）
  let azY = 0; // アズの いる高さ（はしごの上の、すわっている所）
  let cat = null;

  function render() {
    const stages = getStages();
    cat = getCat();
    const d = cat;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const G = pillarLayout(stages, W, H);
    const { n, k, floorY, textX, textW, izuX, ladderX, ladderW, marks, pillarR, baseTop } = G;
    geo = { ...G, W, H };
    const L = d.line;
    const clipId = `torso-${Math.random().toString(36).slice(2, 8)}`;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // えんがわの ゆか板
    s += `<rect x="0" y="${f(floorY)}" width="${W}" height="${f(H - floorY)}" fill="#e9c58f"/>`
      + `<path d="M0,${f(floorY)} H${W}" stroke="#b98a52" stroke-width="2.4"/>`
      + `<path d="M${f(W * 0.3)},${f(floorY)} V${H} M${f(W * 0.68)},${f(floorY)} V${H}" stroke="#d4a86e" stroke-width="1.6"/>`;
    // 柱（太い木。木目と ふし）
    s += `<rect x="${textX - 6 + 5}" y="0" width="${f(pillarR - textX + 6)}" height="${f(floorY)}" fill="#a0703f" opacity="0.18"/>`
      + `<rect x="${textX - 6}" y="-8" width="${f(pillarR - textX + 6)}" height="${f(floorY + 8)}" rx="3" fill="#f2d3a2" stroke="#c99a62" stroke-width="2.4"/>`
      + `<rect x="${textX - 2}" y="-8" width="6" height="${f(floorY + 8)}" fill="#ffffff" opacity="0.35"/>`;
    for (let g = 0; g < 4; g++) {
      const gx = textX + 10 + ((pillarR - textX - 20) * (g + 0.5)) / 4;
      s += `<path d="M${f(gx)},0 C${f(gx - 5)},${f(floorY * 0.3)} ${f(gx + 6)},${f(floorY * 0.62)} ${f(gx - 2)},${f(floorY)}" stroke="#ddb37c" stroke-width="1.4" fill="none" opacity="0.8"/>`;
    }
    s += `<ellipse cx="${f(pillarR - 14)}" cy="${f(floorY * 0.62)}" rx="5" ry="8" fill="none" stroke="#d4a86e" stroke-width="1.6"/>`;
    // 上の はり（家の 鴨居。柱が 家の柱に見えるように）
    s += `<rect x="0" y="0" width="${f(Math.min(W, G.ladderX + G.ladderW + 20 * k))}" height="${f(10 * k)}" fill="#c99a62"/><path d="M0,${f(10 * k)} H${f(Math.min(W, G.ladderX + G.ladderW + 20 * k))}" stroke="#9b6b3a" stroke-width="2"/>`;
    // 印と、えんぴつで書いた選択肢（柱に じかに書く）
    marks.forEach((y, i) => {
      const th = Math.max(16, Math.min(30, G.step - 2 || 30));
      s += `<path d="M${f(textX + textW + 2)},${f(y)} H${f(pillarR - 4)}" stroke="${PENCIL}" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>`
        + `<g class="tag" data-i="${i}">`
        + `<rect class="tag-bg" x="${f(textX - 2)}" y="${f(y - th / 2)}" width="${f(textW + 4)}" height="${f(th)}" rx="${f(Math.min(8, th / 2))}" fill="#fff1c4" fill-opacity="0"/>`
        + `<path d="M${f(textX)},${f(y + G.size * 0.62)} H${f(textX + textW)}" stroke="${PENCIL}" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.35"/>`
        + `<text class="cell-label" x="${f(textX + textW / 2)}" y="${f(y)}" font-size="${f(G.size)}" fill="${PENCIL}" text-anchor="middle" dominant-baseline="central">${escapeXml(stages[i])}</text>`
        + `</g>`
        + `<path class="cut" data-i="${i}" d="M${f(textX + textW + 2)},${f(y)} H${f(pillarR - 4)}" stroke="${C.momiji}" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="200" stroke-dashoffset="200"/>`;
    });
    // 風鈴（右上。ゆらゆら）
    const fx = W - 22;
    s += `<g transform="translate(${f(fx)} 0)"><g class="nb-furin"><path d="M0,0 V${f(26 * k)}" stroke="#9b5f3a" stroke-width="1.4"/>`
      + `<path d="M${f(-11 * k)},${f(44 * k)} Q${f(-11 * k)},${f(24 * k)} 0,${f(24 * k)} Q${f(11 * k)},${f(24 * k)} ${f(11 * k)},${f(44 * k)} Z" fill="#e6f3f7" fill-opacity="0.85" stroke="#9fc8cf" stroke-width="1.6"/>`
      + `<path d="M${f(-8 * k)},${f(36 * k)} q4,-4 8,0 q4,4 8,0" stroke="#e8664a" stroke-width="1.6" fill="none"/>`
      + `<path d="M0,${f(44 * k)} V${f(52 * k)}" stroke="#9b5f3a" stroke-width="1"/><rect x="${f(-5 * k)}" y="${f(52 * k)}" width="${f(10 * k)}" height="${f(22 * k)}" rx="2" fill="#fde3a6" stroke="#d9b04d" stroke-width="1"/></g></g>`;
    // はしご（アズが のぼる）
    const lt = marks[marks.length - 1] - 18 * k;
    s += `<path d="M${f(ladderX)},${f(floorY)} L${f(ladderX + 4 * k)},${f(lt)} M${f(ladderX + ladderW)},${f(floorY)} L${f(ladderX + ladderW - 4 * k)},${f(lt)}" stroke="#b98a52" stroke-width="${f(6 * k)}" stroke-linecap="round"/>`
      + `<path d="M${f(ladderX)},${f(floorY)} L${f(ladderX + 4 * k)},${f(lt)} M${f(ladderX + ladderW)},${f(floorY)} L${f(ladderX + ladderW - 4 * k)},${f(lt)}" stroke="#f1d3a6" stroke-width="${f(3 * k)}" stroke-linecap="round"/>`;
    for (let y = floorY - 18 * k; y > lt + 4; y -= 22 * k) s += `<path d="M${f(ladderX + 2)},${f(y)} H${f(ladderX + ladderW - 2)}" stroke="#c99a62" stroke-width="${f(3.4 * k)}" stroke-linecap="round"/>`;
    // イズ（おすわりして ばんざい：しっぽ → うで → 胴 → おしり → 頭 → 手）
    const cx = izuX;
    s += `<g class="cat">`
      + `<ellipse cx="${f(cx)}" cy="${f(floorY - 2)}" rx="${f(50 * k)}" ry="${f(6 * k)}" fill="#a0703f" opacity="0.2"/>`
      + tail(d, `M${f(cx + 30 * k)},${f(floorY - 20 * k)} C${f(cx + 62 * k)},${f(floorY - 22 * k)} ${f(cx + 64 * k)},${f(floorY - 66 * k)} ${f(cx + 46 * k)},${f(floorY - 90 * k)}`, 11 * k)
      + `<rect class="arm" x="${f(cx - 45 * k)}" y="0" width="${f(18 * k)}" height="10" rx="${f(9 * k)}" fill="${d.base}" stroke="${L}" stroke-width="${f(3 * k)}"/>`
      + `<rect class="arm" x="${f(cx + 27 * k)}" y="0" width="${f(18 * k)}" height="10" rx="${f(9 * k)}" fill="${d.base}" stroke="${L}" stroke-width="${f(3 * k)}"/>`
      + `<defs><clipPath id="${clipId}"><rect class="torso-clip" x="${f(cx - 30 * k)}" y="0" width="${f(60 * k)}" height="10" rx="${f(26 * k)}"/></clipPath></defs>`
      + `<g clip-path="url(#${clipId})"><rect x="${f(cx - 30 * k)}" y="0" width="${f(60 * k)}" height="${H}" fill="${d.base}"/>`
      + torsoPattern(d, { x0: cx - 30 * k, x1: cx + 30 * k, yBase: baseTop, h: H, k })
      + `<rect x="${f(cx - 14 * k)}" y="0" width="${f(28 * k)}" height="${H}" fill="${d.chest}"/></g>`
      + `<rect class="torso-line" x="${f(cx - 30 * k)}" y="0" width="${f(60 * k)}" height="10" rx="${f(26 * k)}" fill="none" stroke="${L}" stroke-width="${f(3 * k)}"/>`
      + `<ellipse cx="${f(cx)}" cy="${f(floorY - 34 * k)}" rx="${f(40 * k)}" ry="${f(30 * k)}" fill="${d.base}" stroke="${L}" stroke-width="${f(3 * k)}"/>`
      + `<ellipse cx="${f(cx)}" cy="${f(floorY - 30 * k)}" rx="${f(20 * k)}" ry="${f(20 * k)}" fill="${d.chest}"/>`
      + `<ellipse cx="${f(cx - 22 * k)}" cy="${f(floorY - 9 * k)}" rx="${f(17 * k)}" ry="${f(10 * k)}" fill="${d.paw}" stroke="${L}" stroke-width="${f(3 * k)}"/>`
      + `<ellipse cx="${f(cx + 22 * k)}" cy="${f(floorY - 9 * k)}" rx="${f(17 * k)}" ry="${f(10 * k)}" fill="${d.paw}" stroke="${L}" stroke-width="${f(3 * k)}"/>`
      + `<g class="head"><g class="head-in" transform="scale(${f(0.92 * k)})">${catFace(d, { look: { x: 0, y: -1 } })}</g></g>`
      + `<g class="pawL"><circle r="${f(13 * k)}" fill="${d.paw}" stroke="${L}" stroke-width="${f(3 * k)}"/>${pawPrint('#f7b4a6', 8 * k)}</g>`
      + `<g class="pawR"><circle r="${f(13 * k)}" fill="${d.paw}" stroke="${L}" stroke-width="${f(3 * k)}"/>${pawPrint('#f7b4a6', 8 * k)}</g>`
      + `</g>`;
    // アズ（はしごに すわって、えんぴつを持つ）
    s += `<g class="nb-az"><g transform="scale(${f(0.48 * k)})"><g class="nb-az-in">${catSitting(AZ, { look: { x: -1, y: -0.3 } })}</g></g>`
      + `<g class="nb-pencil"><g transform="rotate(-18)"><rect x="${f(-30 * k)}" y="${f(-3 * k)}" width="${f(26 * k)}" height="${f(6 * k)}" rx="1.5" fill="#f6d55e" stroke="#c9a23a" stroke-width="1"/>`
      + `<path d="M${f(-30 * k)},${f(-3 * k)} L${f(-38 * k)},0 L${f(-30 * k)},${f(3 * k)} Z" fill="#f3d9b0" stroke="#c9a23a" stroke-width="1"/><path d="M${f(-38 * k)},0 l${f(3 * k)},${f(-1.2 * k)} v${f(2.4 * k)} Z" fill="${PENCIL}"/>`
      + `<rect x="${f(-5 * k)}" y="${f(-3 * k)}" width="${f(5 * k)}" height="${f(6 * k)}" rx="1.5" fill="#f7b4a6"/></g>`
      + `<g transform="translate(${f(-2 * k)} ${f(2 * k)})">${catPaw(AZ, 7 * k)}</g></g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      cat: svg.querySelector('.cat'),
      arms: Array.from(svg.querySelectorAll('.arm')),
      pawL: svg.querySelector('.pawL'),
      pawR: svg.querySelector('.pawR'),
      torsoClip: svg.querySelector('.torso-clip'),
      torsoLine: svg.querySelector('.torso-line'),
      head: svg.querySelector('.head'),
      headIn: svg.querySelector('.head-in'),
      az: svg.querySelector('.nb-az'),
      azIn: svg.querySelector('.nb-az-in'),
      pencil: svg.querySelector('.nb-pencil'),
      tags: Array.from(svg.querySelectorAll('.tag')),
      cuts: Array.from(svg.querySelectorAll('.cut')),
    };
    svg.querySelector('.nb-furin').animate([{ transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(-7deg)' }], { duration: 2600, iterations: Infinity, easing: 'ease-in-out' });
    setReach(G.restReach);
    setAz(G.restReach);
    stage.dataset.count = String(n);
    stage.dataset.cat = d.id;
    stage.dataset.minLabel = G.size.toFixed(1);
  }

  // イズの 手の先を y にして、各部を描き直す（のびるのは 胴と うで）。shake は ふんばりの小さな揺れ。
  // choi は 右手だけ さらに 上へ のばす分（ちょいちょい）
  function setReach(y, shake = 0, choi = 0) {
    reach = y;
    const { k, izuX: cx, baseTop } = geo;
    const pawY = y + 13 * k;
    const headY = y + 72 * k;
    const torsoTop = headY + 20 * k;
    const torsoH = Math.max(10, baseTop - torsoTop + 16 * k);
    refs.torsoClip.setAttribute('y', f(torsoTop));
    refs.torsoClip.setAttribute('height', f(torsoH));
    refs.torsoLine.setAttribute('y', f(torsoTop));
    refs.torsoLine.setAttribute('height', f(torsoH));
    const shoulder = headY + 24 * k;
    const pr = pawY - choi;
    refs.arms.forEach((a, i) => {
      const top = i ? pr - shake : pawY + shake;
      a.setAttribute('y', f(top));
      a.setAttribute('height', f(Math.max(10, shoulder - top)));
    });
    refs.head.setAttribute('transform', `translate(${f(cx + shake * 0.3)} ${f(headY)})`);
    refs.pawL.setAttribute('transform', `translate(${f(cx - 36 * k)} ${f(pawY + shake)})`);
    refs.pawR.setAttribute('transform', `translate(${f(cx + 36 * k)} ${f(pr - shake)}) rotate(${f(choi ? Math.sin(choi / (6 * k)) * 14 : 0)})`);
  }

  // アズの高さ（はしごの上）。えんぴつは イズの 手の先の高さを さす
  function setAz(y, lean = 0) {
    azY = y;
    const { k, ladderX, ladderW, izuX } = geo;
    const ax = ladderX + ladderW / 2 + 4 * k;
    refs.az.setAttribute('transform', `translate(${f(ax - lean)} ${f(y + 18 * k)})`);
    refs.pencil.setAttribute('transform', `translate(${f(-22 * k - lean * 0.2)} ${f(-30 * k)})`);
    return { x: ax, tip: { x: ax - 18 * k - 36 * k, y: y + 30 * k - 6 * k }, izuX };
  }

  function setMood(mood) {
    refs.headIn.innerHTML = catFace(cat, mood === 'up' ? { look: { x: 0, y: -1 } } : { mood });
  }

  function flashTag(i, final) {
    const bg = refs.tags[i].querySelector('.tag-bg');
    bg.setAttribute('fill-opacity', final ? '0.95' : '0.6');
    if (final) { bg.setAttribute('stroke', C.momiji); bg.setAttribute('stroke-width', '2'); }
    refs.tags[i].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' });
  }

  async function moveTo(y, dur, fn) {
    const from = reach;
    const a0 = azY;
    await frames(dur, (t) => {
      const e = fn(t);
      setReach(from + (y - from) * e);
      // アズは すこし おくれて のぼる
      setAz(a0 + (y - a0) * fn(Math.max(0, t * 1.15 - 0.15)));
    });
    setAz(y);
  }

  // ぷるぷる ふんばる。どきどきの音を 520 ミリ秒ごとに鳴らす
  async function hold(y, dur, j, extra = null) {
    const { k, n } = geo;
    let beats = 0;
    let glow = null;
    if (j + 1 < n) {
      glow = refs.tags[j + 1].querySelector('.tag-bg');
      glow.setAttribute('fill-opacity', '0.45');
      glow.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 640, iterations: Math.ceil(dur / 640) });
    }
    await frames(dur, (t) => {
      const ms = t * dur;
      if (ms >= beats * 520) { audio.heart(); beats++; }
      const sh = Math.sin((ms / 1000) * Math.PI * 2 * 11) * 1.6 * k;
      // ちょいちょい：右手だけ 上の印へ 2回 のばす
      setReach(y, sh, extra === 'choi' ? Math.abs(Math.sin(Math.PI * 2 * t)) * (geo.step + 18 * k) : 0);
      if (extra === 'ladder') setAz(y, Math.sin(t * Math.PI * 6) * 4 * k * (1 - t));
    });
    if (glow) glow.setAttribute('fill-opacity', '0');
    if (j > 0 || glow) refs.tags[j].querySelector('.tag-bg').setAttribute('fill-opacity', '0');
    setReach(y);
    setAz(y);
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「のびる」を おしてね');
    play.textContent = 'のびる';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    if (geo && reach !== geo.restReach) {
      // 前の結果から、もとの高さへ戻る
      showHint(result, 'よいしょ…');
      await moveTo(geo.restReach, 450, ease.inOutSine);
    }
    render();
    const { n, marks, restReach, k } = geo;
    const T = nobiTiming(n);
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    // 1. じゅんび：かがんで、おしりを ふりふり
    showHint(result, 'はかるよー');
    await moveTo(restReach + 14 * k, 300, ease.inOutSine);
    for (let w = 0; w < 3; w++) {
      audio.wiggle(w);
      await frames(330, (t) => refs.cat.setAttribute('transform', `translate(${f(Math.sin(t * Math.PI * 2) * 5 * k)} 0)`));
    }
    refs.cat.removeAttribute('transform');
    // 2. 印ごとに、のびて ふんばる
    const r = Math.random();
    const variant = r < 0.25 && decided >= 1 ? 'slip' : r < 0.5 ? 'choi' : r < 0.75 ? 'ladder' : 'plain';
    stage.dataset.variant = variant;
    const slipAt = variant === 'slip' ? Math.floor(Math.random() * decided) : -1;
    const oddAt = Math.floor(Math.random() * (decided + 1)); // ちょいちょい・はしごの出る印
    for (let j = 0; j <= decided; j++) {
      setMood('up');
      showHint(result, j === 0 ? 'ぐーん…' : 'ぐぐっ…');
      const dur = T.move(j);
      audio.stretch(dur / 1000);
      await moveTo(marks[j], dur, ease.inOutSine);
      audio.mark(j);
      flashTag(j, false);
      setMood('strain');
      showHint(result, j === n - 1 ? 'いちばん うえ…！' : 'まだ のびる…？');
      const extra = j === oddAt && (variant === 'choi' || variant === 'ladder') ? variant : null;
      if (extra === 'choi') setTimeout(() => showHint(result, 'かたては なしだよ'), T.hold(j) * 0.4);
      if (extra === 'ladder') setTimeout(() => showHint(result, 'おっとっと…'), T.hold(j) * 0.2);
      await hold(marks[j], T.hold(j), j, extra);
      if (j === slipAt) {
        showHint(result, 'ずるっ…！');
        audio.hop(0);
        await moveTo(marks[j] + 22 * k, 240, ease.outCubic);
        showHint(result, 'まだまだ！');
        setMood('strain');
        await moveTo(marks[j], 360, ease.inOutSine);
      }
    }
    // 3. ぴたっ。アズが えんぴつで 印を付ける
    const top = marks[decided];
    showHint(result, 'しゅっ');
    audio.slide(T.settle / 1000);
    const cut = refs.cuts[decided];
    await frames(T.settle, (t) => {
      setReach(top - Math.sin(Math.PI * t) * 3 * k);
      setAz(top, Math.sin(Math.PI * t) * 10 * k);
      cut.setAttribute('stroke-dashoffset', f(200 * (1 - ease.outCubic(t))));
    });
    cut.setAttribute('stroke-dashoffset', '0');
    setReach(top);
    setAz(top);
    flashTag(decided, true);
    // イズの 手の先に一番近い印を、届いた段階とする
    let landed = 0;
    marks.forEach((m, i) => { if (Math.abs(m - reach) < Math.abs(marks[landed] - reach)) landed = i; });
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    const level = n === 1 ? 3 : 1 + Math.round((2 * landed) / (n - 1));
    stage.dataset.level = String(level);
    setMood('happy');
    refs.azIn.innerHTML = catSitting(AZ, { mood: 'happy', look: { x: -1, y: -0.3 } });
    audio.fanfare(level);
    const stages = getStages();
    showResult(result, landed === n - 1 ? TOP_MESSAGE : MESSAGES[level], stages[landed]);
    const rect = stage.getBoundingClientRect();
    celebrate(level, rect.left + geo.izuX, rect.top + reach + 10);
    // うれしくて跳ねる（段階が上がるほど多く跳ねる）
    for (let h = 0; h < level; h++) {
      await frames(300, (t) => refs.cat.setAttribute('transform', `translate(0 ${f(-Math.sin(Math.PI * t) * 7 * k)})`));
    }
    refs.cat.removeAttribute('transform');
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
