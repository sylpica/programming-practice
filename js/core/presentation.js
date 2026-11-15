// Learner-facing labels. Never change the value or identity used by an engine.
// P-N1: 値の大きさの上限（Python 系統の既存ガードと同じ 200,000）。
// 文字列・配列などの値がこの上限を超えたら、実体を作らず未確定値へ倒す。
export const VALUE_LENGTH_LIMIT = 200000;
// P-N2: 状態スナップショット等の表示専用文字列の上限。超えた分は、
// 省略したことが分かる記法つきで切り詰める（値そのものは変えない）。
export const DISPLAY_LENGTH_LIMIT = 2000;
export function truncateDisplayText(text, limit = DISPLAY_LENGTH_LIMIT) {
  if (typeof text !== "string" || text.length <= limit) return text;
  const head = Math.floor(limit / 2);
  return (
    text.slice(0, head) +
    `…（全${text.length}文字のうち先頭${head}文字のみ表示し、残りは省略しました）`
  );
}
export function unknownLabel(value) {
  return "実行時に決まる：" + unknownDescription(value);
}
function cleanSource(source) {
  let text = String(source || "未確定の値");
  // Older engines compose explanations into source strings. Unwrap only their
  // uncertainty wrapper, retaining parentheses that belong to the expression.
  const prefix = "実行時に決まる";
  let at;
  while ((at = text.indexOf(prefix)) >= 0) {
    const start = at + prefix.length, open = text[start];
    if (open === "（" || open === "(") {
      const close = open === "（" ? "）" : ")";
      let depth = 1, end = start + 1;
      for (; end < text.length && depth; end++) {
        if (text[end] === open) depth++;
        if (text[end] === close) depth--;
      }
      if (!depth) { text = text.slice(0, at) + text.slice(start + 1, end - 1) + text.slice(end); continue; }
    }
    text = text.slice(0, at) + text.slice(start).replace(/^[：:]\s*/, "");
  }
  return text.replace(/\(model\)|（model）|\bmodel\b/gi, "モデルで未指定の値").trim() || "未確定の値";
}
export function unknownDescription(value, depth = 0) {
  if (depth > 12) return "未確定の式";
  if (value?.kind === "unknown") {
    if (value.op && Object.hasOwn(value, "a")) {
      const a = unknownDescription(value.a, depth + 1);
      return Object.hasOwn(value, "b") ? `${a} ${value.op} ${unknownDescription(value.b, depth + 1)}` : `${value.op} ${a}`;
    }
    return cleanSource(value.source);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  if (typeof value === "object") return "モデルの値";
  return String(value);
}
