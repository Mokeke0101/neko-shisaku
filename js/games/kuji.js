// まねきねこ おみくじ（決め方：くじの番号。見せ方の部品：番号つきの一覧）。
// 招き猫が おみくじの箱を ふり、出てきた棒の番号の選択肢が結果になる。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 箱を「からから」と3回ふる。ふっている間、一覧の選択肢が順に うすく光る（どれになるか分からない）。
// 2. 箱をかたむけると、棒がゆっくりすべり出る。出きってから、棒の先に番号が「ぽん」と出る。
// 結果は先に乱数で決め（RS01-S14）、棒の番号をその結果にする。
// 一覧の欄はどれも同じ大きさ（出やすさは欄の大きさに表れない：RS01-S21）。
// v17 の後（テーマパーク）：一覧は おみくじの 引き出し だんす。わくは さんごいろの ぬりもの、引き出しは 選択肢ごとの パステル色（あつみ・金の かなぐ）。
// 選択肢は 引き出しの 前の板に じかに書く。決まると その引き出しが すっと 出てくる。
// 動きの ちがい（3B：4つ）：ふつう・ひっかかり（もう1回 ふると 出る）・2ほん（2本 出てきて 1本 もどす）・ぽーん（棒が とびだして くるっと まわる）。
import { C } from '../art.js';
import { catSitting, catPaw } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';
import { TINTS } from './common.js';

const BOX = '#f3d9b0';
const BOX_EDGE = '#c99a62';
const BAND = '#e8664a';

// 一覧の並べ方。5つまでは1列、6つからは2列（左の列から上から下へ番号を振る）
export function boardLayout(n) {
  const cols = n <= 5 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  return { cols, rows, cellOf: (i) => ({ col: Math.floor(i / rows), row: i % rows }) };
}

// 箱の帯の「みくじ」を、縦に1字ずつ並べる（縦書きの指定は端末で違いが出るため使わない）
function bandText(bw, bh) {
  const fs = Math.min(bw * 0.3, bh * 0.1, 15);
  return ['み', 'く', 'じ'].map((ch, k) => `<text x="0" y="${(-bh * 0.01 + (k - 1) * fs * 1.02).toFixed(1)}" font-size="${fs.toFixed(1)}" font-weight="700" fill="#fffaf0" text-anchor="middle" dominant-baseline="central">${ch}</text>`).join('');
}

export function createKuji({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let cat = null;

  function render() {
    const choices = getChoices();
    cat = getCat();
    const n = choices.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const { cols, rows, cellOf } = boardLayout(n);
    const pad = 12;
    const gap = 6;
    const minTop = Math.max(132, H * 0.34);
    const rowH = Math.max(28, Math.min(52, (H - minTop - pad * 2 - gap * (rows - 1) - 6) / rows));
    const boardH = rows * rowH + gap * (rows - 1) + pad * 2;
    const boardY = H - boardH - 4;
    const topH = boardY - 6;
    const boardX = 4;
    const boardW = W - 8;
    const colW = (boardW - pad * 2 - gap * (cols - 1)) / cols;
    const cells = choices.map((_, i) => {
      const { col, row } = cellOf(i);
      const x = boardX + pad + col * (colW + gap);
      const y = boardY + pad + row * (rowH + gap);
      return { x, y, w: colW, h: rowH };
    });
    // 招き猫と箱
    const sc = Math.max(0.55, Math.min(1.25, (topH - 8) / 168));
    const catAt = { x: W * 0.32, y: topH - 80 * sc };
    const bh = Math.min(topH * 0.7, 132 * sc + 20);
    const bw = bh * 0.42;
    const boxAt = { x: W * 0.66, y: topH - bh / 2 - 6 };
    const tagR = Math.max(16, Math.min(22, bw * 0.36));
    // 棒の長さ：かたむけた箱から出た棒の先の番号が、ゲームの場所の上へはみ出さない長さまで
    const room = (boxAt.y - tagR - 4) / Math.cos((24 * Math.PI) / 180) - bh / 2 + 6;
    const stickL = Math.max(bh * 0.3, Math.min(bh * 0.62, room));
    geo = { n, W, H, cells, rowH, catAt, sc, bh, bw, boxAt, stickL, tagR };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 地面のかげ
    s += `<ellipse cx="${(catAt.x + boxAt.x) / 2}" cy="${topH - 2}" rx="${W * 0.36}" ry="10" fill="#d9b07a" opacity="0.28"/>`;
    // 招き猫の 赤い ざぶとんと、小判の山（v12）
    s += `<rect x="${(catAt.x - 70 * sc).toFixed(1)}" y="${(topH - 16 * sc - 4).toFixed(1)}" width="${(140 * sc).toFixed(1)}" height="${(16 * sc).toFixed(1)}" rx="${(7 * sc).toFixed(1)}" fill="#e8664a" stroke="#b5452f" stroke-width="2"/>`;
    const kx = Math.max(24 * sc + 4, catAt.x - 92 * sc);
    for (let k = 0; k < 4; k++) {
      s += `<ellipse cx="${(kx + (k % 2) * 8 * sc).toFixed(1)}" cy="${(topH - 6 - k * 7 * sc).toFixed(1)}" rx="${(15 * sc).toFixed(1)}" ry="${(7 * sc).toFixed(1)}" fill="#f6d55e" stroke="#c9a032" stroke-width="1.6"/>`;
    }
    // 招き猫（三毛猫）。片方の手を上げて招く
    s += `<g transform="translate(${catAt.x} ${catAt.y}) scale(${sc.toFixed(3)})">`
      + `<g class="kuji-cat">${catSitting(cat)}</g>`
      + `<g class="beckon-in">`
      + `<path d="M-30,30 Q-50,14 -52,-22" stroke="${cat.line}" stroke-width="21" fill="none" stroke-linecap="round"/>`
      + `<path d="M-30,30 Q-50,14 -52,-22" stroke="${cat.paw}" stroke-width="15" fill="none" stroke-linecap="round"/>`
      + `<g transform="translate(-52 -28)">${catPaw(cat, 15)}</g></g>`
      + `</g>`;
    // 箱（棒は箱の後ろに描き、箱の口から上へすべり出る）
    const L = geo.stickL;
    s += `<g class="box" transform="translate(${boxAt.x} ${boxAt.y})">`
      + `<g class="stick" transform="translate(0 ${L})">`
      + `<rect x="-5" y="${-bh / 2 - L + 6}" width="10" height="${L}" rx="4" fill="#f6e3c3" stroke="${BOX_EDGE}" stroke-width="2"/>`
      + `<g class="tag" transform="translate(0 ${-bh / 2 - L + 6}) scale(0)">`
      + `<circle r="${tagR}" fill="${C.paper}" stroke="${BAND}" stroke-width="3"/>`
      + `<text class="tag-num" x="0" y="1" font-size="${(tagR * 1.15).toFixed(1)}" font-weight="700" fill="${C.ink}" text-anchor="middle" dominant-baseline="central"></text>`
      + `</g></g>`
      + `<g class="stick2" transform="translate(0 ${L})"><rect x="3" y="${-bh / 2 - L + 6}" width="10" height="${L}" rx="4" fill="#f1dbb6" stroke="${BOX_EDGE}" stroke-width="2" transform="rotate(8 8 ${-bh / 2 + 6})"/></g>`
      + `<rect x="${-bw / 2 + 4}" y="${-bh / 2 + 6}" width="${bw}" height="${bh}" rx="12" fill="#d9b07a" opacity="0.35"/>`
      + `<rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="12" fill="${BOX}" stroke="${BOX_EDGE}" stroke-width="3"/>`
      + `<path d="M${-bw / 2 + bw * 0.33},${-bh / 2 + 3} V${bh / 2 - 3} M${-bw / 2 + bw * 0.67},${-bh / 2 + 3} V${bh / 2 - 3}" stroke="${BOX_EDGE}" stroke-width="1.6" opacity="0.5"/>`
      + `<rect x="${-bw / 2 + 2}" y="${-bh * 0.18}" width="${bw - 4}" height="${bh * 0.34}" fill="${BAND}"/>`
      + bandText(bw, bh)
      + `<rect x="${-bw / 2 - 3}" y="${-bh / 2 - 4}" width="${bw + 6}" height="12" rx="5" fill="${C.woodDeep}" stroke="${BOX_EDGE}" stroke-width="2"/>`
      + `<rect x="${-bw / 2 - 3}" y="${bh / 2 - 8}" width="${bw + 6}" height="12" rx="5" fill="${C.woodDeep}" stroke="${BOX_EDGE}" stroke-width="2"/>`
      + `<ellipse cx="0" cy="${-bh / 2 + 2}" rx="${bw * 0.16}" ry="3.6" fill="${C.chestnut}"/>`
      + `</g>`;
    // 箱を持つ手
    s += `<g class="hold" transform="translate(${boxAt.x - bw / 2 - 2} ${boxAt.y + bh * 0.12})">${catPaw(cat, 13)}</g>`;
    // 一覧（木の札）
    s += `<rect x="${boardX + 3}" y="${boardY + 6}" width="${boardW}" height="${boardH}" rx="10" fill="#c97a6e" opacity="0.3"/>`;
    s += `<rect x="${boardX}" y="${boardY}" width="${boardW}" height="${boardH}" rx="10" fill="#f4a7a3" stroke="#c97a6e" stroke-width="3"/>`;
    s += `<rect x="${boardX + 3}" y="${boardY + 3}" width="${boardW - 6}" height="5" rx="2.5" fill="#ffffff" opacity="0.45"/>`;
    let minLabel = Infinity;
    cells.forEach((c, i) => {
      const br = Math.min(c.h * 0.36, 16);
      const bx = c.x + 8 + br;
      const labelX = bx + br + 8;
      const labelW = c.x + c.w - 8 - labelX;
      const len = Math.max(charCount(choices[i]), 1);
      const size = Math.max(12, Math.min(22, (labelW / len) * 0.98, c.h * 0.58));
      minLabel = Math.min(minLabel, size);
      const fit = (x, y, sx, sy) => `<path d="M${x},${y + sy * 6} V${y} H${x + sx * 6}" stroke="#d9b04d" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      const [dc, de] = TINTS[i % TINTS.length];
      s += `<rect x="${c.x - 1.5}" y="${c.y - 1.5}" width="${c.w + 3}" height="${c.h + 3}" rx="6" fill="#c97a6e"/>`;
      s += `<g class="cell" data-i="${i}">`
        + `<rect x="${c.x}" y="${c.y + 2.5}" width="${c.w}" height="${c.h}" rx="5" fill="${de}"/>`
        + `<rect class="cell-bg" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="5" fill="${dc}" stroke="${de}" stroke-width="1.6"/>`
        + `<rect x="${c.x + 3}" y="${c.y + 2}" width="${c.w - 6}" height="${(c.h * 0.26).toFixed(1)}" rx="${(c.h * 0.13).toFixed(1)}" fill="#ffffff" opacity="0.45"/>`
        + fit(c.x + 3, c.y + 3, 1, 1) + fit(c.x + c.w - 3, c.y + 3, -1, 1) + fit(c.x + 3, c.y + c.h - 3, 1, -1) + fit(c.x + c.w - 3, c.y + c.h - 3, -1, -1)
        + `<circle cx="${bx}" cy="${c.y + c.h / 2}" r="${br}" fill="${C.cream}" stroke="${BAND}" stroke-width="2"/>`
        + `<text x="${bx}" y="${c.y + c.h / 2 + 0.5}" font-size="${(br * 1.15).toFixed(1)}" font-weight="700" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`
        + `<text class="cell-label" x="${labelX}" y="${c.y + c.h / 2}" font-size="${size.toFixed(1)}" fill="${C.ink}" dominant-baseline="central">${escapeXml(choices[i])}</text>`
        + `</g>`;
    });
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      box: svg.querySelector('.box'),
      stick: svg.querySelector('.stick'),
      stick2: svg.querySelector('.stick2'),
      tag: svg.querySelector('.tag'),
      tagNum: svg.querySelector('.tag-num'),
      hold: svg.querySelector('.hold'),
      catG: svg.querySelector('.kuji-cat'),
      beckon: svg.querySelector('.beckon-in'),
      cells: Array.from(svg.querySelectorAll('.cell')),
    };
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  function setBox(rot, dx = 0, dy = 0) {
    const { boxAt, bw, bh } = geo;
    refs.box.setAttribute('transform', `translate(${(boxAt.x + dx).toFixed(2)} ${(boxAt.y + dy).toFixed(2)}) rotate(${rot.toFixed(2)})`);
    // 手は箱の左の面に添える
    const a = (rot * Math.PI) / 180;
    const hx = -bw / 2 - 2;
    const hy = bh * 0.12;
    refs.hold.setAttribute('transform', `translate(${(boxAt.x + dx + hx * Math.cos(a) - hy * Math.sin(a)).toFixed(2)} ${(boxAt.y + dy + hx * Math.sin(a) + hy * Math.cos(a)).toFixed(2)})`);
  }

  function setMood(mood, look = null) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  function lightCell(i, color) {
    refs.cells.forEach((g, k) => {
      g.querySelector('.cell-bg').setAttribute('fill', k === i ? color : TINTS[k % TINTS.length][0]);
    });
  }

  function reset() {
    clearCelebration();
    render();
    if (geo) setBox(0);
    showHint(result, '「ふる」を おしてね');
    play.textContent = 'ふる';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    setBox(0);
    const { n, stickL } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    setMood('normal', { x: 1, y: 0.2 });
    showHint(result, 'からから…');
    // 1. 3回ふる。ふっている間、一覧が順に うすく光る
    let scan = Math.floor(Math.random() * n);
    for (let burst = 0; burst < 3; burst++) {
      const dur = 760 + burst * 120;
      let lastRattle = -1;
      await frames(dur, (t) => {
        const w = Math.sin(t * Math.PI * 7) * (14 - burst * 2) * Math.sin(Math.PI * t);
        setBox(w, 0, -Math.abs(Math.sin(t * Math.PI * 7)) * 5);
        const beat = Math.floor(t * 7);
        if (beat !== lastRattle) {
          lastRattle = beat;
          audio.rattle();
          scan = (scan + 1 + Math.floor(Math.random() * Math.max(1, n - 1))) % n;
          lightCell(scan, '#fff6dc');
        }
      });
      setBox(0);
      await wait(200 + burst * 60);
    }
    lightCell(-1);
    // 2. かたむけて、棒をゆっくり出す
    showHint(result, 'でてくるよ…');
    await frames(420, (t) => setBox(-24 * ease.inOutSine(t)));
    const vr = Math.random();
    const variant = vr < 0.25 ? 'stuck' : vr < 0.5 ? 'two' : vr < 0.75 ? 'pon' : 'plain';
    stage.dataset.variant = variant;
    const slideTo = (a, b, dur, el = refs.stick) => frames(dur, (t) => el.setAttribute('transform', `translate(0 ${(stickL * (1 - (a + (b - a) * ease.outCubic(t)))).toFixed(2)})`));
    audio.slide(1.3);
    if (variant === 'two') {
      // 2ほん：2本 いっしょに 出てきて、1本を もどす
      await Promise.all([slideTo(0, 0.55, 700), slideTo(0, 0.5, 700, refs.stick2)]);
      showHint(result, 'あっ、2ほん でた');
      audio.heart();
      await wait(300);
      showHint(result, 'こっちは もどして…');
      audio.tap();
      await slideTo(0.5, 0, 420, refs.stick2);
      await slideTo(0.55, 1, 600);
    } else if (variant === 'stuck') {
      await slideTo(0, 0.45, 650);
      showHint(result, 'あれ？ ひっかかった…');
      audio.heart();
      await wait(260);
      showHint(result, 'ふりっ！');
      audio.rattle();
      await frames(380, (t) => setBox(-24 + Math.sin(t * Math.PI * 4) * 6));
      setBox(-24);
      await slideTo(0.45, 1, 700);
    } else {
      await slideTo(0, 1, 1300);
    }
    if (variant === 'pon') {
      // ぽーん：棒が とびだして くるっと まわって もどる
      showHint(result, 'ぽーん！');
      audio.toss();
      const cy = -geo.bh / 2 - stickL / 2 + 6;
      await frames(620, (t) => refs.stick.setAttribute('transform', `translate(0 ${(-Math.sin(Math.PI * t) * stickL * 0.7).toFixed(2)}) rotate(${(360 * ease.inOutSine(t)).toFixed(1)} 0 ${cy.toFixed(1)})`));
      refs.stick.setAttribute('transform', 'translate(0 0)');
      audio.tap();
    }
    await wait(320);
    refs.tagNum.textContent = String(decided + 1);
    audio.pop();
    await frames(320, (t) => refs.tag.setAttribute('transform', `translate(0 ${(-geo.bh / 2 - stickL + 6).toFixed(2)}) scale(${ease.outBack(t).toFixed(3)})`));
    await wait(260);
    // 3. 番号の欄が光る
    const landed = Number(refs.tagNum.textContent) - 1;
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    lightCell(landed, '#ffe39a');
    {
      const c = geo.cells[landed];
      const ox = c.x + c.w / 2;
      const oy = c.y + c.h / 2;
      refs.cells[landed].parentNode.appendChild(refs.cells[landed]); // 出てきた 引き出しを 前に
      frames(320, (t) => refs.cells[landed].setAttribute('transform', `translate(${ox} ${(oy + 2 * ease.outCubic(t)).toFixed(2)}) scale(${(1 + 0.05 * ease.outCubic(t)).toFixed(3)}) translate(${-ox} ${-oy})`));
      audio.slide(0.3);
    }
    const bg = refs.cells[landed].querySelector('.cell-bg');
    bg.setAttribute('stroke', C.momiji);
    bg.setAttribute('stroke-opacity', '0.9');
    bg.setAttribute('stroke-width', '4');
    refs.cells[landed].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], { duration: 240, easing: 'ease-out' });
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    setMood('happy');
    // 手を上げて招く
    frames(900, (t) => refs.beckon.setAttribute('transform', `rotate(${(-14 * Math.sin(t * Math.PI * 2) * (1 - t * 0.3)).toFixed(2)} -30 30)`));
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, `${landed + 1}ばん`, choices[landed]);
    const c = centerOf(result);
    celebrate(level, c.x, c.y - 30);
    await wait(600);
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
