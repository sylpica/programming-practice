// Learner-facing labels. Never change the value or identity used by an engine.
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
