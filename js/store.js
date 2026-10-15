// 設定の保存（端末の中だけ。外へは送らない：RS01-S04）。
const KEY = 'nekokime.settings.v1';

export const LIMITS = { min: 2, max: 12, maxChars: 8 };

const DEFAULTS = {
  choices: ['カリカリ', 'ちゅるちゅる', 'かつおぶし', 'ささみ', 'にぼし', 'おさかな'],
  stages: ['20まい', '50まい', '100まい'],
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

export const store = {
  data: null,
  loadState: '',
  blocked: false,

  load() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      // 端末の保存を読めない時は、保存を止めたうえで初期の設定で動かし、設定画面にそう出す
      this.blocked = true;
      this.loadState = `端末の保存を読めません（${e.message}）。設定は保存されません`;
      this.data = copyDefaults();
      return;
    }
    if (raw === null) {
      this.data = copyDefaults();
      this.loadState = '初めて開いた';
      return;
    }
    try {
      const d = JSON.parse(raw);
      if (!validList(d.choices) || !validList(d.stages) || typeof d.sound !== 'boolean' || typeof d.playback !== 'boolean') {
        throw new Error('保存の形が違う');
      }
      this.data = { choices: d.choices, stages: d.stages, sound: d.sound, playback: d.playback };
      this.loadState = '端末の保存から読んだ';
    } catch (e) {
      this.blocked = true;
      this.loadState = `保存の中身を読めません（${e.message}）。設定は保存されません`;
      this.data = copyDefaults();
    }
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
