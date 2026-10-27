// にくきゅうスタンプ（見せ方の部品：並んだ格子）。
// 猫の手がカードのます目をぴょんぴょん渡り、最後に1つのます目へ肉球を「ぽん」と押す。
// v17 の後（テーマパーク）：カードは ピンクの あつみの ある スタンプラリーの 台紙。ます目は 選択肢ごとの パステル色（くぼみ）。
// スタンプ台は ふたの あいた 缶。動きの ちがい（3B：4つ）：ふつう・みせかけ（おす ふりを して もう いちど）・
// インク（とちゅうで インクが たりなくなって 台へ もどる）・まよい（さいごの 2つの ます目の上を いったり きたり）。
import { C, ginkgoLeaf, mapleLeaf, fallingPiece } from '../art.js';
import { look, SEASON_KANA } from '../look.js';
import { catFace, catPaw, pawPrint } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';
import { TINTS } from './common.js';

// 行事の時のカードの題名
const EVENT_TITLE = {
  oshogatsu: 'おしょうがつの スタンプカード', setsubun: 'せつぶんの スタンプカード', valentine: 'バレンタインの スタンプカード',
  nekonohi: 'ねこの ひの スタンプカード', hinamatsuri: 'ひなまつりの スタンプカード', hanami: 'おはなみの スタンプカード',
  kodomonohi: 'こどもの ひの スタンプカード', tanabata: 'たなばたの スタンプカード', natsumatsuri: 'なつまつりの スタンプカード',
  sekainekonohi: 'せかい ねこの ひの スタンプカード', otsukimi: 'おつきみの スタンプカード', manekinekonohi: 'まねきねこの スタンプカード',
  halloween: 'ハロウィンの スタンプカード', christmas: 'クリスマスの スタンプカード', omisoka: 'おおみそかの スタンプカード',
};
export const cardTitle = () => EVENT_TITLE[look.event] || `${SEASON_KANA[look.season] || 'あき'}の スタンプカード`;

export function createStamp({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let pawPos = null;
  let cat = null;

  function layoutFor(n) {
    const cols = n <= 6 ? 2 : 3;
    return { cols, rows: Math.ceil(n / cols) };
  }

  // 長い文字は2行に分ける。数字の途中と、小さい「ゃゅょっ」や「ー」の前では分けない
  function splitLabel(text) {
    const chars = Array.from(text);
    if (chars.length <= 5) return [text];
    const digit = (ch) => /[0-9０-９]/.test(ch);
    const small = (ch) => /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮー、。]/.test(ch);
    let best = Math.ceil(chars.length / 2);
    let bestScore = Infinity;
    for (let p = 1; p < chars.length; p++) {
      let score = Math.abs(p - chars.length / 2);
      if (digit(chars[p - 1]) && digit(chars[p])) score += 10;
      if (small(chars[p])) score += 5;
      if (score < bestScore) { bestScore = score; best = p; }
    }
    return [chars.slice(0, best).join(""), chars.slice(best).join("")];
  }

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const { cols, rows } = layoutFor(n);
    const cardX = 4;
    const cardW = W - 8;
    const head = 40;
    const pad = 14;
    const gap = 10;
    const peek = 46; // カードの上から猫がのぞく場所
    const maxCardH = H - 10 - peek;
    const cellW = (cardW - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = Math.min(cellW * (cols === 2 ? 0.62 : 0.92), (maxCardH - head - pad * 2 - gap * (rows - 1)) / rows);
    const cardH = head + pad * 2 + cellH * rows + gap * (rows - 1);
    const cardY = peek + (H - peek - cardH) / 2;
    const cells = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const inRow = r === rows - 1 ? n - r * cols : cols; // 最後の行は真ん中に寄せる
      const offset = ((cols - inRow) * (cellW + gap)) / 2;
      const x = cardX + pad + offset + c * (cellW + gap);
      const y = cardY + head + pad + r * (cellH + gap);
      cells.push({ x, y, w: cellW, h: cellH, cx: x + cellW / 2, cy: y + cellH / 2 });
    }
    const peekAt = { x: cardX + cardW - 76, y: cardY - 12, s: 0.58 };
    geo = { n, cells, W, H, cardX, cardY, cardW, cardH, cellW, cellH, peekAt };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // カードの上から のぞく猫（カードの後ろに描く）
    s += `<g class="peek" transform="translate(${peekAt.x} ${peekAt.y}) scale(${peekAt.s})"><g class="peek-face">${catFace(cat)}</g></g>`;
    // カード
    s += `<g class="card">`;
    s += `<rect x="${cardX + 4}" y="${cardY + 9}" width="${cardW}" height="${cardH}" rx="22" fill="#a0703f" opacity="0.22"/>`;
    s += `<rect x="${cardX}" y="${cardY + 5}" width="${cardW}" height="${cardH}" rx="22" fill="#f2b8c8" stroke="#e391ad" stroke-width="2"/>`;
    s += `<rect x="${cardX}" y="${cardY + 2.5}" width="${cardW}" height="${cardH}" rx="22" fill="#f8cfdb" stroke="#e391ad" stroke-width="1.4"/>`;
    s += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="22" fill="#fde8ee" stroke="#e391ad" stroke-width="3"/>`;
    for (let q = 1; q < 6; q++) s += `<path d="M${cardX + 14},${(cardY + (cardH * q) / 6).toFixed(1)} h${cardW - 28}" stroke="#f8d6e0" stroke-width="1"/>`;
    s += `<rect x="${cardX + 7}" y="${cardY + 7}" width="${cardW - 14}" height="${cardH - 14}" rx="17" fill="none" stroke="${C.kaki}" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round" opacity="0.8"/>`;
    // 題名は いまの見た目に合わせる。行事の時は行事の名前、それ以外は季節の名前（v11）
    const title = cardTitle();
    const room = cardW - 112; // 左右の角の飾りを よけた幅
    const tsize = Math.min(19, room / (charCount(title) * 1.12));
    s += `<text class="card-title" x="${W / 2}" y="${cardY + 30}" font-size="${tsize.toFixed(1)}" font-weight="700" fill="${C.chestnutDeep}" text-anchor="middle" letter-spacing="${tsize >= 17 ? 3 : 1}">${title}</text>`;
    // カードの角の飾り（季節・行事の物。秋は いちょうと もみじ）
    const cornerL = look.season === 'aki' && !look.event ? ginkgoLeaf(C.icho, C.ichoDeep, 13) : fallingPiece(0, 15, look);
    const cornerR = look.season === 'aki' && !look.event ? mapleLeaf(C.momiji, C.momijiDeep, 12) : fallingPiece(1, 14, look);
    s += `<g transform="translate(${cardX + 28} ${cardY + 24}) rotate(-24)">${cornerL}</g>`;
    s += `<g transform="translate(${cardX + cardW - 28} ${cardY + 24}) rotate(18)">${cornerR}</g>`;
    // ます目
    cells.forEach((cell, i) => {
      const lines = splitLabel(choices[i]);
      const longest = Math.max(...lines.map(charCount));
      const size = Math.max(13, Math.min(24, (cell.w - 16) / Math.max(longest, 1), (cell.h - 14) / (lines.length * 1.3)));
      const ringR = Math.min(cell.w, cell.h) * 0.4;
      s += `<g class="cell" data-i="${i}">`
        + `<rect x="${cell.x}" y="${cell.y - 1.5}" width="${cell.w}" height="${cell.h}" rx="14" fill="${TINTS[i % TINTS.length][1]}" opacity="0.5"/>`
        + `<rect class="cell-bg" x="${cell.x}" y="${cell.y}" width="${cell.w}" height="${cell.h}" rx="14" fill="${TINTS[i % TINTS.length][0]}" stroke="${TINTS[i % TINTS.length][1]}" stroke-width="2"/>`
        + `<circle cx="${cell.cx}" cy="${cell.cy}" r="${ringR}" fill="none" stroke="${C.kaki}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 5"/>`
        + `<g class="ink" transform="translate(${cell.cx} ${cell.cy})" opacity="0"></g>`;
      const lh = size * 1.22;
      const y0 = cell.cy - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, k) => {
        s += `<text class="cell-label" x="${cell.cx}" y="${y0 + k * lh}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central" stroke="${TINTS[i % TINTS.length][0]}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${escapeXml(ln)}</text>`;
      });
      s += `</g>`;
    });
    s += `</g>`;
    // カードの縁に かけた、のぞく猫の手
    s += `<g transform="translate(${peekAt.x - 30} ${cardY + 1})">${catPaw(cat, 10)}</g>`;
    // 猫の手（影と手）
    const pawSize = Math.min(cellW, cellH) * 0.3;
    // スタンプ台（v12。カードの下に よゆうが ある時だけ。手は ここで まつ）
    if (H - (cardY + cardH) > pawSize * 1.8) {
      const px = cardX + cardW * 0.8;
      const py = cardY + cardH + pawSize * 0.85 + pawSize * 0.55;
      const q = (v) => (v * pawSize).toFixed(1);
      s += `<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)})">`
        + `<rect x="${q(-1.5)}" y="${q(-0.95)}" width="${q(3)}" height="${q(0.6)}" rx="${q(0.2)}" fill="#e6a39a" stroke="#b9675c" stroke-width="2" transform="rotate(-8 ${q(-1.5)} ${q(-0.4)})"/>`
        + `<rect x="${q(-1.5)}" y="${q(-0.35)}" width="${q(3)}" height="${q(0.95)}" rx="${q(0.22)}" fill="#c4675b"/>`
        + `<rect x="${q(-1.5)}" y="${q(-0.5)}" width="${q(3)}" height="${q(0.85)}" rx="${q(0.22)}" fill="#e6a39a" stroke="#b9675c" stroke-width="2"/>`
        + `<rect x="${q(-1.25)}" y="${q(-0.4)}" width="${q(2.5)}" height="${q(0.5)}" rx="${q(0.16)}" fill="${C.momiji}"/>`
        + `<path d="M${q(-1.1)},${q(-0.32)} h${q(0.9)}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`
        + `</g>`;
    }
    s += `<ellipse class="paw-shadow" cx="0" cy="0" rx="${pawSize * 0.95}" ry="${pawSize * 0.32}" fill="#a0703f" opacity="0.18"/>`;
    s += `<g class="paw"><g class="paw-in">${catPaw(cat, pawSize)}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      svg,
      card: svg.querySelector('.card'),
      paw: svg.querySelector('.paw'),
      pawIn: svg.querySelector('.paw-in'),
      shadow: svg.querySelector('.paw-shadow'),
      cells: Array.from(svg.querySelectorAll('.cell')),
      peekFace: svg.querySelector('.peek-face'),
      pawSize,
    };
    pawPos = rest();
    placePaw(pawPos.x, pawPos.y, 0, 1);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
  }

  // のぞく猫の顔。look は手のほうを向く
  function setFace(mood, at = null) {
    let look = null;
    if (at) {
      const { peekAt } = geo;
      look = { x: (at.x - peekAt.x) / (geo.cardW * 0.45), y: (at.y - peekAt.y) / (geo.cardH * 0.5) };
    }
    refs.peekFace.innerHTML = catFace(cat, { mood, look });
  }

  function rest() {
    // ます目の文字にかからない所で待つ。カードの下に余白があればカードの下、無ければカードの右下の角
    const p = refs.pawSize;
    if (geo.H - (geo.cardY + geo.cardH) > p * 1.8) return { x: geo.cardX + geo.cardW * 0.8, y: geo.cardY + geo.cardH + p * 0.85 };
    return { x: geo.cardX + geo.cardW - p * 1.05, y: geo.cardY + geo.cardH - 4 };
  }

  // 手の位置。lift は持ち上げた高さ、scale は大きさ
  function placePaw(x, y, lift, scale) {
    refs.paw.setAttribute('transform', `translate(${x.toFixed(2)} ${(y - lift).toFixed(2)}) scale(${scale.toFixed(3)})`);
    refs.shadow.setAttribute('cx', x.toFixed(2));
    refs.shadow.setAttribute('cy', (y + refs.pawSize * 0.85).toFixed(2));
    refs.shadow.setAttribute('opacity', (0.2 - Math.min(lift, 40) * 0.003).toFixed(3));
  }

  function cellAt(x, y) {
    return geo.cells.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
  }

  function lightCell(i) {
    refs.cells.forEach((g, k) => {
      g.querySelector('.cell-bg').setAttribute('fill', k === i ? '#fff1c4' : TINTS[k % TINTS.length][0]);
    });
  }

  async function hopTo(i, dur, idx) {
    const c = geo.cells[i];
    const from = { ...pawPos };
    const to = { x: c.cx, y: c.cy - c.h * 0.08 };
    const h = Math.min(36, 14 + dur * 0.05);
    setFace('normal', to);
    audio.hop(idx);
    await frames(dur * 0.75, (t) => {
      const e = ease.inOutSine(t);
      placePaw(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, Math.sin(Math.PI * t) * h, 1);
    });
    pawPos = to;
    lightCell(i);
    refs.cells[i].animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0px)' }], { duration: 160 });
    await wait(dur * 0.25);
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「スタンプ」を おしてね');
    play.textContent = 'スタンプ';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    showHint(result, 'どこに おそうかな…');
    const { n } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;

    // 渡る道すじ：同じます目へ続けて戻らない。最後が決めたます目
    const hops = 16 + Math.min(n, 8);
    // 選択肢が2つの時は、2つのます目を こうごに渡って、決めたます目で終わる
    // （3つ以上の時と同じ決まり「続けて同じます目に戻らない・最後の1つ前は決めたます目でない」を2つで満たすには、こうごしか無い。
    //  v12 までは2つの時に この決まりを満たす目を さがし続けて、画面が止まった）
    const path = [];
    if (n === 2) {
      for (let k = 0; k < hops; k++) path.push((decided + hops - 1 - k) % 2);
    } else {
      let prev = -1;
      for (let k = 0; k < hops - 1; k++) {
        let c;
        do { c = Math.floor(Math.random() * n); } while (c === prev || (k === hops - 2 && c === decided));
        path.push(c);
        prev = c;
      }
      path.push(decided);
    }
    // スタンプ台で、肉球に いんくを つける（ぽんぽん）
    const home = { ...pawPos };
    for (let k = 0; k < 2; k++) {
      await frames(150, (t) => placePaw(home.x, home.y, 14 * Math.sin(Math.PI * t), 1));
      audio.tap();
    }
    const vr = Math.random();
    const variant = vr < 0.25 ? 'feint' : vr < 0.5 ? 'ink' : vr < 0.75 && n > 2 ? 'mayoi' : 'plain';
    stage.dataset.variant = variant;
    const inkAt = Math.floor(path.length * 0.4);
    for (let k = 0; k < path.length; k++) {
      const p = k / (path.length - 1);
      const dur = 120 + 420 * Math.pow(p, 2.2);
      if (variant === 'ink' && k === inkAt) {
        // インク：台へ もどって ぽんぽん、また つづける
        showHint(result, 'インクが たりない…');
        const from = { ...pawPos };
        await frames(320, (t) => { const e = ease.inOutSine(t); placePaw(from.x + (home.x - from.x) * e, from.y + (home.y - from.y) * e, Math.sin(Math.PI * t) * 30, 1); });
        pawPos = { ...home };
        for (let q = 0; q < 2; q++) { await frames(140, (t) => placePaw(home.x, home.y, 14 * Math.sin(Math.PI * t), 1)); audio.tap(); }
        showHint(result, 'どこに おそうかな…');
      }
      if (variant === 'mayoi' && k === path.length - 1) {
        // まよい：さいごの 2つの ます目の上を いったり きたり
        showHint(result, 'どっちかな…');
        const other = path[k - 1];
        await hopTo(decided, 380, k);
        await hopTo(other, 380, k + 1);
      }
      await hopTo(path[k], dur, k);
    }
    // ぐっと持ち上げて、ぽん
    const c = geo.cells[decided];
    // みせかけ：おす ふりを して、もう いちど もちあげる
    if (variant === 'feint') {
      showHint(result, 'ぽ… と みせかけて');
      await frames(260, (t) => placePaw(pawPos.x, pawPos.y, 26 * Math.sin(Math.PI * t), 1 + 0.1 * Math.sin(Math.PI * t)));
      audio.heart();
      showHint(result, 'ここで いいかな…');
      await wait(260);
    }
    await frames(320, (t) => placePaw(pawPos.x, pawPos.y, 26 * ease.outCubic(t), 1 + 0.18 * ease.outCubic(t)));
    await wait(160);
    await frames(110, (t) => placePaw(pawPos.x, pawPos.y, 26 * (1 - t * t), 1.18 - 0.28 * t * t));
    audio.stamp();
    const landed = cellAt(pawPos.x, pawPos.y); // 手が実際に押したます目
    const ink = refs.cells[landed].querySelector('.ink');
    ink.innerHTML = pawPrint(C.momiji, Math.min(c.w, c.h) * 0.36);
    ink.setAttribute('opacity', '0.62');
    refs.cells[landed].querySelector('.cell-bg').setAttribute('stroke', C.momiji);
    refs.cells[landed].querySelector('.cell-bg').setAttribute('stroke-opacity', '0.9');
    refs.cells[landed].querySelector('.cell-bg').setAttribute('stroke-width', '4');
    refs.card.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(3px)' }, { transform: 'translateY(0)' }], { duration: 180 });
    await frames(140, (t) => placePaw(pawPos.x, pawPos.y, 0, 0.9 + 0.1 * t));
    await wait(120);
    // 手をよける
    const r = rest();
    const lifted = { ...pawPos };
    await frames(420, (t) => {
      const e = ease.outCubic(t);
      placePaw(lifted.x + (r.x - lifted.x) * e, lifted.y + (r.y - lifted.y) * e, Math.sin(Math.PI * t) * 30, 1);
    });
    pawPos = r;
    stage.dataset.landed = String(landed);
    setFace('happy');
    // お祝いの大きさ：お楽しみ袋では段階の並びの位置で変える（RS01-S15）。おやつでは真ん中の大きさ
    const level = getPurpose() === 'coin' ? levelOf(landed, geo.n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, 'きまったよ', choices[landed]);
    const pc = centerOf(result);
    celebrate(level, pc.x, pc.y - 30);
    await wait(500);
    play.textContent = 'もういちど';
    // 押している間に見た目が かわった時も、題名を いまの見た目に そろえる
    refs.svg.querySelector('.card-title').textContent = cardTitle();
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
