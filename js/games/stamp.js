// にくきゅうスタンプ（見せ方の部品：並んだ格子）。
// 猫の手がカードのます目をぴょんぴょん渡り、最後に1つのます目へ肉球を「ぽん」と押す。
import { C, ginkgoLeaf, mapleLeaf } from '../art.js';
import { catFace, catPaw, pawPrint } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

export function createStamp({ view, stage, result, play, getChoices, getWeights, getCat }) {
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
    s += `<rect x="${cardX + 3}" y="${cardY + 6}" width="${cardW}" height="${cardH}" rx="22" fill="#d9b07a" opacity="0.35"/>`;
    s += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="22" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="3"/>`;
    s += `<rect x="${cardX + 7}" y="${cardY + 7}" width="${cardW - 14}" height="${cardH - 14}" rx="17" fill="none" stroke="${C.kaki}" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round" opacity="0.8"/>`;
    s += `<text x="${W / 2}" y="${cardY + 30}" font-size="19" font-weight="700" fill="${C.chestnutDeep}" text-anchor="middle" letter-spacing="3">あきの スタンプカード</text>`;
    s += `<g transform="translate(${cardX + 28} ${cardY + 24}) rotate(-24)">${ginkgoLeaf(C.icho, C.ichoDeep, 13)}</g>`;
    s += `<g transform="translate(${cardX + cardW - 28} ${cardY + 24}) rotate(18)">${mapleLeaf(C.momiji, C.momijiDeep, 12)}</g>`;
    // ます目
    cells.forEach((cell, i) => {
      const lines = splitLabel(choices[i]);
      const longest = Math.max(...lines.map(charCount));
      const size = Math.max(13, Math.min(24, (cell.w - 16) / Math.max(longest, 1), (cell.h - 14) / (lines.length * 1.3)));
      const ringR = Math.min(cell.w, cell.h) * 0.4;
      s += `<g class="cell" data-i="${i}">`
        + `<rect class="cell-bg" x="${cell.x}" y="${cell.y}" width="${cell.w}" height="${cell.h}" rx="14" fill="#ffffff" stroke="${C.line}" stroke-opacity="0.25" stroke-width="2"/>`
        + `<circle cx="${cell.cx}" cy="${cell.cy}" r="${ringR}" fill="none" stroke="${C.kaki}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 5"/>`
        + `<g class="ink" transform="translate(${cell.cx} ${cell.cy})" opacity="0"></g>`;
      const lh = size * 1.22;
      const y0 = cell.cy - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, k) => {
        s += `<text class="cell-label" x="${cell.cx}" y="${y0 + k * lh}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${escapeXml(ln)}</text>`;
      });
      s += `</g>`;
    });
    s += `</g>`;
    // カードの縁に かけた、のぞく猫の手
    s += `<g transform="translate(${peekAt.x - 30} ${cardY + 1})">${catPaw(cat, 10)}</g>`;
    // 猫の手（影と手）
    const pawSize = Math.min(cellW, cellH) * 0.3;
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
      g.querySelector('.cell-bg').setAttribute('fill', k === i ? '#fff1c4' : '#ffffff');
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
    const path = [];
    let prev = -1;
    for (let k = 0; k < hops - 1; k++) {
      let c;
      do { c = Math.floor(Math.random() * n); } while (c === prev || (k === hops - 2 && c === decided));
      path.push(c);
      prev = c;
    }
    path.push(decided);
    for (let k = 0; k < path.length; k++) {
      const p = k / (path.length - 1);
      const dur = 120 + 420 * Math.pow(p, 2.2);
      await hopTo(path[k], dur, k);
    }
    // ぐっと持ち上げて、ぽん
    const c = geo.cells[decided];
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
    audio.fanfare(2);
    const choices = getChoices();
    showResult(result, 'きまったよ', choices[landed]);
    const pc = centerOf(result);
    celebrate(2, pc.x, pc.y - 30);
    await wait(500);
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
