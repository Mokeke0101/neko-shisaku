// 音（Web Audio で合成する。音のファイルは使わない）。
// 消音モードでも鳴らす設定の時は、navigator.audioSession.type を 'playback' にしてから音を作る（RS01-D02）。
import { store } from './store.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI の番号から周波数
// ド・レ・ミ・ソ・ラ（五音音階）。縁日の素朴な響きにする
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];

export const audio = {
  ctx: null,
  master: null,
  noise: null,
  state: '未準備（画面に触れると準備します）',
  sessionType: 'なし',

  applySession() {
    if (!('audioSession' in navigator)) {
      this.sessionType = 'この端末には仕組みが無い';
      return;
    }
    navigator.audioSession.type = store.data.playback ? 'playback' : 'auto';
    this.sessionType = navigator.audioSession.type;
  },

  // 画面に触れた時に呼ぶ（音は、利用者の操作の中でしか始められないため）
  async unlock() {
    if (!store.data.sound) return;
    try {
      if (!this.ctx) {
        this.applySession();
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state !== 'running') await this.ctx.resume();
      this.state = `準備済み（${this.ctx.state}）`;
    } catch (e) {
      this.state = `失敗：${e.name} ${e.message}`;
    }
  },

  // 設定を変えた時：前の指定が残らないよう、音の準備を作り直す。
  // 利用者の操作の中で続けて unlock() を呼べるよう、閉じるのを待たない
  reset() {
    const old = this.ctx;
    this.ctx = null;
    this.master = null;
    this.noise = null;
    if (old) old.close();
    this.state = "未準備（次に画面に触れると準備します）";
    if ("audioSession" in navigator) {
      navigator.audioSession.type = store.data.playback ? "playback" : "auto";
      this.sessionType = navigator.audioSession.type;
    }
  },

  ready() {
    return store.data.sound && this.ctx && this.ctx.state === 'running';
  },

  // 1つの音（正弦波などに音量の山を付ける）
  tone(freq, { type = 'sine', at = 0, attack = 0.005, decay = 0.4, gain = 0.3, glideTo = null } = {}) {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + decay);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  },

  // 木琴のような音（基音と、すぐ消える高い倍音）
  marimba(midi, at = 0, gain = 0.32) {
    const f = NOTE(midi);
    this.tone(f, { at, decay: 0.45, gain });
    this.tone(f * 4, { at, decay: 0.06, gain: gain * 0.35 });
  },

  // 鈴のような音
  bell(midi, at = 0, gain = 0.22) {
    const f = NOTE(midi);
    this.tone(f, { at, decay: 0.9, gain });
    this.tone(f * 2.76, { at, decay: 0.35, gain: gain * 0.4 });
  },

  tick() {
    this.tone(1650, { type: 'triangle', decay: 0.035, gain: 0.16 });
    this.tone(820, { decay: 0.05, gain: 0.08 });
  },

  hop(i) {
    this.marimba(PENTA[i % 5] - 12, 0, 0.2);
  },

  stamp() {
    if (!this.ready()) return;
    this.tone(220, { decay: 0.16, gain: 0.5, glideTo: 90 });
    this.tone(660, { decay: 0.08, gain: 0.12, glideTo: 300 });
    const ctx = this.ctx;
    if (!this.noise) {
      const len = Math.floor(ctx.sampleRate * 0.12);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.25;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  },

  // せいくらべで印を1つ越えた時（越えるたびに音が上がる）
  mark(i) {
    this.bell(PENTA[Math.min(i, PENTA.length - 1)], 0, 0.18);
  },

  // せいくらべで ふんばっている間の、どきどき（低く やわらかい2つの音）
  heart() {
    this.tone(150, { decay: 0.12, gain: 0.22, glideTo: 110 });
    this.tone(140, { at: 0.17, decay: 0.1, gain: 0.14, glideTo: 105 });
  },

  // せいくらべの じゅんび（おしりを ふりふり）。回を追うごとに音が上がる
  wiggle(i) {
    this.marimba(PENTA[i % 5] - 12, 0, 0.16);
  },

  stretch(seconds) {
    if (!this.ready()) return;
    this.tone(260, { type: 'triangle', attack: 0.15, decay: seconds, gain: 0.05, glideTo: 520 });
  },

  tap() {
    this.tone(1200, { decay: 0.04, gain: 0.08 });
  },

  // はなびら うらない：花びらを抜いた時（抜くたびに音が上がる）
  pluck(i) {
    this.tone(NOTE(PENTA[i % PENTA.length]), { decay: 0.22, gain: 0.14, glideTo: NOTE(PENTA[i % PENTA.length]) * 0.8 });
    this.tone(2400, { type: 'triangle', decay: 0.03, gain: 0.05 });
  },

  // はなびら うらない：のこり2枚の間で まよう時
  hover(i) {
    this.marimba(i % 2 ? 76 : 72, 0, 0.12);
  },

  // まねきねこ おみくじ：箱の中で棒が当たる「からから」
  rattle() {
    for (let k = 0; k < 3; k++) {
      const f = 900 + Math.random() * 700;
      this.tone(f, { type: 'triangle', at: k * 0.045 + Math.random() * 0.02, decay: 0.035, gain: 0.09 });
    }
  },

  // まねきねこ おみくじ：棒がすべり出る音と、番号が出た「ぽん」
  slide(seconds) {
    if (!this.ready()) return;
    this.tone(340, { type: 'triangle', attack: 0.05, decay: seconds, gain: 0.05, glideTo: 620 });
  },
  pop() {
    this.tone(660, { decay: 0.12, gain: 0.22, glideTo: 990 });
  },

  // あしあと あみだ：横の線が出る音と、足あと
  rung(i) {
    this.tone(NOTE(PENTA[i % 5] + 12), { type: 'triangle', decay: 0.06, gain: 0.07 });
  },
  step(i) {
    this.tone(i % 2 ? 520 : 470, { decay: 0.05, gain: 0.07, glideTo: 380 });
  },

  // お祝い：level は 1〜3。どの段階もお祝いし、段階が上がるほど音を足す（RS01-S15）
  fanfare(level = 1) {
    if (!this.ready()) return;
    const seqs = {
      1: [72, 76, 79, 84],
      2: [72, 74, 76, 79, 81, 84, 88],
      3: [72, 74, 76, 79, 81, 84, 86, 88, 91, 96],
    };
    const seq = seqs[level] || seqs[1];
    const step = level === 3 ? 0.075 : 0.09;
    seq.forEach((n, i) => this.marimba(n, i * step, 0.28));
    const end = seq.length * step;
    const chord = level === 1 ? [84, 88] : level === 2 ? [79, 84, 88] : [76, 79, 84, 88, 91];
    chord.forEach((n) => this.bell(n, end, 0.12));
    if (level === 3) [96, 100, 103].forEach((n, i) => this.bell(n, end + 0.25 + i * 0.12, 0.08));
  },
};
