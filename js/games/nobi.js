// のびのび せいくらべ（見せ方の部品：たまっていくゲージ）。
// 柱の「せいくらべ」の印へ向かって、猫がばんざいの形で上へのびる。届いた印がコインの段階になる。
// どの段階も同じ出やすさで、どの段階もお祝いし、段階が上がるほどお祝いを大きくする（RS01-S09・S15）。
import { C, catFace, pawPrint, nextId } from '../art.js';
import { audio } from '../audio.js';
import { pickIndex } from '../random.js';
import { celebrate, clearCelebration, ease, frames, wait } from '../fx.js';
import { showHint, showResult, setBusy, charCount, svgEl, escapeXml } from '../ui.js';

const MESSAGES = { 1: 'とどいたよ', 2: 'よく のびたね', 3: 'いちばん うえまで' };

export function createNobi({ view, stage, result, play, getStages }) {
  let geo = null;
  let busy = false;
  let refs = {};
  let reach = 0; // いまの手の先の高さ（画面の y 座標）

  function render() {
    const stages = getStages();
    const n = stages.length;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const k = Math.max(0.6, Math.min(1, H / 520));
    const floorY = H - 6;
    const px = W * 0.42;
    const pw = 40;
    const cx = W * 0.72;
    const baseTop = floorY - 54 * k;
    const restReach = floorY - 152 * k;
    const lowMark = restReach - 30 * k;
    const topMark = 24;
    const step = n > 1 ? (lowMark - topMark) / (n - 1) : 0;
    const marks = Array.from({ length: n }, (_, i) => lowMark - step * i);
    geo = { n, W, H, k, floorY, px, pw, cx, baseTop, restReach, marks, step };
    const clipId = nextId('torso');

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 柱
    s += `<rect x="${px - pw / 2 + 4}" y="0" width="${pw}" height="${floorY}" fill="#d9b07a" opacity="0.3"/>`;
    s += `<rect x="${px - pw / 2}" y="-10" width="${pw}" height="${floorY + 10}" rx="4" fill="${C.wood}" stroke="${C.woodDeep}" stroke-width="2.5"/>`;
    s += `<path d="M${px - 8},20 C${px - 4},${H * 0.3} ${px - 12},${H * 0.6} ${px - 6},${floorY - 10} M${px + 9},10 C${px + 12},${H * 0.4} ${px + 5},${H * 0.7} ${px + 10},${floorY - 20}" stroke="${C.woodDeep}" stroke-width="1.6" fill="none" opacity="0.7"/>`;
    // 印と札
    const tagRight = px - pw / 2 - 10;
    const tagW = Math.max(60, tagRight - 4);
    const th = Math.max(18, Math.min(38, (step || 40) - 5));
    marks.forEach((y, i) => {
      const len = charCount(stages[i]);
      const size = Math.max(13, Math.min(22, th * 0.64, (tagW - 18) / Math.max(len, 1)));
      s += `<path d="M${px + pw / 2 + 4},${y} H${W - 4}" stroke="${C.kaki}" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round" opacity="0.55"/>`;
      s += `<g class="tag" data-i="${i}">`
        + `<path d="M${tagRight},${y} H${px - pw / 2}" stroke="${C.chestnut}" stroke-width="2"/>`
        + `<rect class="tag-bg" x="${tagRight - tagW}" y="${y - th / 2}" width="${tagW}" height="${th}" rx="${Math.min(10, th / 2)}" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="2"/>`
        + `<text class="cell-label" x="${tagRight - tagW / 2}" y="${y}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(stages[i])}</text>`
        + `</g>`;
      s += `<path class="cut" data-i="${i}" d="M${px - pw / 2 + 3},${y} H${px + pw / 2 - 3}" stroke="${C.momiji}" stroke-width="4" stroke-linecap="round"/>`;
    });
    // 猫
    s += `<defs><clipPath id="${clipId}"><rect class="torso-clip" x="${cx - 30 * k}" y="0" width="${60 * k}" height="10" rx="${26 * k}"/></clipPath></defs>`;
    s += `<g class="cat">`;
    s += `<ellipse cx="${cx}" cy="${floorY - 2}" rx="${54 * k}" ry="${7 * k}" fill="#a0703f" opacity="0.18"/>`;
    s += `<path d="M${cx + 30 * k},${floorY - 22 * k} C${cx + 70 * k},${floorY - 20 * k} ${cx + 78 * k},${floorY - 70 * k} ${cx + 56 * k},${floorY - 92 * k}" stroke="${C.line}" stroke-width="${17 * k}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${cx + 30 * k},${floorY - 22 * k} C${cx + 70 * k},${floorY - 20 * k} ${cx + 78 * k},${floorY - 70 * k} ${cx + 56 * k},${floorY - 92 * k}" stroke="${C.fur}" stroke-width="${11 * k}" fill="none" stroke-linecap="round"/>`;
    s += `<rect class="arm" x="${cx - 45 * k}" y="0" width="${18 * k}" height="10" rx="${9 * k}" fill="${C.fur}" stroke="${C.line}" stroke-width="${3 * k}"/>`;
    s += `<rect class="arm" x="${cx + 27 * k}" y="0" width="${18 * k}" height="10" rx="${9 * k}" fill="${C.fur}" stroke="${C.line}" stroke-width="${3 * k}"/>`;
    s += `<g clip-path="url(#${clipId})">`
      + `<rect class="torso" x="${cx - 30 * k}" y="0" width="${60 * k}" height="${H}" fill="${C.fur}"/>`
      + Array.from({ length: Math.ceil(H / (22 * k)) + 2 }, (_, i) => `<path d="M${cx - 30 * k},${baseTop - i * 22 * k} h${14 * k} M${cx + 30 * k},${baseTop - i * 22 * k - 11 * k} h${-14 * k}" stroke="${C.stripe}" stroke-width="${4 * k}" stroke-linecap="round"/>`).join('')
      + `<rect class="belly" x="${cx - 14 * k}" y="0" width="${28 * k}" height="${H}" fill="${C.white}"/>`
      + `</g>`;
    s += `<rect class="torso-line" x="${cx - 30 * k}" y="0" width="${60 * k}" height="10" rx="${26 * k}" fill="none" stroke="${C.line}" stroke-width="${3 * k}"/>`;
    s += `<ellipse cx="${cx}" cy="${floorY - 34 * k}" rx="${40 * k}" ry="${30 * k}" fill="${C.fur}" stroke="${C.line}" stroke-width="${3 * k}"/>`;
    s += `<ellipse cx="${cx}" cy="${floorY - 30 * k}" rx="${20 * k}" ry="${20 * k}" fill="${C.white}"/>`;
    s += `<ellipse cx="${cx - 22 * k}" cy="${floorY - 9 * k}" rx="${17 * k}" ry="${10 * k}" fill="${C.fur}" stroke="${C.line}" stroke-width="${3 * k}"/>`;
    s += `<ellipse cx="${cx + 22 * k}" cy="${floorY - 9 * k}" rx="${17 * k}" ry="${10 * k}" fill="${C.fur}" stroke="${C.line}" stroke-width="${3 * k}"/>`;
    s += `<g class="head"><g class="head-in" transform="scale(${(0.92 * k).toFixed(3)})">${catFace()}</g></g>`;
    s += `<g class="pawL"><circle r="${13 * k}" fill="${C.fur}" stroke="${C.line}" stroke-width="${3 * k}"/>${pawPrint(C.pink, 8 * k)}</g>`;
    s += `<g class="pawR"><circle r="${13 * k}" fill="${C.fur}" stroke="${C.line}" stroke-width="${3 * k}"/>${pawPrint(C.pink, 8 * k)}</g>`;
    s += `</g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      cat: svg.querySelector('.cat'),
      arms: Array.from(svg.querySelectorAll('.arm')),
      torsoClip: svg.querySelector('.torso-clip'),
      torsoLine: svg.querySelector('.torso-line'),
      head: svg.querySelector('.head'),
      headIn: svg.querySelector('.head-in'),
      pawL: svg.querySelector('.pawL'),
      pawR: svg.querySelector('.pawR'),
      tags: Array.from(svg.querySelectorAll('.tag')),
    };
    setReach(restReach);
    stage.dataset.count = String(n);
  }

  // 手の先の高さを y にして、猫の各部を描き直す
  function setReach(y) {
    reach = y;
    const { k, cx, baseTop } = geo;
    const pawY = y + 13 * k;
    const headY = y + 72 * k;
    const torsoTop = headY + 20 * k;
    const torsoH = Math.max(10, baseTop - torsoTop + 16 * k);
    refs.torsoClip.setAttribute('y', torsoTop.toFixed(2));
    refs.torsoClip.setAttribute('height', torsoH.toFixed(2));
    refs.torsoLine.setAttribute('y', torsoTop.toFixed(2));
    refs.torsoLine.setAttribute('height', torsoH.toFixed(2));
    const shoulder = headY + 24 * k;
    refs.arms.forEach((a) => {
      a.setAttribute('y', pawY.toFixed(2));
      a.setAttribute('height', Math.max(10, shoulder - pawY).toFixed(2));
    });
    refs.head.setAttribute('transform', `translate(${cx.toFixed(2)} ${headY.toFixed(2)})`);
    refs.pawL.setAttribute('transform', `translate(${(cx - 36 * k).toFixed(2)} ${pawY.toFixed(2)})`);
    refs.pawR.setAttribute('transform', `translate(${(cx + 36 * k).toFixed(2)} ${pawY.toFixed(2)})`);
  }

  function setMood(mood) {
    refs.headIn.innerHTML = catFace({ mood });
  }

  function flashTag(i, final) {
    const t = refs.tags[i];
    t.querySelector('.tag-bg').setAttribute('fill', final ? C.icho : '#fff1c4');
    t.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' });
  }

  async function moveTo(y, dur, fn) {
    const from = reach;
    await frames(dur, (t) => setReach(from + (y - from) * fn(t)));
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
    showHint(result, 'うーん…');
    const { n, marks, restReach, k } = geo;
    const decided = pickIndex(n); // 結果を先に決める
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    // ため（少しかがむ）
    await moveTo(restReach + 12 * k, 260, ease.inOutSine);
    let total = 0.7 + 0.66 * decided + 0.4;
    audio.stretch(total);
    for (let j = 0; j <= decided; j++) {
      const last = j === decided;
      const dur = j === 0 ? (last ? 1000 : 700) : (last ? 820 : 520);
      await moveTo(marks[j], dur, last ? ease.outBack : ease.inOutSine);
      audio.mark(j);
      flashTag(j, last);
      if (!last) await wait(140);
    }
    setReach(marks[decided]);
    // 手の先に一番近い印を、届いた段階とする
    let landed = 0;
    marks.forEach((m, i) => { if (Math.abs(m - reach) < Math.abs(marks[landed] - reach)) landed = i; });
    stage.dataset.landed = String(landed);
    const level = n === 1 ? 3 : 1 + Math.round((2 * landed) / (n - 1));
    stage.dataset.level = String(level);
    setMood('happy');
    audio.fanfare(level);
    const stages = getStages();
    showResult(result, MESSAGES[level], stages[landed]);
    const r = stage.getBoundingClientRect();
    celebrate(level, r.left + geo.cx, r.top + reach + 10);
    // うれしくて跳ねる（段階が上がるほど多く跳ねる）
    for (let h = 0; h < level; h++) {
      await frames(300, (t) => refs.cat.setAttribute('transform', `translate(0 ${(-Math.sin(Math.PI * t) * 9 * k).toFixed(2)})`));
    }
    refs.cat.removeAttribute('transform');
    play.textContent = 'もういちど';
    busy = false;
    setBusy(view, false);
  }

  play.addEventListener('click', run);
  return { render, reset, isBusy: () => busy };
}
