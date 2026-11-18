// 契約上の配置：advanced-interface.md 第5章の予約名 advanced-engine.js に置く。
// applyAdvancedEngine フックの具体仕様は同書 R-3 で未決のため、現時点では
// c-family.js 末尾の managed 限定委譲ブロックからの静的合成で接続している
// （意味論は全て本ファイルに分離済みで、フック確定時は配線のみの移行になる）。
// 高度モード ブロックB5（C# エンジン班）：高度側の呼び出し意味論テーブル。
//
// c-family.js の call ディスパッチ末尾（managed 限定ブロック）からだけ
// 呼ばれる。このファイルは c-family.js を import しない（循環回避）。
// 必要な内部ヘルパ（typeOf 等）はフック側から引数オブジェクトで渡される。
//
// 意味論の一次情報は Microsoft Learn と ~/dotnet（SDK 8.0.428）実走。
// 検証できなかった形・モデル化できない形は、値を捏造せず api.fail で
// 名指し停止する（未対応／未確認）。
//
// 到達可能性の前提（現行パーサの制約。いずれも解析段階で先に止まるため
// 本テーブルには届かない）：
//  - ジェネリック型の宣言（List<int> 等）と var 宣言は解析で未対応停止。
//    そのため List／Dictionary 等の値は LINQ の ToList／ToHashSet が
//    生成する形でのみ現れ、変数には格納できない（インライン利用のみ）。
//  - new StringBuilder()／new DateTime() 等の構築と、その型の宣言も
//    解析・構築評価で未対応停止。StringBuilder／Random／Queue／Stack／
//    Dictionary のインスタンスは生成経路が無く、本テーブルでも未対応。
//  - ラムダ式は解析で「ラムダ式／アロー関数」として名指し停止される。
//   述語・セレクタを取るオーバーロードは本テーブルでも名指し未対応。
//  - 列挙型引数（StringComparison 等）は引数評価で未定義名として止まる。
//  - out 引数を取る TryParse は int／double 以外、解析段階で止まる。
//  - プロパティ読み取り（.Length 以外）は call ではないため本テーブル
//    の対象外。DateTime／TimeSpan の値は own プロパティとして各成分を
//    保持し、既存のメンバー読み取り経路（hasOwn）で読める形にしてある。

const CS_SYSTEM_NAMES = {
  int: "Int32", long: "Int64", double: "Double", float: "Single",
  bool: "Boolean", char: "Char", string: "String", byte: "Byte",
  sbyte: "SByte", short: "Int16", ushort: "UInt16", uint: "UInt32",
  ulong: "UInt64",
};
// 呼び出し表記（エイリアス／CLR名）→ 正規型名
const TYPE_ALIASES = {
  string: "String", String: "String",
  Math: "Math", Console: "Console", Convert: "Convert", Array: "Array",
  Char: "Char", char: "Char",
  int: "Int32", Int32: "Int32",
  long: "Int64", Int64: "Int64",
  short: "Int16", Int16: "Int16",
  byte: "Byte", Byte: "Byte",
  sbyte: "SByte", SByte: "SByte",
  uint: "UInt32", UInt32: "UInt32",
  ulong: "UInt64", UInt64: "UInt64",
  ushort: "UInt16", UInt16: "UInt16",
  double: "Double", Double: "Double",
  float: "Single", Single: "Single",
  decimal: "Decimal", Decimal: "Decimal",
  bool: "Boolean", Boolean: "Boolean",
  DateTime: "DateTime", TimeSpan: "TimeSpan",
  Enumerable: "Enumerable", CultureInfo: "CultureInfo",
  Object: "Object", object: "Object",
  StringBuilder: "StringBuilder", Random: "Random",
};
const DOTTED_TYPES = {};
for (const [k, v] of Object.entries(TYPE_ALIASES)) {
  DOTTED_TYPES[k] = v;
  DOTTED_TYPES["System." + k] = v;
}
DOTTED_TYPES["System.Linq.Enumerable"] = "Enumerable";
DOTTED_TYPES["System.Globalization.CultureInfo"] = "CultureInfo";
DOTTED_TYPES["System.Text.StringBuilder"] = "StringBuilder";

const INT_RANGES = {
  Byte: [0n, 255n], SByte: [-128n, 127n],
  Int16: [-32768n, 32767n], UInt16: [0n, 65535n],
  Int32: [-2147483648n, 2147483647n], UInt32: [0n, 4294967295n],
  Int64: [-(2n ** 63n), 2n ** 63n - 1n], UInt64: [0n, 2n ** 64n - 1n],
};
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

export function handleAdvancedCall(ctx) {
  const { args, values, s, api, node } = ctx;
  const H = {
    typeOf: ctx.typeOf, isUnknown: ctx.isUnknown, unknown: ctx.unknown,
    csDoubleText: ctx.csDoubleText, csFloatText: ctx.csFloatText,
    csArrayTypeName: ctx.csArrayTypeName, csArrayShape: ctx.csArrayShape,
    callName: ctx.callName,
  };
  const fail = (msg, category) => api.fail(msg, node, category);
  const unsupported = (what) => fail(`${what} は未対応です`, "未対応");
  if (!node?.target || node.target.k !== "member") return null;
  const method = node.target.name;
  const receiverNode = node.target.target;
  // ---- 静的呼び出し（型名.メンバー） ----
  const recvName = H.callName(receiverNode);
  const staticType = DOTTED_TYPES[recvName];
  if (staticType) {
    return dispatchStatic(staticType, method, { ctx, H, fail, unsupported });
  }
  // ---- インスタンス呼び出し ----
  const receiver = api.read(receiverNode, s);
  return dispatchInstance(receiver, receiverNode, method, { ctx, H, fail, unsupported });
}

// ================= 共通ユーティリティ =================
function isUnk(H, v) {
  return H.isUnknown(v) || (v && typeof v === "object" && v.kind === "uninitialized");
}
function cultureCompare(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  const r = String(a).localeCompare(String(b), "en-US");
  return r < 0 ? -1 : r > 0 ? 1 : 0;
}
function valueEquals(a, b) {
  if (typeof a === "number" && typeof b === "number")
    return a === b || (Number.isNaN(a) && Number.isNaN(b));
  if (a && b && typeof a === "object" && typeof b === "object") {
    if (a.__adv === "DateTime" && b.__adv === "DateTime") return a.__keyMs === b.__keyMs;
    if (a.__adv === "TimeSpan" && b.__adv === "TimeSpan") return a.TotalMilliseconds === b.TotalMilliseconds;
    return a === b;
  }
  return a === b;
}
function compareValues(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a)) return Number.isNaN(b) ? 0 : -1;
    if (Number.isNaN(b)) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof a === "string" && typeof b === "string") return cultureCompare(a, b);
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
  if (a?.__adv === "DateTime" && b?.__adv === "DateTime")
    return a.__keyMs < b.__keyMs ? -1 : a.__keyMs > b.__keyMs ? 1 : 0;
  if (a?.__adv === "TimeSpan" && b?.__adv === "TimeSpan")
    return a.TotalMilliseconds < b.TotalMilliseconds ? -1 : a.TotalMilliseconds > b.TotalMilliseconds ? 1 : 0;
  return null; // 比較不能
}
function defaultOf(elemAlias) {
  if (["string", "String"].includes(elemAlias)) return null;
  if (elemAlias === "bool") return false;
  if (elemAlias === "char") return "\u0000";
  if (elemAlias === "DateTime") return makeDateTimeRaw(1, 1, 1, 0, 0, 0, 0);
  if (elemAlias === "TimeSpan") return makeTimeSpan(0);
  if (["int", "long", "short", "byte", "sbyte", "uint", "ulong", "ushort", "double", "float"].includes(elemAlias)) return 0;
  return null;
}
function elemAliasOf(H, arrNode, s, arrValue) {
  const shape = H.csArrayShape(arrNode, s, null);
  if (shape?.elem) return shape.elem;
  if (Array.isArray(arrValue)) {
    for (const x of arrValue) {
      if (x === null || x === undefined) continue;
      if (typeof x === "string") return "string";
      if (typeof x === "boolean") return "bool";
      if (typeof x === "number") return Number.isInteger(x) ? "int" : "double";
      if (x?.__adv === "DateTime") return "DateTime";
      if (x?.__adv === "TimeSpan") return "TimeSpan";
      return null;
    }
  }
  return null;
}
function roundHalfEven(x, digits) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** digits;
  const y = x * f;
  if (Math.abs(y) > 2 ** 53) return x;
  const i = Math.floor(y);
  const diff = y - i;
  let r;
  if (diff > 0.5) r = i + 1;
  else if (diff < 0.5) r = i;
  else r = i % 2 === 0 ? i : i + 1;
  return r / f;
}
// CS-F07 処置：カスタム数値書式（0／# プレースホルダ、小数点、
// 桁区切り ,、パーセント % の組み合わせのみ対応）。規則は全て
// dotnet 8.0.428 実走で裏付けた：
//  - 丸めは最短10進桁に対する half-away-from-zero（2.5→3、0.125→0.13、
//    5.25→5.3。JS の toFixed や銀行丸めとは異なる）。
//  - % は出現回数だけ100倍し、位置（接頭／接尾）にそのまま出す。
//  - 整数部末尾の連続 , は1000ずつのスケーリング、それ以外の , は
//    桁区切りを有効化する（区切り位置自体は無視される）。
//  - 整数部の 0 は最小桁数のゼロ埋め（位置対応）、# は有意な桁だけ。
//    整数部が 0 で 0 プレースホルダが無ければ整数部は空になる。
//  - 小数部の # に対応する末尾 0 は省かれ、全て省かれたら小数点も出ない。
//  - NaN／Infinity は書式を無視して記号を返す。負号は桁がある場合だけ
//    先頭に付く（"#" での -0.4 は空文字列）。
function incrementDigitString(d) {
  const a = d.split("");
  let i = a.length - 1;
  while (i >= 0 && a[i] === "9") { a[i] = "0"; i--; }
  if (i < 0) return "1" + a.join("");
  a[i] = String(Number(a[i]) + 1);
  return a.join("");
}
function formatCustomNumeric(H, v, format, fail) {
  const unsupportedFmt = () =>
    fail(`カスタム数値書式 '${format}' は未対応です（対応しているのは 0／#／小数点／桁区切り／% の組み合わせだけです）`, "未対応");
  if (Number.isNaN(v)) return "NaN";
  if (v === Infinity) return "Infinity";
  if (v === -Infinity) return "-Infinity";
  const neg = v < 0 || Object.is(v, -0);
  const firstPh = format.search(/[0#]/);
  const lastPh = Math.max(format.lastIndexOf("0"), format.lastIndexOf("#"));
  let pctCount = 0, pctPrefix = "", pctSuffix = "";
  for (let i = 0; i < format.length; i++) {
    if (format[i] !== "%") continue;
    pctCount++;
    if (firstPh === -1 || i < firstPh) pctPrefix += "%";
    else if (i > lastPh) pctSuffix += "%";
    else unsupportedFmt(); // プレースホルダの間の % は範囲外
  }
  const dotAt = format.indexOf(".");
  if (dotAt >= 0 && format.indexOf(".", dotAt + 1) >= 0) unsupportedFmt();
  const intSection = dotAt >= 0 ? format.slice(0, dotAt) : format;
  const fracSection = dotAt >= 0 ? format.slice(dotAt + 1) : "";
  const intPh = [...intSection].filter((c) => c === "0" || c === "#");
  const fracPh = [...fracSection].filter((c) => c === "0" || c === "#");
  let scaling = 0;
  for (let i = intSection.length - 1; i >= 0 && intSection[i] === ","; i--) scaling++;
  const grouping = (scaling ? intSection.slice(0, -scaling) : intSection).includes(",");
  const fracLen = fracPh.length;
  // 最短10進桁（toExponential の最短表現）で |v| = digits × 10^e と表す。
  let digits, e;
  if (v === 0) { digits = "0"; e = 0; }
  else {
    const m = /^(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(Math.abs(v).toExponential());
    digits = ((m[1] + (m[2] || "")).replace(/0+$/, "") || "0");
    e = parseInt(m[3], 10) - (digits.length - 1);
  }
  // %（×100^回数）とスケーリング（÷1000^個数）を指数へ反映し、
  // 小数 fracLen 桁へ half-away-from-zero で丸める。
  const shift = e + 2 * pctCount - 3 * scaling + fracLen;
  let rounded;
  if (shift >= 0) rounded = digits + "0".repeat(shift);
  else {
    const cut = -shift;
    if (cut > digits.length) rounded = "0";
    else if (cut === digits.length) rounded = digits[0] >= "5" ? "1" : "0";
    else {
      const keep = digits.slice(0, digits.length - cut);
      rounded = digits[digits.length - cut] >= "5" ? incrementDigitString(keep) : keep;
    }
  }
  rounded = rounded.replace(/^0+(?=\d)/, "");
  let intDigits = rounded, fracDigits = "";
  if (fracLen > 0) {
    const padded = rounded.padStart(fracLen + 1, "0");
    intDigits = padded.slice(0, padded.length - fracLen).replace(/^0+(?=\d)/, "");
    fracDigits = padded.slice(padded.length - fracLen);
  }
  let intText;
  if (intPh.length === 0 && fracPh.length === 0) {
    intText = ""; // プレースホルダが全く無い書式は桁を出さない（dotnet 実測）
  } else if (intDigits === "0") {
    intText = intPh.map((p) => (p === "0" ? "0" : "")).join("");
  } else if (intDigits.length >= intPh.length) {
    intText = intDigits;
  } else {
    intText = intPh.slice(0, intPh.length - intDigits.length)
      .map((p) => (p === "0" ? "0" : "")).join("") + intDigits;
  }
  if (grouping && intText.length > 3)
    intText = intText.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let fracEnd = fracDigits.length;
  while (fracEnd > 0 && fracPh[fracEnd - 1] === "#" && fracDigits[fracEnd - 1] === "0") fracEnd--;
  const fracText = fracDigits.slice(0, fracEnd);
  const hasDigits = intText !== "" || fracText !== "";
  return (neg && hasDigits ? "-" : "") + pctPrefix + intText +
    (fracText !== "" ? "." + fracText : "") + pctSuffix;
}
// .NET 書式指定（F/D/X/E/G/N/P）による数値書式。C（通貨）はカルチャ依存のため未対応。
function formatNumeric(H, v, format, fail) {
  if (format === undefined || format === null || format === "") {
    if (typeof v === "number" && !Number.isInteger(v)) return H.csDoubleText(v);
    return Object.is(v, -0) ? "-0" : String(v);
  }
  // CS-F07：0／#／.／,／% だけで構成される書式はカスタム数値書式として処理する。
  if (/^[0#.,%]+$/.test(format)) return formatCustomNumeric(H, v, format, fail);
  const m = /^([a-zA-Z])(\d*)$/.exec(format.trim());
  if (!m)
    fail(`書式 '${format}' は未対応です（対応しているのは標準書式指定と、0／#／小数点／桁区切り／% のカスタム書式だけです）`, "未対応");
  const spec = m[1].toUpperCase();
  const digits = m[2] === "" ? null : parseInt(m[2], 10);
  const isIntegerValued = typeof v === "number";
  if (!isIntegerValued) fail("数値でない値に数値書式は使えません", "FormatException");
  switch (spec) {
    case "F": {
      const d = digits ?? 2;
      return v.toFixed(d);
    }
    case "N": {
      const d = digits ?? 2;
      const fixed = Math.abs(v).toFixed(d);
      const [ip, fp] = fixed.split(".");
      const grouped = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (v < 0 ? "-" : "") + grouped + (fp !== undefined ? "." + fp : "");
    }
    case "P": {
      const d = digits ?? 2;
      return (v * 100).toFixed(d) + " %";
    }
    case "D": {
      if (!Number.isInteger(v)) fail("D 書式は整数専用です", "FormatException");
      const d = digits ?? 0;
      const neg = v < 0;
      let t = String(Math.abs(v));
      if (t.length < d) t = "0".repeat(d - t.length) + t;
      return (neg ? "-" : "") + t;
    }
    case "X": case "x": {
      if (!Number.isInteger(v)) fail("X 書式は整数専用です", "FormatException");
      const width = !Number.isSafeInteger(v) || Math.abs(v) > 4294967295 ? 64 : 32;
      let hex = BigInt.asUintN(width, BigInt(v)).toString(16);
      if (spec === "X") hex = hex.toUpperCase();
      const d = digits ?? 0;
      if (hex.length < d) hex = "0".repeat(d - hex.length) + hex;
      return hex;
    }
    case "E": case "e": {
      const d = digits ?? 6;
      const [mant, exp] = v.toExponential(d).split("e");
      const ev = parseInt(exp, 10);
      return `${spec === "E" ? mant.toUpperCase() : mant}E${ev >= 0 ? "+" : "-"}${String(Math.abs(ev)).padStart(3, "0")}`;
    }
    case "G": case "g":
      return Number.isInteger(v) ? String(v) : H.csDoubleText(v);
    case "C":
      fail("C 書式（通貨）はカルチャ依存のため未対応です", "未対応");
      break;
    default:
      fail(`書式指定 '${format}' は未対応です`, "FormatException");
  }
  return String(v);
}
// __adv 値の既定 ToString 表示（表示修正の正本。c-family.js の
// transformDisplay／Console.WriteLine／文字列連結からも共有する）。
// DateTime は引数なし ToString（"G" 相当：MM/dd/yyyy HH:mm:ss）、
// TimeSpan は "c" 書式、List／HashSet はジェネリック型名を返す。
// 書式化は既存の dateTimeToString／timeSpanToString を再利用し、
// __adv を持たない値・対象外の種別には null を返す。
export function advancedValueText(value) {
  if (!value || typeof value !== "object") return null;
  switch (value.__adv) {
    case "DateTime": return dateTimeToString(value, null, null);
    case "TimeSpan": return timeSpanToString(value, null, null);
    case "List": return `System.Collections.Generic.List\`1[System.${value.__elem || "Object"}]`;
    case "HashSet": return `System.Collections.Generic.HashSet\`1[System.${value.__elem || "Object"}]`;
    default: return null;
  }
}
// 値の .NET 式文字列化（Concat／Format／Console.Write 等で共有）
function csToString(H, v, argNode, s) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "string") return v;
  if (typeof v === "number") {
    const t = argNode ? H.typeOf(argNode, s) : "int";
    if (t === "float") return H.csFloatText(v);
    if (t === "double" || !Number.isInteger(v)) return H.csDoubleText(v);
    return Object.is(v, -0) ? "-0" : String(v);
  }
  const advText = advancedValueText(v);
  if (advText !== null) return advText;
  if (Array.isArray(v)) {
    return H.csArrayTypeName(argNode, v, s, argNode ? H.typeOf(argNode, s) : null) ?? "System.Object[]";
  }
  if (v?.__class) return v.__class;
  return String(v);
}
function stringFormat(H, fmt, argVals, argNodes, s, fail) {
  let out = "";
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i];
    if (c === "{") {
      if (fmt[i + 1] === "{") { out += "{"; i++; continue; }
      const close = fmt.indexOf("}", i);
      if (close < 0) fail("書式文字列の '{' に対応する '}' がありません", "FormatException");
      const inner = fmt.slice(i + 1, close);
      const m = /^(\d+)\s*(?:,\s*(-?\d+)\s*)?(?::([\s\S]*))?$/.exec(inner);
      if (!m) fail(`書式項目 '{${inner}}' が正しくありません`, "FormatException");
      const idx = parseInt(m[1], 10);
      if (idx >= argVals.length) fail("書式インデックスが引数の範囲外です", "FormatException");
      const v = argVals[idx];
      const an = argNodes[idx];
      let text;
      if (isUnk(H, v)) return H.unknown("未確定の値を含む書式結果");
      if (v?.__adv === "DateTime") text = dateTimeToString(v, m[3] ?? null, fail);
      else if (v?.__adv === "TimeSpan") text = timeSpanToString(v, m[3] ?? null, fail);
      else if (typeof v === "number" && m[3] !== undefined) text = formatNumeric(H, v, m[3], fail);
      else text = csToString(H, v, an, s);
      if (m[2] !== undefined) {
        const width = parseInt(m[2], 10);
        if (text.length < Math.abs(width))
          text = width > 0 ? " ".repeat(width - text.length) + text : text + " ".repeat(-width - text.length);
      }
      out += text;
      i = close;
      continue;
    }
    if (c === "}") {
      if (fmt[i + 1] === "}") { out += "}"; i++; continue; }
      fail("書式文字列に単独の '}' があります", "FormatException");
    }
    out += c;
  }
  return out;
}
// ================= Parse 系 =================
function parseInteger(text, typeName, fail) {
  if (text === null || text === undefined) fail("値が null です", "ArgumentNullException");
  if (typeof text !== "string") fail("Parse の引数は文字列です", "CompileError");
  const t = text.trim();
  if (!/^[+-]?\d+$/.test(t)) fail(`文字列 '${text}' は ${typeName} の形式ではありません`, "FormatException");
  const big = BigInt(t);
  const [min, max] = INT_RANGES[typeName];
  if (big < min || big > max) fail(`${typeName} の範囲外です`, "OverflowException");
  if (big > MAX_SAFE || big < -MAX_SAFE) return { big };
  return Number(big);
}
function parseDoubleValue(text, fail) {
  if (text === null || text === undefined) fail("値が null です", "ArgumentNullException");
  if (typeof text !== "string") fail("Parse の引数は文字列です", "CompileError");
  const t = text.trim();
  const lower = t.toLowerCase();
  const signless = lower.replace(/^[+-]/, "");
  if (signless === "nan") return NaN;
  if (signless === "infinity") return lower.startsWith("-") ? -Infinity : Infinity;
  if (!/^[+-]?(?:\d[\d,]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(t))
    fail(`文字列 '${text}' は数値の形式ではありません`, "FormatException");
  return Number(t.replace(/,/g, ""));
}
function parseBoolValue(text, fail) {
  if (text === null || text === undefined) fail("値が null です", "ArgumentNullException");
  if (typeof text !== "string") fail("Parse の引数は文字列です", "CompileError");
  const t = text.trim().toLowerCase();
  if (t === "true") return true;
  if (t === "false") return false;
  fail(`文字列 '${text}' は Boolean の形式ではありません`, "FormatException");
}

// ================= DateTime / TimeSpan 値表現 =================
// DateTime: { __adv:"DateTime", Year, Month, Day, Hour, Minute, Second,
//   Millisecond, DayOfYear, DayOfWeek(英語名), Kind:"Unspecified",
//   Date(真夜中の自分・循環参照), TimeOfDay(TimeSpan表現),
//   Ticks(未確定値), __keyMs(紀元からのミリ秒・比較/演算用) }
// TimeSpan: { __adv:"TimeSpan", Days..Milliseconds(符号付き成分),
//   TotalDays..TotalMilliseconds, Ticks }
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = MONTH_NAMES.map((x) => x.slice(0, 3));
const DOW_SHORT = DOW_NAMES.map((x) => x.slice(0, 3));
function isLeap(y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0); }
function daysInMonth(y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
function daysFromCivil(y, m, d) {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}
function civilFromDays(z0) {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return [y + (m <= 2 ? 1 : 0), m, d];
}
function makeDateTimeRaw(y, mo, d, h, mi, se, msFloat) {
  const days = daysFromCivil(y, mo, d);
  const keyMs = days * 86400000 + h * 3600000 + mi * 60000 + se * 1000 + msFloat;
  const dow = (((days + 4) % 7) + 7) % 7;
  const obj = {
    __adv: "DateTime",
    Year: y, Month: mo, Day: d, Hour: h, Minute: mi, Second: se,
    Millisecond: Math.trunc(((msFloat % 1000) + 1000) % 1000),
    DayOfYear: days - daysFromCivil(y, 1, 1) + 1,
    DayOfWeek: DOW_NAMES[dow],
    Kind: "Unspecified",
    Ticks: { kind: "unknown", source: "DateTime.Ticks（64ビット値）", id: "DateTime.Ticks" },
    __keyMs: keyMs,
    __msFrac: ((msFloat % 1000) + 1000) % 1000,
  };
  obj.TimeOfDay = makeTimeSpan(h * 3600000 + mi * 60000 + se * 1000 + msFloat);
  if (h === 0 && mi === 0 && se === 0 && msFloat === 0) obj.Date = obj;
  else {
    const mid = makeDateTimeRaw(y, mo, d, 0, 0, 0, 0);
    obj.Date = mid;
  }
  return obj;
}
function dateTimeFromKeyMs(keyMs, fail) {
  const days = Math.floor(keyMs / 86400000);
  let rem = keyMs - days * 86400000;
  const [y, mo, d] = civilFromDays(days);
  if (y < 1 || y > 9999) fail("DateTime の範囲外です", "ArgumentOutOfRangeException");
  const h = Math.floor(rem / 3600000); rem -= h * 3600000;
  const mi = Math.floor(rem / 60000); rem -= mi * 60000;
  const se = Math.floor(rem / 1000); rem -= se * 1000;
  return makeDateTimeRaw(y, mo, d, h, mi, se, rem);
}
function pad2(n) { return String(n).padStart(2, "0"); }
function frac7(msFrac) { return String(Math.round(msFrac * 10000)).padStart(7, "0"); }
function dateTimeToString(dt, format, fail) {
  const { Year: y, Month: mo, Day: d, Hour: h, Minute: mi, Second: se } = dt;
  const base = `${pad2(mo)}/${pad2(d)}/${String(y).padStart(4, "0")}`;
  const longDate = `${dt.DayOfWeek}, ${pad2(d)} ${MONTH_NAMES[mo - 1]} ${String(y).padStart(4, "0")}`;
  if (format === null || format === undefined || format === "" || format === "G")
    return `${base} ${pad2(h)}:${pad2(mi)}:${pad2(se)}`;
  if (format === "d") return base;
  if (format === "D") return longDate;
  if (format === "t") return `${pad2(h)}:${pad2(mi)}`;
  if (format === "T") return `${pad2(h)}:${pad2(mi)}:${pad2(se)}`;
  if (format === "g") return `${base} ${pad2(h)}:${pad2(mi)}`;
  if (format === "f") return `${longDate} ${pad2(h)}:${pad2(mi)}`;
  if (format === "F") return `${longDate} ${pad2(h)}:${pad2(mi)}:${pad2(se)}`;
  if (format === "s") return `${String(y).padStart(4, "0")}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:${pad2(se)}`;
  if (format === "o" || format === "O")
    return `${String(y).padStart(4, "0")}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:${pad2(se)}.${frac7(dt.__msFrac)}`;
  if (format === "u") return `${String(y).padStart(4, "0")}-${pad2(mo)}-${pad2(d)} ${pad2(h)}:${pad2(mi)}:${pad2(se)}Z`;
  if (["R", "r", "U", "y", "Y", "m", "M"].includes(format)) {
    if (fail) fail(`DateTime の書式 '${format}' は未対応です`, "未対応");
    return `${base} ${pad2(h)}:${pad2(mi)}:${pad2(se)}`;
  }
  // カスタム書式（部分集合）
  const dowIdx = DOW_NAMES.indexOf(dt.DayOfWeek);
  const tokens = [
    ["yyyy", String(y).padStart(4, "0")], ["yy", pad2(y % 100)],
    ["MMMM", MONTH_NAMES[mo - 1]], ["MMM", MONTH_SHORT[mo - 1]],
    ["MM", pad2(mo)], ["M", String(mo)],
    ["dddd", dt.DayOfWeek], ["ddd", DOW_SHORT[dowIdx]],
    ["dd", pad2(d)], ["d", String(d)],
    ["HH", pad2(h)], ["H", String(h)],
    ["hh", pad2(((h + 11) % 12) + 1)], ["h", String(((h + 11) % 12) + 1)],
    ["mm", pad2(mi)], ["m", String(mi)],
    ["ss", pad2(se)], ["s", String(se)],
    ["fff", String(Math.round(dt.__msFrac)).padStart(3, "0")],
    ["tt", h < 12 ? "AM" : "PM"],
  ];
  let out = "";
  let rest = format;
  while (rest.length) {
    const hit = tokens.find(([t]) => rest.startsWith(t));
    if (hit) { out += hit[1]; rest = rest.slice(hit[0].length); continue; }
    const c = rest[0];
    if (/[a-zA-Z]/.test(c)) { if (fail) fail(`DateTime の書式指定 '${c}' は未対応です`, "未対応"); }
    out += c; rest = rest.slice(1);
  }
  return out;
}
function makeTimeSpan(totalMs) {
  const sign = totalMs < 0 ? -1 : 1;
  const abs = Math.abs(totalMs);
  const days = Math.trunc(abs / 86400000);
  let rem = abs - days * 86400000;
  const hours = Math.trunc(rem / 3600000); rem -= hours * 3600000;
  const minutes = Math.trunc(rem / 60000); rem -= minutes * 60000;
  const seconds = Math.trunc(rem / 1000); rem -= seconds * 1000;
  const ticks = totalMs * 10000;
  return {
    __adv: "TimeSpan",
    Days: sign * days, Hours: sign * hours, Minutes: sign * minutes,
    Seconds: sign * seconds, Milliseconds: sign * Math.trunc(rem),
    TotalDays: totalMs / 86400000, TotalHours: totalMs / 3600000,
    TotalMinutes: totalMs / 60000, TotalSeconds: totalMs / 1000,
    TotalMilliseconds: totalMs,
    Ticks: Number.isSafeInteger(ticks) ? ticks : { kind: "unknown", source: "TimeSpan.Ticks（64ビット値）", id: "TimeSpan.Ticks" },
    __fracMs: rem,
  };
}
function timeSpanToString(ts, format, fail) {
  const totalMs = ts.TotalMilliseconds;
  const neg = totalMs < 0;
  const days = Math.abs(ts.Days), h = Math.abs(ts.Hours), mi = Math.abs(ts.Minutes), se = Math.abs(ts.Seconds);
  const fracMs = Math.abs(ts.__fracMs ?? 0);
  const sign = neg ? "-" : "";
  const fSec = Math.abs(totalMs) % 1000; // 秒未満の端数（ミリ秒・小数可）
  if (format === null || format === undefined || format === "" || format === "c") {
    let out = sign;
    if (days) out += days + ".";
    out += `${pad2(h)}:${pad2(mi)}:${pad2(se)}`;
    if (fSec > 0) out += "." + String(Math.round(fSec * 10000)).padStart(7, "0");
    return out;
  }
  if (format === "g") {
    let out = sign;
    if (days) out += days + ":";
    out += `${h}:${pad2(mi)}:${pad2(se)}`;
    if (fSec > 0) out += "." + String(Math.round(fSec * 10000)).padStart(7, "0").replace(/0+$/, "");
    return out;
  }
  if (format === "G") {
    return `${sign}${days}:${pad2(h)}:${pad2(mi)}:${pad2(se)}.${String(Math.round(fSec * 10000)).padStart(7, "0")}`;
  }
  if (fail) fail(`TimeSpan の書式 '${format}' は未対応です`, "未対応");
  return timeSpanToString(ts, null, fail);
}
function parseDateTimeValue(text, fail) {
  if (text === null || text === undefined) fail("値が null です", "ArgumentNullException");
  if (typeof text !== "string") fail("Parse の引数は文字列です", "CompileError");
  const t = text.trim();
  if (t === "") fail("空文字列は DateTime として解釈できません", "FormatException");
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t))
    fail("時刻だけの文字列は実行日の日付になるため、DateTime.Parse のこの形式は未対応です", "未対応");
  const build = (y, mo, d, h, mi, se, msFrac) => {
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo) || h > 23 || mi > 59 || se > 59)
      fail(`文字列 '${text}' は DateTime の形式ではありません`, "FormatException");
    return makeDateTimeRaw(y, mo, d, h, mi, se, msFrac);
  };
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,7}))?)?)?$/.exec(t)))
    return build(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0), m[7] ? parseFloat("0." + m[7]) * 1000 : 0);
  if ((m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?: (\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(t)))
    return build(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0), 0);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(t)))
    return build(+m[3], +m[1], +m[2], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0), 0);
  fail(`DateTime.Parse のこの形式は未対応です：'${text}'（対応形式は yyyy-MM-dd、yyyy/MM/dd、MM/dd/yyyy と時刻の組み合わせ）`, "未対応");
}
function parseTimeSpanValue(text, fail) {
  if (text === null || text === undefined) fail("値が null です", "ArgumentNullException");
  if (typeof text !== "string") fail("Parse の引数は文字列です", "CompileError");
  const t = text.trim();
  let m = /^([+-])?(\d+(?:\.\d+)?)$/.exec(t);
  if (m) {
    const days = parseFloat(m[2]) * (m[1] === "-" ? -1 : 1);
    if (Math.abs(days) > 10675199) fail("TimeSpan の範囲外です", "OverflowException");
    return makeTimeSpan(days * 86400000);
  }
  m = /^([+-])?(?:(\d+)\.)?(\d+):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,7}))?)?$/.exec(t);
  if (!m) fail(`文字列 '${text}' は TimeSpan の形式ではありません`, "FormatException");
  const sign = m[1] === "-" ? -1 : 1;
  const days = +(m[2] ?? 0), hh = +m[3], mm = +m[4], ss = +(m[5] ?? 0);
  if (mm > 59 || ss > 59) fail("TimeSpan の範囲外です", "OverflowException");
  const frac = m[6] ? parseFloat("0." + m[6]) : 0;
  const totalMs = sign * (((days * 24 + hh) * 3600 + mm * 60 + ss) * 1000 + frac * 1000);
  if (Math.abs(totalMs) > 922337203685477) fail("TimeSpan の範囲外です", "OverflowException");
  return makeTimeSpan(totalMs);
}

// ================= 静的ディスパッチ =================
function dispatchStatic(type, method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s, api, node } = ctx;
  const argc = (n, what) => { if (values.length !== n) fail(`${what} の引数の数が違います（${values.length}個）`, "CompileError"); };
  const anyUnknown = values.some((v) => isUnk(H, v));
  switch (type) {
    case "String": return staticString(method, env);
    case "Math": return staticMath(method, env);
    case "Console": return staticConsole(method, env);
    case "Convert": return staticConvert(method, env);
    case "Array": return staticArray(method, env);
    case "Char": return staticChar(method, env);
    case "DateTime": return staticDateTime(method, env);
    case "TimeSpan": return staticTimeSpan(method, env);
    case "Enumerable": return enumerableCall(null, null, method, env, true);
    case "CultureInfo":
      // CS-F09-4 処置：CultureInfo の直接呼び出し形は全て、項目名を
      // 挙げる名前付き停止にする（従来は GetCultureInfo／
      // CreateSpecificCulture／GetCultures 以外が汎用停止に落ちていた）。
      unsupported(`CultureInfo.${method}（カルチャ情報は OS／ICU 依存のためモデル化できません）`);
      return null;
    case "StringBuilder":
    case "Random":
      return null; // 静的メソッドは無い（インスタンス生成自体が到達不能）
    case "Object":
      if (method === "Equals") {
        argc(2, "Object.Equals");
        if (anyUnknown) return { value: H.unknown("未確定の値の比較") };
        return { value: valueEquals(values[0], values[1]) };
      }
      if (method === "ReferenceEquals") unsupported("Object.ReferenceEquals（参照の同一性）");
      return null;
    case "Decimal":
      if (method === "Parse" || method === "TryParse")
        unsupported(`${type}.${method}（decimal 型はモデルにありません）`);
      return null;
    default: {
      // 数値型・Boolean の Parse
      if (["Byte", "SByte", "Int16", "UInt16", "Int32", "UInt32", "Int64", "UInt64"].includes(type)) {
        if (method === "Parse") {
          argc(1, `${type}.Parse`);
          if (anyUnknown) return { value: H.unknown("未確定の文字列の Parse") };
          const r = parseInteger(values[0], type, fail);
          if (typeof r === "object") return { value: H.unknown(`${type}.Parse の結果（64ビット値）`) };
          return { value: r };
        }
        if (method === "TryParse") unsupported(`${type}.TryParse（out 引数のこの形式は解析段階で未対応）`);
        return null;
      }
      if (type === "Double" || type === "Single") {
        if (method === "Parse") {
          argc(1, `${type}.Parse`);
          if (anyUnknown) return { value: H.unknown("未確定の文字列の Parse") };
          const v = parseDoubleValue(values[0], fail);
          return { value: type === "Single" ? Math.fround(v) : v };
        }
        if (method === "TryParse") unsupported(`${type}.TryParse（out 引数のこの形式は解析段階で未対応）`);
        return null;
      }
      if (type === "Boolean") {
        if (method === "Parse") {
          argc(1, "Boolean.Parse");
          if (anyUnknown) return { value: H.unknown("未確定の文字列の Parse") };
          return { value: parseBoolValue(values[0], fail) };
        }
        if (method === "TryParse") unsupported("Boolean.TryParse（out 引数のこの形式は解析段階で未対応）");
        return null;
      }
      return null;
    }
  }
}
function staticString(method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s } = ctx;
  const anyUnknown = values.some((v) => isUnk(H, v));
  switch (method) {
    case "IsNullOrEmpty":
      if (values.length !== 1) return null;
      if (isUnk(H, values[0])) return { value: H.unknown("未確定の文字列が null か空か") };
      return { value: values[0] === null || values[0] === "" };
    case "IsNullOrWhiteSpace":
      if (values.length !== 1) return null;
      if (isUnk(H, values[0])) return { value: H.unknown("未確定の文字列が空白だけか") };
      return { value: values[0] === null || (typeof values[0] === "string" && values[0].trim() === "") };
    case "Concat": {
      if (anyUnknown) return { value: H.unknown("未確定の値を含む連結") };
      if (values.length === 1 && Array.isArray(values[0]))
        return { value: values[0].map((v, i) => csToString(H, v, null, s)).join("") };
      return { value: values.map((v, i) => csToString(H, v, args[i], s)).join("") };
    }
    case "Join": {
      if (values.length < 2 || values.length > 4) return null;
      if (anyUnknown) return { value: H.unknown("未確定の値を含む Join") };
      const sep = values[0] === null ? "" : values[0];
      if (typeof sep !== "string") fail("String.Join の第1引数は文字列です", "CompileError");
      const arr = values[1];
      if (arr === null) fail("String.Join の配列が null です", "ArgumentNullException");
      if (!Array.isArray(arr)) fail("String.Join の第2引数は配列です", "CompileError");
      let items = arr;
      if (values.length === 4) {
        const start = values[2], count = values[3];
        if (start < 0 || count < 0 || start + count > arr.length)
          fail("String.Join の範囲が配列の範囲外です", "ArgumentOutOfRangeException");
        items = arr.slice(start, start + count);
      }
      return { value: items.map((v) => csToString(H, v, null, s)).join(sep) };
    }
    case "Format": {
      if (values.length < 1) return null;
      if (typeof values[0] !== "string") fail("String.Format の第1引数は書式文字列です", "CompileError");
      if (isUnk(H, values[0])) return { value: H.unknown("未確定の書式文字列") };
      return { value: stringFormat(H, values[0], values.slice(1), args.slice(1), s, fail) };
    }
    case "Compare": {
      if (values.length !== 2 && values.length !== 3) return null;
      if (anyUnknown) return { value: H.unknown("未確定の文字列の比較") };
      const [a, b] = values;
      if (typeof a !== "string" && a !== null) fail("String.Compare の引数は文字列です", "CompileError");
      if (typeof b !== "string" && b !== null) fail("String.Compare の引数は文字列です", "CompileError");
      if (values.length === 3) {
        if (typeof values[2] !== "boolean") unsupported("String.Compare のこのオーバーロード");
        if (values[2]) {
          const la = a === null ? null : a.toLowerCase(), lb = b === null ? null : b.toLowerCase();
          return { value: cultureCompare(la, lb) };
        }
      }
      return { value: cultureCompare(a, b) };
    }
    case "Equals": {
      if (values.length !== 2) return null;
      if (anyUnknown) return { value: H.unknown("未確定の文字列の比較") };
      return { value: values[0] === values[1] };
    }
    case "Intern": case "IsInterned":
      unsupported(`String.${method}（文字列インターン）`);
      return null;
    default: return null;
  }
}
function staticMath(method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values } = ctx;
  const fns1 = {
    Acos: Math.acos, Asin: Math.asin, Atan: Math.atan, Cos: Math.cos,
    Cosh: Math.cosh, Sin: Math.sin, Sinh: Math.sinh, Tan: Math.tan,
    Tanh: Math.tanh, Exp: Math.exp, Log10: Math.log10, Sqrt: Math.sqrt,
    Cbrt: Math.cbrt,
  };
  if (method === "Abs") {
    if (values.length !== 1) return null;
    const v = values[0];
    if (isUnk(H, v)) return { value: v };
    if (typeof v !== "number") fail("Math.Abs の引数は数値です", "CompileError");
    const t = H.typeOf(args[0], ctx.s);
    if (Number.isInteger(v) && ["int", "long", "short", "sbyte"].includes(t)) {
      const min = t === "long" ? -(2 ** 63) : t === "short" ? -32768 : t === "sbyte" ? -128 : -2147483648;
      if (v === min) fail("Math.Abs の結果が範囲外です", "OverflowException");
    }
    return { value: Math.abs(v) };
  }
  if (method in fns1) {
    if (values.length !== 1) return null;
    const v = values[0];
    if (isUnk(H, v)) return { value: v };
    if (typeof v !== "number") fail(`Math.${method} の引数は数値です`, "CompileError");
    return { value: fns1[method](v) };
  }
  switch (method) {
    case "Atan2":
      if (values.length !== 2) return null;
      if (values.some((v) => isUnk(H, v))) return { value: H.unknown("未確定の値の Atan2") };
      return { value: Math.atan2(values[0], values[1]) };
    case "Log":
      if (values.length === 1) {
        if (isUnk(H, values[0])) return { value: values[0] };
        return { value: Math.log(values[0]) };
      }
      if (values.length === 2) return { value: Math.log(values[0]) / Math.log(values[1]) };
      return null;
    case "Pow":
      if (values.length !== 2) return null;
      if (values.some((v) => isUnk(H, v))) return { value: H.unknown("未確定の値の Pow") };
      return { value: Math.pow(values[0], values[1]) };
    case "Ceiling": case "Floor": case "Truncate": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) return { value: v };
      if (typeof v !== "number") fail(`Math.${method} の引数は数値です`, "CompileError");
      return { value: method === "Ceiling" ? Math.ceil(v) : method === "Floor" ? Math.floor(v) : Math.trunc(v) };
    }
    case "Round": {
      if (values.length === 1) {
        const v = values[0];
        if (isUnk(H, v)) return { value: v };
        if (typeof v !== "number") fail("Math.Round の引数は数値です", "CompileError");
        return { value: roundHalfEven(v, 0) };
      }
      if (values.length === 2) {
        const [v, d] = values;
        if (typeof d !== "number" || !Number.isInteger(d)) unsupported("Math.Round のこのオーバーロード（MidpointRounding 指定）");
        if (d < 0 || d > 15) fail("Math.Round の桁数は 0〜15 です", "ArgumentOutOfRangeException");
        if (isUnk(H, v)) return { value: v };
        return { value: roundHalfEven(v, d) };
      }
      unsupported("Math.Round のこのオーバーロード（MidpointRounding 指定は列挙型引数のため到達できません）");
      return null;
    }
    case "Max": case "Min": {
      if (values.length !== 2) return null;
      if (values.some((v) => isUnk(H, v))) return { value: H.unknown("未確定の値の比較") };
      if (typeof values[0] !== "number" || typeof values[1] !== "number") fail(`Math.${method} の引数は数値です`, "CompileError");
      return { value: method === "Max" ? Math.max(values[0], values[1]) : Math.min(values[0], values[1]) };
    }
    case "Sign": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) return { value: v };
      if (typeof v !== "number") fail("Math.Sign の引数は数値です", "CompileError");
      if (Number.isNaN(v)) fail("NaN の符号は定義されません", "ArithmeticException");
      return { value: Math.sign(v) };
    }
    case "Clamp": {
      if (values.length !== 3) return null;
      const [v, min, max] = values;
      if (values.some((x) => isUnk(H, x))) return { value: H.unknown("未確定の値の Clamp") };
      if (min > max) fail("Math.Clamp の min が max より大きいです", "ArgumentException");
      return { value: Math.min(Math.max(v, min), max) };
    }
    case "BigMul": {
      if (values.length !== 2) return null;
      const [a, b] = values;
      if (isUnk(H, a) || isUnk(H, b)) return { value: H.unknown("未確定の値の BigMul") };
      const p = BigInt(Math.trunc(a)) * BigInt(Math.trunc(b));
      if (p > MAX_SAFE || p < -MAX_SAFE) fail("Math.BigMul の結果が安全整数範囲外です", "未確認");
      return { value: Number(p) };
    }
    default: return null;
  }
}
function staticConsole(method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s, api, node } = ctx;
  switch (method) {
    case "Write": {
      if (values.length === 0) return { value: null };
      if (values.length >= 2 && typeof values[0] === "string") {
        if (isUnk(H, values[0])) fail("未確定の書式文字列での Console.Write は未対応です", "未対応");
        const text = stringFormat(H, values[0], values.slice(1), args.slice(1), s, fail);
        s.outputs.push({ channel: "Console.Write", text, line: node.line });
        api.note(s, node, "標準出力へ出します：" + text);
        return { value: null };
      }
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) fail("未確定の値の Console.Write は未対応です", "未対応");
      const text = csToString(H, v, args[0], s);
      s.outputs.push({ channel: "Console.Write", text, line: node.line });
      api.note(s, node, "標準出力へ出します：" + text);
      return { value: null };
    }
    case "Read":
      if (values.length !== 0) fail("Console.Read は引数を取りません", "CompileError");
      return { value: api.freshUnknown("標準入力の文字", s) };
    case "ReadKey":
      return { value: api.freshUnknown("押されたキー", s) };
    case "Clear": case "Beep": case "SetCursorPosition": case "ResetColor":
      unsupported(`Console.${method}（画面制御）`);
      return null;
    default: return null;
  }
}

function staticConvert(method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s } = ctx;
  if (method === "ChangeType") { unsupported("Convert.ChangeType（型オブジェクトが必要）"); return null; }
  if (method === "ToDecimal") { unsupported("Convert.ToDecimal（decimal 型はモデルにありません）"); return null; }
  if (method === "ToBase64String") {
    if (values.length !== 1) return null;
    const v = values[0];
    if (isUnk(H, v)) return { value: H.unknown("未確定のバイト列の変換") };
    if (v === null) fail("値が null です", "ArgumentNullException");
    if (!Array.isArray(v)) fail("Convert.ToBase64String の引数は byte[] です", "CompileError");
    let bin = "";
    for (const b of v) {
      if (typeof b !== "number" || b < 0 || b > 255) fail("byte[] の要素が範囲外です", "CompileError");
      bin += String.fromCharCode(b);
    }
    return { value: btoa(bin) };
  }
  if (method === "FromBase64String") {
    if (values.length !== 1) return null;
    const v = values[0];
    if (isUnk(H, v)) return { value: H.unknown("未確定の文字列の変換") };
    if (v === null) fail("値が null です", "ArgumentNullException");
    if (typeof v !== "string") fail("Convert.FromBase64String の引数は文字列です", "CompileError");
    const cleaned = v.replace(/[\s]/g, "");
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(cleaned))
      fail("Base64 の形式ではありません", "FormatException");
    let bin;
    try { bin = atob(cleaned); } catch { fail("Base64 の形式ではありません", "FormatException"); }
    return { value: withElemSys([...bin].map((c) => c.charCodeAt(0)), "Byte") };
  }
  const intTargets = { ToByte: "Byte", ToSByte: "SByte", ToInt16: "Int16", ToUInt16: "UInt16", ToInt32: "Int32", ToUInt32: "UInt32", ToInt64: "Int64", ToUInt64: "UInt64" };
  if (method in intTargets) {
    const typeName = intTargets[method];
    if (values.length === 2) {
      // (文字列, 基数) 形は ToInt32 等の一部のみ。基数変換として扱う。
      // CS-F03 点検の同型対策：char 型の第1引数（(char, int) 形は実 .NET に
      // 存在しない）を文字列形へ誤って振り分け、文字を基数文字列として
      // 解釈した誤値を返さないよう、char 形は対象外に落とす。
      const [v, base] = values;
      if (typeof v !== "string" || ![2, 8, 10, 16].includes(base)) return null;
      if (H.typeOf(args[0], s) === "char") return null;
      if (isUnk(H, v)) return { value: H.unknown("未確定の文字列の変換") };
      const t = v.trim();
      let big;
      try {
        if (base === 16) big = BigInt("0x" + t.replace(/^-/, ""));
        else if (base === 2) big = BigInt("0b" + t);
        else if (base === 8) big = BigInt("0o" + t);
        else big = BigInt(t);
        if (base !== 10 && t.startsWith("-")) big = -big;
      } catch { fail(`文字列 '${v}' は ${base} 進数として解釈できません`, "FormatException"); }
      const [min, max] = INT_RANGES[typeName];
      if (big < min || big > max) fail(`${typeName} の範囲外です`, "OverflowException");
      if (big > MAX_SAFE || big < -MAX_SAFE) return { value: H.unknown("変換結果（64ビット値）") };
      return { value: Number(big) };
    }
    if (values.length !== 1) return null;
    const v = values[0];
    if (isUnk(H, v)) return { value: v };
    if (v === null) return { value: 0 };
    let num;
    if (typeof v === "boolean") num = v ? 1 : 0;
    else if (typeof v === "string" && v.length === 1 && H.typeOf(args[0], s) === "char") num = v.charCodeAt(0);
    else if (typeof v === "string") {
      const r = parseInteger(v, typeName, fail);
      return { value: typeof r === "object" ? H.unknown("変換結果（64ビット値）") : r };
    } else if (typeof v === "number") num = roundHalfEven(v, 0);
    else fail("変換できない型です", "InvalidCastException");
    const [min, max] = INT_RANGES[typeName];
    if (BigInt(num) < min || BigInt(num) > max) fail(`${typeName} の範囲外です`, "OverflowException");
    return { value: num };
  }
  switch (method) {
    case "ToDouble": case "ToSingle": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) return { value: v };
      if (v === null) return { value: 0 };
      let num;
      if (typeof v === "boolean") num = v ? 1 : 0;
      else if (typeof v === "string") num = parseDoubleValue(v, fail);
      else if (typeof v === "number") num = v;
      else fail("変換できない型です", "InvalidCastException");
      return { value: method === "ToSingle" ? Math.fround(num) : num };
    }
    case "ToBoolean": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) return { value: v };
      if (v === null) return { value: false };
      if (typeof v === "boolean") return { value: v };
      if (typeof v === "string") return { value: parseBoolValue(v, fail) };
      if (typeof v === "number") return { value: v !== 0 };
      fail("変換できない型です", "InvalidCastException");
      return null;
    }
    case "ToChar": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) return { value: v };
      if (typeof v === "string") {
        if (v.length !== 1) fail("長さ1の文字列だけが char に変換できます", "FormatException");
        return { value: v };
      }
      if (typeof v === "number") {
        if (!Number.isInteger(v) || v < 0 || v > 65535) fail("char の範囲外です", "OverflowException");
        return { value: String.fromCharCode(v) };
      }
      if (typeof v === "boolean") fail("bool は char に変換できません", "InvalidCastException");
      fail("変換できない型です", "InvalidCastException");
      return null;
    }
    case "ToString": {
      if (values.length === 2) {
        const [v, base] = values;
        if (![2, 8, 10, 16].includes(base)) fail("基数は 2、8、10、16 のいずれかです", "ArgumentException");
        if (typeof v !== "number" || !Number.isInteger(v)) return null;
        if (isUnk(H, v)) return { value: H.unknown("未確定の値の変換") };
        if (base === 10) return { value: String(v) };
        const t = H.typeOf(args[0], s);
        const width = ["byte", "sbyte"].includes(t) ? 8 : ["short", "ushort"].includes(t) ? 16 : ["long", "ulong"].includes(t) ? 64 : 32;
        return { value: BigInt.asUintN(width, BigInt(v)).toString(base) };
      }
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) return { value: H.unknown("未確定の値の変換") };
      return { value: csToString(H, v, args[0], s) };
    }
    case "ToDateTime": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) return { value: H.unknown("未確定の値の変換") };
      if (v === null) return { value: makeDateTimeRaw(1, 1, 1, 0, 0, 0, 0) };
      if (v?.__adv === "DateTime") return { value: v };
      if (typeof v === "string") return { value: parseDateTimeValue(v, fail) };
      fail("この型は DateTime に変換できません", "InvalidCastException");
      return null;
    }
    default: return null;
  }
}
function charOf(v, H, argNode, s, fail) {
  if (typeof v === "string" && v.length === 1) return v;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 65535) return String.fromCharCode(v);
  fail("char 型の値が必要です", "CompileError");
}
function staticChar(method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s } = ctx;
  const pred = {
    IsDigit: (c) => /\p{Nd}/u.test(c),
    IsLetter: (c) => /\p{L}/u.test(c),
    IsLetterOrDigit: (c) => /[\p{L}\p{Nd}]/u.test(c),
    IsLower: (c) => /\p{Ll}/u.test(c),
    IsUpper: (c) => /\p{Lu}/u.test(c),
    IsNumber: (c) => /\p{N}/u.test(c),
    IsPunctuation: (c) => /\p{P}/u.test(c),
    IsSeparator: (c) => /\p{Z}/u.test(c),
    IsSymbol: (c) => /\p{S}/u.test(c),
    IsControl: (c) => /\p{Cc}/u.test(c),
    IsWhiteSpace: (c) => /\s/.test(c) || c === "\u00A0",
    IsSurrogate: (c) => c.charCodeAt(0) >= 0xD800 && c.charCodeAt(0) <= 0xDFFF,
  };
  // CS-F13 処置：Char.IsSurrogate(string, int) オーバーロード。
  // dotnet 8.0.428 実測：null は ArgumentNullException、範囲外
  // インデックス（負・長さ以上・空文字列）は false ではなく
  // ArgumentOutOfRangeException（IsSurrogatePair と同じ規則）。
  if (method === "IsSurrogate" && values.length === 2) {
    if (
      typeof values[1] === "number" &&
      (typeof values[0] === "string" || values[0] === null) &&
      H.typeOf(args[0], s) !== "char"
    ) {
      const str = values[0], idx = values[1];
      if (str === null) fail("値が null です", "ArgumentNullException");
      if (!Number.isInteger(idx) || idx < 0 || idx >= str.length)
        fail("Char.IsSurrogate のインデックスが文字列の範囲外です", "ArgumentOutOfRangeException");
      const c = str.charCodeAt(idx);
      return { value: c >= 0xD800 && c <= 0xDFFF };
    }
    return null;
  }
  if (method in pred) {
    if (values.length !== 1) return null;
    const v = values[0];
    if (isUnk(H, v)) return { value: H.unknown("未確定の文字の判定") };
    return { value: pred[method](charOf(v, H, args[0], s, fail)) };
  }
  switch (method) {
    case "IsSurrogatePair": {
      // (string, int) 形：s[index] と s[index + 1] のペア判定。
      // dotnet 8.0.428 実測：null は ArgumentNullException、範囲外
      // インデックス（負・長さ以上・空文字列）は false ではなく
      // ArgumentOutOfRangeException。末尾位置（次が無い）は false。
      // 第1引数が char 型の式の場合はこの形ではないため除外する。
      if (
        values.length === 2 &&
        typeof values[1] === "number" &&
        (typeof values[0] === "string" || values[0] === null) &&
        H.typeOf(args[0], s) !== "char"
      ) {
        const str = values[0], idx = values[1];
        if (str === null) fail("値が null です", "ArgumentNullException");
        if (!Number.isInteger(idx) || idx < 0 || idx >= str.length)
          fail("Char.IsSurrogatePair のインデックスが文字列の範囲外です", "ArgumentOutOfRangeException");
        if (idx + 1 >= str.length) return { value: false };
        const a = str.charCodeAt(idx), b = str.charCodeAt(idx + 1);
        return { value: a >= 0xD800 && a <= 0xDBFF && b >= 0xDC00 && b <= 0xDFFF };
      }
      // (char, char) 形。
      if (values.length === 2) {
        const a = charOf(values[0], H, args[0], s, fail).charCodeAt(0);
        const b = charOf(values[1], H, args[1], s, fail).charCodeAt(0);
        return { value: a >= 0xD800 && a <= 0xDBFF && b >= 0xDC00 && b <= 0xDFFF };
      }
      // (string) 1引数形は実 .NET に存在しない（CS1501、dotnet 実測）。
      // null を返して呼び出し側の名前付き停止に落とす。
      return null;
    }
    case "ToLower": case "ToUpper": case "ToLowerInvariant": case "ToUpperInvariant": {
      if (values.length !== 1) return null;
      const c = charOf(values[0], H, args[0], s, fail);
      return { value: method.startsWith("ToLower") ? c.toLowerCase() : c.toUpperCase() };
    }
    case "GetNumericValue": {
      if (values.length !== 1) return null;
      const c = charOf(values[0], H, args[0], s, fail);
      if (c >= "0" && c <= "9") return { value: c.charCodeAt(0) - 48 };
      if (c === "\u00BD") return { value: 0.5 };
      if (c === "\u00BC") return { value: 0.25 };
      if (c === "\u00BE") return { value: 0.75 };
      if (c === "\u2153") return { value: 1 / 3 };
      if (c === "\u2154") return { value: 2 / 3 };
      return { value: -1 };
    }
    case "GetUnicodeCategory": {
      if (values.length !== 1) return null;
      const c = charOf(values[0], H, args[0], s, fail);
      const code = c.charCodeAt(0);
      let cat = "OtherNotAssigned";
      if (/\p{Lu}/u.test(c)) cat = "UppercaseLetter";
      else if (/\p{Ll}/u.test(c)) cat = "LowercaseLetter";
      else if (/\p{L}/u.test(c)) cat = "OtherLetter";
      else if (/\p{Nd}/u.test(c)) cat = "DecimalDigitNumber";
      else if (/\p{N}/u.test(c)) cat = "OtherNumber";
      else if (/\p{Zs}/u.test(c)) cat = "SpaceSeparator";
      else if (/\p{Z}/u.test(c)) cat = "LineSeparator";
      else if (/\p{P}/u.test(c)) cat = "OtherPunctuation";
      else if (/\p{S}/u.test(c)) cat = "MathSymbol";
      else if (/\p{Cc}/u.test(c)) cat = "Control";
      else if (code >= 0xD800 && code <= 0xDFFF) cat = "Surrogate";
      return { value: cat };
    }
    case "ConvertFromUtf32": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 0x10FFFF || (v >= 0xD800 && v <= 0xDFFF))
        fail("UTF-32 コードポイントが範囲外です", "ArgumentOutOfRangeException");
      return { value: String.fromCodePoint(v) };
    }
    case "ConvertToUtf32": {
      // CS-F03 処置：(char, char) 形と (string, int) 形は第2引数の型で
      // 振り分ける（char 値も JS 文字列として保持されるため、第1引数の
      // 型だけ見ると (char, char) 形が (string, int) 分岐へ誤って入り、
      // 上位サロゲート単体の値を返していた）。IsSurrogatePair と同じ規則。
      // 例外種別は dotnet 8.0.428 実測：(string, int) の範囲外は
      // ArgumentOutOfRangeException、null は ArgumentNullException、
      // 単独サロゲート位置は ArgumentException、(char, char) の
      // 不正なペアは ArgumentOutOfRangeException。
      if (values.length !== 2) return null;
      const [a, b] = values;
      if (
        typeof b === "number" &&
        (typeof a === "string" || a === null) &&
        H.typeOf(args[0], s) !== "char"
      ) {
        if (a === null) fail("値が null です", "ArgumentNullException");
        if (!Number.isInteger(b) || b < 0 || b >= a.length)
          fail("インデックスが範囲外です", "ArgumentOutOfRangeException");
        const c0 = a.charCodeAt(b);
        if (c0 >= 0xD800 && c0 <= 0xDBFF) {
          const c1 = b + 1 < a.length ? a.charCodeAt(b + 1) : -1;
          if (c1 < 0xDC00 || c1 > 0xDFFF)
            fail("指定位置の文字が正しいサロゲートペアではありません", "ArgumentException");
          return { value: (c0 - 0xD800) * 0x400 + (c1 - 0xDC00) + 0x10000 };
        }
        if (c0 >= 0xDC00 && c0 <= 0xDFFF)
          fail("指定位置の文字が正しいサロゲートペアではありません", "ArgumentException");
        return { value: c0 };
      }
      const hi = charOf(a, H, args[0], s, fail).charCodeAt(0);
      const lo = charOf(b, H, args[1], s, fail).charCodeAt(0);
      if (!(hi >= 0xD800 && hi <= 0xDBFF && lo >= 0xDC00 && lo <= 0xDFFF))
        fail("サロゲートペアではありません", "ArgumentOutOfRangeException");
      return { value: (hi - 0xD800) * 0x400 + (lo - 0xDC00) + 0x10000 };
    }
    case "Parse": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (v === null) fail("値が null です", "ArgumentNullException");
      if (typeof v !== "string") fail("Char.Parse の引数は文字列です", "CompileError");
      if (v.length !== 1) fail("長さ1の文字列だけが char として解釈できます", "FormatException");
      return { value: v };
    }
    case "TryParse": unsupported("Char.TryParse（out 引数のこの形式は解析段階で未対応）"); return null;
    case "ToString": {
      if (values.length !== 1) return null;
      return { value: charOf(values[0], H, args[0], s, fail) };
    }
    case "Equals": {
      if (values.length !== 2) return null;
      return { value: charOf(values[0], H, args[0], s, fail) === charOf(values[1], H, args[1], s, fail) };
    }
    default: return null;
  }
}
function staticDateTime(method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { values } = ctx;
  switch (method) {
    case "Parse": {
      if (values.length !== 1) return null;
      if (isUnk(H, values[0])) return { value: H.unknown("未確定の文字列の Parse") };
      return { value: parseDateTimeValue(values[0], fail) };
    }
    case "TryParse": unsupported("DateTime.TryParse（out 引数のこの形式は解析段階で未対応）"); return null;
    case "Compare": {
      if (values.length !== 2) return null;
      const [a, b] = values;
      if (a?.__adv !== "DateTime" || b?.__adv !== "DateTime") fail("DateTime.Compare の引数は DateTime です", "CompileError");
      return { value: a.__keyMs < b.__keyMs ? -1 : a.__keyMs > b.__keyMs ? 1 : 0 };
    }
    case "DaysInMonth": {
      if (values.length !== 2) return null;
      const [y, m] = values;
      if (y < 1 || y > 9999) fail("年が範囲外です", "ArgumentOutOfRangeException");
      if (m < 1 || m > 12) fail("月が範囲外です", "ArgumentOutOfRangeException");
      return { value: daysInMonth(y, m) };
    }
    case "Equals": {
      if (values.length !== 2) return null;
      return { value: values[0]?.__adv === "DateTime" && values[1]?.__adv === "DateTime" && values[0].__keyMs === values[1].__keyMs };
    }
    default: return null;
  }
}
function staticTimeSpan(method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { values } = ctx;
  const from = { FromDays: 86400000, FromHours: 3600000, FromMinutes: 60000, FromSeconds: 1000, FromMilliseconds: 1 };
  if (method in from) {
    if (values.length !== 1) return null;
    const v = values[0];
    if (isUnk(H, v)) return { value: H.unknown("未確定の値の TimeSpan") };
    if (typeof v !== "number") fail(`TimeSpan.${method} の引数は数値です`, "CompileError");
    const ms = v * from[method];
    if (!Number.isFinite(ms) || Math.abs(ms) > 922337203685477) fail("TimeSpan の範囲外です", "OverflowException");
    return { value: makeTimeSpan(ms) };
  }
  switch (method) {
    case "FromTicks": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (isUnk(H, v)) return { value: H.unknown("未確定の値の TimeSpan") };
      if (typeof v !== "number") fail("TimeSpan.FromTicks の引数は整数です", "CompileError");
      return { value: makeTimeSpan(v / 10000) };
    }
    case "Parse": {
      if (values.length !== 1) return null;
      if (isUnk(H, values[0])) return { value: H.unknown("未確定の文字列の Parse") };
      return { value: parseTimeSpanValue(values[0], fail) };
    }
    case "TryParse": unsupported("TimeSpan.TryParse（out 引数のこの形式は解析段階で未対応）"); return null;
    case "Compare": {
      if (values.length !== 2) return null;
      const [a, b] = values;
      if (a?.__adv !== "TimeSpan" || b?.__adv !== "TimeSpan") fail("TimeSpan.Compare の引数は TimeSpan です", "CompileError");
      return { value: a.TotalMilliseconds < b.TotalMilliseconds ? -1 : a.TotalMilliseconds > b.TotalMilliseconds ? 1 : 0 };
    }
    case "Equals": {
      if (values.length !== 2) return null;
      return { value: values[0]?.__adv === "TimeSpan" && values[1]?.__adv === "TimeSpan" && values[0].TotalMilliseconds === values[1].TotalMilliseconds };
    }
    default: return null;
  }
}

// ================= Array 静的 =================
function checkRange(arr, index, length, fail, what) {
  if (!Number.isInteger(index) || !Number.isInteger(length) || index < 0 || length < 0 || index + length > arr.length)
    fail(`${what} の範囲が配列の範囲外です`, "ArgumentOutOfRangeException");
}
function staticArray(method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s } = ctx;
  const predMethods = ["Exists", "Find", "FindAll", "FindIndex", "FindLast", "FindLastIndex", "ForEach", "TrueForAll", "ConvertAll"];
  if (predMethods.includes(method)) { unsupported(`Array.${method}（述語・変換子はラムダ式のため到達できません）`); return null; }
  switch (method) {
    case "Sort": {
      if (values.length === 1 || values.length === 3) {
        const arr = values[0];
        if (!Array.isArray(arr)) fail("Array.Sort の引数は配列です", "CompileError");
        if (isUnk(H, arr)) fail("未確定の配列の Sort は未対応です", "未対応");
        if (arr.some((x) => Array.isArray(x))) unsupported("Array.Sort（多次元配列）");
        const index = values.length === 3 ? values[1] : 0;
        const length = values.length === 3 ? values[2] : arr.length;
        checkRange(arr, index, length, fail, "Array.Sort");
        const seg = arr.slice(index, index + length);
        seg.sort((a, b) => { const c = compareValues(a, b); if (c === null) fail("要素を比較できません", "InvalidOperationException"); return c; });
        for (let i = 0; i < length; i++) arr[index + i] = seg[i];
        return { value: null };
      }
      unsupported("Array.Sort のこのオーバーロード（キー／項目の組、比較子）");
      return null;
    }
    case "Reverse": {
      if (values.length === 1 || values.length === 3) {
        const arr = values[0];
        if (!Array.isArray(arr)) fail("Array.Reverse の引数は配列です", "CompileError");
        const index = values.length === 3 ? values[1] : 0;
        const length = values.length === 3 ? values[2] : arr.length;
        checkRange(arr, index, length, fail, "Array.Reverse");
        const seg = arr.slice(index, index + length).reverse();
        for (let i = 0; i < length; i++) arr[index + i] = seg[i];
        return { value: null };
      }
      return null;
    }
    case "IndexOf": case "LastIndexOf": {
      if (values.length < 2 || values.length > 4) return null;
      const [arr, target] = values;
      if (!Array.isArray(arr)) fail(`Array.${method} の第1引数は配列です`, "CompileError");
      if (method === "IndexOf") {
        const start = values.length >= 3 ? values[2] : 0;
        const count = values.length >= 4 ? values[3] : arr.length - start;
        if (start < 0 || start > arr.length || count < 0 || start + count > arr.length)
          fail("Array.IndexOf の範囲が配列の範囲外です", "ArgumentOutOfRangeException");
        for (let i = start; i < start + count; i++) if (valueEquals(arr[i], target)) return { value: i };
        return { value: -1 };
      }
      const start = values.length >= 3 ? values[2] : arr.length - 1;
      const count = values.length >= 4 ? values[3] : start + 1;
      if (arr.length === 0) { if (values.length >= 3 && (start < -1 || count < 0)) fail("Array.LastIndexOf の範囲が正しくありません", "ArgumentOutOfRangeException"); return { value: -1 }; }
      if (start < 0 || start >= arr.length || count < 0 || start - count + 1 < 0)
        fail("Array.LastIndexOf の範囲が配列の範囲外です", "ArgumentOutOfRangeException");
      for (let i = start; i > start - count; i--) if (valueEquals(arr[i], target)) return { value: i };
      return { value: -1 };
    }
    case "BinarySearch": {
      if (values.length !== 2 && values.length !== 4) return null;
      const arr = values[0];
      if (!Array.isArray(arr)) fail("Array.BinarySearch の第1引数は配列です", "CompileError");
      const target = values[1];
      const index = values.length === 4 ? values[1] : 0;
      const length = values.length === 4 ? values[2] : arr.length;
      const tgt = values.length === 4 ? values[3] : target;
      if (values.length === 4) checkRange(arr, index, length, fail, "Array.BinarySearch");
      let lo = index, hi = index + length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const c = compareValues(arr[mid], tgt);
        if (c === null) fail("要素を比較できません", "InvalidOperationException");
        if (c === 0) return { value: mid };
        if (c < 0) lo = mid + 1; else hi = mid - 1;
      }
      return { value: ~lo };
    }
    case "Clear": {
      if (values.length !== 3) return null;
      const [arr, index, length] = values;
      if (!Array.isArray(arr)) fail("Array.Clear の第1引数は配列です", "CompileError");
      checkRange(arr, index, length, fail, "Array.Clear");
      const elem = elemAliasOf(H, args[0], s, arr);
      const dv = defaultOf(elem);
      for (let i = index; i < index + length; i++) arr[i] = dv;
      return { value: null };
    }
    case "Copy": {
      let src, srcIdx, dst, dstIdx, len;
      if (values.length === 3) { [src, dst, len] = values; srcIdx = 0; dstIdx = 0; }
      else if (values.length === 5) { [src, srcIdx, dst, dstIdx, len] = values; }
      else return null;
      if (!Array.isArray(src) || !Array.isArray(dst)) fail("Array.Copy の引数は配列です", "CompileError");
      if (srcIdx < 0 || dstIdx < 0 || len < 0 || srcIdx + len > src.length || dstIdx + len > dst.length)
        fail("Array.Copy の範囲が配列の範囲外です", "ArgumentOutOfRangeException");
      const snap = src.slice(srcIdx, srcIdx + len);
      for (let i = 0; i < len; i++) dst[dstIdx + i] = snap[i];
      syncCollection(dst);
      return { value: null };
    }
    case "Resize": fail("Array.Resize は未対応です（ref 引数で呼び出し元の変数を書き換えるため、モデルで表現できません）", "未対応"); return null;
    case "CreateInstance": unsupported("Array.CreateInstance（型オブジェクトが必要）"); return null;
    default: return null;
  }
}
// ================= コレクション表現 =================
function makeList(items, elemSys) {
  const arr = [...items];
  arr.__adv = "List";
  arr.__elem = elemSys || "Object";
  arr.Count = arr.length;
  arr.Capacity = arr.length;
  return arr;
}
function makeHashSet(items, elemSys) {
  const arr = [];
  for (const x of items) if (!arr.some((y) => valueEquals(x, y))) arr.push(x);
  arr.__adv = "HashSet";
  arr.__elem = elemSys || "Object";
  arr.Count = arr.length;
  return arr;
}
function syncCollection(arr) {
  if (Array.isArray(arr) && arr.__adv) arr.Count = arr.length;
}
function sysElemName(H, node2, s, arrValue) {
  const alias = elemAliasOf(H, node2, s, arrValue);
  return alias ? (CS_SYSTEM_NAMES[alias] || alias) : "Object";
}
// ================= 要素型タグ（__elemSys） =================
// CS-F05 処置（生成側）：式結果として生成された配列は宣言型の情報が
// 値から失われ、表示側（c-family の csArrayTypeName）が要素型を
// Double へ誤導出していた。生成・返却する配列に、要素の System 型名を
// 非列挙プロパティ __elemSys として付ける（表示側が読む）。
// 非列挙のため JSON 化・最終状態表示・列挙には漏れない。
function elemSysOfValue(arr) {
  if (!Array.isArray(arr)) return null;
  if (typeof arr.__elemSys === "string") return arr.__elemSys;
  if (typeof arr.__elem === "string") return arr.__elem; // List／HashSet
  return null;
}
function inferElemSysFromValues(vals) {
  let seen = null;
  for (const x of vals) {
    if (x === null || x === undefined) continue;
    let t = null;
    if (typeof x === "number") t = Number.isInteger(x) ? "Int32" : "Double";
    else if (typeof x === "string") t = "String";
    else if (typeof x === "boolean") t = "Boolean";
    else if (x?.__adv === "DateTime") t = "DateTime";
    else if (x?.__adv === "TimeSpan") t = "TimeSpan";
    else return null;
    if (seen === null) seen = t;
    else if (seen !== t) {
      if ((seen === "Int32" && t === "Double") || (seen === "Double" && t === "Int32")) seen = "Double";
      else return null;
    }
  }
  return seen;
}
function withElemSys(arr, sys) {
  if (Array.isArray(arr) && sys) {
    try {
      Object.defineProperty(arr, "__elemSys", {
        value: sys, enumerable: false, writable: true, configurable: true,
      });
    } catch { /* タグ付けできない場合は表示側の従来推定に委ねる */ }
  }
  return arr;
}
// 要素型の判定順：入力配列のタグ → 入力の宣言型（csArrayShape 経由）
// → 結果要素の値からの推定。判定できない場合は null（タグを付けない）。
// 宣言型が取れない場合に elemAliasOf の値フォールバック（先頭要素だけ
// からの推定）へ落とすと、int と double の混在を取り違えるため、
// 値からの推定は全要素を見る inferElemSysFromValues で行う。
function sysForResult(H, sourceNode, s, sourceVal, resultVals) {
  const tagged = elemSysOfValue(sourceVal);
  if (tagged) return tagged;
  if (sourceNode) {
    const shape = H.csArrayShape(sourceNode, s, null);
    if (shape?.elem) return CS_SYSTEM_NAMES[shape.elem] || shape.elem;
  }
  return inferElemSysFromValues(resultVals);
}
function sysForSingleValue(H, v, node, s) {
  if (node) {
    const t = H.typeOf(node, s);
    if (t && CS_SYSTEM_NAMES[t]) return CS_SYSTEM_NAMES[t];
    if (t === "DateTime" || t === "TimeSpan") return t;
  }
  return inferElemSysFromValues([v]);
}
// ================= LINQ =================
const LINQ_LAMBDA_METHODS = ["Where", "Select", "SelectMany", "GroupBy", "Join", "GroupJoin", "OrderBy", "OrderByDescending", "ThenBy", "ThenByDescending", "Aggregate", "SkipWhile", "TakeWhile", "ToDictionary", "ToLookup", "Zip"];
function enumerableCall(receiver, receiverNode, method, env, isStatic) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s } = ctx;
  if (LINQ_LAMBDA_METHODS.includes(method)) {
    unsupported(`Enumerable.${method}（セレクタ／述語はラムダ式のため到達できません）`);
    return null;
  }
  if (method === "Cast" || method === "OfType") {
    unsupported(`Enumerable.${method}（ジェネリックメソッド構文のため到達できません）`);
    return null;
  }
  if (method === "Range") {
    if (!isStatic) return null;
    if (values.length !== 2) return null;
    const [start, count] = values;
    if (count < 0 || start + count - 1 > 2147483647) fail("Enumerable.Range の範囲が Int32 の範囲外です", "ArgumentOutOfRangeException");
    if (count > 10000) fail("Enumerable.Range の要素数がモデルの上限（10000）を超えています", "limit");
    return { value: withElemSys(Array.from({ length: count }, (_, i) => start + i), "Int32") };
  }
  if (method === "Repeat") {
    if (!isStatic) return null;
    if (values.length !== 2) return null;
    const [v, count] = values;
    if (count < 0) fail("Enumerable.Repeat の回数が負です", "ArgumentOutOfRangeException");
    if (count > 10000) fail("Enumerable.Repeat の要素数がモデルの上限（10000）を超えています", "limit");
    return { value: withElemSys(Array.from({ length: count }, () => v), sysForSingleValue(H, v, args[0], s)) };
  }
  // ソースの確定
  let source, sourceNode, restVals, restArgs;
  if (isStatic) {
    if (values.length < 1) return null;
    source = values[0]; sourceNode = args[0];
    restVals = values.slice(1); restArgs = args.slice(1);
  } else {
    source = receiver; sourceNode = receiverNode;
    restVals = values; restArgs = args;
  }
  if (isUnk(H, source)) return { value: H.unknown("未確定のコレクション") };
  if (source === null) fail("ソースが null です", "ArgumentNullException");
  if (typeof source === "string" && !isStatic) {
    // string は IEnumerable<char>。文字の配列として扱う。
    source = [...source];
  }
  if (!Array.isArray(source)) return null;
  const src = [...source];
  const elem = elemAliasOf(H, sourceNode, s, src);
  // CS-F05：結果配列へ付ける要素型（入力タグ→宣言型→値推定の順）。
  const srcSys = sysForResult(H, sourceNode, s, source, src);
  const noPredArg = () => {
    if (restVals.length > 0) unsupported(`Enumerable.${method} の述語付きオーバーロード（ラムダ式のため到達できません）`);
  };
  switch (method) {
    case "Count": case "LongCount":
      noPredArg();
      return { value: src.length };
    case "Any":
      noPredArg();
      return { value: src.length > 0 };
    case "All": unsupported("Enumerable.All（述語はラムダ式のため到達できません）"); return null;
    case "First": case "Last": {
      noPredArg();
      if (!src.length) fail("シーケンスに要素がありません", "InvalidOperationException");
      return { value: method === "First" ? src[0] : src[src.length - 1] };
    }
    case "FirstOrDefault": case "LastOrDefault": {
      noPredArg();
      if (!src.length) return { value: restVals.length ? restVals[0] : defaultOf(elem) };
      return { value: method === "FirstOrDefault" ? src[0] : src[src.length - 1] };
    }
    case "Single": case "SingleOrDefault": {
      noPredArg();
      if (src.length > 1) fail("シーケンスに要素が2つ以上あります", "InvalidOperationException");
      if (!src.length) {
        if (method === "Single") fail("シーケンスに要素がありません", "InvalidOperationException");
        return { value: restVals.length ? restVals[0] : defaultOf(elem) };
      }
      return { value: src[0] };
    }
    case "ElementAt": {
      if (restVals.length !== 1) return null;
      const i = restVals[0];
      if (i < 0 || i >= src.length) fail("インデックスが範囲外です", "ArgumentOutOfRangeException");
      return { value: src[i] };
    }
    case "ElementAtOrDefault": {
      if (restVals.length !== 1) return null;
      const i = restVals[0];
      if (i < 0 || i >= src.length) return { value: defaultOf(elem) };
      return { value: src[i] };
    }
    case "Sum": {
      noPredArg();
      let total = 0;
      for (const x of src) {
        if (isUnk(H, x)) return { value: H.unknown("未確定の要素を含む合計") };
        if (typeof x !== "number") fail("Enumerable.Sum の要素は数値です", "CompileError");
        total += x;
      }
      if ((elem === "int" || elem === null && src.every((x) => Number.isInteger(x))) && Number.isInteger(total) && (total > 2147483647 || total < -2147483648))
        fail("Enumerable.Sum の結果が範囲外です", "OverflowException");
      return { value: total };
    }
    case "Average": {
      noPredArg();
      if (!src.length) fail("シーケンスに要素がありません", "InvalidOperationException");
      let total = 0;
      for (const x of src) {
        if (isUnk(H, x)) return { value: H.unknown("未確定の要素を含む平均") };
        if (typeof x !== "number") fail("Enumerable.Average の要素は数値です", "CompileError");
        total += x;
      }
      return { value: total / src.length };
    }
    case "Min": case "Max": {
      noPredArg();
      if (!src.length) {
        if (elem === "string") return { value: null };
        fail("シーケンスに要素がありません", "InvalidOperationException");
      }
      const nums = src.filter((x) => typeof x === "number");
      if (nums.length === src.length && nums.length) {
        if (method === "Min") {
          if (nums.some((x) => Number.isNaN(x))) return { value: NaN };
          return { value: Math.min(...nums) };
        }
        const nonNaN = nums.filter((x) => !Number.isNaN(x));
        if (!nonNaN.length) return { value: NaN };
        return { value: Math.max(...nonNaN) };
      }
      let best = src[0];
      for (const x of src.slice(1)) {
        const c = compareValues(x, best);
        if (c === null) fail("要素を比較できません", "InvalidOperationException");
        if (method === "Min" ? c < 0 : c > 0) best = x;
      }
      return { value: best };
    }
    case "Distinct": noPredArg(); return { value: withElemSys(makeHashSet(src, null).slice(), srcSys) };
    case "Reverse": noPredArg(); return { value: withElemSys(src.reverse(), srcSys) };
    case "Skip": if (restVals.length !== 1) return null; return { value: withElemSys(src.slice(Math.max(0, restVals[0])), srcSys) };
    case "Take": if (restVals.length !== 1) return null; return { value: withElemSys(restVals[0] <= 0 ? [] : src.slice(0, restVals[0]), srcSys) };
    case "Concat": {
      if (restVals.length !== 1) return null;
      const other = restVals[0];
      if (!Array.isArray(other)) fail("Enumerable.Concat の引数はコレクションです", "CompileError");
      const combined = [...src, ...other];
      return { value: withElemSys(combined, srcSys ?? elemSysOfValue(other) ?? inferElemSysFromValues(combined)) };
    }
    case "Append": if (restVals.length !== 1) return null; return { value: withElemSys([...src, restVals[0]], srcSys ?? inferElemSysFromValues([...src, restVals[0]])) };
    case "Prepend": if (restVals.length !== 1) return null; return { value: withElemSys([restVals[0], ...src], srcSys ?? inferElemSysFromValues([restVals[0], ...src])) };
    case "Contains": {
      if (restVals.length !== 1) return null;
      return { value: src.some((x) => valueEquals(x, restVals[0])) };
    }
    case "SequenceEqual": {
      if (restVals.length !== 1) return null;
      const other = restVals[0];
      if (!Array.isArray(other)) fail("Enumerable.SequenceEqual の引数はコレクションです", "CompileError");
      return { value: src.length === other.length && src.every((x, i) => valueEquals(x, other[i])) };
    }
    case "Except": case "Intersect": case "Union": {
      if (restVals.length !== 1) return null;
      const other = restVals[0];
      if (!Array.isArray(other)) fail(`Enumerable.${method} の引数はコレクションです`, "CompileError");
      if (method === "Except") return { value: withElemSys(makeHashSet(src.filter((x) => !other.some((y) => valueEquals(x, y))), null).slice(), srcSys) };
      if (method === "Intersect") return { value: withElemSys(makeHashSet(src.filter((x) => other.some((y) => valueEquals(x, y))), null).slice(), srcSys) };
      return { value: withElemSys(makeHashSet([...src, ...other], null).slice(), srcSys) };
    }
    case "DefaultIfEmpty": {
      if (src.length) return { value: withElemSys(src, srcSys) };
      const dv = restVals.length ? restVals[0] : defaultOf(elem);
      return { value: withElemSys([dv], srcSys ?? inferElemSysFromValues([dv])) };
    }
    case "AsEnumerable": noPredArg(); return { value: withElemSys(src, srcSys) };
    case "ToArray": noPredArg(); return { value: withElemSys([...src], srcSys) };
    case "ToList": noPredArg(); return { value: makeList(src, sysElemName(H, sourceNode, s, src)) };
    case "ToHashSet": noPredArg(); return { value: makeHashSet(src, sysElemName(H, sourceNode, s, src)) };
    default: return null;
  }
}

// ================= インスタンスディスパッチ =================
function dispatchInstance(receiver, receiverNode, method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { s } = ctx;
  if (receiver === null || receiver === undefined) {
    // 静的型名でない変数の null に対する呼び出しは NullReferenceException。
    fail("null参照です", "NullReferenceException");
  }
  if (isUnk(H, receiver)) {
    const voidLike = ["Add", "Clear", "Sort", "Reverse", "RemoveAt", "Insert", "CopyTo", "SetValue", "Enqueue", "Push", "Append", "AppendLine"];
    if (voidLike.includes(method)) fail(`未確定の対象への ${method} は未対応です`, "未対応");
    return { value: H.unknown(`未確定の対象の ${method}`) };
  }
  if (typeof receiver === "string") {
    const t = H.typeOf(receiverNode, s);
    if (t === "char") return charInstance(receiver, method, env);
    return stringInstance(receiver, receiverNode, method, env);
  }
  // 数値・bool のインスタンスメンバー（ToString 等）は棚卸しの項目に
  // 無いため対象外（従来の汎用停止のまま）。Char は項目があるため別扱い。
  if (typeof receiver === "number") return null;
  if (typeof receiver === "boolean") return null;
  if (Array.isArray(receiver)) {
    if (receiver.__adv === "List") return listInstance(receiver, receiverNode, method, env);
    if (receiver.__adv === "HashSet") return hashSetInstance(receiver, receiverNode, method, env);
    const linq = enumerableCall(receiver, receiverNode, method, env, false);
    if (linq) return linq;
    return arrayInstance(receiver, receiverNode, method, env);
  }
  if (receiver?.__adv === "DateTime") return dateTimeInstance(receiver, method, env);
  if (receiver?.__adv === "TimeSpan") return timeSpanInstance(receiver, method, env);
  if (receiver?.__class) {
    if (method === "ToString") return { value: receiver.__class };
    if (method === "Equals") return { value: receiver === ctx.values[0] };
    if (method === "GetHashCode") unsupported("GetHashCode（オブジェクトの同一性ハッシュはモデル化できません）");
    if (method === "GetType") unsupported("GetType（型オブジェクト）");
    return null;
  }
  return null;
}
function objectFallback(v, method, env, toStringValue) {
  const { ctx, H, unsupported } = env;
  switch (method) {
    case "ToString": return { value: toStringValue };
    case "Equals": return { value: valueEquals(v, ctx.values[0]) };
    case "GetType": unsupported("GetType（型オブジェクト）"); return null;
    default: return null;
  }
}
function stringInstance(str, receiverNode, method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s } = ctx;
  const anyUnknown = values.some((v) => isUnk(H, v));
  const needStr = (v, what) => {
    if (v === null) fail(`${what} が null です`, "ArgumentNullException");
    if (typeof v !== "string") fail(`${what} は文字列です`, "CompileError");
    return v;
  };
  switch (method) {
    case "ToString": {
      if (values.length === 0) return { value: str };
      unsupported("String.ToString のこのオーバーロード");
      return null;
    }
    case "Equals": {
      if (values.length !== 1) return null;
      if (anyUnknown) return { value: H.unknown("未確定の文字列との比較") };
      return { value: str === values[0] };
    }
    case "GetHashCode":
      unsupported("String.GetHashCode（.NET ではプロセスごとにランダム化されるため再現できません）");
      return null;
    case "GetType": unsupported("GetType（型オブジェクト）"); return null;
    case "Clone": if (values.length === 0) return { value: str }; return null;
    case "CompareTo": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (v === null) return { value: 1 };
      if (typeof v !== "string") fail("String.CompareTo の引数は文字列です", "CompileError");
      return { value: cultureCompare(str, v) };
    }
    case "Contains": {
      if (values.length !== 1) return null;
      const v = needStr(values[0], "String.Contains の引数");
      if (anyUnknown) return { value: H.unknown("未確定の値を含む検索") };
      return { value: str.includes(v) };
    }
    case "StartsWith": case "EndsWith": {
      if (values.length !== 1) return null;
      const v = needStr(values[0], `String.${method} の引数`);
      return { value: method === "StartsWith" ? str.startsWith(v) : str.endsWith(v) };
    }
    case "IndexOf": case "LastIndexOf": {
      if (values.length < 1 || values.length > 3) return null;
      const v = needStr(values[0], `String.${method} の引数`);
      if (method === "IndexOf") {
        const start = values.length >= 2 ? values[1] : 0;
        if (start < 0 || start > str.length) fail("String.IndexOf の開始位置が範囲外です", "ArgumentOutOfRangeException");
        if (values.length === 3) {
          const count = values[2];
          if (count < 0 || start + count > str.length) fail("String.IndexOf の範囲が文字列の範囲外です", "ArgumentOutOfRangeException");
          if (v === "") return { value: start };
          const idx = str.slice(start, start + count).indexOf(v);
          return { value: idx < 0 ? -1 : start + idx };
        }
        if (v === "") return { value: start };
        return { value: str.indexOf(v, start) };
      }
      if (values.length === 1) return { value: str.lastIndexOf(v) };
      const start = values[1];
      if (start < 0 || start > str.length) fail("String.LastIndexOf の開始位置が範囲外です", "ArgumentOutOfRangeException");
      if (values.length === 3) {
        const count = values[2];
        if (count < 0 || start - count + 1 < 0 && str.length > 0) fail("String.LastIndexOf の範囲が文字列の範囲外です", "ArgumentOutOfRangeException");
        if (v === "") return { value: Math.min(start, str.length - 1) < 0 ? 0 : Math.min(start, str.length) };
        const segEnd = start + 1;
        const segStart = Math.max(0, start - count + 1);
        const idx = str.slice(segStart, segEnd).lastIndexOf(v);
        return { value: idx < 0 ? -1 : segStart + idx };
      }
      if (v === "") return { value: Math.min(start, str.length) };
      return { value: str.slice(0, start + 1).lastIndexOf(v) };
    }
    case "IndexOfAny": case "LastIndexOfAny": {
      if (values.length < 1 || values.length > 3) return null;
      const set = values[0];
      if (set === null) fail("検索文字の配列が null です", "ArgumentNullException");
      if (!Array.isArray(set)) fail(`${method} の引数は char[] です`, "CompileError");
      const chars = set.map((c) => (typeof c === "string" ? c : String.fromCharCode(c)));
      const start = values.length >= 2 ? values[1] : (method === "IndexOfAny" ? 0 : str.length - 1);
      const count = values.length >= 3 ? values[2] : (method === "IndexOfAny" ? str.length - start : start + 1);
      if (method === "IndexOfAny") {
        if (start < 0 || start > str.length || count < 0 || start + count > str.length)
          fail("IndexOfAny の範囲が文字列の範囲外です", "ArgumentOutOfRangeException");
        for (let i = start; i < start + count; i++) if (chars.includes(str[i])) return { value: i };
        return { value: -1 };
      }
      if (str.length === 0) return { value: -1 };
      if (start < 0 || start >= str.length || count < 0 || start - count + 1 < 0)
        fail("LastIndexOfAny の範囲が文字列の範囲外です", "ArgumentOutOfRangeException");
      for (let i = start; i > start - count; i--) if (chars.includes(str[i])) return { value: i };
      return { value: -1 };
    }
    case "Substring": {
      if (values.length === 1) {
        const start = values[0];
        if (start < 0 || start > str.length) fail("String.Substring の開始位置が範囲外です", "ArgumentOutOfRangeException");
        return { value: str.slice(start) };
      }
      if (values.length === 2) {
        const [start, len] = values;
        if (start < 0 || len < 0 || start + len > str.length) fail("String.Substring の範囲が文字列の範囲外です", "ArgumentOutOfRangeException");
        return { value: str.slice(start, start + len) };
      }
      return null;
    }
    case "Insert": {
      if (values.length !== 2) return null;
      const [idx, v] = values;
      if (v === null) fail("挿入する文字列が null です", "ArgumentNullException");
      if (typeof v !== "string") fail("String.Insert の第2引数は文字列です", "CompileError");
      if (idx < 0 || idx > str.length) fail("String.Insert の位置が範囲外です", "ArgumentOutOfRangeException");
      return { value: str.slice(0, idx) + v + str.slice(idx) };
    }
    case "Remove": {
      if (values.length === 1) {
        const start = values[0];
        if (start < 0 || start > str.length) fail("String.Remove の開始位置が範囲外です", "ArgumentOutOfRangeException");
        return { value: str.slice(0, start) };
      }
      if (values.length === 2) {
        const [start, count] = values;
        if (start < 0 || count < 0 || start + count > str.length) fail("String.Remove の範囲が文字列の範囲外です", "ArgumentOutOfRangeException");
        return { value: str.slice(0, start) + str.slice(start + count) };
      }
      return null;
    }
    case "Replace": {
      if (values.length !== 2) return null;
      const [oldV, newV] = values;
      if (typeof oldV === "string" && oldV.length === 1 && typeof newV === "string" && newV.length === 1 && H.typeOf(args[0], s) === "char") {
        return { value: str.split(oldV).join(newV) };
      }
      if (oldV === null) fail("置換元の文字列が null です", "ArgumentNullException");
      if (typeof oldV !== "string") fail("String.Replace の第1引数は文字列または文字です", "CompileError");
      if (oldV === "") fail("置換元の文字列が空です", "ArgumentException");
      const rep = newV === null ? "" : newV;
      if (typeof rep !== "string") fail("String.Replace の第2引数は文字列です", "CompileError");
      return { value: str.split(oldV).join(rep) };
    }
    case "Split": {
      const r = stringSplit(str, env);
      if (r) withElemSys(r.value, "String");
      return r;
    }
    case "Trim": case "TrimStart": case "TrimEnd": {
      let chars = null;
      if (values.length === 1) {
        const v = values[0];
        if (Array.isArray(v)) chars = v.map((c) => (typeof c === "string" ? c : String.fromCharCode(c)));
        else if (typeof v === "string" && v.length === 1) chars = [v];
        else if (typeof v === "number") chars = [String.fromCharCode(v)];
        else if (v === null) chars = null;
        else return null;
      } else if (values.length > 1) return null;
      const test = chars ? (c) => chars.includes(c) : (c) => /\s/.test(c) || c === "\u00A0";
      let a = 0, b = str.length;
      if (method !== "TrimEnd") while (a < b && test(str[a])) a++;
      if (method !== "TrimStart") while (b > a && test(str[b - 1])) b--;
      return { value: str.slice(a, b) };
    }
    case "PadLeft": case "PadRight": {
      if (values.length < 1 || values.length > 2) return null;
      const width = values[0];
      if (width < 0) fail(`String.${method} の幅が負です`, "ArgumentOutOfRangeException");
      const padChar = values.length === 2 ? (typeof values[1] === "string" ? values[1] : String.fromCharCode(values[1])) : " ";
      if (str.length >= width) return { value: str };
      const pad = padChar.repeat(width - str.length);
      return { value: method === "PadLeft" ? pad + str : str + pad };
    }
    case "ToLower": return { value: str.toLowerCase() };
    case "ToUpper": return { value: str.toUpperCase() };
    case "ToLowerInvariant": return { value: str.toLowerCase() };
    case "ToUpperInvariant": return { value: str.toUpperCase() };
    case "ToCharArray": {
      // CS-F06 処置：char[] であることを要素型タグ __elemSys:"Char" で
      // 保持する（表示側が System.Char[] と導出できるようにする）。
      // 要素の表現は基礎の char 値の表現（1文字の文字列）に合わせる：
      // 本ツリーの基礎 char／char[] は一貫して1文字の文字列で保持され
      // （宣言 char[] の最終状態・char スカラーとも実測）、文字コードの
      // 数値に変えると添字アクセス・foreach・Join の既存の正しい表示
      // （'t' 等）がコード値表示（116 等）に壊れることを実測で確認した
      // ため、要素表現は変えずタグで型を保持する。
      if (values.length === 0) return { value: withElemSys([...str], "Char") };
      if (values.length === 2) {
        const [start, len] = values;
        if (start < 0 || len < 0 || start + len > str.length) fail("String.ToCharArray の範囲が文字列の範囲外です", "ArgumentOutOfRangeException");
        return { value: withElemSys([...str.slice(start, start + len)], "Char") };
      }
      return null;
    }
    case "CopyTo": {
      if (values.length !== 4) return null;
      const [srcIdx, dest, destIdx, count] = values;
      if (dest === null) fail("コピー先が null です", "ArgumentNullException");
      if (!Array.isArray(dest)) fail("String.CopyTo のコピー先は char[] です", "CompileError");
      if (srcIdx < 0 || destIdx < 0 || count < 0 || srcIdx + count > str.length || destIdx + count > dest.length)
        fail("String.CopyTo の範囲が範囲外です", "ArgumentOutOfRangeException");
      for (let i = 0; i < count; i++) dest[destIdx + i] = str[srcIdx + i];
      return { value: null };
    }
    default: return null;
  }
}
function stringSplit(str, env) {
  const { ctx, H, fail } = env;
  const { values } = ctx;
  const splitOnChars = (chars) => {
    let parts = [""];
    for (const c of str) {
      if (chars.includes(c)) parts.push("");
      else parts[parts.length - 1] += c;
    }
    return parts;
  };
  const applyCount = (parts, count, sepLenAt) => parts; // count は分割時に処理する
  if (values.length === 0) {
    // 空白区切り（連続区切り間の空要素は残る）
    let parts = [""];
    for (const c of str) {
      if (/\s/.test(c) || c === "\u00A0") parts.push("");
      else parts[parts.length - 1] += c;
    }
    return { value: parts };
  }
  const sepArg = values[0];
  const count = values.length >= 2 ? values[1] : null;
  if (values.length >= 2 && typeof values[1] !== "number") {
    // StringSplitOptions 等の列挙型オーバーロードは引数評価で到達しない。
    fail("String.Split のこのオーバーロードは未対応です（StringSplitOptions 指定）", "未対応");
  }
  if (count !== null && count < 0) fail("String.Split の個数が負です", "ArgumentOutOfRangeException");
  if (Array.isArray(sepArg)) {
    const chars = sepArg.map((c) => (typeof c === "string" ? c : String.fromCharCode(c)));
    if (!chars.length) {
      let parts = [""];
      for (const c of str) { if (/\s/.test(c)) parts.push(""); else parts[parts.length - 1] += c; }
      return { value: parts };
    }
    if (count === null) return { value: splitOnChars(chars) };
    // count 指定：最後の要素に残りを残す
    let parts = [];
    let cur = "";
    let splits = 0;
    for (const c of str) {
      if (chars.includes(c) && splits < count - 1) { parts.push(cur); cur = ""; splits++; }
      else cur += c;
    }
    parts.push(cur);
    return { value: parts };
  }
  if (typeof sepArg === "string") {
    if (sepArg.length === 1 && values.length <= 2 && ctx.args[0] && H.typeOf(ctx.args[0], ctx.s) === "char") {
      if (count === null) return { value: splitOnChars([sepArg]) };
      let parts = [];
      let cur = "";
      let splits = 0;
      for (const c of str) {
        if (c === sepArg && splits < count - 1) { parts.push(cur); cur = ""; splits++; }
        else cur += c;
      }
      parts.push(cur);
      return { value: parts };
    }
    if (sepArg === "") fail("区切り文字列が空です", "ArgumentException");
    if (count === null) return { value: str.split(sepArg) };
    let parts = [];
    let rest = str;
    while (parts.length < count - 1) {
      const idx = rest.indexOf(sepArg);
      if (idx < 0) break;
      parts.push(rest.slice(0, idx));
      rest = rest.slice(idx + sepArg.length);
    }
    parts.push(rest);
    return { value: parts };
  }
  if (sepArg === null) {
    let parts = [""];
    for (const c of str) { if (/\s/.test(c)) parts.push(""); else parts[parts.length - 1] += c; }
    return { value: parts };
  }
  return null;
}
function charInstance(ch, method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { values } = ctx;
  switch (method) {
    case "ToString": return { value: ch };
    case "Equals": return { value: values.length === 1 && values[0] === ch };
    case "CompareTo": {
      if (values.length !== 1 || typeof values[0] !== "string") return null;
      return { value: ch.charCodeAt(0) - values[0].charCodeAt(0) };
    }
    case "GetHashCode": return { value: ch.charCodeAt(0) | (ch.charCodeAt(0) << 16) };
    case "GetType": unsupported("GetType（型オブジェクト）"); return null;
    default: return null;
  }
}
function arrayDepth(arr) {
  let d = 0, cur = arr;
  while (Array.isArray(cur)) { d++; cur = cur[0]; }
  return d;
}
function arrayInstance(arr, receiverNode, method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { args, values, s } = ctx;
  switch (method) {
    case "Clone": {
      if (values.length !== 0) return null;
      return { value: withElemSys(arr.slice(), sysForResult(H, receiverNode, s, arr, arr)) };
    }
    case "CopyTo": {
      if (values.length !== 2) return null;
      const [dest, destIdx] = values;
      if (dest === null) fail("コピー先が null です", "ArgumentNullException");
      if (!Array.isArray(dest)) fail("Array.CopyTo のコピー先は配列です", "CompileError");
      if (destIdx < 0 || destIdx + arr.length > dest.length) fail("Array.CopyTo の範囲が配列の範囲外です", "ArgumentOutOfRangeException");
      const snap = arr.slice();
      for (let i = 0; i < snap.length; i++) dest[destIdx + i] = snap[i];
      syncCollection(dest);
      return { value: null };
    }
    case "GetLength": {
      if (values.length !== 1) return null;
      const dim = values[0];
      const depth = arrayDepth(arr);
      if (dim < 0 || dim >= depth) fail("次元が範囲外です", "IndexOutOfRangeException");
      let cur = arr;
      for (let i = 0; i < dim; i++) cur = cur[0];
      return { value: Array.isArray(cur) ? cur.length : 0 };
    }
    case "GetUpperBound": {
      if (values.length !== 1) return null;
      const dim = values[0];
      const depth = arrayDepth(arr);
      if (dim < 0 || dim >= depth) fail("次元が範囲外です", "IndexOutOfRangeException");
      let cur = arr;
      for (let i = 0; i < dim; i++) cur = cur[0];
      return { value: (Array.isArray(cur) ? cur.length : 0) - 1 };
    }
    case "GetLowerBound": {
      if (values.length !== 1) return null;
      const dim = values[0];
      if (dim < 0 || dim >= arrayDepth(arr)) fail("次元が範囲外です", "IndexOutOfRangeException");
      return { value: 0 };
    }
    case "GetValue": {
      if (!values.length) return null;
      let cur = arr;
      for (const idx of values) {
        if (!Array.isArray(cur) || !Number.isInteger(idx) || idx < 0 || idx >= cur.length)
          fail("配列範囲外です", "IndexOutOfRangeException");
        cur = cur[idx];
      }
      return { value: cur };
    }
    case "SetValue": {
      if (values.length < 2) return null;
      const [val, ...idxs] = values;
      let cur = arr;
      for (let i = 0; i < idxs.length - 1; i++) {
        const idx = idxs[i];
        if (!Array.isArray(cur) || idx < 0 || idx >= cur.length) fail("配列範囲外です", "IndexOutOfRangeException");
        cur = cur[idx];
      }
      const last = idxs[idxs.length - 1];
      if (!Array.isArray(cur) || last < 0 || last >= cur.length) fail("配列範囲外です", "IndexOutOfRangeException");
      cur[last] = val;
      return { value: null };
    }
    case "ToString": {
      if (values.length !== 0) return null;
      return { value: H.csArrayTypeName(receiverNode, arr, s, H.typeOf(receiverNode, s)) ?? "System.Object[]" };
    }
    case "Equals": return { value: values.length === 1 && arr === values[0] };
    case "GetHashCode": unsupported("GetHashCode（配列の同一性ハッシュはモデル化できません）"); return null;
    case "GetType": unsupported("GetType（型オブジェクト）"); return null;
    default: return null;
  }
}
function listInstance(list, receiverNode, method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { values, s } = ctx;
  const predMethods = ["Exists", "Find", "FindAll", "FindIndex", "FindLast", "FindLastIndex", "ForEach", "ConvertAll", "RemoveAll"];
  if (predMethods.includes(method)) { unsupported(`List<T>.${method}（述語・変換子はラムダ式のため到達できません）`); return null; }
  const growIfNeeded = () => {
    if (list.length >= (list.Capacity ?? 0))
      list.Capacity = (list.Capacity ?? 0) === 0 ? Math.max(4, list.length) : (list.Capacity ?? 0) * 2;
  };
  switch (method) {
    case "Add":
      if (values.length !== 1) return null;
      growIfNeeded();
      list.push(values[0]); list.Count = list.length;
      return { value: null };
    case "AddRange": {
      if (values.length !== 1 || !Array.isArray(values[0])) return null;
      for (const x of values[0]) { growIfNeeded(); list.push(x); }
      list.Count = list.length;
      return { value: null };
    }
    case "Clear": list.length = 0; list.Count = 0; return { value: null };
    case "Contains": return { value: values.length === 1 && list.some((x) => valueEquals(x, values[0])) };
    case "IndexOf": {
      if (values.length === 1) {
        for (let i = 0; i < list.length; i++) if (valueEquals(list[i], values[0])) return { value: i };
        return { value: -1 };
      }
      if (values.length === 2 || values.length === 3) {
        const start = values[1];
        const count = values.length === 3 ? values[2] : list.length - start;
        if (start < 0 || start > list.length || count < 0 || start + count > list.length)
          fail("List.IndexOf の範囲が範囲外です", "ArgumentOutOfRangeException");
        for (let i = start; i < start + count; i++) if (valueEquals(list[i], values[0])) return { value: i };
        return { value: -1 };
      }
      return null;
    }
    case "LastIndexOf": {
      if (values.length === 1) {
        for (let i = list.length - 1; i >= 0; i--) if (valueEquals(list[i], values[0])) return { value: i };
        return { value: -1 };
      }
      return null;
    }
    case "Insert": {
      if (values.length !== 2) return null;
      const [idx, v] = values;
      if (idx < 0 || idx > list.length) fail("List.Insert の位置が範囲外です", "ArgumentOutOfRangeException");
      growIfNeeded();
      list.splice(idx, 0, v); list.Count = list.length;
      return { value: null };
    }
    case "InsertRange": {
      if (values.length !== 2 || !Array.isArray(values[1])) return null;
      const idx = values[0];
      if (idx < 0 || idx > list.length) fail("List.InsertRange の位置が範囲外です", "ArgumentOutOfRangeException");
      list.splice(idx, 0, ...values[1]);
      if (list.length > (list.Capacity ?? 0)) list.Capacity = list.length;
      list.Count = list.length;
      return { value: null };
    }
    case "Remove": {
      if (values.length !== 1) return null;
      const i = list.findIndex((x) => valueEquals(x, values[0]));
      if (i < 0) return { value: false };
      list.splice(i, 1); list.Count = list.length;
      return { value: true };
    }
    case "RemoveAt": {
      if (values.length !== 1) return null;
      const idx = values[0];
      if (idx < 0 || idx >= list.length) fail("List.RemoveAt の位置が範囲外です", "ArgumentOutOfRangeException");
      list.splice(idx, 1); list.Count = list.length;
      return { value: null };
    }
    case "RemoveRange": {
      if (values.length !== 2) return null;
      const [idx, count] = values;
      if (idx < 0 || count < 0 || idx + count > list.length) fail("List.RemoveRange の範囲が範囲外です", "ArgumentOutOfRangeException");
      list.splice(idx, count); list.Count = list.length;
      return { value: null };
    }
    case "Reverse": {
      if (values.length === 0) { list.reverse(); return { value: null }; }
      if (values.length === 2) {
        const [idx, count] = values;
        if (idx < 0 || count < 0 || idx + count > list.length) fail("List.Reverse の範囲が範囲外です", "ArgumentOutOfRangeException");
        const seg = list.slice(idx, idx + count).reverse();
        for (let i = 0; i < count; i++) list[idx + i] = seg[i];
        return { value: null };
      }
      return null;
    }
    case "Sort": {
      if (values.length !== 0) { unsupported("List<T>.Sort の比較子付きオーバーロード"); return null; }
      const copy = [...list];
      copy.sort((a, b) => { const c = compareValues(a, b); if (c === null) fail("要素を比較できません", "InvalidOperationException"); return c; });
      for (let i = 0; i < copy.length; i++) list[i] = copy[i];
      return { value: null };
    }
    case "BinarySearch": {
      if (values.length !== 1) { if (values.length > 1) unsupported("List<T>.BinarySearch のこのオーバーロード"); return null; }
      let lo = 0, hi = list.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const c = compareValues(list[mid], values[0]);
        if (c === null) fail("要素を比較できません", "InvalidOperationException");
        if (c === 0) return { value: mid };
        if (c < 0) lo = mid + 1; else hi = mid - 1;
      }
      return { value: ~lo };
    }
    case "GetRange": {
      if (values.length !== 2) return null;
      const [idx, count] = values;
      if (idx < 0 || count < 0 || idx + count > list.length) fail("List.GetRange の範囲が範囲外です", "ArgumentOutOfRangeException");
      return { value: makeList(list.slice(idx, idx + count), list.__elem) };
    }
    case "ToArray": return { value: withElemSys([...list], list.__elem || inferElemSysFromValues(list)) };
    case "CopyTo": {
      if (values.length < 1 || values.length > 2) return null;
      const dest = values[0];
      const destIdx = values.length === 2 ? values[1] : 0;
      if (!Array.isArray(dest)) fail("List.CopyTo のコピー先は配列です", "CompileError");
      if (destIdx < 0 || destIdx + list.length > dest.length) fail("List.CopyTo の範囲が範囲外です", "ArgumentOutOfRangeException");
      for (let i = 0; i < list.length; i++) dest[destIdx + i] = list[i];
      syncCollection(dest);
      return { value: null };
    }
    case "AsReadOnly": unsupported("List<T>.AsReadOnly（ReadOnlyCollection はモデルにありません）"); return null;
    case "TrimExcess": {
      if (list.length < (list.Capacity ?? 0) * 0.9) list.Capacity = list.length;
      return { value: null };
    }
    case "ToString": return { value: `System.Collections.Generic.List\`1[System.${list.__elem || "Object"}]` };
    case "Equals": return { value: values.length === 1 && list === values[0] };
    case "GetHashCode": unsupported("GetHashCode（同一性ハッシュはモデル化できません）"); return null;
    case "GetType": unsupported("GetType（型オブジェクト）"); return null;
    default: {
      const linq = enumerableCall(list, receiverNode, method, env, false);
      if (linq) return linq;
      return null;
    }
  }
}
function hashSetInstance(set, receiverNode, method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { values } = ctx;
  const otherArr = (v) => {
    if (v === null) fail("引数が null です", "ArgumentNullException");
    if (!Array.isArray(v)) fail("引数はコレクションです", "CompileError");
    return [...v];
  };
  switch (method) {
    case "Add": {
      if (values.length !== 1) return null;
      if (set.some((x) => valueEquals(x, values[0]))) return { value: false };
      set.push(values[0]); set.Count = set.length;
      return { value: true };
    }
    case "Clear": set.length = 0; set.Count = 0; return { value: null };
    case "Contains": return { value: values.length === 1 && set.some((x) => valueEquals(x, values[0])) };
    case "Remove": {
      if (values.length !== 1) return null;
      const i = set.findIndex((x) => valueEquals(x, values[0]));
      if (i < 0) return { value: false };
      set.splice(i, 1); set.Count = set.length;
      return { value: true };
    }
    case "RemoveWhere": unsupported("HashSet<T>.RemoveWhere（述語はラムダ式のため到達できません）"); return null;
    case "CopyTo": {
      if (values.length < 1 || values.length > 2) return null;
      const dest = values[0];
      const destIdx = values.length === 2 ? values[1] : 0;
      if (!Array.isArray(dest)) fail("HashSet.CopyTo のコピー先は配列です", "CompileError");
      if (destIdx < 0 || destIdx + set.length > dest.length) fail("HashSet.CopyTo の範囲が範囲外です", "ArgumentOutOfRangeException");
      for (let i = 0; i < set.length; i++) dest[destIdx + i] = set[i];
      syncCollection(dest);
      return { value: null };
    }
    case "UnionWith": {
      if (values.length !== 1) return null;
      for (const x of otherArr(values[0])) if (!set.some((y) => valueEquals(x, y))) set.push(x);
      set.Count = set.length;
      return { value: null };
    }
    case "IntersectWith": {
      if (values.length !== 1) return null;
      const other = otherArr(values[0]);
      const keep = set.filter((x) => other.some((y) => valueEquals(x, y)));
      set.length = 0; set.push(...keep); set.Count = set.length;
      return { value: null };
    }
    case "ExceptWith": {
      if (values.length !== 1) return null;
      const other = otherArr(values[0]);
      const keep = set.filter((x) => !other.some((y) => valueEquals(x, y)));
      set.length = 0; set.push(...keep); set.Count = set.length;
      return { value: null };
    }
    case "SymmetricExceptWith": {
      if (values.length !== 1) return null;
      const other = makeHashSet(otherArr(values[0]), null);
      const result = makeHashSet([...set.filter((x) => !other.some((y) => valueEquals(x, y))), ...other.filter((x) => !set.some((y) => valueEquals(x, y)))], null);
      set.length = 0; set.push(...result); set.Count = set.length;
      return { value: null };
    }
    case "IsSubsetOf": case "IsProperSubsetOf": case "IsSupersetOf": case "IsProperSupersetOf": case "Overlaps": case "SetEquals": {
      if (values.length !== 1) return null;
      const other = makeHashSet(otherArr(values[0]), null);
      const sub = set.every((x) => other.some((y) => valueEquals(x, y)));
      const sup = other.every((x) => set.some((y) => valueEquals(x, y)));
      if (method === "IsSubsetOf") return { value: sub };
      if (method === "IsProperSubsetOf") return { value: sub && other.length > set.length };
      if (method === "IsSupersetOf") return { value: sup };
      if (method === "IsProperSupersetOf") return { value: sup && set.length > other.length };
      if (method === "Overlaps") return { value: set.some((x) => other.some((y) => valueEquals(x, y))) };
      return { value: sub && sup };
    }
    case "TryGetValue": unsupported("HashSet<T>.TryGetValue（out 引数のこの形式は解析段階で未対応）"); return null;
    case "TrimExcess": return { value: null };
    case "ToString": return { value: `System.Collections.Generic.HashSet\`1[System.${set.__elem || "Object"}]` };
    case "Equals": return { value: values.length === 1 && set === values[0] };
    case "GetHashCode": unsupported("GetHashCode（同一性ハッシュはモデル化できません）"); return null;
    case "GetType": unsupported("GetType（型オブジェクト）"); return null;
    default: {
      const linq = enumerableCall(set, receiverNode, method, env, false);
      if (linq) return linq;
      return null;
    }
  }
}
function dateTimeInstance(dt, method, env) {
  const { ctx, H, fail, unsupported } = env;
  const { values } = ctx;
  const addMs = (ms) => {
    if (!Number.isFinite(ms)) fail("DateTime の範囲外です", "ArgumentOutOfRangeException");
    return { value: dateTimeFromKeyMs(dt.__keyMs + ms, fail) };
  };
  switch (method) {
    case "Add": {
      if (values.length !== 1 || values[0]?.__adv !== "TimeSpan") return null;
      return addMs(values[0].TotalMilliseconds);
    }
    case "AddDays": return addMs(values[0] * 86400000);
    case "AddHours": return addMs(values[0] * 3600000);
    case "AddMinutes": return addMs(values[0] * 60000);
    case "AddSeconds": return addMs(values[0] * 1000);
    case "AddMilliseconds": return addMs(values[0]);
    case "AddTicks": {
      const v = values[0];
      if (isUnk(H, v)) return { value: H.unknown("未確定のティック数による DateTime") };
      return addMs(v / 10000);
    }
    case "AddMonths": case "AddYears": {
      const n = values[0];
      if (typeof n !== "number" || !Number.isInteger(n)) fail(`DateTime.${method} の引数は整数です`, "CompileError");
      let y = dt.Year, mo = dt.Month;
      if (method === "AddYears") y += n;
      else { const total = (y * 12 + (mo - 1)) + n; y = Math.floor(total / 12); mo = total - y * 12 + 1; }
      if (y < 1 || y > 9999) fail("DateTime の範囲外です", "ArgumentOutOfRangeException");
      const d = Math.min(dt.Day, daysInMonth(y, mo));
      const timeMs = dt.Hour * 3600000 + dt.Minute * 60000 + dt.Second * 1000 + dt.__msFrac;
      return { value: dateTimeFromKeyMs(daysFromCivil(y, mo, d) * 86400000 + timeMs, fail) };
    }
    case "Subtract": {
      if (values.length !== 1) return null;
      const v = values[0];
      if (v?.__adv === "TimeSpan") return addMs(-v.TotalMilliseconds);
      if (v?.__adv === "DateTime") return { value: makeTimeSpan(dt.__keyMs - v.__keyMs) };
      return null;
    }
    case "Equals": return { value: values.length === 1 && values[0]?.__adv === "DateTime" && values[0].__keyMs === dt.__keyMs };
    case "CompareTo": {
      if (values.length !== 1 || values[0]?.__adv !== "DateTime") return null;
      return { value: dt.__keyMs < values[0].__keyMs ? -1 : dt.__keyMs > values[0].__keyMs ? 1 : 0 };
    }
    case "ToString": {
      if (values.length === 0) return { value: dateTimeToString(dt, null, fail) };
      if (values.length === 1 && typeof values[0] === "string") return { value: dateTimeToString(dt, values[0], fail) };
      unsupported("DateTime.ToString のこのオーバーロード（書式プロバイダ指定）");
      return null;
    }
    case "ToLongDateString": return { value: dateTimeToString(dt, "D", fail) };
    case "ToLongTimeString": return { value: dateTimeToString(dt, "T", fail) };
    case "ToShortDateString": return { value: dateTimeToString(dt, "d", fail) };
    case "ToShortTimeString": return { value: dateTimeToString(dt, "t", fail) };
    case "GetHashCode": unsupported("DateTime.GetHashCode（ティック精度をモデルで保持しないため）"); return null;
    case "GetType": unsupported("GetType（型オブジェクト）"); return null;
    default: return null;
  }
}
function timeSpanInstance(ts, method, env) {
  const { ctx, fail, unsupported } = env;
  const { values } = ctx;
  switch (method) {
    case "Add": {
      if (values.length !== 1 || values[0]?.__adv !== "TimeSpan") return null;
      return { value: makeTimeSpan(ts.TotalMilliseconds + values[0].TotalMilliseconds) };
    }
    case "Subtract": {
      if (values.length !== 1 || values[0]?.__adv !== "TimeSpan") return null;
      return { value: makeTimeSpan(ts.TotalMilliseconds - values[0].TotalMilliseconds) };
    }
    case "Negate": return { value: makeTimeSpan(-ts.TotalMilliseconds) };
    case "Duration": return { value: makeTimeSpan(Math.abs(ts.TotalMilliseconds)) };
    case "Equals": return { value: values.length === 1 && values[0]?.__adv === "TimeSpan" && values[0].TotalMilliseconds === ts.TotalMilliseconds };
    case "CompareTo": {
      if (values.length !== 1 || values[0]?.__adv !== "TimeSpan") return null;
      return { value: ts.TotalMilliseconds < values[0].TotalMilliseconds ? -1 : ts.TotalMilliseconds > values[0].TotalMilliseconds ? 1 : 0 };
    }
    case "ToString": {
      if (values.length === 0) return { value: timeSpanToString(ts, null, fail) };
      if (values.length === 1 && typeof values[0] === "string") return { value: timeSpanToString(ts, values[0], fail) };
      unsupported("TimeSpan.ToString のこのオーバーロード（書式プロバイダ指定）");
      return null;
    }
    case "GetHashCode": unsupported("TimeSpan.GetHashCode"); return null;
    case "GetType": unsupported("GetType（型オブジェクト）"); return null;
    default: return null;
  }
}
