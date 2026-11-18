/* 高度モード差分（ブロックB3）: ImageJ 純粋関数の高度ハンドラ。
 * 状態を持たない（または読み取り専用の）関数群。書式は engine-advanced.js の
 * コメントを参照。一次情報: 公式 Built-in Macro Functions
 * （https://imagej.net/ij/developer/macro/functions.html, 2025-02-15 更新）と
 * ImageJ 本体ソース Functions.java（master, 2026-11-17 取得）。
 *
 * 分類メモ（IJ-ENG-PURE）:
 * - ここに置くのは「引数だけから決まる」関数と、時刻のような実行時に決まる
 *   読み取り値（getTime）だけ。画像・ROI・結果表・クリップボード・画面・
 *   フォント等のモデル外状態に触れるものは未対応に倒し、意味論の要の変換式が
 *   同梱一次情報（functions.html と Functions.java）に無いもの（FHT／Tools／
 *   MaximumFinder／Colors の内部実装）は未検証に倒す。
 * - 値の表現・文面は基礎 engine.js の simBuiltin の慣行に合わせる
 *   （数値の文字列化は H.fmt、(int) 変換は H.int、文字列数値は H.numArg）。
 * - 文字列バッファ（String.append/buffer/resetBuffer）は Functions.java の
 *   Interpreter.buffer に対応する実行内状態で、S 上に保持する。
 */

/* ---------- 小物ヘルパー ---------- */

/* 引数個数の検証（基礎の Math.min 等の文面慣行） */
function arity(H, e, name, sig, min, max) {
  const n = e.args.length;
  if (n < min || n > max) {
    throw H.err(
      name + " の引数の数が違います",
      "書式は " + sig + " で、引数は " +
        (min === max ? min + " 個" : min + "〜" + max + " 個") +
        "ですが、" + n + " 個渡しています。"
    );
  }
}

/* 数値スカラ引数: 基礎の simNumArg 相当（文字列数値も数値として読む。
   読めない文字列は NaN になるのが実 ImageJ の Variable 変換）。
   数値にならない場合は null（呼び出し側で未確定に倒す）。 */
function numVal(H, v) {
  if (H.isUnk(v)) return null;
  const n = H.numArg(v);
  return typeof n === "number" ? n : null;
}

/* 文字列スカラ引数: 基礎の simStrArg 相当（数値は H.fmt で文字列化）。
   文字列化できない場合は null。 */
function strVal(H, v) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return H.fmt(v);
  return null;
}

/* 配列引数の検証（基礎の Array.sort の文面慣行）。未確定なら null を返し、
   呼び出し側が H.unk に倒す。配列でなければエラーで止める。 */
function arrArg(H, e, name, v) {
  if (H.isUnk(v)) return null;
  if (!Array.isArray(v)) {
    throw H.err(
      name + " の引数が配列ではありません",
      name + " は配列変数を取る関数です。数値や文字列そのものは渡せません。ImageJ ではここでエラーになり止まります。"
    );
  }
  return v;
}

/* 数値配列であることの検証（基礎の Array.getStatistics の慣行:
   要素は変換前の型で判定し、文字列要素はエラー。未確定要素は null）。 */
function numArrArg(H, e, name, v) {
  const a = arrArg(H, e, name, v);
  if (a === null) return null;
  for (let i = 0; i < a.length; i++) {
    if (H.isUnk(a[i])) return null;
    if (typeof a[i] !== "number") {
      throw H.err(
        name + " の引数が数値の配列ではありません",
        "計算するには、すべての要素が数値の配列が必要です。文字列などを含む配列では計算できません。"
      );
    }
  }
  return a;
}

/* 誤差関数 erf: 数学的に定義された関数で、公式説明は
   "Returns an approximation of the error function"（Math.erf）。
   Functions.java は IJMath.erf を呼ぶ。ここでは Abramowitz & Stegun 7.1.26
   （絶対誤差 1.5e-7 以下）で計算する。表示桁（基礎の数値整形は小数4桁まで）
   では実 ImageJ の近似値と一致する。 */
function erf(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return 0; /* erf(0) は数学的にちょうど 0（近似式の残差を出さない） */
  if (!Number.isFinite(x)) return x > 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
    t;
  const y = 1 - poly * Math.exp(-ax * ax);
  return x < 0 ? -y : y;
}

/* ---------- 波長→色（Colors.wavelengthToColor、FIX-IJB で格上げ） ----------
 * Colors.java の区間式をそのまま写す。ガンマは Colors の GAMMA=0.8。
 * 各成分は floor(値×255) で整数化し、Colors.colorToString で文字列化する
 * （13色名に一致すれば名前、無ければ "#"+%06x。名前表は state 側と同一）。 */
const WL_COLOR_NAMES = [
  ["red", [255, 0, 0]], ["green", [0, 255, 0]], ["blue", [0, 0, 255]],
  ["magenta", [255, 0, 255]], ["cyan", [0, 255, 255]], ["yellow", [255, 255, 0]],
  ["orange", [255, 200, 0]], ["black", [0, 0, 0]], ["white", [255, 255, 255]],
  ["gray", [128, 128, 128]], ["lightGray", [192, 192, 192]], ["darkGray", [64, 64, 64]],
  ["pink", [255, 175, 175]],
];
function wlColorToString(r, g, b) {
  for (const [nm, v] of WL_COLOR_NAMES)
    if (r === v[0] && g === v[1] && b === v[2]) return nm;
  const h = (v) => v.toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}
function wavelengthToColorStr(wl) {
  const GAMMA = 0.8;
  let r = 0, g = 0, b = 0;
  if (wl >= 380 && wl < 440) {
    const att = 0.3 + 0.7 * (wl - 380) / 60;
    r = Math.pow((-(wl - 440) / 60) * att, GAMMA); b = Math.pow(att, GAMMA);
  } else if (wl >= 440 && wl < 490) {
    g = Math.pow((wl - 440) / 50, GAMMA); b = 1;
  } else if (wl >= 490 && wl < 510) {
    g = 1; b = Math.pow(-(wl - 510) / 20, GAMMA);
  } else if (wl >= 510 && wl < 580) {
    r = Math.pow((wl - 510) / 70, GAMMA); g = 1;
  } else if (wl >= 580 && wl < 645) {
    r = 1; g = Math.pow(-(wl - 645) / 65, GAMMA);
  } else if (wl >= 645 && wl <= 750) {
    const att = 0.3 + 0.7 * (750 - wl) / 105;
    r = Math.pow(att, GAMMA);
  }
  return wlColorToString(Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255));
}

/* ---------- MD5 / SHA-256（IJ.checksum 用、UTF-8 バイト列に対する標準実装） ---------- */

function utf8Bytes(s) {
  return new TextEncoder().encode(s);
}
function bytesToHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++)
    out += (bytes[i] >>> 4).toString(16) + (bytes[i] & 15).toString(16);
  return out;
}
function wordHexLE(w) {
  let out = "";
  for (let i = 0; i < 4; i++)
    out += ((w >>> (8 * i)) & 255).toString(16).padStart(2, "0");
  return out;
}
function wordHexBE(w) {
  let out = "";
  for (let i = 3; i >= 0; i--)
    out += ((w >>> (8 * i)) & 255).toString(16).padStart(2, "0");
  return out;
}

function md5hex(input) {
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = [];
  for (let i = 0; i < 64; i++)
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
  const bitLen = input.length * 8;
  const padded = Array.from(input);
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0);
  const lo = bitLen >>> 0, hi = Math.floor(bitLen / 4294967296) >>> 0;
  for (let i = 0; i < 4; i++) padded.push((lo >>> (8 * i)) & 255);
  for (let i = 0; i < 4; i++) padded.push((hi >>> (8 * i)) & 255);
  let a0 = 0x67452301 | 0, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476 | 0;
  const rotl = (v, b) => (v << b) | (v >>> (32 - b));
  for (let off = 0; off < padded.length; off += 64) {
    const M = [];
    for (let i = 0; i < 16; i++)
      M[i] =
        padded[off + 4 * i] |
        (padded[off + 4 * i + 1] << 8) |
        (padded[off + 4 * i + 2] << 16) |
        (padded[off + 4 * i + 3] << 24);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const tmp = D;
      D = C;
      C = B;
      B = (B + rotl((A + F + K[i] + M[g]) | 0, S[i])) | 0;
      A = tmp;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  return wordHexLE(a0) + wordHexLE(b0) + wordHexLE(c0) + wordHexLE(d0);
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
function sha256hex(input) {
  const rotr = (v, b) => (v >>> b) | (v << (32 - b));
  const bitLen = input.length * 8;
  const padded = Array.from(input);
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0);
  const lo = bitLen >>> 0, hi = Math.floor(bitLen / 4294967296) >>> 0;
  for (let i = 3; i >= 0; i--) padded.push((hi >>> (8 * i)) & 255);
  for (let i = 3; i >= 0; i--) padded.push((lo >>> (8 * i)) & 255);
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
    .map((v) => v | 0);
  const w = new Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++)
      w[i] =
        (padded[off + 4 * i] << 24) |
        (padded[off + 4 * i + 1] << 16) |
        (padded[off + 4 * i + 2] << 8) |
        padded[off + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + (SHA256_K[i] | 0) + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H = [
      (H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0,
      (H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h) | 0,
    ];
  }
  return H.map(wordHexBE).join("");
}

/* ---------- Java の Double.toString と String.format（java.util.Formatter） ---------- */

/* 10進数字列への分解: value = 0.digits × 10^exp10（digits は最短表現の数字列、
   先頭は 0 でない。0 のときは digits="0", exp10=0）。
   JS の String(x) は Java の Double.toString と同じ最短桁列を返すため、
   桁列はそれを再利用し、表記規則だけ Java に合わせる。 */
function decParts(x) {
  if (x === 0) return { neg: Object.is(x, -0), digits: "0", exp10: 0 };
  let s = String(Math.abs(x));
  let exp = 0;
  const ei = s.indexOf("e");
  if (ei >= 0) { exp = parseInt(s.slice(ei + 1), 10); s = s.slice(0, ei); }
  const di = s.indexOf(".");
  const raw = di >= 0 ? s.slice(0, di) + s.slice(di + 1) : s;
  const pointPos = di >= 0 ? di : s.length;
  let lz = 0;
  while (lz < raw.length && raw[lz] === "0") lz++;
  /* value = 0.raw × 10^(pointPos+exp)。先行ゼロを除くと 0.digits は
     10^lz 倍になるため、指数はその分下がる */
  return {
    neg: x < 0,
    digits: raw.slice(lz) === "" ? "0" : raw.slice(lz),
    exp10: pointPos + exp - lz,
  };
}

/* 数字列を keep 桁の有効数字へ HALF_UP で丸める。戻り値は {digits, carry}。
   carry=1 のときは桁が1つ増えた（例: "999" -> "1000" 相当）ことを示し、
   呼び出し側で指数を調整する。ここでは digits を "1000…" の形で返す。 */
function roundSig(digits, keep) {
  if (digits.length <= keep) return { digits, expShift: 0 };
  const kept = digits.slice(0, keep).split("");
  const rest = digits.slice(keep);
  if (rest[0] >= "5") {
    let i = keep - 1;
    while (i >= 0 && kept[i] === "9") { kept[i] = "0"; i--; }
    if (i < 0) return { digits: "1" + kept.join(""), expShift: 1 };
    kept[i] = String(Number(kept[i]) + 1);
  }
  return { digits: kept.join(""), expShift: 0 };
}

/* Java Double.toString 相当: 1e-3 <= |x| < 1e7 は通常表記（整数値でも ".0"）、
   それ以外は "d.dddE<exp>" 形式（指数に + や先行ゼロなし）。 */
function javaDoubleStr(x) {
  if (Number.isNaN(x)) return "NaN";
  if (!Number.isFinite(x)) return x > 0 ? "Infinity" : "-Infinity";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const { neg, digits, exp10 } = decParts(x);
  const sign = neg ? "-" : "";
  /* value = 0.digits * 10^exp10。科学表記の指数は exp10-1 */
  const sciExp = exp10 - 1;
  if (sciExp >= -3 && sciExp < 7) {
    let intPart, fracPart;
    if (exp10 <= 0) {
      intPart = "0";
      fracPart = "0".repeat(-exp10) + digits;
    } else if (exp10 >= digits.length) {
      intPart = digits + "0".repeat(exp10 - digits.length);
      fracPart = "0";
    } else {
      intPart = digits.slice(0, exp10);
      fracPart = digits.slice(exp10);
    }
    return sign + intPart + "." + fracPart;
  }
  const mant = digits.length === 1 ? digits + ".0" : digits[0] + "." + digits.slice(1);
  return sign + mant + "E" + sciExp;
}

/* %f 本体: 小数部 prec 桁、HALF_UP（Java Formatter の規則）。符号なし文字列を返す。 */
function fmtFixedBody(x, prec) {
  const { digits, exp10 } = decParts(x);
  /* value * 10^prec を整数文字列化して HALF_UP 丸め */
  const shift = exp10 + prec; /* 0.digits*10^exp10 * 10^prec = digits * 10^(shift - digits.length) */
  let intStr;
  if (shift >= digits.length) {
    intStr = digits + "0".repeat(shift - digits.length);
  } else if (shift <= 0) {
    /* 1 未満の scaled 値: 先頭の数字で丸める */
    intStr = shift === 0 && digits[0] >= "5" ? "1" : "0";
  } else {
    /* 先頭 shift 桁へ丸める。桁あふれ時は "1000" の形（長さ shift+1）になる */
    intStr = roundSig(digits, shift).digits;
  }
  if (prec === 0) return intStr;
  const padded = intStr.padStart(prec + 1, "0");
  return padded.slice(0, padded.length - prec) + "." + padded.slice(padded.length - prec);
}

/* %e 本体: "d.ddde±XX" の指数表記文字列（符号なし）。 */
function fmtSciBody(x, prec, upper) {
  let { digits, exp10 } = decParts(x);
  if (x === 0) {
    const mant = prec === 0 ? "0" : "0." + "0".repeat(prec);
    return mant + (upper ? "E" : "e") + "+00";
  }
  const r = roundSig(digits, prec + 1);
  digits = r.digits;
  exp10 += r.expShift;
  const sciExp = exp10 - 1;
  const mantDigits = digits.padEnd(prec + 1, "0");
  const mant = prec === 0 ? mantDigits[0] : mantDigits[0] + "." + mantDigits.slice(1, prec + 1);
  const expStr = (sciExp < 0 ? "-" : "+") + String(Math.abs(sciExp)).padStart(2, "0");
  return mant + (upper ? "E" : "e") + expStr;
}

/* %g 本体: 有効数字 prec 桁（0 は 1 として扱うのが Java の規則）。
   Java の %g は C と違い末尾ゼロを取り除かない（例: %g の 100.0 は "100.000"）。
   指数（10進）が -4 未満または prec 以上のとき指数表記、それ以外は固定小数。 */
function fmtGeneralBody(x, prec, upper) {
  if (x === 0) return fmtFixedBody(0, prec - 1);
  const { exp10 } = decParts(x);
  const sciExp = exp10 - 1;
  if (sciExp < -4 || sciExp >= prec) return fmtSciBody(x, prec - 1, upper);
  return fmtFixedBody(x, prec - 1 - sciExp);
}

/* %a 本体: 16進浮動小数（"0x1.8p1" 形式）。精度指定時は桁数を切り捨てる
   簡易対応（丸めは行わない）。 */
function fmtHexFloatBody(x, upper) {
  if (x === 0) return "0x0.0p0";
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, Math.abs(x));
  const hi = buf.getUint32(0), lo = buf.getUint32(4);
  const biased = (hi >>> 20) & 0x7ff;
  const fracBits = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo >>> 0);
  let fracHex = fracBits.toString(16).padStart(13, "0").replace(/0+$/, "");
  if (fracHex === "") fracHex = "0";
  let lead, exp;
  if (biased === 0) { lead = "0"; exp = -1022; }
  else { lead = "1"; exp = biased - 1023; }
  return "0x" + lead + "." + fracHex + (upper ? "P" : "p") + exp;
}

/* 符号・フラグ・幅の適用（Java Formatter の数値変換共通部）。
   neg: 負数か。body: 符号なし本体。special: NaN/Infinity のとき true。 */
function applyNumFlags(neg, body, flags, width, special) {
  let prefix = "", suffix = "";
  if (neg) {
    if (flags.paren) { prefix = "("; suffix = ")"; }
    else prefix = "-";
  } else if (flags.plus) prefix = "+";
  else if (flags.space) prefix = " ";
  let core = prefix + body + suffix;
  if (width != null && core.length < width) {
    const padn = width - core.length;
    if (flags.left) core = core + " ".repeat(padn);
    else if (flags.zero && !special)
      core = prefix + "0".repeat(padn) + body + suffix;
    else core = " ".repeat(padn) + core;
  }
  return core;
}

function groupThousands(body) {
  const di = body.indexOf(".");
  const intPart = di >= 0 ? body.slice(0, di) : body;
  const rest = di >= 0 ? body.slice(di) : "";
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + rest;
}

/* Java の String.format(format, Double...) 相当。
   Functions.java の format() は残り引数をすべて getNextArg()（数値）で読み、
   例外は interp.error でマクロを止める。ここでも、Double に合わない変換
   （%d 等）は Java の例外名を原因に挙げて止める。
   対応変換: f, e, E, g, G, s, S, b, B, h, H, %, n。
   フラグ: - + space 0 , ( < と引数インデックス、幅、精度に対応する。 */
function javaFormat(H, e, format, params) {
  let out = "";
  let i = 0;
  let ordinary = 0;
  let lastArgIdx = -1;
  const fail = (exc, detail) => {
    throw H.err(
      "String.format でエラーが発生しました",
      "実 ImageJ では Java の例外でマクロが止まります: " + exc + (detail ? "（" + detail + "）" : "")
    );
  };
  while (i < format.length) {
    const c = format[i];
    if (c !== "%") { out += c; i++; continue; }
    let j = i + 1;
    if (j >= format.length) fail("java.util.UnknownFormatConversionException", "末尾の %");
    /* 引数インデックス */
    let argIndex = null;
    const im = /^(\d+)\$/.exec(format.slice(j));
    if (im) { argIndex = parseInt(im[1], 10) - 1; j += im[0].length; }
    /* フラグ */
    const flags = { left: false, plus: false, space: false, zero: false, comma: false, paren: false, hash: false, reuse: false };
    let sawFlag = true;
    while (sawFlag && j < format.length) {
      switch (format[j]) {
        case "-": flags.left = true; j++; break;
        case "+": flags.plus = true; j++; break;
        case " ": flags.space = true; j++; break;
        case "0": flags.zero = true; j++; break;
        case ",": flags.comma = true; j++; break;
        case "(": flags.paren = true; j++; break;
        case "#": flags.hash = true; j++; break;
        case "<": flags.reuse = true; j++; break;
        default: sawFlag = false;
      }
    }
    /* 幅 */
    let width = null;
    const wm = /^(\d+)/.exec(format.slice(j));
    if (wm) { width = parseInt(wm[1], 10); j += wm[0].length; }
    /* 精度 */
    let precision = null;
    if (format[j] === ".") {
      const pm = /^\.(\d+)/.exec(format.slice(j));
      if (!pm) fail("java.util.UnknownFormatConversionException", "精度の指定が不正です");
      precision = parseInt(pm[1], 10);
      j += pm[0].length;
    }
    if (j >= format.length) fail("java.util.UnknownFormatConversionException", "変換文字がありません");
    const conv = format[j];
    j++;
    i = j;
    if (conv === "%") {
      let piece = "%";
      if (width != null && piece.length < width)
        piece = flags.left ? piece + " ".repeat(width - 1) : " ".repeat(width - 1) + piece;
      out += piece;
      continue;
    }
    if (conv === "n") { out += "\n"; continue; }
    /* 引数の選択 */
    let idx;
    if (flags.reuse) {
      if (lastArgIdx < 0) fail("java.util.MissingFormatArgumentException", "< フラグに対応する前の引数がありません");
      idx = lastArgIdx;
    } else if (argIndex != null) idx = argIndex;
    else idx = ordinary++;
    if (idx < 0 || idx >= params.length)
      fail("java.util.MissingFormatArgumentException", "書式 %" + conv + " に対応する引数がありません");
    lastArgIdx = idx;
    const arg = params[idx];
    const upper = conv >= "A" && conv <= "Z";
    const lc = conv.toLowerCase();
    if (lc === "s") {
      if (flags.zero || flags.comma || flags.paren || flags.plus || flags.space)
        fail("java.util.IllegalFormatFlagsException", "%s に使えないフラグがあります");
      let s = javaDoubleStr(arg);
      if (precision != null) s = s.slice(0, precision);
      if (upper) s = s.toUpperCase();
      if (width != null && s.length < width)
        s = flags.left ? s + " ".repeat(width - s.length) : " ".repeat(width - s.length) + s;
      out += s;
      continue;
    }
    if (lc === "b") {
      if (precision != null) fail("java.util.IllegalFormatPrecisionException", "%b に精度は指定できません");
      let s = "true"; /* Double は null でないため常に true（Java の %b の規則） */
      if (upper) s = s.toUpperCase();
      if (width != null && s.length < width)
        s = flags.left ? s + " ".repeat(width - s.length) : " ".repeat(width - s.length) + s;
      out += s;
      continue;
    }
    if (lc === "h") {
      if (precision != null) fail("java.util.IllegalFormatPrecisionException", "%h に精度は指定できません");
      const buf = new DataView(new ArrayBuffer(8));
      buf.setFloat64(0, arg);
      const hash = (buf.getUint32(0) ^ buf.getUint32(4)) | 0;
      let s = (hash >>> 0).toString(16);
      if (upper) s = s.toUpperCase();
      if (width != null && s.length < width)
        s = flags.left ? s + " ".repeat(width - s.length) : " ".repeat(width - s.length) + s;
      out += s;
      continue;
    }
    if (lc === "f" || lc === "e" || lc === "g" || lc === "a") {
      const special = Number.isNaN(arg) || !Number.isFinite(arg);
      let body;
      if (Number.isNaN(arg)) body = "NaN";
      else if (!Number.isFinite(arg)) body = "Infinity";
      else if (lc === "f") {
        body = fmtFixedBody(Math.abs(arg), precision == null ? 6 : precision);
        if (flags.comma) body = groupThousands(body);
      } else if (lc === "e") {
        body = fmtSciBody(Math.abs(arg), precision == null ? 6 : precision, upper);
      } else if (lc === "a") {
        body = fmtHexFloatBody(arg, upper);
      } else {
        let p = precision == null ? 6 : precision;
        if (p === 0) p = 1;
        body = fmtGeneralBody(Math.abs(arg), p, upper);
      }
      if (upper && !special && lc !== "a") body = body.toUpperCase();
      if (upper && lc === "a") body = body.replace("0x", "0X");
      out += applyNumFlags(arg < 0 || Object.is(arg, -0), body, flags, width, special);
      continue;
    }
    if (lc === "d" || lc === "x" || lc === "o" || lc === "c" || lc === "t") {
      fail(
        "java.util.IllegalFormatConversionException",
        conv + " != java.lang.Double（String.format の数値引数はすべて Double として渡されます）"
      );
    }
    fail("java.util.UnknownFormatConversionException", "Conversion = '" + conv + "'");
  }
  return out;
}

/* ---------- File のパス文字列操作（java.io.File の意味論、Functions.java doFile） ---------- */

/* java.io.File のパス正規化: 末尾の区切り（ルートを除く）を取り除く。
   区切りは / と \ の両方を扱う（ImageJ のパス表記の慣行に合わせる）。 */
function fileParts(path) {
  let p = path;
  while (p.length > 1 && (p.endsWith("/") || p.endsWith("\\"))) p = p.slice(0, -1);
  const cut = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return { p, cut };
}
function fileNameOf(path) {
  const { p, cut } = fileParts(path);
  if (p === "/" || p === "\\") return "";
  return cut >= 0 ? p.slice(cut + 1) : p;
}
function fileParentOf(path) {
  const { p, cut } = fileParts(path);
  if (cut < 0) return null;
  if (cut === 0) return p[0]; /* "/file" の親は "/" */
  return p.slice(0, cut);
}

/* IJ.pad / String.pad 共通（Functions.java の pad()）: 数値引数は (int) 切捨て、
   文字列引数はそのまま。目標長まで先頭に "0" を詰める。 */
function padImpl(H, e, name, args) {
  arity(H, e, name, name + "(n, length)", 2, 2);
  const digitsRaw = numVal(H, args[1]);
  if (digitsRaw === null) return H.unk;
  const digits = H.int(digitsRaw);
  if (digits > 200000) return H.unk; /* 基礎の SIM_VALUE_LIMIT と同じ上限 */
  let pv;
  if (typeof args[0] === "number") pv = String(H.int(args[0]));
  else {
    const s = strVal(H, args[0]);
    if (s === null) return H.unk;
    pv = s;
  }
  while (pv.length < digits) pv = "0" + pv;
  return pv;
}

/* ---------- Array.findMaxima / findMinima / fourier（一次情報の忠実移植） ----------
   MaximumFinder.java（fetch.sh 台帳 sha256 a13a6a1e…）の
   findMaxima(double[], tolerance, edgeMode) と、符号反転して findMaxima へ
   委譲する findMinima、Tools.java（同 6e410b6c…）の rank、FHT.java
   （同 1aadbb22…）の fourier1D / dfht3 / makeSinCosTables をそのまま移植する。 */

/* Java の Double.compareTo 相当: NaN は最大、-0.0 < +0.0 */
function doubleCompare(a, b) {
  if (Number.isNaN(a)) return Number.isNaN(b) ? 0 : 1;
  if (Number.isNaN(b)) return -1;
  if (a < b) return -1;
  if (a > b) return 1;
  if (Object.is(a, -0) && !Object.is(b, -0)) return -1;
  if (!Object.is(a, -0) && Object.is(b, -0)) return 1;
  return 0;
}

/* Tools.rank(double[]): 値の昇順になるインデックス列。
   Java の Arrays.sort（オブジェクト版）は安定ソートで、JS の sort も安定。 */
function toolsRank(values) {
  const indexes = values.map((_, i) => i);
  indexes.sort((o1, o2) => doubleCompare(values[o1], values[o2]));
  return indexes;
}

/* MaximumFinder.findMaxima(double[] xx, double tolerance, int edgeMode) の移植。
   引数 xx は変更しない（循環モードでは3倍に連結したコピーを走査する）。 */
function maximumFinderFindMaxima(xx, tolerance, edgeMode) {
  const INCLUDE_EDGE = 0;
  const CIRCULAR = 2;
  let len = xx.length;
  const origLen = len;
  if (len < 2) return [];
  if (tolerance < 0) tolerance = 0;
  let data = xx;
  if (edgeMode === CIRCULAR) {
    const cascade3 = new Array(len * 3);
    for (let jj = 0; jj < len; jj++) {
      cascade3[jj] = xx[jj];
      cascade3[jj + len] = xx[jj];
      cascade3[jj + 2 * len] = xx[jj];
    }
    len *= 3;
    data = cascade3;
  }
  const maxPositions = new Array(len);
  let jStart = 0;
  let min = NaN;
  let max = NaN;
  do {
    /* 最初の NaN でない値を探す */
    max = data[jStart];
    min = data[jStart];
    jStart++;
    if (jStart >= data.length) return []; /* 全部 NaN */
  } while (Number.isNaN(min));
  let maxPos = jStart - 1;
  let lastMaxPos = -1;
  let leftValleyFound = edgeMode === INCLUDE_EDGE;
  let maxCount = 0;
  for (let jj = jStart; jj < len; jj++) {
    const val = data[jj];
    if (val > min + tolerance) leftValleyFound = true;
    if (val > max && leftValleyFound) {
      max = val;
      maxPos = jj;
    }
    if (leftValleyFound) lastMaxPos = maxPos;
    if (val < max - tolerance && leftValleyFound) {
      maxPositions[maxCount] = maxPos;
      maxCount++;
      leftValleyFound = false;
      min = val;
      max = val;
    }
    if (val < min) {
      min = val;
      if (!leftValleyFound) max = val;
    }
  }
  if (edgeMode === INCLUDE_EDGE) {
    if (maxCount > 0 && maxPositions[maxCount - 1] !== lastMaxPos)
      maxPositions[maxCount++] = lastMaxPos;
    if (maxCount === 0 && max - min >= tolerance)
      maxPositions[maxCount++] = lastMaxPos;
  }
  maxPositions.length = maxCount;
  const maxValues = new Array(maxCount);
  for (let jj = 0; jj < maxCount; jj++) {
    let pos = maxPositions[jj];
    let midPos = pos;
    while (pos < len - 1 && data[pos] === data[pos + 1]) {
      midPos += 0.5;
      pos++;
    }
    maxPositions[jj] = Math.trunc(midPos); /* (int) キャストで平坦部の中央 */
    maxValues[jj] = data[maxPositions[jj]];
  }
  const rankPositions = toolsRank(maxValues);
  const returnArr = new Array(maxCount);
  for (let jj = 0; jj < maxCount; jj++) {
    const pos = maxPositions[rankPositions[jj]];
    returnArr[maxCount - jj - 1] = pos; /* 振幅降順 */
  }
  if (edgeMode === CIRCULAR) {
    const out = [];
    for (let jj = 0; jj < returnArr.length; jj++) {
      const pos = returnArr[jj] - origLen;
      if (pos >= 0 && pos < origLen) out.push(pos); /* 連結の中央部分のみ採用 */
    }
    return out;
  }
  return returnArr;
}

/* MaximumFinder.findMinima: 符号反転して findMaxima へ委譲する実経路そのまま */
function maximumFinderFindMinima(xx, tolerance, edgeMode) {
  const negArr = xx.map((v) => -v);
  return maximumFinderFindMaxima(negArr, tolerance, edgeMode);
}

const FHT_NO_WINDOW = 0;
const FHT_HAMMING = 1;
const FHT_HANN = 2;
const FHT_FLATTOP = 3;

/* FHT.makeSinCosTables: theta は double で累積し、表は float */
function fhtSinCosTables(maxN) {
  const n = Math.floor(maxN / 4);
  const C = new Float32Array(n);
  const S = new Float32Array(n);
  let theta = 0.0;
  const dTheta = (2.0 * Math.PI) / maxN;
  for (let i = 0; i < n; i++) {
    C[i] = Math.cos(theta); /* Float32Array への代入で (float) 化される */
    S[i] = Math.sin(theta);
    theta += dTheta;
  }
  return { C, S };
}

/* FHT.log2: 最上位ビットの位置 */
function fhtLog2(x) {
  let count = 31;
  while ((x & (1 << count)) === 0) count--;
  return count;
}

/* FHT.bitRevX: bitlen ビットの反転。到達可能な入力（x < 2^bitlen）では
   Java の i=bitlen の反復はビットが立たず無影響なので i<bitlen で等価。 */
function fhtBitRevX(x, bitlen) {
  let temp = 0;
  for (let i = 0; i < bitlen; i++) {
    if ((x & (1 << i)) !== 0) temp |= 1 << (bitlen - i - 1);
  }
  return temp;
}

/* FHT.dfht3(x, base=0, inverse=false, maxN) の移植。x は Float32Array で、
   局所演算にも Math.fround を適用し、各演算段を Java float に一致させる。
   順変換のため inverse 時の /maxN は行わない。 */
function fhtDfht3(x, maxN, C, S) {
  const F = Math.fround;
  const Nlog2 = fhtLog2(maxN);
  /* BitRevRArr: ビット反転順への並べ替え */
  const tmp = new Float32Array(maxN);
  for (let i = 0; i < maxN; i++) tmp[i] = x[fhtBitRevX(i, Nlog2)];
  for (let i = 0; i < maxN; i++) x[i] = tmp[i];
  /* 第1・第2ステージ: 基数4バタフライ */
  let gpSize = 2;
  let numGps = Math.floor(maxN / 4);
  for (let gpNum = 0; gpNum < numGps; gpNum++) {
    const Ad1 = gpNum * 4;
    const Ad2 = Ad1 + 1;
    const Ad3 = Ad1 + gpSize;
    const Ad4 = Ad2 + gpSize;
    const rt1 = F(x[Ad1] + x[Ad2]);
    const rt2 = F(x[Ad1] - x[Ad2]);
    const rt3 = F(x[Ad3] + x[Ad4]);
    const rt4 = F(x[Ad3] - x[Ad4]);
    x[Ad1] = F(rt1 + rt3);
    x[Ad2] = F(rt2 + rt4);
    x[Ad3] = F(rt1 - rt3);
    x[Ad4] = F(rt2 - rt4);
  }
  if (Nlog2 > 2) {
    /* 第3ステージ以降 */
    gpSize = 4;
    let numBfs = 2;
    numGps = Math.floor(numGps / 2);
    for (let stage = 2; stage < Nlog2; stage++) {
      for (let gpNum = 0; gpNum < numGps; gpNum++) {
        const Ad0 = gpNum * gpSize * 2;
        let Ad1 = Ad0; /* 最初のバタフライは乗算なし */
        let Ad2 = Ad1 + gpSize;
        let Ad3 = Ad1 + gpSize / 2;
        let Ad4 = Ad3 + gpSize;
        let rt1 = x[Ad1];
        x[Ad1] = F(x[Ad1] + x[Ad2]);
        x[Ad2] = F(rt1 - x[Ad2]);
        rt1 = x[Ad3];
        x[Ad3] = F(x[Ad3] + x[Ad4]);
        x[Ad4] = F(rt1 - x[Ad4]);
        for (let bfNum = 1; bfNum < numBfs; bfNum++) {
          Ad1 = bfNum + Ad0;
          Ad2 = Ad1 + gpSize;
          Ad3 = gpSize - bfNum + Ad0;
          Ad4 = Ad3 + gpSize;
          const CSAd = bfNum * numGps;
          const rt1b = F(F(x[Ad2] * C[CSAd]) + F(x[Ad4] * S[CSAd]));
          const rt2b = F(F(x[Ad4] * C[CSAd]) - F(x[Ad2] * S[CSAd]));
          x[Ad2] = F(x[Ad1] - rt1b);
          x[Ad1] = F(x[Ad1] + rt1b);
          x[Ad4] = F(x[Ad3] + rt2b);
          x[Ad3] = F(x[Ad3] - rt2b);
        }
      }
      gpSize *= 2;
      numBfs *= 2;
      numGps = Math.floor(numGps / 2);
    }
  }
}

/* FHT.fourier1D(float[] data, int windowType) の移植。
   data は呼び出し側で float32 化済みの通常配列。戻り値も通常配列。 */
function fhtFourier1D(data, windowType) {
  const F = Math.fround;
  const n = data.length;
  let size = 2;
  while (size < n) size *= 2; /* データが収まる2の冪 */
  const y = new Float32Array(size); /* 元データは触らず、2の冪へゼロ埋め */
  for (let i = 0; i < n; i++) y[i] = data[i];
  let sum = 0;
  if (windowType !== FHT_NO_WINDOW) {
    for (let x = 0; x < n; x++) {
      const z = (x + 0.5) * ((2 * Math.PI) / n);
      let w;
      if (windowType === FHT_HAMMING) w = 0.54 - 0.46 * Math.cos(z);
      else if (windowType === FHT_HANN) w = 1.0 - Math.cos(z);
      else if (windowType === FHT_FLATTOP)
        w = 1.0 - 1.90796 * Math.cos(z) + 1.07349 * Math.cos(2 * z) - 0.18199 * Math.cos(3 * z);
      else throw new Error("Invalid Fourier Window Type");
      y[x] = F(y[x] * w); /* float への複合代入 */
      sum += w;
    }
  } else {
    sum = n;
  }
  const invSum = 1.0 / sum;
  for (let x = 0; x < n; x++) y[x] = F(y[x] * invSum); /* 窓和（窓なしは n）で正規化 */
  const tables = fhtSinCosTables(size);
  fhtDfht3(y, size, tables.C, tables.S);
  const result = new Array(size / 2);
  result[0] = F(Math.sqrt(F(F(y[0] * y[0]) + F(y[0] * y[0]))));
  for (let x = 1; x < size / 2; x++)
    result[x] = F(Math.sqrt(F(F(y[x] * y[x]) + F(y[size - x] * y[size - x]))));
  return result;
}

/* ---------- レジストリ ---------- */

export const PURE = {
  /* ===== Array.*（Functions.java doArray 配下） ===== */

  /* concatArray: 配列は要素を展開し、スカラー・文字列は1要素として追加する */
  "Array.concat": (S, e, args, refs, H) => {
    if (args.length < 1)
      throw H.err("Array.concat の引数の数が違います", "書式は Array.concat(array1, array2, ...) で、引数は 1 個以上ですが、0 個渡しています。");
    const out = [];
    for (let i = 0; i < args.length; i++) {
      if (H.isUnk(args[i])) return H.unk;
      if (Array.isArray(args[i])) out.push(...args[i]);
      else out.push(args[i]);
    }
    if (out.length > 200000) return H.unk;
    H.step(e.line, "配列や値を連結して、新しい配列 " + H.fmt(out) + " を作ります");
    return out;
  },

  /* deleteArrayIndex: checkIndex で範囲外はエラー。新しい配列を返す */
  "Array.deleteIndex": (S, e, args, refs, H) => {
    arity(H, e, "Array.deleteIndex", "Array.deleteIndex(array, index)", 2, 2);
    const a = arrArg(H, e, "Array.deleteIndex", args[0]);
    if (a === null) return H.unk;
    const iv = numVal(H, args[1]);
    if (iv === null) return H.unk;
    const ix = H.int(iv);
    if (ix < 0 || ix >= a.length)
      throw H.err(
        "Array.deleteIndex の位置（" + ix + "）が配列の長さ（" + a.length + "）の範囲外です",
        "位置は 0〜" + (a.length - 1) + " で指定します。ImageJ ではここでエラーになり止まります。"
      );
    const out = a.filter((_, i) => i !== ix);
    H.step(e.line, "配列の " + ix + " 番目の要素を取り除いた新しい配列 " + H.fmt(out) + " を返します（元の配列は変わりません）");
    return out;
  },

  /* deleteArrayValue: 数値指定は数値要素の完全一致（NaN 同士も一致として削除）、
     文字列指定は文字列要素の完全一致だけを削除する（Functions.java の型分岐） */
  "Array.deleteValue": (S, e, args, refs, H) => {
    arity(H, e, "Array.deleteValue", "Array.deleteValue(array, value)", 2, 2);
    const a = arrArg(H, e, "Array.deleteValue", args[0]);
    if (a === null) return H.unk;
    if (H.isUnk(args[1])) return H.unk;
    let out;
    if (typeof args[1] === "string") {
      const sv = args[1];
      out = a.filter((x) => !(typeof x === "string" && x === sv));
    } else {
      const nv = numVal(H, args[1]);
      if (nv === null) return H.unk;
      out = a.filter(
        (x) =>
          !(
            typeof x === "number" &&
            (x === nv || (Number.isNaN(x) && Number.isNaN(nv)))
          )
      );
    }
    H.step(e.line, "配列から値 " + H.fmt(args[1]) + " に一致する要素をすべて取り除いた新しい配列 " + H.fmt(out) + " を返します（元の配列は変わりません）");
    return out;
  },

  /* fillArray: 全要素へ数値を代入し、同じ配列を返す（その場で書き換える） */
  "Array.fill": (S, e, args, refs, H) => {
    arity(H, e, "Array.fill", "Array.fill(array, value)", 2, 2);
    const a = arrArg(H, e, "Array.fill", args[0]);
    if (a === null) return H.unk;
    const v = numVal(H, args[1]);
    if (v === null) return H.unk;
    for (let i = 0; i < a.length; i++) a[i] = v;
    H.step(e.line, "配列の全要素を " + H.fmt(v) + " で埋めます");
    return a;
  },

  /* filterArray: 文字列要素だけが対象。要素の文字列が filter を含むものだけを
     残す。filter を括弧で囲むと正規表現として含むかを判定する（公式説明）。
     数値要素は getString() が null のため常に対象外（Functions.java） */
  "Array.filter": (S, e, args, refs, H) => {
    arity(H, e, "Array.filter", "Array.filter(array, filter)", 2, 2);
    const a = arrArg(H, e, "Array.filter", args[0]);
    if (a === null) return H.unk;
    const filter = strVal(H, args[1]);
    if (filter === null) return H.unk;
    let testFn;
    if (filter.startsWith("(") && filter.endsWith(")")) {
      let re;
      try { re = new RegExp(filter); }
      catch (ex) {
        throw H.err(
          "Array.filter の正規表現「" + filter + "」が不正です",
          "実 ImageJ では Java の PatternSyntaxException でマクロが止まります。パターンの書き方を確認してください。"
        );
      }
      testFn = (s) => re.test(s);
    } else {
      testFn = (s) => s.includes(filter);
    }
    const out = [];
    for (let i = 0; i < a.length; i++) {
      if (H.isUnk(a[i])) return H.unk;
      if (typeof a[i] === "string" && testFn(a[i])) out.push(a[i]);
    }
    H.step(e.line, "文字列が「" + filter + "」を含む要素だけを残した新しい配列 " + H.fmt(out) + " を返します");
    return out;
  },

  /* getSequence: getArg の (int) 変換で 0..n-1 を作る。負数は Java の
     NegativeArraySizeException 相当で止める（基礎 newArray の文面慣行） */
  "Array.getSequence": (S, e, args, refs, H) => {
    arity(H, e, "Array.getSequence", "Array.getSequence(n)", 1, 1);
    const nv = numVal(H, args[0]);
    if (nv === null) return H.unk;
    const n = H.int(nv);
    if (n < 0)
      throw H.err(
        "Array.getSequence の要素数（" + n + "）が負です",
        "ImageJ では \"Negative array size\" エラーになり止まります。要素数は 0 以上で指定してください。"
      );
    if (n > 200000) {
      H.step(e.line, "要素数 " + n + " の配列は大きすぎるため、内容は未確定として扱います");
      return H.unk;
    }
    const out = [];
    for (let i = 0; i < n; i++) out.push(i);
    H.step(e.line, "0 から " + (n - 1) + " までの連番の配列を作ります");
    return out;
  },

  /* getVertexAngles: Functions.java の式そのまま。
     phi = 180 - (180/π) * atan2(cross, dot)、180 以上は 360 を引いて寄せる */
  "Array.getVertexAngles": (S, e, args, refs, H) => {
    arity(H, e, "Array.getVertexAngles", "Array.getVertexAngles(xArr, yArr, arm)", 3, 3);
    const xx = numArrArg(H, e, "Array.getVertexAngles", args[0]);
    const yy = numArrArg(H, e, "Array.getVertexAngles", args[1]);
    if (xx === null || yy === null) return H.unk;
    if (xx.length !== yy.length)
      throw H.err(
        "Array.getVertexAngles の2つの配列の長さが違います",
        "x 座標と y 座標の配列は同じ長さでなければなりません（Functions.java の \"Same size expected\"）。"
      );
    const armRaw = numVal(H, args[2]);
    if (armRaw === null) return H.unk;
    const arm = H.int(armRaw);
    const len = xx.length;
    const out = new Array(len);
    for (let mid = 0; mid < len; mid++) {
      const left = (mid + 10 * len - arm) % len;
      const right = (mid + arm) % len;
      if (left < 0 || left >= len || right < 0 || right >= len)
        throw H.err(
          "Array.getVertexAngles の arm（" + arm + "）が範囲外です",
          "arm は 0〜" + len + " 程度の範囲で指定します。範囲外では ImageJ でも配列の範囲外エラーになり止まります。"
        );
      const dot =
        (xx[right] - xx[mid]) * (xx[left] - xx[mid]) +
        (yy[right] - yy[mid]) * (yy[left] - yy[mid]);
      const cross =
        (xx[right] - xx[mid]) * (yy[left] - yy[mid]) -
        (yy[right] - yy[mid]) * (xx[left] - xx[mid]);
      let phi = 180.0 - (180.0 / Math.PI) * Math.atan2(cross, dot);
      while (phi >= 180.0) phi -= 360.0;
      out[mid] = phi;
    }
    H.step(e.line, "輪郭の各頂点の角度（度、直線は 0）を計算します");
    return out;
  },

  /* printArray: Log へ1行で出力する（基礎 print と同じ Log 保持・上限）。
     先頭が文字列で配列でない引数は prefix として扱う（Functions.java） */
  "Array.print": (S, e, args, refs, H) => {
    let prefix = null, a = null;
    if (args.length === 1 && Array.isArray(args[0])) a = args[0];
    else if (args.length === 2 && typeof args[0] === "string" && Array.isArray(args[1])) {
      prefix = args[0];
      a = args[1];
    } else if (args.length >= 1 && H.isUnk(args[args.length - 1])) return H.unk;
    if (a === null)
      throw H.err(
        "Array.print の引数の数が違います",
        "書式は Array.print(array) か Array.print(\"prefix\", array) で、配列を 1 個渡しますが、" + args.length + " 個渡しています。"
      );
    const joined = a.map((x) => (H.isUnk(x) ? null : H.fmt(x)));
    if (joined.some((x) => x === null)) return H.unk;
    let txt = joined.join(", ");
    if (prefix !== null) txt = prefix + " " + txt;
    if (txt.length > 2000)
      txt = txt.slice(0, 1000) + "…（全" + txt.length + "文字のうち先頭1000文字のみ表示し、残りは省略しました）";
    if (S.log.length < 200) { S.log.push(txt); S.logLines.push(e.line); }
    else if (S.log.length === 200) { S.log.push("（Log 出力が200行を超えたため、以降は省略します）"); S.logLines.push(0); }
    H.step(e.line, "配列を Log に「" + txt + "」と出力します");
    return H.unk;
  },

  /* getRankPositions: 小さい順に並べたときの元位置の一覧（argsort）。
     公式説明 "starting with the index of the smallest value" と、Functions.java
     sortArray が Tools.rank の結果を並行配列の並べ替えに使うことから確定する。
     数値と文字列の混在はエラー（getRankPositions の "Mixed strings and numbers"）。
     同点の順序と文字列の大小は基礎 Array.sort の慣行（安定・大小無区別）に合わせる */
  "Array.rankPositions": (S, e, args, refs, H) => {
    arity(H, e, "Array.rankPositions", "Array.rankPositions(array)", 1, 1);
    const a = arrArg(H, e, "Array.rankPositions", args[0]);
    if (a === null) return H.unk;
    let hasNum = false, hasStr = false;
    for (let i = 0; i < a.length; i++) {
      if (H.isUnk(a[i])) return H.unk;
      if (typeof a[i] === "number") hasNum = true;
      else if (typeof a[i] === "string") hasStr = true;
    }
    if (hasNum && hasStr)
      throw H.err(
        "Array.rankPositions の配列に数値と文字列が混在しています",
        "ImageJ では \"Mixed strings and numbers\" エラーになり止まります。対象の配列は、数値だけか文字列だけにしてください。"
      );
    const order = a.map((v, i) => i);
    order.sort((p, q) => {
      const x = a[p], y = a[q];
      if (typeof x === "string" && typeof y === "string") {
        const lx = x.toLowerCase(), ly = y.toLowerCase();
        if (lx < ly) return -1;
        if (lx > ly) return 1;
        return p - q;
      }
      if (x < y) return -1;
      if (x > y) return 1;
      return p - q;
    });
    H.step(e.line, "配列を小さい順に並べたときの元の位置 " + H.fmt(order) + " を返します");
    return order;
  },

  /* reverseArray: その場で反転し、同じ配列を返す */
  "Array.reverse": (S, e, args, refs, H) => {
    arity(H, e, "Array.reverse", "Array.reverse(array)", 1, 1);
    const a = arrArg(H, e, "Array.reverse", args[0]);
    if (a === null) return H.unk;
    a.reverse();
    H.step(e.line, "配列の要素の順序を逆転させます");
    return a;
  },

  /* rotateArray: dest = (i + rot) % len へ移す（正の rot は右回転、公式説明）。
     rot が負の間は len を足して正にする（Functions.java そのまま） */
  "Array.rotate": (S, e, args, refs, H) => {
    arity(H, e, "Array.rotate", "Array.rotate(array, d)", 2, 2);
    const a = arrArg(H, e, "Array.rotate", args[0]);
    if (a === null) return H.unk;
    const rv = numVal(H, args[1]);
    if (rv === null) return H.unk;
    let rot = H.int(rv);
    const len = a.length;
    if (len === 0) return a;
    while (rot < 0) rot += len;
    const b = new Array(len);
    for (let i = 0; i < len; i++) b[(i + rot) % len] = a[i];
    for (let i = 0; i < len; i++) a[i] = b[i];
    H.step(e.line, "配列の要素を " + H.int(rv) + " 個分ずらします（正の値は右回転）");
    return a;
  },

  /* sliceArray: i1<0 は "Invalid argument" エラー。i2 は長さで切り詰め、
     負の長さは 0 として新しい配列を返す（Functions.java そのまま） */
  "Array.slice": (S, e, args, refs, H) => {
    arity(H, e, "Array.slice", "Array.slice(array, start, end)", 2, 3);
    const a = arrArg(H, e, "Array.slice", args[0]);
    if (a === null) return H.unk;
    const v1 = numVal(H, args[1]);
    if (v1 === null) return H.unk;
    const i1 = H.int(v1);
    let i2 = a.length;
    if (args.length > 2) {
      const v2 = numVal(H, args[2]);
      if (v2 === null) return H.unk;
      i2 = H.int(v2);
    }
    if (i1 < 0)
      throw H.err(
        "Array.slice の開始位置（" + i1 + "）が負です",
        "ImageJ では \"Invalid argument\" エラーになり止まります。開始位置は 0 以上で指定してください。"
      );
    if (i2 > a.length) i2 = a.length;
    let len2 = i2 - i1;
    if (len2 < 0) len2 = 0;
    if (len2 > a.length) len2 = a.length;
    const out = a.slice(i1, i1 + len2);
    H.step(e.line, "配列の " + i1 + " 番目から " + len2 + " 個の要素を取り出した新しい配列 " + H.fmt(out) + " を返します");
    return out;
  },

  /* trimArray: 先頭 size 個だけの新しい配列（size は 0〜長さに切り詰め） */
  "Array.trim": (S, e, args, refs, H) => {
    arity(H, e, "Array.trim", "Array.trim(array, n)", 2, 2);
    const a = arrArg(H, e, "Array.trim", args[0]);
    if (a === null) return H.unk;
    const sv = numVal(H, args[1]);
    if (sv === null) return H.unk;
    let size = H.int(sv);
    if (size < 0) size = 0;
    if (size > a.length) size = a.length;
    const out = a.slice(0, size);
    H.step(e.line, "配列の先頭 " + size + " 個だけの新しい配列 " + H.fmt(out) + " を返します（元の配列は変わりません）");
    return out;
  },

  "Array.show": {
    unsupported:
      "配列の内容を表示するウィンドウ（Results テーブル形式の表示）はモデルに無いため、表示内容を推測しません。",
  },
  /* fourierArray: 窓文字列は小文字化し、hamming（完全一致）／hann（前方一致、
     "Hanning" も可）／flat（前方一致）／no（前方一致）の順に判定する
     （Functions.java）。要素は (float) 化してから FHT.fourier1D に渡す。 */
  "Array.fourier": (S, e, args, refs, H) => {
    arity(H, e, "Array.fourier", "Array.fourier(values, window)", 1, 2);
    const a = numArrArg(H, e, "Array.fourier", args[0]);
    if (a === null) return H.unk;
    let windowType = FHT_NO_WINDOW;
    if (args.length >= 2) {
      const ws = strVal(H, args[1]);
      if (ws === null) return H.unk;
      const w = ws.toLowerCase();
      if (w === "hamming") windowType = FHT_HAMMING;
      else if (w.startsWith("hann")) windowType = FHT_HANN;
      else if (w.startsWith("flat")) windowType = FHT_FLATTOP;
      else if (!w.startsWith("no"))
        throw H.err(
          "Array.fourier の窓関数 '" + ws + "' は不正です",
          "ImageJ では \"Invalid Fourier window\" エラーになり止まります。窓は \"none\"、\"Hamming\"、\"Hann\"、\"flat-top\" のいずれかで指定してください。"
        );
    }
    const data = a.map((v) => Math.fround(v)); /* (float) キャスト */
    const out = fhtFourier1D(data, windowType);
    H.step(e.line, "配列のフーリエ振幅 " + H.fmt(out) + " を返します");
    return out;
  },
  /* resampleArray: Tools.resampleArray の線形補間そのまま（統合時に Tools.java を
     追加取得して確定。factor=(len2-1)/(len1-1)、標本位置 jj/factor、末尾は元の末尾。
     長さ1への resample は元の末尾要素になる。len1==1 は全要素がその値。
     Functions.resampleArray: 長さ0同士は "Cannot resample from or to zero-length" エラー） */
  "Array.resample": (S, e, args, refs, H) => {
    arity(H, e, "Array.resample", "Array.resample(array, newLength)", 2, 2);
    const a = numArrArg(H, e, "Array.resample", args[0]);
    if (a === null) return H.unk;
    const lv = numVal(H, args[1]);
    if (lv === null) return H.unk;
    const len2 = H.int(lv);
    const len1 = a.length;
    if (len1 === 0 || len2 <= 0)
      throw H.err(
        "Array.resample の長さが不正です（元の長さ " + len1 + "、新しい長さ " + len2 + "）",
        "ImageJ では \"Cannot resample from or to zero-length\" エラーになり止まります。元の配列は空でなく、新しい長さは 1 以上で指定してください。"
      );
    let out;
    if (len1 === 1) {
      out = new Array(len2).fill(a[0]);
    } else {
      const factor = (len2 - 1) / (len1 - 1);
      out = new Array(len2);
      for (let j = 0; j < len2 - 1; j++) {
        const pos = j / factor;
        const left = Math.floor(pos);
        const frac = pos - left;
        out[j] = a[left] + frac * (a[left + 1] - a[left]);
      }
      out[len2 - 1] = a[len1 - 1];
    }
    H.step(e.line, "配列を長さ " + len2 + " に線形補間でリサンプルした新しい配列 " + H.fmt(out) + " を返します");
    return out;
  },
  /* findArrayMaxima: edgeMode の既定は 0（端を含む）で、第3引数は (int) 化
     （Functions.java）。本体は MaximumFinder.findMaxima の移植。 */
  "Array.findMaxima": (S, e, args, refs, H) => {
    arity(H, e, "Array.findMaxima", "Array.findMaxima(values, tolerance, edgeMode)", 2, 3);
    const a = numArrArg(H, e, "Array.findMaxima", args[0]);
    if (a === null) return H.unk;
    const tv = numVal(H, args[1]);
    if (tv === null) return H.unk;
    let edgeMode = 0;
    if (args.length >= 3) {
      const ev = numVal(H, args[2]);
      if (ev === null) return H.unk;
      edgeMode = H.int(ev);
    }
    const out = maximumFinderFindMaxima(a, tv, edgeMode);
    H.step(e.line, "配列のピーク位置（振幅降順）" + H.fmt(out) + " を返します");
    return out;
  },
  /* findMinima は符号反転して findMaxima に委譲する（MaximumFinder 本体どおり） */
  "Array.findMinima": (S, e, args, refs, H) => {
    arity(H, e, "Array.findMinima", "Array.findMinima(values, tolerance, edgeMode)", 2, 3);
    const a = numArrArg(H, e, "Array.findMinima", args[0]);
    if (a === null) return H.unk;
    const tv = numVal(H, args[1]);
    if (tv === null) return H.unk;
    let edgeMode = 0;
    if (args.length >= 3) {
      const ev = numVal(H, args[2]);
      if (ev === null) return H.unk;
      edgeMode = H.int(ev);
    }
    const out = maximumFinderFindMinima(a, tv, edgeMode);
    H.step(e.line, "配列の谷位置（深さ降順）" + H.fmt(out) + " を返します");
    return out;
  },

  /* ===== Math.*（Functions.java doMath） ===== */

  /* constrain: Math.min(Math.max(n, min), max)（Functions.java の式そのまま） */
  "Math.constrain": (S, e, args, refs, H) => {
    arity(H, e, "Math.constrain", "Math.constrain(n, min, max)", 3, 3);
    const n = numVal(H, args[0]), lo = numVal(H, args[1]), hi = numVal(H, args[2]);
    if (n === null || lo === null || hi === null) return H.unk;
    return Math.min(Math.max(n, lo), hi);
  },

  /* map: (value-fromLow)*(toHigh-toLow)/(fromHigh-fromLow)+toLow
     （Functions.java の式そのまま） */
  "Math.map": (S, e, args, refs, H) => {
    arity(H, e, "Math.map", "Math.map(n, low1, high1, low2, high2)", 5, 5);
    const vs = args.map((a) => numVal(H, a));
    if (vs.some((v) => v === null)) return H.unk;
    return ((vs[0] - vs[1]) * (vs[4] - vs[3])) / (vs[2] - vs[1]) + vs[3];
  },

  "Math.erf": (S, e, args, refs, H) => {
    arity(H, e, "Math.erf", "Math.erf(x)", 1, 1);
    const v = numVal(H, args[0]);
    if (v === null) return H.unk;
    return erf(v);
  },
  "Math.toRadians": (S, e, args, refs, H) => {
    arity(H, e, "Math.toRadians", "Math.toRadians(degrees)", 1, 1);
    const v = numVal(H, args[0]);
    if (v === null) return H.unk;
    return (v * Math.PI) / 180; /* java.lang.Math.toRadians と同じ換算 */
  },
  "Math.toDegrees": (S, e, args, refs, H) => {
    arity(H, e, "Math.toDegrees", "Math.toDegrees(radians)", 1, 1);
    const v = numVal(H, args[0]);
    if (v === null) return H.unk;
    return (v * 180) / Math.PI; /* java.lang.Math.toDegrees と同じ換算 */
  },

  /* ===== String.*（Functions.java doString） ===== */

  /* appendToBuffer / getBuffer / resetBuffer: Interpreter のバッファを
     S 上に保持する。append と resetBuffer の戻り値は実 ImageJ では null
     （値なし）のため未確定値を返す */
  "String.append": (S, e, args, refs, H) => {
    arity(H, e, "String.append", "String.append(str)", 1, 1);
    const s = strVal(H, args[0]);
    if (s === null) return H.unk;
    if (typeof S.__ijStrBuf !== "string") S.__ijStrBuf = "";
    if (S.__ijStrBuf.length + s.length > 200000) return H.unk;
    S.__ijStrBuf += s;
    H.step(e.line, "文字列バッファに「" + s + "」を追加します（現在のバッファ: 「" + S.__ijStrBuf + "」）");
    return H.unk;
  },
  "String.buffer": (S, e, args, refs, H) => {
    arity(H, e, "String.buffer", "String.buffer", 0, 0);
    if (typeof S.__ijStrBuf !== "string") S.__ijStrBuf = "";
    return S.__ijStrBuf;
  },
  "String.resetBuffer": (S, e, args, refs, H) => {
    arity(H, e, "String.resetBuffer", "String.resetBuffer", 0, 0);
    S.__ijStrBuf = "";
    H.step(e.line, "文字列バッファを空にします");
    return H.unk;
  },

  /* format(): 第1引数は getFirstString、残りはすべて getNextArg（数値）。
     本体は java.util.Formatter の意味論（javaFormat） */
  "String.format": (S, e, args, refs, H) => {
    if (args.length < 1)
      throw H.err("String.format の引数の数が違います", "書式は String.format(format, n1, n2, ...) で、引数は 1 個以上ですが、0 個渡しています。");
    const format = strVal(H, args[0]);
    if (format === null) return H.unk;
    const params = [];
    for (let i = 1; i < args.length; i++) {
      const v = numVal(H, args[i]);
      if (v === null) return H.unk;
      params.push(v);
    }
    return javaFormat(H, e, format, params);
  },

  "String.copy": {
    unsupported: "OS のクリップボードへの書き込みはモデルに無いため、コピーしたことにしません。",
  },
  "String.copyResults": {
    unsupported: "OS のクリップボードへの書き込みはモデルに無いため、コピーしたことにしません。",
  },
  "String.paste": {
    unsupported: "OS のクリップボードの内容はモデルに無いため、貼り付け内容を推測しません。",
  },
  "String.show": {
    unsupported:
      "テキストウィンドウへの表示はモデルに無いため、表示したことにしません（Log への出力は print を使ってください）。",
  },
  "String.setFontSize": {
    unsupported:
      "描画フォントの大きさはモデルに無い（対象はアクティブ画像の描画設定）ため、設定したことにしません。",
  },

  /* ===== File のパス文字列操作（Functions.java doFile、java.io.File の意味論） ===== */

  "File.getName": (S, e, args, refs, H) => {
    arity(H, e, "File.getName", "File.getName(path)", 1, 1);
    const s = strVal(H, args[0]);
    if (s === null) return H.unk;
    const name = fileNameOf(s);
    H.step(e.line, "パス「" + s + "」からファイル名「" + name + "」を取り出します");
    return name;
  },
  /* getNameWithoutExtension: 名前の最後の "." から後ろを取り除く
     （Functions.java の doFile 内の実装そのまま。長さ制限はない） */
  "File.getNameWithoutExtension": (S, e, args, refs, H) => {
    arity(H, e, "File.getNameWithoutExtension", "File.getNameWithoutExtension(path)", 1, 1);
    const s = strVal(H, args[0]);
    if (s === null) return H.unk;
    let name = fileNameOf(s);
    const dot = name.lastIndexOf(".");
    if (dot >= 0) name = name.substring(0, dot);
    H.step(e.line, "パス「" + s + "」から拡張子を除いた名前「" + name + "」を取り出します");
    return name;
  },
  /* getDirectory: 親パス（\ は / に置換）に末尾 "/" を付けて返す。
     親が無い場合は ""（Functions.java そのまま） */
  "File.getDirectory": (S, e, args, refs, H) => {
    arity(H, e, "File.getDirectory", "File.getDirectory(path)", 1, 1);
    const s = strVal(H, args[0]);
    if (s === null) return H.unk;
    const parent = fileParentOf(s);
    const dir = parent === null ? "" : parent.replace(/\\/g, "/") + "/";
    H.step(e.line, "パス「" + s + "」からディレクトリ部分「" + dir + "」を取り出します");
    return dir;
  },
  /* getParent: 親パスをそのまま返す（末尾の区切りなし）。
     親が無い場合、Java の File.getParent() は null を返すが、マクロ表面では
     getDirectory と同じく空文字列として扱う */
  "File.getParent": (S, e, args, refs, H) => {
    arity(H, e, "File.getParent", "File.getParent(path)", 1, 1);
    const s = strVal(H, args[0]);
    if (s === null) return H.unk;
    const parent = fileParentOf(s);
    const out = parent === null ? "" : parent;
    H.step(e.line, "パス「" + s + "」から親ディレクトリ「" + out + "」を取り出します");
    return out;
  },
  "File.getDefaultDir": {
    unsupported:
      "ファイルダイアログの既定ディレクトリ（OS・作業ディレクトリ依存）はモデルに無いため、値を推測しません。",
  },

  /* ===== IJ.* ===== */

  "IJ.pad": (S, e, args, refs, H) => padImpl(H, e, "IJ.pad", args),

  /* checksum(): method は大文字化して判定する。FILE+MD5 → STRING+MD5 →
     FILE+SHA-256 → STRING+SHA-256 の順（Functions.java そのまま）。
     文字列形式は UTF-8 バイト列のハッシュの16進小文字。
     ファイル形式はモデルファイルの text 内容だけがバイト列として確定する。
     存在しないパスやディレクトリは公式説明どおり "0" を返す */
  "IJ.checksum": (S, e, args, refs, H) => {
    arity(H, e, "IJ.checksum", "IJ.checksum(method, source)", 2, 2);
    const methodRaw = strVal(H, args[0]);
    const src = strVal(H, args[1]);
    if (methodRaw === null || src === null) return H.unk;
    const method = methodRaw.toUpperCase();
    let isFile = null, algo = null;
    if (method.includes("FILE") && method.includes("MD5")) { isFile = true; algo = "MD5"; }
    else if (method.includes("STRING") && method.includes("MD5")) { isFile = false; algo = "MD5"; }
    else if (method.includes("FILE") && method.includes("SHA-256")) { isFile = true; algo = "SHA-256"; }
    else if (method.includes("STRING") && method.includes("SHA-256")) { isFile = false; algo = "SHA-256"; }
    else
      throw H.err(
        "IJ.checksum の method が不正です",
        "method には 'file' か 'string' と、'MD5' か 'SHA-256' の両方を含めてください（実 ImageJ のエラー: \"must contain 'file' or 'string' and 'MD5' or 'SHA-256'\"）。"
      );
    let text = src;
    if (isFile) {
      const entry = Object.prototype.hasOwnProperty.call(S.files, src) ? S.files[src] : null;
      if (!entry) return "0";
      if (typeof entry.text !== "string") return H.unk;
      text = entry.text;
    }
    const bytes = utf8Bytes(text);
    return algo === "MD5" ? md5hex(bytes) : sha256hex(bytes);
  },

  "IJ.getFullVersion": {
    unverified:
      "書式は VERSION+BUILD と確定するが、モデルの runtime にはビルド番号が無く、返す文字列が確定しない。",
  },
  "IJ.freeMemory": {
    unsupported: "JVM のメモリ使用量は実行環境依存でモデルに無いため、値を推測しません。",
  },
  "IJ.currentMemory": {
    unsupported: "JVM のメモリ使用量は実行環境依存でモデルに無いため、値を推測しません。",
  },
  "IJ.maxMemory": {
    unsupported: "JVM のヒープ上限は実行環境依存でモデルに無いため、値を推測しません。",
  },
  "IJ.getToolName": {
    unsupported: "現在選択中のツールはモデルに無いため、ツール名を推測しません。",
  },

  /* ===== 名前空間なしの純粋関数 ===== */

  /* toString(2)/(16): (int) 変換のうえ Integer.toBinaryString/toHexString。
     負数は32ビット2の補数表現になる（Java の規則どおり >>> 0 で再現） */
  "toBinary": (S, e, args, refs, H) => {
    arity(H, e, "toBinary", "toBinary(number)", 1, 1);
    const v = numVal(H, args[0]);
    if (v === null) return H.unk;
    return (H.int(v) >>> 0).toString(2);
  },
  "toHex": (S, e, args, refs, H) => {
    arity(H, e, "toHex", "toHex(number)", 1, 1);
    const v = numVal(H, args[0]);
    if (v === null) return H.unk;
    return (H.int(v) >>> 0).toString(16);
  },

  /* getTime: System.currentTimeMillis()（Functions.java）。実行時に決まる値 */
  "getTime": (S, e, args, refs, H) => {
    arity(H, e, "getTime", "getTime()", 0, 0);
    H.step(e.line, "現在の時刻（ミリ秒）を取得します。値は実行時に決まります");
    return H.unk;
  },

  /* wait: IJ.wait((int)n)。シミュレーションでは実際には待たない */
  "wait": (S, e, args, refs, H) => {
    arity(H, e, "wait", "wait(n)", 1, 1);
    const v = numVal(H, args[0]);
    if (v === null) {
      H.step(e.line, "指定された時間だけ待ちます（時間は実行時に決まります。シミュレーションでは実際には待ちません）");
      return H.unk;
    }
    H.step(e.line, H.int(v) + " ミリ秒待ちます（シミュレーションでは実際には待ちません）");
    return H.unk;
  },

  /* ===== モデル外の読み取り（未対応） ===== */

  "getStringWidth": {
    unsupported:
      "文字列の描画幅はフォント計測（アクティブ画像のフォント設定）に依存し、モデルにフォントが無いため、幅を推測しません。",
  },
  "getFontList": {
    unsupported: "OS にインストールされたフォントの一覧はモデルに無いため、値を推測しません。",
  },
  "screenWidth": {
    unsupported: "画面の幅は実行環境依存でモデルに無いため、値を推測しません。",
  },
  "screenHeight": {
    unsupported: "画面の高さは実行環境依存でモデルに無いため、値を推測しません。",
  },
  "toolID": {
    unsupported: "現在選択中のツールはモデルに無いため、ツール ID を推測しません。",
  },
  /* Colors.wavelengthToColor: 区間式・減衰・ガンマ（0.8）は Colors.java で確定 */
  "Color.wavelengthToColor": (S, e, args, refs, H) => {
    arity(H, e, "Color.wavelengthToColor", "Color.wavelengthToColor(wavelength)", 1, 1);
    const wl = numVal(H, args[0]);
    if (wl === null) return H.unk;
    return wavelengthToColorStr(wl);
  },
};
