import { fail } from "../shell/model.js";
// Preserve physical source lines. Only complete logical commands undergo percent expansion.
export function commands(text, start = 1, expanded = false, depth = 0) {
  if (depth > 64) fail("cmdのブロックが深すぎます", start, "limit");
  const out = [];
  let begin = 0,
    line = start,
    at = start,
    paren = 0,
    quote = false;
  const emit = (end) => {
    const raw = text.slice(begin, end).trimStart();
    if (raw.trim()) out.push({ k: "cmd", raw, line: at, expanded });
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "^") {
      if (i + 1 >= text.length) fail("未対応：末尾のキャレット", line);
      if (text[i + 1] === "\n") {
        line++;
      }
      i++;
      continue;
    }
    if (c === '"') quote = !quote;
    if (!quote) {
      if (c === "(") paren++;
      if (c === ")") {
        if (--paren < 0) fail("対応する ( がありません", line, "SyntaxError");
      }
      if (c === "&" && !paren) {
        if (text[i + 1] === "&" || text[i - 1] === "&")
          fail("未対応：条件付きコマンド連結 &&", line);
        emit(i);
        begin = i + 1;
        at = line;
      }
    }
    if (c === "\n") {
      line++;
      if (!paren) {
        emit(i);
        begin = i + 1;
        at = line;
      }
    }
  }
  if (quote) fail("引用符が閉じられていません", line, "SyntaxError");
  if (paren) fail("対応する ) がありません", line, "SyntaxError");
  emit(text.length);
  return out;
}
export function block(text, line) {
  text = text.trim();
  if (!text.startsWith("("))
    return { nodes: commands(text, line, true), rest: "" };
  let depth = 0,
    quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "^") {
      i++;
      continue;
    }
    if (c === '"') quote = !quote;
    if (!quote) {
      if (c === "(") depth++;
      if (c === ")" && --depth === 0)
        return {
          nodes: commands(text.slice(1, i), line, true),
          rest: text.slice(i + 1).trim(),
          endLine: line + text.slice(0, i + 1).split("\n").length - 1,
        };
    }
  }
  fail("ブロックが閉じられていません", line, "SyntaxError");
}
export function commandRefs(raw) {
  const name = raw
    .replace(/^@/, "")
    .trim()
    .match(
      /^(echo\.?|cls|mkdir|md|rmdir|rd|del|erase|ren|rename|copy|move|find|setlocal|endlocal|set|if|for|goto|call|rem|pause|exit|cd|chdir|dir|type)\b/i,
    )?.[1]
    ?.toLowerCase();
  const canonical = {
    "echo.": "echo",
    chdir: "cd",
    mkdir: "md",
    rmdir: "rd",
    erase: "del",
    rename: "ren",
  };
  const refs = name ? [canonical[name] || name] : [];
  if (/%[^%]+%|![^!]+!/.test(raw)) refs.push("変数展開");
  return refs;
}
