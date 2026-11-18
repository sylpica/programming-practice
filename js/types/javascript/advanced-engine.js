// 契約上の配置：advanced-interface.md 第5章の予約名 advanced-engine.js に置く。
// applyAdvancedEngine フックの具体仕様は同書 R-3 で未決のため、現時点では
// index.js のディスパッチからの委譲（静的合成）で接続している
// （意味論は全て本ファイルに分離済みで、フック確定時は配線のみの移行になる）。
// 高度モード ブロックB5（JavaScript エンジン班）：高度差分の意味論。
//
// 設計の正本は docs/audit/muse/advanced-b5-design.md と棚卸し
// advanced-inventory/inventory-javascript.md（ECMA-262 2027草案）。
// このファイルは index.js の call スイッチ／メンバ呼び出しディスパッチ／
// プロパティ読み取りから委譲される実装本体であり、解釈器本体
// （js/core/script.js）には手を入れない。
//
// モデル境界（設計メモ §3 の裁定）：
// - この方言では関数値は存在しない。コールバックを必須とする呼び出しは
//   関数名を挙げて未対応として正直に停止する（callbackStop）。
// - 非同期（Promise）・GC 依存（WeakRef／FinalizationRegistry）・動的
//   コード生成（eval／Function）・Proxy のメタ操作・共有メモリ
//   （Atomics／SharedArrayBuffer）も同様に名指し停止する。
// - 時刻・乱数など実行時に決まる値は捏造せず未確定値として伝播させる。
// - 引数に未確定値を含む場合は固定値を返さず未確定値を伝播させる。
//
// 値表現（モデル値はいずれもプレーンなオブジェクトで、structuredClone
// による状態複製と整合させる。__class は contract.js の表示系が
// 「クラス」として扱う既存の慣行に合わせたタグである）：
// - Map:      { __class: "Map", entries: [[キー, 値], ...], size }
//             entries は挿入順。キーの等価性は SameValueZero。
// - Set:      { __class: "Set", values: [値, ...], size }
// - WeakMap:  { __class: "WeakMap", entries: [[キーオブジェクト, 値], ...] }
// - WeakSet:  { __class: "WeakSet", values: [キーオブジェクト, ...] }
// - Date:     { __class: "Date", time: <エポックミリ秒または NaN> }
// - RegExp:   { __class: "RegExp", source, flags, global, ignoreCase,
//               multiline, dotAll, sticky, unicode, unicodeSets,
//               hasIndices, lastIndex }
//             source／flags／各フラグ／lastIndex は実 JavaScript の
//             プロパティ名そのもので、通常のメンバ読み取りがそのまま
//             実物の値を返す。
// - Error 系: { __class: "TypeError" 等, name, message }
//             AggregateError は errors、SuppressedError は error／
//             suppressed を追加で持つ。
// - Symbol:   { __class: "Symbol", description, registered?, wellKnown? }
//             ホストの Symbol は structuredClone で複製できないため
//             タグ付きオブジェクトで表す。等価性は参照同一性で、
//             Symbol.for の登録済みシンボルはレジストリが同一参照を返す。
// - ArrayBuffer: { __class: "ArrayBuffer", store: { bytes: [0..255] },
//                  byteLength, resizable, maxByteLength, detached }
//             バイト列は store 経由で共有し、DataView／TypedArray と
//             同じ store を指すことでビュー間の書き換えを反映する。
// - TypedArray: { __class: "Uint8Array" 等, store, byteOffset, length,
//                 byteLength, BYTES_PER_ELEMENT }
//             要素は store.bytes 上のバイト列として保持し、読み書きの
//             たびにホスト DataView で型変換する（ビュー共有が正しい）。
// - DataView: { __class: "DataView", buffer, byteOffset, byteLength }
//             buffer は ArrayBuffer モデルへの参照そのもの。
//
// コンストラクタについて：この方言のパーサは new 演算子を未対応として
// 停止する（script.js）。そのため Map／Set／Date 等のコンストラクタ名を
// 関数として呼び出す形を、このモデルでの構築経路とする（実 JavaScript
// では new が必要なコンストラクタを関数として呼ぶと TypeError になる
// 点が相違する。Error／RegExp／Symbol は実 JavaScript でも関数呼び出し
// で構築できる）。Date の数値引数形は実 JavaScript では現地時間として
// 解釈されるが、このモデルではタイムゾーンを保持しないため UTC として
// 解釈する（現地時間に依存する getter／setter／文字列化は未確認として
// 停止する）。
import { unknown, isUnknown } from "../../core/contract.js";
import { PracticeError } from "../../core/script.js";

/* ================= 値の識別と基本ヘルパ ================= */

const ERROR_CLASS_NAMES = new Set([
  "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError",
  "EvalError", "URIError", "AggregateError", "SuppressedError",
]);
export const TYPED_ARRAY_NAMES = [
  "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array",
  "Uint16Array", "Int32Array", "Uint32Array", "Float32Array",
  "Float64Array", "Float16Array", "BigInt64Array", "BigUint64Array",
];
const MODEL_CLASSES = new Set([
  "Map", "Set", "WeakMap", "WeakSet", "Date", "RegExp", "Symbol",
  "ArrayBuffer", "DataView", "RawJSON",
  ...ERROR_CLASS_NAMES, ...TYPED_ARRAY_NAMES,
]);
export function classOf(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const c = v.__class;
  return typeof c === "string" && MODEL_CLASSES.has(c) ? c : null;
}
export const isModelValue = (v) => classOf(v) !== null;

// SameValueZero（Map／Set のキー等価性。NaN は NaN と等しく、+0 と -0 は同一）
export function sameValueZero(a, b) {
  return a === b || (a !== a && b !== b);
}
// SameValue（Object.is）
function sameValue(a, b) {
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  return a !== a && b !== b;
}

export function toIntegerOrInfinity(x) {
  const n = Number(x);
  if (Number.isNaN(n)) return 0;
  if (n === Infinity || n === -Infinity) return n;
  return Math.trunc(n);
}
function toLength(x) {
  const n = toIntegerOrInfinity(x);
  if (n <= 0) return 0;
  return Math.min(n, Number.MAX_SAFE_INTEGER);
}
// 相対添字（at／slice 等の負数添字）を絶対添字へ。範囲外は -1。
function relativeIndex(value, length) {
  const n = toIntegerOrInfinity(value);
  const k = n >= 0 ? n : length + n;
  return k >= 0 && k < length ? k : -1;
}

// 引数列に未確定値が含まれていればその未確定値を返す（無ければ null）。
function findAnyUnknown(values, ctx) {
  for (const v of values) {
    if (isUnknown(v)) return v;
    const inner = ctx.findUnknown(v);
    if (inner) return inner;
  }
  return null;
}
function propagateUnknown(values, ctx, source, valueType) {
  const u = findAnyUnknown(values, ctx);
  if (!u) return null;
  const out = { ...unknown(source, source + ":" + (u.id ?? "")), rootId: u.rootId || u.id };
  if (valueType) out.valueType = valueType;
  return out;
}
// ホスト関数へ委譲する際の値の前処理（レコード的配列は表示形へ寄せる、
// 既存の Number() 等と同じ流儀）。タグ付き Symbol はホストの数値変換が
// 実物と異なる（実物は TypeError）ため呼び出し側で先に弾く。
function clean(v, ctx) {
  return ctx.isRecordLikeArray(v) ? ctx.displayValue(v) : v;
}
function assertNotSymbolOrBigIntForNumber(v, ctx, fname) {
  if (classOf(v) === "Symbol")
    ctx.fail("Symbolを数値へ変換できません", "TypeError");
  if (typeof v === "bigint")
    ctx.fail("BigIntを数値へ変換できません（" + fname + "）", "TypeError");
}
// ホストが投げた例外を、カテゴリを保って学習者向けの停止へ変換する。
// モデル側が意図して投げた PracticeError はそのまま通す。
function hostFail(ctx, e, fname) {
  if (e instanceof PracticeError) throw e;
  const category = ["TypeError", "RangeError", "SyntaxError", "URIError"].includes(e?.name)
    ? e.name
    : "TypeError";
  ctx.fail(fname + "：" + (e?.message || "引数が不正です"), category);
}

/* ================= モデル値の構築 ================= */

export function makeMap(pairs = []) {
  const m = { __class: "Map", entries: [], size: 0 };
  for (const [k, v] of pairs) mapSet(m, k, v);
  return m;
}
export function mapGet(map, key) {
  for (const [k, v] of map.entries) if (sameValueZero(k, key)) return v;
  return undefined;
}
export function mapHas(map, key) {
  return map.entries.some(([k]) => sameValueZero(k, key));
}
export function mapSet(map, key, value) {
  for (const pair of map.entries)
    if (sameValueZero(pair[0], key)) {
      pair[1] = value;
      return map;
    }
  map.entries.push([key, value]);
  map.size = map.entries.length;
  return map;
}
export function mapDelete(map, key) {
  const i = map.entries.findIndex(([k]) => sameValueZero(k, key));
  if (i < 0) return false;
  map.entries.splice(i, 1);
  map.size = map.entries.length;
  return true;
}
export function makeSet(values = []) {
  const s = { __class: "Set", values: [], size: 0 };
  for (const v of values) setAdd(s, v);
  return s;
}
export function setHas(set, value) {
  return set.values.some((v) => sameValueZero(v, value));
}
export function setAdd(set, value) {
  if (!setHas(set, value)) {
    set.values.push(value);
    set.size = set.values.length;
  }
  return set;
}
export function setDelete(set, value) {
  const i = set.values.findIndex((v) => sameValueZero(v, value));
  if (i < 0) return false;
  set.values.splice(i, 1);
  set.size = set.values.length;
  return true;
}
export function makeDate(time) {
  return { __class: "Date", time };
}
export function makeError(name, message, extra = {}) {
  return { __class: name, name, message, ...extra };
}
const REGEXP_FLAG_ORDER = "dgimsuvy";
export function makeRegExp(source, flags, ctx) {
  let host;
  try {
    host = new RegExp(source, flags);
  } catch (e) {
    hostFail(ctx, e, "RegExp");
  }
  const f = host.flags;
  return {
    __class: "RegExp",
    source: host.source,
    flags: f,
    global: f.includes("g"),
    ignoreCase: f.includes("i"),
    multiline: f.includes("m"),
    dotAll: f.includes("s"),
    sticky: f.includes("y"),
    unicode: f.includes("u"),
    unicodeSets: f.includes("v"),
    hasIndices: f.includes("d"),
    lastIndex: 0,
  };
}
export function hostRegExp(model) {
  const re = new RegExp(model.source, model.flags);
  re.lastIndex = model.lastIndex || 0;
  return re;
}

// Symbol：登録レジストリはモジュール単例（実 JavaScript のグローバル
// シンボルレジストリはレルム単位であり、このアプリではページが単位）。
const symbolRegistry = new Map();
const WELL_KNOWN_SYMBOLS = {};
for (const key of [
  "iterator", "asyncIterator", "hasInstance", "isConcatSpreadable",
  "match", "matchAll", "replace", "search", "split", "species",
  "toPrimitive", "toStringTag", "unscopables", "dispose", "asyncDispose",
])
  WELL_KNOWN_SYMBOLS[key] = {
    __class: "Symbol",
    description: "Symbol." + key,
    wellKnown: key,
  };
export function makeSymbol(description) {
  return { __class: "Symbol", description };
}
export function symbolFor(key) {
  if (!symbolRegistry.has(key))
    symbolRegistry.set(key, { __class: "Symbol", description: key, registered: key });
  return symbolRegistry.get(key);
}

/* ================= ArrayBuffer／TypedArray／DataView ================= */

const TA_INFO = {
  Int8Array: { bpe: 1, get: "getInt8", set: "setInt8" },
  Uint8Array: { bpe: 1, get: "getUint8", set: "setUint8" },
  Uint8ClampedArray: { bpe: 1, get: "getUint8", set: "setUint8", clamped: true },
  Int16Array: { bpe: 2, get: "getInt16", set: "setInt16" },
  Uint16Array: { bpe: 2, get: "getUint16", set: "setUint16" },
  Int32Array: { bpe: 4, get: "getInt32", set: "setInt32" },
  Uint32Array: { bpe: 4, get: "getUint32", set: "setUint32" },
  Float32Array: { bpe: 4, get: "getFloat32", set: "setFloat32" },
  Float64Array: { bpe: 8, get: "getFloat64", set: "setFloat64" },
  Float16Array: { bpe: 2, get: "getFloat16", set: "setFloat16" },
  BigInt64Array: { bpe: 8, get: "getBigInt64", set: "setBigInt64", bigint: true },
  BigUint64Array: { bpe: 8, get: "getBigUint64", set: "setBigUint64", bigint: true },
};
const MAX_BUFFER_BYTES = 200000; // P-N1 の値サイズガードと同水準の上限
export function makeArrayBuffer(bytes, options = {}) {
  const store = { bytes: Array.from(bytes, (b) => b & 0xff) };
  return {
    __class: "ArrayBuffer",
    store,
    byteLength: store.bytes.length,
    resizable: !!options.resizable,
    maxByteLength: options.resizable ? options.maxByteLength : store.bytes.length,
    detached: false,
  };
}
function bufferBytes(buffer) {
  return buffer.store.bytes;
}
function makeTypedArray(name, store, byteOffset, length) {
  const info = TA_INFO[name];
  return {
    __class: name,
    store,
    byteOffset,
    length,
    byteLength: length * info.bpe,
    BYTES_PER_ELEMENT: info.bpe,
  };
}
function taView(ta) {
  const bytes = ta.store.bytes;
  return new DataView(Uint8Array.from(bytes).buffer, 0, bytes.length);
}
// ビューのバイト列は共有配列のため、ホスト DataView の書き換え後に
// 共有配列へ書き戻す（同じ store を指す全ビューへ反映させる）。
function taWriteBack(ta, view) {
  const bytes = ta.store.bytes;
  const after = new Uint8Array(view.buffer);
  for (let i = 0; i < bytes.length; i++) bytes[i] = after[i];
}
export function taGet(ta, index) {
  const info = TA_INFO[ta.__class];
  const view = taView(ta);
  // JS-B5-09：ホスト委譲の有無を先に検査する（ctx を持たない経路では
  // PracticeError で同水準の名前付き停止にする）。
  if (!info.clamped && typeof view[info.get] !== "function")
    throw new PracticeError(
      ta.__class + " は未対応です：ホストに実装がありません",
      1,
      "未対応",
    );
  return info.clamped
    ? view.getUint8(ta.byteOffset + index)
    : view[info.get](ta.byteOffset + index * info.bpe, true);
}
export function taSet(ta, index, value, ctx, fname) {
  const info = TA_INFO[ta.__class];
  const view = taView(ta);
  // JS-B5-09：ホスト委譲の有無を先に検査する（Float16Array は
  // 「Float16Array は未対応です：ホストに実装がありません」で停止）。
  if (!info.clamped && typeof view[info.set] !== "function")
    namedStop(ctx, ta.__class, "ホストに実装がありません");
  try {
    if (info.clamped) {
      // 偶数丸めを含む正確なクランプ変換はホスト Uint8ClampedArray へ委譲する
      view.setUint8(ta.byteOffset + index, new Uint8ClampedArray([value])[0]);
    } else {
      view[info.set](ta.byteOffset + index * info.bpe, value, true);
    }
  } catch (e) {
    hostFail(ctx, e, fname || ta.__class);
  }
  taWriteBack(ta, view);
}
export function taElements(ta) {
  const out = [];
  for (let i = 0; i < ta.length; i++) out.push(taGet(ta, i));
  return out;
}
function taFromValues(name, values, ctx) {
  const info = TA_INFO[name];
  const store = { bytes: new Array(values.length * info.bpe).fill(0) };
  const ta = makeTypedArray(name, store, 0, values.length);
  values.forEach((v, i) => taSet(ta, i, v, ctx, name));
  return ta;
}
function makeDataView(buffer, byteOffset, byteLength) {
  return { __class: "DataView", buffer, byteOffset, byteLength };
}
function dvHost(dv) {
  const bytes = dv.buffer.store.bytes;
  return new DataView(
    Uint8Array.from(bytes).buffer,
    dv.byteOffset,
    dv.byteLength,
  );
}
function dvWriteBack(dv, host) {
  const bytes = dv.buffer.store.bytes;
  const after = new Uint8Array(host.buffer);
  for (let i = 0; i < dv.byteLength; i++)
    bytes[dv.byteOffset + i] = after[i];
}

/* ================= 名指し停止のヘルパ ================= */

// コールバック境界：関数値が存在しないため、コールバックを必須とする
// 呼び出しは関数名と理由を挙げて停止する。
function callbackStop(ctx, fname) {
  ctx.fail(
    fname + " はコールバック（関数値）を必要とするため未対応です（この方言では関数値は存在しません）",
    "未対応",
  );
}
function asyncStop(ctx, fname) {
  ctx.fail(
    fname + " は非同期処理のため未対応です（このモデルでは非同期実行を決定的に再現しません）",
    "未対応",
  );
}
function namedStop(ctx, fname, reason) {
  ctx.fail(fname + " は未対応です：" + reason, "未対応");
}

/* ================= グローバルオブジェクトのプロパティ読み取り ================= */

const GLOBAL_PROPS = {
  Math: {
    E: Math.E, LN10: Math.LN10, LN2: Math.LN2, LOG10E: Math.LOG10E,
    LOG2E: Math.LOG2E, PI: Math.PI, SQRT1_2: Math.SQRT1_2, SQRT2: Math.SQRT2,
  },
  Number: {
    EPSILON: Number.EPSILON,
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    MAX_VALUE: Number.MAX_VALUE,
    MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
    MIN_VALUE: Number.MIN_VALUE,
    NaN: NaN,
    NEGATIVE_INFINITY: -Infinity,
    POSITIVE_INFINITY: Infinity,
  },
  String: { length: 1 },
  Array: { length: 1 },
  // JS-B5-02（エンジン分）：各 TypedArray コンストラクタの静的
  // BYTES_PER_ELEMENT（種別ごとの要素バイト数。Node v24 実走で全12種を
  // 確認：1,1,1,2,2,4,4,4,8,2,8,8）。インスタンス経由はモデル値の
  // BYTES_PER_ELEMENT フィールドで従来どおり正しく返る。
  ...Object.fromEntries(
    TYPED_ARRAY_NAMES.map((n) => [n, { BYTES_PER_ELEMENT: TA_INFO[n].bpe }]),
  ),
  Symbol: Object.fromEntries(
    Object.entries(WELL_KNOWN_SYMBOLS).map(([k, v]) => [k, v]),
  ),
};
export function advancedGlobalProp(rootName, propName) {
  const table = GLOBAL_PROPS[rootName];
  if (table && Object.hasOwn(table, propName))
    return { handled: true, value: table[propName] };
  return { handled: false };
}

/* ================= Math ================= */

const MATH_HOST_FNS = [
  "acos", "acosh", "asin", "asinh", "atan", "atan2", "atanh", "cbrt",
  "ceil", "clz32", "cos", "cosh", "exp", "expm1", "f16round", "fround",
  "hypot", "imul", "log", "log10", "log1p", "log2", "max", "min", "pow",
  "sign", "sin", "sinh", "sqrt", "tan", "tanh", "trunc",
];
// Math.sumPrecise（ECMA-262 2027草案）：要素の数値を厳密に合計してから
// 1回だけ丸める。ホスト Node には無いため、倍精度数の仮数を BigInt で
// 厳密に積算し、最後に偶数丸めで倍精度数へ戻す自前実装とする
// （一次情報は仕様本文。検証は Python math.fsum と機械突合した）。
function decomposeDouble(x) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const hi = view.getUint32(0), lo = view.getUint32(4);
  const sign = hi >>> 31 ? -1n : 1n;
  const expBits = (hi >>> 20) & 0x7ff;
  const frac = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (expBits === 0) return { m: sign * frac, e: -1074 };
  return { m: sign * (frac | (1n << 52n)), e: expBits - 1075 };
}
function composeDouble(neg, mantissa, exp2) {
  // mantissa（正の BigInt）× 2^exp2 を最も近い倍精度数（偶数丸め）にする
  const view = new DataView(new ArrayBuffer(8));
  if (mantissa === 0n) {
    view.setFloat64(0, neg ? -0 : 0);
    return view.getFloat64(0);
  }
  let bits = mantissa.toString(2).length;
  let e = exp2 + bits - 1; // 値の二進指数（1.xxx × 2^e の e）
  let m = mantissa;
  const roundTo = (targetBits) => {
    if (bits <= targetBits) {
      m <<= BigInt(targetBits - bits);
      bits = targetBits;
      return;
    }
    const drop = BigInt(bits - targetBits);
    const dropped = m & ((1n << drop) - 1n);
    const half = 1n << (drop - 1n);
    m >>= drop;
    if (dropped > half || (dropped === half && (m & 1n) === 1n)) m += 1n;
    bits = targetBits;
    if (m >> BigInt(bits)) {
      // 丸めで桁が増えた
      m >>= 1n;
      e += 1;
    }
  };
  if (e > 1023) return neg ? -Infinity : Infinity;
  if (e >= -1022) {
    roundTo(53);
    if (e > 1023) return neg ? -Infinity : Infinity;
    const frac = m - (1n << 52n);
    view.setUint32(0, ((neg ? 1 : 0) << 31) | ((e + 1023) << 20) | Number(frac >> 32n));
    view.setUint32(4, Number(frac & 0xffffffffn));
    return view.getFloat64(0);
  }
  // 非正規数：仮数を 2^-1074 単位へ合わせる
  const shift = BigInt(-1074 - exp2);
  if (shift > BigInt(bits + 1)) return neg ? -0 : 0;
  if (shift > 0n) {
    const dropped = m & ((1n << shift) - 1n);
    const half = 1n << (shift - 1n);
    m >>= shift;
    if (dropped > half || (dropped === half && (m & 1n) === 1n)) m += 1n;
  } else if (shift < 0n) {
    m <<= -shift;
  }
  if (m >= (1n << 53n)) return neg ? -Infinity : Infinity;
  if (m >= (1n << 52n)) {
    // 丸めの結果、正規数の最小値へ到達した
    view.setUint32(0, ((neg ? 1 : 0) << 31) | (1 << 20) | Number((m - (1n << 52n)) >> 32n));
    view.setUint32(4, Number((m - (1n << 52n)) & 0xffffffffn));
    return view.getFloat64(0);
  }
  view.setUint32(0, ((neg ? 1 : 0) << 31) | Number(m >> 32n));
  view.setUint32(4, Number(m & 0xffffffffn));
  return view.getFloat64(0);
}
function sumPreciseImpl(values, ctx) {
  // 仕様の状態機械どおり：要素の型検査は全要素に対して行い（NaN の
  // 後ろにある非数値でも TypeError）、状態は not-a-number／±∞／
  // minus-zero／finite を辿る。初期状態は minus-zero のため、空の
  // 反復可能オブジェクトや -0 だけの列は -0 を返す。
  let state = "minus-zero";
  let minE = Infinity;
  const parts = [];
  for (const v of values) {
    if (typeof v !== "number")
      ctx.fail("Math.sumPrecise：要素は数値でなければなりません", "TypeError");
    if (state === "not-a-number") continue;
    if (Number.isNaN(v)) state = "not-a-number";
    else if (v === Infinity)
      state = state === "minus-infinity" ? "not-a-number" : "plus-infinity";
    else if (v === -Infinity)
      state = state === "plus-infinity" ? "not-a-number" : "minus-infinity";
    else if (!Object.is(v, -0)) {
      state = "finite";
      if (v !== 0) {
        const d = decomposeDouble(v);
        parts.push(d);
        if (d.e < minE) minE = d.e;
      }
    }
  }
  const posInf = state === "plus-infinity", negInf = state === "minus-infinity";
  const allNegZero = state === "minus-zero";
  if (state === "not-a-number") return NaN;
  if (posInf && negInf) return NaN;
  if (posInf) return Infinity;
  if (negInf) return -Infinity;
  if (!parts.length) return allNegZero ? -0 : 0;
  let sum = 0n;
  for (const d of parts) sum += d.m << BigInt(d.e - minE);
  if (sum === 0n) return allNegZero ? -0 : 0;
  const neg = sum < 0n;
  return composeDouble(neg, neg ? -sum : sum, minE);
}

function mathCall(fn, ctx) {
  const fname = "Math." + fn;
  if (fn === "random") {
    ctx.values();
    const u = propagateUnknown(ctx.values(), ctx, fname + "の引数による", "number");
    if (u) return u;
    // 乱数は実行時に決まる値であり、固定値を捏造しない。
    return { ...unknown("Math.randomの結果（実行時に決まります）"), valueType: "number" };
  }
  const vals = ctx.values().map((v) => clean(v, ctx));
  const u = propagateUnknown(vals, ctx, fname + "の引数による", "number");
  if (u) return u;
  if (fn === "sumPrecise") {
    const iterable = vals[0];
    let items = null;
    if (Array.isArray(iterable)) items = iterable;
    else if (classOf(iterable) === "Set") items = iterable.values;
    else if (classOf(iterable) === "Map") items = [...iterable.entries];
    if (!items)
      ctx.fail("Math.sumPrecise：第1引数は反復可能な値（配列等）でなければなりません", "TypeError");
    const inner = propagateUnknown(items, ctx, fname + "の要素による", "number");
    if (inner) return inner;
    return sumPreciseImpl(items.map((v) => clean(v, ctx)), ctx);
  }
  for (const v of vals) assertNotSymbolOrBigIntForNumber(v, ctx, fname);
  // JS-B5-09：ホスト不在時は内部式（Math[fn] is not a function）を出さず
  // RegExp.escape と同水準の名前付き停止にする。
  if (typeof Math[fn] !== "function")
    namedStop(ctx, fname, "ホストに実装がありません");
  try {
    return Math[fn](...vals);
  } catch (e) {
    hostFail(ctx, e, fname);
  }
}

/* ================= グローバル関数と静的メソッド（数値・文字列系） ================= */

function globalCallHandlers(name, ctx) {
  switch (name) {
    case "parseFloat": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "parseFloatの入力による", "number");
      if (u) return { handled: true, value: u };
      const v = vals[0];
      if (classOf(v) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      return { handled: true, value: parseFloat(clean(v, ctx)) };
    }
    case "isNaN": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "isNaNの入力による", "boolean");
      if (u) return { handled: true, value: u };
      assertNotSymbolOrBigIntForNumber(vals[0], ctx, "isNaN");
      return { handled: true, value: isNaN(clean(vals[0], ctx)) };
    }
    case "isFinite": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "isFiniteの入力による", "boolean");
      if (u) return { handled: true, value: u };
      assertNotSymbolOrBigIntForNumber(vals[0], ctx, "isFinite");
      return { handled: true, value: isFinite(clean(vals[0], ctx)) };
    }
    case "encodeURI":
    case "decodeURI":
    case "encodeURIComponent":
    case "decodeURIComponent": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, name + "の入力による", "string");
      if (u) return { handled: true, value: u };
      if (classOf(vals[0]) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      // JS-B5-09（同型点検）：ホスト委譲は使用前に有無を検査する。
      if (typeof globalThis[name] !== "function")
        namedStop(ctx, name, "ホストに実装がありません");
      try {
        return { handled: true, value: globalThis[name](clean(vals[0], ctx)) };
      } catch (e) {
        hostFail(ctx, e, name);
      }
    }
    // Number の静的メソッドは型変換をしない（Number.isInteger("3") は false）。
    case "Number.isFinite":
    case "Number.isInteger":
    case "Number.isNaN":
    case "Number.isSafeInteger": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, name + "の入力による", "boolean");
      if (u) return { handled: true, value: u };
      return { handled: true, value: Number[name.split(".")[1]](vals[0]) };
    }
    case "Number.parseFloat": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Number.parseFloatの入力による", "number");
      if (u) return { handled: true, value: u };
      if (classOf(vals[0]) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      return { handled: true, value: parseFloat(clean(vals[0], ctx)) };
    }
    case "Number.parseInt": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Number.parseIntの入力による", "number");
      if (u) return { handled: true, value: u };
      if (classOf(vals[0]) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      return { handled: true, value: parseInt(clean(vals[0], ctx), clean(vals[1], ctx)) };
    }
    case "String.fromCharCode": {
      const vals = ctx.values().map((v) => clean(v, ctx));
      const u = propagateUnknown(vals, ctx, "String.fromCharCodeの引数による", "string");
      if (u) return { handled: true, value: u };
      for (const v of vals) assertNotSymbolOrBigIntForNumber(v, ctx, "String.fromCharCode");
      return { handled: true, value: String.fromCharCode(...vals) };
    }
    case "String.fromCodePoint": {
      const vals = ctx.values().map((v) => clean(v, ctx));
      const u = propagateUnknown(vals, ctx, "String.fromCodePointの引数による", "string");
      if (u) return { handled: true, value: u };
      for (const v of vals) assertNotSymbolOrBigIntForNumber(v, ctx, "String.fromCodePoint");
      try {
        return { handled: true, value: String.fromCodePoint(...vals) };
      } catch (e) {
        hostFail(ctx, e, "String.fromCodePoint");
      }
    }
    case "String.raw": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "String.rawの引数による", "string");
      if (u) return { handled: true, value: u };
      const strings = vals[0];
      const raw = strings && typeof strings === "object" ? strings.raw : undefined;
      if (!Array.isArray(raw))
        ctx.fail("String.raw：第1引数には raw プロパティ（配列）を持つオブジェクトが必要です", "TypeError");
      let out = "";
      for (let i = 0; i < raw.length; i++) {
        out += ctx.jsStringValue(clean(raw[i], ctx));
        if (i + 1 < raw.length && i + 1 < vals.length)
          out += ctx.jsStringValue(clean(vals[i + 1], ctx));
      }
      return { handled: true, value: out };
    }
    case "BigInt.asIntN":
    case "BigInt.asUintN": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, name + "の引数による");
      if (u) return { handled: true, value: u };
      try {
        return { handled: true, value: BigInt[name.split(".")[1]](clean(vals[0], ctx), clean(vals[1], ctx)) };
      } catch (e) {
        hostFail(ctx, e, name);
      }
    }
  }
  return { handled: false };
}

/* ================= オブジェクトの自分のプロパティ（モデル表現） ================= */

const MARKER_KEYS = new Set(["__jsFrozen", "__jsSealed", "__jsNoExt"]);
// モデル値・通常オブジェクトを通して「自分自身の列挙可能な文字列キーと
// 値」を返す。モデル値の内部フィールド（Map の entries 等）は実
// JavaScript では列挙可能な自分のプロパティではないため除く。
export function ownEnumerableEntries(v) {
  const cls = classOf(v);
  if (cls) {
    if (TYPED_ARRAY_NAMES.includes(cls))
      return taElements(v).map((x, i) => [String(i), x]);
    return [];
  }
  if (v && typeof v === "object")
    return Object.entries(v).filter(([k]) => !MARKER_KEYS.has(k));
  return [];
}
export function ownKeysAll(v) {
  const cls = classOf(v);
  if (cls) {
    if (TYPED_ARRAY_NAMES.includes(cls))
      return taElements(v).map((_, i) => String(i));
    if (cls === "RegExp") return ["lastIndex"];
    if (ERROR_CLASS_NAMES.has(cls)) return ["message"];
    return [];
  }
  if (Array.isArray(v))
    return [...Object.keys(v).filter((k) => !MARKER_KEYS.has(k)), "length"]
      .sort((a, b) => (a === "length" ? 1 : b === "length" ? -1 : 0));
  if (v && typeof v === "object")
    return Object.keys(v).filter((k) => !MARKER_KEYS.has(k));
  return [];
}
// JS-B5-04：モデル値の内部フィールド（実 JavaScript では自分の
// プロパティではないもの）。これ以外のキーでモデルオブジェクト自身が
// 持つものは、利用者が代入したプロパティとして own と扱う。
const MODEL_INTERNAL_KEYS = {
  Map: ["__class", "entries", "size"],
  Set: ["__class", "values", "size"],
  WeakMap: ["__class", "entries"],
  WeakSet: ["__class", "values"],
  Date: ["__class", "time"],
  RegExp: ["__class", "source", "flags", "global", "ignoreCase", "multiline", "dotAll", "sticky", "unicode", "unicodeSets", "hasIndices", "lastIndex"],
  ArrayBuffer: ["__class", "store", "byteLength", "resizable", "maxByteLength", "detached"],
  DataView: ["__class", "buffer", "byteOffset", "byteLength"],
  Symbol: ["__class", "description", "registered", "wellKnown"],
  RawJSON: ["__class", "raw"],
};
function modelInternalKeys(cls) {
  if (TYPED_ARRAY_NAMES.includes(cls))
    return ["__class", "store", "byteOffset", "length", "byteLength", "BYTES_PER_ELEMENT"];
  if (ERROR_CLASS_NAMES.has(cls))
    return ["__class", "name", "message", "errors", "error", "suppressed"];
  return MODEL_INTERNAL_KEYS[cls] || ["__class"];
}
// 利用者が代入した追加プロパティ（内部フィールドでない own キー）か。
export function modelHasExtraOwn(v, key) {
  const cls = classOf(v);
  if (!cls) return false;
  return Object.hasOwn(v, key) && !modelInternalKeys(cls).includes(key) && !MARKER_KEYS.has(key);
}
export function modelHasOwn(v, key) {
  const cls = classOf(v);
  if (cls) {
    if (TYPED_ARRAY_NAMES.includes(cls))
      return key === "length"
        ? false
        : (/^(0|[1-9]\d*)$/.test(key) && Number(key) < v.length) || modelHasExtraOwn(v, key);
    if (cls === "RegExp") return key === "lastIndex" || modelHasExtraOwn(v, key);
    if (ERROR_CLASS_NAMES.has(cls))
      // Node 実走：message は全エラーで own、AggregateError の errors、
      // SuppressedError の error／suppressed も own。name は own でない。
      return key === "message" ||
        (cls === "AggregateError" && key === "errors") ||
        (cls === "SuppressedError" && (key === "error" || key === "suppressed")) ||
        modelHasExtraOwn(v, key);
    return modelHasExtraOwn(v, key);
  }
  if (Array.isArray(v) && key === "length") return true;
  if (v && typeof v === "object")
    return Object.hasOwn(v, key) && !MARKER_KEYS.has(key);
  return false;
}
function isFrozenModel(v) {
  return !!(v && typeof v === "object" && v.__jsFrozen);
}
function isSealedModel(v) {
  return !!(v && typeof v === "object" && (v.__jsSealed || v.__jsFrozen));
}
function isExtensibleModel(v) {
  return !(v && typeof v === "object" && (v.__jsNoExt || v.__jsSealed || v.__jsFrozen));
}
// プロパティキーへの変換（ToPropertyKey のうちモデルで扱える範囲）。
function toPropertyKey(v, ctx, fname) {
  if (classOf(v) === "Symbol")
    ctx.fail(fname + "：シンボルキーはこのモデルでは未対応です", "未対応");
  if (isModelValue(v)) return modelToString(v, ctx).value;
  return String(clean(v, ctx));
}

/* ================= Object の静的メソッド ================= */

function objectStatics(name, ctx) {
  const vals = () => ctx.values();
  switch (name) {
    case "Object.keys":
    case "Object.values":
    case "Object.entries": {
      const [v] = vals();
      const u = propagateUnknown([v], ctx, name + "の引数による");
      if (u) return { handled: true, value: u };
      if (v === null || v === undefined)
        ctx.fail(name + "：null / undefined はオブジェクトへ変換できません", "TypeError");
      if (typeof v === "string")
        // 文字列の添字プロパティは UTF-16 コード単位ごと（実物どおり）。
        return {
          handled: true,
          value:
            name === "Object.keys"
              ? Array.from({ length: v.length }, (_, i) => String(i))
              : name === "Object.values"
                ? Array.from({ length: v.length }, (_, i) => v[i])
                : Array.from({ length: v.length }, (_, i) => [String(i), v[i]]),
        };
      if (typeof v !== "object") return { handled: true, value: [] };
      const entries = ownEnumerableEntries(clean(v, ctx));
      return {
        handled: true,
        value:
          name === "Object.keys"
            ? entries.map(([k]) => k)
            : name === "Object.values"
              ? entries.map(([, x]) => x)
              : entries.map(([k, x]) => [k, x]),
      };
    }
    case "Object.fromEntries": {
      const [iterable] = vals();
      const u = propagateUnknown([iterable], ctx, "Object.fromEntriesの引数による");
      if (u) return { handled: true, value: u };
      let pairs = null;
      if (Array.isArray(iterable)) pairs = iterable;
      else if (classOf(iterable) === "Map") pairs = iterable.entries;
      else if (classOf(iterable) === "Set") pairs = iterable.values;
      if (!pairs)
        ctx.fail("Object.fromEntries：第1引数は反復可能な値（キーと値の組の列）でなければなりません", "TypeError");
      const out = {};
      for (const entry of pairs) {
        if (!entry || typeof entry !== "object")
          ctx.fail("Object.fromEntries：各要素はキーと値の組（オブジェクト）でなければなりません", "TypeError");
        const key = toPropertyKey(clean(entry[0], ctx), ctx, "Object.fromEntries");
        out[key] = entry[1];
      }
      return { handled: true, value: out };
    }
    case "Object.assign": {
      const all = vals();
      const u = propagateUnknown(all, ctx, "Object.assignの引数による");
      if (u) return { handled: true, value: u };
      const target = all[0];
      if (target === null || target === undefined)
        ctx.fail("Object.assign：対象が null / undefined です", "TypeError");
      if (typeof target !== "object" || isModelValue(target))
        namedStop(ctx, "Object.assign", "対象がプリミティブ値またはモデル値（Map／Date 等）の場合は未対応です");
      if (isFrozenModel(target))
        ctx.fail("Object.assign：凍結されたオブジェクトへは書き込めません", "TypeError");
      for (const source of all.slice(1)) {
        if (source === null || source === undefined) continue;
        if (typeof source === "string") {
          [...source].forEach((c, i) => {
            target[String(i)] = c;
          });
          continue;
        }
        if (typeof source !== "object") continue;
        for (const [k, v] of ownEnumerableEntries(clean(source, ctx)))
          target[k] = v;
      }
      return { handled: true, value: target };
    }
    case "Object.freeze":
    case "Object.seal":
    case "Object.preventExtensions": {
      const [v] = vals();
      if (!v || typeof v !== "object") return { handled: true, value: v };
      if (isUnknown(v)) return { handled: true, value: v };
      if (name === "Object.freeze") v.__jsFrozen = true;
      else if (name === "Object.seal") v.__jsSealed = true;
      else v.__jsNoExt = true;
      return { handled: true, value: v };
    }
    case "Object.isFrozen": {
      const [v] = vals();
      if (!v || typeof v !== "object") return { handled: true, value: true };
      const u = propagateUnknown([v], ctx, "Object.isFrozenの引数による", "boolean");
      if (u) return { handled: true, value: u };
      return {
        handled: true,
        value:
          isFrozenModel(v) ||
          (!isExtensibleModel(v) && ownKeysAll(clean(v, ctx)).length === 0),
      };
    }
    case "Object.isSealed": {
      const [v] = vals();
      if (!v || typeof v !== "object") return { handled: true, value: true };
      const u = propagateUnknown([v], ctx, "Object.isSealedの引数による", "boolean");
      if (u) return { handled: true, value: u };
      return {
        handled: true,
        value:
          isSealedModel(v) ||
          (!isExtensibleModel(v) && ownKeysAll(clean(v, ctx)).length === 0),
      };
    }
    case "Object.isExtensible": {
      const [v] = vals();
      if (!v || typeof v !== "object") return { handled: true, value: false };
      const u = propagateUnknown([v], ctx, "Object.isExtensibleの引数による", "boolean");
      if (u) return { handled: true, value: u };
      return { handled: true, value: isExtensibleModel(v) };
    }
    case "Object.is": {
      const [a, b] = vals();
      const u = propagateUnknown([a, b], ctx, "Object.isの引数による", "boolean");
      if (u) return { handled: true, value: u };
      return { handled: true, value: sameValue(a, b) };
    }
    case "Object.hasOwn": {
      const [obj, keyValue] = vals();
      const u = propagateUnknown([obj, keyValue], ctx, "Object.hasOwnの引数による", "boolean");
      if (u) return { handled: true, value: u };
      if (obj === null || obj === undefined)
        ctx.fail("Object.hasOwn：null / undefined のプロパティは調べられません", "TypeError");
      if (classOf(keyValue) === "Symbol") return { handled: true, value: false };
      const key = toPropertyKey(keyValue, ctx, "Object.hasOwn");
      if (typeof obj !== "object") return { handled: true, value: false };
      return { handled: true, value: modelHasOwn(clean(obj, ctx), key) };
    }
    case "Object.create": {
      const [proto] = vals();
      const u = propagateUnknown([proto], ctx, "Object.createの引数による");
      if (u) return { handled: true, value: u };
      if (proto === null) return { handled: true, value: {} };
      namedStop(ctx, "Object.create", "プロトタイプを継承するオブジェクトはこのモデルでは表現できません（null の場合のみ対応します）");
    }
    case "Object.getOwnPropertyDescriptor": {
      const [obj, keyValue] = vals();
      const u = propagateUnknown([obj, keyValue], ctx, "Object.getOwnPropertyDescriptorの引数による");
      if (u) return { handled: true, value: u };
      if (obj === null || obj === undefined)
        ctx.fail("Object.getOwnPropertyDescriptor：null / undefined は変換できません", "TypeError");
      if (typeof obj !== "object") return { handled: true, value: undefined };
      const key = classOf(keyValue) === "Symbol" ? null : toPropertyKey(keyValue, ctx, name);
      if (key === null) return { handled: true, value: undefined };
      const target = clean(obj, ctx);
      if (Array.isArray(target) && key === "length")
        return {
          handled: true,
          value: { value: target.length, writable: true, enumerable: false, configurable: false },
        };
      if (!modelHasOwn(target, key)) return { handled: true, value: undefined };
      const enumerable = ownEnumerableEntries(target).some(([k]) => k === key) ||
        (TYPED_ARRAY_NAMES.includes(classOf(target)) && /^\d+$/.test(key));
      return {
        handled: true,
        value: { value: readOwnValue(target, key), writable: true, enumerable, configurable: true },
      };
    }
    case "Object.getOwnPropertyDescriptors": {
      const [obj] = vals();
      const u = propagateUnknown([obj], ctx, "Object.getOwnPropertyDescriptorsの引数による");
      if (u) return { handled: true, value: u };
      if (obj === null || obj === undefined)
        ctx.fail("Object.getOwnPropertyDescriptors：null / undefined は変換できません", "TypeError");
      if (typeof obj !== "object") return { handled: true, value: {} };
      const target = clean(obj, ctx);
      const out = {};
      for (const key of ownKeysAll(target)) {
        const sub = objectStatics("Object.getOwnPropertyDescriptor", {
          ...ctx,
          values: () => [target, key],
        });
        if (sub.handled && sub.value !== undefined) out[key] = sub.value;
      }
      return { handled: true, value: out };
    }
    case "Object.getOwnPropertyNames": {
      const [obj] = vals();
      const u = propagateUnknown([obj], ctx, "Object.getOwnPropertyNamesの引数による");
      if (u) return { handled: true, value: u };
      if (obj === null || obj === undefined)
        ctx.fail("Object.getOwnPropertyNames：null / undefined は変換できません", "TypeError");
      if (typeof obj !== "object") return { handled: true, value: [] };
      return { handled: true, value: ownKeysAll(clean(obj, ctx)) };
    }
    case "Object.getOwnPropertySymbols": {
      const [obj] = vals();
      const u = propagateUnknown([obj], ctx, "Object.getOwnPropertySymbolsの引数による");
      if (u) return { handled: true, value: u };
      if (obj === null || obj === undefined)
        ctx.fail("Object.getOwnPropertySymbols：null / undefined は変換できません", "TypeError");
      // このモデルではシンボルキーのプロパティは作られない。
      return { handled: true, value: [] };
    }
    case "Object.getPrototypeOf":
    case "Object.setPrototypeOf":
      namedStop(ctx, name, "プロトタイプチェーンはこのモデルでは表現できません");
    case "Object.defineProperty":
    case "Object.defineProperties":
      namedStop(ctx, name, "プロパティ記述子による定義はこのモデルでは表現できません");
    case "Object.groupBy":
      callbackStop(ctx, "Object.groupBy");
    case "Object": {
      const [v] = vals();
      if (ctx.argCount === 0 || v === null || v === undefined)
        return { handled: true, value: {} };
      const u = propagateUnknown([v], ctx, "Objectの引数による");
      if (u) return { handled: true, value: u };
      if (typeof v === "object") return { handled: true, value: v };
      namedStop(ctx, "Object", "プリミティブ値のラッパーオブジェクトはこのモデルでは表現できません");
    }
  }
  return { handled: false };
}
// 自分のプロパティの値をモデル表現に沿って読む（記述子用）。
function readOwnValue(target, key) {
  const cls = classOf(target);
  if (cls && TYPED_ARRAY_NAMES.includes(cls)) return taGet(target, Number(key));
  return target[key];
}

/* ================= Array の静的メソッドとコンストラクタ ================= */

function iterableItems(v, ctx, fname) {
  // モデル内で反復可能な値を要素列として取り出す。反復可能でなければ null。
  if (Array.isArray(v)) return [...v];
  if (typeof v === "string") return [...v];
  const cls = classOf(v);
  if (cls === "Map") return v.entries.map(([k, x]) => [k, x]);
  if (cls === "Set" || cls === "WeakSet") return [...v.values];
  if (cls && TYPED_ARRAY_NAMES.includes(cls)) return taElements(v);
  if (cls === "WeakMap") return v.entries.map(([k, x]) => [k, x]);
  return null;
}
function arrayStatics(name, ctx) {
  switch (name) {
    case "Array": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Arrayの引数による");
      if (u) return { handled: true, value: u };
      if (vals.length === 1 && typeof vals[0] === "number") {
        const n = vals[0];
        if (!Number.isInteger(n) || n < 0 || n > 4294967295)
          ctx.fail("Array：配列の長さが不正です", "RangeError");
        if (n > 200000)
          ctx.fail("配列の要素数が上限（200000）を超えます", "RangeError");
        return { handled: true, value: new Array(n) };
      }
      if (vals.length > 200000)
        ctx.fail("配列の要素数が上限（200000）を超えます", "RangeError");
      return { handled: true, value: [...vals] };
    }
    case "Array.isArray": {
      const [v] = ctx.values();
      const u = propagateUnknown([v], ctx, "Array.isArrayの引数による", "boolean");
      if (u) return { handled: true, value: u };
      return { handled: true, value: Array.isArray(v) };
    }
    case "Array.of": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Array.ofの引数による");
      if (u) return { handled: true, value: u };
      return { handled: true, value: [...vals] };
    }
    case "Array.from": {
      const vals = ctx.values();
      const [source, mapFn] = vals;
      const u = propagateUnknown([source], ctx, "Array.fromの引数による");
      if (u) return { handled: true, value: u };
      if (mapFn !== undefined) callbackStop(ctx, "Array.from（第2引数の変換関数）");
      if (source === null || source === undefined)
        ctx.fail("Array.from：null / undefined からは配列を作れません", "TypeError");
      const items = iterableItems(source, ctx, name);
      if (items) {
        if (items.length > 200000)
          ctx.fail("配列の要素数が上限（200000）を超えます", "RangeError");
        return { handled: true, value: items };
      }
      if (typeof source === "object") {
        const len = toLength(Number(clean(source.length, ctx)));
        if (len > 200000)
          ctx.fail("配列の要素数が上限（200000）を超えます", "RangeError");
        const out = [];
        for (let i = 0; i < len; i++) out.push(source[i]);
        return { handled: true, value: out };
      }
      return { handled: true, value: [] };
    }
    case "Array.fromAsync":
      asyncStop(ctx, "Array.fromAsync");
  }
  return { handled: false };
}

/* ================= JSON ================= */

function jsonCalls(name, ctx) {
  switch (name) {
    case "JSON.parse": {
      const vals = ctx.values();
      const [text, reviver] = vals;
      const u = propagateUnknown([text], ctx, "JSON.parseの引数による");
      if (u) return { handled: true, value: u };
      if (reviver !== undefined) callbackStop(ctx, "JSON.parse（reviver）");
      if (classOf(text) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      try {
        return { handled: true, value: JSON.parse(clean(text, ctx)) };
      } catch (e) {
        ctx.fail("JSON.parse：" + (e?.message || "JSONの構文が不正です"), "SyntaxError");
      }
    }
    case "JSON.rawJSON": {
      const vals = ctx.values();
      const [text] = vals;
      const u = propagateUnknown([text], ctx, "JSON.rawJSONの引数による");
      if (u) return { handled: true, value: u };
      if (typeof text !== "string")
        ctx.fail("JSON.rawJSON：第1引数は文字列でなければなりません", "TypeError");
      try {
        JSON.parse(text);
      } catch {
        ctx.fail("JSON.rawJSON：有効なJSONテキストではありません", "SyntaxError");
      }
      if (/^\s*(true|false|null|-?\d)/.test(text) === false && !/^"/.test(text.trim()))
        ctx.fail("JSON.rawJSON：トップレベルに置けるのは数値・文字列・true・false・null だけです", "SyntaxError");
      return { handled: true, value: { __class: "RawJSON", raw: text } };
    }
    case "JSON.isRawJSON": {
      const [v] = ctx.values();
      const u = propagateUnknown([v], ctx, "JSON.isRawJSONの引数による", "boolean");
      if (u) return { handled: true, value: u };
      return { handled: true, value: classOf(v) === "RawJSON" };
    }
  }
  return { handled: false };
}

/* ================= Symbol／Error／RegExp のコンストラクタ ================= */

function symbolCalls(name, ctx) {
  switch (name) {
    case "Symbol": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Symbolの引数による");
      if (u) return { handled: true, value: u };
      const v = vals[0];
      if (ctx.argCount === 0 || v === undefined) return { handled: true, value: makeSymbol(undefined) };
      if (classOf(v) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      return { handled: true, value: makeSymbol(ctx.jsStringValue(clean(v, ctx))) };
    }
    case "Symbol.for": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Symbol.forの引数による");
      if (u) return { handled: true, value: u };
      if (classOf(vals[0]) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      return { handled: true, value: symbolFor(ctx.jsStringValue(clean(vals[0], ctx))) };
    }
    case "Symbol.keyFor": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Symbol.keyForの引数による");
      if (u) return { handled: true, value: u };
      const v = vals[0];
      if (classOf(v) !== "Symbol")
        ctx.fail("Symbol.keyFor：第1引数はシンボルでなければなりません", "TypeError");
      return { handled: true, value: v.registered };
    }
  }
  return { handled: false };
}

const ERROR_CTORS = [
  "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError",
  "EvalError", "URIError",
];
function errorCalls(name, ctx) {
  if (ERROR_CTORS.includes(name)) {
    const vals = ctx.values();
    const v = vals[0];
    const message =
      ctx.argCount === 0 || v === undefined
        ? ""
        : classOf(v) === "Symbol"
          ? ctx.fail("Symbolを文字列へ変換できません", "TypeError")
          : ctx.jsStringValue(clean(v, ctx));
    return { handled: true, value: makeError(name, message) };
  }
  switch (name) {
    case "AggregateError": {
      const vals = ctx.values();
      const [errors, messageValue] = vals;
      const u = propagateUnknown([errors], ctx, "AggregateErrorの引数による");
      if (u) return { handled: true, value: u };
      const items = iterableItems(errors, ctx, name);
      if (!items)
        ctx.fail("AggregateError：第1引数は反復可能な値（エラーの列）でなければなりません", "TypeError");
      const message =
        messageValue === undefined
          ? ""
          : ctx.jsStringValue(clean(messageValue, ctx));
      return {
        handled: true,
        value: makeError("AggregateError", message, { errors: items }),
      };
    }
    case "SuppressedError": {
      const vals = ctx.values();
      const [error, suppressed, messageValue] = vals;
      const message =
        messageValue === undefined
          ? ""
          : ctx.jsStringValue(clean(messageValue, ctx));
      return {
        handled: true,
        value: makeError("SuppressedError", message, { error, suppressed }),
      };
    }
    case "Error.isError": {
      const [v] = ctx.values();
      const u = propagateUnknown([v], ctx, "Error.isErrorの引数による", "boolean");
      if (u) return { handled: true, value: u };
      const cls = classOf(v);
      return { handled: true, value: !!cls && ERROR_CLASS_NAMES.has(cls) };
    }
    case "RegExp": {
      const vals = ctx.values();
      const [pattern, flagsValue] = vals;
      const u = propagateUnknown(vals, ctx, "RegExpの引数による");
      if (u) return { handled: true, value: u };
      let source, flags;
      if (classOf(pattern) === "RegExp" && flagsValue === undefined)
        return { handled: true, value: makeRegExp(pattern.source, pattern.flags, ctx) };
      if (classOf(pattern) === "Symbol" || classOf(flagsValue) === "Symbol")
        ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      source =
        pattern === undefined
          ? ""
          : ctx.jsStringValue(clean(pattern, ctx));
      flags =
        flagsValue === undefined
          ? classOf(pattern) === "RegExp"
            ? pattern.flags
            : ""
          : ctx.jsStringValue(clean(flagsValue, ctx));
      return {
        handled: true,
        value: makeRegExp(source === "" && pattern === undefined ? "(?:)" : source, flags, ctx),
      };
    }
    case "RegExp.escape": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "RegExp.escapeの引数による", "string");
      if (u) return { handled: true, value: u };
      if (classOf(vals[0]) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      if (typeof RegExp.escape !== "function")
        namedStop(ctx, "RegExp.escape", "ホストに実装がありません");
      return { handled: true, value: RegExp.escape(ctx.jsStringValue(clean(vals[0], ctx))) };
    }
  }
  return { handled: false };
}

/* ================= Map／Set／WeakMap／WeakSet のコンストラクタ ================= */

function assertWeakKey(key, ctx, fname) {
  const cls = classOf(key);
  if (cls === "Symbol") {
    if (key.registered !== undefined)
      ctx.fail(fname + "：登録済みシンボルはキーにできません", "TypeError");
    return;
  }
  if (!key || typeof key !== "object")
    ctx.fail(fname + "：キーはオブジェクトでなければなりません", "TypeError");
}
function collectionCalls(name, ctx) {
  switch (name) {
    case "Map":
    case "WeakMap": {
      const vals = ctx.values();
      const [iterable] = vals;
      const m = name === "Map" ? makeMap() : { __class: "WeakMap", entries: [] };
      if (ctx.argCount === 0 || iterable === undefined || iterable === null)
        return { handled: true, value: m };
      const u = propagateUnknown([iterable], ctx, name + "の引数による");
      if (u) return { handled: true, value: u };
      const items = iterableItems(iterable, ctx, name);
      if (!items)
        ctx.fail(name + "：第1引数は反復可能な値（キーと値の組の列）でなければなりません", "TypeError");
      for (const entry of items) {
        if (!entry || typeof entry !== "object")
          ctx.fail(name + "：各要素はキーと値の組（オブジェクト）でなければなりません", "TypeError");
        const key = entry[0], value = entry[1];
        if (name === "WeakMap") {
          assertWeakKey(key, ctx, "WeakMap");
          const found = m.entries.find(([k]) => k === key);
          if (found) found[1] = value;
          else m.entries.push([key, value]);
        } else mapSet(m, key, value);
      }
      return { handled: true, value: m };
    }
    case "Set":
    case "WeakSet": {
      const vals = ctx.values();
      const [iterable] = vals;
      const s = name === "Set" ? makeSet() : { __class: "WeakSet", values: [] };
      if (ctx.argCount === 0 || iterable === undefined || iterable === null)
        return { handled: true, value: s };
      const u = propagateUnknown([iterable], ctx, name + "の引数による");
      if (u) return { handled: true, value: u };
      const items = iterableItems(iterable, ctx, name);
      if (!items)
        ctx.fail(name + "：第1引数は反復可能な値でなければなりません", "TypeError");
      for (const v of items) {
        if (name === "WeakSet") {
          assertWeakKey(v, ctx, "WeakSet");
          if (!s.values.includes(v)) s.values.push(v);
        } else setAdd(s, v);
      }
      return { handled: true, value: s };
    }
  }
  return { handled: false };
}

/* ================= Date ================= */

const ISO_DATE_RE =
  /^[+-]?\d{4,6}(?:-\d{2}(?:-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?)?)?$/;
function timeClip(x) {
  // TimeClip：整数化し、±8.64e15 の範囲外は NaN（ホスト Date に委譲）。
  return new Date(x).getTime();
}
function dateParseValue(text, ctx, fname) {
  const t = text.trim();
  if (!ISO_DATE_RE.test(t))
    ctx.fail(
      fname + "：ISO 8601 形式以外の日付文字列は、解釈が実装依存（現地時間を含む）ため未確認です",
      "未確認",
    );
  return Date.parse(t);
}
function dateCalls(name, ctx) {
  switch (name) {
    case "Date": {
      const vals = ctx.values();
      if (ctx.argCount === 0)
        // 引数なしは現在日時であり、値を捏造しない。
        return {
          handled: true,
          value: { ...unknown("現在の日時（実行時に決まります）"), valueType: "object" },
        };
      const u = propagateUnknown(vals, ctx, "Dateの引数による");
      if (u) return { handled: true, value: u };
      if (vals.length === 1) {
        const v = vals[0];
        if (classOf(v) === "Date") return { handled: true, value: makeDate(v.time) };
        if (typeof v === "string")
          return { handled: true, value: makeDate(dateParseValue(v, ctx, "Date")) };
        if (classOf(v) === "Symbol") ctx.fail("Symbolを数値へ変換できません", "TypeError");
        if (typeof v === "bigint") ctx.fail("BigIntを数値へ変換できません（Date）", "TypeError");
        return { handled: true, value: makeDate(timeClip(Number(clean(v, ctx)))) };
      }
      // 複数引数形は UTC として解釈する（モデルの裁定：ファイル冒頭）。
      for (const v of vals) assertNotSymbolOrBigIntForNumber(v, ctx, "Date");
      const nums = vals.map((v) => Number(clean(v, ctx)));
      return { handled: true, value: makeDate(Date.UTC(...nums)) };
    }
    case "Date.parse": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Date.parseの引数による", "number");
      if (u) return { handled: true, value: u };
      if (classOf(vals[0]) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      return {
        handled: true,
        value: dateParseValue(ctx.jsStringValue(clean(vals[0], ctx)), ctx, "Date.parse"),
      };
    }
    case "Date.UTC": {
      const vals = ctx.values();
      const u = propagateUnknown(vals, ctx, "Date.UTCの引数による", "number");
      if (u) return { handled: true, value: u };
      for (const v of vals) assertNotSymbolOrBigIntForNumber(v, ctx, "Date.UTC");
      return { handled: true, value: Date.UTC(...vals.map((v) => Number(clean(v, ctx)))) };
    }
    case "Date.now":
      ctx.values();
      // 現在時刻は実行時に決まる値であり、固定値を捏造しない（課題指示）。
      return {
        handled: true,
        value: { ...unknown("現在の時刻（実行時に決まります）"), valueType: "number" },
      };
  }
  return { handled: false };
}

/* ================= ArrayBuffer／DataView／TypedArray のコンストラクタ ================= */

function toIndexLength(v, ctx, fname) {
  const n = Number(clean(v, ctx));
  if (Number.isNaN(n)) return 0;
  if (n < 0 || !Number.isFinite(n)) ctx.fail(fname + "：長さが不正です", "RangeError");
  return Math.trunc(n);
}
function bufferCalls(name, ctx) {
  if (name === "ArrayBuffer") {
    const vals = ctx.values();
    const u = propagateUnknown(vals, ctx, "ArrayBufferの引数による");
    if (u) return { handled: true, value: u };
    const length = ctx.argCount === 0 ? 0 : toIndexLength(vals[0], ctx, "ArrayBuffer");
    if (length > MAX_BUFFER_BYTES)
      ctx.fail("ArrayBufferのサイズが上限（" + MAX_BUFFER_BYTES + "バイト）を超えます", "RangeError");
    let options = {};
    const opt = vals[1];
    if (opt && typeof opt === "object" && opt.maxByteLength !== undefined) {
      const max = toIndexLength(opt.maxByteLength, ctx, "ArrayBuffer");
      if (max < length) ctx.fail("ArrayBuffer：maxByteLength が長さ未満です", "RangeError");
      options = { resizable: true, maxByteLength: max };
    }
    return { handled: true, value: makeArrayBuffer(new Array(length).fill(0), options) };
  }
  if (name === "ArrayBuffer.isView") {
    const [v] = ctx.values();
    const u = propagateUnknown([v], ctx, "ArrayBuffer.isViewの引数による", "boolean");
    if (u) return { handled: true, value: u };
    const cls = classOf(v);
    return {
      handled: true,
      value: !!cls && (TYPED_ARRAY_NAMES.includes(cls) || cls === "DataView"),
    };
  }
  if (name === "DataView") {
    const vals = ctx.values();
    const [buffer, offsetValue, lengthValue] = vals;
    const u = propagateUnknown(vals, ctx, "DataViewの引数による");
    if (u) return { handled: true, value: u };
    if (classOf(buffer) !== "ArrayBuffer")
      ctx.fail("DataView：第1引数は ArrayBuffer でなければなりません", "TypeError");
    if (buffer.detached) ctx.fail("DataView：切り離された ArrayBuffer です", "TypeError");
    const byteOffset = offsetValue === undefined ? 0 : toIndexLength(offsetValue, ctx, "DataView");
    if (byteOffset > buffer.byteLength)
      ctx.fail("DataView：byteOffset が範囲外です", "RangeError");
    const byteLength =
      lengthValue === undefined
        ? buffer.byteLength - byteOffset
        : toIndexLength(lengthValue, ctx, "DataView");
    if (byteOffset + byteLength > buffer.byteLength)
      ctx.fail("DataView：byteLength が範囲外です", "RangeError");
    return { handled: true, value: makeDataView(buffer, byteOffset, byteLength) };
  }
  if (TYPED_ARRAY_NAMES.includes(name)) {
    const vals = ctx.values();
    const [first, offsetValue, lengthValue] = vals;
    const info = TA_INFO[name];
    // JS-B5-09：Float16Array は要素変換をホスト DataView の
    // getFloat16／setFloat16 に委譲するため、不在時は構築時点で
    // 名前付き停止にする（内部式の断片を出さない）。
    if (
      name === "Float16Array" &&
      (typeof DataView.prototype.getFloat16 !== "function" ||
        typeof DataView.prototype.setFloat16 !== "function")
    )
      namedStop(ctx, "Float16Array", "ホストに実装がありません");
    const u = propagateUnknown(vals, ctx, name + "の引数による");
    if (u) return { handled: true, value: u };
    if (ctx.argCount === 0 || first === undefined)
      return { handled: true, value: taFromValues(name, [], ctx) };
    if (typeof first === "number" || typeof first === "bigint") {
      const length = toIndexLength(first, ctx, name);
      if (length * info.bpe > MAX_BUFFER_BYTES)
        ctx.fail(name + "のサイズが上限（" + MAX_BUFFER_BYTES + "バイト）を超えます", "RangeError");
      const store = { bytes: new Array(length * info.bpe).fill(0) };
      return { handled: true, value: makeTypedArray(name, store, 0, length) };
    }
    if (classOf(first) === "ArrayBuffer") {
      if (first.detached) ctx.fail(name + "：切り離された ArrayBuffer です", "TypeError");
      const byteOffset = offsetValue === undefined ? 0 : toIndexLength(offsetValue, ctx, name);
      if (byteOffset % info.bpe !== 0)
        ctx.fail(name + "：byteOffset が要素境界に揃っていません", "RangeError");
      if (byteOffset > first.byteLength)
        ctx.fail(name + "：byteOffset が範囲外です", "RangeError");
      const remaining = first.byteLength - byteOffset;
      const length =
        lengthValue === undefined
          ? Math.floor(remaining / info.bpe)
          : toIndexLength(lengthValue, ctx, name);
      if (lengthValue === undefined && remaining % info.bpe !== 0)
        ctx.fail(name + "：バッファの長さが要素サイズで割り切れません", "RangeError");
      if (length * info.bpe > remaining)
        ctx.fail(name + "：長さがバッファの範囲を超えます", "RangeError");
      return { handled: true, value: makeTypedArray(name, first.store, byteOffset, length) };
    }
    const items = iterableItems(first, ctx, name);
    if (items) {
      if (items.length * info.bpe > MAX_BUFFER_BYTES)
        ctx.fail(name + "のサイズが上限（" + MAX_BUFFER_BYTES + "バイト）を超えます", "RangeError");
      return { handled: true, value: taFromValues(name, items, ctx) };
    }
    if (first && typeof first === "object") {
      const len = toLength(Number(clean(first.length, ctx)));
      if (len * info.bpe > MAX_BUFFER_BYTES)
        ctx.fail(name + "のサイズが上限（" + MAX_BUFFER_BYTES + "バイト）を超えます", "RangeError");
      const items = [];
      for (let i = 0; i < len; i++) items.push(first[i]);
      return { handled: true, value: taFromValues(name, items, ctx) };
    }
    ctx.fail(name + "：引数を要素列として解釈できません", "TypeError");
  }
  // JS-B5-01：%TypedArray%.from／%TypedArray%.of（全12種）。
  // 構築はコンストラクタと同じ経路（iterableItems／配列状／taFromValues）
  // に揃える。第2引数の変換コールバック形だけがカタログ caution どおり
  // 名前付き未対応停止（Array.from と同文言）。
  {
    const m = /^([A-Za-z0-9]+)\.(from|of)$/.exec(name);
    if (m && TYPED_ARRAY_NAMES.includes(m[1])) {
      const taName = m[1], info = TA_INFO[taName];
      const vals = ctx.values();
      if (m[2] === "of") {
        const u = propagateUnknown(vals, ctx, name + "の引数による");
        if (u) return { handled: true, value: u };
        if (vals.length * info.bpe > MAX_BUFFER_BYTES)
          ctx.fail(name + "のサイズが上限（" + MAX_BUFFER_BYTES + "バイト）を超えます", "RangeError");
        return { handled: true, value: taFromValues(taName, vals, ctx) };
      }
      const [source, mapFn] = vals;
      const u = propagateUnknown([source], ctx, name + "の引数による");
      if (u) return { handled: true, value: u };
      if (mapFn !== undefined) callbackStop(ctx, name + "（第2引数の変換関数）");
      if (source === null || source === undefined)
        ctx.fail(name + "：null / undefined からは型付き配列を作れません", "TypeError");
      if (
        taName === "Float16Array" &&
        (typeof DataView.prototype.getFloat16 !== "function" ||
          typeof DataView.prototype.setFloat16 !== "function")
      )
        namedStop(ctx, "Float16Array", "ホストに実装がありません");
      const items = iterableItems(source, ctx, name);
      if (items) {
        if (items.length * info.bpe > MAX_BUFFER_BYTES)
          ctx.fail(name + "のサイズが上限（" + MAX_BUFFER_BYTES + "バイト）を超えます", "RangeError");
        return { handled: true, value: taFromValues(taName, items, ctx) };
      }
      if (source && typeof source === "object") {
        const len = toLength(Number(clean(source.length, ctx)));
        if (len * info.bpe > MAX_BUFFER_BYTES)
          ctx.fail(name + "のサイズが上限（" + MAX_BUFFER_BYTES + "バイト）を超えます", "RangeError");
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(source[i]);
        return { handled: true, value: taFromValues(taName, arr, ctx) };
      }
      // Node 実走：数値等の反復可能でない値は空の型付き配列になる。
      return { handled: true, value: taFromValues(taName, [], ctx) };
    }
  }
  if (name === "Uint8Array.fromBase64" || name === "Uint8Array.fromHex") {
    const vals = ctx.values();
    const u = propagateUnknown(vals, ctx, name + "の引数による");
    if (u) return { handled: true, value: u };
    if (typeof vals[0] !== "string")
      ctx.fail(name + "：第1引数は文字列でなければなりません", "TypeError");
    const bytes =
      name === "Uint8Array.fromHex" ? decodeHex(vals[0], ctx, name) : decodeBase64(vals[0], vals[1], ctx, name);
    const store = { bytes };
    return { handled: true, value: makeTypedArray("Uint8Array", store, 0, bytes.length) };
  }
  return { handled: false };
}
function decodeHex(text, ctx, fname) {
  if (text.length % 2 !== 0 || /[^0-9a-fA-F]/.test(text))
    ctx.fail(fname + "：16進数文字列が不正です", "SyntaxError");
  const out = [];
  for (let i = 0; i < text.length; i += 2) out.push(parseInt(text.slice(i, i + 2), 16));
  return out;
}
function decodeBase64(text, options, ctx, fname) {
  const urlSafe = options && typeof options === "object" && options.alphabet === "base64url";
  const alphabet = urlSafe
    ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const compact = text.replace(/[\t\n\f\r ]/g, "");
  if (/[^A-Za-z0-9+/=_-]/.test(compact) || compact.split("").some((c) => !alphabet.includes(c) && c !== "="))
    ctx.fail(fname + "：Base64文字列が不正です", "SyntaxError");
  const padAt = compact.indexOf("=");
  if (padAt >= 0 && (compact.length - padAt > 2 || !/^=+$/.test(compact.slice(padAt))))
    ctx.fail(fname + "：Base64のパディングが不正です", "SyntaxError");
  const body = padAt >= 0 ? compact.slice(0, padAt) : compact;
  if (body.length % 4 === 1)
    ctx.fail(fname + "：Base64文字列の長さが不正です", "SyntaxError");
  const out = [];
  for (let i = 0; i < body.length; i += 4) {
    const chunk = body.slice(i, i + 4);
    const vals = [...chunk].map((c) => alphabet.indexOf(c));
    const n = (vals[0] << 18) | ((vals[1] || 0) << 12) | ((vals[2] || 0) << 6) | (vals[3] || 0);
    out.push((n >> 16) & 0xff);
    if (chunk.length > 2) out.push((n >> 8) & 0xff);
    if (chunk.length > 3) out.push(n & 0xff);
  }
  return out;
}
function encodeBase64(bytes, urlSafe = false) {
  const alphabet = urlSafe
    ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = bytes.slice(i, i + 3);
    const n = (chunk[0] << 16) | ((chunk[1] || 0) << 8) | (chunk[2] || 0);
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63];
    out += chunk.length > 1 ? alphabet[(n >> 6) & 63] : "=";
    out += chunk.length > 2 ? alphabet[n & 63] : "=";
    if (urlSafe) out = out.replace(/=+$/, "");
  }
  return out;
}

/* ================= Reflect（モデルで正直に扱える範囲） ================= */

function reflectCalls(name, ctx) {
  const fn = name.slice("Reflect.".length);
  switch (fn) {
    case "get": {
      const [target, keyValue] = ctx.values();
      const u = propagateUnknown([target, keyValue], ctx, name + "の引数による");
      if (u) return { handled: true, value: u };
      if (!target || typeof target !== "object")
        ctx.fail(name + "：対象はオブジェクトでなければなりません", "TypeError");
      if (classOf(keyValue) === "Symbol") return { handled: true, value: undefined };
      const key = toPropertyKey(keyValue, ctx, name);
      const t = clean(target, ctx);
      if (classOf(t) && TYPED_ARRAY_NAMES.includes(classOf(t)) && /^\d+$/.test(key))
        return { handled: true, value: Number(key) < t.length ? taGet(t, Number(key)) : undefined };
      const got = t[key];
      // JS-B5-06（同経路）：Reflect.get でもホスト関数を値として漏らさない。
      if (typeof got === "function")
        return {
          handled: true,
          value: { ...unknown("メソッド " + key + " の値（関数値）"), valueType: "function" },
        };
      return { handled: true, value: got };
    }
    case "set": {
      const [target, keyValue, value] = ctx.values();
      const u = propagateUnknown([target, keyValue], ctx, name + "の引数による", "boolean");
      if (u) return { handled: true, value: u };
      if (!target || typeof target !== "object")
        ctx.fail(name + "：対象はオブジェクトでなければなりません", "TypeError");
      if (classOf(keyValue) === "Symbol") return { handled: true, value: false };
      const key = toPropertyKey(keyValue, ctx, name);
      const t = clean(target, ctx);
      if (isFrozenModel(t)) return { handled: true, value: false };
      if (!modelHasOwn(t, key) && !isExtensibleModel(t)) return { handled: true, value: false };
      if (classOf(t) && TYPED_ARRAY_NAMES.includes(classOf(t)) && /^\d+$/.test(key)) {
        if (Number(key) < t.length) taSet(t, Number(key), value, ctx, name);
        return { handled: true, value: true };
      }
      t[key] = value;
      return { handled: true, value: true };
    }
    case "has": {
      const [target, keyValue] = ctx.values();
      const u = propagateUnknown([target, keyValue], ctx, name + "の引数による", "boolean");
      if (u) return { handled: true, value: u };
      if (!target || typeof target !== "object")
        ctx.fail(name + "：対象はオブジェクトでなければなりません", "TypeError");
      if (classOf(keyValue) === "Symbol") return { handled: true, value: false };
      const key = toPropertyKey(keyValue, ctx, name);
      const t = clean(target, ctx);
      return {
        handled: true,
        value:
          modelHasOwn(t, key) ||
          // プロトタイプ上の Object.prototype メソッドも in では見える
          ["toString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "constructor"].includes(key),
      };
    }
    case "deleteProperty": {
      const [target, keyValue] = ctx.values();
      const u = propagateUnknown([target, keyValue], ctx, name + "の引数による", "boolean");
      if (u) return { handled: true, value: u };
      if (!target || typeof target !== "object")
        ctx.fail(name + "：対象はオブジェクトでなければなりません", "TypeError");
      if (classOf(keyValue) === "Symbol") return { handled: true, value: true };
      const key = toPropertyKey(keyValue, ctx, name);
      const t = clean(target, ctx);
      if (isFrozenModel(t) || isSealedModel(t)) return { handled: true, value: !modelHasOwn(t, key) };
      if (Array.isArray(t) && key === "length") return { handled: true, value: false };
      delete t[key];
      return { handled: true, value: true };
    }
    case "ownKeys": {
      const [target] = ctx.values();
      const u = propagateUnknown([target], ctx, name + "の引数による");
      if (u) return { handled: true, value: u };
      if (!target || typeof target !== "object")
        ctx.fail(name + "：対象はオブジェクトでなければなりません", "TypeError");
      return { handled: true, value: ownKeysAll(clean(target, ctx)) };
    }
    case "getOwnPropertyDescriptor":
      return objectStatics("Object.getOwnPropertyDescriptor", {
        ...ctx,
        values: () => ctx.values(),
      });
    case "isExtensible":
      return objectStatics("Object.isExtensible", ctx);
    case "preventExtensions":
      return objectStatics("Object.preventExtensions", ctx);
    case "apply":
    case "construct":
      namedStop(ctx, name, "関数値・コンストラクタの動的な適用はこのモデルでは表現できません");
    case "defineProperty":
      namedStop(ctx, name, "プロパティ記述子による定義はこのモデルでは表現できません");
    case "getPrototypeOf":
    case "setPrototypeOf":
      namedStop(ctx, name, "プロトタイプチェーンはこのモデルでは表現できません");
  }
  return { handled: false };
}

/* ================= 名指し停止に倒すグローバル呼び出し ================= */

function stopCalls(name, ctx) {
  if (
    name === "Promise" ||
    name.startsWith("Promise.")
  )
    asyncStop(ctx, name);
  if (name === "Proxy" || name === "Proxy.revocable")
    namedStop(ctx, name, "Proxy のメタ操作はこのモデルでは再現しません");
  if (name === "eval")
    namedStop(ctx, "eval", "動的コード実行はこのモデルでは再現しません");
  if (name === "Function")
    namedStop(ctx, "Function", "文字列からの動的関数生成（コード生成）はこのモデルでは再現しません");
  if (name === "WeakRef")
    namedStop(ctx, "WeakRef", "ガベージコレクションのタイミングに依存するため決定的に再現できません");
  if (name === "FinalizationRegistry")
    namedStop(ctx, "FinalizationRegistry", "ガベージコレクションのタイミングに依存するため決定的に再現できません");
  if (name === "SharedArrayBuffer")
    namedStop(ctx, "SharedArrayBuffer", "共有メモリはホスト環境（cross-origin isolation 等）に依存するため未対応です");
  if (name.startsWith("Atomics."))
    namedStop(ctx, name, "共有メモリ上の原子操作はこのモデルでは再現しません");
  if (name === "Iterator" || name.startsWith("Iterator."))
    namedStop(ctx, name, "反復子オブジェクトは値としてこのモデルでは表現できません");
  if (name === "Map.groupBy") callbackStop(ctx, "Map.groupBy");
  if (name === "DisposableStack" || name === "AsyncDisposableStack")
    namedStop(ctx, name, "コールバック（defer／adopt／use）の登録を前提とするため未対応です");
  return { handled: false };
}

/* ================= グローバル呼び出しのディスパッチ ================= */

export function advancedGlobalCall(name, ctx) {
  if (name.startsWith("Math.")) {
    const fn = name.slice(5);
    if (MATH_HOST_FNS.includes(fn) || fn === "random" || fn === "sumPrecise")
      return { handled: true, value: mathCall(fn, ctx) };
    return { handled: false };
  }
  const stopped = stopCalls(name, ctx); // 該当すれば ctx.fail で停止する
  void stopped;
  for (const group of [
    globalCallHandlers,
    objectStatics,
    arrayStatics,
    jsonCalls,
    symbolCalls,
    errorCalls,
    collectionCalls,
    dateCalls,
    bufferCalls,
    reflectCalls,
  ]) {
    const r = group(name, ctx);
    if (r.handled) return r;
  }
  return { handled: false };
}

// index.js の EAGER 集合へ追加する名前（引数を実 JavaScript どおり
// 先に評価する対象）。名指し停止に倒す名前は含めない（未対応関数は
// 引数を評価しないという既存の流儀に従う）。
export const ADVANCED_EAGER_NAMES = [
  "parseFloat", "isNaN", "isFinite",
  "encodeURI", "decodeURI", "encodeURIComponent", "decodeURIComponent",
  "Number.isFinite", "Number.isInteger", "Number.isNaN", "Number.isSafeInteger",
  "Number.parseFloat", "Number.parseInt",
  "String.fromCharCode", "String.fromCodePoint", "String.raw",
  "BigInt.asIntN", "BigInt.asUintN",
  "Object.assign", "Object.keys", "Object.values", "Object.entries",
  "Object.fromEntries", "Object.freeze", "Object.seal", "Object.preventExtensions",
  "Object.isFrozen", "Object.isSealed", "Object.isExtensible", "Object.is",
  "Object.hasOwn", "Object.create", "Object.getOwnPropertyDescriptor",
  "Object.getOwnPropertyDescriptors", "Object.getOwnPropertyNames",
  "Object.getOwnPropertySymbols", "Object",
  "Array", "Array.isArray", "Array.of", "Array.from",
  "JSON.parse", "JSON.rawJSON", "JSON.isRawJSON",
  "Symbol", "Symbol.for", "Symbol.keyFor",
  "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError",
  "EvalError", "URIError", "AggregateError", "SuppressedError", "Error.isError",
  "RegExp", "RegExp.escape",
  "Map", "Set", "WeakMap", "WeakSet",
  "Date", "Date.parse", "Date.UTC", "Date.now",
  "ArrayBuffer", "ArrayBuffer.isView", "DataView",
  "Reflect.get", "Reflect.set", "Reflect.has", "Reflect.deleteProperty",
  "Reflect.ownKeys", "Reflect.getOwnPropertyDescriptor",
  "Reflect.isExtensible", "Reflect.preventExtensions",
  ...MATH_HOST_FNS.map((f) => "Math." + f),
  "Math.random", "Math.sumPrecise",
  ...TYPED_ARRAY_NAMES,
  // JS-B5-01：%TypedArray%.from／.of も引数を先に評価する対象に加える。
  ...TYPED_ARRAY_NAMES.flatMap((n) => [n + ".from", n + ".of"]),
  "Uint8Array.fromBase64", "Uint8Array.fromHex",
];
// typeof で "function" と答えるべき実在の関数名（呼び出し自体が
// 名指し停止になるものも含む。実 JavaScript の typeof の答えが正本）。
export const TYPEOF_FUNCTION_NAMES = [
  "parseFloat", "isNaN", "isFinite", "eval",
  "encodeURI", "decodeURI", "encodeURIComponent", "decodeURIComponent",
  ...MATH_HOST_FNS.map((f) => "Math." + f),
  "Math.abs", "Math.floor", "Math.round", "Math.random", "Math.sumPrecise",
  "Number.isFinite", "Number.isInteger", "Number.isNaN", "Number.isSafeInteger",
  "Number.parseFloat", "Number.parseInt",
  "String.fromCharCode", "String.fromCodePoint", "String.raw",
  "BigInt.asIntN", "BigInt.asUintN",
  "Object.assign", "Object.keys", "Object.values", "Object.entries",
  "Object.fromEntries", "Object.freeze", "Object.seal", "Object.preventExtensions",
  "Object.isFrozen", "Object.isSealed", "Object.isExtensible", "Object.is",
  "Object.hasOwn", "Object.create", "Object.defineProperty",
  "Object.defineProperties", "Object.getOwnPropertyDescriptor",
  "Object.getOwnPropertyDescriptors", "Object.getOwnPropertyNames",
  "Object.getOwnPropertySymbols", "Object.getPrototypeOf", "Object.setPrototypeOf",
  "Object.groupBy",
  "Array.isArray", "Array.of", "Array.from", "Array.fromAsync",
  "JSON.parse", "JSON.rawJSON", "JSON.isRawJSON",
  "Symbol.for", "Symbol.keyFor",
  "Error.isError", "RegExp.escape",
  "Date.parse", "Date.UTC", "Date.now",
  "ArrayBuffer.isView", "Uint8Array.fromBase64", "Uint8Array.fromHex",
  ...TYPED_ARRAY_NAMES.flatMap((n) => [n + ".from", n + ".of"]),
  "Promise.all", "Promise.allSettled", "Promise.any", "Promise.race",
  "Promise.reject", "Promise.resolve", "Promise.try", "Promise.withResolvers",
  "Proxy.revocable",
  "Reflect.apply", "Reflect.construct", "Reflect.defineProperty",
  "Reflect.deleteProperty", "Reflect.get", "Reflect.getOwnPropertyDescriptor",
  "Reflect.getPrototypeOf", "Reflect.has", "Reflect.isExtensible",
  "Reflect.ownKeys", "Reflect.preventExtensions", "Reflect.set",
  "Reflect.setPrototypeOf",
  "Atomics.add", "Atomics.and", "Atomics.compareExchange", "Atomics.exchange",
  "Atomics.isLockFree", "Atomics.load", "Atomics.notify", "Atomics.or",
  "Atomics.pause", "Atomics.store", "Atomics.sub", "Atomics.wait",
  "Atomics.waitAsync", "Atomics.xor",
  "Iterator.from", "Iterator.concat", "Iterator.zip", "Iterator.zipKeyed",
  "Map.groupBy",
  // 単独名（コンストラクタ・名前空間オブジェクト自体は typeof の対象に
  // ならないが、関数であるコンストラクタ名は "function" と答える）
  "EvalError", "URIError", "AggregateError", "SuppressedError",
  "WeakMap", "WeakSet", "ArrayBuffer", "DataView",
  "WeakRef", "FinalizationRegistry", "SharedArrayBuffer",
  "DisposableStack", "AsyncDisposableStack", "Iterator", "Proxy",
  "Function", "escape", "unescape",
  ...TYPED_ARRAY_NAMES,
];

/* ================= 文字列化（String／連結／表示の基礎） ================= */

export function modelToString(v, ctx) {
  const cls = classOf(v);
  if (!cls) return { handled: false };
  switch (cls) {
    case "Date":
      // 実 JavaScript の Date の文字列化は現地時間形式だが、このモデル
      // ではタイムゾーンを保持しないため、決定的な UTC 形式で代える。
      return { handled: true, value: new Date(v.time).toUTCString() };
    case "RegExp":
      return { handled: true, value: "/" + v.source + "/" + v.flags };
    case "Symbol":
      return {
        handled: true,
        value: "Symbol(" + (v.description === undefined ? "" : v.description) + ")",
      };
    case "RawJSON":
      return { handled: true, value: "[object Object]" };
    default:
      if (ERROR_CLASS_NAMES.has(cls))
        return {
          handled: true,
          value: v.message === "" ? v.name : v.name === "" ? v.message : v.name + ": " + v.message,
        };
      if (TYPED_ARRAY_NAMES.includes(cls))
        return {
          handled: true,
          value: taElements(v)
            .map((x) => (x === null || x === undefined ? "" : String(x)))
            .join(","),
        };
      return { handled: true, value: "[object " + cls + "]" };
  }
}
// 引数をホストの文字列メソッドへ渡すための変換（タグ付き値はモデル
// 文字列へ、配列はカンマ連結、それ以外はホストの ToString に委ねる）。
function hostStringArg(v, ctx) {
  if (typeof v === "string") return v;
  if (isModelValue(v)) return modelToString(v, ctx).value;
  if (Array.isArray(v)) return ctx.jsStringValue(v);
  return v;
}
function numArg(v, ctx, fname) {
  const cls = classOf(v);
  if (cls === "Date") return v.time;
  if (cls === "Symbol") ctx.fail("Symbolを数値へ変換できません", "TypeError");
  if (cls === "RegExp" || cls === "Map" || cls === "Set") return NaN;
  return clean(v, ctx);
}

/* ================= メンバ呼び出しディスパッチ ================= */

const CALLBACK_MEMBER_METHODS = new Set([
  "map", "filter", "reduce", "reduceRight", "forEach", "find", "findIndex",
  "findLast", "findLastIndex", "some", "every", "flatMap",
]);
const ITERATOR_MEMBER_METHODS = new Set(["keys", "values", "entries"]);
const KNOWN_MEMBER_METHODS = new Set([
  ...CALLBACK_MEMBER_METHODS, ...ITERATOR_MEMBER_METHODS,
  "at", "charAt", "charCodeAt", "codePointAt", "concat", "copyWithin",
  "endsWith", "fill", "flat", "includes", "indexOf", "lastIndexOf",
  "padEnd", "padStart", "repeat", "replace", "replaceAll", "slice",
  "splice", "split", "startsWith", "substring", "toLowerCase",
  "toUpperCase", "toLocaleLowerCase", "toLocaleUpperCase", "trim",
  "trimStart", "trimEnd", "normalize", "isWellFormed", "toWellFormed",
  "match", "matchAll", "search", "localeCompare", "toString", "valueOf",
  "toExponential", "toFixed", "toPrecision", "toLocaleString",
  "reverse", "shift", "unshift", "sort", "toReversed", "toSorted",
  "toSpliced", "with", "hasOwnProperty", "propertyIsEnumerable",
  "isPrototypeOf", "get", "set", "has", "delete", "clear", "add",
  "getOrInsert", "getOrInsertComputed", "union", "intersection",
  "difference", "symmetricDifference", "isSubsetOf", "isSupersetOf",
  "isDisjointFrom", "exec", "test", "getTime", "setTime",
  "toISOString", "toUTCString", "toJSON", "toDateString", "toTimeString",
  "getTimezoneOffset",
]);

function memberUnknown(ctx, source, valueType) {
  const out = { ...unknown(source), };
  if (valueType) out.valueType = valueType;
  return { handled: true, value: out };
}
function guardStringLength(ctx, text) {
  // P-N1：文字列結果も値サイズ上限の対象（実体を作らず未確定値へ倒す）。
  if (typeof text === "string" && text.length > 200000)
    return { ...unknown("とても長い文字列"), valueType: "string" };
  return text;
}

/* ---- 文字列レシーバ ---- */
function stringMember(receiver, method, ctx) {
  const fail = (m, c) => ctx.fail(m, c);
  const vals = () => ctx.values().map((v) => clean(v, ctx));
  const propagate = (values, source, vt) => {
    const u = propagateUnknown(values, ctx, source, vt);
    return u ? { handled: true, value: u } : null;
  };
  const HOST_SIMPLE = [
    "at", "charAt", "charCodeAt", "codePointAt", "concat", "endsWith",
    "includes", "indexOf", "lastIndexOf", "slice", "substring",
    "toLowerCase", "toUpperCase", "trim", "trimStart", "trimEnd",
    "normalize", "isWellFormed", "toWellFormed",
  ];
  if (HOST_SIMPLE.includes(method)) {
    const args = vals();
    const p = propagate(args, "String.prototype." + method + "の引数による",
      ["includes", "endsWith", "startsWith"].includes(method) ? "boolean"
        : ["indexOf", "lastIndexOf", "charCodeAt", "codePointAt"].includes(method) ? "number" : "string");
    if (p) return p;
    const NUMERIC_ARG_METHODS = ["at", "charAt", "charCodeAt", "codePointAt", "slice", "substring"];
    const hostArgs = args.map((v, i) =>
      NUMERIC_ARG_METHODS.includes(method)
        ? numArg(v, ctx, method)
        : i === 0 || method === "concat"
          ? hostStringArg(v, ctx)
          : numArg(v, ctx, method),
    );
    // JS-B5-09（同型点検）：動的なホスト委譲は有無を先に検査する。
    if (typeof receiver[method] !== "function")
      namedStop(ctx, "String.prototype." + method, "ホストに実装がありません");
    try {
      return { handled: true, value: guardStringLength(ctx, receiver[method](...hostArgs)) };
    } catch (e) {
      hostFail(ctx, e, "String.prototype." + method);
    }
  }
  switch (method) {
    case "startsWith": {
      const args = vals();
      const p = propagate(args, "String.prototype.startsWithの引数による", "boolean");
      if (p) return p;
      if (classOf(args[0]) === "RegExp")
        fail("String.prototype.startsWith：引数は正規表現にはできません", "TypeError");
      return {
        handled: true,
        value: receiver.startsWith(hostStringArg(args[0], ctx), args.length > 1 ? numArg(args[1], ctx, method) : undefined),
      };
    }
    case "padStart":
    case "padEnd": {
      const args = vals();
      const p = propagate(args, "String.prototype." + method + "の引数による", "string");
      if (p) return p;
      const target = args[0] === undefined ? 0 : Number(numArg(args[0], ctx, method));
      if (Number.isFinite(target) && target > 200000)
        return memberUnknown(ctx, "とても長い文字列", "string");
      try {
        return {
          handled: true,
          value: guardStringLength(ctx, receiver[method](args[0], args.length > 1 ? hostStringArg(args[1], ctx) : undefined)),
        };
      } catch (e) {
        hostFail(ctx, e, "String.prototype." + method);
      }
    }
    case "repeat": {
      const args = vals();
      const p = propagate(args, "String.prototype.repeatの引数による", "string");
      if (p) return p;
      const count = args[0] === undefined ? 0 : Number(numArg(args[0], ctx, method));
      if (Number.isFinite(count) && receiver.length * Math.max(0, Math.floor(count)) > 200000)
        return memberUnknown(ctx, "とても長い文字列", "string");
      try {
        return { handled: true, value: guardStringLength(ctx, receiver.repeat(args[0])) };
      } catch (e) {
        hostFail(ctx, e, "String.prototype.repeat");
      }
    }
    case "match":
    case "search": {
      const args = vals();
      const p = propagate(args, "String.prototype." + method + "の引数による");
      if (p) return p;
      const arg = args[0];
      let re;
      if (classOf(arg) === "RegExp") re = hostRegExp(arg);
      else if (arg === undefined && method === "match") re = new RegExp("");
      else re = new RegExp(hostStringArg(arg, ctx));
      if (method === "search") return { handled: true, value: receiver.search(re) };
      if (re.global) {
        re.lastIndex = 0;
        const out = [];
        let m;
        while ((m = re.exec(receiver)) !== null) {
          out.push(m[0]);
          if (m[0] === "") re.lastIndex++;
          if (out.length > 200000) fail("配列の要素数が上限（200000）を超えます", "RangeError");
        }
        return { handled: true, value: out.length ? out : null };
      }
      re.lastIndex = 0;
      const m = re.exec(receiver);
      if (!m) return { handled: true, value: null };
      const out = [...m];
      out.index = m.index;
      out.input = m.input;
      out.groups = m.groups;
      return { handled: true, value: out };
    }
    case "matchAll":
      namedStop(ctx, "String.prototype.matchAll", "反復子オブジェクトは値としてこのモデルでは表現できません");
    case "replace":
    case "replaceAll": {
      const args = vals();
      const p = propagate(args, "String.prototype." + method + "の引数による", "string");
      if (p) return p;
      const [search, replacement] = args;
      const replacementText =
        replacement === undefined ? "undefined" : hostStringArg(replacement, ctx);
      try {
        if (classOf(search) === "RegExp") {
          const re = hostRegExp(search);
          if (method === "replaceAll" && !re.global)
            fail("String.prototype.replaceAll：正規表現には g フラグが必要です", "TypeError");
          re.lastIndex = 0;
          return { handled: true, value: guardStringLength(ctx, receiver[method](re, replacementText)) };
        }
        const searchText = hostStringArg(search, ctx);
        return { handled: true, value: guardStringLength(ctx, receiver[method](searchText, replacementText)) };
      } catch (e) {
        hostFail(ctx, e, "String.prototype." + method);
      }
    }
    case "split": {
      const args = vals();
      const p = propagate(args, "String.prototype.splitの引数による");
      if (p) return p;
      const [sep, limit] = args;
      if (sep === undefined) return { handled: true, value: [receiver] };
      const limitValue = limit === undefined ? undefined : Number(numArg(limit, ctx, method)) >>> 0;
      let out;
      if (classOf(sep) === "RegExp") {
        const re = hostRegExp(sep);
        out = receiver.split(re, limitValue);
      } else {
        out = receiver.split(hostStringArg(sep, ctx), limitValue);
      }
      if (out.length > 200000) fail("配列の要素数が上限（200000）を超えます", "RangeError");
      return { handled: true, value: out };
    }
    case "toString":
    case "valueOf":
      return { handled: true, value: receiver };
    case "localeCompare":
    case "toLocaleLowerCase":
    case "toLocaleUpperCase":
      fail(
        "String.prototype." + method + " はロケール（言語・地域設定）に依存するため未確認です",
        "未確認",
      );
  }
  return { handled: false };
}

/* ---- 数値・真偽値・BigInt レシーバ ---- */
function numberMember(receiver, method, ctx) {
  const vals = () => ctx.values().map((v) => clean(v, ctx));
  switch (method) {
    case "toFixed":
    case "toExponential":
    case "toPrecision": {
      const args = vals();
      const p = propagateUnknown(args, ctx, "Number.prototype." + method + "の引数による", "string");
      if (p) return { handled: true, value: p };
      if (typeof receiver[method] !== "function")
        namedStop(ctx, "Number.prototype." + method, "ホストに実装がありません");
      try {
        return { handled: true, value: receiver[method](args[0] === undefined ? undefined : numArg(args[0], ctx, method)) };
      } catch (e) {
        hostFail(ctx, e, "Number.prototype." + method);
      }
    }
    case "toString": {
      const args = vals();
      const p = propagateUnknown(args, ctx, "Number.prototype.toStringの引数による", "string");
      if (p) return { handled: true, value: p };
      if (args.length === 0 || args[0] === undefined)
        return { handled: true, value: String(receiver) };
      try {
        return { handled: true, value: receiver.toString(numArg(args[0], ctx, method)) };
      } catch (e) {
        hostFail(ctx, e, "Number.prototype.toString");
      }
    }
    case "valueOf":
      return { handled: true, value: receiver };
    case "toLocaleString":
      ctx.fail("Number.prototype.toLocaleString はロケールに依存するため未確認です", "未確認");
  }
  return { handled: false };
}
function booleanMember(receiver, method, ctx) {
  if (method === "toString") return { handled: true, value: String(receiver) };
  if (method === "valueOf") return { handled: true, value: receiver };
  return { handled: false };
}
function bigIntMember(receiver, method, ctx) {
  switch (method) {
    case "toString": {
      const args = ctx.values();
      const p = propagateUnknown(args, ctx, "BigInt.prototype.toStringの引数による", "string");
      if (p) return { handled: true, value: p };
      try {
        return {
          handled: true,
          value: args.length === 0 || args[0] === undefined
            ? receiver.toString()
            : receiver.toString(numArg(clean(args[0], ctx), ctx, method)),
        };
      } catch (e) {
        hostFail(ctx, e, "BigInt.prototype.toString");
      }
    }
    case "valueOf":
      return { handled: true, value: receiver };
    case "toLocaleString":
      ctx.fail("BigInt.prototype.toLocaleString はロケールに依存するため未確認です", "未確認");
  }
  return { handled: false };
}

/* ---- 配列レシーバ ---- */
function arrayToString(receiver, ctx) {
  return receiver
    .map((el) => {
      if (el === null || el === undefined) return "";
      if (isModelValue(el)) return modelToString(el, ctx).value;
      if (Array.isArray(el)) return arrayToString(el, ctx);
      return ctx.jsStringValue(el);
    })
    .join(",");
}
function defaultSortCopy(source, ctx) {
  // 既定の sort：要素を文字列化して UTF-16 コード単位順に安定ソートし、
  // undefined は末尾、穴は最後に集める（ECMA-262 の SortCompare 既定）。
  const defined = [], undefs = [];
  let holes = 0;
  for (let i = 0; i < source.length; i++) {
    if (!(i in source)) holes++;
    else if (source[i] === undefined) undefs.push(undefined);
    else defined.push(source[i]);
  }
  const decorated = defined.map((v, i) => [v, i]);
  decorated.sort((a, b) => {
    const sa = isModelValue(a[0]) ? modelToString(a[0], ctx).value : ctx.jsStringValue(a[0]),
      sb = isModelValue(b[0]) ? modelToString(b[0], ctx).value : ctx.jsStringValue(b[0]);
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return a[1] - b[1];
  });
  return { sorted: decorated.map(([v]) => v), undefs, holes };
}
function arrayMember(receiver, method, ctx) {
  const fname = "Array.prototype." + method;
  if (CALLBACK_MEMBER_METHODS.has(method)) callbackStop(ctx, fname);
  if (ITERATOR_MEMBER_METHODS.has(method))
    namedStop(ctx, fname, "反復子オブジェクトは値としてこのモデルでは表現できません");
  const vals = () => ctx.values().map((v) => clean(v, ctx));
  const propagate = (values, source, vt) => {
    const u = propagateUnknown(values, ctx, source, vt);
    return u ? { handled: true, value: u } : null;
  };
  const frozenCheck = () => {
    if (isFrozenModel(receiver)) ctx.fail(fname + "：凍結された配列は変更できません", "TypeError");
  };
  const lengthGuard = (n) => {
    if (n > 200000) ctx.fail("配列の要素数が上限（200000）を超えます", "RangeError");
  };
  switch (method) {
    case "at": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const i = relativeIndex(numArg(args[0], ctx, method), receiver.length);
      return { handled: true, value: i < 0 ? undefined : receiver[i] };
    }
    case "concat": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const out = [...receiver];
      for (const a of args) {
        if (Array.isArray(a) && !ctx.isRecordLikeArray(a)) out.push(...a);
        else out.push(a);
      }
      lengthGuard(out.length);
      return { handled: true, value: out };
    }
    case "copyWithin": {
      frozenCheck();
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      Array.prototype.copyWithin.call(
        receiver,
        numArg(args[0], ctx, method),
        args.length > 1 ? numArg(args[1], ctx, method) : undefined,
        args.length > 2 ? numArg(args[2], ctx, method) : undefined,
      );
      return { handled: true, value: receiver };
    }
    case "fill": {
      frozenCheck();
      const args = vals();
      const p = propagate(args.slice(1), fname + "の引数による");
      if (p) return p;
      Array.prototype.fill.call(
        receiver,
        args[0],
        args.length > 1 ? numArg(args[1], ctx, method) : undefined,
        args.length > 2 ? numArg(args[2], ctx, method) : undefined,
      );
      return { handled: true, value: receiver };
    }
    case "flat": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const depth = args.length === 0 || args[0] === undefined ? 1 : Number(numArg(args[0], ctx, method));
      const out = [];
      const walk = (arr, d) => {
        for (let i = 0; i < arr.length; i++) {
          if (!(i in arr)) continue;
          const el = arr[i];
          if (Array.isArray(el) && !ctx.isRecordLikeArray(el) && d > 0) walk(el, d - 1);
          else out.push(el);
          if (out.length > 200000) ctx.fail("配列の要素数が上限（200000）を超えます", "RangeError");
        }
      };
      walk(receiver, Number.isNaN(depth) ? 0 : depth);
      return { handled: true, value: out };
    }
    case "includes": {
      const args = vals();
      const p = propagate(args.slice(1), fname + "の引数による", "boolean");
      if (p) return p;
      const from = args.length > 1 ? toIntegerOrInfinity(Number(numArg(args[1], ctx, method))) : 0;
      const start = from >= 0 ? from : Math.max(0, receiver.length + from);
      for (let i = start; i < receiver.length; i++)
        if (sameValueZero(receiver[i], args[0])) return { handled: true, value: true };
      return { handled: true, value: false };
    }
    case "indexOf":
    case "lastIndexOf": {
      const args = vals();
      const p = propagate(args, fname + "の引数による", "number");
      if (p) return p;
      // fromIndex に undefined を明示的に渡すと実仕様では NaN→0 扱いに
      // なる（lastIndexOf で省略時と結果が変わる）ため、引数の有無を保つ。
      const value =
        args.length > 1
          ? Array.prototype[method].call(receiver, args[0], numArg(args[1], ctx, method))
          : Array.prototype[method].call(receiver, args[0]);
      return { handled: true, value };
    }
    case "slice": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      return {
        handled: true,
        value: Array.prototype.slice.call(
          receiver,
          args.length > 0 ? numArg(args[0], ctx, method) : undefined,
          args.length > 1 ? numArg(args[1], ctx, method) : undefined,
        ),
      };
    }
    case "splice": {
      frozenCheck();
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      if (args.length === 0) return { handled: true, value: [] };
      const start = toIntegerOrInfinity(Number(numArg(args[0], ctx, method)));
      const actualStart = start < 0 ? Math.max(receiver.length + start, 0) : Math.min(start, receiver.length);
      const deleteCount =
        args.length === 1
          ? receiver.length - actualStart
          : Math.min(Math.max(toIntegerOrInfinity(Number(numArg(args[1], ctx, method))), 0), receiver.length - actualStart);
      lengthGuard(receiver.length - deleteCount + Math.max(0, args.length - 2));
      const removed = Array.prototype.splice.call(receiver, actualStart, deleteCount, ...args.slice(2));
      return { handled: true, value: removed };
    }
    case "reverse": {
      frozenCheck();
      ctx.values();
      Array.prototype.reverse.call(receiver);
      return { handled: true, value: receiver };
    }
    case "shift": {
      frozenCheck();
      ctx.values();
      return { handled: true, value: Array.prototype.shift.call(receiver) };
    }
    case "unshift": {
      frozenCheck();
      const args = vals();
      const p = propagate(args, fname + "の引数による", "number");
      if (p) return p;
      lengthGuard(receiver.length + args.length);
      return { handled: true, value: Array.prototype.unshift.call(receiver, ...args) };
    }
    case "sort": {
      const args = vals();
      if (args.length > 0 && args[0] !== undefined) {
        if (isUnknown(args[0])) return propagate(args, fname + "の引数による");
        ctx.fail(
          fname + "：比較関数は関数値が必要なため未対応です（この方言では関数値は存在しません）",
          "未対応",
        );
      }
      frozenCheck();
      const { sorted, undefs, holes } = defaultSortCopy(receiver, ctx);
      let i = 0;
      for (const v of sorted) receiver[i++] = v;
      for (const v of undefs) receiver[i++] = v;
      for (let h = 0; h < holes; h++) delete receiver[i++];
      return { handled: true, value: receiver };
    }
    case "toSorted": {
      const args = vals();
      if (args.length > 0 && args[0] !== undefined) {
        if (isUnknown(args[0])) return propagate(args, fname + "の引数による");
        ctx.fail(
          fname + "：比較関数は関数値が必要なため未対応です（この方言では関数値は存在しません）",
          "未対応",
        );
      }
      const { sorted, undefs, holes } = defaultSortCopy(receiver, ctx);
      const out = new Array(receiver.length);
      let i = 0;
      for (const v of sorted) out[i++] = v;
      for (const v of undefs) out[i++] = v;
      void holes;
      return { handled: true, value: out };
    }
    case "toReversed": {
      ctx.values();
      const out = new Array(receiver.length);
      for (let i = 0; i < receiver.length; i++) out[i] = receiver[receiver.length - 1 - i];
      return { handled: true, value: out };
    }
    case "toSpliced": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const copy = Array.prototype.slice.call(receiver);
      if (args.length === 0) return { handled: true, value: copy };
      const start = toIntegerOrInfinity(Number(numArg(args[0], ctx, method)));
      const actualStart = start < 0 ? Math.max(copy.length + start, 0) : Math.min(start, copy.length);
      const deleteCount =
        args.length === 1
          ? copy.length - actualStart
          : Math.min(Math.max(toIntegerOrInfinity(Number(numArg(args[1], ctx, method))), 0), copy.length - actualStart);
      lengthGuard(copy.length - deleteCount + Math.max(0, args.length - 2));
      Array.prototype.splice.call(copy, actualStart, deleteCount, ...args.slice(2));
      return { handled: true, value: copy };
    }
    case "with": {
      const args = vals();
      const p = propagate(args.slice(0, 1), fname + "の引数による");
      if (p) return p;
      const index = toIntegerOrInfinity(Number(numArg(args[0], ctx, method)));
      const actual = index >= 0 ? index : receiver.length + index;
      if (actual < 0 || actual >= receiver.length)
        ctx.fail(fname + "：添字が範囲外です", "RangeError");
      const out = Array.prototype.slice.call(receiver);
      out[actual] = args[1];
      return { handled: true, value: out };
    }
    case "toString":
      ctx.values();
      return { handled: true, value: guardStringLength(ctx, arrayToString(receiver, ctx)) };
    case "toLocaleString":
      ctx.fail(fname + " はロケールに依存するため未確認です", "未確認");
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
    case "hasOwnProperty":
    case "propertyIsEnumerable": {
      const args = vals();
      const key = toPropertyKey(args[0], ctx, "Object.prototype." + method);
      if (method === "hasOwnProperty") return { handled: true, value: modelHasOwn(receiver, key) };
      return {
        handled: true,
        value: ownEnumerableEntries(receiver).some(([k]) => k === key),
      };
    }
    case "isPrototypeOf":
      namedStop(ctx, "Object.prototype.isPrototypeOf", "プロトタイプチェーンはこのモデルでは表現できません");
  }
  return { handled: false };
}

/* ---- 通常オブジェクトレシーバ（Object.prototype のメソッド） ---- */
function plainObjectMember(receiver, method, ctx) {
  switch (method) {
    case "hasOwnProperty": {
      const args = ctx.values();
      const key = toPropertyKey(args[0], ctx, "Object.prototype.hasOwnProperty");
      return { handled: true, value: modelHasOwn(clean(receiver, ctx), key) };
    }
    case "propertyIsEnumerable": {
      const args = ctx.values();
      const key = toPropertyKey(args[0], ctx, "Object.prototype.propertyIsEnumerable");
      return {
        handled: true,
        value: ownEnumerableEntries(clean(receiver, ctx)).some(([k]) => k === key),
      };
    }
    case "isPrototypeOf":
      namedStop(ctx, "Object.prototype.isPrototypeOf", "プロトタイプチェーンはこのモデルでは表現できません");
    case "toString":
      ctx.values();
      return { handled: true, value: "[object Object]" };
    case "toLocaleString":
      ctx.fail("Object.prototype.toLocaleString はロケールに依存するため未確認です", "未確認");
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
  }
  return { handled: false };
}

/* ---- モデル値レシーバ ---- */
function mapMember(receiver, method, ctx, weak) {
  const fname = (weak ? "WeakMap" : "Map") + ".prototype." + method;
  const vals = () => ctx.values().map((v) => clean(v, ctx));
  switch (method) {
    case "get": {
      const [key] = vals();
      if (isUnknown(key)) return memberUnknown(ctx, fname + "のキーによる");
      if (weak) {
        const found = receiver.entries.find(([k]) => k === key);
        return { handled: true, value: found ? found[1] : undefined };
      }
      return { handled: true, value: mapGet(receiver, key) };
    }
    case "set": {
      const [key, value] = vals();
      if (isUnknown(key)) return memberUnknown(ctx, fname + "のキーによる");
      if (weak) {
        assertWeakKey(key, ctx, fname);
        const found = receiver.entries.find(([k]) => k === key);
        if (found) found[1] = value;
        else receiver.entries.push([key, value]);
        return { handled: true, value: receiver };
      }
      mapSet(receiver, key, value);
      return { handled: true, value: receiver };
    }
    case "has": {
      const [key] = vals();
      if (isUnknown(key)) return memberUnknown(ctx, fname + "のキーによる", "boolean");
      return {
        handled: true,
        value: weak
          ? receiver.entries.some(([k]) => k === key)
          : mapHas(receiver, key),
      };
    }
    case "delete": {
      const [key] = vals();
      if (isUnknown(key)) return memberUnknown(ctx, fname + "のキーによる", "boolean");
      if (weak) {
        const i = receiver.entries.findIndex(([k]) => k === key);
        if (i < 0) return { handled: true, value: false };
        receiver.entries.splice(i, 1);
        return { handled: true, value: true };
      }
      return { handled: true, value: mapDelete(receiver, key) };
    }
    case "clear":
      if (weak) return { handled: false };
      ctx.values();
      receiver.entries = [];
      receiver.size = 0;
      return { handled: true, value: undefined };
    case "getOrInsert": {
      const [key, value] = vals();
      if (isUnknown(key)) return memberUnknown(ctx, fname + "のキーによる");
      if (weak) {
        assertWeakKey(key, ctx, fname);
        const found = receiver.entries.find(([k]) => k === key);
        if (found) return { handled: true, value: found[1] };
        receiver.entries.push([key, value]);
        return { handled: true, value: value };
      }
      if (mapHas(receiver, key)) return { handled: true, value: mapGet(receiver, key) };
      mapSet(receiver, key, value);
      return { handled: true, value: value };
    }
    case "getOrInsertComputed":
      callbackStop(ctx, fname);
    case "forEach":
      callbackStop(ctx, fname);
    case "keys":
    case "values":
    case "entries":
      namedStop(ctx, fname, "反復子オブジェクトは値としてこのモデルでは表現できません");
    case "toString":
      ctx.values();
      return { handled: true, value: "[object " + (weak ? "WeakMap" : "Map") + "]" };
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
  }
  return { handled: false };
}
function setMember(receiver, method, ctx, weak) {
  const fname = (weak ? "WeakSet" : "Set") + ".prototype." + method;
  const vals = () => ctx.values().map((v) => clean(v, ctx));
  const otherSet = (v) => {
    if (isUnknown(v)) return "unknown";
    if (classOf(v) !== "Set")
      namedStop(ctx, fname, "引数は Set（モデル値）でなければなりません");
    return v;
  };
  switch (method) {
    case "add": {
      const [v] = vals();
      if (isUnknown(v)) return memberUnknown(ctx, fname + "の引数による");
      if (weak) {
        assertWeakKey(v, ctx, fname);
        if (!receiver.values.includes(v)) receiver.values.push(v);
        return { handled: true, value: receiver };
      }
      return { handled: true, value: setAdd(receiver, v) };
    }
    case "has": {
      const [v] = vals();
      if (isUnknown(v)) return memberUnknown(ctx, fname + "の引数による", "boolean");
      return {
        handled: true,
        value: weak ? receiver.values.includes(v) : setHas(receiver, v),
      };
    }
    case "delete": {
      const [v] = vals();
      if (isUnknown(v)) return memberUnknown(ctx, fname + "の引数による", "boolean");
      if (weak) {
        const i = receiver.values.indexOf(v);
        if (i < 0) return { handled: true, value: false };
        receiver.values.splice(i, 1);
        return { handled: true, value: true };
      }
      return { handled: true, value: setDelete(receiver, v) };
    }
    case "clear":
      if (weak) return { handled: false };
      ctx.values();
      receiver.values = [];
      receiver.size = 0;
      return { handled: true, value: undefined };
    case "union":
    case "intersection":
    case "difference":
    case "symmetricDifference": {
      if (weak) return { handled: false };
      const [other] = vals();
      const o = otherSet(other);
      if (o === "unknown") return memberUnknown(ctx, fname + "の引数による");
      let result;
      if (method === "union") result = makeSet([...receiver.values, ...o.values]);
      else if (method === "intersection")
        result = makeSet(receiver.values.filter((v) => setHas(o, v)));
      else if (method === "difference")
        result = makeSet(receiver.values.filter((v) => !setHas(o, v)));
      else
        result = makeSet([
          ...receiver.values.filter((v) => !setHas(o, v)),
          ...o.values.filter((v) => !setHas(receiver, v)),
        ]);
      return { handled: true, value: result };
    }
    case "isSubsetOf":
    case "isSupersetOf":
    case "isDisjointFrom": {
      if (weak) return { handled: false };
      const [other] = vals();
      const o = otherSet(other);
      if (o === "unknown") return memberUnknown(ctx, fname + "の引数による", "boolean");
      return {
        handled: true,
        value:
          method === "isSubsetOf"
            ? receiver.values.every((v) => setHas(o, v))
            : method === "isSupersetOf"
              ? o.values.every((v) => setHas(receiver, v))
              : receiver.values.every((v) => !setHas(o, v)),
      };
    }
    case "forEach":
      callbackStop(ctx, fname);
    case "keys":
    case "values":
    case "entries":
      namedStop(ctx, fname, "反復子オブジェクトは値としてこのモデルでは表現できません");
    case "toString":
      ctx.values();
      return { handled: true, value: "[object " + (weak ? "WeakSet" : "Set") + "]" };
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
  }
  return { handled: false };
}

const DATE_UTC_GETTERS = {
  getUTCFullYear: "getUTCFullYear", getUTCMonth: "getUTCMonth",
  getUTCDate: "getUTCDate", getUTCDay: "getUTCDay",
  getUTCHours: "getUTCHours", getUTCMinutes: "getUTCMinutes",
  getUTCSeconds: "getUTCSeconds", getUTCMilliseconds: "getUTCMilliseconds",
};
const DATE_LOCAL_METHODS = new Set([
  "getFullYear", "getMonth", "getDate", "getDay", "getHours", "getMinutes",
  "getSeconds", "getMilliseconds", "getTimezoneOffset",
  "setFullYear", "setMonth", "setDate", "setHours", "setMinutes",
  "setSeconds", "setMilliseconds",
  "toString", "toDateString", "toTimeString",
  "toLocaleString", "toLocaleDateString", "toLocaleTimeString",
]);
const DATE_UTC_SETTERS = new Set([
  "setUTCFullYear", "setUTCMonth", "setUTCDate", "setUTCHours",
  "setUTCMinutes", "setUTCSeconds", "setUTCMilliseconds",
]);
function dateMember(receiver, method, ctx) {
  const fname = "Date.prototype." + method;
  const host = () => new Date(receiver.time);
  if (method === "getTime" || method === "valueOf") {
    ctx.values();
    return { handled: true, value: receiver.time };
  }
  // B5-JS Date文字列化修正：DATE_UTC_GETTERS は通常のオブジェクト
  // リテラルなので、素の添字参照では Object.prototype の継承プロパティ
  // （toString／toLocaleString／hasOwnProperty／constructor 等）が
  // 真値として拾われ、存在しないホストメソッドを呼んで TypeError →
  // 汎用エラー（「処理中に予期しないエラーが発生しました」）に化けて
  // いた。GLOBAL_PROPS と同じく自前のキーだけを Object.hasOwn で判定
  // する。これにより toString／toLocaleString は下の DATE_LOCAL_METHODS
  // の名前付き「未確認」停止へ、Object.prototype 系の名前は従来の
  // 名指し未対応停止へ、それぞれ正しく届く。
  if (Object.hasOwn(DATE_UTC_GETTERS, method)) {
    ctx.values();
    // JS-B5-09（同型点検）：動的なホスト委譲は有無を先に検査する。
    if (typeof host()[DATE_UTC_GETTERS[method]] !== "function")
      namedStop(ctx, fname, "ホストに実装がありません");
    return { handled: true, value: host()[DATE_UTC_GETTERS[method]]() };
  }
  if (method === "setTime" || DATE_UTC_SETTERS.has(method)) {
    const args = ctx.values().map((v) => clean(v, ctx));
    const p = propagateUnknown(args, ctx, fname + "の引数による", "number");
    if (p) return { handled: true, value: p };
    for (const v of args) assertNotSymbolOrBigIntForNumber(v, ctx, fname);
    if (method === "setTime") {
      receiver.time = timeClip(Number(args[0]));
      return { handled: true, value: receiver.time };
    }
    const d = host();
    if (typeof d[method] !== "function")
      namedStop(ctx, fname, "ホストに実装がありません");
    const nums = args.map((v) => Number(v));
    d[method](...nums.slice(0, ctx.argCount));
    receiver.time = d.getTime();
    return { handled: true, value: receiver.time };
  }
  switch (method) {
    case "toISOString": {
      ctx.values();
      if (typeof host().toISOString !== "function")
        namedStop(ctx, fname, "ホストに実装がありません");
      try {
        return { handled: true, value: host().toISOString() };
      } catch (e) {
        hostFail(ctx, e, fname);
      }
    }
    case "toUTCString":
      ctx.values();
      return { handled: true, value: host().toUTCString() };
    case "toJSON": {
      ctx.values();
      return {
        handled: true,
        value: Number.isNaN(receiver.time) ? null : host().toISOString(),
      };
    }
    case "toString":
      // ローカル形式のため下のローカル系で未確認に倒す
      break;
  }
  // A5班監査: toLocaleDateString／toLocaleTimeString のカタログ
  // caution はロケール依存を理由としており、現地時間だけを理由と
  // する停止文言と食い違っていた。両方の依存を併記して揃える。
  if (method === "toLocaleDateString" || method === "toLocaleTimeString")
    ctx.fail(
      fname + " はロケール（言語・地域設定）と現地時間（タイムゾーン）に依存するため未確認です",
      "未確認",
    );
  if (DATE_LOCAL_METHODS.has(method))
    ctx.fail(
      fname + " は現地時間（タイムゾーン）に依存するため未確認です（UTC 系のメソッドは対応しています）",
      "未確認",
    );
  return { handled: false };
}

function regExpMember(receiver, method, ctx) {
  const fname = "RegExp.prototype." + method;
  const vals = () => ctx.values().map((v) => clean(v, ctx));
  switch (method) {
    case "exec":
    case "test": {
      const args = vals();
      const p = propagateUnknown(args, ctx, fname + "の引数による", method === "test" ? "boolean" : undefined);
      if (p) return { handled: true, value: p };
      if (classOf(args[0]) === "Symbol") ctx.fail("Symbolを文字列へ変換できません", "TypeError");
      const text = ctx.jsStringValue(args[0]);
      const re = hostRegExp(receiver);
      const m = re.exec(text);
      receiver.lastIndex = re.lastIndex;
      if (method === "test") return { handled: true, value: m !== null };
      if (!m) return { handled: true, value: null };
      const out = [...m];
      out.index = m.index;
      out.input = m.input;
      out.groups = m.groups;
      return { handled: true, value: out };
    }
    case "toString":
      ctx.values();
      return { handled: true, value: "/" + receiver.source + "/" + receiver.flags };
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
  }
  return { handled: false };
}

function arrayBufferMember(receiver, method, ctx) {
  const fname = "ArrayBuffer.prototype." + method;
  const vals = () => ctx.values().map((v) => clean(v, ctx));
  switch (method) {
    case "slice": {
      const args = vals();
      const p = propagateUnknown(args, ctx, fname + "の引数による");
      if (p) return { handled: true, value: p };
      if (receiver.detached) ctx.fail(fname + "：切り離された ArrayBuffer です", "TypeError");
      const len = receiver.byteLength;
      const begin = args.length === 0 || args[0] === undefined ? 0 : toIntegerOrInfinity(Number(numArg(args[0], ctx, method)));
      const end = args.length < 2 || args[1] === undefined ? len : toIntegerOrInfinity(Number(numArg(args[1], ctx, method)));
      const from = begin < 0 ? Math.max(len + begin, 0) : Math.min(begin, len);
      const to = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
      const bytes = bufferBytes(receiver).slice(from, Math.max(from, to));
      return {
        handled: true,
        value: makeArrayBuffer(bytes, receiver.resizable
          ? { resizable: true, maxByteLength: receiver.maxByteLength }
          : {}),
      };
    }
    case "resize": {
      const args = vals();
      const p = propagateUnknown(args, ctx, fname + "の引数による");
      if (p) return { handled: true, value: p };
      if (!receiver.resizable)
        ctx.fail(fname + "：サイズ変更可能な ArrayBuffer ではありません", "TypeError");
      if (receiver.detached) ctx.fail(fname + "：切り離された ArrayBuffer です", "TypeError");
      const newLength = toIndexLength(args[0], ctx, fname);
      if (newLength > receiver.maxByteLength || newLength > MAX_BUFFER_BYTES)
        ctx.fail(fname + "：新しい長さが上限を超えます", "RangeError");
      const bytes = bufferBytes(receiver);
      if (newLength < bytes.length) bytes.length = newLength;
      else while (bytes.length < newLength) bytes.push(0);
      receiver.byteLength = newLength;
      return { handled: true, value: undefined };
    }
    case "transfer":
    case "transferToFixedLength": {
      const args = vals();
      const p = propagateUnknown(args, ctx, fname + "の引数による");
      if (p) return { handled: true, value: p };
      if (receiver.detached) ctx.fail(fname + "：切り離された ArrayBuffer です", "TypeError");
      const newLength =
        args.length === 0 || args[0] === undefined
          ? receiver.byteLength
          : toIndexLength(args[0], ctx, fname);
      if (receiver.resizable && newLength > receiver.maxByteLength)
        ctx.fail(fname + "：新しい長さが上限を超えます", "RangeError");
      if (newLength > MAX_BUFFER_BYTES)
        ctx.fail(fname + "：新しい長さが上限を超えます", "RangeError");
      const bytes = bufferBytes(receiver).slice(0, newLength);
      while (bytes.length < newLength) bytes.push(0);
      const out = makeArrayBuffer(bytes,
        method === "transfer" && receiver.resizable
          ? { resizable: true, maxByteLength: receiver.maxByteLength }
          : {});
      receiver.detached = true;
      receiver.store.bytes = [];
      receiver.byteLength = 0;
      receiver.store.detached = true;
      return { handled: true, value: out };
    }
    case "toString":
      ctx.values();
      return { handled: true, value: "[object ArrayBuffer]" };
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
  }
  return { handled: false };
}

const DV_METHODS = {
  getInt8: 1, getUint8: 1, getInt16: 2, getUint16: 2, getInt32: 4,
  getUint32: 4, getFloat16: 2, getFloat32: 4, getFloat64: 8,
  getBigInt64: 8, getBigUint64: 8,
  setInt8: 1, setUint8: 1, setInt16: 2, setUint16: 2, setInt32: 4,
  setUint32: 4, setFloat16: 2, setFloat32: 4, setFloat64: 8,
  setBigInt64: 8, setBigUint64: 8,
};
function dataViewMember(receiver, method, ctx) {
  const fname = "DataView.prototype." + method;
  // B5-JS Date文字列化修正（同型の兄弟表面）：`in` はプロトタイプ
  // チェーンも見るため、toString／valueOf 等の継承名が DV_METHODS に
  // あると誤判定され、本来の "[object DataView]" 等を返さず素通りして
  // いた。自前のキーだけを Object.hasOwn で判定する（DATE_UTC_GETTERS
  // と同根）。
  if (!Object.hasOwn(DV_METHODS, method)) {
    if (method === "toString") {
      ctx.values();
      return { handled: true, value: "[object DataView]" };
    }
    if (method === "valueOf") {
      ctx.values();
      return { handled: true, value: receiver };
    }
    return { handled: false };
  }
  const args = ctx.values().map((v) => clean(v, ctx));
  const p = propagateUnknown(args, ctx, fname + "の引数による");
  if (p) return { handled: true, value: p };
  if (receiver.buffer.detached) ctx.fail(fname + "：切り離された ArrayBuffer です", "TypeError");
  const host = dvHost(receiver);
  // JS-B5-09：getFloat16／setFloat16 等、ホストに無いメソッドは内部式
  // （host[method] is not a function）を出さず名前付き停止にする。
  if (typeof host[method] !== "function")
    namedStop(ctx, fname, "ホストに実装がありません");
  try {
    if (method.startsWith("get"))
      return { handled: true, value: host[method](numArg(args[0], ctx, method), args[1]) };
    host[method](numArg(args[0], ctx, method), numArg(args[1], ctx, method), args[2]);
    dvWriteBack(receiver, host);
    return { handled: true, value: undefined };
  } catch (e) {
    hostFail(ctx, e, fname);
  }
}

/* ---- TypedArray レシーバ ---- */
function typedArrayMember(receiver, method, ctx) {
  const cls = receiver.__class;
  const fname = cls + ".prototype." + method;
  if (CALLBACK_MEMBER_METHODS.has(method)) callbackStop(ctx, fname);
  if (ITERATOR_MEMBER_METHODS.has(method))
    namedStop(ctx, fname, "反復子オブジェクトは値としてこのモデルでは表現できません");
  const vals = () => ctx.values().map((v) => clean(v, ctx));
  const propagate = (values, source, vt) => {
    const u = propagateUnknown(values, ctx, source, vt);
    return u ? { handled: true, value: u } : null;
  };
  const elements = () => taElements(receiver);
  const writeAll = (els) => {
    els.forEach((v, i) => taSet(receiver, i, v, ctx, fname));
  };
  switch (method) {
    case "at": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const i = relativeIndex(numArg(args[0], ctx, method), receiver.length);
      return { handled: true, value: i < 0 ? undefined : taGet(receiver, i) };
    }
    case "copyWithin": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const els = elements();
      Array.prototype.copyWithin.call(
        els,
        numArg(args[0], ctx, method),
        args.length > 1 ? numArg(args[1], ctx, method) : undefined,
        args.length > 2 ? numArg(args[2], ctx, method) : undefined,
      );
      writeAll(els);
      return { handled: true, value: receiver };
    }
    case "fill": {
      const args = vals();
      const p = propagate(args.slice(1), fname + "の引数による");
      if (p) return p;
      const els = elements();
      Array.prototype.fill.call(
        els,
        args[0],
        args.length > 1 ? numArg(args[1], ctx, method) : undefined,
        args.length > 2 ? numArg(args[2], ctx, method) : undefined,
      );
      writeAll(els);
      return { handled: true, value: receiver };
    }
    case "includes":
    case "indexOf":
    case "lastIndexOf": {
      const args = vals();
      const p = propagate(args, fname + "の引数による", method === "includes" ? "boolean" : "number");
      if (p) return p;
      const els = elements();
      if (method === "includes") {
        const from = args.length > 1 ? toIntegerOrInfinity(Number(numArg(args[1], ctx, method))) : 0;
        const start = from >= 0 ? from : Math.max(0, els.length + from);
        for (let i = start; i < els.length; i++)
          if (sameValueZero(els[i], args[0])) return { handled: true, value: true };
        return { handled: true, value: false };
      }
      return {
        handled: true,
        value:
          args.length > 1
            ? Array.prototype[method].call(els, args[0], numArg(args[1], ctx, method))
            : Array.prototype[method].call(els, args[0]),
      };
    }
    case "join": {
      const args = vals();
      const p = propagate(args, fname + "の引数による", "string");
      if (p) return p;
      const sep = args.length === 0 || args[0] === undefined ? "," : hostStringArg(args[0], ctx);
      return {
        handled: true,
        value: guardStringLength(ctx, elements().map((x) => (x === null || x === undefined ? "" : String(x))).join(sep)),
      };
    }
    case "reverse": {
      ctx.values();
      writeAll(elements().reverse());
      return { handled: true, value: receiver };
    }
    case "set": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const offset = args.length > 1 && args[1] !== undefined ? toIntegerOrInfinity(Number(numArg(args[1], ctx, method))) : 0;
      if (offset < 0) ctx.fail(fname + "：書き込み位置が範囲外です", "RangeError");
      let items = null;
      if (Array.isArray(args[0])) items = args[0];
      else if (classOf(args[0]) && TYPED_ARRAY_NAMES.includes(classOf(args[0]))) items = taElements(args[0]);
      if (!items) ctx.fail(fname + "：第1引数は配列または TypedArray でなければなりません", "TypeError");
      if (offset + items.length > receiver.length)
        ctx.fail(fname + "：書き込みが範囲を超えます", "RangeError");
      items.forEach((v, i) => taSet(receiver, offset + i, v, ctx, fname));
      return { handled: true, value: undefined };
    }
    case "slice": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const els = Array.prototype.slice.call(
        elements(),
        args.length > 0 ? numArg(args[0], ctx, method) : undefined,
        args.length > 1 ? numArg(args[1], ctx, method) : undefined,
      );
      return { handled: true, value: taFromValues(cls, els, ctx) };
    }
    case "subarray": {
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      const len = receiver.length;
      const begin = args.length === 0 || args[0] === undefined ? 0 : toIntegerOrInfinity(Number(numArg(args[0], ctx, method)));
      const end = args.length < 2 || args[1] === undefined ? len : toIntegerOrInfinity(Number(numArg(args[1], ctx, method)));
      const from = begin < 0 ? Math.max(len + begin, 0) : Math.min(begin, len);
      const to = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
      const info = TA_INFO[cls];
      return {
        handled: true,
        value: makeTypedArray(cls, receiver.store, receiver.byteOffset + from * info.bpe, Math.max(0, to - from)),
      };
    }
    case "sort": {
      const args = vals();
      if (args.length > 0 && args[0] !== undefined) {
        if (isUnknown(args[0])) return propagate(args, fname + "の引数による");
        ctx.fail(fname + "：比較関数は関数値が必要なため未対応です（この方言では関数値は存在しません）", "未対応");
      }
      const els = elements();
      els.sort((a, b) => {
        // TypedArray の既定ソートは数値順（NaN は最後）。
        const aNaN = typeof a === "number" && Number.isNaN(a);
        const bNaN = typeof b === "number" && Number.isNaN(b);
        if (aNaN || bNaN) return aNaN ? (bNaN ? 0 : 1) : -1;
        return a < b ? -1 : a > b ? 1 : 0;
      });
      writeAll(els);
      return { handled: true, value: receiver };
    }
    case "toSorted": {
      const args = vals();
      if (args.length > 0 && args[0] !== undefined) {
        if (isUnknown(args[0])) return propagate(args, fname + "の引数による");
        ctx.fail(fname + "：比較関数は関数値が必要なため未対応です（この方言では関数値は存在しません）", "未対応");
      }
      const els = elements();
      els.sort((a, b) => {
        const aNaN = typeof a === "number" && Number.isNaN(a);
        const bNaN = typeof b === "number" && Number.isNaN(b);
        if (aNaN || bNaN) return aNaN ? (bNaN ? 0 : 1) : -1;
        return a < b ? -1 : a > b ? 1 : 0;
      });
      return { handled: true, value: taFromValues(cls, els, ctx) };
    }
    case "toReversed": {
      ctx.values();
      return { handled: true, value: taFromValues(cls, elements().reverse(), ctx) };
    }
    case "with": {
      const args = vals();
      const p = propagate(args.slice(0, 1), fname + "の引数による");
      if (p) return p;
      const index = toIntegerOrInfinity(Number(numArg(args[0], ctx, method)));
      const actual = index >= 0 ? index : receiver.length + index;
      if (actual < 0 || actual >= receiver.length)
        ctx.fail(fname + "：添字が範囲外です", "RangeError");
      const els = elements();
      els[actual] = args[1];
      return { handled: true, value: taFromValues(cls, els, ctx) };
    }
    case "toString":
      return typedArrayMember(receiver, "join", { ...ctx, values: () => [], argCount: 0 });
    case "toLocaleString":
      ctx.fail(fname + " はロケールに依存するため未確認です", "未確認");
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
    case "setFromBase64":
    case "setFromHex": {
      if (cls !== "Uint8Array") return { handled: false };
      const args = vals();
      const p = propagate(args, fname + "の引数による");
      if (p) return p;
      if (typeof args[0] !== "string")
        ctx.fail(fname + "：第1引数は文字列でなければなりません", "TypeError");
      const bytes =
        method === "setFromHex"
          ? decodeHex(args[0], ctx, fname)
          : decodeBase64(args[0], args[1], ctx, fname);
      if (bytes.length > receiver.length)
        ctx.fail(fname + "：書き込みが範囲を超えます", "RangeError");
      bytes.forEach((b, i) => taSet(receiver, i, b, ctx, fname));
      return { handled: true, value: { read: args[0].length, written: bytes.length } };
    }
    case "toBase64": {
      if (cls !== "Uint8Array") return { handled: false };
      const args = vals();
      const urlSafe = args[0] && typeof args[0] === "object" && args[0].alphabet === "base64url";
      return { handled: true, value: encodeBase64(elements(), urlSafe) };
    }
    case "toHex": {
      if (cls !== "Uint8Array") return { handled: false };
      ctx.values();
      return {
        handled: true,
        value: elements().map((b) => b.toString(16).padStart(2, "0")).join(""),
      };
    }
  }
  return { handled: false };
}

/* ---- Symbol／Error レシーバ ---- */
function symbolMember(receiver, method, ctx) {
  switch (method) {
    case "toString":
      ctx.values();
      return {
        handled: true,
        value: "Symbol(" + (receiver.description === undefined ? "" : receiver.description) + ")",
      };
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
  }
  return { handled: false };
}
function errorMember(receiver, method, ctx) {
  switch (method) {
    case "toString": {
      ctx.values();
      const { name, message } = receiver;
      return {
        handled: true,
        value: message === "" ? name : name === "" ? String(message) : name + ": " + message,
      };
    }
    case "valueOf":
      ctx.values();
      return { handled: true, value: receiver };
  }
  return { handled: false };
}

/* ---- ディスパッチ本体 ---- */
function dispatchMemberCall(ctx) {
  const receiver = ctx.receiver, method = ctx.method;
  if (isUnknown(receiver)) {
    if (KNOWN_MEMBER_METHODS.has(method) || CALLBACK_MEMBER_METHODS.has(method))
      return memberUnknown(ctx, "実行時のオブジェクトのメソッド " + method + " の結果");
    return { handled: false };
  }
  if (receiver === null || receiver === undefined) {
    if (KNOWN_MEMBER_METHODS.has(method))
      ctx.fail("null / undefined のメソッドは呼び出せません：" + method, "TypeError");
    return { handled: false };
  }
  const cls = classOf(receiver);
  if (cls) {
    if ((cls === "Map" || cls === "WeakMap") && !(cls === "WeakMap" && method === "clear"))
      return mapMember(receiver, method, ctx, cls === "WeakMap");
    if (cls === "Set" || cls === "WeakSet")
      return setMember(receiver, method, ctx, cls === "WeakSet");
    if (cls === "Date") return dateMember(receiver, method, ctx);
    if (cls === "RegExp") return regExpMember(receiver, method, ctx);
    if (cls === "ArrayBuffer") return arrayBufferMember(receiver, method, ctx);
    if (cls === "DataView") return dataViewMember(receiver, method, ctx);
    if (TYPED_ARRAY_NAMES.includes(cls)) {
      if (receiver.store.detached)
        ctx.fail(cls + "：切り離された ArrayBuffer のビューです", "TypeError");
      return typedArrayMember(receiver, method, ctx);
    }
    if (cls === "Symbol") return symbolMember(receiver, method, ctx);
    if (ERROR_CLASS_NAMES.has(cls)) return errorMember(receiver, method, ctx);
    return { handled: false };
  }
  if (Array.isArray(receiver)) {
    if (ctx.isRecordLikeArray(receiver) && ["toString", "hasOwnProperty", "propertyIsEnumerable", "isPrototypeOf", "valueOf", "toLocaleString"].includes(method))
      return plainObjectMember(receiver, method, ctx);
    return arrayMember(receiver, method, ctx);
  }
  switch (typeof receiver) {
    case "string":
      return stringMember(receiver, method, ctx);
    case "number":
      return numberMember(receiver, method, ctx);
    case "boolean":
      return booleanMember(receiver, method, ctx);
    case "bigint":
      return bigIntMember(receiver, method, ctx);
    case "object": {
      if (ctx.isDomNode(receiver)) return { handled: false };
      return plainObjectMember(receiver, method, ctx);
    }
  }
  return { handled: false };
}

/* ---- JS-B5-04／05／11：レシーバ種別を問わないフォールバック ----
 * 種別別ディスパッチが handled: false を返したメソッドだけをここで
 * 処理する（既存ディスパッチが処理済みの呼び出しは横取りしない）。
 * - hasOwnProperty／propertyIsEnumerable（JS-B5-04）：全レシーバで
 *   Node 実走の期待値に合わせる。判定表は Node v24 実測の範囲だけを
 *   固定し、それ以外は false に倒す（誤った true は誤値になるため）。
 * - isPrototypeOf／__defineGetter__ 等（JS-B5-05）：全レシーバで
 *   名前付き未対応停止に統一する。
 * - toLocaleString（JS-B5-05）：未確認停止が欠けていたモデル値等に
 *   未確認停止を足す。文字列・真偽値は Node 実走（複数ロケール）で
 *   toString と同一値になることを確認したため実値を返す。
 * - Iterator ヘルパー名（JS-B5-11）：drop／take／chunks／windows／
 *   toArray は、どのレシーバでも Iterator.prototype.<名> を名指す
 *   未対応停止にする。同名の正規メソッドは種別別ディスパッチが
 *   先に処理するため、ここへは到達しない。 */
const ITERATOR_HELPER_NAMES = new Set(["drop", "take", "chunks", "windows", "toArray"]);
const LOCALE_UNVERIFIED_CLASSES = new Set([
  "Map", "Set", "WeakMap", "WeakSet", "RegExp", "ArrayBuffer", "DataView", "Symbol",
]);
function fallbackOwnInfo(receiver, ctx, enumerableOnly) {
  const args = ctx.values();
  const key = toPropertyKey(args[0], ctx, "Object.prototype." + ctx.method);
  if (typeof receiver === "string") {
    const isIndex = /^(0|[1-9]\d*)$/.test(key) && Number(key) < receiver.length;
    return enumerableOnly ? isIndex : key === "length" || isIndex;
  }
  if (!receiver || typeof receiver !== "object") return false;
  const cls = classOf(receiver);
  if (cls) {
    if (enumerableOnly) {
      // 列挙可能として true になるのは、TypedArray の範囲内インデックスと
      // 利用者が代入した追加プロパティだけ（Node 実測：RegExp の
      // lastIndex、エラーの message／errors 等は列挙不可）。
      if (TYPED_ARRAY_NAMES.includes(cls) &&
          /^(0|[1-9]\d*)$/.test(key) && Number(key) < receiver.length)
        return true;
      return modelHasExtraOwn(receiver, key);
    }
    return modelHasOwn(receiver, key);
  }
  return enumerableOnly
    ? ownEnumerableEntries(clean(receiver, ctx)).some(([k]) => k === key)
    : modelHasOwn(clean(receiver, ctx), key);
}
function memberCallFallback(ctx) {
  const receiver = ctx.receiver, method = ctx.method;
  if (receiver === null || receiver === undefined || isUnknown(receiver))
    return { handled: false };
  if (method === "isPrototypeOf")
    namedStop(ctx, "Object.prototype.isPrototypeOf", "プロトタイプチェーンはこのモデルでは表現できません");
  if (["__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"].includes(method))
    callbackStop(ctx, "Object.prototype." + method);
  if (ITERATOR_HELPER_NAMES.has(method))
    namedStop(ctx, "Iterator.prototype." + method, "反復子オブジェクトは値としてこのモデルでは表現できません");
  if (method === "hasOwnProperty" || method === "propertyIsEnumerable")
    return {
      handled: true,
      value: fallbackOwnInfo(receiver, ctx, method === "propertyIsEnumerable"),
    };
  if (method === "toLocaleString") {
    if (typeof receiver === "string") {
      ctx.values();
      return { handled: true, value: receiver };
    }
    if (typeof receiver === "boolean") {
      ctx.values();
      return { handled: true, value: String(receiver) };
    }
    const cls = classOf(receiver);
    if (cls && (LOCALE_UNVERIFIED_CLASSES.has(cls) || ERROR_CLASS_NAMES.has(cls)))
      ctx.fail("Object.prototype.toLocaleString はロケールに依存するため未確認です", "未確認");
  }
  return { handled: false };
}
export function advancedMemberCall(ctx) {
  const result = dispatchMemberCall(ctx);
  if (result && result.handled) return result;
  return memberCallFallback(ctx);
}

/* ================= 表示・JSON・添字アクセスの統合ヘルパ ================= */

// displayValue（index.js）から使う表示変換。recurse は index.js 側の
// displayValue 自身（入れ子の値を同じ規則で変換するため）。
export function toDisplayModel(v, recurse) {
  const cls = classOf(v);
  if (!cls) return { handled: false };
  switch (cls) {
    case "Date":
      return {
        handled: true,
        value: Number.isNaN(v.time) ? "Invalid Date" : new Date(v.time).toISOString(),
      };
    case "RegExp":
      return { handled: true, value: "/" + v.source + "/" + v.flags };
    case "Symbol":
      return {
        handled: true,
        value: "Symbol(" + (v.description === undefined ? "" : v.description) + ")",
      };
    case "RawJSON":
      return { handled: true, value: { rawJSON: v.raw } };
    case "ArrayBuffer":
      return { handled: true, value: { __class: "ArrayBuffer", byteLength: v.byteLength } };
    case "DataView":
      return {
        handled: true,
        value: { __class: "DataView", byteLength: v.byteLength, byteOffset: v.byteOffset },
      };
    default:
      if (ERROR_CLASS_NAMES.has(cls))
        return {
          handled: true,
          value: v.message === "" ? v.name : v.name + ": " + v.message,
        };
      if (TYPED_ARRAY_NAMES.includes(cls))
        return {
          handled: true,
          value: { __class: cls, data: taElements(v).map((x) => recurse(x)) },
        };
      return { handled: false };
  }
}
// JSON.stringify 用の変換（Date は toJSON、Map／Set 等は {}、
// TypedArray は添字オブジェクト、シンボルは undefined）。
// JS-B5-10：RawJSON の埋め込みはホストの JSON.rawJSON に依存しない。
// 呼び出し側（index.js の JSON.stringify）が用意した rawSink（配列）に
// { placeholder, raw } を登録し、RawJSON の位置には呼び出しごとに一意な
// プレースホルダ文字列を置く。文字列化後にプレースホルダの JSON 文字列
// リテラルごと raw テキストへ置換するため、ホストに JSON.rawJSON が
// 無い環境でも黙って undefined にならず、利用者の文字列と偶然一致する
// ことも（トークンが呼び出しごとに変わるため）実質ない。
let rawJsonTokenCounter = 0;
export function makeRawJsonToken() {
  rawJsonTokenCounter += 1;
  return (
    "rawjson" + rawJsonTokenCounter.toString(36) + "x" +
    Math.floor(Math.random() * 0xffffffff).toString(36)
  );
}
export function toJsonModel(v, seen = new Set(), rawSink = null, rawToken = "") {
  const cls = classOf(v);
  if (cls === "Date")
    return Number.isNaN(v.time) ? null : new Date(v.time).toISOString();
  if (cls === "Symbol") return undefined;
  if (cls === "RawJSON") {
    if (rawSink) {
      const placeholder =
        "\u0000" + rawToken + ":" + encodeURIComponent(v.raw) + "\u0000";
      rawSink.push({ placeholder, raw: v.raw });
      return placeholder;
    }
    // rawSink が無い経路（単体利用）ではホストがあれば使い、無ければ
    // プレースホルダ方式が使えないため従来どおり undefined にしない：
    // 生テキストをそのまま文字列として埋める誤値を避け、未対応を明示
    // できないこの関数の契約上はホスト変換のみを試みる。
    try {
      return JSON.rawJSON(v.raw);
    } catch {
      return undefined;
    }
  }
  if (cls) {
    if (TYPED_ARRAY_NAMES.includes(cls)) {
      const out = {};
      taElements(v).forEach((x, i) => {
        out[String(i)] = x;
      });
      return out;
    }
    return {};
  }
  if (!v || typeof v !== "object") return v;
  if (seen.has(v)) return v; // 循環はホスト JSON.stringify に検出させる
  seen.add(v);
  if (Array.isArray(v)) return v.map((x) => toJsonModel(x, seen, rawSink, rawToken));
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (MARKER_KEYS.has(k)) continue;
    out[k] = toJsonModel(x, seen, rawSink, rawToken);
  }
  return out;
}
// BigInt を含むモデル値（BigInt64Array 等）の検出（JSON 用）。
export function modelContainsBigInt(v, seen = new Set()) {
  const cls = classOf(v);
  if (cls && (cls === "BigInt64Array" || cls === "BigUint64Array")) return v.length > 0;
  if (!v || typeof v !== "object" || seen.has(v)) return false;
  seen.add(v);
  return Object.values(v).some((x) => modelContainsBigInt(x, seen));
}
// JS-B5-03：Symbol キーの読み取り。モデル Symbol（wellKnown）をキーに
// した [Symbol.toStringTag] は、レシーバ種別ごとのタグ文字列を返す
// （課題指定の裁定：Object.prototype.toString が返す組み込みタグと
// 同じ表。Map／Set／WeakMap／WeakSet／Date／RegExp／Error 系／
// ArrayBuffer／DataView／各 TypedArray／Symbol はモデル種別名、
// 通常オブジェクトと RawJSON は "Object"、配列は "Array"、文字列は
// "String"、数値は "Number"、真偽値は "Boolean"、BigInt は "BigInt"）。
// [Symbol.unscopables] は配列に対してのみ、Node v24 実走で確認した
// 16キー（at／copyWithin／entries／fill／find／findIndex／findLast／
// findLastIndex／flat／flatMap／includes／keys／toReversed／toSorted／
// toSpliced／values）が全て true の通常オブジェクトを返す。
// それ以外の Symbol キー・レシーバは従来挙動（handled: false）のまま。
export function toStringTagOf(v) {
  const cls = classOf(v);
  if (cls) {
    if (ERROR_CLASS_NAMES.has(cls)) return "Error";
    if (cls === "RawJSON") return "Object";
    return cls;
  }
  if (Array.isArray(v)) return "Array";
  switch (typeof v) {
    case "string": return "String";
    case "number": return "Number";
    case "boolean": return "Boolean";
    case "bigint": return "BigInt";
    case "object": return v === null ? undefined : "Object";
    default: return undefined;
  }
}
const ARRAY_UNSCOPABLE_KEYS = [
  "at", "copyWithin", "entries", "fill", "find", "findIndex", "findLast",
  "findLastIndex", "flat", "flatMap", "includes", "keys", "toReversed",
  "toSorted", "toSpliced", "values",
];
export function advancedSymbolIndexRead(v, index) {
  if (classOf(index) !== "Symbol" || !index.wellKnown) return { handled: false };
  if (index.wellKnown === "toStringTag") {
    const tag = toStringTagOf(v);
    return tag === undefined ? { handled: false } : { handled: true, value: tag };
  }
  if (index.wellKnown === "unscopables" && Array.isArray(v)) {
    const out = {};
    for (const k of ARRAY_UNSCOPABLE_KEYS) out[k] = true;
    return { handled: true, value: out };
  }
  return { handled: false };
}
// 添字読み取り（TypedArray の要素アクセス）。
export function advancedIndexRead(v, index) {
  const sym = advancedSymbolIndexRead(v, index);
  if (sym.handled) return sym;
  const cls = classOf(v);
  if (!cls || !TYPED_ARRAY_NAMES.includes(cls)) return { handled: false };
  if (v.store.detached) return { handled: false };
  const key = typeof index === "number" ? String(index) : index;
  if (typeof key === "string" && /^-?\d+$/.test(key)) {
    const i = Number(key);
    if (String(i) !== key && !(key === "-0")) return { handled: false };
    return { handled: true, value: i >= 0 && i < v.length ? taGet(v, i) : undefined };
  }
  return { handled: false };
}
// 添字・メンバ書き込み（TypedArray の要素書き込みと、読み取り専用
// プロパティへの書き込みの無視）。handled=false なら通常の書き込みへ。
export function advancedIndexWrite(obj, key, value, ctx) {
  const cls = classOf(obj);
  if (!cls) return false;
  if (TYPED_ARRAY_NAMES.includes(cls)) {
    const k = typeof key === "number" ? String(key) : key;
    if (typeof k === "string" && /^-?\d+$/.test(k) && String(Number(k)) === k) {
      if (obj.store.detached)
        ctx.fail(cls + "：切り離された ArrayBuffer のビューです", "TypeError");
      const i = Number(k);
      if (i >= 0 && i < obj.length) taSet(obj, i, value, ctx, cls);
      return true; // 範囲外の添字書き込みは実 JavaScript でも黙って無視される
    }
    if (["length", "byteLength", "byteOffset", "BYTES_PER_ELEMENT"].includes(k))
      return true; // 読み取り専用プロパティへの書き込みは黙って無視される
    return false;
  }
  if ((cls === "Map" || cls === "Set") && key === "size") return true;
  if (cls === "ArrayBuffer" && ["byteLength", "maxByteLength", "resizable", "detached"].includes(key))
    return true;
  if (cls === "DataView" && ["byteLength", "byteOffset", "buffer"].includes(key)) return true;
  return false;
}
