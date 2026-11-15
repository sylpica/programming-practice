import { ciGet, ciSet, fail, unquote } from "../shell/model.js";
import { isUnknown } from "../../core/contract.js";
// set /a uses signed 32-bit integers, including octal/hexadecimal literals.
export function arithmetic(source, vars, line = 1) {
  source = unquote(source.trim());
  source = source.replace(
    /^([\p{L}_][\p{L}\p{N}_]*)\s*(<<|>>|[+\-*/%&^|])=([^,]+)$/u,
    (_, name, op, rhs) => name + "=" + name + op + "(" + rhs + ")",
  );
  let i = 0,
    tokens = [];
  const re =
    /\s*(0x[0-9a-f]+|\d+|[\p{L}_][\p{L}\p{N}_]*|<<=|>>=|[+\-*/%&^|]=|<<|>>|[()+\-*/%&^|~!,=])/iuy;
  while (i < source.length) {
    if (!source.slice(i).trim()) break;
    re.lastIndex = i;
    const m = re.exec(source);
    if (!m) fail("未対応：set /a の式 " + source.slice(i), line);
    tokens.push(m[1]);
    i = re.lastIndex;
  }
  let p = 0;
  const wrap = (x) => BigInt.asIntN(32, x),
    prec = {
      "|": 1,
      "^": 2,
      "&": 3,
      "<<": 4,
      ">>": 4,
      "+": 5,
      "-": 5,
      "*": 6,
      "/": 6,
      "%": 6,
    };
  function literal(t, allowMin = false) {
    if (/^0x/i.test(t)) {
      const v = BigInt(t);
      if (v > 0xffffffffn)
        fail("未確認：set /a の定数が32ビット範囲外です", line, "未確認");
      return wrap(v);
    }
    if (/^0\d+/.test(t)) {
      if (/[89]/.test(t))
        fail("set /a の8進数が不正です：" + t, line, "SyntaxError");
      const v = BigInt("0o" + t);
      if (v > 0xffffffffn)
        fail("未確認：set /a の8進定数の範囲外", line, "未確認");
      return wrap(v);
    }
    const v = BigInt(t);
    if (v > (allowMin ? 2147483648n : 2147483647n))
      fail(
        "未確認：set /a の10進定数が符号付き32ビット範囲外です",
        line,
        "未確認",
      );
    return v;
  }
  function expr(min = 0, depth = 0) {
    if (depth > 64) fail("set /a の式が深すぎます", line, "limit");
    let t = tokens[p++],
      a;
    if (t === "(") {
      a = expr(0, depth + 1);
      if (tokens[p++] !== ")")
        fail("set /a に ) が必要です", line, "SyntaxError");
    } else if (["+", "-", "~", "!"].includes(t)) {
      a =
        t === "-" && tokens[p] === "2147483648"
          ? literal(tokens[p++], true)
          : expr(7, depth + 1);
      a = t === "-" ? -a : t === "~" ? ~a : t === "!" ? BigInt(a === 0n) : a;
    } else if (/^\d/.test(t || "")) a = literal(t);
    else if (/^[\p{L}_]/u.test(t || "")) {
      const v = ciGet(vars, t);
      if (isUnknown(v))
        fail("未確認：set /a の入力値が確定していません", line, "未確認");
      if (v === undefined || v === "") a = 0n;
      else if (/^[+-]?(?:0x[\da-f]+|\d+)$/i.test(String(v)))
        a = String(v).startsWith("-")
          ? -literal(String(v).slice(1), true)
          : literal(String(v).replace(/^\+/, ""));
      else fail("未対応：set /a で数値以外の変数を再解釈する式", line);
    } else fail("set /a に値が必要です", line, "SyntaxError");
    a = wrap(a);
    while (prec[tokens[p]] >= min) {
      const op = tokens[p++],
        b = expr(prec[op] + 1, depth + 1);
      if (["/", "%"].includes(op) && a === -2147483648n && b === -1n)
        fail("未確認：set /a の整数除算の範囲外です", line, "未確認");
      if (["/", "%"].includes(op) && b === 0n)
        fail("set /a の0除算です", line, "実行エラー");
      if (["<<", ">>"].includes(op) && (b < 0n || b > 31n))
        fail("未確認：set /a のシフト数が0〜31の範囲外です", line, "未確認");
      a = wrap(
        op === "+"
          ? a + b
          : op === "-"
            ? a - b
            : op === "*"
              ? a * b
              : op === "/"
                ? a / b
                : op === "%"
                  ? a % b
                  : op === "&"
                    ? a & b
                    : op === "|"
                      ? a | b
                      : op === "^"
                        ? a ^ b
                        : op === "<<"
                          ? a << b
                          : a >> b,
      );
    }
    return wrap(a);
  }
  let result = 0;
  do {
    let name;
    if (/^[\p{L}_]/u.test(tokens[p] || "") && tokens[p + 1] === "=") {
      name = tokens[p];
      p += 2;
    }
    result = Number(expr());
    if (name) ciSet(vars, name, String(result));
    if (tokens[p] !== ",") break;
    p++;
  } while (p < tokens.length);
  if (p !== tokens.length)
    fail("未対応：set /a の演算子／代入形式 " + tokens[p], line);
  return result;
}
