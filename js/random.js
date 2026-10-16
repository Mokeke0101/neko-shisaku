// 結果を決める乱数（RS01-S14：結果は先に乱数で決め、動きをその結果に合わせる）。
// pickIndex は 0〜n-1 を同じ出やすさで1つ選ぶ。選択肢ごとの出やすさ（RS01-S21）は、
// これを使って js/odds.js の pickWeighted が決める。
// 32ビットの乱数を n で割った余りは、n が 2 の累乗でないと少しだけ偏るため、
// 偏りの出る端の値を捨てて引き直す（棄却法）。
export function pickIndex(n) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`選択肢の数が正しくない: ${n}`);
  const range = 0x100000000;
  const limit = range - (range % n);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

// 演出の揺らぎだけに使う乱数（結果には使わない）。
export function jitter(min, max) {
  return min + Math.random() * (max - min);
}
