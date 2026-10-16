// 設定の保存（端末の中だけ。外へは送らない：RS01-S04）。
// 選択肢は、おやつ決め用（snack）とコイン決め用（coin）の2組を持ち、どのゲームも同じ組を使う（RS01-S10）。
// いまどちらを決めているか（purpose）も、ゲームの間で共有する。
import { DESIGNS, DEFAULT_DESIGN } from './cats.js';

const KEY = 'nekokime.settings.v2';
// 作業回 01 の版（v1）の保存。v2 の保存がまだ無い時だけ、ここから引き継ぐ
const KEY_V1 = 'nekokime.settings.v1';

export const LIMITS = { min: 2, max: 12, maxChars: 8 };
export const PURPOSES = {
  snack: { name: 'おやつ', title: 'おやつ決めの選択肢' },
  coin: { name: 'コイン', title: 'コイン決めの選択肢' },
};

const DEFAULTS = {
  snack: ['カリカリ', 'ちゅるちゅる', 'かつおぶし', 'ささみ', 'にぼし', 'おさかな'],
  coin: ['20まい', '50まい', '100まい'],
  purpose: 'snack',
  cats: { ...DEFAULT_DESIGN },
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
const validCat = (kind, id) => DESIGNS.some((d) => d.kind === kind && d.id === id);

function validV2(d) {
  return d && validList(d.snack) && validList(d.coin) && (d.purpose in PURPOSES)
    && d.cats && validCat('mike', d.cats.mike) && validCat('saba', d.cats.saba)
    && typeof d.sound === 'boolean' && typeof d.playback === 'boolean';
}
function validV1(d) {
  return d && validList(d.choices) && validList(d.stages) && typeof d.sound === 'boolean' && typeof d.playback === 'boolean';
}

export const store = {
  data: null,
  loadState: '',
  blocked: false,

  load() {
    let raw;
    let rawV1;
    try {
      raw = localStorage.getItem(KEY);
      rawV1 = raw === null ? localStorage.getItem(KEY_V1) : null;
    } catch (e) {
      // 端末の保存を読めない時は、保存を止めたうえで初期の設定で動かし、設定画面にそう出す
      this.blocked = true;
      this.loadState = `端末の保存を読めません（${e.message}）。設定は保存されません`;
      this.data = copyDefaults();
      return;
    }
    if (raw === null && rawV1 === null) {
      this.data = copyDefaults();
      this.loadState = '初めて開いた';
      return;
    }
    try {
      if (raw !== null) {
        const d = JSON.parse(raw);
        if (!validV2(d)) throw new Error('保存の形が違う');
        this.data = { snack: d.snack, coin: d.coin, purpose: d.purpose, cats: { mike: d.cats.mike, saba: d.cats.saba }, sound: d.sound, playback: d.playback };
        this.loadState = '端末の保存から読んだ';
      } else {
        // 前の版の「おやつの選択肢」をおやつ決め用へ、「コインの段階」をコイン決め用へ引き継ぐ
        const d = JSON.parse(rawV1);
        if (!validV1(d)) throw new Error('前の版の保存の形が違う');
        this.data = { ...copyDefaults(), snack: d.choices, coin: d.stages, sound: d.sound, playback: d.playback };
        this.loadState = '前の版の保存から引き継いだ';
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
