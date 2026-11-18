// Power Fx 高度モード（ブロックB2）: 基礎セットに無い関数の意味論ハンドラ。
// 有効化の契約：機構の advanced-loader が高度モードで advanced-engine.js の
// applyAdvancedEngine を呼ぶことで有効化される。未適用（簡易モード相当）
// では基礎挙動と完全一致する（既定では無効であり、index.js は高度ハンドラ
// へ委譲せず、基礎どおり名前を挙げて停止する）。
// index.js の呼び出しディスパッチの default から、基礎で扱えない関数だけが
// ここへ委譲される。ctx は index.js 側のクロージャ内ヘルパーをそのまま渡す:
//   { name, fn, args(未評価AST), get(i), key(i), node, api, s, rowEval,
//     recalc, ciKey, ciDropDuplicates, fxTruth, textOf }
// 値モデルは基礎と同一: Blank=null、テーブル=配列、レコード=オブジェクト、
// 実行時に決まる値は unknown（値を捏造しない）。日時値はこのモデルでは
// ISO形式の文字列（"YYYY-MM-DD" / "YYYY-MM-DDTHH:MM:SS" / "HH:MM:SS"）で
// 表す。色値は "#RRGGBB" または "#RRGGBBAA" の文字列で表す。
import { isUnknown, unknown } from "../../core/contract.js";
import { PracticeError } from "../../core/script.js";

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

function fail(ctx, message) {
  ctx.api.fail(message, ctx.node);
}
function arity(ctx, min, max = min) {
  const n = ctx.args.length;
  if (n < min || n > max)
    fail(
      ctx,
      `${ctx.name} の引数の数が正しくありません（${min === max ? min + " 個" : max === Infinity ? min + " 個以上" : min + "〜" + max + " 個"}が必要です。空の引数は書けません）`,
    );
}
// 未確定値が混ざっていればその値を返す（基礎の伝播規則に倣う）。
function unk(...vals) {
  return vals.find((v) => isUnknown(v));
}
// 数値引数。Blank は呼び出し側で扱うため、ここでは Blank を null で返す。
function num(ctx, v, label = "引数") {
  if (v === null || v === undefined) return null;
  if (isUnknown(v)) return v;
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
    return Number(v);
  fail(ctx, `${ctx.name}：${label}は数値で指定してください（型が一致しません）`);
}
function numReq(ctx, v, label) {
  const n = num(ctx, v, label);
  if (n === null) fail(ctx, `${ctx.name}：${label}に Blank は指定できません`);
  return n;
}
function text(ctx, v, label = "引数") {
  if (v === null || v === undefined) return null;
  if (isUnknown(v)) return v;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  fail(ctx, `${ctx.name}：${label}はテキストで指定してください（型が一致しません）`);
}
function needTable(ctx, v) {
  if (!Array.isArray(v)) fail(ctx, "テーブルが必要です");
  return v;
}
function deepEq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
// 列名引数: 識別子（裸の列名）でも文字列でも受け付ける（現行 Power Fx の
// AddColumns 等は裸の列名が標準形で、文字列形も歴史的に受理される）。
function colName(ctx, i) {
  const a = ctx.args[i];
  if (a?.k === "var") return a.name;
  const v = ctx.get(i);
  if (isUnknown(v)) fail(ctx, `${ctx.name}：列名が未確定です`);
  if (typeof v !== "string")
    fail(ctx, `${ctx.name}：列名は名前または文字列で指定してください`);
  return v;
}
function recordScopeGuard(ctx) {
  if (ctx.s.record || ctx.s.bindingDepth)
    fail(ctx, "ForAllまたは表示数式内の副作用はこのモデルでは未対応です");
}
// ---------- 日時ヘルパー（UTCで正規化し、タイムゾーン依存を排除する） ----------
const pad = (n, w = 2) => String(n).padStart(w, "0");
function fmtDate(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function fmtDateTime(ms) {
  const d = new Date(ms);
  return `${fmtDate(ms)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
function fmtTime(ms) {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
// ISO文字列（日付／日時／時刻）を分解する。解釈できなければ null。
function parseDT(v) {
  if (typeof v !== "string") return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(v.trim());
  if (m)
    return {
      ms: Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)),
      dateOnly: m[4] === undefined,
      timeOnly: false,
    };
  m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v.trim());
  if (m)
    return {
      ms: Date.UTC(1899, 11, 30, +m[1], +m[2], +(m[3] || 0)),
      dateOnly: false,
      timeOnly: true,
    };
  return null;
}
function reqDT(ctx, v, label = "引数") {
  if (v === null) return null;
  if (isUnknown(v)) return v;
  const p = parseDT(v);
  if (!p) fail(ctx, `${ctx.name}：${label}を日時として解釈できません`);
  return p;
}
// en-US の "M/D/YYYY" 形式も受理するテキスト→日時パース。
function parseDateText(ctx, v, label) {
  const t = text(ctx, v, label);
  if (t === null || isUnknown(t)) return t;
  let p = parseDT(t);
  if (p) return p;
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?$/.exec(t.trim());
  if (m) {
    let h = +(m[4] || 0);
    if (m[7]) {
      const pm = m[7].toLowerCase() === "pm";
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
    }
    return {
      ms: Date.UTC(+m[3], +m[1] - 1, +m[2], h, +(m[5] || 0), +(m[6] || 0)),
      dateOnly: m[4] === undefined,
      timeOnly: false,
    };
  }
  m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/.exec(t.trim());
  if (m) {
    let h = +m[1];
    if (m[4]) {
      const pm = m[4].toLowerCase() === "pm";
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
    }
    return { ms: Date.UTC(1899, 11, 30, h, +m[2], +(m[3] || 0)), dateOnly: false, timeOnly: true };
  }
  fail(ctx, `${ctx.name}：${label}を日時として解釈できません`);
}
function checkLang(ctx, i) {
  if (ctx.args.length <= i) return;
  const tag = ctx.get(i);
  if (typeof tag !== "string" || tag.toLowerCase() !== "en-us")
    fail(ctx, `${ctx.name} の言語タグは未対応です（このモデルは en-US のみ対応）：${ctx.textOf(tag)}`);
}
// 10進文字列のまま丸める（基礎 Text の decimalRound と同じ方針: 半上げ）。
function roundDecimal(absValue, digits, mode) {
  // mode: "half"（四捨五入）, "down"（切り捨て）, "up"（切り上げ＝0から離れる）
  let s = String(absValue);
  if (/[eE]/.test(s)) {
    // 指数表記は一旦通常表記へ展開する
    let [mant, expS] = s.split(/[eE]/);
    const exp = parseInt(expS, 10);
    let [ip, fp = ""] = mant.split(".");
    const digitsAll = ip + fp;
    const point = ip.length + exp;
    if (point <= 0) s = "0." + "0".repeat(-point) + digitsAll;
    else if (point >= digitsAll.length) s = digitsAll + "0".repeat(point - digitsAll.length);
    else s = digitsAll.slice(0, point) + "." + digitsAll.slice(point);
  }
  let [ip, fp = ""] = s.split(".");
  ip = ip.replace(/^0+(?=\d)/, "");
  if (fp.length <= digits) return Number(ip + (digits ? "." + fp.padEnd(digits, "0") : ""));
  const keep = fp.slice(0, digits);
  const rest = fp.slice(digits);
  let inc = false;
  if (mode === "half") inc = rest[0] >= "5";
  else if (mode === "up") inc = /[1-9]/.test(rest);
  if (!inc) return Number(ip + (digits ? "." + keep : ""));
  let combined = (ip + keep).split("");
  let i = combined.length - 1;
  while (i >= 0 && combined[i] === "9") { combined[i] = "0"; i--; }
  if (i < 0) combined.unshift("1");
  else combined[i] = String(Number(combined[i]) + 1);
  const joined = combined.join("");
  if (!digits) return Number(joined);
  return Number(joined.slice(0, joined.length - digits) + "." + joined.slice(joined.length - digits));
}
function roundWith(ctx, v, digits, mode) {
  const n = num(ctx, v);
  if (n === null || isUnknown(n)) return n;
  const d = digits === undefined ? 0 : Math.trunc(numReq(ctx, digits, "桁数"));
  if (d < -30 || d > 30) fail(ctx, `${ctx.name}：桁数が範囲外です`);
  const sign = n < 0 ? -1 : 1;
  const r = roundDecimal(Math.abs(n), Math.max(0, d), mode);
  // 負の桁数（十の位など）は10進文字列法では扱えないため数値法で処理する
  if (d < 0) {
    const f = Math.pow(10, -d);
    const q = Math.abs(n) / f;
    const rq = mode === "half" ? Math.round(q) : mode === "down" ? Math.floor(q) : Math.ceil(q);
    return sign * rq * f;
  }
  return sign * r;
}
function truncDigits(n, d) {
  if (d >= 0) {
    const f = Math.pow(10, d);
    return Math.trunc(n * f) / f;
  }
  const f = Math.pow(10, -d);
  return Math.trunc(n / f) * f;
}
// ---------- 集計の共通処理 ----------
function aggregate(ctx, kind) {
  arity(ctx, 1, Infinity);
  const first = ctx.get(0);
  if (isUnknown(first)) return first;
  let values;
  if (Array.isArray(first)) {
    if (ctx.args.length !== 2)
      fail(ctx, `${ctx.name} のテーブル形式は引数が2個必要です（テーブルと集計式）`);
    values = ctx.rowEval(first, ctx.args[1]);
  } else {
    if (kind === "stdevp" || kind === "varp")
      fail(ctx, `${ctx.name} はテーブル形式（テーブルと集計式）で指定してください`);
    values = [first];
    for (let i = 1; i < ctx.args.length; i++) values.push(ctx.get(i));
  }
  const u = unk(...values);
  if (u) return u;
  const nums = [];
  for (const v of values) {
    // Learn（function-aggregates）: 集計関数は数値だけを対象とし、文字列・
    // レコードなど数値でない値は変換せず無視する（変換には Value を使う）。
    // Blank も数えない。
    if (typeof v === "number") nums.push(v);
  }
  if (!nums.length) return null;
  if (kind === "average") return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (kind === "max") return Math.max(...nums);
  if (kind === "min") return Math.min(...nums);
  if (kind === "varp" || kind === "stdevp") {
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
    return kind === "varp" ? variance : Math.sqrt(variance);
  }
  return null;
}
// 単一数値関数の共通形（Blank→Blank、未確定→未確定）
function unaryMath(ctx, f, domain) {
  arity(ctx, 1, 1);
  const n = num(ctx, ctx.get(0));
  if (n === null || isUnknown(n)) return n;
  if (domain && !domain(n)) fail(ctx, `${ctx.name}：引数が定義域の外です（エラー値になります）`);
  const r = f(n);
  if (typeof r === "number" && Number.isNaN(r))
    fail(ctx, `${ctx.name}：結果が数値になりません（エラー値になります）`);
  return r;
}
// 色値ヘルパー
const CSS_COLORS = {
  black: "#000000", white: "#FFFFFF", red: "#FF0000", green: "#008000",
  blue: "#0000FF", yellow: "#FFFF00", orange: "#FFA500", purple: "#800080",
  pink: "#FFC0CB", brown: "#A52A2A", gray: "#808080", grey: "#808080",
  cyan: "#00FFFF", magenta: "#FF00FF", lime: "#00FF00", navy: "#000080",
  teal: "#008080", olive: "#808000", maroon: "#800000", silver: "#C0C0C0",
  gold: "#FFD700", transparent: "#00000000",
};
function parseColor(ctx, v) {
  const t = text(ctx, v, "色");
  if (t === null || isUnknown(t)) return t;
  const s = t.trim();
  if (CSS_COLORS[s.toLowerCase()]) return CSS_COLORS[s.toLowerCase()];
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(s);
  if (!m) fail(ctx, `${ctx.name}：色として解釈できません：${s}`);
  let hex = m[1].toUpperCase();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return "#" + hex;
}
function colorChannels(hex) {
  const h = hex.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255,
  };
}
function channelsColor({ r, g, b, a }) {
  const c = (n) => pad(Math.max(0, Math.min(255, Math.round(n))).toString(16).toUpperCase());
  return "#" + c(r) + c(g) + c(b) + (a === 255 ? "" : c(a));
}
// 正規表現（Power Fx の Match 系）。オプション文字列からフラグを組み立てる。
function fxRegExp(ctx, pattern, options) {
  let flags = "";
  let pat = pattern;
  if (options) {
    const o = String(options);
    if (/IgnoreCase/i.test(o)) flags += "i";
    if (/BeginsWith/i.test(o)) pat = "^(?:" + pat + ")";
    if (/EndsWith/i.test(o)) pat = "(?:" + pat + ")$";
    if (/FullMatch/i.test(o)) pat = "^(?:" + pat + ")$";
  }
  try {
    return new RegExp(pat, flags);
  } catch {
    fail(ctx, `${ctx.name}：正規表現が不正です：${pattern}`);
  }
}
function matchRecord(m) {
  if (!m) return null;
  return {
    FullMatch: m[0],
    Start: m.index + 1,
    SubMatches: m.slice(1).map((v) => ({ Value: v === undefined ? null : v })),
  };
}

// コレクション／データソースを名前で解決する（Remove／Update 系用）。
function resolveTable(ctx, name) {
  const s = ctx.s;
  const colKey = ctx.ciKey(s.model.collections, name);
  const dsKey = ctx.ciKey(s.model.dataSources, name);
  const store = colKey !== undefined ? "collections" : dsKey !== undefined ? "dataSources" : null;
  if (!store) fail(ctx, `${ctx.name}：モデルにコレクション／データソースがありません：${name}`);
  const key = store === "collections" ? colKey : dsKey;
  return {
    key,
    rows: s.model[store][key],
    write(rows) {
      s.model[store][key] = rows;
      ctx.ciDropDuplicates(s.vars, key, name);
      s.vars[key] = rows;
    },
  };
}
function textCase(ctx, f) {
  arity(ctx, 1, 1);
  const v = ctx.get(0);
  if (v === null) return null;
  if (isUnknown(v)) return v;
  if (typeof v === "string") return f(v);
  if (Array.isArray(v))
    return v.map((row) => {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        const keys = Object.keys(row);
        if (keys.length === 1 && typeof row[keys[0]] === "string")
          return { [keys[0]]: f(row[keys[0]]) };
        fail(ctx, `${ctx.name}：テーブルの形では単一列のテキストテーブルを指定してください`);
      }
      return { Value: f(ctx.textOf(row)) };
    });
  fail(ctx, `${ctx.name}：テキストを指定してください`);
}

export const advancedFunctions = {
  // ================= 数学 =================
  abs: (ctx) => unaryMath(ctx, Math.abs),
  acos: (ctx) => unaryMath(ctx, Math.acos, (n) => n >= -1 && n <= 1),
  acot: (ctx) => unaryMath(ctx, (n) => Math.PI / 2 - Math.atan(n)),
  asin: (ctx) => unaryMath(ctx, Math.asin, (n) => n >= -1 && n <= 1),
  atan: (ctx) => unaryMath(ctx, Math.atan),
  atan2: (ctx) => {
    // Learn の構文は Atan2(X, Y)（第1引数が X 座標、第2引数が Y 座標）で、
    // 返る角度は atan2(Y, X)。例: Atan2(5, 3) = 0.540419...。
    arity(ctx, 2, 2);
    const x = num(ctx, ctx.get(0), "X");
    const y = num(ctx, ctx.get(1), "Y");
    if (y === null || x === null) return null;
    const u = unk(y, x);
    if (u) return u;
    return Math.atan2(y, x);
  },
  cos: (ctx) => unaryMath(ctx, Math.cos),
  cot: (ctx) => unaryMath(ctx, (n) => 1 / Math.tan(n), (n) => Math.sin(n) !== 0),
  sin: (ctx) => unaryMath(ctx, Math.sin),
  tan: (ctx) => unaryMath(ctx, Math.tan),
  degrees: (ctx) => unaryMath(ctx, (n) => (n * 180) / Math.PI),
  radians: (ctx) => unaryMath(ctx, (n) => (n * Math.PI) / 180),
  pi: (ctx) => { arity(ctx, 0, 0); return Math.PI; },
  exp: (ctx) => unaryMath(ctx, Math.exp),
  ln: (ctx) => unaryMath(ctx, Math.log, (n) => n > 0),
  log: (ctx) => {
    arity(ctx, 1, 2);
    const n = num(ctx, ctx.get(0));
    if (n === null || isUnknown(n)) return n;
    if (n <= 0) fail(ctx, "Log：引数が定義域の外です（エラー値になります）");
    const base = ctx.args.length >= 2 ? numReq(ctx, ctx.get(1), "底") : 10;
    if (isUnknown(base)) return base;
    if (base <= 0 || base === 1) fail(ctx, "Log：底が不正です（エラー値になります）");
    return Math.log(n) / Math.log(base);
  },
  power: (ctx) => {
    arity(ctx, 2, 2);
    const a = num(ctx, ctx.get(0), "底");
    const b = num(ctx, ctx.get(1), "指数");
    if (a === null || b === null) return null;
    const u = unk(a, b);
    if (u) return u;
    const r = Math.pow(a, b);
    if (Number.isNaN(r)) fail(ctx, "Power：結果が数値になりません（エラー値になります）");
    return r;
  },
  sqrt: (ctx) => unaryMath(ctx, Math.sqrt, (n) => n >= 0),
  int: (ctx) => unaryMath(ctx, Math.floor),
  trunc: (ctx) => {
    // Learn: Trunc は整数部への切り捨てのみで、小数桁は指定できない
    // （桁指定が必要なら RoundDown を使う）。余分な引数は受理しない。
    arity(ctx, 1, 1);
    const n = num(ctx, ctx.get(0));
    if (n === null || isUnknown(n)) return n;
    return truncDigits(n, 0);
  },
  // Learn の構文では Round／RoundDown／RoundUp の DecimalPlaces は必須。
  round: (ctx) => { arity(ctx, 2, 2); return roundWith(ctx, ctx.get(0), ctx.get(1), "half"); },
  rounddown: (ctx) => { arity(ctx, 2, 2); return roundWith(ctx, ctx.get(0), ctx.get(1), "down"); },
  roundup: (ctx) => { arity(ctx, 2, 2); return roundWith(ctx, ctx.get(0), ctx.get(1), "up"); },
  mod: (ctx) => {
    arity(ctx, 2, 2);
    const a = num(ctx, ctx.get(0), "被除数");
    const b = num(ctx, ctx.get(1), "除数");
    if (a === null || b === null) return null;
    const u = unk(a, b);
    if (u) return u;
    if (b === 0) fail(ctx, "0 で割ることはできません（Power Fx ではエラー値になります）");
    return ((a % b) + b) % b;
  },
  dec2hex: (ctx) => {
    arity(ctx, 1, 2);
    const n = num(ctx, ctx.get(0));
    if (n === null || isUnknown(n)) return n;
    const places = ctx.args.length >= 2 ? Math.trunc(numReq(ctx, ctx.get(1), "桁数")) : 0;
    const t = Math.trunc(n);
    let hex;
    if (t < 0) {
      // Excel互換の10桁（40ビット）2の補数表記
      hex = (Math.pow(2, 40) + t).toString(16).toUpperCase();
    } else hex = t.toString(16).toUpperCase();
    if (places > 0) {
      if (hex.length > places) fail(ctx, "Dec2Hex：指定した桁数に収まりません");
      hex = hex.padStart(places, "0");
    }
    return hex;
  },
  hex2dec: (ctx) => {
    arity(ctx, 1, 1);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const s = t.trim();
    if (!/^[0-9a-fA-F]{1,10}$/.test(s)) fail(ctx, "Hex2Dec：16進数として解釈できません");
    let v = parseInt(s, 16);
    if (s.length === 10 && v >= Math.pow(2, 39)) v -= Math.pow(2, 40);
    return v;
  },
  rand: (ctx) => { arity(ctx, 0, 0); return unknown("Randの結果（実行時に決まる乱数）による"); },
  randbetween: (ctx) => {
    arity(ctx, 2, 2);
    numReq(ctx, ctx.get(0), "下限");
    numReq(ctx, ctx.get(1), "上限");
    return unknown("RandBetweenの結果（実行時に決まる乱数）による");
  },
  average: (ctx) => aggregate(ctx, "average"),
  max: (ctx) => aggregate(ctx, "max"),
  min: (ctx) => aggregate(ctx, "min"),
  stdevp: (ctx) => aggregate(ctx, "stdevp"),
  varp: (ctx) => aggregate(ctx, "varp"),

  // ================= テキスト =================
  char: (ctx) => {
    arity(ctx, 1, 1);
    const n = num(ctx, ctx.get(0));
    if (n === null || isUnknown(n)) return n;
    const c = Math.trunc(n);
    if (c < 1 || c > 255) fail(ctx, "Char：文字コードは1〜255で指定してください（それ以外は UniChar を使います）");
    return String.fromCharCode(c);
  },
  unichar: (ctx) => {
    arity(ctx, 1, 1);
    const n = num(ctx, ctx.get(0));
    if (n === null || isUnknown(n)) return n;
    const c = Math.trunc(n);
    if (c < 0 || c > 0x10ffff || (c >= 0xd800 && c <= 0xdfff))
      fail(ctx, "UniChar：文字コードが不正です（エラー値になります）");
    return String.fromCodePoint(c);
  },
  len: (ctx) => {
    arity(ctx, 1, 1);
    const v = ctx.get(0);
    if (v === null) return null;
    if (isUnknown(v)) return v;
    if (typeof v === "string") return v.length;
    if (Array.isArray(v)) return v.length;
    fail(ctx, "Len：テキストまたはテーブルを指定してください");
  },
  left: (ctx) => {
    arity(ctx, 2, 2);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const n = numReq(ctx, ctx.get(1), "文字数");
    if (isUnknown(n)) return n;
    if (n < 0) fail(ctx, "Left：文字数は0以上で指定してください");
    return t.slice(0, Math.trunc(n));
  },
  right: (ctx) => {
    arity(ctx, 2, 2);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const n = numReq(ctx, ctx.get(1), "文字数");
    if (isUnknown(n)) return n;
    if (n < 0) fail(ctx, "Right：文字数は0以上で指定してください");
    const c = Math.trunc(n);
    return c === 0 ? "" : t.slice(-c);
  },
  mid: (ctx) => {
    arity(ctx, 2, 3);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const start = numReq(ctx, ctx.get(1), "開始位置");
    if (isUnknown(start)) return start;
    if (start < 1) fail(ctx, "Mid：開始位置は1以上で指定してください");
    const from = Math.trunc(start) - 1;
    if (ctx.args.length >= 3) {
      const n = numReq(ctx, ctx.get(2), "文字数");
      if (isUnknown(n)) return n;
      if (n < 0) fail(ctx, "Mid：文字数は0以上で指定してください");
      return t.slice(from, from + Math.trunc(n));
    }
    return t.slice(from);
  },
  find: (ctx) => {
    arity(ctx, 2, 3);
    const needle = text(ctx, ctx.get(0), "探す文字列");
    const hay = text(ctx, ctx.get(1), "対象文字列");
    if (needle === null || hay === null) return null;
    const u = unk(needle, hay);
    if (u) return u;
    const start = ctx.args.length >= 3 ? Math.trunc(numReq(ctx, ctx.get(2), "開始位置")) : 1;
    if (start < 1) fail(ctx, "Find：開始位置は1以上で指定してください");
    if (needle === "") return start;
    const idx = hay.toLowerCase().indexOf(needle.toLowerCase(), start - 1);
    return idx < 0 ? null : idx + 1;
  },
  replace: (ctx) => {
    arity(ctx, 4, 4);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const start = numReq(ctx, ctx.get(1), "開始位置");
    const count = numReq(ctx, ctx.get(2), "文字数");
    const rep = text(ctx, ctx.get(3), "置換文字列");
    const u = unk(start, count, rep);
    if (u) return u;
    if (start < 1) fail(ctx, "Replace：開始位置は1以上で指定してください");
    if (count < 0) fail(ctx, "Replace：文字数は0以上で指定してください");
    const from = Math.min(Math.trunc(start) - 1, t.length);
    return t.slice(0, from) + (rep ?? "") + t.slice(from + Math.trunc(count));
  },
  substitute: (ctx) => {
    arity(ctx, 3, 4);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const oldS = text(ctx, ctx.get(1), "置換前の文字列");
    const newS = text(ctx, ctx.get(2), "置換後の文字列");
    const u = unk(oldS, newS);
    if (u) return u;
    if (oldS === "" || oldS === null) return t;
    const instance = ctx.args.length >= 4 ? Math.trunc(numReq(ctx, ctx.get(3), "出現番号")) : 0;
    const lower = t.toLowerCase();
    const target = oldS.toLowerCase();
    let out = "";
    let pos = 0;
    let seen = 0;
    while (true) {
      const idx = lower.indexOf(target, pos);
      if (idx < 0) break;
      seen++;
      if (instance === 0 || seen === instance) {
        out += t.slice(pos, idx) + (newS ?? "");
        pos = idx + oldS.length;
        if (instance !== 0) break;
      } else {
        out += t.slice(pos, idx + oldS.length);
        pos = idx + oldS.length;
      }
    }
    return out + t.slice(pos);
  },
  split: (ctx) => {
    arity(ctx, 2, 2);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const sep = text(ctx, ctx.get(1), "区切り文字列");
    if (isUnknown(sep)) return sep;
    if (sep === null || sep === "") return [...t].map((ch) => ({ Value: ch }));
    return t.split(sep).map((part) => ({ Value: part }));
  },
  lower: (ctx) => textCase(ctx, (s) => s.toLowerCase()),
  upper: (ctx) => textCase(ctx, (s) => s.toUpperCase()),
  proper: (ctx) =>
    textCase(ctx, (s) => s.replace(/[\p{L}\p{N}]+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())),
  trim: (ctx) => {
    arity(ctx, 1, 1);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    return t.replace(/\s+/g, " ").trim();
  },
  trimends: (ctx) => {
    arity(ctx, 1, 1);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    return t.trim();
  },
  startswith: (ctx) => {
    arity(ctx, 2, 2);
    const t = text(ctx, ctx.get(0));
    const p = text(ctx, ctx.get(1), "先頭文字列");
    if (t === null || p === null) return null;
    const u = unk(t, p);
    if (u) return u;
    return t.toLowerCase().startsWith(p.toLowerCase());
  },
  endswith: (ctx) => {
    arity(ctx, 2, 2);
    const t = text(ctx, ctx.get(0));
    const p = text(ctx, ctx.get(1), "末尾文字列");
    if (t === null || p === null) return null;
    const u = unk(t, p);
    if (u) return u;
    return t.toLowerCase().endsWith(p.toLowerCase());
  },
  concatenate: (ctx) => {
    arity(ctx, 1, Infinity);
    let out = "";
    for (let i = 0; i < ctx.args.length; i++) {
      const v = ctx.get(i);
      if (isUnknown(v)) return v;
      if (v === null) continue;
      out += ctx.textOf(v);
    }
    return out;
  },
  encodeurl: (ctx) => {
    arity(ctx, 1, 1);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    return encodeURIComponent(t);
  },
  encodehtml: (ctx) => {
    arity(ctx, 1, 1);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    return t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },
  plaintext: (ctx) => {
    arity(ctx, 1, 1);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    return t
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  },
  hashtags: (ctx) => {
    arity(ctx, 1, 1);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const found = t.match(/#[\p{L}\p{N}_]+/gu) || [];
    return found.map((v) => ({ Value: v }));
  },
  ismatch: (ctx) => {
    arity(ctx, 2, 3);
    const t = text(ctx, ctx.get(0));
    if (t === null) return null;
    if (isUnknown(t)) return t;
    const pat = text(ctx, ctx.get(1), "パターン");
    if (pat === null || isUnknown(pat)) return pat;
    const opt = ctx.args.length >= 3 ? text(ctx, ctx.get(2), "オプション") : null;
    return fxRegExp(ctx, pat, opt).test(t);
  },
  match: (ctx) => {
    arity(ctx, 2, 3);
    const t = text(ctx, ctx.get(0));
    if (t === null) return null;
    if (isUnknown(t)) return t;
    const pat = text(ctx, ctx.get(1), "パターン");
    if (pat === null || isUnknown(pat)) return pat;
    const opt = ctx.args.length >= 3 ? text(ctx, ctx.get(2), "オプション") : null;
    return matchRecord(t.match(fxRegExp(ctx, pat, opt)));
  },
  matchall: (ctx) => {
    arity(ctx, 2, 3);
    const t = text(ctx, ctx.get(0));
    if (t === null) return null;
    if (isUnknown(t)) return t;
    const pat = text(ctx, ctx.get(1), "パターン");
    if (pat === null || isUnknown(pat)) return pat;
    const opt = ctx.args.length >= 3 ? text(ctx, ctx.get(2), "オプション") : null;
    const re = fxRegExp(ctx, pat, opt);
    const global = new RegExp(re.source, re.flags + "g");
    return [...t.matchAll(global)].map(matchRecord);
  },
  isnumeric: (ctx) => {
    arity(ctx, 1, 1);
    const v = ctx.get(0);
    if (v === null || v === undefined) return false;
    if (isUnknown(v)) return v;
    if (typeof v === "number") return true;
    if (typeof v === "string") {
      const t = v.trim().replace(/%$/, "");
      return t !== "" && !Number.isNaN(Number(t));
    }
    return false;
  },
  concat: (ctx) => {
    arity(ctx, 2, 2);
    const table = needTable(ctx, ctx.get(0));
    const values = ctx.rowEval(table, ctx.args[1]);
    const u = unk(...values);
    if (u) return u;
    return values.map((v) => (v === null || v === undefined ? "" : ctx.textOf(v))).join("");
  },
  // ================= 色 =================
  colorvalue: (ctx) => {
    arity(ctx, 1, 1);
    return parseColor(ctx, ctx.get(0));
  },
  rgba: (ctx) => {
    arity(ctx, 4, 4);
    const r = numReq(ctx, ctx.get(0), "赤");
    const g = numReq(ctx, ctx.get(1), "緑");
    const b = numReq(ctx, ctx.get(2), "青");
    const a = numReq(ctx, ctx.get(3), "不透明度");
    const u = unk(r, g, b, a);
    if (u) return u;
    for (const [v, label] of [[r, "赤"], [g, "緑"], [b, "青"]])
      if (v < 0 || v > 255) fail(ctx, `RGBA：${label}は0〜255で指定してください`);
    if (a < 0 || a > 1) fail(ctx, "RGBA：不透明度は0〜1で指定してください");
    return channelsColor({ r, g, b, a: Math.round(a * 255) });
  },
  colorfade: (ctx) => {
    arity(ctx, 2, 2);
    const hex = parseColor(ctx, ctx.get(0));
    if (hex === null || isUnknown(hex)) return hex;
    const amount = numReq(ctx, ctx.get(1), "変化量");
    if (isUnknown(amount)) return amount;
    if (amount < -1 || amount > 1) fail(ctx, "ColorFade：変化量は-1〜1で指定してください");
    const ch = colorChannels(hex);
    const f = (c) => (amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
    return channelsColor({ r: f(ch.r), g: f(ch.g), b: f(ch.b), a: ch.a });
  },
  "calendar.monthslong": (ctx) => {
    arity(ctx, 0, 0);
    return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((v) => ({ Value: v }));
  },
  "calendar.monthsshort": (ctx) => {
    arity(ctx, 0, 0);
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((v) => ({ Value: v }));
  },
  "calendar.weekdayslong": (ctx) => {
    arity(ctx, 0, 0);
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((v) => ({ Value: v }));
  },
  "calendar.weekdaysshort": (ctx) => {
    arity(ctx, 0, 0);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((v) => ({ Value: v }));
  },
  "clock.ampm": (ctx) => { arity(ctx, 0, 0); return [{ Value: "AM" }, { Value: "PM" }]; },
  "clock.ampmshort": (ctx) => { arity(ctx, 0, 0); return [{ Value: "A" }, { Value: "P" }]; },

  // ================= テーブル操作 =================
  first: (ctx) => {
    arity(ctx, 1, 1);
    const t = needTable(ctx, ctx.get(0));
    return t.length ? t[0] : null;
  },
  last: (ctx) => {
    arity(ctx, 1, 1);
    const t = needTable(ctx, ctx.get(0));
    return t.length ? t[t.length - 1] : null;
  },
  firstn: (ctx) => {
    arity(ctx, 1, 2);
    const t = needTable(ctx, ctx.get(0));
    const raw = ctx.args.length >= 2 ? numReq(ctx, ctx.get(1), "件数") : 1;
    if (isUnknown(raw)) return raw;
    const n = Math.trunc(raw);
    if (n < 0) fail(ctx, "FirstN：件数は0以上で指定してください");
    return t.slice(0, n);
  },
  lastn: (ctx) => {
    arity(ctx, 1, 2);
    const t = needTable(ctx, ctx.get(0));
    const raw = ctx.args.length >= 2 ? numReq(ctx, ctx.get(1), "件数") : 1;
    if (isUnknown(raw)) return raw;
    const n = Math.trunc(raw);
    if (n < 0) fail(ctx, "LastN：件数は0以上で指定してください");
    return n === 0 ? [] : t.slice(-n);
  },
  index: (ctx) => {
    // Learn（function-first-last）: Index は範囲外（1未満・行数超過・
    // 空テーブル）では Blank でなくエラー値を返す。
    arity(ctx, 2, 2);
    const t = needTable(ctx, ctx.get(0));
    const n = numReq(ctx, ctx.get(1), "行番号");
    if (isUnknown(n)) return n;
    const i = Math.trunc(n);
    if (i < 1 || i > t.length)
      fail(ctx, "Index：指定した位置のレコードがありません（エラー値になります）");
    return t[i - 1];
  },
  count: (ctx) => {
    arity(ctx, 1, 1);
    const t = needTable(ctx, ctx.get(0));
    // Learn（function-table-counts）: Count は単一列テーブルの関数。
    // 複数列のテーブルに 0 を返す（値を捏造する）のでなく名前を挙げて止める。
    for (const row of t)
      if (row && typeof row === "object" && !Array.isArray(row) && Object.keys(row).length > 1)
        fail(ctx, "Count：単一列テーブルを指定してください");
    let n = 0;
    for (const row of t) {
      const v = row && typeof row === "object" && !Array.isArray(row)
        ? (Object.keys(row).length === 1 ? row[Object.keys(row)[0]] : null)
        : row;
      if (typeof v === "number") n++;
    }
    return n;
  },
  counta: (ctx) => {
    arity(ctx, 1, 1);
    const t = needTable(ctx, ctx.get(0));
    // Learn（function-table-counts）: CountA は空文字列（""）も数える
    // （Blank でない値の個数）。PFX-D3（高度A2監査）で是正。
    let n = 0;
    for (const row of t) {
      const v = row && typeof row === "object" && !Array.isArray(row)
        ? (Object.keys(row).length === 1 ? row[Object.keys(row)[0]] : row)
        : row;
      if (v !== null && v !== undefined) n++;
    }
    return n;
  },
  countif: (ctx) => {
    arity(ctx, 2, 2);
    const t = needTable(ctx, ctx.get(0));
    const results = ctx.rowEval(t, ctx.args[1]);
    if (results.some(isUnknown)) fail(ctx, "未確定のCountIf条件は未対応です");
    return results.filter((v) => ctx.fxTruth(v, ctx.node.line)).length;
  },
  isempty: (ctx) => {
    arity(ctx, 1, 1);
    const v = ctx.get(0);
    if (v === null) return true;
    if (isUnknown(v)) return v;
    if (Array.isArray(v)) return v.length === 0;
    fail(ctx, "IsEmpty：テーブルを指定してください");
  },
  addcolumns: (ctx) => {
    arity(ctx, 3, Infinity);
    if ((ctx.args.length - 1) % 2 !== 0)
      fail(ctx, "AddColumns の引数の数が正しくありません（列名と式の組で指定してください）");
    const t = needTable(ctx, ctx.get(0));
    let out = t.map((row) => (row && typeof row === "object" && !Array.isArray(row) ? { ...row } : { Value: row }));
    for (let i = 1; i < ctx.args.length; i += 2) {
      const name = colName(ctx, i);
      const values = ctx.rowEval(t, ctx.args[i + 1]);
      out = out.map((row, j) => ({ ...row, [name]: values[j] }));
    }
    return out;
  },
  dropcolumns: (ctx) => {
    arity(ctx, 2, Infinity);
    const t = needTable(ctx, ctx.get(0));
    const names = [];
    for (let i = 1; i < ctx.args.length; i++) names.push(colName(ctx, i).toLowerCase());
    return t.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      return Object.fromEntries(Object.entries(row).filter(([k]) => !names.includes(k.toLowerCase())));
    });
  },
  showcolumns: (ctx) => {
    arity(ctx, 2, Infinity);
    const t = needTable(ctx, ctx.get(0));
    const names = [];
    for (let i = 1; i < ctx.args.length; i++) names.push(colName(ctx, i));
    return t.map((row) => {
      const src = row && typeof row === "object" && !Array.isArray(row) ? row : { Value: row };
      const out = {};
      for (const name of names) {
        const key = Object.keys(src).find((k) => k.toLowerCase() === name.toLowerCase());
        out[name] = key === undefined ? null : src[key];
      }
      return out;
    });
  },
  renamecolumns: (ctx) => {
    arity(ctx, 3, Infinity);
    if ((ctx.args.length - 1) % 2 !== 0)
      fail(ctx, "RenameColumns の引数の数が正しくありません（旧列名と新列名の組で指定してください）");
    const t = needTable(ctx, ctx.get(0));
    const pairs = [];
    for (let i = 1; i < ctx.args.length; i += 2) pairs.push([colName(ctx, i), colName(ctx, i + 1)]);
    return t.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        const pair = pairs.find(([old]) => old.toLowerCase() === k.toLowerCase());
        out[pair ? pair[1] : k] = v;
      }
      return out;
    });
  },
  groupby: (ctx) => {
    arity(ctx, 3, Infinity);
    const t = needTable(ctx, ctx.get(0));
    const groupName = colName(ctx, ctx.args.length - 1);
    const cols = [];
    for (let i = 1; i < ctx.args.length - 1; i++) cols.push(colName(ctx, i));
    const groups = new Map();
    for (const row of t) {
      const src = row && typeof row === "object" && !Array.isArray(row) ? row : { Value: row };
      const keyVals = cols.map((c) => {
        const k = Object.keys(src).find((x) => x.toLowerCase() === c.toLowerCase());
        return k === undefined ? null : src[k];
      });
      const key = JSON.stringify(keyVals);
      if (!groups.has(key)) {
        const head = {};
        cols.forEach((c, j) => { head[c] = keyVals[j]; });
        groups.set(key, { head, rows: [] });
      }
      const rest = Object.fromEntries(
        Object.entries(src).filter(([k]) => !cols.some((c) => c.toLowerCase() === k.toLowerCase())),
      );
      groups.get(key).rows.push(rest);
    }
    return [...groups.values()].map((g) => ({ ...g.head, [groupName]: g.rows }));
  },
  ungroup: (ctx) => {
    arity(ctx, 2, 2);
    const t = needTable(ctx, ctx.get(0));
    const name = colName(ctx, 1);
    const out = [];
    for (const row of t) {
      const src = row && typeof row === "object" && !Array.isArray(row) ? row : { Value: row };
      const key = Object.keys(src).find((k) => k.toLowerCase() === name.toLowerCase());
      const sub = key === undefined ? null : src[key];
      if (!Array.isArray(sub)) fail(ctx, "Ungroup：指定した列にグループ化されたテーブルがありません");
      const base = Object.fromEntries(Object.entries(src).filter(([k]) => k !== key));
      if (!sub.length) continue;
      for (const s of sub) out.push({ ...base, ...(s && typeof s === "object" ? s : { Value: s }) });
    }
    return out;
  },
  sort: (ctx) => {
    arity(ctx, 2, 3);
    const t = needTable(ctx, ctx.get(0));
    const values = ctx.rowEval(t, ctx.args[1]);
    if (values.some(isUnknown)) fail(ctx, "未確定のSort式は未対応です");
    let descending = false;
    if (ctx.args.length >= 3) {
      const o = ctx.get(2);
      if (isUnknown(o)) return o;
      const os = String(o).toLowerCase();
      if (os === "descending" || os === "desc") descending = true;
      else if (os !== "ascending" && os !== "asc")
        fail(ctx, `Sort の並び順が正しくありません：${ctx.textOf(o)}（"Ascending"／"Descending" で指定してください）`);
    }
    const cmp = (a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      if (typeof a === "number" && typeof b === "number") return a - b;
      const sa = ctx.textOf(a).toLowerCase();
      const sb = ctx.textOf(b).toLowerCase();
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    };
    return t
      .map((row, i) => ({ row, v: values[i], i }))
      .sort((x, y) => (descending ? -cmp(x.v, y.v) : cmp(x.v, y.v)) || x.i - y.i)
      .map((x) => x.row);
  },
  sortbycolumns: (ctx) => {
    arity(ctx, 2, Infinity);
    const t = needTable(ctx, ctx.get(0));
    const specs = [];
    let i = 1;
    while (i < ctx.args.length) {
      const name = colName(ctx, i);
      let descending = false;
      if (i + 1 < ctx.args.length) {
        // 次の引数が並び順（文字列）かどうかをASTで判定する: 文字列
        // リテラルなら並び順、識別子なら次の列名。
        const next = ctx.args[i + 1];
        if (next?.k === "literal" && typeof next.value === "string" && /^(ascending|descending|asc|desc)$/i.test(next.value)) {
          descending = /desc/i.test(next.value);
          i++;
        }
      }
      specs.push({ name, descending });
      i++;
    }
    const valOf = (row, name) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      const k = Object.keys(row).find((x) => x.toLowerCase() === name.toLowerCase());
      return k === undefined ? null : row[k];
    };
    const cmpV = (a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      if (typeof a === "number" && typeof b === "number") return a - b;
      const sa = ctx.textOf(a).toLowerCase();
      const sb = ctx.textOf(b).toLowerCase();
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    };
    return t
      .map((row, idx) => ({ row, idx }))
      .sort((x, y) => {
        for (const spec of specs) {
          const c = cmpV(valOf(x.row, spec.name), valOf(y.row, spec.name));
          if (c !== 0) return spec.descending ? -c : c;
        }
        return x.idx - y.idx;
      })
      .map((x) => x.row);
  },
  search: (ctx) => {
    arity(ctx, 3, Infinity);
    const t = needTable(ctx, ctx.get(0));
    const needle = text(ctx, ctx.get(1), "検索文字列");
    if (isUnknown(needle)) return needle;
    const cols = [];
    for (let i = 2; i < ctx.args.length; i++) cols.push(colName(ctx, i));
    if (needle === null || needle === "") return [...t];
    const n = needle.toLowerCase();
    return t.filter((row) =>
      cols.some((c) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return false;
        const k = Object.keys(row).find((x) => x.toLowerCase() === c.toLowerCase());
        if (k === undefined || row[k] === null) return false;
        return ctx.textOf(row[k]).toLowerCase().includes(n);
      }),
    );
  },
  distinct: (ctx) => {
    arity(ctx, 2, 2);
    const t = needTable(ctx, ctx.get(0));
    const values = ctx.rowEval(t, ctx.args[1]);
    const seen = new Set();
    const out = [];
    for (const v of values) {
      const key = JSON.stringify(v);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v !== null && typeof v === "object" && !Array.isArray(v) ? v : { Value: v });
    }
    return out;
  },
  shuffle: (ctx) => {
    arity(ctx, 1, 1);
    needTable(ctx, ctx.get(0));
    return unknown("Shuffleの結果（実行時に決まる並び）による");
  },
  columnnames: (ctx) => {
    arity(ctx, 1, 1);
    const v = ctx.get(0);
    if (isUnknown(v)) return v;
    let keys = [];
    if (Array.isArray(v)) {
      for (const row of v)
        if (row && typeof row === "object" && !Array.isArray(row))
          for (const k of Object.keys(row)) if (!keys.includes(k)) keys.push(k);
    } else if (v && typeof v === "object") keys = Object.keys(v);
    else fail(ctx, "ColumnNames：テーブルまたはレコードを指定してください");
    return keys.map((k) => ({ Value: k }));
  },
  // ================= コレクション／データソースの変更 =================
  remove: (ctx) => {
    arity(ctx, 2, Infinity);
    recordScopeGuard(ctx);
    const name = ctx.key(0);
    const target = resolveTable(ctx, name);
    let rows = target.rows;
    const isAll =
      ctx.args.length === 2 && ctx.args[1]?.k === "var" && ctx.args[1].name.toLowerCase() === "all";
    if (isAll) rows = [];
    else {
      const targets = [];
      for (let i = 1; i < ctx.args.length; i++) targets.push(ctx.get(i));
      rows = rows.filter(
        (row) =>
          !targets.some(
            (rec) =>
              rec &&
              typeof rec === "object" &&
              !Array.isArray(rec) &&
              row &&
              typeof row === "object" &&
              Object.keys(rec).filter((k) => k !== "__defaultSource").every((k) => deepEq(row[k], rec[k])),
          ),
      );
    }
    target.write(rows);
    ctx.recalc(ctx.s, ctx.api);
    ctx.api.note(ctx.s, ctx.node, `${target.key} のレコード数は ${rows.length} です`);
    return rows;
  },
  removeif: (ctx) => {
    arity(ctx, 2, 2);
    recordScopeGuard(ctx);
    const name = ctx.key(0);
    const target = resolveTable(ctx, name);
    const results = ctx.rowEval(target.rows, ctx.args[1]);
    if (results.some(isUnknown)) fail(ctx, "未確定のRemoveIf条件は未対応です");
    const rows = target.rows.filter((_, i) => !ctx.fxTruth(results[i], ctx.node.line));
    target.write(rows);
    ctx.recalc(ctx.s, ctx.api);
    ctx.api.note(ctx.s, ctx.node, `${target.key} のレコード数は ${rows.length} です`);
    return rows;
  },
  update: (ctx) => {
    arity(ctx, 3, 3);
    recordScopeGuard(ctx);
    const name = ctx.key(0);
    const target = resolveTable(ctx, name);
    const base = ctx.get(1);
    const changes = ctx.get(2);
    if (!changes || typeof changes !== "object" || Array.isArray(changes))
      fail(ctx, "Update の変更レコードはレコードで指定してください");
    if (base?.__defaultSource !== undefined)
      fail(ctx, "Update は既存レコード専用です（新規レコードの追加は Patch を使います）");
    let index = target.rows.indexOf(base);
    if (index < 0 && base && typeof base === "object") {
      const keys = Object.keys(base).filter((k) => k !== "__defaultSource");
      if (keys.length)
        index = target.rows.findIndex(
          (row) => row && typeof row === "object" && keys.every((k) => deepEq(row[k], base[k])),
        );
    }
    if (index < 0) fail(ctx, "更新するレコードがデータソースにありません");
    const result = Object.assign(target.rows[index], changes);
    ctx.recalc(ctx.s, ctx.api);
    return result;
  },
  updateif: (ctx) => {
    arity(ctx, 3, 3);
    recordScopeGuard(ctx);
    const name = ctx.key(0);
    const target = resolveTable(ctx, name);
    const changes = ctx.get(2);
    if (!changes || typeof changes !== "object" || Array.isArray(changes))
      fail(ctx, "UpdateIf の変更レコードはレコードで指定してください");
    const results = ctx.rowEval(target.rows, ctx.args[1]);
    if (results.some(isUnknown)) fail(ctx, "未確定のUpdateIf条件は未対応です");
    target.rows.forEach((row, i) => {
      if (ctx.fxTruth(results[i], ctx.node.line) && row && typeof row === "object")
        Object.assign(row, changes);
    });
    ctx.recalc(ctx.s, ctx.api);
    return target.rows;
  },
  errors: (ctx) => {
    arity(ctx, 1, 2);
    const name = ctx.key(0);
    if (
      ctx.ciKey(ctx.s.model.collections, name) === undefined &&
      ctx.ciKey(ctx.s.model.dataSources, name) === undefined
    )
      fail(ctx, "Errors：モデルにコレクション／データソースがありません：" + name);
    if (ctx.args.length >= 2) ctx.get(1);
    // このモデルでは Patch 等の失敗はその場で停止として現れ、データ
    // ソース側にエラー記録は残らない。したがって記録は常に空である。
    return [];
  },

  // ================= 日時 =================
  date: (ctx) => {
    arity(ctx, 3, 3);
    const y = numReq(ctx, ctx.get(0), "年");
    const mo = numReq(ctx, ctx.get(1), "月");
    const d = numReq(ctx, ctx.get(2), "日");
    const u = unk(y, mo, d);
    if (u) return u;
    return fmtDate(Date.UTC(Math.trunc(y), Math.trunc(mo) - 1, Math.trunc(d)));
  },
  datetime: (ctx) => {
    arity(ctx, 6, 7);
    const parts = [];
    for (let i = 0; i < 6; i++) parts.push(numReq(ctx, ctx.get(i), "日時要素"));
    const u = unk(...parts);
    if (u) return u;
    const ms = ctx.args.length >= 7 ? numReq(ctx, ctx.get(6), "ミリ秒") : 0;
    return fmtDateTime(
      Date.UTC(Math.trunc(parts[0]), Math.trunc(parts[1]) - 1, Math.trunc(parts[2]), Math.trunc(parts[3]), Math.trunc(parts[4]), Math.trunc(parts[5])) + Math.trunc(ms),
    );
  },
  time: (ctx) => {
    arity(ctx, 3, 3);
    const h = numReq(ctx, ctx.get(0), "時");
    const mi = numReq(ctx, ctx.get(1), "分");
    const se = numReq(ctx, ctx.get(2), "秒");
    const u = unk(h, mi, se);
    if (u) return u;
    const total = ((Math.trunc(h) * 3600 + Math.trunc(mi) * 60 + Math.trunc(se)) % 86400 + 86400) % 86400;
    return fmtTime(Date.UTC(1899, 11, 30) + total * 1000);
  },
  datevalue: (ctx) => {
    arity(ctx, 1, 2);
    checkLang(ctx, 1);
    const p = parseDateText(ctx, ctx.get(0), "引数");
    if (p === null || isUnknown(p)) return p;
    return fmtDate(p.ms);
  },
  timevalue: (ctx) => {
    arity(ctx, 1, 2);
    checkLang(ctx, 1);
    const p = parseDateText(ctx, ctx.get(0), "引数");
    if (p === null || isUnknown(p)) return p;
    return fmtTime(p.ms);
  },
  datetimevalue: (ctx) => {
    arity(ctx, 1, 2);
    checkLang(ctx, 1);
    const p = parseDateText(ctx, ctx.get(0), "引数");
    if (p === null || isUnknown(p)) return p;
    return fmtDateTime(p.ms);
  },
  day: (ctx) => datePart(ctx, (d) => d.getUTCDate()),
  month: (ctx) => datePart(ctx, (d) => d.getUTCMonth() + 1),
  year: (ctx) => datePart(ctx, (d) => d.getUTCFullYear()),
  hour: (ctx) => datePart(ctx, (d) => d.getUTCHours()),
  minute: (ctx) => datePart(ctx, (d) => d.getUTCMinutes()),
  second: (ctx) => datePart(ctx, (d) => d.getUTCSeconds()),
  dateadd: (ctx) => {
    arity(ctx, 2, 3);
    const p = reqDT(ctx, ctx.get(0));
    if (p === null || isUnknown(p)) return p;
    const n = numReq(ctx, ctx.get(1), "増分");
    if (isUnknown(n)) return n;
    const unit = ctx.args.length >= 3 ? String(text(ctx, ctx.get(2), "単位") || "Days") : "Days";
    const u = unit.toLowerCase();
    const d = new Date(p.ms);
    let ms = p.ms;
    let dateOnly = p.dateOnly;
    if (u === "milliseconds" || u === "millisecond") ms += Math.trunc(n);
    else if (u === "seconds" || u === "second") ms += Math.trunc(n) * 1000;
    else if (u === "minutes" || u === "minute") ms += Math.trunc(n) * 60000;
    else if (u === "hours" || u === "hour") ms += Math.trunc(n) * 3600000;
    else if (u === "days" || u === "day") ms += Math.trunc(n) * 86400000;
    else if (u === "months" || u === "month" || u === "quarters" || u === "quarter" || u === "years" || u === "year") {
      // 月・四半期・年の加算は対象月の末日へクランプする（.NET の
      // AddMonths と同じ規則。1月31日の1か月後は2月28日）。
      const addMonths = u.startsWith("month") ? Math.trunc(n) : u.startsWith("quarter") ? Math.trunc(n) * 3 : Math.trunc(n) * 12;
      const y = d.getUTCFullYear();
      const mo = d.getUTCMonth() + addMonths;
      const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      ms = Date.UTC(y, mo, Math.min(d.getUTCDate(), lastDay), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
    }
    else fail(ctx, `DateAdd の単位が正しくありません：${unit}`);
    if (!dateOnly && (u === "milliseconds" || u === "seconds" || u === "minutes" || u === "hours")) dateOnly = false;
    const timeUnit = ["milliseconds", "millisecond", "seconds", "second", "minutes", "minute", "hours", "hour"].includes(u);
    return dateOnly && !timeUnit ? fmtDate(ms) : fmtDateTime(ms);
  },
  datediff: (ctx) => {
    arity(ctx, 2, 3);
    const a = reqDT(ctx, ctx.get(0), "開始");
    const b = reqDT(ctx, ctx.get(1), "終了");
    if (a === null || b === null) return null;
    if (isUnknown(a) || isUnknown(b)) return isUnknown(a) ? a : b;
    const unit = ctx.args.length >= 3 ? String(text(ctx, ctx.get(2), "単位") || "Days") : "Days";
    const u = unit.toLowerCase();
    const diffMs = b.ms - a.ms;
    const truncDiv = (x, d) => Math.trunc(x / d);
    if (u === "milliseconds" || u === "millisecond") return Math.trunc(diffMs);
    if (u === "seconds" || u === "second") return truncDiv(diffMs, 1000);
    if (u === "minutes" || u === "minute") return truncDiv(diffMs, 60000);
    if (u === "hours" || u === "hour") return truncDiv(diffMs, 3600000);
    if (u === "days" || u === "day") {
      if (a.dateOnly && b.dateOnly) return Math.round(diffMs / 86400000);
      return truncDiv(diffMs, 86400000);
    }
    const da = new Date(a.ms);
    const db = new Date(b.ms);
    if (u === "months" || u === "month" || u === "quarters" || u === "quarter") {
      // Learn（function-dateadd-datediff）: DateDiff の単位には Quarters も
      // ある。四半期は完全な月数の差を3で割って切り捨てる。
      let months = (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth());
      const anchor = Date.UTC(da.getUTCFullYear(), da.getUTCMonth() + months, da.getUTCDate(), da.getUTCHours(), da.getUTCMinutes(), da.getUTCSeconds());
      if (months > 0 && anchor > b.ms) months--;
      if (months < 0 && anchor < b.ms) months++;
      return u.startsWith("quarter") ? Math.trunc(months / 3) : months;
    }
    if (u === "years" || u === "year") {
      let years = db.getUTCFullYear() - da.getUTCFullYear();
      const anchor = Date.UTC(da.getUTCFullYear() + years, da.getUTCMonth(), da.getUTCDate(), da.getUTCHours(), da.getUTCMinutes(), da.getUTCSeconds());
      if (years > 0 && anchor > b.ms) years--;
      if (years < 0 && anchor < b.ms) years++;
      return years;
    }
    fail(ctx, `DateDiff の単位が正しくありません：${unit}`);
  },
  edate: (ctx) => {
    arity(ctx, 2, 2);
    const p = reqDT(ctx, ctx.get(0));
    if (p === null || isUnknown(p)) return p;
    const n = numReq(ctx, ctx.get(1), "月数");
    if (isUnknown(n)) return n;
    const d = new Date(p.ms);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth() + Math.trunc(n);
    const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    const day = Math.min(d.getUTCDate(), lastDay);
    const ms = Date.UTC(y, mo, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
    return p.dateOnly ? fmtDate(ms) : fmtDateTime(ms);
  },
  eomonth: (ctx) => {
    arity(ctx, 2, 2);
    const p = reqDT(ctx, ctx.get(0));
    if (p === null || isUnknown(p)) return p;
    const n = numReq(ctx, ctx.get(1), "月数");
    if (isUnknown(n)) return n;
    const d = new Date(p.ms);
    const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Math.trunc(n) + 1, 0, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
    return p.dateOnly ? fmtDate(ms) : fmtDateTime(ms);
  },
  weekday: (ctx) => {
    arity(ctx, 1, 2);
    const p = reqDT(ctx, ctx.get(0));
    if (p === null || isUnknown(p)) return p;
    const type = ctx.args.length >= 2 ? Math.trunc(numReq(ctx, ctx.get(1), "戻り値の種類")) : 1;
    if (isUnknown(type)) return type;
    const dow = new Date(p.ms).getUTCDay(); // 0=日曜
    if (type === 1 || type === 17) return dow + 1;
    if (type === 2 || type === 11) return ((dow + 6) % 7) + 1;
    if (type === 3) return (dow + 6) % 7;
    if (type >= 12 && type <= 16) {
      const start = type - 10; // 12→火曜(2) ... 16→土曜(6)（Learn の Weekday コード表）
      return ((dow - start + 7) % 7) + 1;
    }
    fail(ctx, `Weekday の戻り値の種類が正しくありません：${type}`);
  },
  weeknum: (ctx) => {
    arity(ctx, 1, 2);
    const p = reqDT(ctx, ctx.get(0));
    if (p === null || isUnknown(p)) return p;
    let startDow = 0; // 既定は日曜始まり
    if (ctx.args.length >= 2) {
      const v = ctx.get(1);
      if (isUnknown(v)) return v;
      if (typeof v === "number") {
        // 数値形は Excel 互換の種類番号として受理する（1=日曜始まり、2=月曜始まり）
        if (v === 2) startDow = 1;
        else if (v !== 1) fail(ctx, `WeekNum の週の開始が正しくありません：${v}`);
      } else {
        const s = String(v).toLowerCase();
        if (s.includes("monday")) startDow = 1;
        else if (!s.includes("sunday")) fail(ctx, `WeekNum の週の開始が正しくありません：${ctx.textOf(v)}`);
      }
    }
    const d = new Date(p.ms);
    const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
    const dayOfYear = Math.floor((p.ms - jan1) / 86400000);
    const jan1Dow = new Date(jan1).getUTCDay();
    const offset = (jan1Dow - startDow + 7) % 7;
    return Math.floor((dayOfYear + offset) / 7) + 1;
  },
  isoweeknum: (ctx) => {
    arity(ctx, 1, 1);
    const p = reqDT(ctx, ctx.get(0));
    if (p === null || isUnknown(p)) return p;
    const d = new Date(p.ms);
    // ISO 8601: 木曜日を含む週をその年の週とする
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNr = (target.getUTCDay() + 6) % 7; // 月曜=0
    target.setUTCDate(target.getUTCDate() - dayNr + 3); // その週の木曜日
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const fdNr = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - fdNr + 3);
    return Math.round((target - firstThursday) / (7 * 86400000)) + 1;
  },
  now: (ctx) => { arity(ctx, 0, 0); return unknown("Nowの値（実行時に決まる現在日時）による"); },
  today: (ctx) => { arity(ctx, 0, 0); return unknown("Todayの値（実行時に決まる今日の日付）による"); },
  utcnow: (ctx) => { arity(ctx, 0, 0); return unknown("UTCNowの値（実行時に決まる現在日時）による"); },
  utctoday: (ctx) => { arity(ctx, 0, 0); return unknown("UTCTodayの値（実行時に決まる今日の日付）による"); },
  istoday: (ctx) => {
    arity(ctx, 1, 1);
    const p = reqDT(ctx, ctx.get(0));
    if (p === null) return null;
    if (isUnknown(p)) return p;
    return unknown("IsTodayの結果（実行時に決まる今日の日付）による");
  },
  isutctoday: (ctx) => {
    arity(ctx, 1, 1);
    const p = reqDT(ctx, ctx.get(0));
    if (p === null) return null;
    if (isUnknown(p)) return p;
    return unknown("IsUTCTodayの結果（実行時に決まる今日の日付）による");
  },
  timezoneoffset: (ctx) => {
    arity(ctx, 0, 1);
    if (ctx.args.length >= 1) reqDT(ctx, ctx.get(0));
    return unknown("TimeZoneOffsetの値（デバイスのタイムゾーン）による");
  },
  // ================= 型変換 =================
  boolean: (ctx) => {
    arity(ctx, 1, 1);
    const v = ctx.get(0);
    if (v === null || v === undefined) return null;
    if (isUnknown(v)) return v;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return ctx.fxTruth(v, ctx.node.line);
    fail(ctx, "Boolean：真偽値へ変換できません（型が一致しません）");
  },
  decimal: (ctx) => convertNumber(ctx, "Decimal"),
  float: (ctx) => convertNumber(ctx, "Float"),
  guid: (ctx) => {
    arity(ctx, 0, 1);
    if (ctx.args.length === 0) return unknown("GUIDの生成結果（実行時に決まります）による");
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    const s = t.trim().replace(/^\{|\}$/g, "");
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s))
      fail(ctx, "GUID：GUIDとして解釈できません");
    return s.toLowerCase();
  },
  json: (ctx) => {
    arity(ctx, 1, 2);
    const v = ctx.get(0);
    if (isUnknown(v)) return v;
    if (ctx.args.length >= 2) {
      const f = text(ctx, ctx.get(1), "形式");
      if (f !== null && !/^(IgnoreBinaryData|IncludeBinaryData)$/i.test(f))
        fail(ctx, `JSON の形式が正しくありません：${f}`);
    }
    return JSON.stringify(toJsonValue(v));
  },
  column: (ctx) => {
    // Learn（function-columnnames-column）: Column は動的なレコードから
    // 列名で値を取り出す。存在しない列は Blank、レコードでない値はエラー。
    // このモデルでは動的な値を ParseJSON が返すレコードで表す。
    arity(ctx, 2, 2);
    const v = ctx.get(0);
    if (isUnknown(v)) return v;
    if (!v || typeof v !== "object" || Array.isArray(v))
      fail(ctx, "Column：動的なレコードを指定してください");
    const name = text(ctx, ctx.get(1), "列名");
    if (name === null || isUnknown(name)) return name;
    const key = Object.hasOwn(v, name)
      ? name
      : Object.keys(v).find((k) => k.toLowerCase() === name.toLowerCase());
    return key === undefined ? null : v[key];
  },
  parsejson: (ctx) => {
    arity(ctx, 1, 1);
    const t = text(ctx, ctx.get(0));
    if (t === null || isUnknown(t)) return t;
    let parsed;
    try {
      parsed = JSON.parse(t);
    } catch {
      fail(ctx, "ParseJSON：JSONとして解釈できません");
    }
    return fromJsonValue(parsed);
  },
  // ================= 論理・欠損・エラー =================
  coalesce: (ctx) => {
    arity(ctx, 1, Infinity);
    for (let i = 0; i < ctx.args.length; i++) {
      const v = ctx.get(i);
      if (isUnknown(v)) return v;
      if (v !== null && v !== undefined && v !== "") return v;
    }
    return null;
  },
  iferror: (ctx) => {
    arity(ctx, 2, Infinity);
    const n = ctx.args.length;
    const pairs = Math.floor(n / 2);
    for (let j = 0; j < pairs; j++) {
      try {
        const v = ctx.get(j * 2);
        const isLastValue = j === pairs - 1;
        if (isLastValue && n % 2 === 0) return v;
        if (isLastValue && n % 2 === 1) return ctx.get(n - 1);
        // エラーでなければ次の値の検査へ進む（値は捨てる）
      } catch (e) {
        if (e instanceof PracticeError) return ctx.get(j * 2 + 1);
        throw e;
      }
    }
    return null;
  },
  iserror: (ctx) => {
    arity(ctx, 1, 1);
    try {
      ctx.get(0);
      return false;
    } catch (e) {
      if (e instanceof PracticeError) return true;
      throw e;
    }
  },
  isblankorerror: (ctx) => {
    arity(ctx, 1, 1);
    try {
      const v = ctx.get(0);
      return v === null || v === "";
    } catch (e) {
      if (e instanceof PracticeError) return true;
      throw e;
    }
  },
  error: (ctx) => {
    arity(ctx, 1, 1);
    const v = ctx.get(0);
    if (typeof v === "string") fail(ctx, v);
    if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object")
      fail(ctx, typeof v[0].Message === "string" ? v[0].Message : "エラーが発生しました");
    if (v && typeof v === "object")
      fail(ctx, typeof v.Message === "string" ? v.Message : "エラーが発生しました");
    fail(ctx, "エラーが発生しました");
  },
  assert: (ctx) => {
    arity(ctx, 1, 2);
    const v = ctx.get(0);
    if (isUnknown(v)) return v;
    if (!ctx.fxTruth(v, ctx.node.line)) {
      const msg = ctx.args.length >= 2 ? text(ctx, ctx.get(1), "メッセージ") : null;
      fail(ctx, typeof msg === "string" && msg ? msg : "Assert が失敗しました（条件が成り立ちません）");
    }
    return true;
  },
  // ================= スコープ・その他 =================
  with: (ctx) => {
    arity(ctx, 2, 2);
    const record = ctx.get(0);
    if (!record || typeof record !== "object" || Array.isArray(record))
      fail(ctx, "With の第1引数はレコードで指定してください");
    const s = ctx.s;
    const previous = s.vars;
    // s.record は行スコープの印であり、With がそれを立てると内側の動作
    // 数式（Set 等）が基礎の副作用ガードで誤って止まる。With の項目は
    // vars の重ね合わせと ThisRecord 変数で公開し、s.record は元の
    // スコープのままにする（With は動作数式を包めるのが実 Power Fx）。
    s.vars = { ...previous, ...record, ThisRecord: record };
    try {
      ctx.api.check();
      return ctx.api.read(ctx.args[1], s);
    } finally {
      s.vars = previous;
    }
  },
  concurrent: (ctx) => {
    arity(ctx, 1, Infinity);
    let last = null;
    for (let i = 0; i < ctx.args.length; i++) last = ctx.get(i);
    return last;
  },
  language: (ctx) => {
    arity(ctx, 0, 0);
    return ctx.s.model.language;
  },
  trace: (ctx) => {
    arity(ctx, 1, 3);
    const message = ctx.get(0);
    if (ctx.args.length >= 2) ctx.get(1);
    if (ctx.args.length >= 3) ctx.get(2);
    ctx.s.outputs.push({ channel: "Trace", text: ctx.textOf(message), line: ctx.node.line });
    return null;
  },
  confirm: (ctx) => {
    arity(ctx, 1, 1);
    ctx.get(0);
    return unknown("Confirmの応答（実行時にユーザーが選びます）による");
  },
};

function datePart(ctx, f) {
  arity(ctx, 1, 1);
  const p = reqDT(ctx, ctx.get(0));
  if (p === null || isUnknown(p)) return p;
  return f(new Date(p.ms));
}
function convertNumber(ctx, label) {
  arity(ctx, 1, 1);
  const v = ctx.get(0);
  if (v === null || v === undefined) return null;
  if (isUnknown(v)) return v;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return null;
    const percent = t.endsWith("%");
    const body = percent ? t.slice(0, -1).trim() : t;
    if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(body))
      fail(ctx, `${label}：数値へ変換できません`);
    return percent ? Number(body) / 100 : Number(body);
  }
  fail(ctx, `${label}：数値へ変換できません`);
}
function toJsonValue(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.map(toJsonValue);
  if (typeof v === "object") {
    if (isUnknown(v)) return null;
    return Object.fromEntries(
      Object.entries(v).filter(([k]) => k !== "__defaultSource").map(([k, x]) => [k, toJsonValue(x)]),
    );
  }
  return v;
}
function fromJsonValue(v) {
  if (Array.isArray(v))
    return v.map((el) => {
      const converted = fromJsonValue(el);
      return converted !== null && typeof converted === "object" ? converted : { Value: converted };
    });
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromJsonValue(x)]));
  return v;
}
