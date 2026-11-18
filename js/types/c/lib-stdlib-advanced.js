// 高度モード（ブロックB6）: <stdlib.h> の変換・乱数・メモリ確保、
// <inttypes.h>、<assert.h>、<time.h> の純粋関数（difftime）の意味論
// ハンドラ（C班3）。handlers は名前→関数
// (args, values, s, api, node, H) => 値 | LIBRARY_UNHANDLED。
//
// 実装方針（裁定メモ準拠）:
// - strtol 系は内部を BigInt で正確に処理し、基数判定（0=自動:
//   0x→16進・0 頭→8進）・符号・前置空白・あふれ時のクランプを
//   規格どおりに行う。結果が JS の安全整数範囲を超える場合は
//   エンジンの既存規則どおり「未確認」で停止する。
// - endptr: NULL は完全対応。非 NULL は &p 形（単項 & の引数）の
//   書き戻しを H.targetPointer＋H.deref で実装する。文字列リテラル
//   を直接渡した場合は、リテラル用のメモリオブジェクトを確保して
//   その中へのポインタとして表す（実物の文字列リテラルは静的記憶
//   域を持つため、そのモデル化）。
// - malloc 系: 確保域は要素型 char ×n のメモリオブジェクト。
//   malloc は未初期化（配列の未初期化要素と同じ {kind:"uninitialized"}
//   表現）、calloc は 0 初期化。要素数上限 16,777,216 超は NULL。
// - rand: [0, RAND_MAX=2147483647] の「実行時に決まる値」。

const MAX_ALLOC = 16777216;
const WS = " \t\n\v\f\r";
const UNINIT = () => ({ kind: "uninitialized" });

function needArgs(name, args, n, api, node) {
  if (args.length !== n)
    api.fail(
      `${name} は引数を${n}つ取ります（${args.length}個は渡せません）`,
      node,
      "CompileError",
    );
}
function firstUnknown(values, H) {
  for (const v of values) if (H.isUnknown(v)) return v;
  return null;
}
function numArg(v, name, api, node) {
  if (typeof v === "boolean") return Number(v);
  if (typeof v !== "number")
    api.fail(`${name} の引数は数値でなければなりません`, node, "CompileError");
  return v;
}
function toSafeNumber(v, api, node) {
  if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER))
    api.fail("この64ビット整数は安全に計算できる範囲外です", node, "未確認");
  return Number(v);
}
function clampSigned(v, bits) {
  const min = -(1n << BigInt(bits - 1)),
    max = (1n << BigInt(bits - 1)) - 1n;
  return v < min ? min : v > max ? max : v;
}
function digitVal(ch) {
  const c = ch.toLowerCase();
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "a" && c <= "z") return c.charCodeAt(0) - 87;
  return -1;
}
const isHexDigit = (ch) => ch !== undefined && digitVal(ch) >= 0 && digitVal(ch) < 16;

// 整数の走査（strtol の subject sequence）。text は JS 文字列。
// 戻り値 { consumed, value(BigInt) }。変換不能なら consumed=0。
function scanInt(text, base) {
  let i = 0;
  const n = text.length;
  while (i < n && WS.includes(text[i])) i++;
  let neg = false;
  if (text[i] === "+" || text[i] === "-") {
    neg = text[i] === "-";
    i++;
  }
  let b = base;
  if (b === 0) {
    if (text[i] === "0" && (text[i + 1] === "x" || text[i + 1] === "X") && isHexDigit(text[i + 2]))
      b = 16;
    else if (text[i] === "0") b = 8;
    else b = 10;
  }
  if (b === 16 && text[i] === "0" && (text[i + 1] === "x" || text[i + 1] === "X") && isHexDigit(text[i + 2]))
    i += 2;
  let val = 0n,
    any = false;
  let j = i;
  while (j < n) {
    const d = digitVal(text[j]);
    if (d < 0 || d >= b) break;
    val = val * BigInt(b) + BigInt(d);
    any = true;
    j++;
  }
  if (!any) return { consumed: 0, value: 0n };
  return { consumed: j, value: neg ? -val : val };
}

// 16進浮動小数点文字列（符号なし・"0x" 込み）を数値化する。
function hexFloatValue(m) {
  let mant = m,
    exp = 0;
  const pAt = mant.search(/[pP]/);
  if (pAt >= 0) {
    exp = parseInt(mant.slice(pAt + 1), 10);
    mant = mant.slice(0, pAt);
  }
  mant = mant.slice(2); // 0x
  const dot = mant.indexOf(".");
  const intPart = dot >= 0 ? mant.slice(0, dot) : mant;
  const fracPart = dot >= 0 ? mant.slice(dot + 1) : "";
  const digits = (intPart + fracPart) || "0";
  const big = BigInt("0x" + digits);
  const scale = exp - 4 * fracPart.length;
  return scale >= 0
    ? Number(big) * 2 ** scale
    : Number(big) / 2 ** -scale;
}

// 浮動小数点の走査（strtod の subject sequence）。
// 戻り値 { consumed, value(number) }。変換不能なら consumed=0。
function scanFloat(text) {
  let i = 0;
  const n = text.length;
  while (i < n && WS.includes(text[i])) i++;
  let sign = 1;
  if (text[i] === "+" || text[i] === "-") {
    if (text[i] === "-") sign = -1;
    i++;
  }
  const rest = text.slice(i);
  let m;
  if ((m = /^infinity/i.exec(rest)))
    return { consumed: i + m[0].length, value: sign * Infinity };
  if ((m = /^inf/i.exec(rest)))
    return { consumed: i + m[0].length, value: sign * Infinity };
  if ((m = /^nan\([0-9A-Za-z_]*\)/i.exec(rest)) || (m = /^nan/i.exec(rest)))
    return { consumed: i + m[0].length, value: NaN };
  if (
    (m = /^0[xX](?:[0-9a-fA-F]+(?:\.[0-9a-fA-F]*)?|\.[0-9a-fA-F]+)(?:[pP][+-]?\d+)?/.exec(
      rest,
    ))
  )
    return { consumed: i + m[0].length, value: sign * hexFloatValue(m[0]) };
  if ((m = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)))
    return { consumed: i + m[0].length, value: sign * Number(m[0]) };
  return { consumed: 0, value: 0 };
}

// 文字列引数を { text, ptr } として解決する。ptr はポインタ値または
// null（文字列リテラルを直接渡した場合）。
function sourceString(v, s, api, node, H, fname) {
  if (typeof v === "string") return { text: v, ptr: null };
  if (H.isPtr(v)) return { text: H.cString(v, s, api, node), ptr: v };
  api.fail(`${fname} の引数には文字列へのポインタが必要です`, node, "未定義動作");
}

// endptr への書き戻し。endptr 引数が NULL なら何もしない。
// consumed=null のときは「変換なし」を表し、元のポインタを書き戻す
// （consumed=0 と同じ結果になるが、呼び出し側の意図を明示する）。
function writeEndptr(args, values, idx, src, consumed, s, api, node, H) {
  const argNode = args[idx];
  const v = values[idx];
  if (v === null || v === undefined || v === 0) return; // NULL（0 を含む）は完全対応
  let storage = null;
  if (argNode?.k === "unary" && argNode.op === "&")
    storage = H.targetPointer(argNode.arg, s, api, node);
  else if (H.isPtr(v)) storage = v;
  else
    api.fail(
      "endptr の書き戻し先として扱えない形です（&変数 の形で渡してください）",
      node,
      "未対応",
    );
  let srcPtr = src.ptr;
  if (!srcPtr) {
    // 文字列リテラル直接渡し: リテラル用の静的オブジェクトを確保する。
    const bytes = [...src.text].map((c) => c.charCodeAt(0));
    bytes.push(0);
    const id = H.allocate(s, "<string-literal>", bytes, "char");
    srcPtr = { kind: "pointer", object: id, offset: 0 };
  }
  const newPtr = {
    kind: "pointer",
    object: srcPtr.object,
    offset: srcPtr.offset + (consumed ?? 0),
  };
  const mem = H.deref(storage, s, api, node);
  mem.values[storage.offset] = newPtr;
  syncScalarMirror(s, mem, storage.offset, newPtr);
}

// スカラ変数のメモリへ書いたとき、s.vars 側の鏡像も同期する
// （エンジン本体の write と同じ規則）。
function syncScalarMirror(s, mem, offset, value) {
  const varName = mem?.name;
  if (
    offset === 0 &&
    varName &&
    s.types &&
    Object.hasOwn(s.types, varName) &&
    !String(s.types[varName]).endsWith("[]")
  )
    s.vars[varName] = value;
  // 参照（別名）の同期は、対象オブジェクト ID が一致する場合のみ行う。
  if (s.references && mem)
    for (const [id, m] of Object.entries(s.model.memory))
      if (m === mem)
        for (const [nm, alias] of Object.entries(s.references))
          if (alias.object === id && alias.offset === offset) s.vars[nm] = value;
}

/* ---------------- 変換系 ---------------- */

function makeStrtol(bitsOf, unsigned, fname) {
  return (args, values, s, api, node, H) => {
    needArgs(fname, args, 3, api, node);
    const unk = firstUnknown(values, H);
    if (unk) return unk;
    const src = sourceString(values[0], s, api, node, H, fname);
    let base = numArg(values[2], fname, api, node);
    if (!Number.isInteger(base) || !(base === 0 || (base >= 2 && base <= 36)))
      api.fail(
        `${fname} の基数は 0 または 2〜36 でなければなりません`,
        node,
        "未定義動作",
      );
    base = Math.trunc(base);
    const { consumed, value } = scanInt(src.text, base);
    const bits = bitsOf(s, H);
    let result;
    if (unsigned) {
      // 符号なし: 負値は 2^bits での剰余（strtoul("-1") = ULONG_MAX）。
      const mod = 1n << BigInt(bits);
      result = ((value % mod) + mod) % mod;
      // 正のあふれは最大値へクランプ（剰余ではない）。
      if (value > mod - 1n) result = mod - 1n;
    } else {
      result = clampSigned(value, bits);
    }
    const out = toSafeNumber(result, api, node);
    if (args.length >= 2 && values[1] !== undefined)
      writeEndptr(args, values, 1, src, consumed, s, api, node, H);
    return out;
  };
}

function makeStrtod(fround, fname) {
  return (args, values, s, api, node, H) => {
    needArgs(fname, args, 2, api, node);
    const unk = firstUnknown(values, H);
    if (unk) return unk;
    const src = sourceString(values[0], s, api, node, H, fname);
    const { consumed, value } = scanFloat(src.text);
    if (args.length >= 2 && values[1] !== undefined)
      writeEndptr(args, values, 1, src, consumed, s, api, node, H);
    return fround ? Math.fround(value) : value;
  };
}

function makeAtoi(targetBits, fname) {
  // atoi/atol/atoll: 10進走査。対象型の範囲外は、エンジンのキャスト
  // 規則（処理系依存として停止）に合わせる。atol/atoll は対象幅が
  // long/long long と同じため strtol 系と同じクランプ後に判定する。
  return (args, values, s, api, node, H) => {
    needArgs(fname, args, 1, api, node);
    const unk = firstUnknown(values, H);
    if (unk) return unk;
    const src = sourceString(values[0], s, api, node, H, fname);
    const { value } = scanInt(src.text, 10);
    const bits = targetBits(s, H);
    if (fname === "atoi") {
      const min = -(1n << BigInt(bits - 1)),
        max = (1n << BigInt(bits - 1)) - 1n;
      if (value < min || value > max)
        api.fail(
          `atoi の結果が int で表せません`,
          node,
          "環境依存",
        );
      return Number(value);
    }
    return toSafeNumber(clampSigned(value, bits), api, node);
  };
}

function makeAbs(bitsOf, fname) {
  return (args, values, s, api, node, H) => {
    needArgs(fname, args, 1, api, node);
    let v = values[0];
    if (H.isUnknown(v)) return v;
    v = numArg(v, fname, api, node);
    const bits = bitsOf(s, H);
    // abs と同じく、浮動小数点引数は対象整数型へ変換してから処理する。
    if (!Number.isInteger(v)) {
      const t = Math.trunc(v);
      const min = -(2 ** (bits - 1)),
        max = 2 ** (bits - 1) - 1;
      if (!Number.isFinite(t) || t < min || t > max)
        api.fail("浮動小数点から整数への変換が範囲外です", node, "未定義動作");
      v = t;
    }
    if (!Number.isSafeInteger(v))
      api.fail("この64ビット整数は安全に計算できる範囲外です", node, "未確認");
    if (v === -(2 ** (bits - 1)))
      api.fail(`${fname} の結果が表せません`, node, "未定義動作");
    return Math.abs(v);
  };
}

/* ---------------- メモリ確保 ---------------- */

function sizeArg(v, fname, api, node, H) {
  if (H.isUnknown(v)) return v;
  const n = numArg(v, fname, api, node);
  return Math.trunc(n);
}

function allocObject(count, zero, label, s, H) {
  const vals = Array.from({ length: count }, () => (zero ? 0 : UNINIT()));
  const id = H.allocate(s, label, vals, "char");
  return { kind: "pointer", object: id, offset: 0 };
}

function mallocImpl(fname, zero) {
  return (args, values, s, api, node, H) => {
    needArgs(fname, args, 1, api, node);
    const n = sizeArg(values[0], fname, api, node, H);
    if (H.isUnknown(n)) return n;
    if (n < 0 || n > MAX_ALLOC) return null;
    return allocObject(n, zero, fname + "領域", s, H);
  };
}

export const handlers = {
  /* <stdlib.h> 変換 */
  atoi: makeAtoi(() => 32, "atoi"),
  atol: makeAtoi((s, H) => H.width("long", s), "atol"),
  atoll: makeAtoi(() => 64, "atoll"),
  atof: (args, values, s, api, node, H) => {
    needArgs("atof", args, 1, api, node);
    const unk = firstUnknown(values, H);
    if (unk) return unk;
    const src = sourceString(values[0], s, api, node, H, "atof");
    return scanFloat(src.text).value;
  },
  strtol: makeStrtol((s, H) => H.width("long", s), false, "strtol"),
  strtoll: makeStrtol(() => 64, false, "strtoll"),
  strtoul: makeStrtol((s, H) => H.width("long", s), true, "strtoul"),
  strtoull: makeStrtol(() => 64, true, "strtoull"),
  strtod: makeStrtod(false, "strtod"),
  strtof: makeStrtod(true, "strtof"),
  strtold: makeStrtod(false, "strtold"),
  /* <inttypes.h> */
  strtoimax: makeStrtol(() => 64, false, "strtoimax"),
  strtoumax: makeStrtol(() => 64, true, "strtoumax"),
  imaxabs: makeAbs(() => 64, "imaxabs"),
  /* <stdlib.h> 絶対値 */
  labs: makeAbs((s, H) => H.width("long", s), "labs"),
  llabs: makeAbs(() => 64, "llabs"),
  /* <stdlib.h> 乱数 */
  rand: (args, values, s, api, node, H) => {
    needArgs("rand", args, 0, api, node);
    return api.freshUnknown(
      "rand() の戻り値（0 以上 RAND_MAX=2147483647 以下の実行時に決まる値）",
      s,
    );
  },
  srand: (args, values, s, api, node, H) => {
    needArgs("srand", args, 1, api, node);
    // モデルでは種を受け取るのみ（rand の系列は再現しない）。
    return undefined;
  },
  /* <stdlib.h> メモリ確保 */
  malloc: mallocImpl("malloc", false),
  calloc: (args, values, s, api, node, H) => {
    needArgs("calloc", args, 2, api, node);
    const a = sizeArg(values[0], "calloc", api, node, H);
    if (H.isUnknown(a)) return a;
    const b = sizeArg(values[1], "calloc", api, node, H);
    if (H.isUnknown(b)) return b;
    if (a < 0 || b < 0) return null;
    const total = a * b;
    if (!Number.isSafeInteger(total) || total > MAX_ALLOC) return null;
    return allocObject(total, true, "calloc領域", s, H);
  },
  realloc: (args, values, s, api, node, H) => {
    needArgs("realloc", args, 2, api, node);
    const ptr = values[0];
    if (H.isUnknown(ptr)) return ptr;
    const n = sizeArg(values[1], "realloc", api, node, H);
    if (H.isUnknown(n)) return n;
    if (ptr === null || ptr === undefined) {
      if (n < 0 || n > MAX_ALLOC) return null;
      return allocObject(n, false, "realloc領域", s, H);
    }
    if (!H.isPtr(ptr))
      api.fail("realloc の引数はポインタでなければなりません", node, "未定義動作");
    const old = H.deref(ptr, s, api, node); // 寿命切れ・無効はここで停止
    if (n === 0) {
      old.alive = false;
      return null;
    }
    if (n < 0 || n > MAX_ALLOC) return null; // 失敗時は旧領域は維持される
    const next = allocObject(n, false, "realloc領域", s, H);
    const nextMem = s.model.memory[next.object];
    const copyLen = Math.min(old.values.length, n);
    for (let i = 0; i < copyLen; i++) nextMem.values[i] = old.values[i];
    old.alive = false;
    return next;
  },
  free: (args, values, s, api, node, H) => {
    needArgs("free", args, 1, api, node);
    const ptr = values[0];
    if (H.isUnknown(ptr)) return ptr;
    if (ptr === null || ptr === undefined) return undefined; // free(NULL) は無動作
    if (!H.isPtr(ptr))
      api.fail("free の引数はポインタでなければなりません", node, "未定義動作");
    const mem = s.model.memory[ptr.object];
    if (!mem) api.fail("無効なポインタの free です", node, "未定義動作");
    if (!mem.alive)
      api.fail("free 済みの領域を再び free しています（二重解放）", node, "未定義動作");
    if (ptr.offset !== 0)
      api.fail("確保した領域の先頭でないポインタの free です", node, "未定義動作");
    mem.alive = false;
    return undefined;
  },
  aligned_alloc: (args, values, s, api, node, H) => {
    needArgs("aligned_alloc", args, 2, api, node);
    const al = sizeArg(values[0], "aligned_alloc", api, node, H);
    if (H.isUnknown(al)) return al;
    const n = sizeArg(values[1], "aligned_alloc", api, node, H);
    if (H.isUnknown(n)) return n;
    // アラインメントは 2 の冪でなければならない（不正なら NULL）。
    if (al <= 0 || (al & (al - 1)) !== 0) return null;
    if (n < 0 || n > MAX_ALLOC) return null;
    return allocObject(n, false, "aligned_alloc領域", s, H);
  },
  /* <assert.h> */
  assert: (args, values, s, api, node, H) => {
    needArgs("assert", args, 1, api, node);
    const v = values[0];
    if (H.isUnknown(v)) return v; // 真偽が確定しない場合はそのまま伝播
    const truthy =
      v === null
        ? false
        : typeof v === "number"
          ? v !== 0
          : typeof v === "boolean"
            ? v
            : H.isPtr(v)
              ? true
              : Boolean(v);
    if (!truthy)
      api.fail("アサーションに失敗しました（assertion failed）", node);
    return undefined;
  },
  /* <time.h> の純粋関数のみ */
  difftime: (args, values, s, api, node, H) => {
    needArgs("difftime", args, 2, api, node);
    const unk = firstUnknown(values, H);
    if (unk) return unk;
    const end = numArg(values[0], "difftime", api, node);
    const begin = numArg(values[1], "difftime", api, node);
    return end - begin;
  },
};

export const returnTypes = {
  atoi: "int",
  atol: "long",
  atoll: "long long",
  atof: "double",
  strtod: "double",
  strtof: "float",
  strtold: "long double",
  strtol: "long",
  strtoll: "long long",
  strtoul: "unsigned long",
  strtoull: "unsigned long long",
  strtoimax: "long long",
  strtoumax: "unsigned long long",
  imaxabs: "long long",
  labs: "long",
  llabs: "long long",
  rand: "int",
  malloc: "void*",
  calloc: "void*",
  realloc: "void*",
  aligned_alloc: "void*",
  difftime: "double",
};
