// 予定のテキスト（yotei.txt）を読み、日付ごとの季節と行事を決める（RS01-S13）。
// アプリ（設定の画面）と、依頼者が確かめる道具（tools/yotei.mjs）が、同じこの関数を使う。
//
// 期間の数え方
// - 行事：行事の日から「何日前」に始まり、行事の日から「何日後」に終わる。
// - 季節：季節の期間（境目の日から、次の季節の境目の前の日まで）のはじめから「何日前」に始まり、
//   おわりから「何日後」に終わる。0日前から 0日後まで なら、境目どおり。
//
// 重なった時の扱い（重ならないように書くのは依頼者。アプリは重なりを知らせる）
// - 季節どうしが重なった日：境目どおりの季節を出す。
// - 行事どうしが重なった日：重なった行事のうち、期間の短い行事の飾りを出す（期間の短い行事は特別日のため）。
//   期間が同じ長さの時は、要求仕様で決まっていない（RS01-S13 の保留）。仮に、行事の日がその日に近い行事を出し、
//   それも同じなら、カレンダーの一覧（js/calendar.js の EVENTS）で先にある行事を出す（依頼者が AI に任せた決め方。docs/決めたことの記録.md）。
// - 年で日付が動く行事は、カレンダーの範囲（2026〜2030年）の外の年では出さない。範囲の外の日付では、
//   アップデートが必要だと知らせる。
import { SEASONS, EVENTS, YEARS, FIRST_YEAR, LAST_YEAR, eventDate } from './calendar.js';

export const MAX_DAYS = 120;

const DAY = 86400000;
export const dayNum = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);
export function fromDayNum(n) {
  const t = new Date(n * DAY);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
export const fmt = (n) => { const { y, m, d } = fromDayNum(n); return `${y}/${m}/${d}`; };
export const fmtMD = (n) => { const { m, d } = fromDayNum(n); return `${m}/${d}`; };
const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return dayNum(y, m, d); };

// 全角の数字・記号・空白を半角へ
function normalize(s) {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
}

const NAMES = new Map([...SEASONS.map((s) => [s.name, { type: 'season', def: s }]), ...EVENTS.map((e) => [e.name, { type: 'event', def: e }])]);

// テキストを読む。誤りは行ごとに集め、1つでもあれば ok=false
export function parseYotei(text) {
  const errors = [];
  const rules = new Map();
  String(text).split(/\r?\n/).forEach((raw, i) => {
    const line = normalize(raw).replace(/[#＃].*$/, '').trim();
    if (!line) return;
    const no = i + 1;
    const m1 = line.match(/^(.+?)\s*[:：]\s*(\d+)\s*日\s*前\s*から\s*(\d+)\s*日\s*後\s*まで$/);
    const m2 = line.match(/^(.+?)\s*[:：]\s*出さない$/);
    const m = m1 || m2;
    if (!m) {
      errors.push({ line: no, text: raw.trim(), message: '書き方が違います（例：クリスマス：20日前から 0日後まで）' });
      return;
    }
    const name = m[1].trim();
    const known = NAMES.get(name);
    if (!known) {
      errors.push({ line: no, text: raw.trim(), message: `「${name}」は、季節にも行事にもありません` });
      return;
    }
    if (rules.has(name)) {
      errors.push({ line: no, text: raw.trim(), message: `「${name}」が2回書かれています（${rules.get(name).line}行目）` });
      return;
    }
    if (m2) {
      if (known.type === 'season') {
        errors.push({ line: no, text: raw.trim(), message: '季節は「出さない」にできません' });
        return;
      }
      rules.set(name, { ...known, off: true, line: no });
      return;
    }
    const before = Number(m1[2]);
    const after = Number(m1[3]);
    if (before > MAX_DAYS || after > MAX_DAYS) {
      errors.push({ line: no, text: raw.trim(), message: `日数は ${MAX_DAYS}日までです` });
      return;
    }
    rules.set(name, { ...known, before, after, off: false, line: no });
  });
  for (const name of NAMES.keys()) {
    if (!rules.has(name) && !errors.some((e) => e.text.startsWith(name))) {
      errors.push({ line: 0, text: '', message: `「${name}」が書かれていません` });
    }
  }
  return { ok: errors.length === 0, errors, rules };
}

function seasonSpan(s, idx, year) {
  const start = dayNum(year, s.month, s.day);
  const next = SEASONS[(idx + 1) % SEASONS.length];
  const nextStart = dayNum(idx + 1 < SEASONS.length ? year : year + 1, next.month, next.day);
  return { start, end: nextStart - 1 };
}

// ある年に始まる（境目または行事の日がその年にある）期間の一覧
export function periodsOfYear(parsed, year) {
  const out = [];
  SEASONS.forEach((s, idx) => {
    const r = parsed.rules.get(s.name);
    const nat = seasonSpan(s, idx, year);
    out.push({ type: 'season', id: s.id, name: s.name, year, natStart: nat.start, natEnd: nat.end, from: nat.start - r.before, to: nat.end + r.after });
  });
  for (const e of EVENTS) {
    const r = parsed.rules.get(e.name);
    if (r.off) continue;
    const iso = eventDate(e, year);
    if (!iso) { out.push({ type: 'event', id: e.id, name: e.name, year, unknown: true }); continue; }
    const d = parseIso(iso);
    out.push({ type: 'event', id: e.id, name: e.name, kind: e.kind, year, day: d, from: d - r.before, to: d + r.after });
  }
  return out;
}

// 予定のテキストに依らない、境目どおりの季節（予定のテキストを読めない時のゲームの見た目に使う）
export function naturalSeason(n) {
  const { y } = fromDayNum(n);
  for (const yy of [y - 1, y]) {
    for (let idx = 0; idx < SEASONS.length; idx++) {
      const sp = seasonSpan(SEASONS[idx], idx, yy);
      if (sp.start <= n && n <= sp.end) return SEASONS[idx];
    }
  }
  throw new Error(`季節を決められない日付: ${n}`);
}

const EVENT_ORDER = new Map(EVENTS.map((e, i) => [e.id, i]));
// 重なった行事のうち、飾りを出す行事。期間の短い順、行事の日が近い順、カレンダーの一覧の順
function pickOverlapped(events, n) {
  const len = (p) => p.to - p.from + 1;
  return [...events].sort((a, b) => (len(a) - len(b)) || (Math.abs(n - a.day) - Math.abs(n - b.day)) || (EVENT_ORDER.get(a.id) - EVENT_ORDER.get(b.id)))[0];
}

// その日の季節と行事
export function lookup(parsed, n) {
  if (!parsed.ok) return { ok: false };
  const { y } = fromDayNum(n);
  const all = [y - 1, y, y + 1].flatMap((yy) => periodsOfYear(parsed, yy)).filter((p) => !p.unknown);
  const seasons = all.filter((p) => p.type === 'season' && p.from <= n && n <= p.to);
  const events = all.filter((p) => p.type === 'event' && p.from <= n && n <= p.to);
  const natural = seasons.find((p) => p.natStart <= n && n <= p.natEnd) || all.find((p) => p.type === 'season' && p.natStart <= n && n <= p.natEnd);
  return {
    ok: true,
    season: natural,
    seasonOverlap: seasons.length > 1 ? seasons : null,
    event: events.length === 1 ? events[0] : (events.length > 1 ? pickOverlapped(events, n) : null),
    eventOverlap: events.length > 1 ? events : null,
    needsUpdate: y < FIRST_YEAR || y > LAST_YEAR,
  };
}

// カレンダーの5年（と、その前後に食い込む期間）の中の重なりをすべて出す
export function findOverlaps(parsed) {
  if (!parsed.ok) return [];
  const all = [FIRST_YEAR - 1, ...YEARS, LAST_YEAR + 1].flatMap((yy) => periodsOfYear(parsed, yy)).filter((p) => !p.unknown);
  const lo = dayNum(FIRST_YEAR, 1, 1);
  const hi = dayNum(LAST_YEAR, 12, 31);
  const out = [];
  for (const type of ['season', 'event']) {
    const list = all.filter((p) => p.type === type).sort((a, b) => a.from - b.from);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (b.from > a.to) break;
        const from = Math.max(a.from, b.from, lo);
        const to = Math.min(a.to, b.to, hi);
        if (from > to) continue;
        out.push({ type, a: a.name, b: b.name, from, to, days: to - from + 1, text: `${fmt(from)}〜${fmtMD(to)}（${to - from + 1}日）：${a.name}と${b.name}` });
      }
    }
  }
  return out.sort((x, y) => x.from - y.from);
}
