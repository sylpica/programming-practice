import { PracticeError } from "./script.js";
export function parseJsonLocated(source) {
  let i = 0,
    line = 1,
    locations = new Map();
  function ws() {
    while (/\s/.test(source[i] || "") && i < source.length) {
      if (source[i++] === "\n") line++;
    }
  }
  function value(path, depth = 0) {
    if (depth > 64) throw new PracticeError("JSONの入れ子が深すぎます", line);
    ws();
    locations.set(path, line);
    if (i >= source.length)
      throw new PracticeError("JSONが途中で終わっています", line);
    let start = i,
      c = source[i];
    if (c === "}" || c === "]" || c === ",")
      throw new PracticeError(
        "JSONの値が抜けています（値の位置に「" +
          c +
          "」があります。末尾のカンマの可能性があります）",
        line,
      );
    if (c === "{") {
      i++;
      let out = {};
      ws();
      if (source[i] === "}") {
        i++;
        return out;
      }
      while (true) {
        ws();
        if (i >= source.length)
          throw new PracticeError("JSONが途中で終わっています", line);
        if (source[i] === "}")
          throw new PracticeError(
            "JSONに末尾のカンマがあります（ , の直後に } があります）",
            line,
          );
        if (source[i] !== '"')
          throw new PracticeError("JSONのキーは文字列で指定してください", line);
        let key = string();
        if (["__proto__", "prototype", "constructor"].includes(key))
          throw new PracticeError(
            "このキー名は学習用モデルでは使用できません",
            line,
          );
        ws();
        if (i >= source.length)
          throw new PracticeError("JSONが途中で終わっています", line);
        if (source[i++] !== ":")
          throw new PracticeError("JSONに : が必要です", line);
        if (Object.hasOwn(out, key))
          throw new PracticeError("JSONのキーが重複しています：" + key, line);
        out[key] = value(path + "/" + key, depth + 1);
        ws();
        if (i >= source.length)
          throw new PracticeError("JSONが途中で終わっています", line);
        let end = source[i++];
        if (end === "}") return out;
        if (end !== ",")
          throw new PracticeError("JSONに , または } が必要です", line);
      }
    }
    if (c === "[") {
      i++;
      let out = [];
      ws();
      if (source[i] === "]") {
        i++;
        return out;
      }
      while (true) {
        out.push(value(path + "/" + out.length, depth + 1));
        ws();
        if (i >= source.length)
          throw new PracticeError("JSONが途中で終わっています", line);
        let end = source[i++];
        if (end === "]") return out;
        if (end !== ",")
          throw new PracticeError("JSONに , または ] が必要です", line);
      }
    }
    if (c === '"') return string();
    while (i < source.length && !/[\s,\]}]/.test(source[i])) i++;
    let token = source.slice(start, i);
    try {
      return JSON.parse(token);
    } catch {
      throw new PracticeError(
        "JSONの値が不正です：" + (token.length > 24 ? token.slice(0, 24) + "…" : token),
        line,
      );
    }
  }
  function string() {
    let start = i++;
    while (i < source.length) {
      let c = source[i++];
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') {
        try {
          return JSON.parse(source.slice(start, i));
        } catch {
          throw new PracticeError("JSONの文字列が不正です", line);
        }
      }
      if (c === "\n") line++;
    }
    throw new PracticeError("JSONの文字列が閉じられていません", line);
  }
  let data = value("");
  ws();
  if (i !== source.length)
    throw new PracticeError("JSONの末尾に余分な文字があります", line);
  return { data, locations };
}
export function rows(defs) {
  return defs.map(
    ([
      name,
      category,
      syntax,
      description,
      example,
      caution = "",
      supported = true,
    ]) => ({
      name,
      category,
      syntax,
      description,
      example,
      caution,
      supported,
    }),
  );
}
export function sourceFailure(e) {
  return {
    paths: [],
    error: {
      line: e.line || e.mark?.line + 1 || 1,
      message: e.message,
      category: e.category,
    },
    truncated: false,
  };
}
