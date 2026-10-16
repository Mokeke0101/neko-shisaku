// 舞う葉っぱと、お祝いの葉っぱ。
// 画面の中で同時に動く物は数十個までにする（RS01-S14）。
import { autumnLeaf } from './art.js';
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
    el.innerHTML = `<svg viewBox="-24 -24 48 48">${autumnLeaf(i, 18)}</svg>`;
    layer.appendChild(el);
    pieces.push(el);
  }
  let anims = [];
  return {
    start() {
      this.stop();
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
// (x, y) は葉っぱが舞い上がる中心（画面の座標）
export function celebrate(level, x, y) {
  const layer = document.getElementById('fx');
  const count = level === 3 ? 34 : level === 2 ? 22 : 14;
  const spread = level === 3 ? 1.35 : level === 2 ? 1.1 : 0.85;
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'fx-piece';
    el.innerHTML = `<svg viewBox="-24 -24 48 48">${autumnLeaf(i, 16 + (i % 3) * 3)}</svg>`;
    layer.appendChild(el);
    const ang = jitter(-Math.PI * 0.95, -Math.PI * 0.05);
    const v = jitter(160, 330) * spread;
    const dx = Math.cos(ang) * v * (w / 390);
    const dy = Math.sin(ang) * v;
    const fall = jitter(260, 420) * spread;
    const rot = jitter(-540, 540);
    const dur = jitter(1500, 2300) + level * 200;
    const a = el.animate([
      { transform: `translate(${x - 15}px, ${y - 15}px) rotate(0deg) scale(0.4)`, opacity: 0 },
      { transform: `translate(${x - 15 + dx * 0.7}px, ${y - 15 + dy * 0.7}px) rotate(${rot * 0.3}deg) scale(1)`, opacity: 1, offset: 0.22 },
      { transform: `translate(${x - 15 + dx}px, ${y - 15 + dy + fall * 0.4}px) rotate(${rot * 0.6}deg) scale(1)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${x - 15 + dx * 1.15}px, ${y - 15 + dy + fall}px) rotate(${rot}deg) scale(0.9)`, opacity: 0 },
    ], { duration: dur, easing: 'cubic-bezier(.2,.7,.4,1)' });
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
