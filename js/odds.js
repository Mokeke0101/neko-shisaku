// 選択肢の出やすさ（RS01-S21）。
// - おやつ決め用：どの選択肢も同じ出やすさ。
// - お楽しみ袋（コイン決め用）：選択肢ごとに「出やすい・ふつう・出にくい」の3つから選ぶ。
// 1回のゲームで選択肢 i が出る確かさは、重み w_i を、すべての選択肢の重みの合計で割ったもの。
//
// 重みの比は、出やすい・ふつう・出にくい ＝ 6・3・1（RS01-S21。判断依頼 017 の問い1でユーザーが選んだ）。
// 変える時は、下の LEVELS の w だけを書き換える（整数にする）。
import { pickIndex } from './random.js';

export const LEVELS = [
  { id: 'often', name: '出やすい', w: 6 },
  { id: 'normal', name: 'ふつう', w: 3 },
  { id: 'rare', name: '出にくい', w: 1 },
];
// 最初の値と、前の版から引き継いだ選択肢の値（仮に決めた。判断依頼 017）
export const DEFAULT_LEVEL = 'normal';

const BY_ID = new Map(LEVELS.map((l) => [l.id, l]));
export const isLevel = (id) => BY_ID.has(id);
export const levelName = (id) => BY_ID.get(id).name;

export function weightsOf(levels) {
  return levels.map((id) => {
    const l = BY_ID.get(id);
    if (!l) throw new RangeError(`出やすさの値が正しくない: ${id}`);
    return l.w;
  });
}

// 重みに比べた出やすさで、選択肢の番号を1つ決める（RS01-S14：結果は先に乱数で決める）。
// 重みは正の整数。重みの合計 T の中から偏りなく1つを選び（pickIndex は棄却法で偏らない）、
// それが入る選択肢を返す。選択肢 i が出る確かさは、ちょうど w_i / T になる。
export function pickWeighted(weights) {
  if (!Array.isArray(weights) || weights.length < 1 || !weights.every((w) => Number.isInteger(w) && w > 0)) {
    throw new RangeError(`重みが正しくない: ${JSON.stringify(weights)}`);
  }
  const total = weights.reduce((s, w) => s + w, 0);
  let r = pickIndex(total);
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  throw new Error('ここには来ない');
}

// 「せってい」に添える割合（%）。小数点を出さない整数にし、合計を 100 にする。
// 丸め方は最大剰余法：まず切り捨て、足りない分を、切り捨てた端数の大きい順に 1 ずつ足す（端数が同じなら上の選択肢から）。
// どの選択肢も、見せる割合と丸める前の割合との差は 1 未満になる。
// 同じ出やすさの選択肢どうしでも、端数の割り振りで 1 違って見えることがある。
export function percents(weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  const exact = weights.map((w) => (w * 100) / total);
  const out = exact.map((x) => Math.floor(x + 1e-9));
  let rest = 100 - out.reduce((s, x) => s + x, 0);
  const order = exact.map((x, i) => ({ i, frac: x - out[i] })).sort((a, b) => (b.frac - a.frac) || (a.i - b.i));
  for (let k = 0; rest > 0; k++, rest--) out[order[k % order.length].i] += 1;
  return out;
}
