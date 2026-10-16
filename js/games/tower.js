// だんボール タワー（決め方：高さへ届く。見せ方の部品：積み上がる箱と、右の高さの札）。
// 猫が だんボール箱を1つずつ積む。積み終わった高さの札が結果になる（上の札ほど高い段階）。
// 同じ「高さへ届く」系統の のびのび せいくらべ とは、届き方（せいくらべは猫がのびる、こちらは箱が1つずつ増える）と、
// 止まる時の見せ方（こちらは、次の箱を持ったまま まよう）が違う。
//
// 結果が出るまでの「どうなるんだろう？」と思わせる時間（RS01-S19）
// 1. 猫が箱を持ってきて、1つずつ積む。積むたびに、塔が少し ゆれる。
// 2. ときどき、次の箱を持ったまま「もう1こ…？」と まよってから積む。
// 3. 決めた高さでは、次の箱を持ったまま まよった後、箱を床に置いて、塔のてっぺんに飛び乗る。
// 結果は先に乱数で決め（RS01-S14）、積む箱の数を、決めた高さになる数にする。
// どの高さもお祝いし、高いほどお祝いを大きくする（RS01-S09・S15）。高さの札はどれも同じ間かく（出やすさは札に表れない：RS01-S21）。
import { C } from '../art.js';
import { catSitting } from '../cats.js';
import { audio } from '../audio.js';
import { pickWeighted } from '../odds.js';
import { celebrate, clearCelebration, ease, frames, wait, levelOf } from '../fx.js';
import { showHint, showResult, setBusy, centerOf, charCount, svgEl, escapeXml } from '../ui.js';

// 積む途中で まよう高さ（決めた高さ decided より下の中から、多くて2か所）。rand() は 0 以上 1 未満
export function fakeStops(decided, rand = Math.random) {
  const out = [];
  if (decided < 1) return out;
  const want = decided >= 4 ? 2 : 1;
  const pool = Array.from({ length: decided }, (_, i) => i);
  while (out.length < want && pool.length) {
    const k = Math.floor(rand() * pool.length);
    out.push(pool.splice(k, 1)[0]);
  }
  return out.sort((a, b) => a - b);
}

export function createTower({ view, stage, result, play, getChoices, getWeights, getCat, getPurpose }) {
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
    const floorY = H - 14;
    const topRoom = Math.max(50, Math.min(80, H * 0.14));
    const bh = Math.min(56, (floorY - topRoom) / n);
    const tagW = Math.max(118, Math.min(140, W * 0.35));
    const tagX = W - 6 - tagW;
    const catZone = Math.max(64, Math.min(84, W * 0.2));
    const bw = Math.max(60, Math.min(112, (tagX - catZone - 30) * 0.8));
    const tx = catZone + 10 + (tagX - 16 - catZone - 10) / 2;
    const th = Math.max(20, Math.min(40, bh - 4));
    const levelY = (i) => floorY - bh * (i + 1); // 箱 i の上の面
    const catS = Math.max(0.3, Math.min(0.46, catZone / 170));
    const catHome = { x: catZone / 2 + 4, y: floorY - 78 * catS };
    geo = { n, W, H, floorY, bh, bw, tx, tagX, tagW, th, levelY, catS, catHome };

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    let s = '';
    // 床
    s += `<rect x="0" y="${floorY}" width="${W}" height="${H - floorY}" fill="#efd0a0"/><path d="M0,${floorY} H${W}" stroke="${C.woodDeep}" stroke-width="3"/>`;
    // 高さの札と、塔までの点線
    let minLabel = Infinity;
    choices.forEach((c, i) => {
      const y = levelY(i);
      const len = Math.max(charCount(c), 1);
      const size = Math.max(12, Math.min(22, th * 0.62, ((tagW - 18) / len) * 0.98));
      minLabel = Math.min(minLabel, size);
      s += `<g class="tag" data-i="${i}">`
        + `<path class="tag-line" d="M${(tx + bw / 2 + 4).toFixed(1)},${y.toFixed(1)} H${tagX}" stroke="${C.chestnut}" stroke-width="1.6" stroke-dasharray="3 4" opacity="0.6"/>`
        + `<rect class="tag-bg" x="${tagX}" y="${(y - th / 2).toFixed(1)}" width="${tagW}" height="${th}" rx="${Math.min(10, th / 2)}" fill="${C.paper}" stroke="${C.woodDeep}" stroke-width="2"/>`
        + `<text class="cell-label" x="${tagX + tagW / 2}" y="${y.toFixed(1)}" font-size="${size.toFixed(1)}" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${escapeXml(c)}</text>`
        + `</g>`;
    });
    // 積んだ箱（遊ぶ時に足す）と、手に持つ箱
    s += `<g class="stack"></g>`;
    s += `<g class="spare" visibility="hidden"></g>`;
    s += `<g class="held" visibility="hidden">${box(0)}</g>`;
    // 猫
    s += `<g class="cat-pos"><g class="tw-cat">${catSitting(cat, { look: { x: 1, y: -0.3 } })}</g></g>`;
    svg.innerHTML = s;
    stage.textContent = '';
    stage.appendChild(svg);
    refs = {
      stack: svg.querySelector('.stack'),
      spare: svg.querySelector('.spare'),
      held: svg.querySelector('.held'),
      catPos: svg.querySelector('.cat-pos'),
      catG: svg.querySelector('.tw-cat'),
      tags: Array.from(svg.querySelectorAll('.tag')),
    };
    placeCat(catHome.x, catHome.y);
    stage.dataset.count = String(n);
    stage.dataset.cat = cat.id;
    stage.dataset.minLabel = minLabel.toFixed(1);
  }

  // 箱の絵（中心 0,0）。k で色あいを少し変える
  function box(k) {
    const { bw, bh } = geo;
    const w = bw * (0.92 + (k % 3) * 0.04);
    const h = bh - 2;
    const fill = ['#e9c591', '#e3bb84', '#eecd9d'][k % 3];
    return `<rect x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${fill}" stroke="#b98a52" stroke-width="2"/>`
      + `<rect x="${(-w * 0.09).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${(w * 0.18).toFixed(1)}" height="${h.toFixed(1)}" fill="#f6dfb8" opacity="0.9"/>`
      + `<path d="M${(-w / 2 + 4).toFixed(1)},${(-h / 2 + 4).toFixed(1)} L${(-w / 2 + 12).toFixed(1)},${(-h / 2 + 4).toFixed(1)}" stroke="#b98a52" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`;
  }

  function placeCat(x, y, mirror = false) {
    const k = geo.catS;
    refs.catPos.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(mirror ? -k : k).toFixed(3)} ${k.toFixed(3)})`);
  }

  function setCat(mood, look) {
    refs.catG.innerHTML = catSitting(cat, { mood, look });
  }

  function placeHeld(x, y, rot = 0) {
    refs.held.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)})`);
  }

  function reset() {
    clearCelebration();
    render();
    showHint(result, '「つむ」を おしてね');
    play.textContent = 'つむ';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setBusy(view, true);
    clearCelebration();
    await audio.unlock();
    render();
    const { n, tx, levelY, bh, catHome, catS } = geo;
    const weights = getWeights();
    if (weights.length !== n) throw new Error(`選択肢と重みの数が合わない: ${n}・${weights.length}`);
    const decided = pickWeighted(weights); // 結果を先に決める（出やすさ：RS01-S21）
    stage.dataset.decided = String(decided);
    delete stage.dataset.landed;
    const t0 = performance.now();
    const fakes = fakeStops(decided);
    const offsets = Array.from({ length: n }, () => (Math.random() * 2 - 1) * geo.bw * 0.06);
    const tilts = Array.from({ length: n }, () => (Math.random() * 2 - 1) * 2.5);
    const handAt = () => ({ x: catHome.x + 46 * catS, y: catHome.y - 70 * catS });
    const sp = Math.max(0.55, Math.min(1, 6 / n)); // 箱が多い時は、1つを積む時間を短くする
    showHint(result, 'つむよ…');
    setCat('normal', { x: 1, y: -0.4 });
    await wait(1100);
    let count = 0;
    let lastTag = -1;
    const lightTag = (i) => {
      if (lastTag >= 0) refs.tags[lastTag].querySelector('.tag-bg').setAttribute('fill', C.paper);
      if (i >= 0) refs.tags[i].querySelector('.tag-bg').setAttribute('fill', '#fff6dc');
      lastTag = i;
    };
    // 箱を1つ持ち上げて、塔の上へ運ぶ（top は いまの塔の上の面）
    const lift = async (k, hesitate, last = false) => {
      const top = count ? levelY(count - 1) : geo.floorY;
      const hold = handAt();
      refs.held.innerHTML = box(k);
      refs.held.setAttribute('visibility', 'visible');
      const above = { x: tx + offsets[k], y: Math.max(bh * 0.6, top - bh * 1.4) };
      await frames(260 * sp, (t) => placeHeld(hold.x + (above.x - hold.x) * ease.outCubic(t), hold.y + (above.y - hold.y) * ease.outCubic(t) - Math.sin(Math.PI * t) * 20));
      if (hesitate) {
        showHint(result, 'もう1こ…？');
        setCat('strain', { x: 1, y: -1 });
        audio.heart();
        await frames(last ? 1100 : 800, (t) => placeHeld(above.x + Math.sin(t * Math.PI * 6) * 4, above.y + Math.sin(t * Math.PI * 3) * 3, Math.sin(t * Math.PI * 6) * 4));
        setCat('normal', { x: 1, y: -1 });
      }
      return above;
    };
    const drop = async (k, from) => {
      const y = levelY(k) + bh / 2;
      const x = tx + offsets[k];
      await frames(220 * sp, (t) => placeHeld(from.x + (x - from.x) * t, from.y + (y - from.y) * t * t, tilts[k] * t));
      refs.held.setAttribute('visibility', 'hidden');
      const g = svgEl('g', { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${tilts[k].toFixed(2)})` });
      g.innerHTML = box(k);
      refs.stack.appendChild(g);
      count = k + 1;
      audio.stamp();
      lightTag(k);
      // 塔が少し ゆれる
      frames(360, (t) => refs.stack.setAttribute('transform', `rotate(${(Math.sin(t * Math.PI * 3) * 1.6 * (1 - t)).toFixed(2)} ${tx} ${geo.floorY})`));
      await wait(120 * sp);
    };
    // 1. 箱を積む（まよう高さでは、次の箱を持ったまま まよってから積む）
    for (let k = 0; k <= decided; k++) {
      if (k > 0) showHint(result, 'つむよ…');
      const hesitate = fakes.includes(k - 1);
      const at = await lift(k, hesitate);
      await drop(k, at);
      audio.hop(k);
    }
    // 2. 決めた高さ：次の箱を持ったまま まよう（いちばん上の札なら、持たずに見上げる）
    if (decided < n - 1) {
      const at = await lift(decided + 1, true, true);
      showHint(result, 'ここで おしまい…？');
      await frames(500, (t) => placeHeld(at.x, at.y - Math.sin(Math.PI * t) * 6));
      // 箱を床に置く
      const floor = { x: catHome.x - 6, y: geo.floorY - bh / 2 };
      await frames(360, (t) => placeHeld(at.x + (floor.x - at.x) * ease.inOutSine(t), at.y + (floor.y - at.y) * ease.inOutSine(t)));
      refs.held.setAttribute('visibility', 'hidden');
      refs.spare.innerHTML = `<g transform="translate(${floor.x.toFixed(1)} ${floor.y.toFixed(1)}) rotate(-6)">${box(decided + 1)}</g>`;
      refs.spare.setAttribute('visibility', 'visible');
    } else {
      showHint(result, 'いちばん うえまで…！');
      setCat('normal', { x: 1, y: -1 });
      audio.heart();
      await wait(700);
    }
    // 3. てっぺんに飛び乗る
    const landed = count - 1;
    const topY = levelY(landed) - 78 * catS;
    const topX = tx + offsets[landed];
    audio.toss();
    await frames(520, (t) => placeCat(catHome.x + (topX - catHome.x) * t, catHome.y + (topY - catHome.y) * t - Math.sin(Math.PI * t) * 60));
    stage.dataset.landed = String(landed);
    stage.dataset.waitMs = String(Math.round(performance.now() - t0));
    const bg = refs.tags[landed].querySelector('.tag-bg');
    bg.setAttribute('fill', '#fff1c4');
    bg.setAttribute('stroke', C.momiji);
    bg.setAttribute('stroke-width', '4');
    refs.tags[landed].querySelector('.tag-line').setAttribute('opacity', '1');
    refs.tags[landed].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], { duration: 240, easing: 'ease-out' });
    setCat('happy');
    const level = getPurpose() === 'coin' ? levelOf(landed, n) : 2;
    stage.dataset.level = String(level);
    audio.fanfare(level);
    const choices = getChoices();
    showResult(result, landed === n - 1 ? 'いちばん うえまで' : 'ここまで つんだよ', choices[landed]);
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
