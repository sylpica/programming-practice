/* 高度モード差分（ブロックB3・統合）: PowerShell 高度演算子の実装。
 *
 * 基礎パーサは高度モード時のみこれらの演算子を受理し（parser.js の
 * ADV_PREC／単項分岐）、基礎エンジンは有効化時のみここへ委譲する。
 * 簡易モードでは到達しない。一次情報は Microsoft Learn の
 * about_Operator_Precedence／about_Arithmetic_Operators／
 * about_Comparison_Operators／about_Split／about_Join／
 * about_Type_Operators／about_Operators（-f）。
 *
 * ctx = { s, n, api, fail, text, enumerate, scalar, isUnknown, unknown,
 *         truth, read }（engine.js のクロージャから渡される）。
 */

export const ADV_BINARY_OPS = new Set([
  "-band",
  "-bor",
  "-bxor",
  "-shl",
  "-shr",
  "-xor",
  "-replace",
  "-ireplace",
  "-creplace",
  "-split",
  "-join",
]);

const MAX_SAFE = 9007199254740991n;

/* PS の [long] 変換に倣う整数化（double は偶数丸め）。 */
function toLong(v, ctx, what) {
  const { fail, isUnknown } = ctx;
  if (isUnknown(v))
    fail("未確認：未確定値に対する " + what, ctx.n.line, "未確認");
  if (v === null || v === undefined) return 0n;
  if (typeof v === "boolean") return v ? 1n : 0n;
  if (typeof v === "number") {
    if (!Number.isFinite(v))
      fail(what + "の被演算子を整数へ変換できません：" + String(v), ctx.n.line, "RuntimeException");
    const floor = Math.floor(v),
      frac = v - floor;
    const r = frac < 0.5 ? floor : frac > 0.5 ? floor + 1 : floor % 2 === 0 ? floor : floor + 1;
    if (Math.abs(r) >= 9223372036854775808)
      fail(what + "の被演算子が Int64 の範囲を超えます", ctx.n.line, "RuntimeException");
    return BigInt(r);
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (/^0x[0-9a-f]+$/i.test(t)) return BigInt(t);
    if (/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t))
      return toLong(Number(t), ctx, what);
    fail(what + "の被演算子を整数へ変換できません：" + v, ctx.n.line, "RuntimeException");
  }
  fail(what + "の被演算子を整数へ変換できません", ctx.n.line, "RuntimeException");
}

function fromLong(r, ctx, what) {
  if (r <= MAX_SAFE && r >= -MAX_SAFE) return Number(r);
  ctx.fail(
    "未対応：" + what + "の結果がモデルの数値範囲（53ビット整数）を超えます",
    ctx.n.line,
  );
}

function bitwise(op, a, b, ctx) {
  const x = toLong(a, ctx, "ビット演算子 " + op),
    y = toLong(b, ctx, "ビット演算子 " + op);
  switch (op) {
    case "-band": return fromLong(x & y, ctx, op);
    case "-bor": return fromLong(x | y, ctx, op);
    case "-bxor": return fromLong(x ^ y, ctx, op);
    case "-shl": return fromLong(x << (y & 63n), ctx, op);
    case "-shr": return fromLong(x >> (y & 63n), ctx, op);
  }
}

function psReplace(str, pattern, replacement, ci, ctx) {
  let re;
  try {
    re = new RegExp(pattern, "g" + (ci ? "i" : ""));
  } catch {
    ctx.fail("正規表現が不正です：" + pattern, ctx.n.line, "RuntimeException");
  }
  return str.replace(re, (m, ...rest) => {
    const groups = rest.slice(0, -2);
    const named = rest[rest.length - 1] && typeof rest[rest.length - 1] === "object" ? rest[rest.length - 1] : undefined;
    const withNamed = groups;
    withNamed.named = named;
    const offset = rest[rest.length - 2];
    let out = "";
    const rep = replacement;
    for (let i = 0; i < rep.length; i++) {
      const c = rep[i];
      if (c !== "$" || i + 1 >= rep.length) { out += c; continue; }
      const nx = rep[i + 1];
      if (nx === "$") { out += "$"; i++; }
      else if (nx === "&") { out += m; i++; }
      else if (nx === "`") { out += str.slice(0, offset); i++; }
      else if (nx === "'") { out += str.slice(offset + m.length); i++; }
      else if (nx === "_") { out += str; i++; }
      else if (nx === "+") {
        for (let g = groups.length - 1; g >= 0; g--)
          if (groups[g] !== undefined) { out += groups[g]; break; }
        i++;
      } else if (nx === "{") {
        const close = rep.indexOf("}", i + 2);
        if (close > i + 2) {
          const name = rep.slice(i + 2, close);
          // FIX-PS-A（D6）: .NET 公式「Substitutions in Regular
          // Expressions」の ${name} 規則に是正する。数字のみの名前は
          // 番号グループとして解釈し（${1} はグループ1、${0} は
          // マッチ全体）、有効な名前でも番号でもない ${name} は
          // 置換せずリテラルとして残す。有効なグループがマッチに
          // 参加しなかった場合は従来どおり空文字列にする。
          if (/^\d+$/.test(name)) {
            const num = Number(name);
            if (num === 0) out += m;
            else if (num <= groups.length) out += groups[num - 1] ?? "";
            else out += "${" + name + "}";
          } else if (named && Object.hasOwn(named, name)) {
            out += named[name] ?? "";
          } else out += "${" + name + "}";
          i = close;
        } else out += c;
      } else if (/[0-9]/.test(nx)) {
        let num = nx, j = i + 1;
        if (/[0-9]/.test(rep[j + 1] || "") && groups[Number(num + rep[j + 1]) - 1] !== undefined) {
          num += rep[j + 1];
          j++;
        }
        const gv = groups[Number(num) - 1];
        out += gv === undefined ? "$" + num : gv;
        i = j;
      } else out += c;
    }
    return out;
  });
}

function replaceOp(op, a, b, ctx) {
  const { fail, text, isUnknown } = ctx;
  if (isUnknown(a) || isUnknown(b))
    fail("未確認：未確定値に対する " + op, ctx.n.line, "未確認");
  const parts = Array.isArray(b) ? b : [b];
  if (parts.length < 1 || parts.length > 2)
    fail(op + " の右辺は「パターン」または「パターン, 置換文字列」です", ctx.n.line, "RuntimeException");
  const pattern = text(parts[0], ctx.n),
    replacement = parts.length === 2 ? text(parts[1], ctx.n) : "";
  const ci = op !== "-creplace";
  const one = (v) => {
    if (isUnknown(v)) fail("未確認：未確定値に対する " + op, ctx.n.line, "未確認");
    return psReplace(text(v, ctx.n), pattern, replacement, ci, ctx);
  };
  return Array.isArray(a) ? a.map(one) : one(a);
}

function splitOne(str, re, max, ctx) {
  if (max === undefined || max === 0) return str.split(re);
  // MaxSubstrings: 最後の要素に残りをそのまま残す。
  const out = [];
  let rest = str, m;
  re.lastIndex = 0;
  while (out.length < max - 1 && (m = re.exec(rest)) !== null) {
    out.push(rest.slice(0, m.index));
    if (re.lastIndex === m.index) re.lastIndex++;
    rest = rest.slice(re.lastIndex);
    re.lastIndex = 0;
    if (m[0] === "" && rest === "") break;
  }
  out.push(rest);
  return out;
}

function splitOp(a, b, ctx) {
  const { fail, text, isUnknown } = ctx;
  if (isUnknown(a) || isUnknown(b))
    fail("未確認：未確定値に対する -split", ctx.n.line, "未確認");
  const parts = Array.isArray(b) ? b : [b];
  const delim = parts[0];
  if (typeof delim !== "string" && typeof delim !== "number")
    fail("未対応：-split の区切りが文字列ではありません（スクリプトブロック区切りは未対応）", ctx.n.line);
  let max, options = "";
  if (parts.length >= 2) {
    if (typeof parts[1] === "number") max = parts[1];
    else if (typeof parts[1] === "string") options = parts[1];
  }
  if (parts.length >= 3 && typeof parts[2] === "string") options = parts[2];
  const opts = options.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (opts.includes("righttoleft") || opts.includes("explicitcapture"))
    fail("未対応：-split のオプション " + options, ctx.n.line);
  const flags = "g" + (opts.includes("ignorecase") ? "i" : "") + (opts.includes("multiline") ? "m" : "") + (opts.includes("singleline") ? "s" : "");
  let re;
  try {
    re = new RegExp(opts.includes("simplematch") ? String(delim).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : String(delim), flags);
  } catch {
    fail("正規表現が不正です：" + String(delim), ctx.n.line, "RuntimeException");
  }
  const one = (v) => {
    if (isUnknown(v)) fail("未確認：未確定値に対する -split", ctx.n.line, "未確認");
    return splitOne(text(v, ctx.n), re, max, ctx);
  };
  if (Array.isArray(a)) return a.flatMap(one);
  return one(a);
}

function joinOp(a, b, ctx) {
  const { fail, text, isUnknown } = ctx;
  if (isUnknown(a) || isUnknown(b))
    fail("未確認：未確定値に対する -join", ctx.n.line, "未確認");
  const sep = b === null || b === undefined ? "" : text(b, ctx.n);
  const items = Array.isArray(a) ? a : [a];
  return items
    .map((v) => {
      if (isUnknown(v)) fail("未確認：未確定値に対する -join", ctx.n.line, "未確認");
      return v === null || v === undefined ? "" : text(v, ctx.n);
    })
    .join(sep);
}

/* ---- -f（書式演算子）: .NET 複合書式の部分集合 ---- */
function formatNumber(v, spec, ctx) {
  const { fail } = ctx;
  const letter = spec[0].toUpperCase(),
    prec = spec.length > 1 ? Number(spec.slice(1)) : undefined;
  if (!/^\d*$/.test(spec.slice(1)))
    fail("未対応：-f の書式指定 " + spec, ctx.n.line);
  const neg = v < 0, av = Math.abs(v);
  switch (letter) {
    case "D": {
      if (!Number.isInteger(v)) fail("書式指定 D は整数専用です", ctx.n.line, "FormatException");
      let d = String(Math.abs(v));
      if (prec !== undefined) d = d.padStart(prec, "0");
      return (neg ? "-" : "") + d;
    }
    case "X": {
      if (!Number.isInteger(v)) fail("書式指定 X は整数専用です", ctx.n.line, "FormatException");
      let h = v >= 0 ? v.toString(16) : (BigInt(v) & 0xffffffffffffffffn).toString(16);
      if (prec !== undefined) h = h.padStart(prec, "0");
      return spec[0] === "X" ? h.toUpperCase() : h;
    }
    case "F": {
      const p = prec === undefined ? 2 : prec;
      return v.toFixed(p);
    }
    case "N": {
      const p = prec === undefined ? 2 : prec;
      const fixed = av.toFixed(p),
        [ip, fp] = fixed.split(".");
      const grouped = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (neg ? "-" : "") + grouped + (fp ? "." + fp : "");
    }
    case "P": {
      const p = prec === undefined ? 2 : prec;
      return (v * 100).toFixed(p) + " %";
    }
    case "E": {
      const p = prec === undefined ? 6 : prec;
      const raw = av.toExponential(p),
        [mant, exp] = raw.split("e");
      const e = Number(exp),
        es = (e < 0 ? "-" : "+") + String(Math.abs(e)).padStart(3, "0");
      return (neg ? "-" : "") + (spec[0] === "E" ? mant.toUpperCase() : mant) + "E" + es;
    }
    case "G": {
      if (prec === undefined) return String(v);
      let g = v.toPrecision(prec);
      if (g.includes("e")) {
        const [mant, exp] = g.split("e");
        const e = Number(exp);
        g = mant + (spec[0] === "G" ? "E" : "e") + (e < 0 ? "-" : "+") + String(Math.abs(e)).padStart(2, "0");
      }
      return g;
    }
    case "C":
      fail("未検証：-f の通貨書式（C）はカルチャ依存のため確定できません", ctx.n.line, "未検証");
      break;
    default:
      fail("未対応：-f の書式指定 " + spec, ctx.n.line);
  }
}

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateTime(v, spec, ctx) {
  const p = v.properties,
    p2 = (n) => String(n).padStart(2, "0");
  if (spec.length === 1) {
    switch (spec) {
      case "s": return `${p.Year}-${p2(p.Month)}-${p2(p.Day)}T${p2(p.Hour)}:${p2(p.Minute)}:${p2(p.Second)}`;
      case "u": return `${p.Year}-${p2(p.Month)}-${p2(p.Day)} ${p2(p.Hour)}:${p2(p.Minute)}:${p2(p.Second)}Z`;
      case "o":
      case "O": return `${p.Year}-${p2(p.Month)}-${p2(p.Day)}T${p2(p.Hour)}:${p2(p.Minute)}:${p2(p.Second)}.${String(p.Millisecond).padStart(3, "0")}0000`;
      case "R":
      case "r": {
        const dow = DOW_SHORT[["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(p.DayOfWeek)];
        return `${dow}, ${p2(p.Day)} ${MON_SHORT[p.Month - 1]} ${p.Year} ${p2(p.Hour)}:${p2(p.Minute)}:${p2(p.Second)} GMT`;
      }
      default:
        ctx.fail("未検証：-f の日時標準書式 " + spec + " はカルチャのパターン依存のため確定できません", ctx.n.line, "未検証");
    }
  }
  let out = "", i = 0;
  while (i < spec.length) {
    const rest = spec.slice(i);
    let m;
    if ((m = /^yyyy/.exec(rest))) { out += String(p.Year).padStart(4, "0"); i += 4; }
    else if ((m = /^yy/.exec(rest))) { out += String(p.Year % 100).padStart(2, "0"); i += 2; }
    else if ((m = /^MM/.exec(rest))) { out += p2(p.Month); i += 2; }
    else if ((m = /^M/.exec(rest))) { out += String(p.Month); i += 1; }
    else if ((m = /^dd/.exec(rest))) { out += p2(p.Day); i += 2; }
    else if ((m = /^d/.exec(rest))) { out += String(p.Day); i += 1; }
    else if ((m = /^HH/.exec(rest))) { out += p2(p.Hour); i += 2; }
    else if ((m = /^H/.exec(rest))) { out += String(p.Hour); i += 1; }
    else if ((m = /^hh/.exec(rest))) { out += p2(((p.Hour + 11) % 12) + 1); i += 2; }
    else if ((m = /^mm/.exec(rest))) { out += p2(p.Minute); i += 2; }
    else if ((m = /^ss/.exec(rest))) { out += p2(p.Second); i += 2; }
    else if ((m = /^fff/.exec(rest))) { out += String(p.Millisecond).padStart(3, "0"); i += 3; }
    else if ((m = /^tt/.exec(rest))) { out += p.Hour < 12 ? "AM" : "PM"; i += 2; }
    else if (rest[0] === "\\" && rest.length > 1) { out += rest[1]; i += 2; }
    else { out += rest[0]; i += 1; }
  }
  return out;
}

function formatValueF(v, spec, ctx) {
  const { fail, text, isUnknown } = ctx;
  if (isUnknown(v)) fail("未確認：未確定値に対する -f", ctx.n.line, "未確認");
  if (v === null || v === undefined) return "";
  if (spec === undefined || spec === "") return text(v, ctx.n);
  if (typeof v === "string") return v; // 文字列は書式を無視する（.NET の非 IFormattable）
  if (typeof v === "boolean") return text(v, ctx.n);
  if (typeof v === "number") return formatNumber(v, spec, ctx);
  if (v && typeof v === "object" && v.psType === "DateTime") return formatDateTime(v, spec, ctx);
  fail("未対応：-f で書式指定できる値ではありません", ctx.n.line);
}

function formatOp(fmt, b, ctx) {
  const { fail, text, isUnknown } = ctx;
  if (typeof fmt !== "string") {
    if (isUnknown(fmt)) fail("未確認：未確定値に対する -f", ctx.n.line, "未確認");
    fail("-f の左辺は書式文字列です", ctx.n.line, "RuntimeException");
  }
  const values = Array.isArray(b) ? b : [b];
  let out = "", i = 0;
  while (i < fmt.length) {
    const c = fmt[i];
    if (c === "{") {
      if (fmt[i + 1] === "{") { out += "{"; i += 2; continue; }
      const close = fmt.indexOf("}", i);
      if (close < 0) fail("書式文字列の { に対応する } がありません", ctx.n.line, "FormatException");
      const inner = fmt.slice(i + 1, close);
      const m = /^(\d+)(?:\s*,\s*(-?\d+))?(?:\s*:\s*([\s\S]*))?$/.exec(inner);
      if (!m) fail("書式項目が不正です：{" + inner + "}", ctx.n.line, "FormatException");
      const idx = Number(m[1]);
      if (idx >= values.length)
        fail("書式項目のインデックスが範囲外です：" + idx, ctx.n.line, "FormatException");
      let piece = formatValueF(values[idx], m[3], ctx);
      if (m[2] !== undefined) {
        const width = Number(m[2]);
        if (piece.length < Math.abs(width))
          piece = width > 0 ? piece.padStart(width) : piece.padEnd(-width);
      }
      out += piece;
      i = close + 1;
      continue;
    }
    if (c === "}") {
      if (fmt[i + 1] === "}") { out += "}"; i += 2; continue; }
      fail("書式文字列に単独の } があります", ctx.n.line, "FormatException");
    }
    out += c;
    i++;
  }
  return out;
}

export function advBinary(op, a, b, ctx) {
  switch (op) {
    case "-band":
    case "-bor":
    case "-bxor":
    case "-shl":
    case "-shr":
      return bitwise(op, a, b, ctx);
    case "-xor": {
      const x = ctx.truth(a), y = ctx.truth(b);
      if (ctx.isUnknown(x) || ctx.isUnknown(y))
        return { ...ctx.unknown("論理条件"), op: "-xor", a: x, b: y };
      return x !== y;
    }
    case "-replace":
    case "-ireplace":
    case "-creplace":
      return replaceOp(op, a, b, ctx);
    case "-split":
      return splitOp(a, b, ctx);
    case "-join":
      return joinOp(a, b, ctx);
    case "-f":
      return formatOp(a, b, ctx);
    default:
      ctx.fail("未対応または不正なPowerShellの式：" + op, ctx.n.line, "SyntaxError");
  }
}

export function advUnary(op, v, ctx) {
  const { fail, text, isUnknown } = ctx;
  if (op === "-bnot") {
    const x = toLong(v, ctx, "ビット演算子 -bnot");
    return fromLong(~x, ctx, op);
  }
  if (op === "-split") {
    if (isUnknown(v)) fail("未確認：未確定値に対する -split", ctx.n.line, "未確認");
    const s = (v === null || v === undefined ? "" : text(v, ctx.n)).trim();
    return s === "" ? [] : s.split(/\s+/);
  }
  if (op === "-join") {
    if (isUnknown(v)) fail("未確認：未確定値に対する -join", ctx.n.line, "未確認");
    const items = Array.isArray(v) ? v : [v];
    // FIX-PS-A（D1）: 単項 -join の既定の区切りは空文字列である
    // （Microsoft Learn about_Join: 単項形は区切りなしで結合する。
    // 例 -join ("a","b","c") = "abc"）。空白区切りは二項形で
    // 区切りを明示した場合の値であり、単項形へ使ってはならない。
    return items
      .map((x) => (x === null || x === undefined ? "" : text(x, ctx.n)))
      .join("");
  }
  fail("未対応または不正なPowerShellの式：" + op, ctx.n.line, "SyntaxError");
}

/* ---- 型演算子 -is／-isnot／-as ---- */
function normalizeTypeName(raw, ctx) {
  let t = String(raw).toLowerCase().replace(/\s+/g, "");
  if (t.startsWith("system.")) t = t.slice("system.".length);
  if (t === "management.automation.pscustomobject") t = "pscustomobject";
  return t;
}

function kindOf(v, ctx) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "double";
  if (typeof v === "string") return "string";
  if (Array.isArray(v)) return "array";
  if (ctx.isUnknown(v)) return "unknown";
  if (typeof v === "object") {
    if (v.psType === "Hashtable") return "hashtable";
    if (v.psType === "DateTime") return "datetime";
    if (v.psType === "PSCustomObject") return "pscustomobject";
    if (v.psType) return v.psType.toLowerCase();
    return "object";
  }
  return "unknown";
}

const TYPE_ALIASES = {
  int: ["int", "int32"],
  long: ["long", "int64"],
  double: ["double"],
  bool: ["bool", "boolean"],
  string: ["string"],
  array: ["array"],
  hashtable: ["hashtable"],
  datetime: ["datetime"],
  pscustomobject: ["pscustomobject"],
};

export function advTypeOp(op, x, bNode, ctx) {
  const { fail, isUnknown } = ctx;
  let rawName;
  if (bNode && bNode.k === "typename") rawName = bNode.name;
  else {
    const v = ctx.read(bNode);
    if (isUnknown(v)) fail("未確認：型名が確定していません", ctx.n.line, "未確認");
    if (typeof v !== "string")
      fail("型名を解決できません（-is／-as の右辺は型リテラルか型名文字列です）", ctx.n.line, "RuntimeException");
    rawName = v;
  }
  const t = normalizeTypeName(rawName, ctx);
  if (op === "-as") {
    if (x === null || x === undefined) return null;
    if (isUnknown(x)) fail("未確認：未確定値に対する -as", ctx.n.line, "未確認");
    if (t === "array") return Array.isArray(x) ? x : [x];
    if (t === "hashtable")
      return kindOf(x, ctx) === "hashtable" ? x : null;
    if (t === "datetime") {
      if (kindOf(x, ctx) === "datetime") return x;
      fail("未検証：文字列から DateTime への -as 変換はカルチャ依存のため確定できません", ctx.n.line, "未検証");
    }
    if (t === "object") return x;
    try {
      const r = ctx.read({
        k: "cast",
        type: t,
        arg: { k: "literal", value: x, line: ctx.n.line },
        line: ctx.n.line,
      });
      return r;
    } catch (e) {
      if (e && "category" in e && e.category !== "limit") return null;
      throw e;
    }
  }
  // -is / -isnot
  if (isUnknown(x)) fail("未確認：未確定値に対する " + op, ctx.n.line, "未確認");
  const kind = kindOf(x, ctx);
  let result;
  if (t === "object") result = kind !== "null";
  else if (TYPE_ALIASES[t]) result = TYPE_ALIASES[t].includes(kind);
  else if (t === kind) result = true;
  else if (["int16", "short", "uint16", "uint32", "uint64", "single", "float", "decimal", "byte", "sbyte", "char"].includes(t))
    result = false; // モデルの数値・文字は int／double／string に集約される
  else if (t === "timespan") result = kind === "timespan";
  else
    fail("未対応：型名 " + rawName + " はモデルにありません", ctx.n.line);
  return op === "-isnot" ? !result : result;
}
