// 設定の保存（端末の中だけ。外へは送らない：RS01-S04）。
// 選択肢は、おやつ決め用（snack）とコイン決め用（coin）の2組を持ち、どのゲームも同じ組を使う（RS01-S10）。
// 画面では、おやつ決め用を「おやつ」、コイン決め用を「お楽しみ袋」と呼ぶ。
// いまどちらを決めているか（purpose）も、ゲームの間で共有する。
// お楽しみ袋の選択肢には、選択肢ごとの出やすさ（coinLevels。coin と同じ並び）を持つ（RS01-S21）。
// 猫の見た目は2匹とも A の案に決まったため（RS01-S20）、保存しない。
import { DEFAULT_LEVEL, isLevel, weightsOf } from './odds.js';

const KEY = 'nekokime.settings.v3';
// 前の版の保存。v3 の保存がまだ無い時だけ、新しい版から順に探して引き継ぐ。前の版の保存は消さない
const KEY_V2 = 'nekokime.settings.v2'; // 作業回 02 の版 v2
const KEY_V1 = 'nekokime.settings.v1'; // 作業回 01 の版 v1

export const LIMITS = { min: 2, max: 12, maxChars: 8 };
export const PURPOSES = {
  snack: { name: 'おやつ', title: 'おやつの選択肢' },
  coin: { name: 'お楽しみ袋', title: 'お楽しみ袋の選択肢' },
};

const DEFAULTS = {
  snack: ['カリカリ', 'ちゅーる', 'かつおぶし', 'ささみ', 'にぼし', 'どーにゃつ'],
  coin: ['20まい', '50まい', '100まい'],
  coinLevels: [DEFAULT_LEVEL, DEFAULT_LEVEL, DEFAULT_LEVEL],
  purpose: 'snack',
  sound: true,
  playback: true,
};

// 絵文字は画面のどこにも出さない（RS01-S14）。入力された絵文字も取り除く。
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}]/gu;
export function cleanLabel(text) {
  const noEmoji = String(text).replace(EMOJI, '');
  const trimmed = noEmoji.replace(/\s+/g, ' ').trim();
  return { value: Array.from(trimmed).slice(0, LIMITS.maxChars).join(''), hadEmoji: noEmoji !== String(text) };
}

function copyDefaults() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

function validList(list) {
  return Array.isArray(list)
    && list.length >= LIMITS.min && list.length <= LIMITS.max
    && list.every((s) => typeof s === 'string' && s.length > 0);
}
const validCommon = (d) => (d.purpose in PURPOSES) && typeof d.sound === 'boolean' && typeof d.playback === 'boolean';

function validV3(d) {
  return d && validList(d.snack) && validList(d.coin) && validCommon(d)
    && Array.isArray(d.coinLevels) && d.coinLevels.length === d.coin.length && d.coinLevels.every(isLevel);
}
// v2 の保存の猫の案（cats）は読まない。v2 の端末で B・C を選んでいても、v3 では A を使う
function validV2(d) {
  return d && validList(d.snack) && validList(d.coin) && validCommon(d);
}
function validV1(d) {
  return d && validList(d.choices) && validList(d.stages) && typeof d.sound === 'boolean' && typeof d.playback === 'boolean';
}
const allDefault = (list) => list.map(() => DEFAULT_LEVEL);

export const store = {
  data: null,
  loadState: '',
  blocked: false,

  load() {
    let raw;
    let rawV2 = null;
    let rawV1 = null;
    try {
      raw = localStorage.getItem(KEY);
      if (raw === null) rawV2 = localStorage.getItem(KEY_V2);
      if (raw === null && rawV2 === null) rawV1 = localStorage.getItem(KEY_V1);
    } catch (e) {
      // 端末の保存を読めない時は、保存を止めたうえで初期の設定で動かし、設定画面にそう出す
      this.blocked = true;
      this.loadState = `端末の保存を読めません（${e.message}）。設定は保存されません`;
      this.data = copyDefaults();
      return;
    }
    if (raw === null && rawV2 === null && rawV1 === null) {
      this.data = copyDefaults();
      this.loadState = '初めて開いた';
      return;
    }
    try {
      if (raw !== null) {
        const d = JSON.parse(raw);
        if (!validV3(d)) throw new Error('保存の形が違う');
        this.data = { snack: d.snack, coin: d.coin, coinLevels: d.coinLevels, purpose: d.purpose, sound: d.sound, playback: d.playback };
        this.loadState = '端末の保存から読んだ';
      } else if (rawV2 !== null) {
        // 前の版 v2 の2組の選択肢・用途・音を引き継ぐ。お楽しみ袋の出やすさは、どれも「ふつう」から始める
        const d = JSON.parse(rawV2);
        if (!validV2(d)) throw new Error('前の版（v2）の保存の形が違う');
        this.data = { snack: d.snack, coin: d.coin, coinLevels: allDefault(d.coin), purpose: d.purpose, sound: d.sound, playback: d.playback };
        this.loadState = '前の版（v2）の保存から引き継いだ';
        this.save();
      } else {
        // 前の版 v1 の「おやつの選択肢」をおやつ決め用へ、「コインの段階」をお楽しみ袋へ引き継ぐ
        const d = JSON.parse(rawV1);
        if (!validV1(d)) throw new Error('前の版（v1）の保存の形が違う');
        this.data = { ...copyDefaults(), snack: d.choices, coin: d.stages, coinLevels: allDefault(d.stages), sound: d.sound, playback: d.playback };
        this.loadState = '前の版（v1）の保存から引き継いだ';
        this.save();
      }
    } catch (e) {
      this.blocked = true;
      this.loadState = `保存の中身を読めません（${e.message}）。設定は保存されません`;
      this.data = copyDefaults();
    }
  },

  // いま決めているものの選択肢
  list() {
    return this.data[this.data.purpose];
  },

  // いま決めているものの、選択肢ごとの重み（RS01-S21）。おやつ決め用は、どれも同じ重み
  weights() {
    if (this.data.purpose === 'coin') return weightsOf(this.data.coinLevels);
    return this.data.snack.map(() => 1);
  },

  save() {
    if (this.blocked) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
      return true;
    } catch (e) {
      this.blocked = true;
      this.loadState = `端末へ保存できません（${e.message}）`;
      return false;
    }
  },
};
