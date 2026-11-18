// 高度モード B4：R 高度関数グループ「文字列・テキスト」（高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 意味論は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3 の実測、
// および R 4.3 系統の公式ソース（character.c／sprintf.c／grep.c／agrep.c／
// names.c／unique.c／format.R 等）で裁定した。根拠と未対応の線引きは
// 報告書 docs/audit/ADV-B4-r-eng2.md に記録する。
// ロケールは UTF-8 ロケールをモデル化する（JS 文字列が Unicode 前提の
// ため。sQuote のファンシー引用符・大文字小文字変換・make.names の
// 文字判定などがこの前提に乗る）。
// 値モデルに無い型（リスト・属性付きベクトル）を返す関数は登録しない。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}

// ---- 引数照合（SPEC 第4章：matchArgs を正とし、部分一致と余分な引数の
// 名指し停止を補う。nameOnly は `...` の後ろにある仮引数＝名前でのみ指定可）
// ※ eng1（functions-advanced-math.js）と同一の実装。
function bindArgs(ctx, formals, opts = {}) {
  const { args, vals, api, node, H } = ctx;
  const dots = !!opts.dots;
  const nameOnly = new Set(opts.nameOnly ?? []);
  const matchFormals = formals.filter((f) => !nameOnly.has(f));
  const showV = (v) => H.show(v);
  const unusedFail = (a, v) =>
    api.fail(
      a.argName
        ? `unused argument (${a.argName} = ${showV(v)})`
        : `unused argument (${showV(v)})`,
      node,
    );
  const seenExact = new Set();
  for (const a of args) {
    if (a.argName && (formals.includes(a.argName) || nameOnly.has(a.argName))) {
      if (seenExact.has(a.argName))
        api.fail(
          `formal argument "${a.argName}" matched by multiple actual arguments`,
          node,
        );
      seenExact.add(a.argName);
    }
  }
  const hasPartial = args.some(
    (a) =>
      a.argName &&
      !formals.includes(a.argName) &&
      formals.some((f) => f.startsWith(a.argName)),
  );
  const hasPositional = args.some((a) => !a.argName);
  const result = new Map();
  const dotList = [];
  if (hasPartial && hasPositional) {
    const used = new Set();
    args.forEach((a, i) => {
      if (a.argName && (formals.includes(a.argName) || nameOnly.has(a.argName))) {
        result.set(a.argName, { present: true, value: vals[i] });
        used.add(i);
      }
    });
    args.forEach((a, i) => {
      if (!a.argName || formals.includes(a.argName) || nameOnly.has(a.argName)) return;
      const cand = formals.filter((f) => f.startsWith(a.argName));
      if (cand.length === 1) {
        if (result.has(cand[0]))
          api.fail(
            `formal argument "${cand[0]}" matched by multiple actual arguments`,
            node,
          );
        result.set(cand[0], { present: true, value: vals[i] });
        used.add(i);
      } else if (cand.length > 1)
        api.fail(`argument ${i + 1} matches multiple formal arguments`, node);
    });
    let fi = 0;
    args.forEach((a, i) => {
      if (a.argName || used.has(i)) return;
      while (fi < matchFormals.length && result.has(matchFormals[fi])) fi++;
      if (fi < matchFormals.length) {
        result.set(matchFormals[fi], { present: true, value: vals[i] });
        used.add(i);
        fi++;
      }
    });
    args.forEach((a, i) => {
      if (used.has(i)) return;
      if (dots) dotList.push({ name: a.argName ?? null, value: vals[i] });
      else unusedFail(a, vals[i]);
    });
  } else {
    const m = ctx.matchArgs(matchFormals);
    for (const f of matchFormals)
      if (m[f]?.present) result.set(f, { present: true, value: m[f].value });
    args.forEach((a, i) => {
      if (a.argName && nameOnly.has(a.argName))
        result.set(a.argName, { present: true, value: vals[i] });
    });
    const exactFilled = new Set(
      args
        .filter((a) => a.argName && matchFormals.includes(a.argName))
        .map((a) => a.argName),
    );
    let posSeen = 0;
    const posCapacity = matchFormals.length - exactFilled.size;
    args.forEach((a, i) => {
      if (!a.argName) {
        posSeen++;
        if (posSeen > posCapacity) {
          if (dots) dotList.push({ name: null, value: vals[i] });
          else unusedFail(a, vals[i]);
        }
        return;
      }
      if (formals.includes(a.argName) || nameOnly.has(a.argName)) return;
      const cand = formals.filter((f) => f.startsWith(a.argName));
      if (cand.length === 1 && !nameOnly.has(cand[0])) {
        if (result.has(cand[0]))
          api.fail(
            `formal argument "${cand[0]}" matched by multiple actual arguments`,
            node,
          );
        result.set(cand[0], { present: true, value: vals[i] });
      } else if (cand.length > 1)
        api.fail(`argument ${i + 1} matches multiple formal arguments`, node);
      else if (dots) dotList.push({ name: a.argName, value: vals[i] });
      else unusedFail(a, vals[i]);
    });
  }
  return {
    has: (n) => result.has(n),
    val: (n) => result.get(n)?.value,
    req: (n) => {
      if (!result.has(n))
        api.fail(`argument "${n}" is missing, with no default`, node);
      return result.get(n).value;
    },
    dots: dotList,
  };
}

// ---- スカラー引数の解釈（eng1 と同じ規則）
function asLogical(ctx, v, label) {
  if (v === null || v === undefined) fail(ctx, "argument is of length zero");
  const els = ctx.H.vec(v);
  if (!els.length) fail(ctx, "argument is of length zero");
  const el = els[0];
  if (ctx.H.isNA(el) || ctx.H.isNaNVal(el))
    fail(ctx, "missing value where TRUE/FALSE needed");
  if (typeof el === "boolean") return el;
  if (typeof el === "number") return el !== 0;
  if (typeof el === "string") {
    if (["TRUE", "T", "True", "true"].includes(el)) return true;
    if (["FALSE", "F", "False", "false"].includes(el)) return false;
  }
  fail(ctx, "argument is not interpretable as logical");
}

// as.character 相当のベクトル化。数値は formatRNum（15 有効桁）、論理値は
// "TRUE"/"FALSE"、NaN は "NaN"。NA は既定で NA マーカーのまま保持し、
// naToString のときだけ文字列 "NA" にする（paste 系の規則）。
function charVec(ctx, v, { dfMsg, naToString = false } = {}) {
  const H = ctx.H;
  if (isDf(v)) fail(ctx, dfMsg ?? "データフレームはこの関数の対象外です");
  if (v === null || v === undefined) return { els: [], names: null };
  const raw = H.vec(v);
  const els = raw.map((el) => {
    if (H.isNA(el)) return naToString ? "NA" : H.NA;
    if (typeof el === "string") return el;
    if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
    if (typeof el === "number") return H.formatRNum(el);
    fail(ctx, "この型は文字列に変換できません");
  });
  return { els, names: H.namesOf(v) };
}

// 数値ベクトル化（as.numeric 相当）。文字列は数値として解釈し、失敗は
// NA＋coercedNA フラグ（警告は呼び出し側の規則に従う）。
function numVec(ctx, v, { dfMsg } = {}) {
  const H = ctx.H;
  if (isDf(v)) fail(ctx, dfMsg ?? "データフレームはこの関数の対象外です");
  if (v === null || v === undefined) return { els: [], names: null, coercedNA: false };
  let coercedNA = false;
  const els = H.vec(v).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    if (typeof el === "string") {
      const t = el.trim();
      const n = t === "" ? NaN : Number(t);
      if (Number.isNaN(n) && t !== "NaN") {
        coercedNA = true;
        return H.NA;
      }
      return n;
    }
    fail(ctx, "数値に変換できない型です");
  });
  return { els, names: H.namesOf(v), coercedNA };
}

// 「長さ > 1 なら警告して先頭だけ使う」引数（pattern／replacement／
// old／new／whitespace 等、実 R の sub／grep／chartr 系の規則）。
function firstString(ctx, cv, argName) {
  if (!cv.els.length) fail(ctx, `invalid '${argName}' argument`);
  if (cv.els.length > 1)
    warn(ctx, `argument '${argName}' has length > 1 and only the first element will be used`);
  return cv.els[0];
}

// match.arg 相当（部分一致つき）。実 R のメッセージ形式に倣う。
function matchArgEnum(ctx, v, choices) {
  const H = ctx.H;
  if (v === null || v === undefined) fail(ctx, "'arg' must be NULL or a character vector");
  const els = H.vec(v);
  const el = els[0];
  if (!els.length || typeof el !== "string")
    fail(ctx, "'arg' must be NULL or a character vector");
  if (choices.includes(el)) return el;
  const cand = choices.filter((c) => c.startsWith(el));
  if (cand.length === 1) return cand[0];
  fail(ctx, `'arg' should be one of ${choices.map((c) => `"${c}"`).join(", ")}`);
}

// 表示幅（nchar(type="width") 相当）：全角系は 2、結合文字と制御文字は
// 0、それ以外は 1。実 R の wcwidth と概ね一致する近似で、CJK 統合
// 漢字・ハングル・全角形・絵文字系の主要レンジを 2 とする。
const isWideCp = (cp) =>
  (cp >= 0x1100 && cp <= 0x115f) ||
  (cp >= 0x2e80 && cp <= 0xa4cf) ||
  (cp >= 0xac00 && cp <= 0xd7a3) ||
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0xfe30 && cp <= 0xfe4f) ||
  (cp >= 0xff00 && cp <= 0xff60) ||
  (cp >= 0xffe0 && cp <= 0xffe6) ||
  (cp >= 0x1f300 && cp <= 0x1f9ff) ||
  (cp >= 0x20000 && cp <= 0x3fffd);
function charWidth(cp) {
  if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return 0;
  if (/\p{M}/u.test(String.fromCodePoint(cp))) return 0;
  return isWideCp(cp) ? 2 : 1;
}
const displayWidth = (s) => {
  let w = 0;
  for (const ch of s) w += charWidth(ch.codePointAt(0));
  return w;
};
const utf8ByteLen = (s) => new TextEncoder().encode(s).length;
const codePoints = (s) => [...s];
// ローンサロゲート（実 R では不正なマルチバイト文字列に相当）の検出。
const hasLoneSurrogate = (s) => {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = s.charCodeAt(i + 1);
      if (!(d >= 0xdc00 && d <= 0xdfff)) return true;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) return true;
  }
  return false;
};

// ---- C の printf と一致する厳密10進フォーマット（sprintf／formatC 共用）
// JS の toFixed は二進値を正確に展開しないため、倍精度の厳密な10進
// 展開（BigInt）を求めてから10進で丸める。丸めは同点で偶数丸め
// （C の printf の FE_TONEAREST と一致）。
function exactDecimal(x) {
  // x は有限非ゼロ。戻り値 { neg, digits, E }：値 = ±digits[0].digits[1..] × 10^E
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0), lo = buf.getUint32(4);
  const neg = (hi >>> 31) !== 0;
  const biased = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e2;
  if (biased === 0) {
    e2 = -1074;
  } else {
    mant |= 1n << 52n;
    e2 = biased - 1075;
  }
  let digits, E;
  if (e2 >= 0) {
    digits = (mant << BigInt(e2)).toString();
    E = digits.length - 1;
  } else {
    const k = -e2;
    digits = (mant * 5n ** BigInt(k)).toString();
    E = digits.length - 1 - k;
  }
  return { neg, digits, E };
}
// 有効数字 keep 桁への丸め。keep <= 0（小数部に届かない）も扱う。
function roundSigDigits(digits, E, keep) {
  if (keep < 0) return { digits: "0", E: 0, zero: true };
  if (keep === 0) {
    let up = false;
    if (digits[0] > "5") up = true;
    else if (digits[0] === "5" && /[1-9]/.test(digits.slice(1))) up = true;
    if (!up) return { digits: "0", E: 0, zero: true };
    return { digits: "1", E: E + 1, zero: false };
  }
  if (digits.length <= keep) return { digits, E, zero: false };
  let kept = digits.slice(0, keep);
  const rest = digits.slice(keep);
  let up = false;
  if (rest[0] > "5") up = true;
  else if (rest[0] === "5") {
    if (/[1-9]/.test(rest.slice(1))) up = true;
    else up = Number(kept[keep - 1]) % 2 === 1;
  }
  if (up) {
    const arr = kept.split("").map(Number);
    let i = arr.length - 1;
    while (i >= 0 && arr[i] === 9) {
      arr[i] = 0;
      i--;
    }
    if (i < 0) return { digits: "1", E: E + 1, zero: false };
    arr[i]++;
    kept = arr.join("");
  }
  return { digits: kept, E, zero: false };
}
function renderFixed(digits, E, decimals) {
  let intPart, fracPart;
  if (E >= 0) {
    const padded = digits.padEnd(E + 1, "0");
    intPart = padded.slice(0, E + 1);
    fracPart = padded.slice(E + 1).padEnd(decimals, "0").slice(0, decimals);
  } else {
    intPart = "0";
    fracPart = ("0".repeat(-E - 1) + digits).padEnd(decimals, "0").slice(0, decimals);
  }
  return decimals > 0 ? intPart + "." + fracPart : intPart;
}
function renderSci(digits, E, decimals, upper) {
  const mant = digits[0] + (decimals > 0 ? "." + digits.slice(1).padEnd(decimals, "0") : "");
  const exp = (E < 0 ? "-" : "+") + String(Math.abs(E)).padStart(2, "0");
  return mant + (upper ? "E" : "e") + exp;
}
// 符号・幅・0 埋めの適用（printf のフィールド規則）。
function applyField(body, spec) {
  const { neg, plusFlag, spaceFlag, width, leftJustify, zeroPad, prefix = "" } = spec;
  const sign = neg ? "-" : plusFlag ? "+" : spaceFlag ? " " : "";
  let core = sign + prefix + body;
  if (width != null && core.length < width) {
    const pad = width - core.length;
    if (leftJustify) core = core + " ".repeat(pad);
    else if (zeroPad) core = sign + prefix + "0".repeat(pad) + body;
    else core = " ".repeat(pad) + core;
  }
  return core;
}
// %f／%e／%g の本体（符号・幅なし）。spec: {verb, prec, alt}
function formatFloatBody(x, spec) {
  const { verb, prec, alt } = spec;
  if (x === 0) {
    const neg = Object.is(x, -0);
    if (verb === "f") {
      const d = prec ?? 6;
      return { neg, body: renderFixed("0", 0, d) + (alt && d === 0 ? "." : "") };
    }
    if (verb === "e" || verb === "E") {
      const d = prec ?? 6;
      let body = renderSci("0", 0, d, verb === "E");
      if (alt && d === 0) body = body.replace(/([eE])/, ".$1");
      return { neg, body };
    }
    const P = prec === 0 ? 1 : (prec ?? 6);
    return { neg, body: alt ? renderFixed("0", 0, P - 1) : "0" };
  }
  const { neg, digits, E } = exactDecimal(x);
  if (verb === "f") {
    const decimals = prec ?? 6;
    const r = roundSigDigits(digits, E, E + 1 + decimals);
    if (r.zero) return { neg, body: renderFixed("0", 0, decimals) + (alt && decimals === 0 ? "." : "") };
    let body = renderFixed(r.digits, r.E, decimals);
    if (alt && decimals === 0) body += ".";
    return { neg, body };
  }
  if (verb === "e" || verb === "E") {
    const decimals = prec ?? 6;
    const r = roundSigDigits(digits, E, decimals + 1);
    if (r.zero) return { neg, body: renderSci("0", 0, decimals, verb === "E") };
    let body = renderSci(r.digits, r.E, decimals, verb === "E");
    if (alt && decimals === 0) body = body.replace(/([eE])/, ".$1");
    return { neg, body };
  }
  // %g／%G
  let P = prec ?? 6;
  if (P === 0) P = 1;
  const r = roundSigDigits(digits, E, P);
  if (r.zero) return { neg, body: alt ? renderFixed("0", 0, P - 1) : "0" };
  const X = r.E;
  let body;
  if (X >= -4 && X < P) {
    body = renderFixed(r.digits, X, P - 1 - X);
    if (!alt) {
      if (body.includes(".")) body = body.replace(/0+$/, "").replace(/\.$/, "");
    } else if (!body.includes(".")) body += ".";
  } else {
    body = renderSci(r.digits, X, P - 1, verb === "G");
    if (!alt) {
      const idx = body.search(/[eE]/);
      const m = body.slice(0, idx).replace(/0+$/, "").replace(/\.$/, "");
      body = m + body.slice(idx);
    } else if (!body.includes(".")) body = body.replace(/([eE])/, ".$1");
  }
  return { neg, body };
}
// %a（16進浮動小数）。IEEE 754 のビットから直接構成する。
function formatHexFloatBody(x, spec) {
  const { prec, upper } = spec;
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0), lo = buf.getUint32(4);
  const neg = (hi >>> 31) !== 0;
  const biased = (hi >>> 20) & 0x7ff;
  const frac = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  const X = upper ? "X" : "x", P = upper ? "P" : "p";
  if (x === 0)
    return { neg, body: `0${X}0` + (prec != null && prec > 0 ? "." + "0".repeat(prec) : "") + `${P}+0` };
  let lead, exp;
  if (biased === 0) {
    lead = 0;
    exp = -1022;
  } else {
    lead = 1;
    exp = biased - 1023;
  }
  let fracHex = frac.toString(16).padStart(13, "0");
  if (prec == null) {
    fracHex = fracHex.replace(/0+$/, "");
  } else if (prec < 13) {
    const dropBits = BigInt(4 * (13 - prec));
    const half = 1n << (dropBits - 1n);
    let kept = frac >> dropBits;
    const rem = frac - (kept << dropBits);
    if (rem > half || (rem === half && (kept & 1n) === 1n)) kept += 1n;
    if (kept >= (1n << BigInt(4 * prec))) {
      lead += 1;
      kept = 0n;
    }
    fracHex = prec === 0 ? "" : kept.toString(16).padStart(prec, "0");
  } else if (prec > 13) {
    fracHex = fracHex.padEnd(prec, "0");
  }
  if (upper) fracHex = fracHex.toUpperCase();
  const body =
    `0${X}${lead}` + (fracHex ? "." + fracHex : "") + `${P}${exp < 0 ? "-" : "+"}${Math.abs(exp)}`;
  return { neg, body };
}

// ---- R の正規表現（POSIX ERE、TRE）から JS RegExp への翻訳
// 線引き（報告書に明記）：
//  - POSIX 文字クラス [[:alpha:]] 等は Unicode プロパティへ展開する。
//  - '.' は改行にも一致する（TRE の規則どおり [\s\S] に翻訳）。
//  - '$' は文字列の絶対末尾のみ（JS の $ の「末尾改行の前」癖を避ける
//    ため (?![\s\S]) に翻訳）。'^' は JS でも先頭のみで一致する。
//  - \w は UTF-8 ロケールの単語文字 [\p{L}\p{N}_] に展開する。
//  - 量指定子の重ね掛け（a+? の遅延量指定子、a** 等）は TRE と JS で
//    言語が異なるため名指し停止する。
//  - 照合クラス [[. .]]・等価クラス [[= =]] は名指し停止する。
//  - 不正な {（区間量指定子として解釈できない）ものは TRE がエラーに
//    するので名指し停止する。
const POSIX_CLASSES = {
  alnum: "\\p{L}\\p{N}",
  alpha: "\\p{L}",
  blank: " \\t",
  cntrl: "\\p{Cc}",
  digit: "0-9",
  graph: "\\p{L}\\p{N}\\p{P}\\p{S}",
  lower: "\\p{Ll}",
  print: "\\p{L}\\p{N}\\p{P}\\p{S} ",
  punct: "\\p{P}",
  space: "\\s",
  upper: "\\p{Lu}",
  xdigit: "0-9A-Fa-f",
};
const WORD_CHARS = "\\p{L}\\p{N}_";
const escapeLiteralChar = (c) => {
  if (".*+?()|[]{}^$\\".includes(c)) return "\\" + c;
  const cp = c.codePointAt(0);
  if (cp < 0x20 || cp === 0x7f) return "\\x" + cp.toString(16).padStart(2, "0");
  return c;
};
const escapeClassChar = (c) => {
  if (c === "\\") return "\\\\";
  if (c === "]") return "\\]";
  if (c === "[") return "\\[";
  if (c === "^") return "\\^";
  if (c === "-") return "\\-";
  const cp = c.codePointAt(0);
  if (cp < 0x20 || cp === 0x7f) return "\\x" + cp.toString(16).padStart(2, "0");
  return c;
};

function translateRegex(ctx, pattern, { ignoreCase = false } = {}) {
  const chars = codePoints(pattern);
  const failRe = () => fail(ctx, `invalid regular expression '${pattern}'`);
  // グループ総数（後方参照の検証用に先読みで数える）。
  let totalGroups = 0;
  {
    let inClass = false;
    for (let k = 0; k < chars.length; k++) {
      const c = chars[k];
      if (c === "\\") {
        k++;
        continue;
      }
      if (inClass) {
        if (c === "]") inClass = false;
        continue;
      }
      if (c === "[") inClass = true;
      else if (c === "(") totalGroups++;
    }
  }
  let i = 0;
  let hasAlt = false;
  let hasBoundary = false;
  const peekInterval = (pos) => {
    // chars[pos] == '{' のとき、妥当な区間量指定子なら {src, end} を返す。
    let j = pos + 1;
    let n = "";
    while (j < chars.length && /[0-9]/.test(chars[j])) n += chars[j++];
    if (n === "") return null;
    let m = null;
    if (chars[j] === ",") {
      j++;
      m = "";
      while (j < chars.length && /[0-9]/.test(chars[j])) m += chars[j++];
    }
    if (chars[j] !== "}") return null;
    const nv = Number(n), mv = m === null || m === "" ? null : Number(m);
    if (nv > 255 || (mv != null && (mv > 255 || mv < nv))) return null;
    return { src: chars.slice(pos, j + 1).join(""), end: j + 1 };
  };
  function parseClass() {
    // chars[i] == '['
    i++;
    let negate = false;
    if (chars[i] === "^") {
      negate = true;
      i++;
    }
    const items = [];
    if (chars[i] === "]") {
      items.push("\\]");
      i++;
    }
    let closed = false;
    while (i < chars.length) {
      const c = chars[i];
      if (c === "]") {
        i++;
        closed = true;
        break;
      }
      if (c === "[" && (chars[i + 1] === ":" || chars[i + 1] === "." || chars[i + 1] === "=")) {
        const kind = chars[i + 1];
        if (kind !== ":")
          fail(ctx, "正規表現の照合クラス／等価クラス（[[. .]]／[[= =]]）は未対応です");
        let j = i + 2;
        let name = "";
        while (j < chars.length && !(chars[j] === ":" && chars[j + 1] === "]")) name += chars[j++];
        if (j >= chars.length) failRe();
        if (!Object.hasOwn(POSIX_CLASSES, name)) failRe();
        items.push(POSIX_CLASSES[name]);
        i = j + 2;
        continue;
      }
      const c1 = c;
      i++;
      if (chars[i] === "-" && chars[i + 1] !== undefined && chars[i + 1] !== "]") {
        i++;
        if (chars[i] === "[" && chars[i + 1] === ":") failRe();
        const c2 = chars[i];
        if (c2 === undefined) failRe();
        i++;
        if (c2.codePointAt(0) < c1.codePointAt(0)) failRe();
        items.push(escapeClassChar(c1) + "-" + escapeClassChar(c2));
      } else {
        items.push(escapeClassChar(c1));
      }
    }
    if (!closed) failRe();
    return "[" + (negate ? "^" : "") + items.join("") + "]";
  }
  function parseEscape() {
    // chars[i] == '\\'
    i++;
    if (i >= chars.length) failRe();
    const c = chars[i++];
    if (/[1-9]/.test(c)) {
      if (Number(c) > totalGroups) failRe();
      return "\\" + c;
    }
    switch (c) {
      case "b":
        hasBoundary = true;
        return `(?:(?<=[${WORD_CHARS}])(?![${WORD_CHARS}])|(?<![${WORD_CHARS}])(?=[${WORD_CHARS}]))`;
      case "B":
        hasBoundary = true;
        return `(?:(?<=[${WORD_CHARS}])(?=[${WORD_CHARS}])|(?<![${WORD_CHARS}])(?![${WORD_CHARS}]))`;
      case "<":
        hasBoundary = true;
        return `(?<![${WORD_CHARS}])(?=[${WORD_CHARS}])`;
      case ">":
        hasBoundary = true;
        return `(?<=[${WORD_CHARS}])(?![${WORD_CHARS}])`;
      case "w":
        return `[${WORD_CHARS}]`;
      case "W":
        return `[^${WORD_CHARS}]`;
      case "d":
        return "[0-9]";
      case "D":
        return "[^0-9]";
      case "s":
        return "\\s";
      case "S":
        return "\\S";
      case "n":
        return "\\n";
      case "t":
        return "\\t";
      case "r":
        return "\\r";
      case "f":
        return "\\f";
      case "v":
        return "\\v";
      case "a":
        return "\\x07";
      case "e":
        return "\\x1b";
      default:
        // TRE では未知のエスケープはその文字自体（\0 は "0"、\y は "y"）。
        return escapeLiteralChar(c);
    }
  }
  function parseAtom(depth) {
    const c = chars[i];
    if (c === "(") {
      i++;
      const inner = parseAlt(depth + 1);
      if (chars[i] !== ")") failRe();
      i++;
      return { src: "(" + inner + ")", quantified: false };
    }
    if (c === "[") return { src: parseClass(), quantified: false };
    if (c === ".") {
      i++;
      return { src: "[\\s\\S]", quantified: false };
    }
    if (c === "^") {
      i++;
      hasBoundary = true;
      return { src: "^", quantified: false };
    }
    if (c === "$") {
      i++;
      hasBoundary = true;
      return { src: "(?![\\s\\S])", quantified: false };
    }
    if (c === "\\") return { src: parseEscape(), quantified: false };
    if (c === "{") {
      // 原子位置の区間量指定子は空の式への量指定として働く（TRE）。
      const iv = peekInterval(i);
      if (!iv) failRe();
      i = iv.end;
      return { src: "(?:)" + iv.src, quantified: true };
    }
    // 原子位置の * + ? は TRE ではリテラル文字。')' の不一致もリテラル。
    i++;
    return { src: escapeLiteralChar(c), quantified: false };
  }
  function parseConcat(depth) {
    let out = "";
    while (i < chars.length) {
      const c = chars[i];
      if (c === "|") break;
      if (c === ")" && depth > 0) break;
      let atom = parseAtom(depth);
      let quantified = atom.quantified;
      while (i < chars.length) {
        const q = chars[i];
        let qsrc = null;
        if (q === "*" || q === "+" || q === "?") {
          qsrc = q;
          i++;
        } else if (q === "{") {
          const iv = peekInterval(i);
          if (!iv) failRe();
          qsrc = iv.src;
          i = iv.end;
        } else break;
        if (quantified)
          fail(ctx, "量指定子の重ね掛け（遅延量指定子など）は R の正規表現と JS で意味が異なるため未対応です");
        atom = { src: atom.src + qsrc, quantified: true };
        quantified = true;
      }
      out += atom.src;
    }
    return out;
  }
  function parseAlt(depth) {
    const parts = [parseConcat(depth)];
    while (chars[i] === "|") {
      hasAlt = true;
      i++;
      parts.push(parseConcat(depth));
    }
    return parts.join("|");
  }
  const src = parseAlt(0);
  if (i < chars.length) failRe();
  let regex;
  try {
    regex = new RegExp(src, "u" + (ignoreCase ? "i" : ""));
  } catch {
    failRe();
  }
  return { regex, hasAlt, hasBoundary, src };
}

// grep 系の共通引数処理。pattern は as.character され、先頭要素のみを
// 警告つきで使う。perl=TRUE／useBytes=TRUE は名指し停止。
function grepCommon(ctx, b, { withValue = false, withInvert = false } = {}) {
  const H = ctx.H;
  const patternV = b.req("pattern");
  const xV = b.req("x");
  const ignoreCase = b.has("ignore.case") ? asLogical(ctx, b.val("ignore.case")) : false;
  const perl = b.has("perl") ? asLogical(ctx, b.val("perl")) : false;
  const fixed = b.has("fixed") ? asLogical(ctx, b.val("fixed")) : false;
  const useBytes = b.has("useBytes") ? asLogical(ctx, b.val("useBytes")) : false;
  const value = withValue ? (b.has("value") ? asLogical(ctx, b.val("value")) : false) : false;
  const invert = withInvert ? (b.has("invert") ? asLogical(ctx, b.val("invert")) : false) : false;
  if (perl) fail(ctx, "perl = TRUE は未対応です（PCRE と JS RegExp の差異が大きいため）");
  if (useBytes) fail(ctx, "useBytes = TRUE は未対応です（バイト単位の意味論は再現できません）");
  const patCv = charVec(ctx, patternV);
  const pattern = firstString(ctx, patCv, "pattern");
  const xv = charVec(ctx, xV);
  return { ignoreCase, fixed, value, invert, pattern, xv, H };
}
// 各要素の一致状態（true／false／NA）を返す。fixed のときはリテラル検索。
// NA の要素は実 R では一致しない（FALSE）。NA になるのはパターンが
// NA のときだけ。
function grepStates(ctx, pattern, xv, { fixed, ignoreCase }) {
  const H = ctx.H;
  if (H.isNA(pattern)) return xv.els.map(() => H.NA);
  if (fixed) {
    const needle = ignoreCase ? pattern.toLowerCase() : pattern;
    return xv.els.map((el) => {
      if (H.isNA(el)) return false;
      const hay = ignoreCase ? el.toLowerCase() : el;
      return hay.includes(needle);
    });
  }
  const { regex } = translateRegex(ctx, pattern, { ignoreCase });
  return xv.els.map((el) => {
    if (H.isNA(el)) return false;
    return regex.test(el);
  });
}
const grepHandler = (ctx) => {
  const b = bindArgs(ctx, ["pattern", "x", "ignore.case", "perl", "value", "fixed", "useBytes", "invert"]);
  const { fixed, ignoreCase, value, invert, pattern, xv, H } = grepCommon(ctx, b, { withValue: true, withInvert: true });
  const states = grepStates(ctx, pattern, xv, { fixed, ignoreCase });
  if (H.isNA(pattern)) {
    // パターンが NA のとき、実 R の grep は要素ごとに NA を返す。
    if (value) {
      const out = xv.els.map(() => H.NA);
      return xv.names ? H.withNames(out, xv.names) : out;
    }
    return xv.els.map(() => H.NA);
  }
  const picked = [];
  states.forEach((st, idx) => {
    const take = invert ? st !== true : st === true;
    if (take) picked.push(idx);
  });
  if (value) {
    const out = picked.map((idx) => xv.els[idx]);
    return xv.names ? H.withNames(out, picked.map((idx) => xv.names[idx])) : out;
  }
  return picked.map((idx) => idx + 1);
};
const greplHandler = (ctx) => {
  const b = bindArgs(ctx, ["pattern", "x", "ignore.case", "perl", "fixed", "useBytes"]);
  const { fixed, ignoreCase, pattern, xv } = grepCommon(ctx, b);
  // grepl は実 R では名前を落とす。
  return grepStates(ctx, pattern, xv, { fixed, ignoreCase });
};
const grepvHandler = (ctx) => {
  // grepv は R 4.3.3 には存在せず R-devel で追加された関数。データ班の
  // 宣言（value=TRUE が既定の grep）に従って実装する（報告書に明記）。
  const b = bindArgs(ctx, ["pattern", "x", "ignore.case", "perl", "value", "fixed", "useBytes", "invert"]);
  const bb = {
    req: (n) => b.req(n),
    has: (n) => b.has(n),
    val: (n) => b.val(n),
  };
  const { fixed, ignoreCase, invert, pattern, xv, H } = grepCommon(ctx, bb, { withValue: true, withInvert: true });
  const value = b.has("value") ? asLogical(ctx, b.val("value")) : true;
  const states = grepStates(ctx, pattern, xv, { fixed, ignoreCase });
  if (H.isNA(pattern)) {
    if (value) {
      const out = xv.els.map(() => H.NA);
      return xv.names ? H.withNames(out, xv.names) : out;
    }
    return xv.els.map(() => H.NA);
  }
  const picked = [];
  states.forEach((st, idx) => {
    const take = invert ? st !== true : st === true;
    if (take) picked.push(idx);
  });
  if (value) {
    const out = picked.map((idx) => xv.els[idx]);
    return xv.names ? H.withNames(out, picked.map((idx) => xv.names[idx])) : out;
  }
  return picked.map((idx) => idx + 1);
};
// sub／gsub の置換文字列処理：\1〜\9 はグループ（無ければ空文字列）、
// \\ は \、その他の \c は c 自体。fixed のときは完全にリテラル。
function replacementText(rep, m) {
  let out = "";
  for (let k = 0; k < rep.length; k++) {
    const c = rep[k];
    if (c === "\\" && k + 1 < rep.length) {
      const d = rep[k + 1];
      if (d >= "1" && d <= "9") {
        out += m[Number(d)] ?? "";
        k++;
        continue;
      }
      if (d === "\\") {
        out += "\\";
        k++;
        continue;
      }
      out += d;
      k++;
      continue;
    }
    out += c;
  }
  return out;
}
const subHandler = (global) => (ctx) => {
  const b = bindArgs(ctx, ["pattern", "replacement", "x", "ignore.case", "perl", "fixed", "useBytes"]);
  const H = ctx.H;
  const perl = b.has("perl") ? asLogical(ctx, b.val("perl")) : false;
  const useBytes = b.has("useBytes") ? asLogical(ctx, b.val("useBytes")) : false;
  const fixed = b.has("fixed") ? asLogical(ctx, b.val("fixed")) : false;
  const ignoreCase = b.has("ignore.case") ? asLogical(ctx, b.val("ignore.case")) : false;
  if (perl) fail(ctx, "perl = TRUE は未対応です（PCRE と JS RegExp の差異が大きいため）");
  if (useBytes) fail(ctx, "useBytes = TRUE は未対応です（バイト単位の意味論は再現できません）");
  const pattern = firstString(ctx, charVec(ctx, b.req("pattern")), "pattern");
  const repCv = charVec(ctx, b.req("replacement"));
  const replacement = firstString(ctx, repCv, "replacement");
  const xv = charVec(ctx, b.req("x"));
  if (H.isNA(pattern)) return xv.els.map(() => H.NA);
  const repIsNA = H.isNA(replacement);
  // パターンのコンパイルは要素ループの前に行う（実 R は長さ0の x でも
  // 不正なパターンをエラーにする）。fixed でない場合に用意する。
  // 選択肢（|）を含む場合は POSIX の最左最長一致を、固定した部分文字列
  // への全一致テストで再現する（境界アサーションを含む場合は停止）。
  let regex = null, reGlobal = null, anchored = null;
  if (!fixed) {
    const t = translateRegex(ctx, pattern, { ignoreCase });
    if (t.hasAlt) {
      if (t.hasBoundary)
        fail(ctx, "選択肢（|）と境界アサーション（^／$／\\b 等）を併用するパターンは sub／gsub では未対応です（POSIX の最長一致を再現できないため）");
      anchored = new RegExp("^(?:" + t.src + ")$", t.regex.flags);
    } else {
      regex = t.regex;
      reGlobal = new RegExp(regex.source, regex.flags + "g");
    }
  }
  const doOne = (el) => {
    if (H.isNA(el)) return H.NA;
    if (fixed) {
      const hay = ignoreCase ? el.toLowerCase() : el;
      const needle = ignoreCase ? pattern.toLowerCase() : pattern;
      if (global) {
        if (needle === "") {
          if (repIsNA) return H.NA;
          // 空パターンは各文字の間と前後に挿入される。
          const cps = codePoints(el);
          return replacement + cps.map((c) => c + replacement).join("");
        }
        let out = "", pos = 0, hit = false;
        for (;;) {
          const idx = hay.indexOf(needle, pos);
          if (idx < 0) break;
          hit = true;
          if (repIsNA) return H.NA;
          out += el.slice(pos, idx) + replacement;
          pos = idx + needle.length;
        }
        if (!hit) return el;
        return out + el.slice(pos);
      }
      const idx = hay.indexOf(needle);
      if (idx < 0) return el;
      if (repIsNA) return H.NA;
      return el.slice(0, idx) + replacement + el.slice(idx + needle.length);
    }
    if (anchored) {
      const cps = codePoints(el);
      const off = [0];
      for (const c of cps) off.push(off[off.length - 1] + c.length);
      const findFrom = (startCp) => {
        for (let s = startCp; s <= cps.length; s++) {
          for (let e = cps.length; e >= s; e--) {
            const m = anchored.exec(el.slice(off[s], off[e]));
            if (m) return { s, e, m };
          }
        }
        return null;
      };
      if (!global) {
        const f = findFrom(0);
        if (!f) return el;
        if (repIsNA) return H.NA;
        return el.slice(0, off[f.s]) + replacementText(replacement, f.m) + el.slice(off[f.e]);
      }
      let out = "", pos = 0;
      for (;;) {
        const f = findFrom(pos);
        if (!f) {
          out += el.slice(off[pos]);
          break;
        }
        if (repIsNA) return H.NA;
        out += el.slice(off[pos], off[f.s]) + replacementText(replacement, f.m);
        if (f.e === f.s) {
          if (f.e < cps.length) {
            out += cps[f.e];
            pos = f.e + 1;
          } else break;
        } else pos = f.e;
      }
      return out;
    }
    const re = global ? reGlobal : regex;
    let hit = false;
    const out = el.replace(re, (...m) => {
      hit = true;
      if (repIsNA) return "";
      return replacementText(replacement, m);
    });
    if (hit && repIsNA) return H.NA;
    return out;
  };
  const out = xv.els.map(doOne);
  return xv.names ? H.withNames(out, xv.names) : out;
};

// ---- trimws／startsWith／endsWith
const trimwsHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "which", "whitespace"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  const which = b.has("which") ? matchArgEnum(ctx, b.val("which"), ["both", "left", "right"]) : "both";
  const wsCv = b.has("whitespace") ? charVec(ctx, b.val("whitespace")) : { els: ["[ \t\r\n]"], names: null };
  if (!wsCv.els.length || H.isNA(wsCv.els[0])) fail(ctx, "invalid 'pattern' argument");
  const ws = wsCv.els[0];
  // 実 R は内部で sub() を呼ぶため、whitespace が長さ > 1 だと sub の
  // パターン長警告が（both では左右の2回）出る。
  const sides = which === "both" ? 2 : 1;
  if (wsCv.els.length > 1)
    for (let k = 0; k < sides; k++)
      warn(ctx, "argument 'pattern' has length > 1 and only the first element will be used");
  const leftRe = which !== "right" ? translateRegex(ctx, "^" + ws + "+").regex : null;
  const rightRe = which !== "left" ? translateRegex(ctx, ws + "+$").regex : null;
  const out = xv.els.map((el) => {
    if (H.isNA(el)) return H.NA;
    let s = el;
    if (leftRe) s = s.replace(leftRe, "");
    if (rightRe) s = s.replace(rightRe, "");
    return s;
  });
  return xv.names ? H.withNames(out, xv.names) : out;
};
const startsEndsHandler = (isPrefix) => (ctx) => {
  const b = bindArgs(ctx, ["x", isPrefix ? "prefix" : "suffix"]);
  const H = ctx.H;
  const checkChar = (v) => {
    if (isDf(v)) fail(ctx, "データフレームはこの関数の対象外です");
    if (v === null || v === undefined) return { els: [], names: null };
    const raw = H.vec(v);
    for (const el of raw)
      if (!H.isNA(el) && typeof el !== "string") fail(ctx, "non-character object(s)");
    // スカラー NA（論理値 NA）は非文字列としてエラー。配列中の NA は
    // NA_character_ として結果を NA にする（実 R の区別を表現で近似）。
    if (!Array.isArray(v) && H.isNA(raw[0])) fail(ctx, "non-character object(s)");
    return { els: raw.map((el) => (H.isNA(el) ? H.NA : el)), names: null };
  };
  const xv = checkChar(b.req("x"));
  const pv = checkChar(b.req(isPrefix ? "prefix" : "suffix"));
  const n = Math.max(xv.els.length, pv.els.length);
  if (!xv.els.length || !pv.els.length) return [];
  const out = [];
  for (let k = 0; k < n; k++) {
    const el = xv.els[k % xv.els.length];
    const p = pv.els[k % pv.els.length];
    if (H.isNA(el) || H.isNA(p)) out.push(H.NA);
    else out.push(isPrefix ? el.startsWith(p) : el.endsWith(p));
  }
  return out;
};

// ---- paste／paste0
function pasteCore(ctx, b, defaultSep) {
  const H = ctx.H;
  let sep = defaultSep;
  if (b.has("sep")) {
    const sv = charVec(ctx, b.val("sep"));
    if (!sv.els.length || H.isNA(sv.els[0])) fail(ctx, "invalid separator");
    sep = sv.els[0];
  }
  let collapse = null;
  if (b.has("collapse") && b.val("collapse") !== null && b.val("collapse") !== undefined) {
    const cv = charVec(ctx, b.val("collapse"));
    if (!cv.els.length || H.isNA(cv.els[0])) fail(ctx, "invalid 'collapse' argument");
    collapse = cv.els[0];
  }
  const recycle0 = b.has("recycle0") ? asLogical(ctx, b.val("recycle0")) : false;
  const parts = b.dots.map((d) => charVec(ctx, d.value, { naToString: true }));
  if (!parts.length) return [];
  const lens = parts.map((p) => p.els.length);
  const L = Math.max(...lens);
  if (recycle0 && lens.some((l) => l === 0)) {
    return collapse != null ? [""] : [];
  }
  if (L === 0) return [];
  const rows = [];
  for (let k = 0; k < L; k++) {
    rows.push(parts.map((p) => (p.els.length ? p.els[k % p.els.length] : "")).join(sep));
  }
  if (collapse != null) return [rows.join(collapse)];
  return rows;
}
const pasteHandler = (ctx) => {
  const b = bindArgs(ctx, [], { dots: true, nameOnly: ["sep", "collapse", "recycle0"] });
  return pasteCore(ctx, b, " ");
};
const paste0Handler = (ctx) => {
  const b = bindArgs(ctx, [], { dots: true, nameOnly: ["collapse", "recycle0"] });
  return pasteCore(ctx, b, "");
};

// ---- sprintf（gettextf と共用する中核）
const SPRINTF_VERBS = "diosfeEgGxXaA";
function sprintfTypeError(ctx, tag, specText) {
  if (tag === "character") fail(ctx, `invalid format '${specText}'; use format %s for character objects`);
  if (tag === "integer") fail(ctx, `invalid format '${specText}'; use format %d, %i, %o, %x or %X for integer objects`);
  if (tag === "logical") fail(ctx, `invalid format '${specText}'; use format %d or %i for logical objects`);
  fail(ctx, `invalid format '${specText}'; use format %f, %e, %g or %a for numeric objects`);
}
function prepSprintfArg(ctx, v) {
  const H = ctx.H;
  if (isDf(v)) fail(ctx, "unsupported type");
  if (v === null || v === undefined) return { tag: "logical", els: [], len: 0, used: false };
  const raw = H.vec(v);
  let tag = "logical";
  for (const el of raw) {
    if (H.isNA(el)) continue;
    if (typeof el === "string") {
      tag = "character";
      break;
    }
    if (typeof el === "number") {
      tag = "double";
      break;
    }
  }
  return { tag, els: [...raw], len: raw.length, used: false };
}
// 1要素の整数書式（%d %i %o %x %X）。value は int32 範囲の整数。
function formatIntElement(value, spec) {
  const { verb, prec, alt, plusFlag, spaceFlag, width, leftJustify, zeroFlag } = spec;
  let prefix = "", digits, neg = false;
  if (verb === "d" || verb === "i") {
    neg = value < 0;
    digits = String(Math.abs(value));
    if (prec != null) digits = digits.padStart(prec, "0");
    if (value === 0 && prec === 0) digits = "";
  } else {
    const u = value >>> 0;
    if (verb === "o") {
      digits = u.toString(8);
      if (prec != null) digits = digits.padStart(prec, "0");
      if (alt && !digits.startsWith("0")) digits = "0" + digits;
      if (u === 0 && prec === 0 && !alt) digits = "";
      if (u === 0 && prec === 0 && alt) digits = "0";
    } else {
      digits = u.toString(16);
      if (verb === "X") digits = digits.toUpperCase();
      if (prec != null) digits = digits.padStart(prec, "0");
      if (value === 0 && prec === 0) digits = "";
      if (alt && u !== 0) prefix = verb === "X" ? "0X" : "0x";
    }
  }
  return applyField(digits, {
    neg,
    plusFlag: (verb === "d" || verb === "i") && plusFlag,
    spaceFlag: (verb === "d" || verb === "i") && spaceFlag,
    width,
    leftJustify,
    zeroPad: zeroFlag && prec == null,
    prefix,
  });
}
function formatStringElement(str, spec) {
  let s = str;
  if (spec.prec != null) s = codePoints(s).slice(0, spec.prec).join("");
  if (spec.width != null && s.length < spec.width) {
    const pad = " ".repeat(spec.width - s.length);
    s = spec.leftJustify ? s + pad : pad + s;
  }
  return s;
}
function sprintfCore(ctx, fmtEls, dataVals) {
  const H = ctx.H;
  const args = dataVals.map((v) => prepSprintfArg(ctx, v));
  const nfmt = fmtEls.length;
  if (!nfmt) return [];
  if (args.some((a) => a.len === 0)) return [];
  let maxlen = nfmt;
  for (const a of args) maxlen = Math.max(maxlen, a.len);
  if (maxlen % nfmt !== 0 || args.some((a) => maxlen % a.len !== 0))
    fail(ctx, "arguments cannot be recycled to the same length");
  if (args.length >= 100) fail(ctx, "only 100 arguments are allowed");
  let intRangeWarned = false;
  const getArg = (idx) => {
    if (idx >= args.length) fail(ctx, "too few arguments");
    return args[idx];
  };
  // ns == 0 の行でのみ起きる型強制（sprintf.c の状態性）。
  const coerceForVerb = (arg, verb, specText, ns) => {
    if (ns !== 0) return;
    const intVerb = "dioxX".includes(verb);
    const floatVerb = "feEgGaA".includes(verb);
    if (intVerb && arg.tag === "double") {
      let ok = true;
      for (const el of arg.els) {
        if (H.isNA(el)) continue;
        if (typeof el !== "number" || !Number.isFinite(el) || Math.trunc(el) !== el || el < -2147483648 || el > 2147483647) {
          ok = false;
          break;
        }
      }
      if (!ok) sprintfTypeError(ctx, "double", specText);
      arg.tag = "integer";
      arg.els = arg.els.map((el) => {
        if (H.isNA(el)) return el;
        if (el === -2147483648) {
          if (!intRangeWarned) {
            intRangeWarned = true;
            warn(ctx, "NAs introduced by coercion to integer range");
          }
          return H.NA;
        }
        return el;
      });
    } else if (floatVerb && arg.tag === "logical") {
      arg.tag = "double";
      arg.els = arg.els.map((el) => (H.isNA(el) ? el : el ? 1 : 0));
    } else if (floatVerb && arg.tag === "integer") {
      arg.tag = "double";
    } else if (verb === "s" && arg.tag !== "character") {
      arg.tag = "character";
      arg.els = arg.els.map((el) => {
        if (H.isNA(el)) return el;
        if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
        if (typeof el === "number") return H.formatRNum(el);
        return el;
      });
    }
  };
  const formatOne = (arg, el, spec) => {
    const { verb, specText, junk } = spec;
    if (junk) sprintfTypeError(ctx, arg.tag, specText);
    if (arg.tag === "logical") {
      if (verb !== "d" && verb !== "i") sprintfTypeError(ctx, "logical", specText);
      if (H.isNA(el)) return formatStringElement("NA", { ...spec, prec: null });
      return formatIntElement(el ? 1 : 0, spec);
    }
    if (arg.tag === "integer") {
      if (!"dioxX".includes(verb)) sprintfTypeError(ctx, "integer", specText);
      if (H.isNA(el)) return formatStringElement("NA", { ...spec, prec: null });
      return formatIntElement(el, spec);
    }
    if (arg.tag === "double") {
      if (!"feEgGaA".includes(verb)) sprintfTypeError(ctx, "double", specText);
      if (H.isNA(el)) {
        const t = spec.spaceFlag ? " NA" : "NA";
        return formatStringElement(t, { ...spec, prec: null });
      }
      if (Number.isNaN(el)) {
        const t = spec.spaceFlag ? " NaN" : "NaN";
        return formatStringElement(t, { ...spec, prec: null });
      }
      if (!Number.isFinite(el)) {
        const t = el > 0 ? (spec.plusFlag ? "+Inf" : spec.spaceFlag ? " Inf" : "Inf") : "-Inf";
        return formatStringElement(t, { ...spec, prec: null });
      }
      const { neg, body } =
        verb === "a" || verb === "A"
          ? formatHexFloatBody(el, { prec: spec.prec, upper: verb === "A" })
          : formatFloatBody(el, { verb, prec: spec.prec, alt: spec.alt });
      return applyField(body, {
        neg,
        plusFlag: spec.plusFlag,
        spaceFlag: spec.spaceFlag,
        width: spec.width,
        leftJustify: spec.leftJustify,
        zeroPad: spec.zeroFlag,
        prefix: verb === "a" || verb === "A" ? "" : "",
      });
    }
    // character
    if (verb !== "s") sprintfTypeError(ctx, "character", specText);
    return formatStringElement(H.isNA(el) ? "NA" : el, spec);
  };
  const out = [];
  for (let ns = 0; ns < maxlen; ns++) {
    // 引数の消費カウンタは行ごとに 0 に戻る（sprintf.c の規則）。
    // 要素は各引数の ns 番目（リサイクル）が使われる。
    let cnt = 0;
    const fmtEl = fmtEls[ns % nfmt];
    if (H.isNA(fmtEl)) {
      out.push("NA");
      continue;
    }
    const fmt = fmtEl;
    let result = "";
    let i = 0;
    while (i < fmt.length) {
      const c = fmt[i];
      if (c !== "%") {
        result += c;
        i++;
        continue;
      }
      if (fmt[i + 1] === "%") {
        result += "%";
        i += 2;
        continue;
      }
      // 変換指定の切り分け：% の後、最初の変換文字までが1つの指定。
      let j = i + 1;
      while (j < fmt.length && !SPRINTF_VERBS.includes(fmt[j])) j++;
      if (j >= fmt.length)
        fail(ctx, `unrecognised format specification '${fmt.slice(i)}'`);
      const specText = fmt.slice(i, j + 1);
      const verb = fmt[j];
      let inner = fmt.slice(i + 1, j);
      let valuePos = null;
      const pm = /^(\d+)\$/.exec(inner);
      if (pm) {
        valuePos = Number(pm[1]);
        inner = inner.slice(pm[0].length);
      }
      if ((inner.match(/\*/g) ?? []).length > 1)
        fail(ctx, "at most one asterisk '*' is supported in each conversion specification");
      // フラグ・幅・精度の解析。
      let k = 0;
      const flags = new Set();
      while (k < inner.length && "-+ #0".includes(inner[k])) flags.add(inner[k++]);
      let width = null, widthStar = null;
      if (inner[k] === "*") {
        k++;
        const sm = /^(\d+)\$/.exec(inner.slice(k));
        if (sm) {
          widthStar = { pos: Number(sm[1]) };
          k += sm[0].length;
        } else widthStar = { pos: null };
      } else {
        let w = "";
        while (k < inner.length && /[0-9]/.test(inner[k])) w += inner[k++];
        if (w !== "") width = Number(w);
      }
      let prec = null, precStar = null;
      if (inner[k] === ".") {
        k++;
        if (inner[k] === "*") {
          k++;
          const sm = /^(\d+)\$/.exec(inner.slice(k));
          if (sm) {
            precStar = { pos: Number(sm[1]) };
            k += sm[0].length;
          } else precStar = { pos: null };
        } else {
          let p = "";
          while (k < inner.length && /[0-9]/.test(inner[k])) p += inner[k++];
          prec = p === "" ? 0 : Number(p);
        }
      }
      const junk = k < inner.length;
      const spec = {
        verb,
        specText,
        junk,
        prec,
        width,
        alt: flags.has("#"),
        plusFlag: flags.has("+"),
        spaceFlag: flags.has(" "),
        leftJustify: flags.has("-"),
        zeroFlag: flags.has("0"),
      };
      const takeStar = (star) => {
        let idx;
        if (star.pos != null) {
          if (star.pos < 1 || star.pos > args.length)
            fail(ctx, `reference to non-existent argument ${star.pos}`);
          idx = star.pos - 1;
        } else idx = cnt++;
        const a = getArg(idx);
        a.used = true;
        if (ns === 0) {
          if (a.tag === "character" || a.tag === "logical")
            fail(ctx, "argument for '*' conversion specification must be a number");
          if (a.tag === "double") {
            a.tag = "integer";
            a.els = a.els.map((el) => (H.isNA(el) ? el : Math.trunc(el)));
          }
        }
        const el = a.els[ns % a.len];
        if (H.isNA(el) || typeof el !== "number" || Number.isNaN(el))
          fail(ctx, "argument for '*' conversion specification must be a number");
        return el;
      };
      if (widthStar) {
        const sv = takeStar(widthStar);
        if (sv < 0) {
          spec.leftJustify = true;
          spec.width = -sv;
        } else spec.width = sv;
      }
      if (precStar) {
        const sv = takeStar(precStar);
        if (sv < 0)
          fail(ctx, "sprintf の '*' による負の精度指定は再現できません（negative '*' precision is not supported）");
        spec.prec = sv;
      }
      let argIdx;
      if (valuePos != null) {
        if (valuePos < 1 || valuePos > args.length)
          fail(ctx, `reference to non-existent argument ${valuePos}`);
        argIdx = valuePos - 1;
      } else argIdx = cnt++;
      const arg = getArg(argIdx);
      arg.used = true;
      coerceForVerb(arg, verb, specText, ns);
      const el = arg.els[ns % arg.len];
      result += formatOne(arg, el, spec);
      i = j + 1;
    }
    out.push(result);
  }
  const unused = args.filter((a) => !a.used).length;
  if (unused > 0) {
    const base = unused === 1 ? "one argument not used" : `${unused} arguments not used`;
    if (nfmt === 1) warn(ctx, `${base} by format '${H.isNA(fmtEls[0]) ? "NA" : fmtEls[0]}'`);
    else warn(ctx, base);
  }
  return out;
}
const sprintfHandler = (ctx) => {
  const b = bindArgs(ctx, ["fmt"], { dots: true });
  const H = ctx.H;
  const fmtV = b.req("fmt");
  if (isDf(fmtV)) fail(ctx, "'fmt' is not a character vector");
  const rawEls = fmtV === null || fmtV === undefined ? [] : H.vec(fmtV);
  for (const el of rawEls)
    if (!H.isNA(el) && typeof el !== "string") fail(ctx, "'fmt' is not a character vector");
  return sprintfCore(ctx, rawEls, b.dots.map((d) => d.value));
};
const gettextfHandler = (ctx) => {
  // gettextf は sprintf(gettext(fmt, domain, trim), ...) 。カタログが
  // 無い環境では gettext は fmt をそのまま返し（trim は翻訳結果にのみ
  // 効くため）実質 sprintf と同一になる（実 R 4.3.3 で実測）。
  const b = bindArgs(ctx, ["fmt"], { dots: true, nameOnly: ["domain", "trim"] });
  const H = ctx.H;
  const fmtV = b.req("fmt");
  if (isDf(fmtV)) fail(ctx, "'fmt' is not a character vector");
  const rawEls = fmtV === null || fmtV === undefined ? [] : H.vec(fmtV);
  for (const el of rawEls)
    if (!H.isNA(el) && typeof el !== "string") fail(ctx, "'fmt' is not a character vector");
  return sprintfCore(ctx, rawEls, b.dots.map((d) => d.value));
};

// ---- substr／substring
function substrCore(ctx, xv, starts, stops) {
  const H = ctx.H;
  return xv.els.map((el, idx) => {
    const st = starts[idx], sp = stops[idx];
    if (H.isNA(el) || H.isNA(st) || H.isNA(sp)) return H.NA;
    const cps = codePoints(el);
    const s = Math.max(st, 1);
    const e = Math.min(sp, cps.length);
    if (e < s) return "";
    return cps.slice(s - 1, e).join("");
  });
}
const substrHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "start", "stop"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  if (!xv.els.length) return [];
  const startV = b.req("start"), stopV = b.req("stop");
  const startNv = numVec(ctx, startV), stopNv = numVec(ctx, stopV);
  if (!startNv.els.length || !stopNv.els.length) fail(ctx, "invalid substring arguments");
  if (startNv.coercedNA || stopNv.coercedNA) warn(ctx, "NAs introduced by coercion");
  const n = xv.els.length;
  const starts = Array.from({ length: n }, (_, i) => {
    const el = startNv.els[i % startNv.els.length];
    return H.isNA(el) ? el : Math.trunc(el);
  });
  const stops = Array.from({ length: n }, (_, i) => {
    const el = stopNv.els[i % stopNv.els.length];
    return H.isNA(el) ? el : Math.trunc(el);
  });
  const out = substrCore(ctx, xv, starts, stops);
  return xv.names ? H.withNames(out, xv.names) : out;
};
const substringHandler = (ctx) => {
  const b = bindArgs(ctx, ["text", "first", "last"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("text"));
  const firstNv = numVec(ctx, b.req("first"));
  if (!firstNv.els.length) fail(ctx, "invalid substring arguments");
  let lastNv;
  if (b.has("last")) {
    if (b.val("last") === null || b.val("last") === undefined) fail(ctx, "invalid substring arguments");
    lastNv = numVec(ctx, b.val("last"));
    if (!lastNv.els.length) fail(ctx, "invalid substring arguments");
  } else lastNv = { els: [1000000], coercedNA: false };
  if (firstNv.coercedNA || lastNv.coercedNA) warn(ctx, "NAs introduced by coercion");
  const n = Math.max(xv.els.length, firstNv.els.length, lastNv.els.length);
  if (!n) return [];
  const texts = Array.from({ length: n }, (_, i) => (xv.els.length ? xv.els[i % xv.els.length] : H.NA));
  const starts = Array.from({ length: n }, (_, i) => {
    const el = firstNv.els[i % firstNv.els.length];
    return H.isNA(el) ? el : Math.trunc(el);
  });
  const stops = Array.from({ length: n }, (_, i) => {
    const el = lastNv.els[i % lastNv.els.length];
    return H.isNA(el) ? el : Math.trunc(el);
  });
  const out = substrCore(ctx, { els: texts }, starts, stops);
  const nameSrc =
    xv.names && xv.els.length === n
      ? xv.names
      : firstNv.names && firstNv.els.length === n
        ? firstNv.names
        : lastNv.names && lastNv.els.length === n
          ? lastNv.names
          : null;
  return nameSrc ? H.withNames(out, nameSrc) : out;
};

// ---- nchar／nzchar
function ncharType(ctx, v) {
  const H = ctx.H;
  const els = v === null || v === undefined ? [] : H.vec(v);
  const el = els[0];
  if (els.length !== 1 || typeof el !== "string") fail(ctx, "invalid 'type' argument");
  for (const cand of ["bytes", "chars", "width"])
    if (cand.startsWith(el) && el !== "") return cand;
  fail(ctx, "invalid 'type' argument");
}
const ncharHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "type", "allowNA", "keepNA"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  const type = b.has("type") ? ncharType(ctx, b.val("type")) : "chars";
  let allowNA = false;
  if (b.has("allowNA")) {
    const els = H.vec(b.val("allowNA"));
    const el = els[0];
    allowNA = !H.isNA(el) && Boolean(el);
  }
  // keepNA の既定（NA のとき）は type == "width" なら FALSE、それ以外は
  // TRUE（character.c の do_nchar の規則）。
  let keepNA = type !== "width";
  if (b.has("keepNA")) {
    const els = H.vec(b.val("keepNA"));
    const el = els[0];
    if (!H.isNA(el)) keepNA = Boolean(el);
  }
  const out = xv.els.map((el, idx) => {
    if (H.isNA(el)) {
      // R_nchar は NA_STRING に対して keepNA でなければ 2（"NA" の長さ）。
      return keepNA ? H.NA : 2;
    }
    if (type === "bytes") return utf8ByteLen(el);
    if (hasLoneSurrogate(el)) {
      if (!allowNA) fail(ctx, `invalid multibyte string, element ${idx + 1}`);
      return H.NA;
    }
    if (type === "chars") return codePoints(el).length;
    return displayWidth(el);
  });
  return xv.names ? H.withNames(out, xv.names) : out;
};
const nzcharHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "keepNA"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  let keepNA = false;
  if (b.has("keepNA")) {
    const els = H.vec(b.val("keepNA"));
    const el = els[0];
    if (!H.isNA(el)) keepNA = Boolean(el);
  }
  return xv.els.map((el) => {
    if (H.isNA(el)) return keepNA ? H.NA : true;
    return el.length > 0;
  });
};

// ---- toupper／tolower／casefold／chartr
// UTF-8 ロケールの towupper／towlower は1文字→1文字の単純ケース写像。
// JS の toUpperCase が複数文字に展開するもの（ß→SS 等）は実 R では
// 変わらないため、結果が1コードポイントのときだけ採用する。
const mapCase = (s, upper) =>
  codePoints(s)
    .map((ch) => {
      const m = upper ? ch.toUpperCase() : ch.toLowerCase();
      return codePoints(m).length === 1 ? m : ch;
    })
    .join("");
const caseHandler = (upperFixed) => (ctx) => {
  const b = bindArgs(ctx, upperFixed === null ? ["x", "upper"] : ["x"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  const upper = upperFixed !== null ? upperFixed : b.has("upper") ? asLogical(ctx, b.val("upper")) : false;
  const out = xv.els.map((el) => (H.isNA(el) ? H.NA : mapCase(el, upper)));
  return xv.names ? H.withNames(out, xv.names) : out;
};
const chartrHandler = (ctx) => {
  const b = bindArgs(ctx, ["old", "new", "x"]);
  const H = ctx.H;
  const oldS = firstString(ctx, charVec(ctx, b.req("old")), "old");
  if (H.isNA(oldS)) fail(ctx, "invalid 'old' argument");
  const newS = firstString(ctx, charVec(ctx, b.req("new")), "new");
  if (H.isNA(newS)) fail(ctx, "invalid 'new' argument");
  const xv = charVec(ctx, b.req("x"));
  const oldCps = codePoints(oldS), newCps = codePoints(newS);
  if (oldCps.length > newCps.length) fail(ctx, "'old' is longer than 'new'");
  const map = new Map();
  oldCps.forEach((c, idx) => map.set(c, newCps[idx]));
  const out = xv.els.map((el) => {
    if (H.isNA(el)) return H.NA;
    return codePoints(el)
      .map((c) => map.get(c) ?? c)
      .join("");
  });
  return xv.names ? H.withNames(out, xv.names) : out;
};

// ---- make.names／make.unique
const R_RESERVED = new Set([
  "if", "else", "repeat", "while", "function", "for", "in", "next", "break",
  "TRUE", "FALSE", "NULL", "Inf", "NaN", "NA",
  "NA_integer_", "NA_real_", "NA_complex_", "NA_character_",
]);
function makeNameOne(s) {
  const cps = codePoints(s);
  const isLetter = (c) => /\p{L}/u.test(c);
  const isDigit = (c) => /\p{Nd}/u.test(c);
  let needX = false;
  if (!cps.length) needX = true;
  else if (cps[0] === "." && cps.length > 1 && isDigit(cps[1])) needX = true;
  else if (!isLetter(cps[0]) && cps[0] !== ".") needX = true;
  const body = (needX ? ["X", ...cps] : cps)
    .map((c) => {
      if (isLetter(c) || isDigit(c) || c === "." || c === "_") return c;
      return ".";
    })
    .join("");
  return R_RESERVED.has(body) ? body + "." : body;
}
// make.unique の中核（do_makeunique）。els は文字列／NA の配列。
function makeUniqueCore(els, sep) {
  const out = [...els];
  const key = (el) => (el === null ? "\0NA" : "S" + el);
  const firstIdx = new Map();
  els.forEach((el, i) => {
    if (!firstIdx.has(key(el))) firstIdx.set(key(el), i);
  });
  const cnts = new Map();
  els.forEach((el, i) => {
    const fi = firstIdx.get(key(el));
    if (fi === i) return;
    let cnt = cnts.get(fi) ?? 1;
    const base = el === null ? "NA" : el;
    for (;;) {
      const cand = base + sep + cnt;
      if (!out.some((o) => o === cand)) {
        out[i] = cand;
        cnts.set(fi, cnt + 1);
        break;
      }
      cnt++;
    }
  });
  return out;
}
const makeNamesHandler = (ctx) => {
  const b = bindArgs(ctx, ["names", "unique", "allow_"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("names"), { naToString: true });
  const unique = b.has("unique") ? asLogical(ctx, b.val("unique")) : false;
  const allow_ = b.has("allow_") ? asLogical(ctx, b.val("allow_")) : true;
  const mapOne = (s) => {
    if (allow_) return makeNameOne(s);
    // allow_ = FALSE のとき '_' も '.' に置換される（X 接頭辞の判定は
    // do_makenames が allow_ を見て行う：'_' 始まりは接頭辞が必要）。
    const cps = codePoints(s);
    const isLetter = (c) => /\p{L}/u.test(c);
    const isDigit = (c) => /\p{Nd}/u.test(c);
    let needX = false;
    if (!cps.length) needX = true;
    else if (cps[0] === "." && cps.length > 1 && isDigit(cps[1])) needX = true;
    else if (!isLetter(cps[0]) && cps[0] !== ".") needX = true;
    const body = (needX ? ["X", ...cps] : cps)
      .map((c) => (isLetter(c) || isDigit(c) || c === "." ? c : "."))
      .join("");
    return R_RESERVED.has(body) ? body + "." : body;
  };
  let out = xv.els.map(mapOne);
  if (unique) {
    // 実 R は「変換で変わらなかった名前」を先に並べ替えてから
    // make.unique を適用し、元の順序に戻す。
    const order = out.map((_, i) => i).sort((a, c) => {
      const ca = xv.els[a] === out[a] ? 0 : 1;
      const cc = xv.els[c] === out[c] ? 0 : 1;
      return ca - cc || a - c;
    });
    const reordered = order.map((i) => out[i]);
    const uniq = makeUniqueCore(reordered, ".");
    const restored = new Array(out.length);
    order.forEach((origIdx, pos) => {
      restored[origIdx] = uniq[pos];
    });
    out = restored;
  }
  return out;
};
const makeUniqueHandler = (ctx) => {
  const b = bindArgs(ctx, ["names", "sep"]);
  const H = ctx.H;
  const v = b.req("names");
  if (isDf(v) || v === null || v === undefined) fail(ctx, "'names' must be a character vector");
  const raw = H.vec(v);
  for (const el of raw)
    if (!H.isNA(el) && typeof el !== "string") fail(ctx, "'names' must be a character vector");
  const els = raw.map((el) => (H.isNA(el) ? null : el));
  let sep = ".";
  if (b.has("sep")) {
    const sv = b.val("sep");
    if (isDf(sv) || sv === null || sv === undefined) fail(ctx, "'sep' must be a character string");
    const sraw = H.vec(sv);
    if (sraw.length !== 1) fail(ctx, "'sep' must be a character string");
    const el = sraw[0];
    if (H.isNA(el)) {
      // NA_character_ の sep は実 R では "NA" として働く（配列形の NA）。
      if (!Array.isArray(sv)) fail(ctx, "'sep' must be a character string");
      sep = "NA";
    } else if (typeof el !== "string") fail(ctx, "'sep' must be a character string");
    else sep = el;
  }
  return makeUniqueCore(els, sep).map((el) => (el === null ? H.NA : el));
};

// ---- charmatch／pmatch／char.expand
// 戻り値：{type:"index", j} | {type:"ambiguous"} | {type:"none"}
function charmatchOne(x, table) {
  for (let j = 0; j < table.length; j++) if (table[j] !== null && table[j] === x) return { type: "index", j };
  let found = -1, count = 0;
  for (let j = 0; j < table.length; j++) {
    const t = table[j];
    if (t === null) continue;
    if (t.length > x.length && t.startsWith(x)) {
      count++;
      found = j;
    }
  }
  if (count === 1) return { type: "index", j: found };
  if (count > 1) return { type: "ambiguous" };
  return { type: "none" };
}
function nomatchValue(ctx, b) {
  const H = ctx.H;
  if (!b.has("nomatch")) return H.NA;
  const v = b.val("nomatch");
  if (v === null || v === undefined) return H.NA;
  const els = H.vec(v);
  const el = els[0];
  if (H.isNA(el) || els.length !== 1) return H.NA;
  if (typeof el === "number") return Math.trunc(el);
  if (typeof el === "boolean") return el ? 1 : 0;
  warn(ctx, "NAs introduced by coercion");
  return H.NA;
}
const charmatchHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "table", "nomatch"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  const tv = charVec(ctx, b.req("table"));
  const nomatch = nomatchValue(ctx, b);
  const table = tv.els.map((el) => (H.isNA(el) ? null : el));
  return xv.els.map((el) => {
    if (H.isNA(el)) return nomatch;
    const r = charmatchOne(el, table);
    if (r.type === "index") return r.j + 1;
    if (r.type === "ambiguous") return 0;
    return nomatch;
  });
};
const pmatchHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "table", "nomatch", "duplicates.ok"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  const tv = charVec(ctx, b.req("table"));
  const nomatch = nomatchValue(ctx, b);
  const dupOk = b.has("duplicates.ok") ? asLogical(ctx, b.val("duplicates.ok")) : false;
  const table = tv.els.map((el) => (H.isNA(el) ? null : el));
  const used = new Set();
  return xv.els.map((el) => {
    if (H.isNA(el)) return nomatch;
    // duplicates.ok=FALSE では消費済みの要素を候補から外す。
    const view = table.map((t, j) => (!dupOk && used.has(j) ? null : t));
    // 完全一致は消費済みでも「その要素自体」は対象外（view で null 化）。
    const r = charmatchOne(el, view);
    if (r.type === "index") {
      used.add(r.j);
      return r.j + 1;
    }
    return nomatch;
  });
};

// ---- agrep／agrepl（近似部分文字列マッチ）
// 実 R は TRE の近似マッチで、転置は原始操作ではなく削除＋部分文字列
// 終端などで説明できる（実測で確認）。ここでは重み付き Levenshtein の
// 部分文字列 DP を Pareto 最適タプル（cost, 挿入数, 削除数, 置換数）で
// 解く。なお .amatch_bounds と C 実装の対応により、max.distance の
// "insertions" 枠はパターン文字の削除（max_del）に、"deletions" 枠は
// テキスト文字の挿入（max_ins）に効く（実測で確認した実 R の癖）。
function amatchBounds(ctx, mdV, patlen, costs) {
  const H = ctx.H;
  const maxc = Math.max(costs[0], costs[1], costs[2]);
  const INF = Infinity;
  const bounds = { cost: INF, del: INF, ins: INF, sub: INF, err: INF };
  if (mdV === null || mdV === undefined) {
    // 既定値 0.1 相当は呼び出し側で入れる。ここに来たら無制限。
    return bounds;
  }
  if (isDf(mdV)) fail(ctx, "invalid 'max.distance' argument");
  const raw = H.vec(mdV);
  const isNum = raw.every((el) => H.isNA(el) || typeof el === "number" || typeof el === "boolean");
  if (!isNum) fail(ctx, "invalid 'max.distance' argument");
  const vals = raw.map((el) => (H.isNA(el) ? NaN : typeof el === "boolean" ? (el ? 1 : 0) : el));
  const names = H.namesOf(mdV);
  if (vals.length === 1) {
    const v = vals[0];
    if (Number.isNaN(v)) bounds.cost = INF;
    else if (v < 1) bounds.cost = Math.ceil(v * patlen * maxc);
    else bounds.cost = Math.ceil(v);
    return bounds;
  }
  // 実 R 4.3.3 では長さ>1 のベクトル（名前付きでも）はエラーになる
  // （リスト形式だけが成分指定を受け付けるが、アプリでは構築不能）。
  fail(ctx, `'length = ${vals.length}' in coercion to 'logical(1)'`);
}
function amatchCosts(ctx, costsV) {
  const H = ctx.H;
  const defaults = [1, 1, 1];
  if (costsV === null || costsV === undefined) return defaults;
  if (isDf(costsV)) fail(ctx, "cost components must be non-negative");
  const raw = H.vec(costsV);
  const names = H.namesOf(costsV);
  if (!names) return defaults; // 名前なしの costs は黙って無視される（実測）。
  const table = ["insertions", "deletions", "substitutions"];
  const out = [...defaults];
  let unknownWarned = false;
  names.forEach((nm, i) => {
    if (nm === "" || nm == null) return;
    const r = charmatchOne(nm, table);
    if (r.type !== "index") {
      if (!unknownWarned) {
        unknownWarned = true;
        warn(ctx, "unknown cost components ignored");
      }
      return;
    }
    const el = raw[i];
    let v;
    if (H.isNA(el)) fail(ctx, "cost components must be non-negative");
    else if (typeof el === "number") v = Math.trunc(el);
    else if (typeof el === "boolean") v = el ? 1 : 0;
    else if (typeof el === "string" && el.trim() !== "" && !Number.isNaN(Number(el))) v = Math.trunc(Number(el));
    else {
      warn(ctx, "NAs introduced by coercion");
      fail(ctx, "cost components must be non-negative");
    }
    if (v < 0) fail(ctx, "cost components must be non-negative");
    out[r.j] = v;
  });
  return out;
}
function agrepMatchOne(P, T, B) {
  const m = P.length, n = T.length;
  const prune = (set) => {
    const arr = [...set.values()].filter(
      (t) => t[0] <= B.cost && t[1] <= B.ins && t[2] <= B.del && t[3] <= B.sub && t[0] >= 0 && t[1] + t[2] + t[3] <= B.err,
    );
    return arr.filter(
      (a) => !arr.some((o) => o !== a && o[0] <= a[0] && o[1] <= a[1] && o[2] <= a[2] && o[3] <= a[3] && (o[0] < a[0] || o[1] < a[1] || o[2] < a[2] || o[3] < a[3])),
    );
  };
  const key = (t) => t.join(",");
  let prev = [];
  for (let j = 0; j <= n; j++) prev.push(new Map([[key([0, 0, 0, 0]), [0, 0, 0, 0]]]));
  for (let i = 1; i <= m; i++) {
    const curr = [];
    for (let j = 0; j <= n; j++) {
      const cand = new Map();
      const add = (t) => cand.set(key(t), t);
      if (j === 0) {
        for (const t of prev[0].values()) add([t[0] + B.costDel, t[1], t[2] + 1, t[3]]);
      } else {
        for (const t of prev[j].values()) add([t[0] + B.costDel, t[1], t[2] + 1, t[3]]);
        for (const t of curr[j - 1].values()) add([t[0] + B.costIns, t[1] + 1, t[2], t[3]]);
        for (const t of prev[j - 1].values()) {
          if (P[i - 1] === T[j - 1]) add(t);
          else add([t[0] + B.costSub, t[1], t[2], t[3] + 1]);
        }
      }
      curr.push(new Map(prune(cand).map((t) => [key(t), t])));
    }
    prev = curr;
  }
  return prev.some((set) => set.size > 0);
}
function agrepCommon(ctx, b, isAgrepl) {
  const H = ctx.H;
  const ignoreCase = b.has("ignore.case") ? asLogical(ctx, b.val("ignore.case")) : false;
  const fixed = b.has("fixed") ? asLogical(ctx, b.val("fixed")) : true;
  const useBytes = b.has("useBytes") ? asLogical(ctx, b.val("useBytes")) : false;
  const value = !isAgrepl && b.has("value") ? asLogical(ctx, b.val("value")) : false;
  if (useBytes) fail(ctx, "useBytes = TRUE は未対応です（バイト単位の意味論は再現できません）");
  const pattern = firstString(ctx, charVec(ctx, b.req("pattern")), "pattern");
  const xv = charVec(ctx, b.req("x"));
  if (H.isNA(pattern)) {
    if (isAgrepl) return xv.els.map(() => H.NA);
    if (value) {
      const out = xv.els.map(() => H.NA);
      return xv.names ? H.withNames(out, xv.names) : out;
    }
    return xv.els.map(() => H.NA);
  }
  if (pattern === "") fail(ctx, "'pattern' must be a non-empty character string");
  if (!fixed && /[.\[\]()|*+?^${}\\]/.test(pattern))
    fail(ctx, "agrep の fixed = FALSE で正規表現メタ文字を含むパターンは未対応です");
  const costs = amatchCosts(ctx, b.has("costs") ? b.val("costs") : null);
  const mdV = b.has("max.distance") ? b.val("max.distance") : 0.1;
  const patCps = codePoints(ignoreCase ? pattern.toLowerCase() : pattern);
  const bounds = amatchBounds(ctx, mdV, patCps.length, costs);
  const B = {
    ...bounds,
    costIns: costs[0],
    costDel: costs[1],
    costSub: costs[2],
  };
  const states = xv.els.map((el) => {
    if (H.isNA(el)) return false;
    const t = codePoints(ignoreCase ? el.toLowerCase() : el);
    return agrepMatchOne(patCps, t, B);
  });
  if (isAgrepl) return states;
  const picked = [];
  states.forEach((st, idx) => {
    if (st) picked.push(idx);
  });
  if (value) {
    const out = picked.map((idx) => xv.els[idx]);
    return xv.names ? H.withNames(out, picked.map((idx) => xv.names[idx])) : out;
  }
  return picked.map((idx) => idx + 1);
}
const agrepHandler = (ctx) => {
  const b = bindArgs(ctx, ["pattern", "x", "max.distance", "costs", "ignore.case", "value", "fixed", "useBytes"]);
  return agrepCommon(ctx, b, false);
};
const agreplHandler = (ctx) => {
  const b = bindArgs(ctx, ["pattern", "x", "max.distance", "costs", "ignore.case", "fixed", "useBytes"]);
  return agrepCommon(ctx, b, true);
};

// ---- abbreviate
// stripchars／wstripchars（character.c）の移植。作業対象はコード
// ポイントの配列。isSpace／isLower／vowel の判定は ASCII 経路では
// C ロケールの isspace／islower／英小母音、非 ASCII 経路では
// iswspace／\p{Ll}／R の母音表（0x2e を含む原典どおり）を使う。
const ABBR_VOWELS_WIDE = new Set([
  0x61, 0x65, 0x69, 0x6f, 0x75,
  0xe0, 0xe1, 0x2e, 0xe3, 0xe4, 0xe5,
  0xe8, 0xe9, 0xea, 0xeb, 0xec, 0xed, 0xee, 0xef,
  0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf8, 0xf9, 0xfa, 0xfb, 0xfc,
  0x101, 0x103, 0x105, 0x113, 0x115, 0x117, 0x118, 0x11b,
  0x129, 0x12b, 0x12d, 0x12f, 0x131, 0x14d, 0x14f, 0x151,
  0x169, 0x16b, 0x16d, 0x16f, 0x171, 0x173,
]);
function stripCharsPort(input, minlen, usecl, wide) {
  const isSpace = wide ? (c) => /\s/u.test(c) : (c) => " \t\n\v\f\r".includes(c);
  const isLower = wide ? (c) => /\p{Ll}/u.test(c) : (c) => c >= "a" && c <= "z";
  const isVowel = wide
    ? (c) => ABBR_VOWELS_WIDE.has(c.codePointAt(0))
    : (c) => "aeiou".includes(c);
  let s = [...input];
  const len = () => s.length;
  if (len() < minlen) return s.join("");
  let nspace = 0;
  // 末尾の空白を切り、内部の空白を数える。
  for (let i = len() - 1, j = 1; i > 0; i--) {
    if (isSpace(s[i])) {
      if (j) s = s.slice(0, i);
      else nspace++;
    } else j = 0;
    if (len() - nspace <= minlen) return finishStrip(s, minlen, isSpace);
  }
  const firstChar = (i) => isSpace(s[i - 1]);
  const lastChar = (i) => !isSpace(s[i - 1]) && (i + 1 >= len() || isSpace(s[i + 1]));
  const removeAt = (i) => {
    s = [...s.slice(0, i), ...s.slice(i + 1)];
  };
  const classes = [
    (i) => s[i] !== undefined && isVowel(s[i]) && lastChar(i),
    (i) => s[i] !== undefined && isVowel(s[i]) && !firstChar(i),
    (i) => s[i] !== undefined && isLower(s[i]) && lastChar(i),
    (i) => s[i] !== undefined && isLower(s[i]) && !firstChar(i),
  ];
  if (usecl) {
    for (const pred of classes) {
      for (let i = len() - 1; i > 0; i--) {
        if (pred(i)) removeAt(i);
        if (len() - nspace <= minlen) return finishStrip(s, minlen, isSpace);
      }
    }
  }
  for (let i = len() - 1; i > 0; i--) {
    if (s[i] !== undefined && !firstChar(i) && !isSpace(s[i])) removeAt(i);
    if (len() - nspace <= minlen) return finishStrip(s, minlen, isSpace);
  }
  return finishStrip(s, minlen, isSpace);
}
function finishStrip(s, minlen, isSpace) {
  let out = [...s];
  if (out.length > minlen)
    for (let i = out.length - 1; i > 0; i--)
      if (isSpace(out[i])) out = [...out.slice(0, i), ...out.slice(i + 1)];
  return out.join("");
}
const abbreviateHandler = (ctx) => {
  const b = bindArgs(ctx, ["names.arg", "minlength", "use.classes", "dot", "strict", "method", "named"]);
  const H = ctx.H;
  const rawCv = charVec(ctx, b.req("names.arg"));
  // minlength は .Internal 側で asInteger され、NA はエラー。
  let minlength = 4;
  if (b.has("minlength")) {
    const nv = numVec(ctx, b.val("minlength"));
    if (nv.els.length !== 1) fail(ctx, "the condition has length > 1");
    const el = nv.els[0];
    if (H.isNA(el) || typeof el !== "number" || Number.isNaN(el)) fail(ctx, "invalid 'minlength' argument");
    minlength = Math.trunc(el);
  }
  const useClasses = b.has("use.classes") ? asLogical(ctx, b.val("use.classes")) : true;
  const dot = b.has("dot") ? asLogical(ctx, b.val("dot")) : false;
  const strict = b.has("strict") ? asLogical(ctx, b.val("strict")) : false;
  const named = b.has("named") ? asLogical(ctx, b.val("named")) : true;
  const method = b.has("method") ? matchArgEnum(ctx, b.val("method"), ["left.kept", "both.sides"]) : "left.kept";
  const origEls = rawCv.els;
  if (minlength <= 0) {
    const out = origEls.map(() => "");
    return named ? H.withNames(out, origEls.map((el) => (H.isNA(el) ? H.NA : el))) : out;
  }
  // 前後の空白（スペースのみ）を sub で取り除く。
  const trimmed = origEls.map((el) => (H.isNA(el) ? H.NA : el.replace(/^ +/, "").replace(/ +$/, "")));
  const keyOf = (el) => (H.isNA(el) ? "\0NA" : "S" + el);
  const seen = new Set();
  const dedupIdx = [];
  trimmed.forEach((el, i) => {
    if (!seen.has(keyOf(el))) {
      seen.add(keyOf(el));
      dedupIdx.push(i);
    }
  });
  const uniq = dedupIdx.map((i) => trimmed[i]);
  let sawNonAscii = false;
  const stripOne = (el, ml) => {
    if (H.isNA(el)) return H.NA;
    const cps = codePoints(el);
    const isAscii = cps.every((c) => c.codePointAt(0) < 128);
    if (cps.length <= ml) return el;
    if (!isAscii) sawNonAscii = true;
    return stripCharsPort(el, ml, useClasses, !isAscii);
  };
  let x;
  if (strict) {
    x = uniq.map((el) => stripOne(el, minlength));
  } else {
    const chRev = (s) => (H.isNA(s) ? s : codePoints(s).reverse().join(""));
    x = new Array(uniq.length);
    let dup2 = uniq.map(() => true);
    let these = [...uniq];
    let ml = minlength;
    for (;;) {
      const ans = these.map((el) => stripOne(el, ml));
      let ai = 0;
      dup2.forEach((d, i) => {
        if (d) x[i] = ans[ai++];
      });
      const dupFlags = x.map((v, i) => x.findIndex((o) => keyOf(o) === keyOf(v)) !== i);
      if (!dupFlags.some(Boolean)) break;
      dup2 = dupFlags;
      if (method === "both.sides") {
        const rev = dup2.map((d, i) => (d ? chRev(stripOne(chRev(uniq[i]), ml)) : null));
        dup2.forEach((d, i) => {
          if (d) x[i] = rev[i];
        });
        const dupFlags2 = x.map((v, i) => x.findIndex((o) => keyOf(o) === keyOf(v)) !== i);
        if (!dupFlags2.some(Boolean)) {
          dup2 = dupFlags2;
          break;
        }
        dup2 = dupFlags2;
      }
      ml++;
      const dupVals = new Set(x.filter((_, i) => dup2[i]).map((v) => keyOf(v)));
      dup2 = dup2.map((d, i) => d || dupVals.has(keyOf(x[i])));
      these = uniq.filter((_, i) => dup2[i]);
    }
  }
  if (useClasses && sawNonAscii) warn(ctx, "abbreviate used with non-ASCII chars");
  // 重複の復元（match(old, names.arg)）。
  let full = x;
  if (dedupIdx.length !== trimmed.length) {
    full = trimmed.map((el) => x[uniq.findIndex((u) => keyOf(u) === keyOf(el))]);
  }
  if (dot) {
    full = full.map((v, i) => {
      if (H.isNA(v) || H.isNA(trimmed[i])) return v;
      return v !== trimmed[i] ? v + "." : v;
    });
  }
  if (named) return H.withNames(full, trimmed.map((el) => (H.isNA(el) ? H.NA : el)));
  return full;
};

// ---- toString／is.string
function strtrimByWidth(s, width) {
  let out = "", w = 0;
  for (const ch of s) {
    const cw = charWidth(ch.codePointAt(0));
    if (w + cw > width) break;
    w += cw;
    out += ch;
  }
  return out;
}
const toStringHandler = (ctx) => {
  const b = bindArgs(ctx, ["x"], { dots: true });
  const H = ctx.H;
  const xV = b.req("x");
  if (isDf(xV)) fail(ctx, "データフレームはこの関数の対象外です");
  if (xV === null || xV === undefined) return "";
  const cv = charVec(ctx, xV, { naToString: true });
  let str = cv.els.join(", ");
  const widthDot = b.dots.find((d) => d.name === "width");
  if (widthDot && widthDot.value !== null && widthDot.value !== undefined) {
    const wv = numVec(ctx, widthDot.value);
    if (wv.els.length !== 1) fail(ctx, "the condition has length > 1");
    const w = wv.els[0];
    if (H.isNA(w) || typeof w !== "number" || Number.isNaN(w))
      fail(ctx, "missing value where TRUE/FALSE needed");
    if (w < 0) fail(ctx, "'width' must be positive");
    if (w > 0 && displayWidth(str) > w) {
      const w2 = Math.max(6, w);
      str = strtrimByWidth(str, w2 - 4) + "....";
    }
  }
  return str;
};
const isStringHandler = (ctx) => {
  const b = bindArgs(ctx, ["x"]);
  const H = ctx.H;
  const v = b.req("x");
  if (v === null || v === undefined || isDf(v)) return false;
  if (Array.isArray(v)) {
    if (v.length !== 1) return false;
    // 長さ1の配列中の NA は NA_character_ とみなす（R-devel の定義）。
    return typeof v[0] === "string" || H.isNA(v[0]);
  }
  return typeof v === "string";
};

// ---- .format.zeros（prettyNum の内部関数）の移植
function formatZeros(ctx, strs, zeroPrint, replace) {
  if (zeroPrint == null) return strs;
  return strs.map((s) => {
    if (typeof s !== "string") return s;
    const nx = Number(s);
    if (Number.isNaN(nx) || nx !== 0) return s;
    if (replace) return zeroPrint;
    const cps = codePoints(s);
    const nc = cps.length;
    const nz = codePoints(zeroPrint).length;
    const ind0 = s.indexOf("0") + 1;
    if (ind0 === 0) return s;
    if (nc < nz)
      warn(ctx, "'zero.print' is truncated to fit into formatted zeros; consider 'replace=TRUE'");
    const i2 = Math.min(nc, nz - 1 + ind0);
    const i1 = Math.max(1, i2 - nz + 1);
    const span = i2 - i1 + 1;
    let out =
      cps.slice(0, i1 - 1).join("") +
      codePoints(zeroPrint).slice(0, span).join("") +
      cps.slice(i2).join("");
    if (nc > i2) out = codePoints(out).slice(0, i2).join("") + " ".repeat(nc - i2);
    return out;
  });
}
// prettyNum の文字列パス（本体）。strs は NA を含まない文字列の配列。
function prettyNumCore(ctx, strs, o) {
  let x = [...strs];
  const nMark = o.bigMark === "" && o.smallMark === "" && o.decimalMark === o.inputDMark;
  const nZero = o.zeroPrint == null && !o.drop0trailing;
  if (nMark && nZero) return x;
  if (nMark && !o.drop0trailing) return formatZeros(ctx, x, o.zeroPrint, o.replaceZero);
  if (o.detectCmplx) {
    const nonNA = x.filter((s) => s !== "NA");
    if (nonNA.length && nonNA.some((s) => /[0-9].*[-+][0-9].*i$/.test(s)))
      fail(ctx, "複素数形式の文字列は未対応です");
  }
  if (o.inputDMark === "") fail(ctx, "'input.d.mark' has no characters");
  const parts = x.map((s) => {
    const sp = s.split(o.inputDMark);
    if (sp.length > 2) return [sp.slice(0, -1).join(o.inputDMark), sp[sp.length - 1]];
    return sp;
  });
  let B = parts.map((p) => p[0]);
  let A = parts.map((p) => (p.length > 1 ? p[1] : undefined));
  let iN = A.map((a) => a === undefined);
  A = A.map((a) => (a === undefined ? "" : a));
  if (o.bigMark !== "") {
    const test = new RegExp(`[0-9]{${o.bigInterval + 1},}`);
    const rev = (t) => codePoints(t).reverse().join("");
    const gre = new RegExp(`([0-9]{${o.bigInterval}})\\B`, "g");
    B = B.map((s) => (test.test(s) ? rev(rev(s).replace(gre, "$1" + rev(o.bigMark))) : s));
  }
  if (o.smallMark !== "") {
    const test = new RegExp(`[0-9]{${o.smallInterval + 1},}`);
    const gre = new RegExp(`([0-9]{${o.smallInterval}}\\B)`, "g");
    A = A.map((s) => (test.test(s) ? s.replace(gre, "$1" + o.smallMark) : s));
  }
  if (o.drop0trailing) {
    A = A.map((a, i) => {
      if (iN[i]) return a;
      if (a.includes("e")) return a.replace(/e[+-]0+$/, "");
      return a.replace(/0+$/, "");
    });
    iN = A.map((a, i) => (iN[i] ? true : a === ""));
  }
  let out = B.map((b, i) => b + (iN[i] ? "" : o.decimalMark) + A[i]);
  out = formatZeros(ctx, out, o.zeroPrint, o.replaceZero);
  if (o.preserveWidth !== "none") {
    const dLen = out.map((s, i) => codePoints(s).length - codePoints(x[i]).length);
    if (dLen.some((d) => d > 0)) {
      if (o.preserveWidth === "individual") {
        out = out.map((s, i) => (dLen[i] > 0 ? s.replace(new RegExp(`^ {1,${dLen[i]}}`), "") : s));
      } else {
        const target = Math.max(...out.map((s) => codePoints(s).length));
        out = out.map((s) => " ".repeat(target - codePoints(s).length) + s);
      }
    }
  }
  return out;
}
// prettyNum／formatC で共用する引数解決。
function pnStringArg(ctx, b, name, def) {
  if (!b.has(name) || b.val(name) === null || b.val(name) === undefined) return def;
  const cv = charVec(ctx, b.val(name));
  if (!cv.els.length) return def;
  const el = cv.els[0];
  return ctx.H.isNA(el) ? def : el;
}
function pnIntArg(ctx, b, name, def) {
  if (!b.has(name) || b.val(name) === null || b.val(name) === undefined) return def;
  const nv = numVec(ctx, b.val(name));
  if (!nv.els.length) return def;
  const el = nv.els[0];
  return ctx.H.isNA(el) || typeof el !== "number" ? def : Math.trunc(el);
}
function pnZeroPrint(ctx, b) {
  if (!b.has("zero.print")) return null;
  const v = b.val("zero.print");
  if (v === null || v === undefined) return null;
  const H = ctx.H;
  const els = H.vec(v);
  if (els.length > 1) fail(ctx, "'zero.print' has length > 1");
  const el = els[0];
  if (typeof el === "boolean") return el ? "0" : " ";
  if (typeof el === "string") return el;
  fail(ctx, "'zero.print' must be character, logical or NULL");
}
// format() の数値スカラー整形（format.c の scientific／formatReal を
// 要素数1・digits=7・scipen=0 で再現）。prettyNum の数値入力パス用。
function formatScalarR(x) {
  if (x === 0) return "0";
  const neg = x < 0;
  const r = Math.abs(x);
  const dec = exactDecimal(r);
  const rd = roundSigDigits(dec.digits, dec.E, 7);
  // alpha（7桁に丸めた整数部）と kp：値 ≈ alpha × 10^kp。
  const alphaStr = rd.zero ? "0" : rd.digits;
  const kp = rd.E - alphaStr.length + 1;
  let nsig = alphaStr.length - (alphaStr.match(/0+$/)?.[0].length ?? 0);
  if (nsig === 0) nsig = 1;
  const kpower = kp + alphaStr.length - 1;
  let left = kpower + 1;
  if (kpower > 0 && kpower <= 22) {
    const rgt0 = Math.min(Math.max(7 - kpower, 0), 22);
    const fuzz = 0.5 / 10 ** rgt0;
    if (r < 10 ** kpower - fuzz) left--;
  }
  const sleft = (neg ? 1 : 0) + (left <= 0 ? 1 : left);
  const right = Math.max(nsig - left, 0);
  const wF = sleft + right + (right !== 0 ? 1 : 0);
  const eDigits = left > 100 || left <= -99 ? 2 : 1;
  const dE = nsig - 1;
  const wE = (neg ? 1 : 0) + (dE > 0 ? 1 : 0) + dE + 4 + eDigits;
  if (wF <= wE) {
    const { body } = formatFloatBody(r, { verb: "f", prec: right, alt: false });
    return (neg ? "-" : "") + body;
  }
  const { body } = formatFloatBody(r, { verb: "e", prec: dE, alt: false });
  return (neg ? "-" : "") + body;
}
const prettyNumHandler = (ctx) => {
  const b = bindArgs(
    ctx,
    ["x", "big.mark", "big.interval", "small.mark", "small.interval", "decimal.mark", "input.d.mark", "preserve.width", "zero.print", "replace.zero", "drop0trailing", "is.cmplx"],
    { dots: true },
  );
  const H = ctx.H;
  const xV = b.req("x");
  if (isDf(xV)) fail(ctx, "データフレームはこの関数の対象外です");
  const bigMark = pnStringArg(ctx, b, "big.mark", "");
  const decimalMark = pnStringArg(ctx, b, "decimal.mark", ".");
  const o = {
    bigMark,
    bigInterval: pnIntArg(ctx, b, "big.interval", 3),
    smallMark: pnStringArg(ctx, b, "small.mark", ""),
    smallInterval: pnIntArg(ctx, b, "small.interval", 5),
    decimalMark,
    inputDMark: pnStringArg(ctx, b, "input.d.mark", decimalMark),
    preserveWidth: b.has("preserve.width")
      ? matchArgEnum(ctx, b.val("preserve.width"), ["common", "individual", "none"])
      : "common",
    zeroPrint: pnZeroPrint(ctx, b),
    replaceZero: b.has("replace.zero") ? asLogical(ctx, b.val("replace.zero")) : false,
    drop0trailing: b.has("drop0trailing") ? asLogical(ctx, b.val("drop0trailing")) : false,
    detectCmplx: true,
  };
  if (b.has("is.cmplx") && b.val("is.cmplx") !== null && b.val("is.cmplx") !== undefined) {
    const els = H.vec(b.val("is.cmplx"));
    if (!H.isNA(els[0])) {
      if (els[0]) fail(ctx, "複素数形式の文字列は未対応です");
      o.detectCmplx = false;
    }
  }
  if (bigMark !== "" && bigMark === decimalMark)
    warn(ctx, `'big.mark' and 'decimal.mark' are both '${bigMark}', which could be confusing`);
  if (xV === null || xV === undefined) return [];
  const raw = H.vec(xV);
  const numericPath = raw.every((el) => H.isNA(el) || typeof el === "number" || typeof el === "boolean");
  let strs, names = H.namesOf(xV);
  if (numericPath) {
    // 数値入力は要素ごとに format()（7 有効桁）で文字列化してから処理。
    strs = raw.map((el) => {
      if (H.isNA(el)) return "NA";
      if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
      if (Number.isNaN(el)) return "NaN";
      if (!Number.isFinite(el)) return el > 0 ? "Inf" : "-Inf";
      return formatScalarR(el);
    });
  } else {
    const cv = charVec(ctx, xV);
    strs = cv.els;
    names = cv.names;
  }
  const keepIdx = [], keepStrs = [];
  strs.forEach((s, i) => {
    if (!H.isNA(s)) {
      keepIdx.push(i);
      keepStrs.push(s);
    }
  });
  const processed = prettyNumCore(ctx, keepStrs, o);
  const out = [...strs];
  keepIdx.forEach((idx, k) => {
    out[idx] = processed[k];
  });
  return names ? H.withNames(out, names) : out;
};

// ---- formatC
function formatCharCommon(strs, width, flag) {
  let w = width ?? 0;
  let justify = flag === "-" ? "left" : "right";
  if (w < 0) {
    justify = "left";
    w = -w;
  }
  const target = Math.max(w, ...strs.map((s) => codePoints(s).length), 0);
  return strs.map((s) => {
    const pad = " ".repeat(target - codePoints(s).length);
    return justify === "left" ? s + pad : pad + s;
  });
}
function fgFormatBody(x, digits, alt) {
  // format="fg"：小数部桁数 = digits - 1 - floor(log10(|x|))（0 未満は
  // 0）で %f 整形し、末尾の 0 を取り除く（format.c の fg の規則）。
  if (x === 0) return { neg: Object.is(x, -0), body: alt ? renderFixed("0", 0, digits - 1) : "0" };
  const { neg, E } = exactDecimal(x);
  const decimals = Math.max(0, digits - 1 - E);
  const r = formatFloatBody(x, { verb: "f", prec: decimals, alt });
  let body = r.body;
  if (!alt && body.includes(".")) body = body.replace(/0+$/, "").replace(/\.$/, "");
  return { neg, body };
}
const formatCHandler = (ctx) => {
  const b = bindArgs(ctx, [
    "x", "digits", "width", "format", "flag", "mode", "big.mark", "big.interval",
    "small.mark", "small.interval", "decimal.mark", "preserve.width",
    "zero.print", "replace.zero", "drop0trailing",
  ]);
  const H = ctx.H;
  // flag の検証はラッパーで最初に行われる。
  let flag = "";
  if (b.has("flag") && b.val("flag") !== null && b.val("flag") !== undefined) {
    const fv = charVec(ctx, b.val("flag"));
    if (fv.els.length !== 1) fail(ctx, "'flag' must be a string, i.e., of length 1");
    flag = fv.els[0];
    if (H.isNA(flag)) fail(ctx, "'flag' should contain only characters from [0+- #'I]");
  }
  if (![...flag].every((c) => "0+- #'I".includes(c)))
    fail(ctx, "'flag' should contain only characters from [0+- #'I]");
  const xV = b.req("x");
  if (isDf(xV)) fail(ctx, "データフレームはこの関数の対象外です");
  const raw = xV === null || xV === undefined ? [] : H.vec(xV);
  if (!raw.length) return [];
  const xNames = H.namesOf(xV);
  // mode の決定（storage.mode 相当）。
  let mode = null;
  if (b.has("mode") && b.val("mode") !== null && b.val("mode") !== undefined) {
    const mv = charVec(ctx, b.val("mode"));
    mode = mv.els[0];
    if (!["double", "real", "integer", "character"].includes(mode))
      fail(ctx, `'mode' must be "double" ("real"), "integer" or "character"`);
    if (mode === "real") mode = "double";
  } else {
    if (raw.some((el) => typeof el === "string")) mode = "character";
    else if (raw.some((el) => typeof el === "number")) mode = "double";
    else mode = "logical";
  }
  let format = null;
  if (b.has("format") && b.val("format") !== null && b.val("format") !== undefined) {
    const fcv = charVec(ctx, b.val("format"));
    const fel = fcv.els[0];
    if (fcv.els.length !== 1 || H.isNA(fel)) fail(ctx, "missing value where TRUE/FALSE needed");
    format = fel;
  }
  const scalarArg = (name) => {
    if (!b.has(name) || b.val(name) === null || b.val(name) === undefined) return null;
    const nv = numVec(ctx, b.val(name));
    if (nv.els.length !== 1) fail(ctx, "the condition has length > 1");
    const el = nv.els[0];
    if (H.isNA(el) || typeof el !== "number" || Number.isNaN(el))
      fail(ctx, "missing value where TRUE/FALSE needed");
    return Math.trunc(el);
  };
  let width = scalarArg("width");
  // 文字列パス。
  if (mode === "character" || format === "s") {
    if (mode !== "character") {
      warn(ctx, `coercing argument to "character" for format="s"`);
    }
    const cv = charVec(ctx, xV, { naToString: true });
    const out = formatCharCommon(cv.els, width, flag);
    return xNames ? H.withNames(out, xNames) : out;
  }
  if (format === null) format = mode === "integer" ? "d" : "g";
  else if (["f", "e", "E", "g", "G", "fg"].includes(format)) {
    if (mode === "integer") mode = "double";
  } else if (format === "d") {
    mode = "integer";
  } else fail(ctx, `'format' must be one of {"f","e","E","g","G", "fg", "s"}`);
  if (mode === "logical") fail(ctx, "unsupported type");
  const nv = numVec(ctx, xV);
  let els = nv.els.map((el) => {
    if (H.isNA(el)) return el;
    return mode === "integer" ? Math.trunc(el) : el;
  });
  // 非有限・NA は文字列として別枠で整形する（ラッパーの some.special）。
  const ok = els.map((el) => !H.isNA(el) && Number.isFinite(el));
  const someSpecial = ok.some((v) => !v);
  const rQ = els.filter((_, i) => !ok[i]).map((el) => (H.isNA(el) ? "NA" : H.formatRNum(el)));
  const workEls = els.map((el, i) => (ok[i] ? el : 0));
  let digits = scalarArg("digits");
  if (width === null && digits === null) width = 1;
  if (digits === null) digits = mode === "integer" ? 2 : 4;
  else if (digits < 0) digits = 6;
  else {
    const maxDigits = format !== "f" ? 50 : 292;
    if (digits > maxDigits) {
      warn(ctx, `'digits' reduced to ${maxDigits}`);
      digits = maxDigits;
    }
  }
  if (width === null) width = digits + 1;
  else if (width === 0) width = digits;
  const flagSet = new Set([...flag]);
  const leftJ = width < 0 || flagSet.has("-");
  const absWidth = Math.abs(width);
  let out = workEls.map((el) => {
    if (format === "d") {
      return formatIntElement(el, {
        verb: "d", prec: null, alt: flagSet.has("#"),
        plusFlag: flagSet.has("+"), spaceFlag: flagSet.has(" "),
        width: absWidth, leftJustify: leftJ, zeroFlag: flagSet.has("0"),
      });
    }
    const { neg, body } =
      format === "fg"
        ? fgFormatBody(el, digits, flagSet.has("#"))
        : formatFloatBody(el, { verb: format, prec: digits, alt: flagSet.has("#") });
    return applyField(body, {
      neg,
      plusFlag: flagSet.has("+"),
      spaceFlag: flagSet.has(" "),
      width: absWidth,
      leftJustify: leftJ,
      zeroPad: flagSet.has("0"),
    });
  });
  if (someSpecial) {
    const specStrs = formatCharCommon(rQ, width, flag);
    let k = 0;
    out = out.map((s, i) => (ok[i] ? s : specStrs[k++]));
  }
  // マーク類が指定されたら prettyNum パスを通す。
  const bigMark = pnStringArg(ctx, b, "big.mark", "");
  const smallMark = pnStringArg(ctx, b, "small.mark", "");
  const decimalMark = pnStringArg(ctx, b, "decimal.mark", ".");
  const zeroPrint = pnZeroPrint(ctx, b);
  const drop0 = b.has("drop0trailing") ? asLogical(ctx, b.val("drop0trailing")) : false;
  if (bigMark !== "" || smallMark !== "" || decimalMark !== "." || zeroPrint != null || drop0) {
    out = prettyNumCore(ctx, out, {
      bigMark,
      bigInterval: pnIntArg(ctx, b, "big.interval", 3),
      smallMark,
      smallInterval: pnIntArg(ctx, b, "small.interval", 5),
      decimalMark,
      inputDMark: ".",
      preserveWidth: b.has("preserve.width")
        ? matchArgEnum(ctx, b.val("preserve.width"), ["common", "individual", "none"])
        : "individual",
      zeroPrint,
      replaceZero: b.has("replace.zero") ? asLogical(ctx, b.val("replace.zero")) : true,
      drop0trailing: drop0,
      detectCmplx: false,
    });
  }
  return xNames ? H.withNames(out, xNames) : out;
};

// ---- sQuote／dQuote（UTF-8 ロケールをモデル化：q=TRUE はファンシー）
function quotePair(ctx, b, isDouble) {
  const H = ctx.H;
  let before = isDouble ? '"' : "'";
  let after = before;
  // 既定の q は getOption("useFancyQuotes") = TRUE。UTF-8 ロケールの
  // モデルではファンシー引用符になる。
  if (!b.has("q")) {
    return isDouble ? ["“", "”"] : ["‘", "’"];
  }
  const q = b.val("q");
  if (q !== null && q !== undefined) {
    const els = H.vec(q);
    const el = els[0];
    let resolved = null;
    if (el === true) resolved = "UTF-8";
    else if (typeof el === "string") resolved = el;
    if (resolved === "TeX") {
      before = isDouble ? "``" : "`";
      after = isDouble ? "''" : "'";
    } else if (resolved === "UTF-8") {
      before = isDouble ? "“" : "‘";
      after = isDouble ? "”" : "’";
    }
    if (els.length >= 4 && els.every((e) => typeof e === "string")) {
      before = isDouble ? els[2] : els[0];
      after = isDouble ? els[3] : els[1];
    }
  }
  return [before, after];
}
const quoteHandler = (isDouble) => (ctx) => {
  const b = bindArgs(ctx, ["x", "q"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"), { naToString: true });
  if (!xv.els.length) return [];
  const [before, after] = quotePair(ctx, b, isDouble);
  return xv.els.map((el) => before + el + after);
};

// ---- utf8ToInt／intToUtf8／validUTF8／validEnc
const utf8ToIntHandler = (ctx) => {
  const b = bindArgs(ctx, ["x"]);
  const H = ctx.H;
  const v = b.req("x");
  const bad = () => fail(ctx, "argument must be a character vector of length 1");
  if (isDf(v) || v === null || v === undefined) bad();
  const raw = H.vec(v);
  if (!raw.length) bad();
  if (raw.length > 1)
    warn(ctx, "argument should be a character vector of length 1\nall but the first element will be ignored");
  const el = raw[0];
  if (H.isNA(el)) {
    // スカラー NA（論理値 NA）はエラー。配列中の NA は NA_integer_。
    if (!Array.isArray(v)) bad();
    return [H.NA];
  }
  if (typeof el !== "string") bad();
  return codePoints(el).map((c) => c.codePointAt(0));
};
const intToUtf8Handler = (ctx) => {
  const b = bindArgs(ctx, ["x", "multiple", "allow_surrogate_pairs"]);
  const H = ctx.H;
  const multiple = b.has("multiple") ? asLogical(ctx, b.val("multiple")) : false;
  const allowPairs = b.has("allow_surrogate_pairs") ? asLogical(ctx, b.val("allow_surrogate_pairs")) : false;
  const nv = numVec(ctx, b.req("x"));
  const vals = nv.els.map((el) => (H.isNA(el) ? el : Math.trunc(el)));
  const convert = (list) => {
    // 1つの文字列に変換。NA があれば null（全体 NA）を返す。
    let out = "";
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      if (H.isNA(v)) return null;
      if (v === 0) continue;
      if (v < 0) fail(ctx, "intToUtf8 で負の値は再現できません（negative values are not supported）");
      if (v > 0x10ffff) return null;
      if (v >= 0xd800 && v <= 0xdfff) {
        if (allowPairs && v <= 0xdbff && i + 1 < list.length) {
          const w = list[i + 1];
          if (!H.isNA(w) && w >= 0xdc00 && w <= 0xdfff) {
            out += String.fromCodePoint(0x10000 + ((v - 0xd800) << 10) + (w - 0xdc00));
            i++;
            continue;
          }
        }
        return null;
      }
      out += String.fromCodePoint(v);
    }
    return out;
  };
  if (multiple) {
    return vals.map((v) => {
      const r = convert([v]);
      return r === null ? H.NA : r;
    });
  }
  const r = convert(vals);
  return r === null ? H.NA : r;
};


// ---- strtrim／strrep
const strtrimHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "width"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  const wv = numVec(ctx, b.req("width"));
  if (xv.els.length && wv.els.length !== 1 && wv.els.length !== xv.els.length)
    fail(ctx, "invalid 'width' argument");
  for (const el of wv.els)
    if (H.isNA(el) || typeof el !== "number" || Number.isNaN(el) || el < 0)
      fail(ctx, "invalid 'width' argument");
  const out = xv.els.map((el, i) => {
    if (H.isNA(el)) return H.NA;
    const w = Math.trunc(wv.els[wv.els.length === 1 ? 0 : i]);
    return strtrimByWidth(el, w);
  });
  return xv.names ? H.withNames(out, xv.names) : out;
};
const strrepHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "times"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  const tv = numVec(ctx, b.req("times"));
  const n = Math.max(xv.els.length, tv.els.length);
  if (!xv.els.length || !tv.els.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = xv.els[i % xv.els.length];
    const t = tv.els[i % tv.els.length];
    if (!H.isNA(t) && (typeof t !== "number" || Number.isNaN(t) || Math.trunc(t) < 0))
      fail(ctx, "invalid 'times' value");
    if (H.isNA(el) || H.isNA(t)) out.push(H.NA);
    else out.push(el.repeat(Math.trunc(t)));
  }
  return xv.names && xv.els.length === n ? H.withNames(out, xv.names) : out;
};

// ---- strwrap
const strwrapHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "width", "indent", "exdent", "prefix", "simplify", "initial"]);
  const H = ctx.H;
  if (b.has("simplify") && !asLogical(ctx, b.val("simplify")))
    fail(ctx, "strwrap の simplify = FALSE（リスト返却）は未対応です");
  const xv = charVec(ctx, b.req("x"), { naToString: true });
  let width = 72;
  if (b.has("width")) {
    const nv = numVec(ctx, b.val("width"));
    const el = nv.els[0];
    if (!nv.els.length || H.isNA(el) || typeof el !== "number" || Number.isNaN(el))
      fail(ctx, "invalid 'width' argument");
    width = el;
  }
  const spaceCount = (name, def) => {
    if (!b.has(name)) return def;
    const nv = numVec(ctx, b.val(name));
    const el = nv.els[0];
    if (!nv.els.length || H.isNA(el) || typeof el !== "number" || Number.isNaN(el) || Math.trunc(el) < 0)
      fail(ctx, "invalid 'times' value");
    return Math.trunc(el);
  };
  const indent = spaceCount("indent", 0);
  const exdent = spaceCount("exdent", 0);
  const prefix = b.has("prefix") ? (charVec(ctx, b.val("prefix")).els[0] ?? "") : "";
  const prefixStr = H.isNA(prefix) ? "NA" : prefix;
  let initial = b.has("initial") ? (charVec(ctx, b.val("initial")).els[0] ?? "") : prefixStr;
  if (H.isNA(initial)) initial = "NA";
  const indentString = " ".repeat(indent);
  const exdentString = " ".repeat(exdent);
  const result = [];
  for (const el of xv.els) {
    const paras = el.split(/\n[ \t\n]*\n/);
    let yi = [];
    let curInitial = initial;
    for (const para of paras) {
      let words = para.split(/[ \t\n]/);
      let nc = words.map((w) => displayWidth(w));
      if (nc.some((v) => v === 0)) {
        const drop = [];
        words.forEach((w, idx) => {
          if (nc[idx] !== 0) return;
          const prev = idx > 0 ? words[idx - 1] : null;
          if (prev !== null && /[.?!][)"']?$/.test(prev)) return;
          drop.push(idx);
        });
        words = words.filter((_, idx) => !drop.includes(idx));
        nc = nc.filter((_, idx) => !drop.includes(idx));
      }
      if (!words.length) {
        yi.push("", curInitial);
        continue;
      }
      let lens = [];
      {
        let acc = 0;
        lens = nc.map((v) => (acc += v + 1));
      }
      let currentIndex = 0;
      const lowerBlockIndex = [1];
      const upperBlockIndex = [];
      let first = true;
      let maxLength = width - displayWidth(curInitial) - indent;
      while (lens.length) {
        let k = Math.max(lens.filter((v) => v <= maxLength).length, 1);
        if (first) {
          first = false;
          maxLength = width - displayWidth(prefixStr) - exdent;
        }
        currentIndex += k;
        if (nc[currentIndex - 1] === 0) upperBlockIndex.push(currentIndex - 1);
        else upperBlockIndex.push(currentIndex);
        if (lens.length > k) {
          if (nc[currentIndex] === 0) {
            currentIndex += 1;
            k += 1;
          }
          lowerBlockIndex.push(currentIndex + 1);
        }
        if (lens.length > k) lens = lens.slice(k).map((v) => v - lens[k - 1]);
        else lens = [];
      }
      const nBlocks = upperBlockIndex.length;
      const s = [];
      for (let bi = 0; bi < nBlocks; bi++) {
        const head = (bi === 0 ? curInitial : prefixStr) + (bi === 0 ? indentString : exdentString);
        const seg = words.slice(lowerBlockIndex[bi] - 1, upperBlockIndex[bi]).join(" ");
        s.push(head + seg);
      }
      yi.push(...s, prefixStr);
      curInitial = prefixStr;
    }
    if (yi.length) result.push(...yi.slice(0, -1));
    else result.push("");
  }
  return result;
};

// ---- encodeString
const encodeStringHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "width", "quote", "na.encode", "justify"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("x"));
  let width = 0;
  if (b.has("width")) {
    const nv = numVec(ctx, b.val("width"));
    const el = nv.els[0];
    if (!nv.els.length || H.isNA(el) || typeof el !== "number" || Number.isNaN(el))
      fail(ctx, "invalid 'width' argument");
    width = Math.trunc(el);
  }
  let quote = "";
  if (b.has("quote")) {
    const qv = charVec(ctx, b.val("quote"));
    if (qv.els.length) {
      if (H.isNA(qv.els[0])) fail(ctx, "invalid 'quote' argument");
      quote = qv.els[0];
    }
  }
  const naEncode = b.has("na.encode") ? asLogical(ctx, b.val("na.encode")) : true;
  const justify = b.has("justify")
    ? matchArgEnum(ctx, b.val("justify"), ["left", "right", "centre", "none"])
    : "left";
  const escapeOne = (s) => {
    let out = "";
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (ch === "\\") out += "\\\\";
      else if (quote !== "" && ch === quote[0]) out += "\\" + ch;
      else if (ch === "\n") out += "\\n";
      else if (ch === "\t") out += "\\t";
      else if (ch === "\r") out += "\\r";
      else if (cp === 7) out += "\\a";
      else if (cp === 8) out += "\\b";
      else if (cp === 12) out += "\\f";
      else if (cp === 11) out += "\\v";
      else if (cp < 0x20 || cp === 0x7f) out += "\\" + cp.toString(8).padStart(3, "0");
      else out += ch;
    }
    return out;
  };
  const out = xv.els.map((el) => {
    if (H.isNA(el)) {
      if (!naEncode) return H.NA;
      const t = quote !== "" ? "NA" : "<NA>";
      if (justify === "none" || width <= 0) return t;
      const extra = width - codePoints(t).length;
      if (extra <= 0) return t;
      if (justify === "right") return " ".repeat(extra) + t;
      if (justify === "centre")
        return " ".repeat(Math.floor(extra / 2)) + t + " ".repeat(Math.ceil(extra / 2));
      return t + " ".repeat(extra);
    }
    let s = escapeOne(el);
    if (quote !== "") s = quote + s + quote;
    if (justify === "none" || width <= 0) return s;
    const extra = width - codePoints(s).length;
    if (extra <= 0) return s;
    if (justify === "right") return " ".repeat(extra) + s;
    if (justify === "centre")
      return " ".repeat(Math.floor(extra / 2)) + s + " ".repeat(Math.ceil(extra / 2));
    return s + " ".repeat(extra);
  });
  return xv.names ? H.withNames(out, xv.names) : out;
};

// ---- shQuote
const shQuoteHandler = (ctx) => {
  const b = bindArgs(ctx, ["string", "type"]);
  const H = ctx.H;
  const xv = charVec(ctx, b.req("string"), { naToString: true });
  const type = b.has("type") ? matchArgEnum(ctx, b.val("type"), ["sh", "csh", "cmd", "cmd2"]) : "sh";
  const els = xv.els;
  if (!els.length) return [];
  const hasSingle = els.some((s) => s.includes("'"));
  const dqEscape = (s, chars) =>
    codePoints(s)
      .map((c) => (chars.includes(c) ? "\\" + c : c))
      .join("");
  let out;
  // 分岐順は shQuote の R ソースどおり：cmd／cmd2 が先、次に
  // 「' を含まない」場合の一重引用符。
  if (type === "cmd") {
    out = els.map((s) => {
      let t = s.replace(/(\\*)"/g, (_, g) => g + g + '\\"');
      t = t.replace(/(\\+)$/, (_, g) => g + g);
      return '"' + t + '"';
    });
  } else if (type === "cmd2") {
    // cmd2 は引用符で囲まず、対象文字の前に ^ を付けるだけ。
    out = els.map((s) => s.replace(/[()%!^"<>&|]/g, (c) => "^" + c));
  } else if (!hasSingle) {
    out = els.map((s) => "'" + s + "'");
  } else if (type === "sh") {
    out = els.map((s) => '"' + dqEscape(s, ['"', "$", "`", "\\"]) + '"');
  } else if (type === "csh" && !els.some((s) => /[$`]/.test(s))) {
    out = els.map((s) => '"' + dqEscape(s, ['"', "!", "\\"]) + '"');
  } else {
    out = els.map((s) => "'" + s.replaceAll("'", `'"'"'`) + "'");
  }
  return out;
};

export const builtins = new Map([
  ["paste", pasteHandler],
  ["paste0", paste0Handler],
  ["sprintf", sprintfHandler],
  ["gettextf", gettextfHandler],
  ["substr", substrHandler],
  ["substring", substringHandler],
  ["nchar", ncharHandler],
  ["nzchar", nzcharHandler],
  ["toupper", caseHandler(true)],
  ["tolower", caseHandler(false)],
  ["casefold", caseHandler(null)],
  ["chartr", chartrHandler],
  ["sub", subHandler(false)],
  ["gsub", subHandler(true)],
  ["grep", grepHandler],
  ["grepl", greplHandler],
  ["grepv", grepvHandler],
  ["trimws", trimwsHandler],
  ["startsWith", startsEndsHandler(true)],
  ["endsWith", startsEndsHandler(false)],
  ["make.names", makeNamesHandler],
  ["make.unique", makeUniqueHandler],
  ["charmatch", charmatchHandler],
  ["pmatch", pmatchHandler],
  ["agrep", agrepHandler],
  ["agrepl", agreplHandler],
  ["abbreviate", abbreviateHandler],
  ["toString", toStringHandler],
  ["is.string", isStringHandler],
  ["formatC", formatCHandler],
  ["prettyNum", prettyNumHandler],
  ["sQuote", quoteHandler(false)],
  ["dQuote", quoteHandler(true)],
  ["utf8ToInt", utf8ToIntHandler],
  ["intToUtf8", intToUtf8Handler],
  ["strwrap", strwrapHandler],
  ["strtrim", strtrimHandler],
  ["strrep", strrepHandler],
  ["encodeString", encodeStringHandler],
  ["shQuote", shQuoteHandler],
]);
