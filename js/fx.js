// 舞う葉っぱと、お祝いの葉っぱ。
// 画面の中で同時に動く物は数十個までにする（RS01-S14）。
import { fallingPiece, celebratePiece, starShape } from './art.js';
import { catSitting, designById, CAT_DESIGN } from './cats.js';
import { look } from './look.js';
import { jitter } from './random.js';

const FALL_COUNT = 7;

// 画面ごとに、ゆっくり舞い落ちる葉っぱを置く（その画面が出ている間だけ動かす）
export function setupFalling(view) {
  const layer = view.querySelector('.leaves');
  if (!layer) return { start() {}, stop() {} };
  const pieces = [];
  for (let i = 0; i < FALL_COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'leaf-fall';
    layer.appendChild(el);
    pieces.push(el);
  }
  let anims = [];
  return {
    start() {
      this.stop();
      // 季節と行事の舞う物（look が変わっていれば描き直す）
      pieces.forEach((el, i) => { el.innerHTML = `<svg viewBox="-24 -24 48 48">${fallingPiece(i, 18, look)}</svg>`; });
      const w = layer.clientWidth || window.innerWidth;
      const h = layer.clientHeight || window.innerHeight;
      anims = pieces.map((el, i) => {
        const x = jitter(0, w - 20);
        const drift = jitter(-60, 60);
        const dur = jitter(9000, 15000);
        const spin = jitter(180, 540) * (i % 2 ? 1 : -1);
        const a = el.animate([
          { transform: `translate(${x}px, -40px) rotate(0deg)` },
          { transform: `translate(${x + drift * 0.6}px, ${h * 0.35}px) rotate(${spin * 0.35}deg)`, offset: 0.35 },
          { transform: `translate(${x - drift * 0.4}px, ${h * 0.7}px) rotate(${spin * 0.7}deg)`, offset: 0.7 },
          { transform: `translate(${x + drift}px, ${h + 40}px) rotate(${spin}deg)` },
        ], { duration: dur, iterations: Infinity, delay: -jitter(0, dur), easing: 'linear' });
        return a;
      });
    },
    stop() {
      anims.forEach((a) => a.cancel());
      anims = [];
    },
  };
}

// お祝い：level 1〜3 で葉っぱの数と広がりを変える（RS01-S15）。
// (x, y) は葉っぱが舞い上がる中心（画面の座標）。
// v12：お祝いの形を4つから選ぶ（ふきあがる・ふってくる・左右から とびだす・わになって ひろがる）。続けて同じ形にしない
const STYLES = ['burst', 'rain', 'cannon', 'ring'];
let lastStyle = '';
export function celebrate(level, x, y) {
  const layer = document.getElementById('fx');
  const count = level === 3 ? 34 : level === 2 ? 22 : 14;
  const spread = level === 3 ? 1.35 : level === 2 ? 1.1 : 0.85;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pool = STYLES.filter((st) => st !== lastStyle);
  const style = pool[Math.floor(Math.random() * pool.length)];
  lastStyle = style;
  layer.dataset.style = style;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'fx-piece';
    el.innerHTML = `<svg viewBox="-24 -24 48 48">${celebratePiece(i, 16 + (i % 3) * 3, look)}</svg>`;
    layer.appendChild(el);
    const rot = jitter(-540, 540);
    const dur = jitter(1500, 2300) + level * 200;
    let keys;
    if (style === 'rain') {
      // 画面の上から ひらひら ふってくる
      const sx = jitter(0, w);
      const sway = jitter(-60, 60);
      const ty = jitter(h * 0.45, h * 0.85);
      keys = [
        { transform: `translate(${sx - 15}px, -40px) rotate(0deg) scale(0.8)`, opacity: 0 },
        { transform: `translate(${sx - 15 + sway * 0.5}px, ${ty * 0.3}px) rotate(${rot * 0.3}deg) scale(1)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${sx - 15 - sway * 0.3}px, ${ty * 0.7}px) rotate(${rot * 0.7}deg) scale(1)`, opacity: 1, offset: 0.7 },
        { transform: `translate(${sx - 15 + sway}px, ${ty}px) rotate(${rot}deg) scale(0.9)`, opacity: 0 },
      ];
    } else if (style === 'cannon') {
      // 下の左右の すみから、まん中へ向かって とびだす
      const left = i % 2 === 0;
      const sx = left ? 10 : w - 10;
      const dx = (left ? 1 : -1) * jitter(w * 0.25, w * 0.6);
      const up = jitter(h * 0.35, h * 0.6) * spread;
      keys = [
        { transform: `translate(${sx - 15}px, ${h - 120}px) rotate(0deg) scale(0.5)`, opacity: 0 },
        { transform: `translate(${sx - 15 + dx * 0.6}px, ${h - 120 - up}px) rotate(${rot * 0.4}deg) scale(1)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${sx - 15 + dx * 0.9}px, ${h - 120 - up * 0.8}px) rotate(${rot * 0.7}deg) scale(1)`, opacity: 1, offset: 0.65 },
        { transform: `translate(${sx - 15 + dx}px, ${h - 120 - up * 0.3}px) rotate(${rot}deg) scale(0.9)`, opacity: 0 },
      ];
    } else if (style === 'ring') {
      // (x, y) から わになって ひろがり、ゆっくり おちる
      const ang = (i / count) * Math.PI * 2;
      const r = jitter(110, 160) * spread * (w / 390);
      const fall = jitter(120, 220);
      keys = [
        { transform: `translate(${x - 15}px, ${y - 15}px) rotate(0deg) scale(0.3)`, opacity: 0 },
        { transform: `translate(${x - 15 + Math.cos(ang) * r}px, ${y - 15 + Math.sin(ang) * r * 0.8}px) rotate(${rot * 0.4}deg) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${x - 15 + Math.cos(ang) * r * 1.1}px, ${y - 15 + Math.sin(ang) * r * 0.9 + fall * 0.5}px) rotate(${rot * 0.7}deg) scale(1)`, opacity: 1, offset: 0.7 },
        { transform: `translate(${x - 15 + Math.cos(ang) * r * 1.15}px, ${y - 15 + Math.sin(ang) * r + fall}px) rotate(${rot}deg) scale(0.9)`, opacity: 0 },
      ];
    } else {
      const ang = jitter(-Math.PI * 0.95, -Math.PI * 0.05);
      const v = jitter(160, 330) * spread;
      const dx = Math.cos(ang) * v * (w / 390);
      const dy = Math.sin(ang) * v;
      const fall = jitter(260, 420) * spread;
      keys = [
        { transform: `translate(${x - 15}px, ${y - 15}px) rotate(0deg) scale(0.4)`, opacity: 0 },
        { transform: `translate(${x - 15 + dx * 0.7}px, ${y - 15 + dy * 0.7}px) rotate(${rot * 0.3}deg) scale(1)`, opacity: 1, offset: 0.22 },
        { transform: `translate(${x - 15 + dx}px, ${y - 15 + dy + fall * 0.4}px) rotate(${rot * 0.6}deg) scale(1)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${x - 15 + dx * 1.15}px, ${y - 15 + dy + fall}px) rotate(${rot}deg) scale(0.9)`, opacity: 0 },
      ];
    }
    const a = el.animate(keys, { duration: dur, delay: style === 'rain' ? jitter(0, 500) : 0, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'backwards' });
    a.onfinish = () => el.remove();
    a.oncancel = () => el.remove();
  }
}

// 大当たり（v12）：お楽しみ袋で いちばん上の段階が出た時だけ、アズと イズが そろって とびだし、金の星が ひろがる
export function jackpot() {
  const layer = document.getElementById('fx');
  const box = document.createElement('div');
  box.className = 'fx-jackpot';
  const mike = designById(CAT_DESIGN.mike);
  const saba = designById(CAT_DESIGN.saba);
  box.innerHTML = '<div class="jp-text">おおあたり！</div>'
    + `<div class="jp-cat jp-left"><svg viewBox="-90 -90 180 180">${catSitting(mike, { mood: 'happy' })}</svg></div>`
    + `<div class="jp-cat jp-right"><svg viewBox="-90 -90 180 180">${catSitting(saba, { mood: 'happy' })}</svg></div>`;
  layer.appendChild(box);
  const text = box.querySelector('.jp-text');
  const [l, r] = box.querySelectorAll('.jp-cat');
  const hop = (sg, d) => [
    { transform: `translate(${sg * 140}%, 30%) rotate(${sg * 20}deg)` },
    { transform: `translate(0, -30%) rotate(${-sg * 6}deg)`, offset: 0.18 },
    { transform: 'translate(0, 0)', offset: 0.28 },
    { transform: 'translate(0, -18%)', offset: 0.4 + d },
    { transform: 'translate(0, 0)', offset: 0.5 + d },
    { transform: 'translate(0, -18%)', offset: 0.62 + d },
    { transform: 'translate(0, 0)', offset: 0.85 },
    { transform: `translate(${sg * 140}%, 0)` },
  ];
  const t = text.animate([
    { transform: 'scale(0.2) rotate(-8deg)', opacity: 0 },
    { transform: 'scale(1.15) rotate(3deg)', opacity: 1, offset: 0.18 },
    { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.3 },
    { transform: 'scale(1)', opacity: 1, offset: 0.85 },
    { transform: 'scale(1.1)', opacity: 0 },
  ], { duration: 3000, easing: 'ease-out', fill: 'forwards' });
  l.animate(hop(-1, 0), { duration: 3000, easing: 'ease-in-out', fill: 'forwards' });
  r.animate(hop(1, 0.06), { duration: 3000, easing: 'ease-in-out', fill: 'forwards' });
  t.onfinish = () => box.remove();
  t.oncancel = () => box.remove();
  // 金の星
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < 24; i++) {
    const el = document.createElement('div');
    el.className = 'fx-piece';
    el.innerHTML = `<svg viewBox="-24 -24 48 48">${starShape(26, i % 2 ? '#ffd36b' : '#fff1c4', '#d9b04d')}</svg>`;
    layer.appendChild(el);
    const ang = (i / 24) * Math.PI * 2;
    const rr = jitter(120, 200) * (w / 390);
    const cx = w / 2;
    const cy = h * 0.3;
    const a = el.animate([
      { transform: `translate(${cx - 15}px, ${cy - 15}px) scale(0.3)`, opacity: 0 },
      { transform: `translate(${cx - 15 + Math.cos(ang) * rr}px, ${cy - 15 + Math.sin(ang) * rr}px) scale(1.1) rotate(180deg)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${cx - 15 + Math.cos(ang) * rr * 1.2}px, ${cy - 15 + Math.sin(ang) * rr * 1.2 + 120}px) scale(0.8) rotate(360deg)`, opacity: 0 },
    ], { duration: 2200, delay: 200 + (i % 3) * 120, easing: 'ease-out', fill: 'backwards' });
    a.onfinish = () => el.remove();
    a.oncancel = () => el.remove();
  }
}

// お祝いの大きさ（1〜3）を、段階の並びの位置で決める（RS01-S15：段階によってお祝いを変える）。
// 一番下の段階は 1、真ん中は 2、一番上は 3。のびのび せいくらべ と同じ分け方
export function levelOf(index, n) {
  return n <= 1 ? 3 : 1 + Math.round((2 * index) / (n - 1));
}

export function clearCelebration() {
  const layer = document.getElementById('fx');
  layer.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  layer.textContent = '';
}

// 決まりの easing（動きを結果へ自然に着地させる）
export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.5;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export function frames(duration, onFrame) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      onFrame(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
