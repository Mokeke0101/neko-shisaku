// 季節の BGM（v19）。依頼者が ほかの AI（Suno）で 作った 曲を、音の ファイル（audio/bgm-*.m4a・AAC）で ながす。
// - 季節ごとに 1曲（春・夏・秋・冬）と、行事の 曲（v20：9つ）。行事の 曲が ある日は 行事の 曲、ほかは その日の 季節の 曲
// - くり返し ながす。曲の 終わりの CROSS 秒は、次の くり返しの はじまりと 重ねて（クロスフェード）、とぎれずに つなぐ
//   （曲の 終わりが 大きいまま 終わる 曲も、小さくなって 終わる 曲も ある。はじめと おわりの 小さすぎる 所・無音は 先に けずる）
// - 音量は 効果音より 小さく、ゲームで 遊んでいる間は さらに 小さくする（duck）。季節が かわると 曲を ゆっくり 切りかえる
// - 「音を鳴らす」と「季節の BGM を ながす」の 両方が オンの時だけ 鳴る。アプリが 見えない時は 止める
// 音は Web Audio で 鳴らす（効果音と おなじ 通り道。消音モードでも鳴らす 設定に したがう）。ファイルは sw.js が 端末に 保存する
import { store } from './store.js';
import { audio } from './audio.js';

export const TRACKS = {
  haru: './audio/bgm-haru.m4a',
  natsu: './audio/bgm-natsu.m4a',
  aki: './audio/bgm-aki.m4a',
  fuyu: './audio/bgm-fuyu.m4a',
  // 行事（v20。依頼者が Suno で 作った。大きさは 季節の 曲に そろえて 変換した）
  valentine: './audio/bgm-valentine.m4a',
  hinamatsuri: './audio/bgm-hinamatsuri.m4a',
  hanami: './audio/bgm-hanami.m4a',
  kodomonohi: './audio/bgm-kodomonohi.m4a',
  tanabata: './audio/bgm-tanabata.m4a',
  natsumatsuri: './audio/bgm-natsumatsuri.m4a',
  halloween: './audio/bgm-halloween.m4a',
  christmas: './audio/bgm-christmas.m4a',
  nekonohi: './audio/bgm-nekonohi.m4a',
};
const VOL = 0.22; // BGM 全体の 音量（効果音の master の 中で。曲は 大きめに 作られているので 下げる）
const DUCK = 0.45; // 遊んでいる間の 下げ方
const CROSS = 3; // くり返しの つなぎ目で 重ねる 秒
const FADE_IN = 1.5;

// 曲の 中の 鳴らす はんい：はじめと おわりの 小さすぎる（いちばん 大きい所より 30dB 下）所を けずる
export function trimOf(buffer) {
  const d = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const win = Math.floor(rate / 4);
  let peak = 0;
  const env = [];
  for (let i = 0; i + win <= d.length; i += win) {
    let s = 0;
    for (let k = i; k < i + win; k += 4) s += d[k] * d[k];
    const v = Math.sqrt(s / (win / 4));
    env.push(v);
    peak = Math.max(peak, v);
  }
  const floor = peak * Math.pow(10, -30 / 20);
  let last = env.length - 1;
  while (last > 0 && env[last] < floor) last--;
  let first = 0;
  while (first < last && env[first] < floor) first++;
  return { start: Math.max(0, first * 0.25 - 0.1), end: Math.min(buffer.duration, (last + 1) * 0.25) };
}

export const bgm = {
  ctx: null,
  out: null,
  want: 'haru',
  playing: null, // いま 鳴らしている 曲の id
  buffers: {}, // id → { ctx, buffer, trim }
  loading: {},
  voices: [], // 重なって 鳴っている 音（つなぎ目では 2つ）
  timer: 0,
  ducked: false,
  state: 'off',

  enabled() {
    return store.data.sound && store.data.bgm !== false && !document.hidden;
  },

  trackFor(season, event) {
    return TRACKS[event] ? event : TRACKS[season] ? season : 'haru';
  },

  // 曲を きめる（look が かわった時）。鳴っていれば ゆっくり 切りかえる
  setLook(season, event) {
    const id = this.trackFor(season, event);
    if (id === this.want) return;
    this.want = id;
    if (this.state !== 'off') this.restart();
  },

  // 画面に 触れた後（audio.unlock の 後）に 呼ぶ。鳴らす 条件が そろっていれば はじめる
  sync() {
    if (!this.enabled() || !audio.ready()) { this.stop(); return; }
    if (this.ctx !== audio.ctx) this.stop();
    if (this.state === 'off') this.start();
  },

  async load(id) {
    const ctx = this.ctx;
    const have = this.buffers[id];
    if (have && have.ctx === ctx) return have;
    if (!this.loading[id] || this.loading[id].ctx !== ctx) {
      const p = fetch(TRACKS[id])
        .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.arrayBuffer(); })
        .then((a) => new Promise((ok, ng) => ctx.decodeAudioData(a, ok, ng)))
        .then((buffer) => { const v = { ctx, buffer, trim: trimOf(buffer) }; this.buffers[id] = v; return v; });
      this.loading[id] = { ctx, p };
    }
    return this.loading[id].p;
  },

  async start() {
    const ctx = audio.ctx;
    this.ctx = ctx;
    this.state = 'loading';
    this.out = ctx.createGain();
    this.out.gain.value = VOL * (this.ducked ? DUCK : 1);
    this.out.connect(audio.master);
    const id = this.want;
    let track;
    try {
      track = await this.load(id);
    } catch (e) {
      this.state = 'off';
      document.body.dataset.bgm = `error:${e.message || e}`;
      return;
    }
    // 読み込む間に 止められた・曲が かわった 時は はじめない
    if (this.state !== 'loading' || this.ctx !== ctx || id !== this.want) return;
    this.state = 'playing';
    this.playing = id;
    document.body.dataset.bgm = id;
    this.voice(track, ctx.currentTime + 0.05, FADE_IN);
  },

  // 1回ぶんを 鳴らす。終わりの CROSS 秒 前に 次の 1回を 重ねて はじめる
  voice(track, at, fadeIn) {
    const ctx = this.ctx;
    const { buffer, trim } = track;
    const len = trim.end - trim.start;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(1, at + fadeIn);
    const endAt = at + len;
    g.gain.setValueAtTime(1, endAt - CROSS);
    g.gain.linearRampToValueAtTime(0.0001, endAt);
    src.connect(g).connect(this.out);
    src.start(at, trim.start, len);
    const v = { src, g };
    this.voices.push(v);
    src.onended = () => { this.voices = this.voices.filter((x) => x !== v); try { g.disconnect(); } catch (e) { /* もう はずれている */ } };
    // 次の 1回（つなぎ目で 重ねる）を、その 少し前に 予約する
    clearTimeout(this.timer);
    const nextAt = endAt - CROSS;
    this.timer = setTimeout(() => {
      if (this.state === 'playing' && this.ctx === ctx && this.playing === this.want) this.voice(track, nextAt, CROSS);
    }, Math.max(0, (nextAt - ctx.currentTime - 1) * 1000));
  },

  stop() {
    clearTimeout(this.timer);
    this.timer = 0;
    const ctx = this.ctx;
    if (this.out && ctx && ctx.state !== 'closed') {
      const o = this.out;
      const vs = this.voices;
      try { o.gain.cancelScheduledValues(ctx.currentTime); o.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25); } catch (e) { /* 閉じた後 */ }
      setTimeout(() => { vs.forEach((v) => { try { v.src.stop(); } catch (e) { /* もう 止まった */ } }); try { o.disconnect(); } catch (e) { /* もう はずれている */ } }, 1500);
    }
    this.voices = [];
    this.out = null;
    this.ctx = null;
    this.playing = null;
    this.state = 'off';
    document.body.dataset.bgm = 'off';
  },

  restart() {
    this.stop();
    setTimeout(() => this.sync(), 1200);
  },

  duck(on) {
    this.ducked = on;
    if (!this.out || !this.ctx) return;
    this.out.gain.setTargetAtTime(VOL * (on ? DUCK : 1), this.ctx.currentTime, 0.3);
  },
};
