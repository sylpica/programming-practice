// AutoHotkey v2 高度モード差分（ADV-B2）の意味論。
// 有効化の契約：機構の advanced-loader が高度モードで advanced-engine.js の
// applyAdvancedEngine を呼ぶことで有効化される。未適用（簡易モード相当）
// では基礎挙動と完全一致する（既定では無効であり、index.js は高度ハンドラ
// へ委譲せず、基礎どおり名前を挙げて停止する）。
// 基礎 index.js の呼び出しディスパッチ（semantics.call の default）と
// 文ディスパッチ（semantics.step）から委譲されるハンドラ表。
// 値モデルは基礎に合わせる：配列は JS 配列（添字は1始まり）、真偽は 1/0、
// Float は基礎のタグ付き表現（ctx.H.isFloat / ctx.H.float）、
// 実行時に決まる値は unknown のまま扱い、値を捏造しない。
// 未対応項目はここでは扱わず、基礎側の未対応停止（名前を挙げる）に任せる。
import { isUnknown, unknown, LIMITS } from "../../core/contract.js";

// 高度意味論の有効化状態（共有オブジェクト）。既定は無効（false）。
// 有効化は advanced-engine.js の applyAdvancedEngine から enableAdvanced()
// を呼ぶ経路でのみ行う（機構の advanced-loader が高度モードでそれを呼ぶ）。
// index.js は実行時にこのオブジェクトを参照するため、適用は再読み込み
// なしに反映される。未適用の間、index.js は高度ハンドラへ一切委譲しない。
export const advancedState = { enabled: false };
export function enableAdvanced() {
  advancedState.enabled = true;
}
export function disableAdvanced() {
  advancedState.enabled = false;
}

// ---------------------------------------------------------------------------
// 値の表現（Map / Buffer / RegExMatchInfo）
// ---------------------------------------------------------------------------
export const isAhkMap = (v) =>
  !!v && typeof v === "object" && !Array.isArray(v) && v.__ahkType === "Map" && Array.isArray(v.entries);
export const makeAhkMap = (entries = []) => ({
  __ahkType: "Map",
  entries,
  Count: entries.length,
  // 公式：CaseSense プロパティは既定で "On" として読み出せる。
  CaseSense: "On",
});
// Map の Count プロパティを要素数に同期する（すべての変更系ハンドラから呼ぶ）。
export function syncMapCount(m) {
  m.Count = m.entries.length;
}
export const isAhkBuffer = (v) =>
  !!v && typeof v === "object" && !Array.isArray(v) && v.__ahkType === "Buffer" && Array.isArray(v.bytes);
export const isMatchInfo = (v) =>
  !!v && typeof v === "object" && !Array.isArray(v) && v.__ahkType === "RegExMatchInfo";

// Map のキー一致（公式：既定の CaseSense は On＝文字列キーは大小区別。
// Integer 1 と Float 1.0 は別のキー。CaseSense が Off／Locale／0 のときは
// 文字列キーを大小区別なしで比べる。公式 Map ページ：
// https://www.autohotkey.com/docs/v2/lib/Map.htm ）
function mapCaseInsensitive(m) {
  const cs = m?.CaseSense;
  if (cs === undefined || cs === null) return false;
  if (typeof cs === "number") return cs === 0;
  if (typeof cs === "boolean") return !cs;
  const t = String(cs).trim().toLowerCase();
  return t === "off" || t === "locale" || t === "0" || t === "false";
}
function mapKeyEq(H, a, b, ci = false) {
  const fa = H.isFloat(a), fb = H.isFloat(b);
  a = H.unf(a); b = H.unf(b);
  if (typeof a === "number" && typeof b === "number") return fa === fb && a === b;
  if (typeof a === "string" && typeof b === "string")
    return ci ? a.toLowerCase() === b.toLowerCase() : a === b;
  return a === b;
}
function mapFind(H, m, key) {
  const ci = mapCaseInsensitive(m);
  return m.entries.findIndex(([k]) => mapKeyEq(H, k, key, ci));
}

// ---------------------------------------------------------------------------
// 対応表（基礎の未対応停止より前に名乗りを上げる名前）
// ---------------------------------------------------------------------------
export const ADVANCED_FUNCTIONS = new Set([
  "abs", "acos", "asin", "atan", "ceil", "chr", "cos", "dateadd", "datediff",
  "exp", "float", "floor", "format", "formattime", "hasbase", "hasmethod",
  "hasprop", "instr", "integer", "islabel", "isobject", "ln", "log", "max",
  "min", "mod", "number", "numget", "numput", "objhasownprop",
  "objownpropcount", "ord", "outputdebug", "random", "regexmatch",
  "regexreplace", "round", "sin", "sort", "splitpath", "sqrt", "strcompare",
  "strget", "strlen", "strlower", "strptr", "strput", "strreplace",
  "strsplit", "strtitle", "strupper", "string", "substr", "tan", "trim",
  "ltrim", "rtrim", "type", "vercompare",
  // クラス呼び出し（Call メソッドの呼び出し形）
  "array", "map", "buffer",
  // 文として使う関数
  "exit", "ahkthrowstmt",
]);
export const ADVANCED_METHODS = new Set([
  // Array
  "call", "clone", "delete", "get", "has", "insertat", "pop", "push",
  "removeat", "__new",
  // Map（call/clone/delete/get/has は Array と共有）
  "clear", "set",
  // Object（clone は共有）
  "defineprop", "deleteprop", "getownpropdesc", "hasownprop",
  // RegExMatchInfo
  "pos", "len", "name",
]);
export const ADVANCED_STEP_KINDS = new Set(["ahkTry", "ahkSwitch", "ahkLoopParse"]);

// name は callName() の結果（関数名、または "変数名.メソッド名" 形）。
export function advancedClaimsCall(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  if (!lower.includes(".")) return ADVANCED_FUNCTIONS.has(lower);
  return ADVANCED_METHODS.has(lower.slice(lower.lastIndexOf(".") + 1));
}

// ---------------------------------------------------------------------------
// 共通ヘルパ
// ---------------------------------------------------------------------------
function arity(ctx, min, max, label) {
  const n = ctx.args.length;
  if (n < min || n > max)
    ctx.api.fail(
      `引数の数が一致していません：${label} は${min === max ? min + "個" : min + "〜" + max + "個"}です`,
      ctx.node, "TypeError");
}
function needKnown(ctx, v, label) {
  if (isUnknown(v)) return unknown(`${label}の結果`);
  return null;
}
function byRefTarget(ctx, i) {
  const a = ctx.args[i];
  return a && a.k === "unary" && a.op === "&" ? a.arg : null;
}
function writeByRef(ctx, i, value) {
  const t = byRefTarget(ctx, i);
  if (t) ctx.api.write(t, value, ctx.s, ctx.node);
}
const boolWord = (v, H) => {
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "on" || t === "true") return true;
    if (t === "off" || t === "false") return false;
  }
  return H.truth(v) === true || v === 1;
};

// ---------------------------------------------------------------------------
// 日時（YYYYMMDDHH24MISS。省略要素は MM=01 DD=01 HH24=00 MI=00 SS=00）
// ---------------------------------------------------------------------------
function parseTimestamp(ctx, v, label) {
  const H = ctx.H;
  const text = H.str(v).trim();
  if (!/^\d{4}(\d{2}(\d{2}(\d{2}(\d{2}(\d{2})?)?)?)?)?$/.test(text))
    ctx.api.fail(`${label} は YYYYMMDDHH24MISS 形式のタイムスタンプで指定してください`, ctx.node, "ValueError");
  const p = (a, b, d) => (text.length >= b ? Number(text.slice(a, b)) : d);
  const ts = {
    y: Number(text.slice(0, 4)), mo: p(4, 6, 1), d: p(6, 8, 1),
    h: p(8, 10, 0), mi: p(10, 12, 0), s: p(12, 14, 0),
  };
  if (ts.y < 1601 || ts.mo < 1 || ts.mo > 12 || ts.d < 1 || ts.d > 31 || ts.h > 23 || ts.mi > 59 || ts.s > 59)
    ctx.api.fail(`${label} に無効なタイムスタンプが指定されています（年は1601以上）`, ctx.node, "ValueError");
  const dt = new Date(Date.UTC(ts.y, ts.mo - 1, ts.d, ts.h, ts.mi, ts.s));
  if (dt.getUTCFullYear() !== ts.y || dt.getUTCMonth() !== ts.mo - 1 || dt.getUTCDate() !== ts.d)
    ctx.api.fail(`${label} に存在しない日付が指定されています`, ctx.node, "ValueError");
  return dt;
}
function formatTimestamp(dt) {
  const p2 = (n) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}${p2(dt.getUTCMonth() + 1)}${p2(dt.getUTCDate())}${p2(dt.getUTCHours())}${p2(dt.getUTCMinutes())}${p2(dt.getUTCSeconds())}`;
}
function dateUnit(ctx, v) {
  const t = ctx.H.str(v).trim().toLowerCase();
  const table = { seconds: 1, second: 1, s: 1, minutes: 60, minute: 60, m: 60, hours: 3600, hour: 3600, h: 3600, days: 86400, day: 86400, d: 86400 };
  if (!(t in table))
    ctx.api.fail("時間の単位は Seconds / Minutes / Hours / Days のいずれかです", ctx.node, "ValueError");
  return table[t];
}

// ---------------------------------------------------------------------------
// 正規表現（PCRE → JavaScript RegExp の部分変換）
// ---------------------------------------------------------------------------
function parseAhkPattern(ctx, pattern) {
  let options = "", body = pattern;
  const m = pattern.match(/^([imsxADJUPC`]+)\)/);
  if (m) { options = m[1]; body = pattern.slice(m[0].length); }
  let flags = "";
  if (options.includes("i")) flags += "i";
  if (options.includes("m")) flags += "m";
  if (options.includes("s")) flags += "s";
  // \Q...\E のリテラル区間は先に退避する（区間内の \A や \p 等を
  // 変換・停止判定の対象にしないため）。
  const literals = [];
  body = body.replace(/\\Q([\s\S]*?)(?:\\E|$)/g, (_, lit) => {
    literals.push(lit);
    return `\u0001${literals.length - 1}\u0002`;
  });
  // 変換できない PCRE 固有構文は、JS の字句として誤って解釈して
  // 「一致しない」という誤った結果を返す前に、構文名を挙げて止める。
  // （\K＝マッチ開始位置のリセット、\G＝前回マッチ位置、\h／\H＝
  // 水平空白クラス、\Z＝末尾または最終改行の前、\R＝改行、\X＝
  // 書記素クラスタ、\N＝改行以外の1文字、\b{...}＝境界の種類指定、
  // (*...)＝バックトラック制御動詞。いずれも JS RegExp に等価がない）
  let stopToken = null;
  for (let i = 0; i < body.length && !stopToken; i++) {
    if (body[i] === "(" && body[i + 1] === "*") stopToken = body.slice(i, i + 3);
    else if (body[i] === "\\") {
      const nx = body[i + 1] ?? "";
      if ("KGhHZRXN".includes(nx)) stopToken = "\\" + nx;
      else if ((nx === "b" || nx === "B") && body[i + 2] === "{") stopToken = "\\" + nx + "{...}";
      i++; // エスケープ対は1単位として読み飛ばす（\\K のような字句を誤検出しない）
    }
  }
  if (stopToken)
    ctx.api.fail(
      `未対応：PCRE 固有の構文 ${stopToken} はこの教材の正規表現変換では対応していません`,
      ctx.node, "未対応");
  // \p{...}／\P{...}（Unicode プロパティ）は JS でも u フラグで等価に
  // 使える。1文字形 \pL／\PL は波括弧形へ直す。また \A は文字列の先頭、
  // \z は文字列の末尾（最終改行の前ではない）を表し、JS の ^／$ は
  // m フラグや末尾改行で意味がずれるため、先読み・後読みの否定で厳密に
  // 表す。これらの変換は、エスケープ済みの字句（\\A のような「バックス
  // ラッシュ＋文字」のリテラル）や文字クラス内（[\A] 等）を誤って変換
  // しないよう、エスケープと文字クラスを意識した1パス走査で行う
  // （A2監査 F6：従来の正規表現による一括置換は \\A や [\A] を壊した）。
  const conv = convertRegexEscapes(body);
  body = conv.body;
  if (conv.hasUnicodeProperty && !flags.includes("u")) flags += "u";
  // PCRE の名前付きグループ (?P<name>...) と参照 (?P=name) を JS 形へ。
  body = body.replace(/\(\?P<([A-Za-z_][A-Za-z0-9_]*)>/g, "(?<$1>");
  body = body.replace(/\(\?P=([A-Za-z_][A-Za-z0-9_]*)\)/g, "\\k<$1>");
  // \Q...\E のリテラル区間を、特殊文字をエスケープして戻す。
  body = body.replace(/\u0001(\d+)\u0002/g, (_, i) =>
    literals[Number(i)].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (options.includes("x")) body = stripRegexWhitespace(body);
  if (options.includes("U")) body = swapGreediness(body);
  if (/\\x\{[0-9a-fA-F]+\}/.test(body)) {
    body = body.replace(/\\x\{([0-9a-fA-F]+)\}/g, "\\u{$1}");
    if (!flags.includes("u")) flags += "u";
  }
  return { body, flags, anchored: options.includes("A") };
}
// \A／\z の厳密化と \p の波括弧形への正規化を、エスケープ対と文字クラスを
// 意識して1パスで行う。エスケープ済みの \\A（リテラルのバックスラッシュ＋
// A）や、文字クラス内の \A／\z は変換しない。\p は文字クラス内でも有効な
// ため、クラスの内外を問わず検出・正規化する。
function convertRegexEscapes(body) {
  let out = "", inClass = false, hasUnicodeProperty = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\") {
      const nx = body[i + 1] ?? "";
      if (!inClass && nx === "A") { out += "(?<![\\s\\S])"; i++; continue; }
      if (!inClass && nx === "z") { out += "(?![\\s\\S])"; i++; continue; }
      if (nx === "p" || nx === "P") {
        const rest = body.slice(i + 2);
        if (rest.startsWith("{")) {
          hasUnicodeProperty = true;
          out += c + nx;
          i++;
          continue;
        }
        if (/^[A-Za-z](?![A-Za-z}])/.test(rest)) {
          hasUnicodeProperty = true;
          out += "\\" + nx + "{" + rest[0] + "}";
          i += 2;
          continue;
        }
      }
      // それ以外のエスケープ対はそのまま写す（\\ のような対も1単位）。
      out += c + nx;
      i++;
      continue;
    }
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    out += c;
  }
  return { body: out, hasUnicodeProperty };
}
function stripRegexWhitespace(body) {
  let out = "", inClass = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\") { out += c + (body[i + 1] ?? ""); i++; continue; }
    if (c === "[") inClass = true;
    if (c === "]") inClass = false;
    if (!inClass && c === "#") { while (i < body.length && body[i] !== "\n") i++; continue; }
    if (!inClass && /\s/.test(c)) continue;
    out += c;
  }
  return out;
}
function swapGreediness(body) {
  let out = "", inClass = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\") { out += c + (body[i + 1] ?? ""); i++; continue; }
    if (c === "[") inClass = true;
    if (c === "]") inClass = false;
    out += c;
    if (!inClass && (c === "*" || c === "+" || c === "?")) {
      if (body[i + 1] === "?") { i++; } else out += "?";
    } else if (!inClass && c === "}") {
      if (body[i + 1] === "?") i++; else out += "?";
    }
  }
  return out;
}
function compileAhkRegex(ctx, pattern, extraFlags) {
  const { body, flags } = parseAhkPattern(ctx, pattern);
  try {
    return new RegExp(body, flags + extraFlags);
  } catch (e) {
    ctx.api.fail(`この正規表現はモデルで解釈できません：${e.message}`, ctx.node, "ValueError");
  }
}
function regexStartIndex(ctx, haystack, startingPos) {
  const len = haystack.length;
  if (startingPos === undefined || startingPos === null) return 0;
  const p = Math.trunc(ctx.H.num(startingPos, ctx.node));
  if (p > 0) return Math.min(p - 1, len);
  if (p === 0) return len;
  return Math.max(0, len + p);
}
function buildMatchInfo(match) {
  const groups = [{ value: match[0], pos: match.index + 1, len: match[0].length, name: "" }];
  for (let i = 1; i < match.length; i++) {
    const ind = match.indices?.[i];
    groups.push({
      value: match[i] ?? "",
      pos: ind ? ind[0] + 1 : 0,
      len: ind ? ind[1] - ind[0] : 0,
      name: "",
    });
  }
  // 名前付きグループの番号は indices の一致で正確に対応付ける。
  if (match.groups && match.indices?.groups) {
    for (const [name, ind] of Object.entries(match.indices.groups)) {
      if (!ind) continue;
      const idx = match.indices.findIndex((x, i) => i > 0 && x && x[0] === ind[0] && x[1] === ind[1]);
      if (idx > 0) groups[idx].name = name;
    }
  }
  const info = { __ahkType: "RegExMatchInfo", Count: groups.length - 1, Mark: "" };
  groups.forEach((g, i) => { info[String(i)] = g.value; });
  info.Pos = Object.fromEntries(groups.map((g, i) => [String(i), g.pos]));
  info.Len = Object.fromEntries(groups.map((g, i) => [String(i), g.len]));
  info.Name = Object.fromEntries(groups.map((g, i) => [String(i), g.name]));
  info.__groups = groups;
  for (const g of groups) if (g.name) info[g.name] = g.value;
  return info;
}

// ---------------------------------------------------------------------------
// 関数ハンドラ
// ---------------------------------------------------------------------------
function mathHandlers() {
  const one = (fn, domain) => (ctx) => {
    arity(ctx, 1, 1, ctx.name);
    const v = ctx.vals[0];
    const u = needKnown(ctx, v, ctx.name); if (u) return u;
    const n = ctx.H.num(v, ctx.node);
    if (domain && !domain(n)) ctx.api.fail("値が定義域の外です", ctx.node, "ValueError");
    const r = fn(n);
    if (typeof r !== "number" || Number.isNaN(r)) ctx.api.fail("値が定義域の外です", ctx.node, "ValueError");
    return ctx.H.isFloat(v) || !Number.isInteger(r) ? ctx.H.float(r) : r;
  };
  return {
    abs: (ctx) => {
      arity(ctx, 1, 1, "Abs");
      const v = ctx.vals[0];
      const u = needKnown(ctx, v, "Abs"); if (u) return u;
      const n = ctx.H.num(v, ctx.node);
      return ctx.H.isFloat(v) ? ctx.H.float(Math.abs(n)) : Math.abs(n);
    },
    ceil: one((n) => Math.ceil(n)),
    floor: one((n) => Math.floor(n)),
    exp: one((n) => Math.exp(n)),
    ln: one((n) => Math.log(n), (n) => n > 0),
    log: one((n) => Math.log10(n), (n) => n > 0),
    sqrt: one((n) => Math.sqrt(n), (n) => n >= 0),
    sin: one((n) => Math.sin(n)),
    cos: one((n) => Math.cos(n)),
    tan: one((n) => Math.tan(n)),
    asin: one((n) => Math.asin(n), (n) => n >= -1 && n <= 1),
    acos: one((n) => Math.acos(n), (n) => n >= -1 && n <= 1),
    atan: one((n) => Math.atan(n)),
    mod: (ctx) => {
      arity(ctx, 2, 2, "Mod");
      const [a, b] = ctx.vals;
      if (isUnknown(a) || isUnknown(b)) return unknown("Modの結果");
      const x = ctx.H.num(a, ctx.node), y = ctx.H.num(b, ctx.node);
      if (y === 0) ctx.api.fail("0による除算です", ctx.node, "ZeroDivisionError");
      const r = x - y * Math.floor(x / y);
      return ctx.H.isFloat(a) || ctx.H.isFloat(b) || !Number.isInteger(r) ? ctx.H.float(r) : r;
    },
    round: (ctx) => {
      arity(ctx, 1, 2, "Round");
      const v = ctx.vals[0];
      const u = needKnown(ctx, v, "Round"); if (u) return u;
      const n = ctx.H.num(v, ctx.node);
      const places = ctx.vals.length > 1 ? Math.trunc(ctx.H.num(ctx.vals[1], ctx.node)) : 0;
      const f = 10 ** places;
      const r = (Math.sign(n) * Math.round(Math.abs(n) * f)) / f;
      // 公式：桁数（第2引数）が正のときだけ Float、省略・0・負のときは
      // 整数（Integer）を返す。入力が Float でも型は桁数で決まる
      // （A2監査 F4：従来は入力 Float のとき常に Float を返していた）。
      return places > 0 ? ctx.H.float(r) : Math.trunc(r);
    },
    max: (ctx) => variadicMinMax(ctx, true),
    min: (ctx) => variadicMinMax(ctx, false),
    random: (ctx) => {
      arity(ctx, 0, 2, "Random");
      return unknown("Randomの結果");
    },
  };
}
function variadicMinMax(ctx, isMax) {
  const label = isMax ? "Max" : "Min";
  // 引数が1つもなければ空文字列を返す（公式仕様）。
  if (ctx.args.length === 0) return "";
  let items = ctx.vals;
  if (items.length === 1 && Array.isArray(items[0])) items = items[0];
  if (items.length === 0) return "";
  for (const v of items) if (isUnknown(v)) return unknown(`${label}の結果`);
  const nums = items.map((v) => ctx.H.num(v, ctx.node));
  const r = isMax ? Math.max(...nums) : Math.min(...nums);
  const src = items[nums.indexOf(r)];
  return ctx.H.isFloat(src) ? ctx.H.float(r) : r;
}

function stringHandlers() {
  const H = (ctx) => ctx.H;
  const strArg = (ctx, i, label) => {
    const v = ctx.vals[i];
    if (isUnknown(v)) return null;
    return ctx.H.str(v);
  };
  return {
    chr: (ctx) => {
      arity(ctx, 1, 1, "Chr");
      const v = ctx.vals[0];
      const u = needKnown(ctx, v, "Chr"); if (u) return u;
      const n = Math.trunc(ctx.H.num(v, ctx.node));
      if (n < 0 || n > 0x10ffff) ctx.api.fail("文字コードが範囲外です", ctx.node, "ValueError");
      return String.fromCodePoint(n);
    },
    ord: (ctx) => {
      arity(ctx, 1, 1, "Ord");
      const s = strArg(ctx, 0, "Ord"); if (s === null) return unknown("Ordの結果");
      return s.length ? s.codePointAt(0) : 0;
    },
    strlen: (ctx) => {
      arity(ctx, 1, 1, "StrLen");
      const s = strArg(ctx, 0, "StrLen"); if (s === null) return unknown("StrLenの結果");
      return s.length;
    },
    strlower: (ctx) => {
      arity(ctx, 1, 1, "StrLower");
      const s = strArg(ctx, 0, "StrLower"); if (s === null) return unknown("StrLowerの結果");
      return s.toLowerCase();
    },
    strupper: (ctx) => {
      arity(ctx, 1, 1, "StrUpper");
      const s = strArg(ctx, 0, "StrUpper"); if (s === null) return unknown("StrUpperの結果");
      return s.toUpperCase();
    },
    strtitle: (ctx) => {
      arity(ctx, 1, 1, "StrTitle");
      const s = strArg(ctx, 0, "StrTitle"); if (s === null) return unknown("StrTitleの結果");
      return s.toLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
    },
    trim: (ctx) => trimImpl(ctx, true, true),
    ltrim: (ctx) => trimImpl(ctx, true, false),
    rtrim: (ctx) => trimImpl(ctx, false, true),
    substr: (ctx) => {
      arity(ctx, 2, 3, "SubStr");
      const s = strArg(ctx, 0, "SubStr"); if (s === null) return unknown("SubStrの結果");
      const len = s.length;
      const startRaw = Math.trunc(ctx.H.num(ctx.vals[1], ctx.node));
      let start = startRaw > 0 ? startRaw : startRaw === 0 ? len + 1 : len + startRaw + 1;
      start = Math.max(1, Math.min(start, len + 1));
      let end = len;
      if (ctx.vals.length > 2 && ctx.vals[2] !== undefined && ctx.vals[2] !== "") {
        const L = Math.trunc(ctx.H.num(ctx.vals[2], ctx.node));
        end = L >= 0 ? Math.min(len, start + L - 1) : len + L;
      }
      return end < start ? "" : s.slice(start - 1, end);
    },
    instr: (ctx) => {
      arity(ctx, 2, 5, "InStr");
      const hay = strArg(ctx, 0, "InStr"); if (hay === null) return unknown("InStrの結果");
      const needle = strArg(ctx, 1, "InStr"); if (needle === null) return unknown("InStrの結果");
      const caseSense = ctx.vals.length > 2 && ctx.vals[2] !== undefined && ctx.vals[2] !== "" ? boolWord(ctx.vals[2], ctx.H) : false;
      const startRaw = ctx.vals.length > 3 && ctx.vals[3] !== undefined && ctx.vals[3] !== "" ? Math.trunc(ctx.H.num(ctx.vals[3], ctx.node)) : 1;
      const occurrence = ctx.vals.length > 4 && ctx.vals[4] !== undefined && ctx.vals[4] !== "" ? Math.trunc(ctx.H.num(ctx.vals[4], ctx.node)) : 1;
      if (occurrence < 1) ctx.api.fail("Occurrence は1以上で指定してください", ctx.node, "ValueError");
      const fold = (x) => (caseSense ? x : x.toLowerCase());
      const H2 = fold(hay), N2 = fold(needle);
      const positions = [];
      if (N2.length === 0) return 0;
      for (let i = 0; i + N2.length <= H2.length; i++)
        if (H2.startsWith(N2, i)) positions.push(i + 1);
      if (startRaw >= 0) {
        const from = Math.max(1, startRaw);
        const cand = positions.filter((p) => p >= from);
        return cand[occurrence - 1] ?? 0;
      }
      const limit = hay.length + startRaw + 1;
      const cand = positions.filter((p) => p <= limit).reverse();
      return cand[occurrence - 1] ?? 0;
    },
    strreplace: (ctx) => {
      arity(ctx, 2, 6, "StrReplace");
      const hay = strArg(ctx, 0, "StrReplace"); if (hay === null) return unknown("StrReplaceの結果");
      const needle = strArg(ctx, 1, "StrReplace"); if (needle === null) return unknown("StrReplaceの結果");
      const repl = ctx.vals.length > 2 && ctx.vals[2] !== undefined ? ctx.H.str(ctx.vals[2]) : "";
      const caseSense = ctx.vals.length > 3 && ctx.vals[3] !== undefined && ctx.vals[3] !== "" ? boolWord(ctx.vals[3], ctx.H) : false;
      const limit = ctx.vals.length > 5 && ctx.vals[5] !== undefined && ctx.vals[5] !== "" ? Math.trunc(ctx.H.num(ctx.vals[5], ctx.node)) : 0;
      if (needle === "") { writeByRef(ctx, 4, 0); return hay; }
      const fold = (x) => (caseSense ? x : x.toLowerCase());
      const H2 = fold(hay), N2 = fold(needle);
      let out = "", count = 0, i = 0;
      while (i <= hay.length - needle.length) {
        if ((limit === 0 || count < limit) && H2.startsWith(N2, i)) {
          out += repl; count++; i += needle.length;
        } else { out += hay[i]; i++; }
      }
      out += hay.slice(i);
      writeByRef(ctx, 4, count);
      return out;
    },
    strsplit: (ctx) => {
      arity(ctx, 1, 4, "StrSplit");
      const s = strArg(ctx, 0, "StrSplit"); if (s === null) return unknown("StrSplitの結果");
      let delims = null;
      if (ctx.vals.length > 1 && ctx.vals[1] !== undefined && ctx.vals[1] !== "") {
        const d = ctx.vals[1];
        if (Array.isArray(d)) delims = d.map((x) => ctx.H.str(x)).filter((x) => x !== "");
        else delims = [...ctx.H.str(d)];
      }
      const omit = ctx.vals.length > 2 && ctx.vals[2] !== undefined ? ctx.H.str(ctx.vals[2]) : "";
      const maxParts = ctx.vals.length > 3 && ctx.vals[3] !== undefined && ctx.vals[3] !== "" ? Math.trunc(ctx.H.num(ctx.vals[3], ctx.node)) : 0;
      let parts;
      if (!delims || delims.length === 0) parts = [s];
      else {
        parts = [];
        let cur = "", i = 0;
        const sorted = [...delims].sort((a, b) => b.length - a.length);
        while (i < s.length) {
          const hit = (maxParts <= 0 || parts.length < maxParts - 1)
            ? sorted.find((d) => s.startsWith(d, i)) : undefined;
          if (hit) { parts.push(cur); cur = ""; i += hit.length; }
          else { cur += s[i]; i++; }
        }
        parts.push(cur);
      }
      if (omit) {
        const set = new Set([...omit]);
        parts = parts.map((p) => {
          let a = 0, b = p.length;
          while (a < b && set.has(p[a])) a++;
          while (b > a && set.has(p[b - 1])) b--;
          return p.slice(a, b);
        });
      }
      return parts;
    },
    strcompare: (ctx) => {
      arity(ctx, 2, 3, "StrCompare");
      const a = strArg(ctx, 0, "StrCompare"); if (a === null) return unknown("StrCompareの結果");
      const b = strArg(ctx, 1, "StrCompare"); if (b === null) return unknown("StrCompareの結果");
      const mode = ctx.vals.length > 2 && ctx.vals[2] !== undefined && ctx.vals[2] !== "" ? ctx.H.str(ctx.vals[2]).trim().toLowerCase() : "off";
      let cmp;
      if (mode === "on" || mode === "1" || mode === "true") cmp = a < b ? -1 : a > b ? 1 : 0;
      else if (mode === "locale") cmp = Math.sign(a.localeCompare(b));
      else {
        const x = a.toLowerCase(), y = b.toLowerCase();
        cmp = x < y ? -1 : x > y ? 1 : 0;
      }
      return cmp;
    },
    sort: (ctx) => sortImpl(ctx),
    format: (ctx) => formatImpl(ctx),
    formattime: (ctx) => formatTimeImpl(ctx),
    splitpath: (ctx) => splitPathImpl(ctx),
    vercompare: (ctx) => {
      arity(ctx, 2, 2, "VerCompare");
      const a = strArg(ctx, 0, "VerCompare"); if (a === null) return unknown("VerCompareの結果");
      const b = strArg(ctx, 1, "VerCompare"); if (b === null) return unknown("VerCompareの結果");
      const pa = a.split("."), pb = b.split(".");
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] ?? "0", y = pb[i] ?? "0";
        if (/^\d+$/.test(x) && /^\d+$/.test(y)) {
          const d = Number(x) - Number(y);
          if (d !== 0) return d < 0 ? -1 : 1;
        } else if (x !== y) return x < y ? -1 : 1;
      }
      return 0;
    },
  };
  function trimImpl(ctx, left, right) {
    const label = left && right ? "Trim" : left ? "LTrim" : "RTrim";
    arity(ctx, 1, 2, label);
    const v = ctx.vals[0];
    if (typeof v === "number" || ctx.H.isFloat(v))
      ctx.api.fail(`${label} の対象に数値は使えません`, ctx.node, "TypeError");
    const s = strArg(ctx, 0, label); if (s === null) return unknown(`${label}の結果`);
    const omit = ctx.vals.length > 1 && ctx.vals[1] !== undefined ? ctx.H.str(ctx.vals[1]) : " \t";
    const set = new Set([...omit]);
    let a = 0, b = s.length;
    if (left) while (a < b && set.has(s[a])) a++;
    if (right) while (b > a && set.has(s[b - 1])) b--;
    return s.slice(a, b);
  }
}

function sortImpl(ctx) {
  arity(ctx, 1, 3, "Sort");
  if (ctx.args.length >= 3)
    ctx.api.fail("未対応：Sortのコールバック（関数オブジェクトが必要です）", ctx.node, "未対応");
  const s = ctx.vals[0];
  if (isUnknown(s)) return unknown("Sortの結果");
  const text = ctx.H.str(s);
  const optText = ctx.vals.length > 1 && ctx.vals[1] !== undefined ? ctx.H.str(ctx.vals[1]) : "";
  let delim = "\n", numeric = false, caseSense = false, locale = false,
    reverse = false, unique = false, zed = false, backslash = false, pos = 1, random = false;
  const tokens = optText.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.toLowerCase() === "random") { random = true; continue; }
    if (/^d/i.test(t) && t.length > 1) { delim = t.slice(1); continue; }
    if (/^p\d+$/i.test(t)) { pos = Number(t.slice(1)); continue; }
    for (const ch of t) {
      switch (ch.toUpperCase()) {
        case "N": numeric = true; break;
        case "C":
          if (t.toUpperCase().includes("CL")) { caseSense = true; locale = true; }
          else caseSense = true;
          break;
        case "L": break; // CL の L は C と一体で処理済み
        case "R": reverse = true; break;
        case "U": unique = true; break;
        case "Z": zed = true; break;
        case "\\": backslash = true; break;
        default:
          ctx.api.fail(`未対応：Sortのオプション ${t}`, ctx.node, "未対応");
      }
    }
  }
  if (random) return unknown("Sort（Random）の結果");
  let items = text.split(delim);
  if (!zed && items.length && items[items.length - 1] === "" && text.endsWith(delim))
    items = items.slice(0, -1);
  if (text === "") items = [];
  const keyOf = (item) => {
    let k = backslash ? item.slice(item.lastIndexOf("\\") + 1) : item.slice(pos - 1);
    return k;
  };
  const cmpStr = (a, b) => {
    if (numeric) {
      const na = parseFloat(a) || 0, nb = parseFloat(b) || 0;
      const va = /^[+-]?(?:0x[0-9a-f]+|\d)/i.test(a.trim()) ? (a.trim().toLowerCase().startsWith("0x") || a.trim().toLowerCase().startsWith("-0x") || a.trim().toLowerCase().startsWith("+0x") ? parseInt(a.trim(), 16) || 0 : na) : 0;
      const vb = /^[+-]?(?:0x[0-9a-f]+|\d)/i.test(b.trim()) ? (b.trim().toLowerCase().includes("0x") ? parseInt(b.trim(), 16) || 0 : nb) : 0;
      return va - vb;
    }
    if (locale) return a.localeCompare(b);
    if (caseSense) return a < b ? -1 : a > b ? 1 : 0;
    const x = a.toLowerCase(), y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  };
  const decorated = items.map((item, i) => [item, i]);
  decorated.sort((p, q) => {
    const c = cmpStr(keyOf(p[0]), keyOf(q[0]));
    return c !== 0 ? c : p[1] - q[1];
  });
  let result = decorated.map(([item]) => item);
  if (unique) {
    const seen = new Set();
    result = result.filter((item) => {
      const k = numeric
        ? String(parseFloat(item) || 0)
        : caseSense ? item : item.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }
  if (reverse) result.reverse();
  return result.join(delim);
}

function splitPathImpl(ctx) {
  arity(ctx, 1, 6, "SplitPath");
  const v = ctx.vals[0];
  if (isUnknown(v)) return unknown("SplitPathの結果");
  const path = ctx.H.str(v);
  let drive = "", rest = path;
  const unc = path.match(/^\\\\[^\\]+\\[^\\]+/);
  const drv = path.match(/^[A-Za-z]:/);
  if (unc) { drive = unc[0]; rest = path.slice(drive.length); }
  else if (drv) { drive = drv[0]; rest = path.slice(2); }
  const slash = Math.max(rest.lastIndexOf("\\"), rest.lastIndexOf("/"));
  const fileName = slash >= 0 ? rest.slice(slash + 1) : rest;
  const dirPart = slash >= 0 ? rest.slice(0, slash) : "";
  const dir = drive + dirPart;
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot + 1) : "";
  const nameNoExt = dot > 0 ? fileName.slice(0, dot) : fileName;
  const outs = [fileName, dir, ext, nameNoExt, drive];
  for (let i = 0; i < outs.length; i++) writeByRef(ctx, i + 1, outs[i]);
  return null;
}

// Format（{Index:書式} 書式指定は printf 系の部分集合）
function formatImpl(ctx) {
  if (ctx.args.length < 1) ctx.api.fail("引数が不足しています：Format には書式文字列が必要です", ctx.node, "TypeError");
  const tpl = ctx.vals[0];
  if (isUnknown(tpl)) return unknown("Formatの結果");
  const text = ctx.H.str(tpl);
  const values = ctx.vals.slice(1);
  let auto = 0, out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      if (text[i + 1] === "{") { out += "{"; i++; continue; }
      const close = text.indexOf("}", i);
      if (close < 0) ctx.api.fail("Format の書式に閉じ括弧がありません", ctx.node, "ValueError");
      const inner = text.slice(i + 1, close);
      const colon = inner.indexOf(":");
      const idxText = (colon >= 0 ? inner.slice(0, colon) : inner).trim();
      const spec = colon >= 0 ? inner.slice(colon + 1) : "";
      const idx = idxText === "" ? ++auto : Number(idxText);
      if (!Number.isInteger(idx) || idx < 1 || idx > values.length)
        ctx.api.fail(`Format の参照先の引数がありません：{${inner}}`, ctx.node, "ValueError");
      out += applyFormatSpec(ctx, values[idx - 1], spec);
      i = close;
      continue;
    }
    if (c === "}" && text[i + 1] === "}") { out += "}"; i++; continue; }
    out += c;
  }
  return out;
}
function applyFormatSpec(ctx, v, spec) {
  if (isUnknown(v)) return ctx.H.str(unknown("Formatの値"));
  if (!spec) return ctx.H.str(v);
  const m = spec.match(/^([ 0#+\-]*)(\d*)(?:\.(\d+))?([diuxXeEfgGscp])$/);
  if (!m)
    ctx.api.fail(`未対応：Formatの書式指定 ${spec}`, ctx.node, "未対応");
  const [, flags, widthText, precText, type] = m;
  const width = widthText ? Number(widthText) : 0;
  const prec = precText !== undefined ? Number(precText) : undefined;
  const left = flags.includes("-"), zero = flags.includes("0") && !left,
    plus = flags.includes("+"), space = flags.includes(" "), alt = flags.includes("#");
  let body;
  if (type === "s") {
    body = ctx.H.str(v);
    if (prec !== undefined) body = body.slice(0, prec);
  } else if (type === "c") {
    const n = Math.trunc(ctx.H.num(v, ctx.node));
    body = String.fromCodePoint(n);
  } else if (type === "p") {
    const n = Math.trunc(ctx.H.num(v, ctx.node));
    body = "0x" + BigInt(n).toString(16).padStart(8, "0");
  } else if ("diuxX".includes(type)) {
    let n = ctx.H.num(v, ctx.node);
    n = Math.trunc(n);
    let sign = "", digits;
    if (type === "u" || type === "x" || type === "X") {
      const big = BigInt(n) & 0xffffffffffffffffn;
      digits = type === "u" ? big.toString() : big.toString(16);
      if (type === "X") digits = digits.toUpperCase();
      if (alt && type !== "u" && big !== 0n) sign = type === "x" ? "0x" : "0X";
    } else {
      sign = n < 0 ? "-" : plus ? "+" : space ? " " : "";
      digits = String(Math.abs(n));
    }
    if (prec !== undefined) digits = digits.padStart(prec, "0");
    body = sign + digits;
    if (zero && prec === undefined && width > body.length)
      body = sign + digits.padStart(width - sign.length, "0");
    return body.padStart(width, " ").length >= width
      ? (left ? body.padEnd(width, " ") : body.padStart(width, " "))
      : body;
  } else {
    const n = ctx.H.num(v, ctx.node);
    if (type === "f") body = n.toFixed(prec ?? 6);
    else if (type === "e" || type === "E") {
      body = n.toExponential(prec ?? 6);
      if (type === "E") body = body.toUpperCase();
    } else {
      // g / G：有効桁数で表し、末尾の0を落とす。
      const p = prec ?? 6;
      body = Math.abs(n) !== 0 && (Math.abs(n) < 1e-4 || Math.abs(n) >= 10 ** p)
        ? n.toExponential(p - 1).replace(/\.?0+e/, "e")
        : String(Number(n.toPrecision(p)));
      if (type === "G") body = body.toUpperCase();
    }
    if (n >= 0 && plus && !body.startsWith("-")) body = "+" + body;
    else if (n >= 0 && space) body = " " + body;
  }
  if (zero && width > body.length && type !== "s") {
    const signLen = /^[+\- ]/.test(body) ? 1 : 0;
    body = body.slice(0, signLen) + body.slice(signLen).padStart(width - signLen, "0");
  }
  return left ? body.padEnd(width, " ") : body.padStart(width, " ");
}

// FormatTime（書式コードは公式表の部分集合。ロケール名は英語固定のモデル）
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_ABBR = MONTHS_FULL.map((x) => x.slice(0, 3));
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_ABBR = DAYS_FULL.map((x) => x.slice(0, 3));
function formatTimeImpl(ctx) {
  arity(ctx, 0, 2, "FormatTime");
  const tsVal = ctx.vals[0];
  if (tsVal === undefined || tsVal === "" || isUnknown(tsVal)) return unknown("FormatTimeの結果（現在時刻）");
  const dt = parseTimestamp(ctx, tsVal, "FormatTime のタイムスタンプ");
  const fmtVal = ctx.vals[1];
  if (fmtVal === undefined || fmtVal === "") return unknown("FormatTimeの結果（ロケール形式）");
  const fmt = ctx.H.str(fmtVal);
  const standalone = fmt.trim().toLowerCase();
  if (["time", "shortdate", "longdate", "yearmonth"].includes(standalone))
    return unknown("FormatTimeの結果（ロケール形式）");
  const y = dt.getUTCFullYear(), mo = dt.getUTCMonth() + 1, d = dt.getUTCDate();
  const wday = dt.getUTCDay();
  const H24 = dt.getUTCHours(), mi = dt.getUTCMinutes(), sec = dt.getUTCSeconds();
  const h12 = H24 % 12 === 0 ? 12 : H24 % 12;
  const p2 = (n) => String(n).padStart(2, "0");
  const startOfYear = Date.UTC(y, 0, 1);
  const yday = Math.floor((Date.UTC(y, mo - 1, d) - startOfYear) / 86400000) + 1;
  if (standalone === "yday") return String(yday);
  if (standalone === "yday0") return String(yday).padStart(3, "0");
  if (standalone === "wday") return String(wday + 1);
  if (standalone === "yweek") {
    // ISO 8601 週番号（木曜基準）。
    const target = new Date(Date.UTC(y, mo - 1, d));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const isoYear = target.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const fdayNr = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - fdayNr + 3);
    const week = 1 + Math.round((target - firstThursday) / (7 * 86400000));
    return `${isoYear}${p2(week)}`;
  }
  let out = "", i = 0;
  while (i < fmt.length) {
    const rest = fmt.slice(i);
    let m;
    if ((m = rest.match(/^yyyy/))) { out += String(y); i += 4; }
    else if ((m = rest.match(/^yy/))) { out += p2(y % 100); i += 2; }
    else if ((m = rest.match(/^y/))) { out += String(y % 100); i += 1; }
    else if ((m = rest.match(/^MMMM/))) { out += MONTHS_FULL[mo - 1]; i += 4; }
    else if ((m = rest.match(/^MMM/))) { out += MONTHS_ABBR[mo - 1]; i += 3; }
    else if ((m = rest.match(/^MM/))) { out += p2(mo); i += 2; }
    else if ((m = rest.match(/^M/))) { out += String(mo); i += 1; }
    else if ((m = rest.match(/^dddd/))) { out += DAYS_FULL[wday]; i += 4; }
    else if ((m = rest.match(/^ddd/))) { out += DAYS_ABBR[wday]; i += 3; }
    else if ((m = rest.match(/^dd/))) { out += p2(d); i += 2; }
    else if ((m = rest.match(/^d/))) { out += String(d); i += 1; }
    else if ((m = rest.match(/^HH/))) { out += p2(H24); i += 2; }
    else if ((m = rest.match(/^H/))) { out += String(H24); i += 1; }
    else if ((m = rest.match(/^hh/))) { out += p2(h12); i += 2; }
    else if ((m = rest.match(/^h/))) { out += String(h12); i += 1; }
    else if ((m = rest.match(/^mm/))) { out += p2(mi); i += 2; }
    else if ((m = rest.match(/^m/))) { out += String(mi); i += 1; }
    else if ((m = rest.match(/^ss/))) { out += p2(sec); i += 2; }
    else if ((m = rest.match(/^s/))) { out += String(sec); i += 1; }
    else if ((m = rest.match(/^tt/))) { out += H24 < 12 ? "AM" : "PM"; i += 2; }
    else if ((m = rest.match(/^t/))) { out += H24 < 12 ? "A" : "P"; i += 1; }
    else if ((m = rest.match(/^gg/))) { i += 2; }
    else { out += fmt[i]; i++; }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 日時・変換・内省・オブジェクト関数
// ---------------------------------------------------------------------------
function miscHandlers() {
  return {
    dateadd: (ctx) => {
      arity(ctx, 3, 3, "DateAdd");
      const dt = parseTimestamp(ctx, ctx.vals[0], "DateAdd のタイムスタンプ");
      const amount = ctx.H.num(ctx.vals[1], ctx.node);
      const unitSec = dateUnit(ctx, ctx.vals[2]);
      return formatTimestamp(new Date(dt.getTime() + Math.trunc(amount) * unitSec * 1000));
    },
    datediff: (ctx) => {
      arity(ctx, 3, 3, "DateDiff");
      const a = parseTimestamp(ctx, ctx.vals[0], "DateDiff の第1タイムスタンプ");
      const b = parseTimestamp(ctx, ctx.vals[1], "DateDiff の第2タイムスタンプ");
      const unitSec = dateUnit(ctx, ctx.vals[2]);
      return Math.floor((a.getTime() - b.getTime()) / 1000 / unitSec);
    },
    integer: (ctx) => {
      arity(ctx, 1, 1, "Integer");
      const v = ctx.vals[0];
      const u = needKnown(ctx, v, "Integer"); if (u) return u;
      if (typeof v === "string") {
        const t = v.trim();
        if (/^[+-]?0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16);
        if (/^[+-]?\d+$/.test(t)) return Number(t);
        ctx.api.fail("整数に変換できません", ctx.node, "TypeError");
      }
      return Math.trunc(ctx.H.num(v, ctx.node));
    },
    float: (ctx) => {
      arity(ctx, 1, 1, "Float");
      const v = ctx.vals[0];
      const u = needKnown(ctx, v, "Float"); if (u) return u;
      return ctx.H.float(ctx.H.num(v, ctx.node));
    },
    number: (ctx) => {
      arity(ctx, 1, 1, "Number");
      const v = ctx.vals[0];
      const u = needKnown(ctx, v, "Number"); if (u) return u;
      if (ctx.H.isFloat(v)) return v;
      if (typeof v === "string") {
        const t = v.trim();
        if (/^[+-]?0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16);
        if (/^[+-]?\d+$/.test(t)) return Number(t);
        if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(t)) return ctx.H.float(Number(t));
        ctx.api.fail("数値に変換できません", ctx.node, "TypeError");
      }
      return ctx.H.num(v, ctx.node);
    },
    string: (ctx) => {
      arity(ctx, 1, 1, "String");
      const v = ctx.vals[0];
      const u = needKnown(ctx, v, "String"); if (u) return u;
      if (v !== null && typeof v === "object")
        ctx.api.fail("この値には ToString メソッドがないため文字列に変換できません", ctx.node, "MethodError");
      return ctx.H.str(v);
    },
    type: (ctx) => {
      arity(ctx, 1, 1, "Type");
      const v = ctx.vals[0];
      if (isUnknown(v)) return unknown("Typeの結果");
      if (ctx.H.isFloat(v)) return "Float";
      if (typeof v === "number") return "Integer";
      if (typeof v === "string") return "String";
      if (Array.isArray(v)) return "Array";
      if (isAhkMap(v)) return "Map";
      if (isAhkBuffer(v)) return "Buffer";
      if (isMatchInfo(v)) return "RegExMatchInfo";
      if (v && typeof v === "object") return "Object";
      return "String";
    },
    isobject: (ctx) => {
      arity(ctx, 1, 1, "IsObject");
      const v = ctx.vals[0];
      if (isUnknown(v)) return unknown("IsObjectの結果");
      return v !== null && typeof v === "object" ? 1 : 0;
    },
    islabel: (ctx) => {
      arity(ctx, 1, 1, "IsLabel");
      // このモデルではラベル定義自体が未対応のため、存在するラベルはない。
      return 0;
    },
    hasbase: (ctx) => {
      arity(ctx, 1, 1, "HasBase");
      const v = ctx.vals[0];
      if (isUnknown(v)) return unknown("HasBaseの結果");
      if (v === null || v === undefined) return 0;
      return 1;
    },
    hasprop: (ctx) => {
      arity(ctx, 2, 2, "HasProp");
      const [v, nameV] = ctx.vals;
      if (isUnknown(v) || isUnknown(nameV)) return unknown("HasPropの結果");
      return hasPropImpl(ctx, v, ctx.H.str(nameV)) ? 1 : 0;
    },
    hasmethod: (ctx) => {
      arity(ctx, 2, 3, "HasMethod");
      const [v, nameV] = ctx.vals;
      if (isUnknown(v) || isUnknown(nameV)) return unknown("HasMethodの結果");
      return methodNamesFor(v).includes(ctx.H.str(nameV).toLowerCase()) ? 1 : 0;
    },
    objhasownprop: (ctx) => {
      arity(ctx, 2, 2, "ObjHasOwnProp");
      const [v, nameV] = ctx.vals;
      if (isUnknown(v) || isUnknown(nameV)) return unknown("ObjHasOwnPropの結果");
      return hasOwnPropImpl(ctx, v, ctx.H.str(nameV)) ? 1 : 0;
    },
    objownpropcount: (ctx) => {
      arity(ctx, 1, 1, "ObjOwnPropCount");
      const v = ctx.vals[0];
      if (isUnknown(v)) return unknown("ObjOwnPropCountの結果");
      if (Array.isArray(v)) return v.filter((x) => x !== undefined).length;
      if (v && typeof v === "object")
        return Object.keys(v).filter((k) => !k.startsWith("__ahk") && !k.startsWith("__groups")).length;
      ctx.api.fail("ObjOwnPropCount の対象はオブジェクトです", ctx.node, "TypeError");
    },
    outputdebug: (ctx) => {
      arity(ctx, 0, 1, "OutputDebug");
      const v = ctx.vals[0];
      ctx.s.outputs.push({
        channel: "OutputDebug",
        text: v === undefined ? "" : ctx.H.fmt(v),
        line: ctx.node.line,
      });
      ctx.api.note(ctx.s, ctx.node, "デバッガへの出力を記録します（外部デバッガには送りません）");
      return null;
    },
    exit: (ctx) => {
      arity(ctx, 0, 1, "Exit");
      ctx.api.note(ctx.s, ctx.node, "Exitによりスクリプトの実行を終了します");
      ctx.s.signal = "return";
      return null;
    },
  };
}

const OBJECT_METHODS = ["clone", "defineprop", "deleteprop", "getownpropdesc", "hasownprop", "ownprops"];
const ARRAY_METHODS = ["call", "clone", "delete", "get", "has", "insertat", "pop", "push", "removeat", "__new", "__enum"];
const MAP_METHODS = ["call", "clear", "clone", "delete", "get", "has", "set", "__new", "__enum"];
const BUFFER_METHODS = ["call", "__new"];
const MATCH_METHODS = ["pos", "len", "name"];
function methodNamesFor(v) {
  if (Array.isArray(v)) return [...ARRAY_METHODS, ...OBJECT_METHODS];
  if (isAhkMap(v)) return [...MAP_METHODS, ...OBJECT_METHODS];
  if (isAhkBuffer(v)) return [...BUFFER_METHODS, ...OBJECT_METHODS];
  if (isMatchInfo(v)) return [...MATCH_METHODS];
  if (v && typeof v === "object") return [...OBJECT_METHODS];
  return [];
}
function hasPropImpl(ctx, v, name) {
  const lower = name.toLowerCase();
  if (Array.isArray(v)) {
    if (lower === "length" || lower === "capacity" || lower === "default") return true;
    if (methodNamesFor(v).includes(lower)) return true;
    const n = Number(name);
    return Number.isInteger(n) && n >= 1 && n <= v.length && v[n - 1] !== undefined;
  }
  if (isAhkMap(v)) {
    if (["count", "casesense", "capacity", "default"].includes(lower)) return true;
    return methodNamesFor(v).includes(lower);
  }
  if (isAhkBuffer(v)) {
    if (lower === "ptr" || lower === "size") return true;
    return methodNamesFor(v).includes(lower);
  }
  if (isMatchInfo(v)) {
    if (["count", "mark", "pos", "len", "name"].includes(lower)) return true;
    return Object.keys(v).some((k) => k.toLowerCase() === lower);
  }
  if (v && typeof v === "object") {
    if (Object.keys(v).some((k) => k.toLowerCase() === lower)) return true;
    return OBJECT_METHODS.includes(lower);
  }
  return false;
}
function hasOwnPropImpl(ctx, v, name) {
  const lower = name.toLowerCase();
  if (Array.isArray(v)) {
    if (lower === "length") return true;
    const n = Number(name);
    return Number.isInteger(n) && n >= 1 && n <= v.length && v[n - 1] !== undefined;
  }
  if (v && typeof v === "object")
    return Object.keys(v).some((k) => k.toLowerCase() === lower && !k.startsWith("__ahk") && k !== "__groups");
  return false;
}
function ownKeyOf(obj, name) {
  const lower = name.toLowerCase();
  return Object.keys(obj).find((k) => k.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// 正規表現関数
// ---------------------------------------------------------------------------
function regexHandlers() {
  return {
    regexmatch: (ctx) => {
      arity(ctx, 2, 4, "RegExMatch");
      const hay = ctx.vals[0], pat = ctx.vals[1];
      if (isUnknown(hay) || isUnknown(pat)) return unknown("RegExMatchの結果");
      const haystack = ctx.H.str(hay), pattern = ctx.H.str(pat);
      const start = regexStartIndex(ctx, haystack, ctx.vals[3]);
      const re = compileAhkRegex(ctx, pattern, "gd");
      re.lastIndex = start;
      let match = null;
      try { match = re.exec(haystack); } catch (e) {
        ctx.api.fail(`この正規表現はモデルで実行できません：${e.message}`, ctx.node, "ValueError");
      }
      if (!match) {
        writeByRef(ctx, 2, "");
        return 0;
      }
      if (ctx.args.length >= 3) writeByRef(ctx, 2, buildMatchInfo(match));
      return match.index + 1;
    },
    regexreplace: (ctx) => {
      arity(ctx, 2, 6, "RegExReplace");
      const hay = ctx.vals[0], pat = ctx.vals[1];
      if (isUnknown(hay) || isUnknown(pat)) return unknown("RegExReplaceの結果");
      const haystack = ctx.H.str(hay), pattern = ctx.H.str(pat);
      const replacement = ctx.vals.length > 2 && ctx.vals[2] !== undefined ? ctx.H.str(ctx.vals[2]) : "";
      const limit = ctx.vals.length > 4 && ctx.vals[4] !== undefined && ctx.vals[4] !== "" ? Math.trunc(ctx.H.num(ctx.vals[4], ctx.node)) : 0;
      const start = regexStartIndex(ctx, haystack, ctx.vals[5]);
      const re = compileAhkRegex(ctx, pattern, "gd");
      re.lastIndex = start;
      let out = haystack.slice(0, start), count = 0, last = start, match;
      while ((match = re.exec(haystack)) !== null) {
        if (limit > 0 && count >= limit) break;
        out += haystack.slice(last, match.index) + expandReplacement(ctx, replacement, match);
        last = match.index + match[0].length;
        count++;
        if (match[0].length === 0) { re.lastIndex++; last = Math.max(last, re.lastIndex); out += haystack[match.index] ?? ""; last = match.index + 1; if (re.lastIndex > haystack.length) break; }
        if (re.lastIndex > haystack.length) break;
      }
      out += haystack.slice(last);
      writeByRef(ctx, 3, count);
      return out;
    },
  };
}
function expandReplacement(ctx, replacement, match) {
  let out = "";
  for (let i = 0; i < replacement.length; i++) {
    const c = replacement[i];
    if (c !== "$") { out += c; continue; }
    const rest = replacement.slice(i + 1);
    let m;
    if ((m = rest.match(/^\{([A-Za-z_][A-Za-z0-9_]*|\d+)\}/))) {
      const key = m[1];
      const val = /^\d+$/.test(key) ? match[Number(key)] : match.groups?.[key];
      out += val ?? "";
      i += m[0].length;
    } else if ((m = rest.match(/^\+/))) {
      for (let g = match.length - 1; g >= 1; g--) if (match[g] !== undefined) { out += match[g]; break; }
      i += 1;
    } else if ((m = rest.match(/^\d{1,2}/))) {
      let num = Number(m[0]);
      if (num >= match.length && m[0].length === 2) { num = Number(m[0][0]); out += (match[num] ?? "") + m[0][1]; }
      else out += match[num] ?? "";
      i += m[0].length;
    } else out += "$";
  }
  return out;
}

// ---------------------------------------------------------------------------
// Buffer / NumGet / NumPut / StrGet / StrPut / StrPtr
// ---------------------------------------------------------------------------
const NUM_TYPES = {
  char: [1, "getInt8", "setInt8"], uchar: [1, "getUint8", "setUint8"],
  short: [2, "getInt16", "setInt16"], ushort: [2, "getUint16", "setUint16"],
  int: [4, "getInt32", "setInt32"], uint: [4, "getUint32", "setUint32"],
  int64: [8, "getBigInt64", "setBigInt64"], uint64: [8, "getBigUint64", "setBigUint64"],
  ptr: [8, "getBigInt64", "setBigInt64"], uptr: [8, "getBigUint64", "setBigUint64"],
  float: [4, "getFloat32", "setFloat32"], double: [8, "getFloat64", "setFloat64"],
};
function makeBuffer(ctx, sizeVal, fillVal) {
  const size = sizeVal === undefined ? 0 : Math.trunc(ctx.H.num(sizeVal, ctx.node));
  if (size < 0 || size > 1000000)
    ctx.api.fail("Bufferのサイズが範囲外です（0〜1000000）", ctx.node, "ValueError");
  const fill = fillVal === undefined ? 0 : Math.trunc(ctx.H.num(fillVal, ctx.node)) & 0xff;
  const buf = { __ahkType: "Buffer", bytes: new Array(size).fill(fill), Size: size, Ptr: unknown("Buffer.Ptr（実アドレス）") };
  return buf;
}
function bufferView(buf) {
  return new DataView(new Uint8Array(buf.bytes).buffer);
}
function syncBuffer(buf, view) {
  buf.bytes = [...new Uint8Array(view.buffer)];
}
function memoryHandlers() {
  return {
    buffer: (ctx) => {
      arity(ctx, 0, 2, "Buffer");
      return makeBuffer(ctx, ctx.vals[0], ctx.vals[1]);
    },
    numget: (ctx) => {
      arity(ctx, 2, 3, "NumGet");
      const src = ctx.vals[0];
      if (!isAhkBuffer(src))
        ctx.api.fail("未対応：NumGetの読み取り元はBufferオブジェクトのみ対応です（実アドレスは扱えません）", ctx.node, "未対応");
      let offset = 0, typeText;
      if (ctx.args.length === 2) { typeText = ctx.vals[1]; }
      else { offset = Math.trunc(ctx.H.num(ctx.vals[1], ctx.node)); typeText = ctx.vals[2]; }
      const t = NUM_TYPES[ctx.H.str(typeText).trim().toLowerCase()];
      if (!t) ctx.api.fail(`未対応：NumGetの型 ${ctx.H.str(typeText)}`, ctx.node, "未対応");
      const [size, getter] = t;
      if (offset < 0 || offset + size > src.bytes.length)
        ctx.api.fail("NumGetの読み取り範囲がBufferの外です", ctx.node, "IndexError");
      const view = bufferView(src);
      const raw = view[getter](offset, true);
      if (typeof raw === "bigint") {
        const n = Number(raw);
        if (!Number.isSafeInteger(n))
          ctx.api.fail("未確認：読み取った64ビット値がこのモデルの安全整数の範囲外です", ctx.node, "未確認");
        return n;
      }
      return getter.includes("Float") ? ctx.H.float(raw) : raw;
    },
    numput: (ctx) => {
      // NumPut(Type, Number, ..., Target [, Offset])
      if (ctx.args.length < 3)
        ctx.api.fail("引数が不足しています：NumPut には型・値・書き込み先が必要です", ctx.node, "TypeError");
      const vals = ctx.vals;
      // 末尾が Target、その前までが (Type, Number) の組。Offset は Target の後。
      let targetIdx, offset = 0;
      // 引数が奇数個なら最後が Target、偶数個なら最後から2番目が Target で最後が Offset。
      if (vals.length % 2 === 1) targetIdx = vals.length - 1;
      else { targetIdx = vals.length - 2; offset = Math.trunc(ctx.H.num(vals[vals.length - 1], ctx.node)); }
      const target = vals[targetIdx];
      if (!isAhkBuffer(target))
        ctx.api.fail("未対応：NumPutの書き込み先はBufferオブジェクトのみ対応です（実アドレスは扱えません）", ctx.node, "未対応");
      const view = bufferView(target);
      let cur = offset;
      for (let i = 0; i < targetIdx; i += 2) {
        const t = NUM_TYPES[ctx.H.str(vals[i]).trim().toLowerCase()];
        if (!t) ctx.api.fail(`未対応：NumPutの型 ${ctx.H.str(vals[i])}`, ctx.node, "未対応");
        const [size, , setter] = t;
        if (cur < 0 || cur + size > target.bytes.length)
          ctx.api.fail("NumPutの書き込み範囲がBufferの外です", ctx.node, "IndexError");
        const n = ctx.H.num(vals[i + 1], ctx.node);
        if (setter.includes("Big")) view[setter](cur, BigInt(Math.trunc(n)), true);
        else view[setter](cur, n, true);
        cur += size;
      }
      syncBuffer(target, view);
      target.Size = target.bytes.length;
      return { kind: "pointer", object: "Buffer", offset: cur };
    },
    strptr: (ctx) => {
      arity(ctx, 1, 1, "StrPtr");
      return unknown("StrPtrが返す実アドレス");
    },
    strput: (ctx) => strPutImpl(ctx),
    strget: (ctx) => strGetImpl(ctx),
  };
}
function encodeString(ctx, text, encoding) {
  const enc = (encoding || "UTF-16").trim().toLowerCase();
  if (enc === "utf-16" || enc === "utf-16le" || enc === "cp1200") {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code & 0xff, code >> 8);
    }
    return { bytes, charSize: 2, enc };
  }
  if (enc === "utf-8" || enc === "cp65001") {
    return { bytes: [...new TextEncoder().encode(text)], charSize: 1, enc };
  }
  if (enc === "cp0" || enc === "ansi") {
    const bytes = [...text].map((ch) => {
      const code = ch.codePointAt(0);
      return code <= 0xff ? code : 0x3f;
    });
    return { bytes, charSize: 1, enc };
  }
  ctx.api.fail(`未対応：文字列エンコーディング ${encoding}（対応は UTF-16 / UTF-8 / CP0）`, ctx.node, "未対応");
}
function decodeBytes(ctx, bytes, encoding) {
  const enc = (encoding || "UTF-16").trim().toLowerCase();
  if (enc === "utf-16" || enc === "utf-16le" || enc === "cp1200") {
    let out = "";
    for (let i = 0; i + 1 < bytes.length; i += 2)
      out += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
    return out;
  }
  if (enc === "utf-8" || enc === "cp65001")
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  if (enc === "cp0" || enc === "ansi")
    return new TextDecoder("windows-1252").decode(new Uint8Array(bytes));
  ctx.api.fail(`未対応：文字列エンコーディング ${encoding}（対応は UTF-16 / UTF-8 / CP0）`, ctx.node, "未対応");
}
function strPutImpl(ctx) {
  arity(ctx, 1, 4, "StrPut");
  const text = ctx.H.str(ctx.vals[0]);
  const second = ctx.vals[1];
  // 2引数モード（第2引数がエンコーディング名）: 必要バイト数（終端込み）を返す。
  if (ctx.args.length <= 2 && (second === undefined || typeof second === "string" && !isAhkBuffer(second))) {
    if (second !== undefined && typeof second !== "string")
      ctx.api.fail("StrPut の第2引数が不正です", ctx.node, "TypeError");
    const { bytes, charSize } = encodeString(ctx, text, typeof second === "string" ? second : undefined);
    return bytes.length + charSize;
  }
  if (!isAhkBuffer(second))
    ctx.api.fail("未対応：StrPutの書き込み先はBufferオブジェクトのみ対応です（実アドレスは扱えません）", ctx.node, "未対応");
  const length = ctx.args.length >= 3 && typeof ctx.vals[2] === "number" ? Math.trunc(ctx.vals[2]) : undefined;
  const encoding = ctx.args.length >= 4 ? ctx.H.str(ctx.vals[3]) : (typeof ctx.vals[2] === "string" ? ctx.vals[2] : undefined);
  const { bytes, charSize } = encodeString(ctx, text, encoding);
  if (length !== undefined) {
    const maxBytes = length * charSize;
    if (bytes.length + charSize > maxBytes && bytes.length >= maxBytes)
      ctx.api.fail("StrPut の長さ制限を超えています", ctx.node, "ValueError");
  }
  if (bytes.length > second.bytes.length)
    ctx.api.fail("StrPut の書き込みがBufferのサイズを超えています", ctx.node, "ValueError");
  let written = bytes.length;
  for (let i = 0; i < bytes.length; i++) second.bytes[i] = bytes[i];
  if (bytes.length + charSize <= second.bytes.length) {
    for (let i = 0; i < charSize; i++) second.bytes[bytes.length + i] = 0;
    written += charSize;
  }
  return written;
}
function strGetImpl(ctx) {
  arity(ctx, 1, 3, "StrGet");
  const src = ctx.vals[0];
  if (!isAhkBuffer(src))
    ctx.api.fail("未対応：StrGetの読み取り元はBufferオブジェクトのみ対応です（実アドレスは扱えません）", ctx.node, "未対応");
  const length = typeof ctx.vals[1] === "number" ? Math.trunc(ctx.vals[1]) : undefined;
  const encoding = typeof ctx.vals[2] === "string" ? ctx.vals[2] : (typeof ctx.vals[1] === "string" ? ctx.vals[1] : undefined);
  const enc = (encoding || "UTF-16").trim().toLowerCase();
  const charSize = enc.startsWith("utf-16") || enc === "cp1200" ? 2 : 1;
  let end = src.bytes.length;
  // 終端（ヌル文字）まで。
  for (let i = 0; i + charSize <= src.bytes.length; i += charSize) {
    let zero = true;
    for (let j = 0; j < charSize; j++) if (src.bytes[i + j] !== 0) zero = false;
    if (zero) { end = i; break; }
  }
  let bytes = src.bytes.slice(0, end);
  if (length !== undefined) bytes = bytes.slice(0, Math.max(0, length) * charSize);
  return decodeBytes(ctx, bytes, encoding);
}

// ---------------------------------------------------------------------------
// コンストラクタ・Throw
// ---------------------------------------------------------------------------
const ERROR_CLASSES = new Set([
  "error", "typeerror", "valueerror", "indexerror", "keyerror", "membererror",
  "oserror", "zerodivisionerror", "targeterror", "unseterror", "methoderror",
  "propertyerror", "timeouterror", "unsetitemerror",
]);
const ERROR_CLASS_CANON = {
  error: "Error", typeerror: "TypeError", valueerror: "ValueError",
  indexerror: "IndexError", keyerror: "KeyError", membererror: "MemberError",
  oserror: "OSError", zerodivisionerror: "ZeroDivisionError",
  targeterror: "TargetError", unseterror: "UnsetError",
  methoderror: "MethodError", propertyerror: "PropertyError",
  timeouterror: "TimeoutError", unsetitemerror: "UnsetItemError",
};
// Error 系クラスは「呼び出すとエラーオブジェクトができる」クラスとして
// 値モデルに載せる（Throw の引数として使うのが主用途）。
for (const lower of ERROR_CLASSES) ADVANCED_FUNCTIONS.add(lower);
function constructorHandlers() {
  return {
    array: (ctx) => [...ctx.vals],
    map: (ctx) => {
      if (ctx.vals.length % 2 !== 0)
        ctx.api.fail("Map の引数はキーと値の組で指定してください", ctx.node, "TypeError");
      const m = makeAhkMap();
      for (let i = 0; i < ctx.vals.length; i += 2) {
        const idx = mapFind(ctx.H, m, ctx.vals[i]);
        if (idx >= 0) m.entries[idx][1] = ctx.vals[i + 1];
        else m.entries.push([ctx.vals[i], ctx.vals[i + 1]]);
      }
      syncMapCount(m);
      return m;
    },
    ahkthrowstmt: (ctx) => throwImpl(ctx),
  };
}
function throwImpl(ctx) {
  const s = ctx.s;
  if (ctx.args.length === 0) {
    const caught = s.ahkCaught;
    if (caught) {
      s.ahkThrownValue = caught.value;
      ctx.api.fail(caught.message, ctx.node, caught.category);
    }
    ctx.api.fail("Throw に値が指定されていません（Catch の外では再スローできません）", ctx.node, "ValueError");
  }
  // Error 系コンストラクタは FUNCTION_HANDLERS 側でエラーオブジェクトとして
  // 評価済み（vals[0] がそのオブジェクトになる）。
  const v = ctx.vals[0];
  s.ahkThrownValue = v;
  if (v && typeof v === "object" && !Array.isArray(v) && typeof v.Message === "string")
    ctx.api.fail(v.Message, ctx.node, typeof v.What === "string" && v.What ? v.What : "Error");
  // オブジェクト値は学習者向けの整形（H.fmt＝ahkDisplay）で示す。素の
  // 文字列化では "[object Object]" や "7,8" のような JS 側の表現が
  // そのまま学習者向けのエラー文に出てしまう（A2監査 F5）。
  if (v && typeof v === "object")
    ctx.api.fail(ctx.H.fmt(v), ctx.node, "Error");
  ctx.api.fail(ctx.H.str(v), ctx.node, "Error");
}

// ---------------------------------------------------------------------------
// メソッドハンドラ（レシーバの型で分岐）
// ---------------------------------------------------------------------------
function ahkIndex(ctx, v) {
  let n = v;
  if (typeof n === "boolean") n = Number(n);
  if (typeof n === "string" && /^[+-]?\d+$/.test(n.trim())) n = parseInt(n.trim(), 10);
  if (typeof n !== "number" || !Number.isInteger(n))
    ctx.api.fail("添字は整数で指定してください", ctx.node, "TypeError");
  return n;
}
function arrayPos(ctx, arr, n, allowEnd = false) {
  const len = arr.length;
  const pos = n === 0 && allowEnd ? len + 1 : n < 0 ? len + n + 1 : n;
  const max = allowEnd ? len + 1 : len;
  if (pos < 1 || pos > max)
    ctx.api.fail("添字が有効範囲にありません", ctx.node, "ValueError");
  return pos;
}
function methodDispatch(ctx, receiver, method) {
  const { api, node, H } = ctx;
  const vals = ctx.vals;
  const failType = (msg) => api.fail(msg, node, "TypeError");
  // --- RegExMatchInfo ---
  if (isMatchInfo(receiver)) {
    const table = { pos: "Pos", len: "Len", name: "Name" }[method];
    if (!table) failType(`RegExMatchInfo にメソッド ${method} はありません`);
    arity(ctx, 0, 1, `RegExMatchInfo.${table}`);
    const key = vals.length === 0 || vals[0] === undefined ? "0" : H.str(vals[0]);
    const direct = receiver[table][key];
    if (direct !== undefined) return direct;
    // 名前指定（Name 以外）: グループ名から番号を引く。
    const g = receiver.__groups.find((x) => x.name === key);
    if (g) return table === "Pos" ? g.pos : table === "Len" ? g.len : g.name;
    api.fail(`マッチ情報に ${key} はありません`, node, "IndexError");
  }
  // --- Buffer ---
  if (isAhkBuffer(receiver)) {
    if (method === "call" || method === "__new") return makeBuffer(ctx, vals[0], vals[1]);
    return objectMethodDispatch(ctx, receiver, method);
  }
  // --- Map ---
  if (isAhkMap(receiver)) {
    switch (method) {
      case "call":
      case "__new": {
        if (vals.length % 2 !== 0) failType("Map の引数はキーと値の組で指定してください");
        const m = makeAhkMap();
        for (let i = 0; i < vals.length; i += 2) {
          const idx = mapFind(H, m, vals[i]);
          if (idx >= 0) m.entries[idx][1] = vals[i + 1];
          else m.entries.push([vals[i], vals[i + 1]]);
        }
        syncMapCount(m);
        return m;
      }
      case "set": {
        if (vals.length % 2 !== 0) failType("Set の引数はキーと値の組で指定してください");
        for (let i = 0; i < vals.length; i += 2) {
          const idx = mapFind(H, receiver, vals[i]);
          if (idx >= 0) receiver.entries[idx][1] = vals[i + 1];
          else receiver.entries.push([vals[i], vals[i + 1]]);
        }
        syncMapCount(receiver);
        return receiver;
      }
      case "get": {
        arity(ctx, 1, 2, "Map.Get");
        const idx = mapFind(H, receiver, vals[0]);
        if (idx >= 0) return receiver.entries[idx][1];
        if (ctx.args.length >= 2) return vals[1];
        api.fail("キーが Map にありません", node, "UnsetItemError");
        break;
      }
      case "has":
        arity(ctx, 1, 1, "Map.Has");
        return mapFind(H, receiver, vals[0]) >= 0 ? 1 : 0;
      case "delete": {
        arity(ctx, 1, 1, "Map.Delete");
        const idx = mapFind(H, receiver, vals[0]);
        if (idx < 0) api.fail("キーが Map にありません", node, "UnsetItemError");
        const removed = receiver.entries.splice(idx, 1)[0][1];
        syncMapCount(receiver);
        return removed;
      }
      case "clear":
        arity(ctx, 0, 0, "Map.Clear");
        receiver.entries = [];
        syncMapCount(receiver);
        return null;
      case "clone": {
        const cloned = makeAhkMap(receiver.entries.map(([k, v]) => [k, v]));
        cloned.CaseSense = receiver.CaseSense ?? "On";
        if (Object.hasOwn(receiver, "Default")) cloned.Default = receiver.Default;
        return cloned;
      }
      default:
        return objectMethodDispatch(ctx, receiver, method);
    }
  }
  // --- Array ---
  if (Array.isArray(receiver)) {
    switch (method) {
      case "call":
      case "__new":
        return [...vals];
      case "push":
        receiver.push(...vals);
        return null;
      case "pop": {
        arity(ctx, 0, 0, "Array.Pop");
        if (receiver.length === 0) api.fail("空の配列から Pop はできません", node, "Error");
        const v = receiver.pop();
        return v === undefined ? "" : v;
      }
      case "insertat": {
        if (ctx.args.length < 2) failType("InsertAt には位置と値が必要です");
        const n = ahkIndex(ctx, vals[0]);
        const pos = arrayPos(ctx, receiver, n, true);
        receiver.splice(pos - 1, 0, ...vals.slice(1));
        return null;
      }
      case "removeat": {
        arity(ctx, 1, 2, "Array.RemoveAt");
        const n = ahkIndex(ctx, vals[0]);
        const count = ctx.args.length >= 2 ? ahkIndex(ctx, vals[1]) : 1;
        const pos = n < 0 ? receiver.length + n + 1 : n;
        if (pos < 1 || pos + count - 1 > receiver.length || count < 1)
          api.fail("RemoveAt の範囲が配列の外です", node, "ValueError");
        const removed = receiver.splice(pos - 1, count);
        return ctx.args.length >= 2 ? null : (removed[0] === undefined ? "" : removed[0]);
      }
      case "delete": {
        arity(ctx, 1, 1, "Array.Delete");
        const n = ahkIndex(ctx, vals[0]);
        const pos = arrayPos(ctx, receiver, n);
        const v = receiver[pos - 1];
        receiver[pos - 1] = undefined;
        return v === undefined ? "" : v;
      }
      case "get": {
        arity(ctx, 1, 2, "Array.Get");
        const n = ahkIndex(ctx, vals[0]);
        if (n === 0) api.fail("添字が有効範囲にありません", node, "IndexError");
        const pos = n < 0 ? receiver.length + n + 1 : n;
        if (pos < 1 || pos > receiver.length) api.fail("添字が有効範囲にありません", node, "IndexError");
        const v = receiver[pos - 1];
        if (v !== undefined) return v;
        if (ctx.args.length >= 2) return vals[1];
        api.fail("その位置に値がありません", node, "UnsetItemError");
        break;
      }
      case "has": {
        arity(ctx, 1, 1, "Array.Has");
        const n = ahkIndex(ctx, vals[0]);
        const pos = n < 0 ? receiver.length + n + 1 : n;
        return pos >= 1 && pos <= receiver.length && receiver[pos - 1] !== undefined ? 1 : 0;
      }
      case "clone":
        return [...receiver];
      default:
        return objectMethodDispatch(ctx, receiver, method);
    }
  }
  // --- 通常の Object ---
  if (receiver && typeof receiver === "object")
    return objectMethodDispatch(ctx, receiver, method);
  failType(`この値にはメソッド ${method} はありません`);
}
function objectMethodDispatch(ctx, receiver, method) {
  const { api, node, H } = ctx;
  const vals = ctx.vals;
  switch (method) {
    case "clone": {
      if (Array.isArray(receiver)) return [...receiver];
      if (isAhkMap(receiver)) {
        const cloned = makeAhkMap(receiver.entries.map(([k, v]) => [k, v]));
        // Clone は CaseSense と Default（定義済みなら）も引き継ぐ。
        cloned.CaseSense = receiver.CaseSense ?? "On";
        if (Object.hasOwn(receiver, "Default")) cloned.Default = receiver.Default;
        return cloned;
      }
      const out = {};
      for (const [k, v] of Object.entries(receiver)) out[k] = v;
      return out;
    }
    case "hasownprop":
      arity(ctx, 1, 1, "HasOwnProp");
      return hasOwnPropImpl(ctx, receiver, H.str(vals[0])) ? 1 : 0;
    case "defineprop": {
      arity(ctx, 2, 2, "DefineProp");
      if (Array.isArray(receiver) || isAhkMap(receiver) || isAhkBuffer(receiver))
        api.fail("DefineProp の対象は通常の Object のみ対応です", node, "TypeError");
      const name = H.str(vals[0]);
      const desc = vals[1];
      if (!desc || typeof desc !== "object" || Array.isArray(desc))
        api.fail("DefineProp の記述子はオブジェクトで指定してください", node, "TypeError");
      if (["get", "set", "call"].some((k) => Object.keys(desc).some((x) => x.toLowerCase() === k)))
        api.fail("未対応：DefinePropのゲッター／セッター／コール（関数オブジェクトが必要です）", node, "未対応");
      if (!Object.keys(desc).some((k) => k.toLowerCase() === "value"))
        api.fail("DefineProp の記述子に Value がありません", node, "TypeError");
      const key = ownKeyOf(receiver, name) ?? name;
      receiver[key] = desc[Object.keys(desc).find((k) => k.toLowerCase() === "value")];
      return receiver;
    }
    case "deleteprop": {
      arity(ctx, 1, 1, "DeleteProp");
      const key = ownKeyOf(receiver, H.str(vals[0]));
      if (key === undefined || key.startsWith("__ahk")) return "";
      const v = receiver[key];
      delete receiver[key];
      return v === undefined ? "" : v;
    }
    case "getownpropdesc": {
      arity(ctx, 1, 1, "GetOwnPropDesc");
      const key = ownKeyOf(receiver, H.str(vals[0]));
      if (key === undefined || key.startsWith("__ahk"))
        api.fail("その名前の固有プロパティはありません", node, "PropertyError");
      return { Value: receiver[key] };
    }
    default:
      api.fail(`このオブジェクトにメソッド ${method} はありません`, node, "MethodError");
  }
}

// ---------------------------------------------------------------------------
// Map の添字読み書き（基礎 read／write の index 分岐から委譲される）
// ---------------------------------------------------------------------------
export function advancedIndexRead(ctx) {
  const { target, idx, api, node, H } = ctx;
  const i = mapFind(H, target, idx);
  if (i >= 0) return target.entries[i][1];
  const defKey = Object.keys(target).find((k) => k.toLowerCase() === "default");
  if (defKey !== undefined) return target[defKey];
  api.fail("キーが Map にありません", node, "UnsetItemError");
}
export function advancedIndexWrite(ctx) {
  const { target, idx, value, H } = ctx;
  const i = mapFind(H, target, idx);
  if (i >= 0) target.entries[i][1] = value;
  else target.entries.push([idx, value]);
  syncMapCount(target);
  return true;
}

// ---------------------------------------------------------------------------
// ディスパッチ（基礎 call の default から委譲される）
// ---------------------------------------------------------------------------
const FUNCTION_HANDLERS = {
  ...mathHandlers(),
  ...stringHandlers(),
  ...miscHandlers(),
  ...regexHandlers(),
  ...memoryHandlers(),
  ...constructorHandlers(),
};
for (const lower of ERROR_CLASSES) {
  const canon = ERROR_CLASS_CANON[lower];
  FUNCTION_HANDLERS[lower] = (ctx) => ({
    Message: ctx.vals[0] !== undefined ? ctx.H.str(ctx.vals[0]) : "",
    What: ctx.vals[1] !== undefined && ctx.vals[1] !== "" ? ctx.H.str(ctx.vals[1]) : canon,
    Extra: ctx.vals[2] !== undefined ? ctx.vals[2] : "",
    Line: ctx.node.line,
  });
}
export function dispatchAdvancedCall(ctx) {
  const name = ctx.name;
  const lower = name.toLowerCase();
  if (!lower.includes(".")) {
    const handler = FUNCTION_HANDLERS[lower];
    if (!handler) return null;
    return { handled: true, value: handler(ctx) };
  }
  const method = lower.slice(lower.lastIndexOf(".") + 1);
  const targetNode = ctx.node.target;
  if (!targetNode || targetNode.k !== "member") return null;
  const receiver = ctx.api.read(targetNode.target, ctx.s);
  if (isUnknown(receiver))
    ctx.api.fail(`未確定の値のメソッド ${method} は実行できません`, ctx.node, "未対応");
  return { handled: true, value: methodDispatch(ctx, receiver, method) };
}

// ---------------------------------------------------------------------------
// 文ハンドラ（基礎 step から委譲される）
// ---------------------------------------------------------------------------
export function advancedStep(ctx, n) {
  switch (n.k) {
    case "ahkLoopParse": return runLoopParse(ctx, n);
    case "ahkTry": return runTry(ctx, n);
    case "ahkSwitch": return runSwitch(ctx, n);
    default: return null;
  }
}

function splitParseFields(ctx, text, delims, omit) {
  let fields;
  if (delims && delims.toLowerCase() === "csv") {
    fields = [];
    let cur = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { fields.push(cur); cur = ""; }
      else cur += c;
    }
    fields.push(cur);
  } else if (!delims) {
    fields = [...text];
  } else {
    const set = new Set([...delims]);
    fields = [];
    let cur = "";
    for (const ch of text) {
      if (set.has(ch)) { fields.push(cur); cur = ""; }
      else cur += ch;
    }
    fields.push(cur);
  }
  if (omit) {
    const set = new Set([...omit]);
    fields = fields.map((f) => {
      let a = 0, b = f.length;
      while (a < b && set.has(f[a])) a++;
      while (b > a && set.has(f[b - 1])) b--;
      return f.slice(a, b);
    });
  }
  return fields;
}
function runLoopParse(ctx, n) {
  const { s, api, H } = ctx;
  const vals = n.args.map((a) => api.read(a, s));
  const hay = vals[0];
  if (isUnknown(hay)) api.fail("未対応：未確定の文字列の Loop Parse", n, "未対応");
  const text = H.str(hay);
  const delims = vals[1] === undefined || vals[1] === "" ? "" : H.str(vals[1]);
  const omit = vals[2] === undefined || vals[2] === "" ? "" : H.str(vals[2]);
  const fields = text === "" ? [] : splitParseFields(ctx, text, delims, omit);
  const varKey = Object.keys(s.vars).find((k) => k.toLowerCase() === "a_loopfield");
  const hadField = varKey !== undefined;
  const prevField = hadField ? s.vars[varKey] : undefined;
  let active = [s], done = [];
  for (let i = 0; i < fields.length; i++) {
    if (i >= LIMITS.iterations) {
      for (const st of active) {
        api.note(st, n, "ループ上限で説明を停止しました", "limit");
        st.halt = true;
        done.push(st);
      }
      active = [];
      break;
    }
    const next = [];
    for (const st of active) {
      if (st.halt || st.signal) { done.push(st); continue; }
      H.setVar(st, "A_LoopField", fields[i]);
      api.note(st, n, `繰り返し ${i + 1}回目`);
      st.loopDepth = (st.loopDepth || 0) + 1;
      (st.loopIterations ??= []).push(i + 1);
      for (const out of api.run(n.body, [st])) {
        out.loopDepth--;
        out.loopIterations.pop();
        if (out.signal === "break") { out.signal = null; done.push(out); }
        else if (out.signal === "continue") { out.signal = null; next.push(out); }
        else if (out.halt || out.signal === "return") done.push(out);
        else { out.signal = null; next.push(out); }
      }
    }
    active = next;
    if (done.length + active.length > LIMITS.paths) {
      done = done.slice(0, LIMITS.paths);
      active = active.slice(0, Math.max(0, LIMITS.paths - done.length));
    }
  }
  const all = done.concat(active);
  for (const st of all) {
    const key = Object.keys(st.vars).find((k) => k.toLowerCase() === "a_loopfield");
    if (hadField && key) st.vars[key] = prevField;
    else if (key) delete st.vars[key];
  }
  return all;
}

const UNCATCHABLE = new Set(["未対応", "limit", "モデルエラー"]);
function runFinally(ctx, states, finallyBody) {
  if (!finallyBody) return states;
  const { api } = ctx;
  const out = [];
  for (const st of states) {
    const err = st.error, halt = st.halt, sig = st.signal;
    st.error = null; st.halt = false; st.signal = null;
    for (const o of api.run(finallyBody, [st])) {
      if (!o.error && !o.signal && err) { o.error = err; o.halt = true; }
      else if (!o.error && !o.signal && sig) o.signal = sig;
      else if (!o.error && !o.signal && halt) o.halt = true;
      out.push(o);
    }
  }
  return out;
}
function runTry(ctx, n) {
  const { s, api, H } = ctx;
  let states = api.run(n.tryBody, [s]);
  const afterCatch = [];
  for (const st of states) {
    if (!st.error) {
      // Else 節（公式 Else.htm／Language.htm）：Try ブロックで例外が
      // 投げられなかった場合にだけ実行する。break／return 等の制御移行や
      // 停止で抜けた経路では実行しない（制御はそのまま外へ移る）。
      // 例外が起きた経路は、Catch で受けた場合も受けられず伝播する場合も
      // 下の分岐で処理され、Else は実行されない（公式 v2 変更点の明記どおり）。
      if (n.elseBody && !st.halt && !st.signal) {
        api.note(st, n, "例外が発生しなかったため Else を実行します");
        afterCatch.push(...api.run(n.elseBody, [st]));
      } else afterCatch.push(st);
      continue;
    }
    if (UNCATCHABLE.has(st.error.category)) { afterCatch.push(st); continue; }
    const thrown = st.ahkThrownValue;
    const errObj = thrown && typeof thrown === "object" && !Array.isArray(thrown) && typeof thrown.Message === "string"
      ? thrown
      : { Message: st.error.message, What: st.error.category || "Error", Line: st.error.line };
    const isErrorValue = thrown === undefined || (thrown && typeof thrown === "object" && typeof thrown.Message === "string");
    // Catch も Finally もない Try は、公式では Catch を省略した Try と
    // 同じく Error のみを受ける（暗黙の Catch）。Error でない値は
    // 受けずに伝播させる（A2監査 F3）。
    if ((n.catches || []).length === 0 && !n.finallyBody) {
      if (isErrorValue) {
        for (const t of st.trace) {
          if (t.kind === "error" && t.text === st.error.message) {
            t.kind = "step";
            t.text = `エラーが発生しましたが Try で受け取ります（Catch 省略）：${st.error.message}`;
          }
        }
        st.error = null; st.halt = false;
        delete st.ahkThrownValue;
      }
      afterCatch.push(st);
      continue;
    }
    const caught = (n.catches || []).find((c) =>
      c.classes.some((cls) => {
        const cl = cls.toLowerCase();
        if (cl === "any") return true;
        if (!isErrorValue) {
          // 公式：Catch のクラスには任意のクラス名が書ける。組み込みの
          // 型名は値の型で判定する（A2監査 F2：従来は String／Integer／
          // Float のみで、Object／Array／Map／Buffer が受けられなかった）。
          // Error 系クラスは Error でない値には一致しない。
          if (cl === "string") return typeof thrown === "string";
          if (cl === "integer") return typeof thrown === "number" && !H.isFloat(thrown);
          if (cl === "float") return H.isFloat(thrown);
          if (cl === "array") return Array.isArray(thrown);
          if (cl === "map") return isAhkMap(thrown);
          if (cl === "buffer") return isAhkBuffer(thrown);
          if (cl === "object") return thrown !== null && typeof thrown === "object";
          return false;
        }
        // Object は全クラスの基底なので Error 値も受ける。
        return cl === "error" || cl === "object" || cl === (errObj.What || "").toLowerCase() || cl === (st.error.category || "").toLowerCase();
      }));
    if (!caught) { afterCatch.push(st); continue; }
    // 捕捉したエラーのトレースは、最終エラーではなく経過として示す。
    for (const t of st.trace) {
      if (t.kind === "error" && t.text === st.error.message) {
        t.kind = "step";
        t.text = `エラーが発生しましたが Catch で受け取ります：${st.error.message}`;
      }
    }
    const message = st.error.message, category = st.error.category;
    st.error = null; st.halt = false;
    delete st.ahkThrownValue;
    if (caught.varName)
      H.setVar(st, caught.varName, thrown !== undefined && !isErrorValue ? thrown : errObj);
    const prevCaught = st.ahkCaught;
    st.ahkCaught = { message, category, value: thrown !== undefined ? thrown : errObj };
    const results = api.run(caught.body, [st]);
    for (const o of results) {
      if (prevCaught === undefined) delete o.ahkCaught;
      else o.ahkCaught = prevCaught;
      afterCatch.push(o);
    }
  }
  return runFinally(ctx, afterCatch, n.finallyBody);
}

function runSwitch(ctx, n) {
  const { s, api, H } = ctx;
  let switchValue, caseSense, hasValue = false;
  if (n.valueArgs.length >= 1) {
    switchValue = api.read(n.valueArgs[0], s);
    hasValue = true;
    if (isUnknown(switchValue))
      api.fail("未対応：未確定の値による Switch の分岐", n, "未対応");
    if (n.valueArgs.length >= 2) caseSense = api.read(n.valueArgs[1], s);
  }
  const eq = (a, b) => {
    const ua = H.unf(a), ub = H.unf(b);
    if (caseSense !== undefined && caseSense !== "") {
      const cs = H.str(caseSense).trim().toLowerCase();
      const sa = H.str(ua), sb = H.str(ub);
      if (cs === "on" || cs === "1" || cs === "true") return sa === sb;
      return sa.toLowerCase() === sb.toLowerCase();
    }
    const aNum = typeof ua === "number" ? ua : null;
    const bNum = typeof ub === "number" ? ub : null;
    const aNumStr = typeof ua === "string" ? H.numVal(ua) : null;
    const bNumStr = typeof ub === "string" ? H.numVal(ub) : null;
    if (aNum !== null && (bNum !== null || bNumStr !== null)) return aNum === (bNum ?? bNumStr);
    if (bNum !== null && aNumStr !== null) return aNumStr === bNum;
    return H.str(ua) === H.str(ub);
  };
  for (const c of n.cases) {
    for (const valueNode of c.values) {
      const v = api.read(valueNode, s);
      if (isUnknown(v)) api.fail("未対応：未確定の Case 値による Switch の分岐", n, "未対応");
      const hit = hasValue ? eq(switchValue, v) : H.truth(v);
      if (hit) {
        api.note(s, n, "一致する Case を実行します");
        return api.run(c.body, [s]);
      }
    }
  }
  if (n.defaultBody) {
    api.note(s, n, "一致する Case がないため Default を実行します");
    return api.run(n.defaultBody, [s]);
  }
  api.note(s, n, "一致する Case がありません");
  return [s];
}
