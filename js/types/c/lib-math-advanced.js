// 高度モード（ブロックB6）: <math.h> と <tgmath.h> 総称振り分けの
// 意味論ハンドラ。担当班 C1（math/tgmath）。
// ハンドラ署名: (args, values, s, api, node, H) => 値。
//
// モデル規則（裁定メモ＋課題指示）:
// - f 版は結果を float に丸める（Math.fround）。l 版は long double を
//   double として計算する。接尾辞なし（<tgmath.h> 型総称マクロと同名）
//   は第1引数の型が float のとき f 版として結果を float に丸める。
// - 定義域エラーは NaN、log(0) は -Inf、pow(0,-1) は Inf など、実 C
//   （glibc）の振る舞いに合わせる。JS の Math は大半が IEEE 754 で
//   glibc と一致するため、差異がある箇所だけ補正する。
// - JS に無い関数（erf/erfc/tgamma/lgamma/fma 等）は数値実装する。
//   erf は級数（|x|<2）＋連分数（|x|>=2）、tgamma/lgamma は Lanczos
//   近似＋反射公式、fma は Dekker 分解による補償演算。
// - lgamma の signgam 格納は未対応（リファレンス項目の caution に明記）。
// - 分類マクロの定数値は gcc 13.3.0 実測: FP_NAN=0, FP_INFINITE=1,
//   FP_ZERO=2, FP_SUBNORMAL=3, FP_NORMAL=4。ilogb(0)/ilogb(NaN) は
//   FP_ILOGB0/FP_ILOGBNAN = INT_MIN (-2147483648)、ilogb(±Inf) は
//   INT_MAX (2147483647)。isinf は glibc 実測どおり ±Inf で ±1 を返す。

const FR = Math.fround;
const DBL_MIN = 2.2250738585072014e-308; // 最小の正規数
const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

/* ---------------- 基本ユーティリティ ---------------- */

function signBitOf(x) {
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, x);
  return (dv.getUint8(0) & 0x80) !== 0;
}
// B6監査（A-C P3-1是正）：定義域エラーで生じる NaN の符号は gcc 実測では
// log／log2／log1p／atanh／acosh／fmod／remainder が負（-nan 表示）、
// log10／asin／acos は正。JS の Math は前者も正の NaN を返すため、
// 非 NaN 入力から生じた NaN は -NaN にそろえる（NaN 入力はそのまま伝播）。
function domainNaN1(x, r) { return Number.isNaN(r) ? (Number.isNaN(x) ? x : -NaN) : r; }
function copySign(mag, sgn) {
  if (Number.isNaN(mag)) return signBitOf(sgn) ? -NaN : NaN;
  return Math.abs(mag) * (signBitOf(sgn) ? -1 : 1);
}
// 偶数への丸め（ties-to-even）。rint/nearbyint/remainder の商に使う。
function roundEven(x) {
  if (!Number.isFinite(x)) return x;
  if (x === 0) return x;
  const ax = Math.abs(x);
  if (ax >= 4503599627370496) return x; // 2^52 以上は既に整数
  const f = Math.floor(ax);
  const d = ax - f;
  let r;
  if (d < 0.5) r = f;
  else if (d > 0.5) r = f + 1;
  else r = f % 2 === 0 ? f : f + 1;
  const out = x < 0 ? -r : r;
  return out === 0 ? copySign(0, x) : out;
}
// 0 から遠い側への 0.5 丸め（round の規則）。
function roundHalfAway(x) {
  if (!Number.isFinite(x)) return x;
  const r = Math.sign(x) * Math.round(Math.abs(x));
  return r === 0 ? copySign(0, x) : r;
}
function isSubnormal(x) {
  return x !== 0 && Number.isFinite(x) && Math.abs(x) < DBL_MIN;
}
function fpclassifyImpl(x) {
  if (Number.isNaN(x)) return 0; // FP_NAN
  if (!Number.isFinite(x)) return 1; // FP_INFINITE
  if (x === 0) return 2; // FP_ZERO
  if (isSubnormal(x)) return 3; // FP_SUBNORMAL
  return 4; // FP_NORMAL
}
// x = frac * 2^e, frac in [0.5, 1)。frexp/logb/ilogb の共通核。
function frexpImpl(x) {
  if (x === 0 || !Number.isFinite(x)) return [x, 0];
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, x);
  const hi = dv.getUint32(0);
  let expField = (hi >>> 20) & 0x7ff;
  if (expField === 0) {
    // 非正規数: 2^64 倍して正規化し直す（正確なスケーリング）。
    const [m, e] = frexpImpl(x * 18446744073709551616); // 2^64
    return [m, e - 64];
  }
  // 指数部を 1022（= 2^-1 のバイアス）に置換して [0.5,1) の仮数を作る。
  dv.setUint32(0, (hi & 0x800fffff) | (1022 << 20));
  return [dv.getFloat64(0), expField - 1022];
}
function logbImpl(x) {
  if (Number.isNaN(x)) return NaN;
  if (!Number.isFinite(x)) return Infinity;
  if (x === 0) return -Infinity;
  return frexpImpl(x)[1] - 1;
}
function scalbnImpl(x, n) {
  if (x === 0 || !Number.isFinite(x) || Number.isNaN(x)) return x;
  // 2^n の直接計算が溢れる範囲でも結果が表現できる場合があるため、
  // 1023 ずつ分割して掛ける（各段は正確な 2 の冪）。
  let r = x;
  let k = n;
  while (k > 1023) { r *= Math.pow(2, 1023); k -= 1023; if (!Number.isFinite(r)) return r; }
  while (k < -1023) { r *= Math.pow(2, -1023); k += 1023; if (r === 0) return copySign(0, x); }
  return r * Math.pow(2, k);
}
function nextafterFImpl(x, y) {
  // float 版: float32 のビット列で1刻み進める。
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (x === y) return y;
  if (x === 0) return y > 0 ? 1.401298464324817e-45 : -1.401298464324817e-45;
  const dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, x);
  let bits = dv.getUint32(0);
  if (x > 0) bits += y > x ? 1 : -1;
  else bits += y > x ? -1 : 1;
  dv.setUint32(0, bits >>> 0);
  return dv.getFloat32(0);
}
function nextafterImpl(x, y) {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (x === y) return y;
  if (x === 0) return y > 0 ? 5e-324 : -5e-324;
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, x);
  let bits = dv.getBigUint64(0);
  if (x > 0) bits += y > x ? 1n : -1n;
  else bits += y > x ? -1n : 1n;
  dv.setBigUint64(0, bits);
  return dv.getFloat64(0);
}

/* ---------------- JS に無い関数の数値実装 ---------------- */

const SQRT_PI = Math.sqrt(Math.PI);
function erfSeries(ax) {
  // erf(x) = (2/√π) Σ (-1)^n x^(2n+1) / (n! (2n+1)), |x| < 2
  let term = ax, sum = ax;
  const x2 = ax * ax;
  for (let n = 1; n < 300; n++) {
    term *= -x2 / n;
    const add = term / (2 * n + 1);
    sum += add;
    if (Math.abs(add) < 1e-18) break;
  }
  return (2 / SQRT_PI) * sum;
}
function erfcCF(x) {
  // erfc(x) = e^{-x^2}/√π * 1/(x + (1/2)/(x + 1/(x + (3/2)/(x+…))))
  // 修正 Lentz 法。x >= 2 で高速に収束する。
  const tiny = 1e-300;
  let b = x, c = 1 / tiny, d = 1 / b, h = d;
  for (let n = 1; n < 500; n++) {
    const a = n / 2;
    d = 1 / (a * d + b);
    c = b + a / c;
    if (c === 0) c = tiny;
    const del = c * d;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return (Math.exp(-x * x) / SQRT_PI) * h;
}
function erfImpl(x) {
  if (Number.isNaN(x)) return NaN;
  if (!Number.isFinite(x)) return Math.sign(x);
  const ax = Math.abs(x);
  const r = ax < 2 ? erfSeries(ax) : 1 - erfcCF(ax);
  return x < 0 || Object.is(x, -0) ? (Object.is(x, -0) ? -0 : -r) : r;
}
function erfcImpl(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === Infinity) return 0;
  if (x === -Infinity) return 2;
  if (x >= 0) return x < 2 ? 1 - erfSeries(x) : erfcCF(x);
  return 2 - erfcImpl(-x);
}
// Lanczos 近似（g=7, 係数9個）。
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
function lgammaCore(z) {
  // z > 0 専用（呼び出し側で反射済み）。
  const w = z - 1;
  let x = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i] / (w + i);
  const t = w + 7.5;
  return 0.9189385332046727418 + (w + 0.5) * Math.log(t) - t + Math.log(x);
}
function lgammaImpl(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === Infinity) return Infinity;
  if (x === -Infinity) return Infinity;
  if (x === 0) return Infinity; // 極（+0/-0 とも +Inf、glibc 実測）
  if (x < 0 && Number.isInteger(x)) return Infinity; // 極
  if (x < 0.5)
    return Math.log(Math.PI) - Math.log(Math.abs(Math.sin(Math.PI * x))) - lgammaCore(1 - x);
  return lgammaCore(x);
}
function tgammaImpl(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return Object.is(x, -0) ? -Infinity : Infinity;
  if (x === Infinity) return Infinity;
  if (x === -Infinity) return NaN;
  if (x < 0 && Number.isInteger(x)) return NaN; // 極は定義域エラー
  if (x < 0.5) {
    // 反射公式 Γ(z) = π / (sin(πz) Γ(1-z))。1-z > 0.5 で Γ(1-z) > 0。
    return Math.PI / (Math.sin(Math.PI * x) * Math.exp(lgammaCore(1 - x)));
  }
  const lg = lgammaCore(x);
  if (lg > 709.782712893384) return Infinity; // exp の溢れ
  return Math.exp(lg);
}
// Dekker 分解による補償演算 fma（積の誤差を回収してから加える）。
function dekkerSplit(x) {
  const c = 134217729 * x; // 2^27+1
  const hi = c - (c - x);
  return [hi, x - hi];
}
function twoSum(a, b) {
  const s = a + b;
  const bb = s - a;
  return [s, a - (s - bb) + (b - bb)];
}
function fmaImpl(a, b, c) {
  const p = a * b;
  if (Number.isNaN(p) || Number.isNaN(c)) return NaN;
  if (!Number.isFinite(p) || p === 0) return p + c;
  if (!Number.isFinite(c)) return c;
  const [ah, al] = dekkerSplit(a);
  const [bh, bl] = dekkerSplit(b);
  const err = (ah * bh - p + ah * bl + al * bh) + al * bl;
  const [s, e1] = twoSum(p, c);
  const [t, e2] = twoSum(s, err + e1);
  return t + e2;
}
function remainderImpl(x, y) {
  if (Number.isNaN(x)) return x;
  if (Number.isNaN(y)) return y;
  if (!Number.isFinite(x)) return -NaN;
  if (y === 0) return -NaN;
  if (!Number.isFinite(y)) return x;
  const q = roundEven(x / y);
  const r = x - q * y;
  return r === 0 ? copySign(0, x) : r;
}
function powImpl(x, y) {
  // glibc と JS で異なる点だけ補正する: pow(1, NaN/±Inf)=1、
  // pow(-1, ±Inf)=1、pow(NaN, 0)=1（JS の Math.pow は最後だけ一致）。
  if (y === 0) return 1;
  if (x === 1) return 1;
  if (Math.abs(x) === 1 && !Number.isFinite(y)) return 1;
  return Math.pow(x, y);
}

/* ---------------- 単項・二項のコア実装（double 意味論） ---------------- */

const UNARY = {
  fabs: (x) => Math.abs(x),
  exp: (x) => Math.exp(x),
  exp2: (x) => Math.pow(2, x),
  expm1: (x) => Math.expm1(x),
  log: (x) => domainNaN1(x, Math.log(x)),
  log10: (x) => Math.log10(x),
  log2: (x) => domainNaN1(x, Math.log2(x)),
  log1p: (x) => domainNaN1(x, Math.log1p(x)),
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  asinh: (x) => Math.asinh(x),
  acosh: (x) => domainNaN1(x, Math.acosh(x)),
  atanh: (x) => domainNaN1(x, Math.atanh(x)),
  erf: erfImpl,
  erfc: erfcImpl,
  tgamma: tgammaImpl,
  lgamma: lgammaImpl,
  ceil: (x) => Math.ceil(x),
  floor: (x) => Math.floor(x),
  trunc: (x) => Math.trunc(x),
  nearbyint: roundEven,
  rint: roundEven,
  round: roundHalfAway,
  logb: logbImpl,
};
const BINARY = {
  fmod: (x, y) => { const r = x - Math.trunc(x / y) * y; return Number.isNaN(r) ? (Number.isNaN(x) ? x : Number.isNaN(y) ? y : -NaN) : r; },
  remainder: remainderImpl,
  fmax: (x, y) => (Number.isNaN(x) ? y : Number.isNaN(y) ? x : Math.max(x, y)),
  fmin: (x, y) => (Number.isNaN(x) ? y : Number.isNaN(y) ? x : Math.min(x, y)),
  fdim: (x, y) => (Number.isNaN(x) || Number.isNaN(y) ? NaN : x > y ? x - y : 0),
  pow: powImpl,
  hypot: (x, y) => Math.hypot(x, y),
  atan2: (y, x) => Math.atan2(y, x),
  copysign: (x, y) => copySign(x, y),
  nextafter: nextafterImpl,
  nexttoward: nextafterImpl,
};
// fmod は JS に無いため符号付き剰余を自前で持つ（上の定義は保険）。
BINARY.fmod = (x, y) => {
  if (Number.isNaN(x)) return x;
  if (Number.isNaN(y)) return y;
  if (!Number.isFinite(x) || y === 0) return -NaN; // 定義域エラーは gcc 実測で -nan
  if (!Number.isFinite(y)) return x;
  const r = x - Math.trunc(x / y) * y;
  return r === 0 ? copySign(0, x) : r;
};

/* ---------------- ハンドラ生成の共通検証 ---------------- */

function checkCount(name, args, n, api, node) {
  if (args.length !== n)
    api.fail(
      `${name} は引数を${n}つだけ取ります（${args.length}個は渡せません）`,
      node,
      "CompileError",
    );
}
function numArg(name, v, api, node, H) {
  if (typeof v === "boolean") return Number(v);
  if (typeof v !== "number")
    api.fail(`${name} の引数は数値でなければなりません`, node, "CompileError");
  return v;
}
function firstUnknown(values, H) {
  for (const v of values) if (H.isUnknown(v)) return v;
  return undefined;
}
// 変種: "" = double（総称は float 引数で丸める）、"f" = 常に float、
// "l" = long double（double として計算）。
function variantOf(name, base) {
  if (name === base) return "";
  if (name === base + "f") return "f";
  return "l";
}
// f 版は引数も float へ変換されてから計算する（パラメータ変換）。
function cvtArg(v, suffix) {
  return suffix === "f" ? FR(v) : v;
}
function roundForVariant(result, variant, args, s, H) {
  if (variant === "f") return typeof result === "number" ? FR(result) : result;
  if (variant === "" && args.length && H.typeOf(args[0], s) === "float")
    return typeof result === "number" ? FR(result) : result;
  return result;
}
function writePointer(values, idx, value, name, s, api, node, H) {
  const ptr = values[idx];
  if (!H.isPtr(ptr))
    api.fail(`${name} の出力引数はポインタでなければなりません`, node, "CompileError");
  const mem = H.deref(ptr, s, api, node);
  const et = String(mem.type || "").replace(/\[[^\]]*\]$/, "");
  let v = value;
  if (et === "float") v = FR(v);
  else if (et !== "double" && et !== "long double" && typeof v === "number" && Number.isFinite(v))
    v = Math.trunc(v);
  mem.values[ptr.offset] = v;
  // スカラ変数を指す場合は変数ビュー（s.vars）も同期する。
  if (ptr.offset === 0)
    for (const [nm, id] of Object.entries(s.addresses || {}))
      if (id === ptr.object && !String(s.types?.[nm] || "").endsWith("[]"))
        s.vars[nm] = v;
  return v;
}
function toLongResult(name, x, api, node) {
  // lrint/llrint/lround/llround の範囲外・NaN は未定義動作として停止。
  // 戻り型 long / long long はどちらもモデルでは 64 ビット。
  if (Number.isNaN(x) || !Number.isFinite(x))
    api.fail(`${name} の引数が変換範囲外です`, node, "未定義動作");
  if (Math.abs(x) >= 9223372036854775808)
    api.fail(`${name} の結果が変換先の型で表せません`, node, "未定義動作");
  return x;
}

/* ---------------- ハンドラ組み立て ---------------- */

export const handlers = {};
const returnTypes = {};

function variantReturn(base) {
  return (argTypes) =>
    argTypes?.[0] === "float"
      ? "float"
      : argTypes?.[0] === "long double"
        ? "long double"
        : "double";
}
function registerFloatFamily(base, make) {
  for (const suffix of ["", "f", "l"]) {
    const name = base + suffix;
    handlers[name] = make(name, suffix);
  }
  returnTypes[base] = variantReturn(base);
  returnTypes[base + "f"] = "float";
  returnTypes[base + "l"] = "long double";
}

for (const [base, impl] of Object.entries(UNARY)) {
  registerFloatFamily(base, (name, suffix) => (args, values, s, api, node, H) => {
    checkCount(name, args, 1, api, node);
    const unk = firstUnknown(values, H);
    if (unk !== undefined) return unk;
    const x = cvtArg(numArg(name, values[0], api, node, H), suffix);
    return roundForVariant(impl(x), suffix, args, s, H);
  });
}
for (const [base, impl] of Object.entries(BINARY)) {
  registerFloatFamily(base, (name, suffix) => (args, values, s, api, node, H) => {
    checkCount(name, args, 2, api, node);
    const unk = firstUnknown(values, H);
    if (unk !== undefined) return unk;
    const x = cvtArg(numArg(name, values[0], api, node, H), suffix);
    const y = cvtArg(numArg(name, values[1], api, node, H), suffix);
    // nextafter/nexttoward の f 版（と総称の float 振り分け）は
    // float32 の刻みで進める。
    if (
      (base === "nextafter" || base === "nexttoward") &&
      (suffix === "f" || (suffix === "" && H.typeOf(args[0], s) === "float"))
    )
      return roundForVariant(nextafterFImpl(x, y), suffix, args, s, H);
    return roundForVariant(impl(x, y), suffix, args, s, H);
  });
}

// fma（3引数）
registerFloatFamily("fma", (name, suffix) => (args, values, s, api, node, H) => {
  checkCount(name, args, 3, api, node);
  const unk = firstUnknown(values, H);
  if (unk !== undefined) return unk;
  const a = cvtArg(numArg(name, values[0], api, node, H), suffix);
  const b = cvtArg(numArg(name, values[1], api, node, H), suffix);
  const c = cvtArg(numArg(name, values[2], api, node, H), suffix);
  return roundForVariant(fmaImpl(a, b, c), suffix, args, s, H);
});

// 整数部指数を取る関数（第2引数が int）
for (const base of ["ldexp", "scalbn", "scalbln"]) {
  registerFloatFamily(base, (name, suffix) => (args, values, s, api, node, H) => {
    checkCount(name, args, 2, api, node);
    const unk = firstUnknown(values, H);
    if (unk !== undefined) return unk;
    const x = numArg(name, values[0], api, node, H);
    const nRaw = numArg(name, values[1], api, node, H);
    if (!Number.isFinite(nRaw))
      api.fail(`${name} の指数引数が範囲外です`, node, "未定義動作");
    // 結果は |n| が数千の時点で飽和するため、ループ回数用に丸める。
    const n = Math.max(-100000, Math.min(100000, Math.trunc(nRaw)));
    return roundForVariant(scalbnImpl(x, n), suffix, args, s, H);
  });
}

// frexp（ポインタ出力: 指数 int）
registerFloatFamily("frexp", (name, suffix) => (args, values, s, api, node, H) => {
  checkCount(name, args, 2, api, node);
  if (H.isUnknown(values[0])) return values[0];
  const x = cvtArg(numArg(name, values[0], api, node, H), suffix);
  const [m, e] = frexpImpl(x);
  writePointer(values, 1, e, name, s, api, node, H);
  return roundForVariant(m, suffix, args, s, H);
});
// modf（ポインタ出力: 整数部は引数と同じ浮動小数点型）
registerFloatFamily("modf", (name, suffix) => (args, values, s, api, node, H) => {
  checkCount(name, args, 2, api, node);
  if (H.isUnknown(values[0])) return values[0];
  const x = cvtArg(numArg(name, values[0], api, node, H), suffix);
  let ip, fr;
  if (Number.isNaN(x)) { ip = NaN; fr = NaN; }
  else if (!Number.isFinite(x)) { ip = x; fr = copySign(0, x); }
  else { ip = Math.trunc(x); fr = x - ip; if (fr === 0) fr = copySign(0, x); }
  const et = (() => {
    const ptr = values[1];
    if (!H.isPtr(ptr)) return null;
    const mem = H.deref(ptr, s, api, node);
    return String(mem.type || "").replace(/\[[^\]]*\]$/, "");
  })();
  writePointer(values, 1, et === "float" ? FR(ip) : ip, name, s, api, node, H);
  return roundForVariant(fr, suffix, args, s, H);
});
// remquo（ポインタ出力: 商 int）
registerFloatFamily("remquo", (name, suffix) => (args, values, s, api, node, H) => {
  checkCount(name, args, 3, api, node);
  if (H.isUnknown(values[0]) || H.isUnknown(values[1]))
    return H.isUnknown(values[0]) ? values[0] : values[1];
  const x = cvtArg(numArg(name, values[0], api, node, H), suffix);
  const y = cvtArg(numArg(name, values[1], api, node, H), suffix);
  let r, q = 0;
  if (Number.isNaN(x) || Number.isNaN(y) || !Number.isFinite(x) || y === 0) {
    r = NaN;
  } else if (!Number.isFinite(y)) {
    r = x;
  } else {
    const qq = roundEven(x / y);
    r = x - qq * y;
    if (r === 0) r = copySign(0, x);
    // 商は int へ折り返して格納する（glibc は下位ビットを格納する）。
    let m = ((Math.trunc(qq) % 4294967296) + 4294967296) % 4294967296;
    if (m >= 2147483648) m -= 4294967296;
    q = m;
  }
  writePointer(values, 2, q, name, s, api, node, H);
  return roundForVariant(r, suffix, args, s, H);
});

// ilogb（戻り値は int）
for (const name of ["ilogb", "ilogbf", "ilogbl"]) {
  handlers[name] = (args, values, s, api, node, H) => {
    checkCount(name, args, 1, api, node);
    const unk = firstUnknown(values, H);
    if (unk !== undefined) return unk;
    const x = numArg(name, values[0], api, node, H);
    if (Number.isNaN(x)) return INT_MIN; // FP_ILOGBNAN
    if (!Number.isFinite(x)) return INT_MAX;
    if (x === 0) return INT_MIN; // FP_ILOGB0
    return frexpImpl(x)[1] - 1;
  };
  returnTypes[name] = "int";
}

// nan（const char* を受けて NaN を返す。タグの中身はモデル化しない）
for (const [name, rt] of [["nan", "double"], ["nanf", "float"], ["nanl", "long double"]]) {
  handlers[name] = (args, values, s, api, node, H) => {
    checkCount(name, args, 1, api, node);
    if (typeof values[0] !== "string" && !H.isPtr(values[0]) && !H.isUnknown(values[0]))
      api.fail(`${name} の引数は文字列へのポインタでなければなりません`, node, "CompileError");
    return rt === "float" ? FR(NaN) : NaN;
  };
  returnTypes[name] = rt;
}

// 長整数への丸め変換
for (const [base, impl, rt] of [
  ["lrint", roundEven, "long"],
  ["llrint", roundEven, "long long"],
  ["lround", roundHalfAway, "long"],
  ["llround", roundHalfAway, "long long"],
]) {
  for (const suffix of ["", "f", "l"]) {
    const name = base + suffix;
    handlers[name] = (args, values, s, api, node, H) => {
      checkCount(name, args, 1, api, node);
      const unk = firstUnknown(values, H);
      if (unk !== undefined) return unk;
      const x = numArg(name, values[0], api, node, H);
      return toLongResult(name, impl(x), api, node);
    };
    returnTypes[name] = rt;
  }
}

/* ---------------- 分類マクロ・比較マクロ ---------------- */

function classifyHandler(name, impl) {
  handlers[name] = (args, values, s, api, node, H) => {
    checkCount(name, args, 1, api, node);
    const unk = firstUnknown(values, H);
    if (unk !== undefined) return unk;
    const x = numArg(name, values[0], api, node, H);
    return impl(x);
  };
  returnTypes[name] = "int";
}
classifyHandler("fpclassify", fpclassifyImpl);
classifyHandler("isfinite", (x) => (Number.isFinite(x) ? 1 : 0));
classifyHandler("isinf", (x) => (x === Infinity ? 1 : x === -Infinity ? -1 : 0));
classifyHandler("isnan", (x) => (Number.isNaN(x) ? 1 : 0));
classifyHandler("isnormal", (x) =>
  Number.isFinite(x) && x !== 0 && !isSubnormal(x) ? 1 : 0,
);
classifyHandler("signbit", (x) => (signBitOf(x) ? 1 : 0));

function compareHandler(name, impl) {
  handlers[name] = (args, values, s, api, node, H) => {
    checkCount(name, args, 2, api, node);
    const unk = firstUnknown(values, H);
    if (unk !== undefined) return unk;
    const x = numArg(name, values[0], api, node, H);
    const y = numArg(name, values[1], api, node, H);
    return impl(x, y);
  };
  returnTypes[name] = "int";
}
compareHandler("isgreater", (x, y) => (x > y ? 1 : 0));
compareHandler("isgreaterequal", (x, y) => (x >= y ? 1 : 0));
compareHandler("isless", (x, y) => (x < y ? 1 : 0));
compareHandler("islessequal", (x, y) => (x <= y ? 1 : 0));
compareHandler("islessgreater", (x, y) => (x < y || x > y ? 1 : 0));
compareHandler("isunordered", (x, y) =>
  Number.isNaN(x) || Number.isNaN(y) ? 1 : 0,
);

export { returnTypes };
