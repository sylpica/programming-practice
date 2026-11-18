// 高度モード B4S：R 高度関数グループ「utils データ操作・入出力」（高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 意味論は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3 の実測・
// 関数ソース（print による本体確認）で裁定した（報告書
// docs/audit/ADV-B4S-udata.md に根拠を記録）。
// 値モデルの硬い制約：リスト型なし・因子なし・行列型なし・クラス付き
// オブジェクトなし・複素数なし。忠実に表せない形は登録せず、呼べる形でも
// 表せない経路は api.fail で名指し停止する（U-44 エラーゼロ原則）。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}

// ---- 引数照合（functions-advanced-data.js の bindArgs を複製。出典：
// B4 eng3 班。SPEC 第4章：完全名→部分一致→位置。nameOnly は `...` の
// 後ろの仮引数で名前でのみ指定できる。dots=true のとき余分は dots へ）
function bindArgs(ctx, formals, opts = {}) {
  const { args, vals, api, node, H } = ctx;
  const dots = !!opts.dots;
  const nameOnly = new Set(opts.nameOnly ?? []);
  const positionalFormals = formals.filter((f) => !nameOnly.has(f));
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
    if (a.argName && formals.includes(a.argName)) {
      if (seenExact.has(a.argName))
        api.fail(
          `formal argument "${a.argName}" matched by multiple actual arguments`,
          node,
        );
      seenExact.add(a.argName);
    }
  }
  const result = new Map();
  const dotList = [];
  const used = new Set();
  args.forEach((a, i) => {
    if (a.argName && formals.includes(a.argName)) {
      result.set(a.argName, { present: true, value: vals[i], node: a });
      used.add(i);
    }
  });
  args.forEach((a, i) => {
    if (!a.argName || used.has(i)) return;
    const cand = formals.filter(
      (f) => f.startsWith(a.argName) && !result.has(f),
    );
    if (cand.length === 1 && !nameOnly.has(cand[0])) {
      result.set(cand[0], { present: true, value: vals[i], node: a });
      used.add(i);
    } else if (cand.length > 1)
      api.fail(`argument ${i + 1} matches multiple formal arguments`, node);
  });
  let fi = 0;
  args.forEach((a, i) => {
    if (a.argName || used.has(i)) return;
    while (fi < positionalFormals.length && result.has(positionalFormals[fi]))
      fi++;
    if (fi < positionalFormals.length) {
      result.set(positionalFormals[fi], {
        present: true,
        value: vals[i],
        node: a,
      });
      used.add(i);
      fi++;
    }
  });
  args.forEach((a, i) => {
    if (used.has(i)) return;
    if (dots) dotList.push({ name: a.argName ?? null, value: vals[i], node: a });
    else unusedFail(a, vals[i]);
  });
  return {
    has: (n) => result.has(n),
    val: (n) => result.get(n)?.value,
    nodeOf: (n) => result.get(n)?.node,
    req: (n) => {
      if (!result.has(n))
        api.fail(`argument "${n}" is missing, with no default`, node);
      return result.get(n).value;
    },
    dots: dotList,
  };
}

// ---- 小物（functions-advanced-data.js の同名ヘルパと同規則）
function asLogicalScalar(ctx, v, errMsg) {
  const H = ctx.H;
  if (v === null || v === undefined) fail(ctx, "argument is of length zero");
  const els = H.vec(v);
  if (!els.length) fail(ctx, "argument is of length zero");
  const el = els[0];
  if (H.isNA(el) || H.isNaNVal(el))
    fail(ctx, "missing value where TRUE/FALSE needed");
  if (typeof el === "boolean") return el;
  if (typeof el === "number") return el !== 0;
  fail(ctx, errMsg ?? "argument is not interpretable as logical");
}
// 要素の as.character 表現（NA は H.NA のまま返す）
function elemChar(ctx, el) {
  const H = ctx.H;
  if (H.isNA(el)) return H.NA;
  if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
  if (typeof el === "number")
    return Number.isNaN(el) ? "NaN" : H.formatRNum(el);
  return String(el);
}

// ================= head／tail =================
// 実 R 4.3.3 の checkHT(n, d) の検証順・文言をそのまま再現する。
function checkHT(ctx, nEls, dimLen) {
  const H = ctx.H;
  if (!nEls.length || nEls.every((e) => H.isMissing(e)))
    fail(
      ctx,
      "invalid 'n' - must contain at least one non-missing element, got none.",
    );
  if (
    nEls.some(
      (e) =>
        !H.isMissing(e) && typeof e !== "number" && typeof e !== "boolean",
    )
  )
    fail(ctx, "invalid 'n' - must be numeric, possibly NA.");
  if (dimLen === null && nEls.length > 1)
    fail(
      ctx,
      `invalid 'n' - must have length one when dim(x) is NULL, got ${nEls.length}`,
    );
  if (dimLen !== null && nEls.length > dimLen)
    fail(
      ctx,
      `invalid 'n' - length(n) must be <= length(dim(x)), got ${nEls.length} > ${dimLen}`,
    );
}
// 1次元ぶんの選択個数（負値は「残り全部から |n| を除く」、NA は全選択。
// 小数の n は実 R の seq_len と同様に切り捨て方向で効く）
function htCount(ctx, ni, d) {
  const H = ctx.H;
  if (ni === undefined || H.isMissing(ni)) return d;
  const v = typeof ni === "boolean" ? (ni ? 1 : 0) : ni;
  const c = v < 0 ? Math.max(d + v, 0) : Math.min(v, d);
  return Math.trunc(c);
}
function headTailFn(isHead) {
  return (ctx) => {
    const H = ctx.H;
    const formals = isHead
      ? ["x", "n"]
      : ["x", "n", "keepnums", "addrownums"];
    const b = bindArgs(ctx, formals, { dots: true });
    const x = b.req("x");
    const nVal = b.has("n") ? b.val("n") : 6;
    const nEls = nVal === null || nVal === undefined ? [] : H.vec(nVal);
    if (isDf(x)) {
      const keys = Object.keys(x.columns);
      const nrow = H.dfNrow(x);
      checkHT(ctx, nEls, 2);
      if (!isHead) {
        // tail.data.frame：addrownums は非推奨（実 R 4.3.3 実測の警告）
        if (b.has("addrownums") && !b.has("keepnums"))
          warn(
            ctx,
            `tail(., addrownums = ${H.show(b.val("addrownums"))}) is deprecated.\nUse tail(., keepnums = ${H.show(b.val("addrownums"))}) instead.`,
          );
        if (b.has("keepnums")) asLogicalScalar(ctx, b.val("keepnums"));
      }
      const rc = htCount(ctx, nEls[0], nrow);
      const cc = htCount(ctx, nEls[1], keys.length);
      const rowIdx = isHead
        ? Array.from({ length: rc }, (_, i) => i)
        : Array.from({ length: rc }, (_, i) => nrow - rc + i);
      const colKeys = isHead
        ? keys.slice(0, cc)
        : keys.slice(keys.length - cc);
      const columns = {};
      for (const k of colKeys)
        columns[k] = rowIdx.map((i) => x.columns[k][i]);
      const out = { kind: "data.frame", columns };
      // 実 R では部分集合化で行名が実体化する（元の行番号が残る）
      out.rowNames = Array.isArray(x.rowNames)
        ? rowIdx.map((i) => x.rowNames[i])
        : rowIdx.map((i) => String(i + 1));
      return out;
    }
    checkHT(ctx, nEls, null);
    if (x === null || x === undefined) return null;
    const els = H.vec(x);
    const cnt = htCount(ctx, nEls[0], els.length);
    const idx = isHead
      ? Array.from({ length: cnt }, (_, i) => i)
      : Array.from({ length: cnt }, (_, i) => els.length - cnt + i);
    const out = idx.map((i) => els[i]);
    const nm = H.namesOf(x);
    return nm ? H.withNames(out, idx.map((i) => nm[i])) : out;
  };
}

// ================= combn =================
// 集計（functions-advanced-data.js の aggApply／aggNums と同規則を複製）
function aggNums(ctx, els) {
  const H = ctx.H;
  return els.map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    fail(ctx, "invalid 'type' (character) of argument");
  });
}
function aggApply(ctx, fun, elsRaw, naRm) {
  const H = ctx.H;
  const els = Array.isArray(elsRaw) ? elsRaw : [elsRaw];
  if (fun === "length") return els.length;
  const nums = aggNums(ctx, els);
  const kept = naRm ? nums.filter((e) => !H.isMissing(e)) : nums;
  const hasMiss = nums.some((e) => H.isMissing(e));
  switch (fun) {
    case "sum":
      return hasMiss && !naRm ? H.NA : kept.reduce((a, c) => a + c, 0);
    case "mean":
      if (hasMiss && !naRm) return H.NA;
      return kept.length ? kept.reduce((a, c) => a + c, 0) / kept.length : NaN;
    case "median": {
      if (hasMiss && !naRm) return H.NA;
      if (!kept.length) return H.NA;
      const s = [...kept].sort((a, c) => a - c);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }
    case "min":
      if (hasMiss && !naRm) return H.NA;
      if (!kept.length) warn(ctx, "no non-missing arguments to min; returning Inf");
      return kept.length ? Math.min(...kept) : Infinity;
    case "max":
      if (hasMiss && !naRm) return H.NA;
      if (!kept.length) warn(ctx, "no non-missing arguments to max; returning -Inf");
      return kept.length ? Math.max(...kept) : -Infinity;
    case "sd": {
      if (hasMiss && !naRm) return H.NA;
      if (kept.length < 2) return H.NA;
      const m = kept.reduce((a, c) => a + c, 0) / kept.length;
      return Math.sqrt(
        kept.reduce((a, c) => a + (c - m) ** 2, 0) / (kept.length - 1),
      );
    }
    default:
      fail(ctx, `FUN として使えるのは文字列で指定した単純な集計のみです："${fun}"`);
  }
}
const COMBN_FUNS = new Set(["sum", "mean", "median", "min", "max", "length", "sd"]);
function combnFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "m", "FUN", "simplify"], { dots: true });
  const x = b.req("x");
  const mVal = b.req("m");
  const mEls = mVal === null || mVal === undefined ? [] : H.vec(mVal);
  // 実 R 4.3.3 の combn 本体冒頭の順序（stopifnot → m<0 → x 展開 → n<m）
  if (mEls.length !== 1) fail(ctx, "length(m) == 1L is not TRUE");
  const mEl = mEls[0];
  if (typeof mEl !== "number")
    // 論理 NA・文字列・論理値は is.numeric(m) が FALSE（実測）
    fail(ctx, "is.numeric(m) is not TRUE");
  if (H.isNaNVal(mEl)) fail(ctx, "missing value where TRUE/FALSE needed");
  if (mEl < 0) fail(ctx, "m < 0");
  if (isDf(x))
    fail(ctx, "combn: データフレームの組み合わせは未対応です");
  let els;
  if (x === null || x === undefined) els = [];
  else {
    const raw = H.vec(x);
    if (
      raw.length === 1 &&
      typeof raw[0] === "number" &&
      !H.isMissing(raw[0]) &&
      raw[0] > 0 &&
      Math.trunc(raw[0]) === raw[0]
    )
      els = Array.from({ length: raw[0] }, (_, i) => i + 1);
    else els = raw;
  }
  const n = els.length;
  if (n < mEl) fail(ctx, "n < m");
  const m = Math.trunc(mEl); // as.integer(m)
  if (!b.has("FUN") || b.val("FUN") === null)
    fail(
      ctx,
      "combn: FUN = NULL の結果は行列（simplify = TRUE）またはリスト（simplify = FALSE）になるため未対応です",
    );
  const simplify = b.has("simplify")
    ? asLogicalScalar(ctx, b.val("simplify"))
    : true;
  if (!simplify)
    fail(ctx, "combn: simplify = FALSE はリストを返すため未対応です");
  const funV = H.vec(b.val("FUN"))[0];
  if (typeof funV !== "string") fail(ctx, "'FUN' must be a function or NULL");
  if (!COMBN_FUNS.has(funV))
    fail(
      ctx,
      `combn: FUN として使えるのは文字列で指定した単純な集計のみです："${funV}"`,
    );
  let naRm = false;
  for (const d of b.dots) {
    if (d.name === "na.rm") naRm = asLogicalScalar(ctx, d.value);
    else
      fail(
        ctx,
        `unused argument (${d.name ? d.name + " = " : ""}${H.show(d.value)})`,
      );
  }
  // choose(n, m) を上限チェック付きで数える
  let count = 1;
  const kk = Math.min(m, n - m);
  for (let i = 1; i <= kk; i++) {
    count = (count * (n - kk + i)) / i;
    if (count > 10000) fail(ctx, "ベクトル長の上限です");
  }
  // 組み合わせを辞書順（実 R の combn の列順）に生成する
  const combos = [];
  const cur = [];
  const gen = (start) => {
    if (cur.length === m) {
      combos.push([...cur]);
      return;
    }
    for (let i = start; i < n; i++) {
      cur.push(i);
      gen(i + 1);
      cur.pop();
    }
  };
  gen(0);
  const out = combos.map((idx) =>
    aggApply(ctx, funV, idx.map((i) => els[i]), naRm),
  );
  return H.coerce(out);
}

// ================= glob2rx =================
// 実 R 4.3.3 の glob2rx 本体（gsub の連鎖）をそのまま再現する。
function glob2rxFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["pattern", "trim.head", "trim.tail"]);
  const pattern = b.req("pattern");
  if (isDf(pattern))
    fail(ctx, "glob2rx: データフレームは文字ベクトルに変換できません");
  const trimHead = b.has("trim.head")
    ? asLogicalScalar(ctx, b.val("trim.head"))
    : false;
  const trimTail = b.has("trim.tail")
    ? asLogicalScalar(ctx, b.val("trim.tail"))
    : true;
  if (pattern === null || pattern === undefined) return [];
  const els = H.vec(pattern);
  if (!els.length) return [];
  const conv = (el) => {
    // paste0("^", pattern, "$") の強制（NA は "NA" になる実測 quirk を含む）
    const pat = elemChar(ctx, el);
    let p = "^" + (H.isNA(pat) ? "NA" : pat) + "$";
    p = p.split(".").join("\\.");
    p = p.split("*").join(".*");
    p = p.split("?").join(".");
    p = p.replace(/([^\\])\(/g, "$1\\(");
    p = p.replace(/([^\\])\[/g, "$1\\[");
    p = p.replace(/([^\\])\{/g, "$1\\{");
    if (trimTail) {
      const i = p.indexOf(".*$");
      if (i >= 0) p = p.slice(0, i) + p.slice(i + 3);
    }
    if (trimHead) {
      const i = p.indexOf("^.*");
      if (i >= 0) p = p.slice(0, i) + p.slice(i + 3);
    }
    return p;
  };
  const out = els.map(conv);
  const nm = H.namesOf(pattern);
  return nm ? H.withNames(out, [...nm]) : out;
}

// ================= URLencode／URLdecode =================
const URL_RESERVED = new Set("][!$&'()*+,;=:/?@#".split(""));
const utf8 = new TextEncoder();
const utf8dec = new TextDecoder("utf-8");
function urlEncodeFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["URL", "reserved", "repeated"]);
  const URL = b.req("URL");
  if (isDf(URL)) fail(ctx, "non-character argument");
  const reserved = b.has("reserved")
    ? asLogicalScalar(ctx, b.val("reserved"))
    : false;
  const repeated = b.has("repeated")
    ? asLogicalScalar(ctx, b.val("repeated"))
    : false;
  if (URL === null || URL === undefined) return [];
  const els = H.vec(URL);
  const encChar = (ch) =>
    [...utf8.encode(ch)]
      .map((bb) => "%" + bb.toString(16).toUpperCase().padStart(2, "0"))
      .join("");
  const conv = (el) => {
    if (H.isNA(el)) return "NA"; // 実 R 4.3.3 実測：NA は文字列 "NA" になる
    if (typeof el !== "string") fail(ctx, "non-character argument");
    // repeated = FALSE で %xx を含む文字列は丸ごとそのまま返る（本体実測）
    if (!repeated && /%[0-9A-Fa-f]{2}/.test(el)) return el;
    let out = "";
    for (const ch of el) {
      if (
        /[A-Za-z0-9]/.test(ch) ||
        ch === "." ||
        ch === "_" ||
        ch === "~" ||
        ch === "-" ||
        (!reserved && URL_RESERVED.has(ch))
      )
        out += ch;
      else out += encChar(ch);
    }
    return out;
  };
  return els.map(conv); // vapply(USE.NAMES = FALSE)：名前は付かない
}
function urlDecodeFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["URL"]);
  const URL = b.req("URL");
  if (isDf(URL)) fail(ctx, "argument must be a character vector of length 1");
  if (URL === null || URL === undefined) return [];
  const els = H.vec(URL);
  const conv = (el) => {
    // charToRaw の quirk：NA は "NA" として読まれる（実測）
    const str = H.isNA(el) ? "NA" : el;
    if (typeof str !== "string")
      fail(ctx, "argument must be a character vector of length 1");
    const bytes = [...utf8.encode(str)];
    const out = [];
    let warned = false;
    for (let i = 0; i < bytes.length; ) {
      if (bytes[i] !== 0x25) {
        out.push(bytes[i]);
        i++;
        continue;
      }
      // 実 R 本体のバイト演算そのまま（足りないバイトは 0 として読む）
      const d = [bytes[i + 1] ?? 0, bytes[i + 2] ?? 0].map((c0) => {
        let c = c0;
        if (c > 96) c -= 32;
        if (c > 57) c -= 7;
        return c - 48;
      });
      let val = d[0] * 16 + d[1];
      if (val < 0 || val > 255) {
        if (!warned) {
          warn(ctx, "out-of-range values treated as 0 in coercion to raw");
          warned = true;
        }
        val = 0;
      }
      out.push(val);
      i += 3;
    }
    // rawToChar の規則：末尾の NUL は落ち、途中の NUL はエラー
    let end = out.length;
    while (end > 0 && out[end - 1] === 0) end--;
    const kept = out.slice(0, end);
    if (kept.includes(0)) fail(ctx, "embedded nul in string");
    return utf8dec.decode(new Uint8Array(kept));
  };
  return els.map(conv);
}

// ================= compareVersion =================
// 実 R 4.3.3 の compareVersion 本体（is.na の先行判定＋[.-] 分割＋
// as.integer 比較、要素数が多い方が新しい）をそのまま再現する。
function compareVersionFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["a", "b"]);
  const getOne = (v) => {
    if (v === null || v === undefined)
      fail(ctx, "argument is of length zero");
    if (isDf(v)) fail(ctx, "compareVersion: データフレームは比較できません");
    const els = H.vec(v);
    if (!els.length) fail(ctx, "argument is of length zero");
    if (els.length > 1) fail(ctx, "the condition has length > 1");
    return els[0];
  };
  const aEl = getOne(b.req("a"));
  const bEl = getOne(b.req("b"));
  if (H.isNA(aEl)) return -1;
  if (H.isNA(bEl)) return 1;
  const parse = (el) => {
    const s = elemChar(ctx, el);
    if (s === "") return [];
    const parts = s.split(/[.-]/);
    while (parts.length && parts[parts.length - 1] === "") parts.pop();
    let warned = false;
    return parts.map((t) => {
      const num = t.trim() === "" ? NaN : Number(t);
      if (Number.isNaN(num)) {
        if (!warned) {
          warn(ctx, "NAs introduced by coercion");
          warned = true;
        }
        return H.NA;
      }
      const tr = Math.trunc(num);
      if (Math.abs(tr) > 2147483647) {
        if (!warned) {
          warn(ctx, "NAs introduced by coercion to integer range");
          warned = true;
        }
        return H.NA;
      }
      return tr;
    });
  };
  const A = parse(aEl);
  const B = parse(bEl);
  for (let k = 0; k < A.length; k++) {
    if (k < B.length) {
      if (H.isNA(A[k]) || H.isNA(B[k]))
        fail(ctx, "missing value where TRUE/FALSE needed");
      if (A[k] > B[k]) return 1;
      if (A[k] < B[k]) return -1;
    } else return 1;
  }
  return B.length > A.length ? -1 : 0;
}

// ================= hasName =================
// 実 R 本体：match(name, names(x), nomatch = 0L) > 0L
function hasNameFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "name"]);
  const x = b.req("x");
  const nameV = b.req("name");
  if (nameV === null || nameV === undefined) return [];
  let names = null;
  if (isDf(x)) names = Object.keys(x.columns);
  else if (x !== null && x !== undefined) names = H.namesOf(x);
  const els = H.vec(nameV);
  return els.map((el) => {
    if (names === null) return false;
    if (H.isNA(el)) return names.some((nm) => nm === null || nm === undefined);
    const s = elemChar(ctx, el);
    return names.some((nm) => nm === s);
  });
}

// ================= modifyList =================
// リスト型は値モデルに無いため、データフレーム同士の形だけを再現する
// （実 R でも modifyList(df, df) は data.frame を返す。列の長さ規則と
// 置換エラー文は [[<-.data.frame の実測どおり）。
function modifyListFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "val", "keep.null"]);
  const x = b.req("x");
  const val = b.req("val");
  if (!isDf(x) || !isDf(val))
    fail(
      ctx,
      "modifyList: リスト型を値モデルで表せないため、データフレーム同士の形のみ対応しています",
    );
  if (b.has("keep.null")) asLogicalScalar(ctx, b.val("keep.null"));
  const n = H.dfNrow(x);
  const columns = {};
  for (const [k, col] of Object.entries(x.columns)) columns[k] = [...col];
  for (const [k, col] of Object.entries(val.columns)) {
    if (col.length === n) columns[k] = [...col];
    else if (col.length === 1 && n > 0)
      columns[k] = Array.from({ length: n }, () => col[0]);
    else fail(ctx, `replacement has ${col.length} rows, data has ${n}`);
  }
  const out = { kind: "data.frame", columns };
  if (Array.isArray(x.rowNames)) out.rowNames = [...x.rowNames];
  return out;
}

// ================= type.convert =================
// 実 R 4.3.3 の type.convert.default：まず as.character 化し、
// logical → integer → numeric → complex の順に「全要素が受け入れられる
// 最初の型」を選ぶ（C 実装の規則を公式ヘルプと実測で再現）。
function tcParseNumeric(t, dec) {
  // 戻り値：{ value, lossy } | null（数値定数でない）
  if (/^[+-]?(inf|infinity)$/i.test(t))
    return { value: t.startsWith("-") ? -Infinity : Infinity, lossy: false };
  if (/^[+-]?nan$/i.test(t)) return { value: NaN, lossy: false };
  if (/^[+-]?0x[0-9a-fA-F]+$/.test(t)) {
    const neg = t.startsWith("-");
    const val = parseInt(t.replace(/^[+-]?0x/i, ""), 16);
    return { value: neg ? -val : val, lossy: false };
  }
  const u = dec === "." ? t : t.split(dec).join(".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(u)) return null;
  const value = Number(u);
  let lossy = false;
  if (/^[+-]?\d+$/.test(u)) {
    if (!Number.isFinite(value)) lossy = true;
    else {
      try {
        lossy = BigInt(u) !== BigInt(value);
      } catch {
        lossy = false;
      }
    }
  } else {
    const mant = u.replace(/^[+-]/, "").split(/[eE]/)[0];
    const digits = mant.replace(".", "").replace(/^0+/, "");
    if (digits.length > 17) lossy = true;
  }
  return { value, lossy };
}
function tcIsComplex(t, dec) {
  const num =
    "(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?|inf(?:inity)?|nan";
  const u = dec === "." ? t : t.split(dec).join(".");
  const re = new RegExp(
    `^[+-]?(?:(?:${num})\\s*[+-]\\s*(?:${num})[iI]|(?:${num})[iI])$`,
    "i",
  );
  return re.test(u);
}
function tcConvertColumn(ctx, S, opts) {
  const H = ctx.H;
  const n = S.length;
  if (!n) return [];
  const isMiss = S.map((s) => H.isNA(s) || opts.naStrings.has(s));
  const isBlank = S.map((s) => s === "");
  const valIdx = [];
  S.forEach((s, i) => {
    if (!isMiss[i] && !isBlank[i]) valIdx.push(i);
  });
  const named = (out) =>
    opts.names ? H.withNames(out, [...opts.names]) : out;
  if (!valIdx.length) return named(S.map(() => H.NA)); // 全欠損は logical
  const V = valIdx.map((i) => S[i]);
  if (
    opts.tryLogical &&
    V.every((v) => v === "TRUE" || v === "FALSE" || v === "T" || v === "F")
  )
    return named(
      S.map((s, i) =>
        isMiss[i] || isBlank[i] ? H.NA : s === "TRUE" || s === "T",
      ),
    );
  const intRe = /^[ \t]*[+-]?\d+$/;
  if (V.every((v) => intRe.test(v))) {
    const bigs = V.map((v) => BigInt(v.trim()));
    if (bigs.every((bi) => bi >= -2147483648n && bi <= 2147483647n))
      return named(
        S.map((s, i) =>
          isMiss[i] || isBlank[i] ? H.NA : Number(BigInt(s.trim())),
        ),
      );
    // int32 に収まらない要素がある場合は numeric 判定へ落ちる（実測）
  }
  const numInfos = V.map((v) => tcParseNumeric(v.trim(), opts.dec));
  if (numInfos.every((info) => info !== null)) {
    const lossyAt = numInfos.findIndex((info) => info.lossy);
    if (lossyAt < 0 || opts.numerals !== "no.loss") {
      if (lossyAt >= 0 && opts.numerals === "warn.loss")
        warn(
          ctx,
          `accuracy loss in conversion from "${V[lossyAt]}" to numeric`,
        );
      return named(
        S.map((s, i) =>
          isMiss[i] || isBlank[i]
            ? H.NA
            : tcParseNumeric(s.trim(), opts.dec).value,
        ),
      );
    }
    // numerals = "no.loss" で精度落ちする場合は数値化せず文字列側へ
  } else if (V.every((v) => tcIsComplex(v.trim(), opts.dec))) {
    fail(
      ctx,
      "type.convert: 複素数（complex）への変換は値モデルで表せないため未対応です",
    );
  }
  if (!opts.asIs)
    fail(
      ctx,
      "type.convert: as.is = FALSE では文字列が因子（factor）に変換されますが、因子は値モデルで表せないため未対応です",
    );
  return named(S.map((s, i) => (isMiss[i] ? H.NA : s)));
}
function typeConvertFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(
    ctx,
    ["x", "na.strings", "as.is", "dec", "numerals", "tryLogical"],
    { dots: true },
  );
  const x = b.req("x");
  let numerals = "allow.loss";
  if (b.has("numerals")) {
    const nv = H.vec(b.val("numerals"))[0];
    const choices = ["allow.loss", "warn.loss", "no.loss"];
    const hits =
      typeof nv === "string"
        ? choices.filter((c) => c.startsWith(nv))
        : [];
    if (hits.length !== 1)
      fail(ctx, `'arg' should be one of "allow.loss", "warn.loss", "no.loss"`);
    numerals = hits[0];
  }
  let asIs;
  if (b.has("as.is")) asIs = asLogicalScalar(ctx, b.val("as.is"));
  else {
    // 実 R 4.3.3 の type.convert.default 実測の警告
    warn(ctx, "'as.is' should be specified by the caller; using TRUE");
    asIs = true;
  }
  let dec = ".";
  if (b.has("dec")) {
    const dv = H.vec(b.val("dec"))[0];
    if (typeof dv !== "string" || !dv.length)
      fail(ctx, "type.convert: 'dec' が不正です");
    dec = dv[0];
  }
  let naStrings = ["NA"];
  if (b.has("na.strings")) {
    const nv = b.val("na.strings");
    naStrings =
      nv === null || nv === undefined
        ? []
        : H.vec(nv).map((el) => (H.isNA(el) ? "NA" : elemChar(ctx, el)));
  }
  const tryLogical = b.has("tryLogical")
    ? asLogicalScalar(ctx, b.val("tryLogical"))
    : true;
  const baseOpts = {
    naStrings: new Set(naStrings),
    asIs,
    dec,
    numerals,
    tryLogical,
  };
  const toChars = (els) => els.map((el) => elemChar(ctx, el));
  if (isDf(x)) {
    const columns = {};
    for (const [k, col] of Object.entries(x.columns))
      columns[k] = tcConvertColumn(ctx, toChars(col), {
        ...baseOpts,
        names: H.namesOf(col),
      });
    const out = { kind: "data.frame", columns };
    if (Array.isArray(x.rowNames)) out.rowNames = [...x.rowNames];
    return out;
  }
  if (x === null || x === undefined) return [];
  const els = H.vec(x);
  return tcConvertColumn(ctx, toChars(els), {
    ...baseOpts,
    names: H.namesOf(x),
  });
}

// ================= relist 系 =================
// 値モデルには "relistable" クラス付きオブジェクトが存在し得ない
// （as.relistable 自体が未対応）ため、is.relistable は常に FALSE が忠実。
function isRelistableFn(ctx) {
  const b = bindArgs(ctx, ["x"]);
  b.req("x");
  return false;
}

// ================= strcapture =================
// 実 R 本体：regexec → regmatches → conformToProto（proto 列の class に
// 対応する as.<class> で各列を変換）。proto の型は、列の見本値か、
// data.frame(...) を直接渡した場合はその AST から判定する（長さ0の列は
// 値モデルでは型を持てないため）。
const POSIX_CLASSES = {
  alnum: "A-Za-z0-9",
  alpha: "A-Za-z",
  blank: " \\t",
  cntrl: "\\x00-\\x1F\\x7F",
  digit: "0-9",
  graph: "\\x21-\\x7E",
  lower: "a-z",
  print: "\\x20-\\x7E",
  punct: "!\"#$%&'()*+,\\-./:;<=>?@\\[\\\\\\]^_`{|}~",
  space: "\\s",
  upper: "A-Z",
  xdigit: "A-Fa-f0-9",
};
function translatePattern(ctx, pat) {
  const out = pat.replace(/\[:([a-z]+):\]/g, (m, name) => {
    if (!Object.hasOwn(POSIX_CLASSES, name))
      fail(ctx, `strcapture: POSIX 文字クラス [[:${name}:]] は未対応です`);
    return POSIX_CLASSES[name];
  });
  if (/\[\..*?\.\]|\[=.*?=\]/.test(out))
    fail(ctx, "strcapture: POSIX 照合要素・等価クラスは未対応です");
  return out;
}
function countCaptureGroups(pat) {
  let count = 0;
  let inClass = false;
  for (let i = 0; i < pat.length; i++) {
    const ch = pat[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (inClass) {
      if (ch === "]") inClass = false;
      continue;
    }
    if (ch === "[") inClass = true;
    else if (ch === "(" && pat[i + 1] !== "?") count++;
  }
  return count;
}
function protoAstClass(node) {
  if (!node || typeof node !== "object") return null;
  if (node.k === "literal") {
    if (typeof node.value === "string") return "character";
    if (typeof node.value === "number") return "numeric";
    if (typeof node.value === "boolean") return "logical";
    return null;
  }
  if (node.k === "call") {
    const t = node.target?.k === "var" ? node.target.name : null;
    if (!t) return null;
    if (t === "character") return "character";
    if (t === "integer") return "integer";
    if (t === "numeric" || t === "double") return "numeric";
    if (t === "logical") return "logical";
    if (t === "factor") return "factor";
    if (t === "as.Date" || t === "as.POSIXct" || t === "as.POSIXlt")
      return "Date";
    if (t === "c" && node.args?.length) return protoAstClass(node.args[0]);
  }
  return null;
}
function strcaptureFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["pattern", "x", "proto", "perl", "useBytes"], {});
  const patternV = b.req("pattern");
  const xV = b.req("x");
  const proto = b.req("proto");
  if (b.has("useBytes") && asLogicalScalar(ctx, b.val("useBytes")))
    fail(ctx, "strcapture: useBytes = TRUE は未対応です");
  if (b.has("perl")) asLogicalScalar(ctx, b.val("perl"));
  if (!isDf(proto))
    fail(
      ctx,
      "strcapture: proto はデータフレームで指定してください（リストは値モデルで表せません）",
    );
  const patEl = patternV === null || patternV === undefined ? undefined : H.vec(patternV)[0];
  if (typeof patEl !== "string")
    fail(ctx, "strcapture: 'pattern' が文字列ではありません");
  // proto 列の class 判定
  const protoNode = b.nodeOf("proto");
  const astClasses = {};
  if (protoNode?.k === "call" && protoNode.target?.name === "data.frame") {
    for (const a of protoNode.args ?? [])
      if (a.argName) astClasses[a.argName] = protoAstClass(a);
  }
  const keys = Object.keys(proto.columns);
  const classes = keys.map((k) => {
    const col = proto.columns[k];
    for (const el of col) {
      if (H.isNA(el)) continue;
      if (typeof el === "string") return "character";
      if (typeof el === "boolean") return "logical";
      if (typeof el === "number") return "numeric";
    }
    const ac = astClasses[k];
    if (ac) return ac;
    fail(
      ctx,
      `strcapture: proto の列 "${k}" の型が値モデルでは判別できません（data.frame(${k} = character(), ...) の形で直接渡すか、型の分かる見本値を含めてください）`,
    );
  });
  for (const cl of classes)
    if (cl === "factor" || cl === "Date")
      fail(
        ctx,
        `strcapture: proto の列の型 "${cl}" は値モデルで表せないため未対応です`,
      );
  const jsPat = translatePattern(ctx, patEl);
  let re;
  try {
    re = new RegExp(jsPat);
  } catch {
    fail(ctx, `strcapture: 正規表現を解釈できません：${patEl}`);
  }
  const groups = countCaptureGroups(jsPat);
  const xEls =
    xV === null || xV === undefined ? [] : isDf(xV) ? [undefined] : H.vec(xV);
  const columns = {};
  keys.forEach((k) => (columns[k] = []));
  let anyMatch = false;
  const convertToken = (cl, tok) => {
    if (tok === null) return H.NA;
    if (cl === "character") return tok;
    if (cl === "logical") {
      if (["TRUE", "True", "true", "T"].includes(tok)) return true;
      if (["FALSE", "False", "false", "F"].includes(tok)) return false;
      return H.NA;
    }
    const t = tok.trim();
    if (t === "") return H.NA;
    const num = Number(t);
    if (Number.isNaN(num)) return H.NA;
    return cl === "integer" ? Math.trunc(num) : num;
  };
  let coerced = false;
  for (const el of xEls) {
    if (el === undefined || isDf(el))
      fail(ctx, "strcapture: 'x' は文字ベクトルで指定してください");
    const str = H.isNA(el) ? null : elemChar(ctx, el);
    const m = str === null ? null : re.exec(str);
    if (!m) {
      keys.forEach((k) => columns[k].push(H.NA));
      continue;
    }
    anyMatch = true;
    keys.forEach((k, j) => {
      const tok = m[j + 1] === undefined ? "" : m[j + 1];
      const cl = classes[j];
      if (
        (cl === "integer" || cl === "numeric") &&
        tok !== "" &&
        Number.isNaN(Number(tok.trim()))
      )
        coerced = true;
      columns[k].push(convertToken(cl, tok));
    });
  }
  if (anyMatch && groups !== keys.length)
    fail(ctx, "The number of captures in 'pattern' != 'length(proto)'");
  if (coerced) warn(ctx, "NAs introduced by coercion");
  return { kind: "data.frame", columns };
}

// ================= stack =================
// stack.data.frame の再現（ind 列は因子ではなく列名の文字列になる点が
// 値モデルの限界。caution と報告書に明記）。
function stackFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "select", "drop"], { dots: true });
  const x = b.req("x");
  if (!isDf(x))
    fail(
      ctx,
      "stack: リストは値モデルで表せないため、データフレームのみ対応しています",
    );
  if (b.has("drop")) asLogicalScalar(ctx, b.val("drop"));
  const keys = Object.keys(x.columns);
  let sel = keys;
  if (b.has("select")) {
    const sv = b.val("select");
    if (sv === null || sv === undefined)
      fail(ctx, "stack: 'select' が不正です");
    const sEls = H.vec(sv);
    if (!sEls.length) sel = [];
    else if (sEls.every((e) => typeof e === "string")) {
      for (const nm of sEls)
        if (!keys.includes(nm)) fail(ctx, "undefined columns selected");
      if (new Set(sEls).size !== sEls.length)
        fail(ctx, "stack: 同じ列の重複選択は未対応です");
      sel = [...sEls];
    } else if (sEls.every((e) => typeof e === "boolean")) {
      if (!sEls.length || keys.length % sEls.length !== 0)
        fail(ctx, "stack: 論理値の 'select' の長さが列数と合いません");
      sel = keys.filter((_, i) => sEls[i % sEls.length]);
    } else if (sEls.every((e) => typeof e === "number" && !H.isMissing(e))) {
      const hasNeg = sEls.some((e) => e < 0);
      const hasPos = sEls.some((e) => e > 0);
      if (hasNeg && hasPos)
        fail(ctx, "only 0's may be mixed with negative subscripts");
      if (hasPos) {
        sel = sEls
          .filter((e) => e !== 0)
          .map((e) => {
            const k = keys[Math.trunc(e) - 1];
            if (k === undefined) fail(ctx, "undefined columns selected");
            return k;
          });
        if (new Set(sel).size !== sel.length)
          fail(ctx, "stack: 同じ列の重複選択は未対応です");
      } else {
        const dropIdx = new Set(
          sEls.filter((e) => e < 0).map((e) => Math.trunc(-e)),
        );
        sel = keys.filter((_, i) => !dropIdx.has(i + 1));
      }
    } else
      fail(
        ctx,
        "stack: 'select' は列名・位置・論理値のベクトルで指定してください（式による選択は未対応です）",
      );
  }
  if (!sel.length) fail(ctx, "no vector columns were selected");
  const values = [];
  const ind = [];
  for (const k of sel)
    for (const el of x.columns[k]) {
      values.push(el);
      ind.push(k);
    }
  return {
    kind: "data.frame",
    columns: { values: H.coerce(values), ind },
  };
}

export const builtins = new Map([
  ["head", headTailFn(true)],
  ["tail", headTailFn(false)],
  ["combn", combnFn],
  ["glob2rx", glob2rxFn],
  ["URLencode", urlEncodeFn],
  ["URLdecode", urlDecodeFn],
  ["compareVersion", compareVersionFn],
  ["hasName", hasNameFn],
  ["modifyList", modifyListFn],
  ["type.convert", typeConvertFn],
  ["type.convert.default", typeConvertFn],
  ["is.relistable", isRelistableFn],
  ["strcapture", strcaptureFn],
  ["stack", stackFn],
]);
