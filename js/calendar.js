// 行事のカレンダー（RS01-S13）。2026年から2030年までの5年分を持つ。
// 季節と行事の「何日前から何日後まで」は、ここではなく予定のテキスト（yotei.txt）に書く。
//
// 日付の出どころ（詳しくは README の §4）
// - 日付が決まっている行事（fixed）：毎年同じ月日。
// - 年で日付が動く行事（moving）：節分・お月見。下の CALENDAR の日付は、天文の計算（tools/calendar.mjs）で求め、
//   資料と照らして確かめた。
// - 日付が決まっていない行事（nominal）：花見・夏祭り・花火。目安の日を置いた。資料で確かめた日付ではない。

export const YEARS = [2026, 2027, 2028, 2029, 2030];
export const FIRST_YEAR = YEARS[0];
export const LAST_YEAR = YEARS[YEARS.length - 1];

// 年で日付が動く行事の日付（日本時間）
export const CALENDAR = {
  2026: { setsubun: '2026-02-03', otsukimi: '2026-09-25' },
  2027: { setsubun: '2027-02-03', otsukimi: '2027-09-15' },
  2028: { setsubun: '2028-02-03', otsukimi: '2028-10-03' },
  2029: { setsubun: '2029-02-02', otsukimi: '2029-09-22' },
  2030: { setsubun: '2030-02-03', otsukimi: '2030-09-12' },
};

// 四季の境目（RS01-S13：月の初めで切る）
export const SEASONS = [
  { id: 'haru', name: '春', month: 3, day: 1 },
  { id: 'natsu', name: '夏', month: 6, day: 1 },
  { id: 'aki', name: '秋', month: 9, day: 1 },
  { id: 'fuyu', name: '冬', month: 12, day: 1 },
];

// 見た目を変える行事（RS01-S13 の一覧）。並びは1年の中の順
export const EVENTS = [
  { id: 'oshogatsu', name: 'お正月', kind: 'fixed', month: 1, day: 1 },
  { id: 'setsubun', name: '節分', kind: 'moving', key: 'setsubun' },
  { id: 'valentine', name: 'バレンタイン', kind: 'fixed', month: 2, day: 14 },
  { id: 'nekonohi', name: '猫の日', kind: 'fixed', month: 2, day: 22 },
  { id: 'hinamatsuri', name: 'ひな祭り', kind: 'fixed', month: 3, day: 3 },
  { id: 'hanami', name: '花見', kind: 'nominal', month: 4, day: 1 },
  { id: 'kodomonohi', name: 'こどもの日', kind: 'fixed', month: 5, day: 5 },
  { id: 'tanabata', name: '七夕', kind: 'fixed', month: 7, day: 7 },
  { id: 'natsumatsuri', name: '夏祭り・花火', kind: 'nominal', month: 8, day: 1 },
  { id: 'sekainekonohi', name: '世界猫の日', kind: 'fixed', month: 8, day: 8 },
  { id: 'otsukimi', name: 'お月見', kind: 'moving', key: 'otsukimi' },
  { id: 'manekinekonohi', name: '招き猫の日', kind: 'fixed', month: 9, day: 29 },
  { id: 'halloween', name: 'ハロウィン', kind: 'fixed', month: 10, day: 31 },
  { id: 'christmas', name: 'クリスマス', kind: 'fixed', month: 12, day: 25 },
  { id: 'omisoka', name: '大みそか', kind: 'fixed', month: 12, day: 31 },
];

// その年の行事の日（'YYYY-MM-DD'）。年で日付が動く行事で、カレンダーの範囲の外の年なら null
export function eventDate(ev, year) {
  if (ev.kind === 'moving') {
    const row = CALENDAR[year];
    return row ? row[ev.key] : null;
  }
  return `${year}-${String(ev.month).padStart(2, '0')}-${String(ev.day).padStart(2, '0')}`;
}
