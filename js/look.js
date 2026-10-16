// いまの季節と行事の見た目（RS01-S13）。
// 起動した時は端末の日付で季節だけを決め（予定のテキストを読む前に、まちがった季節の絵を出さないため）、
// 予定のテキストを読み終えたら、季節と行事を決め直す。決め直すと、絵を描き直す。
export const look = { season: 'aki', event: '' };

const subs = [];
export function setLook(season, event) {
  look.season = season || 'aki';
  look.event = event || '';
  subs.forEach((f) => f(look));
}
export const onLook = (f) => { subs.push(f); };

// 季節の よみ（画面の言葉に使う）
export const SEASON_KANA = { haru: 'はる', natsu: 'なつ', aki: 'あき', fuyu: 'ふゆ' };
