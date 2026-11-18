// 高度モード B4：R 高度関数グループ「残余の純粋関数」（高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 意味論は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3 の実測、
// および R 本体のソース（pretty.c／各関数の R ソース印字）で裁定した
// （報告書 docs/audit/ADV-B4-r-eng4.md に根拠を記録）。
// 値モデルで忠実に表せない形（リストを返す形・整形済み表など）は
// 実装せず、名指しで停止する。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}

// ---- 引数照合（SPEC 第4章：matchArgs の規則＝完全一致→部分一致→位置を
// 手作業で再現する。nameOnly は `...` の後ろにある仮引数＝名前でのみ指定可、
// 部分一致の対象にもならない。matchArgs 本体は部分一致を行わないため、
// 数値班（functions-advanced-math.js）の bindArgs と同じ方針で補う）
function bindArgs(ctx, formals, opts = {}) {
  const { args, vals, api, node, H } = ctx;
  const dots = !!opts.dots;
  const nameOnly = new Set(opts.nameOnly ?? []);
  const positional = formals.filter((f) => !nameOnly.has(f));
  const result = new Map();
  const dotList = [];
  const showV = (v) => H.show(v);
  const unusedFail = (a, v) =>
    api.fail(
      a.argName
        ? `unused argument (${a.argName} = ${showV(v)})`
        : `unused argument (${showV(v)})`,
      node,
    );
  const used = new Set();
  // 1) 完全一致（nameOnly を含む）。重複は実 R どおり multiple matched。
  args.forEach((a, i) => {
    if (a.argName && formals.includes(a.argName)) {
      if (result.has(a.argName))
        api.fail(
          `formal argument "${a.argName}" matched by multiple actual arguments`,
          node,
        );
      result.set(a.argName, { present: true, value: vals[i] });
      used.add(i);
    }
  });
  // 2) 部分一致（位置で埋められる仮引数のみ）。
  args.forEach((a, i) => {
    if (used.has(i) || !a.argName) return;
    const cand = positional.filter((f) => f.startsWith(a.argName));
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
  // 3) 位置による割り当て。
  let fi = 0;
  args.forEach((a, i) => {
    if (used.has(i) || a.argName) return;
    while (fi < positional.length && result.has(positional[fi])) fi++;
    if (fi < positional.length) {
      result.set(positional[fi], { present: true, value: vals[i] });
      used.add(i);
      fi++;
    }
  });
  // 4) 余りは `...` へ、無ければ unused argument で停止。
  args.forEach((a, i) => {
    if (used.has(i)) return;
    if (dots) dotList.push({ name: a.argName ?? null, value: vals[i] });
    else unusedFail(a, vals[i]);
  });
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

// ---- match 系の等値キー（数値班 matchHandler の matchKey と同一規則：
// NA と NaN を区別し、型タグ付きで照合する。呼び出し側で H.coerce 済みの
// 要素列に対して使う）
function matchKey(H, v) {
  if (H.isNA(v)) return "\nNA";
  if (H.isNaNVal(v)) return "\nNaN";
  if (typeof v === "string") return "s:" + v;
  if (typeof v === "boolean") return "b:" + v;
  return "n:" + v;
}

// ---- round の中核（数値班 roundCore と同一アルゴリズム：R の fround の
// 再現。zapsmall が内部で round を使うため複製する）
function logbOf(x) {
  // C の logb：指数部（2の冪の指数）。x は正の有限値。
  if (x === 0) return -Infinity;
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const exp = ((buf.getUint32(0) >> 20) & 0x7ff) - 1023;
  return exp;
}
function rint(v) {
  // 偶数丸め（C の rint、近傍偶数）。
  if (!Number.isFinite(v)) return v;
  const f = Math.floor(v);
  const diff = v - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}
function roundCore(v, digitsRaw) {
  if (Number.isNaN(v) || Number.isNaN(digitsRaw)) return NaN;
  if (!Number.isFinite(v)) return v;
  if (digitsRaw > 323 || v === 0) return v;
  if (digitsRaw < -308) return 0;
  if (digitsRaw === 0) return rint(v);
  const dig = Math.floor(digitsRaw + 0.5);
  let sgn = 1;
  let x = v;
  if (x < 0) {
    sgn = -1;
    x = -x;
  }
  const l10x = 0.3010299956639812 * (0.5 + logbOf(x));
  if (l10x + dig > 15) return v;
  let pow10, x10, i10, xd, xu;
  if (dig <= 308) {
    pow10 = 10 ** dig;
    x10 = x * pow10;
    i10 = Math.floor(x10);
    xd = i10 / pow10;
    xu = Math.ceil(x10) / pow10;
  } else {
    const e10 = dig - 308;
    const p10 = 10 ** e10;
    pow10 = 10 ** 308;
    x10 = x * pow10 * p10;
    i10 = Math.floor(x10);
    xd = i10 / pow10 / p10;
    xu = Math.ceil(x10) / pow10 / p10;
  }
  const du = xu - x;
  const dd = x - xd;
  return sgn * (du < dd || (i10 % 2 === 1 && du === dd) ? xu : xd);
}
// signif の中核（数値班 signifCore と同一：10進15有効桁に対する偶数丸め）。
function signifCore(v, d) {
  if (v === 0 || !Number.isFinite(v) || Number.isNaN(v)) return v;
  const m = /^(-?)(\d)\.(\d{14})e([+-]\d+)$/.exec(v.toExponential(14));
  if (!m) return v;
  const sign = m[1] === "-" ? -1 : 1;
  let digits = (m[2] + m[3]).split("").map(Number);
  const exp10 = parseInt(m[4], 10);
  if (d < digits.length) {
    const rest = digits.slice(d);
    const head = digits.slice(0, d);
    let up = false;
    if (rest[0] > 5) up = true;
    else if (rest[0] === 5) {
      if (rest.slice(1).some((x) => x !== 0)) up = true;
      else up = head[d - 1] % 2 === 1;
    }
    if (up) {
      let i = d - 1;
      while (i >= 0 && head[i] === 9) {
        head[i] = 0;
        i--;
      }
      if (i < 0) {
        head.unshift(1);
        head.length = d;
        return sign * Number(head.join("") + "e" + (exp10 - d + 2));
      }
      head[i]++;
    }
    digits = head;
  }
  return sign * Number(digits.join("") + "e" + (exp10 - d + 1));
}

// ---- 文字列→論理値の解釈（as.logical の規則："TRUE"/"True"/"true"/"T" 等）
function parseLogicalString(s) {
  if (["TRUE", "T", "True", "true"].includes(s)) return true;
  if (["FALSE", "F", "False", "false"].includes(s)) return false;
  return undefined; // 解釈不能 → NA
}
// 要素1つの論理値解釈（as.logical 相当。解釈不能・欠損は undefined=NA）。
function asLogicalElem(H, el) {
  if (H.isNA(el) || H.isNaNVal(el)) return undefined;
  if (typeof el === "boolean") return el;
  if (typeof el === "number") return el !== 0;
  if (typeof el === "string") return parseLogicalString(el);
  return undefined;
}

// ============================================================
// Logic 系：all／any／xor／isTRUE／isFALSE
// ============================================================

// all／any の na.rm 解釈。実 R 4.3.3 実測：do_summary の C 実装は
// asLogical の NA（NA_LOGICAL＝INT_MIN、0でない）を真として扱うため、
// na.rm = NA／長さ0／解釈不能文字列は「TRUE 相当」になる（実測で確認）。
// 長さ2以上は "'length = N' in coercion to 'logical(1)'" で停止する。
function naRmQuirk(ctx, v) {
  const H = ctx.H;
  if (v === null || v === undefined) return true; // NULL → NA_LOGICAL → 真
  const els = H.vec(v);
  if (els.length > 1)
    fail(ctx, `'length = ${els.length}' in coercion to 'logical(1)'`);
  if (!els.length) return true;
  const r = asLogicalElem(H, els[0]);
  return r === undefined ? true : r;
}

function allAnyHandler(isAll) {
  const fname = isAll ? "all" : "any";
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["na.rm"], { dots: true, nameOnly: ["na.rm"] });
    const naRm = b.has("na.rm") ? naRmQuirk(ctx, b.val("na.rm")) : false;
    // データ引数を要素列へ平坦化する（データフレームは列の連結＝リストの
    // unlist 相当。実 R でも all(df) は列要素全体で判定する）。
    let hasFalse = false,
      hasTrue = false,
      hasNA = false;
    for (const d of b.dots) {
      const v = d.value;
      // 型強制の警告（実 R：長さ0の引数では出ない。非論理型の引数ごとに1回）
      let warnType = null;
      let els;
      if (isDf(v)) {
        els = Object.values(v.columns).flat();
        if (els.length && els.some((e) => !H.isNA(e) && typeof e !== "boolean"))
          warnType = "list";
      } else {
        els = v === null ? [] : H.vec(v);
        if (els.length) {
          if (els.some((e) => typeof e === "string")) warnType = "character";
          else if (els.some((e) => typeof e === "number")) warnType = "double";
        }
      }
      if (warnType)
        warn(ctx, `coercing argument of type '${warnType}' to logical`);
      for (const el of els) {
        const r = asLogicalElem(H, el);
        if (r === undefined) hasNA = true;
        else if (r) hasTrue = true;
        else hasFalse = true;
      }
    }
    if (naRm) hasNA = false;
    if (isAll) {
      if (hasFalse) return false;
      if (hasNA) return H.NA;
      return true;
    }
    if (hasTrue) return true;
    if (hasNA) return H.NA;
    return false;
  };
}

function xorHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "y"]);
  const x = b.req("x");
  const y = b.req("y");
  if (isDf(x) || isDf(y))
    fail(ctx, "xor はデータフレームに対応していません");
  const toLog = (v) => {
    if (v === null) return [];
    return H.vec(v).map((el) => {
      if (typeof el === "string")
        fail(ctx, "operations are possible only for numeric, logical or complex types");
      return asLogicalElem(H, el); // undefined = NA
    });
  };
  const a = toLog(x),
    bb = toLog(y);
  const n = Math.max(a.length, bb.length);
  if (!a.length || !bb.length) return [];
  if (n % Math.min(a.length, bb.length) !== 0)
    warn(
      ctx,
      "longer object length is not a multiple of shorter object length",
    );
  const out = Array.from({ length: n }, (_, i) => {
    const p = a[i % a.length],
      q = bb[i % bb.length];
    if (p === undefined || q === undefined) return H.NA;
    return p !== q;
  });
  const names =
    a.length === n && H.namesOf(x)
      ? H.namesOf(x)
      : bb.length === n && H.namesOf(y)
        ? H.namesOf(y)
        : null;
  return H.withNames(out, names);
}

function isTrueFalseHandler(wantTrue) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["x"]);
    const x = b.req("x");
    if (isDf(x) || x === null) return false;
    const els = H.vec(x);
    if (els.length !== 1) return false;
    const el = els[0];
    if (typeof el !== "boolean") return false;
    return wantTrue ? el : !el;
  };
}

// ============================================================
// is.finite／is.infinite／is.nan
// ============================================================
function isFiniteFamily(kind) {
  const fname = "is." + kind;
  return (ctx) => {
    const H = ctx.H;
    if (ctx.args.length > 1)
      fail(
        ctx,
        `${ctx.args.length} arguments passed to '${fname}' which requires 1`,
      );
    const b = bindArgs(ctx, ["x"]);
    const x = b.req("x");
    if (isDf(x)) fail(ctx, "default method not implemented for type 'list'");
    const els = x === null ? [] : H.vec(x);
    const out = els.map((el) => {
      if (typeof el === "number" && !Number.isNaN(el)) {
        if (kind === "finite") return Number.isFinite(el);
        if (kind === "infinite") return !Number.isFinite(el);
        return false; // is.nan
      }
      if (H.isNaNVal(el)) return kind === "nan";
      // NA・論理値・文字列：is.finite(TRUE)=TRUE のみ。他は全て FALSE
      // （実 R 4.3.3 実測：is.finite("a")=FALSE、is.nan(NA)=FALSE 等）。
      if (kind === "finite" && typeof el === "boolean") return true;
      return false;
    });
    return H.withNames(out, H.namesOf(x));
  };
}

// ============================================================
// sets 系：union／intersect／setdiff／setequal／is.element
// 実 R の R ソース（sets.R）そのままの構成：as.vector（名前を落とす）→
// c の型統一（match の照合は共通型で行う。NA と NaN は区別される）。
// ============================================================
function setArgs(ctx, fname) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "y"]);
  const x = b.req("x");
  const y = b.req("y");
  if (isDf(x) || isDf(y))
    fail(ctx, `${fname} はデータフレームに対応していません（as.vector がリストを返すため）`);
  return {
    xEls: x === null ? null : H.vec(x).slice(),
    yEls: y === null ? null : H.vec(y).slice(),
  };
}
function unionHandler(ctx) {
  const H = ctx.H;
  const { xEls, yEls } = setArgs(ctx, "union");
  if (xEls === null && yEls === null) return null;
  const joined = H.coerce([...(xEls ?? []), ...(yEls ?? [])]);
  const seen = new Set();
  const out = [];
  for (const el of joined) {
    const k = matchKey(H, el);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(el);
    }
  }
  return out;
}
function intersectHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "y"]);
  const x = b.req("x");
  const y = b.req("y");
  if (x === null || y === null) return null; // ソース冒頭の is.null 早期 return
  if (isDf(x) || isDf(y))
    fail(ctx, "intersect はデータフレームに対応していません（as.vector がリストを返すため）");
  const xEls = H.vec(x),
    yEls = H.vec(y);
  const joined = H.coerce([...xEls, ...yEls]);
  const jx = joined.slice(0, xEls.length);
  const yKeys = new Set(joined.slice(xEls.length).map((v) => matchKey(H, v)));
  const seen = new Set();
  const out = [];
  for (const el of jx) {
    const k = matchKey(H, el);
    if (seen.has(k)) continue;
    seen.add(k);
    if (yKeys.has(k)) out.push(el);
  }
  return out;
}
function setdiffHandler(ctx) {
  const H = ctx.H;
  const { xEls, yEls } = setArgs(ctx, "setdiff");
  const x = xEls ?? [];
  const y = yEls ?? [];
  // 返却値は x 自身の要素（型は x のまま）。照合だけ共通型で行う。
  const joined = H.coerce([...x, ...y]);
  const yKeys = new Set(joined.slice(x.length).map((v) => matchKey(H, v)));
  const selfKeys = H.coerce(x.slice()).map((v) => matchKey(H, v));
  const seen = new Set();
  const out = [];
  x.forEach((el, i) => {
    const dk = selfKeys[i];
    if (seen.has(dk)) return;
    seen.add(dk);
    if (!yKeys.has(matchKey(H, joined[i]))) out.push(el);
  });
  return out;
}
function setequalHandler(ctx) {
  const H = ctx.H;
  const { xEls, yEls } = setArgs(ctx, "setequal");
  const x = xEls ?? [];
  const y = yEls ?? [];
  const joined = H.coerce([...x, ...y]);
  const xKeys = new Set(joined.slice(0, x.length).map((v) => matchKey(H, v)));
  const yKeys = new Set(joined.slice(x.length).map((v) => matchKey(H, v)));
  for (const k of xKeys) if (!yKeys.has(k)) return false;
  for (const k of yKeys) if (!xKeys.has(k)) return false;
  return true;
}
function isElementHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["el", "set"]);
  const el = b.req("el");
  const set = b.req("set");
  if (isDf(el) || isDf(set))
    fail(ctx, "is.element はデータフレームに対応していません（as.vector がリストを返すため）");
  const elEls = el === null ? [] : H.vec(el);
  const setEls = set === null ? [] : H.vec(set);
  const joined = H.coerce([...elEls, ...setEls]);
  const setKeys = new Set(joined.slice(elEls.length).map((v) => matchKey(H, v)));
  return joined.slice(0, elEls.length).map((v) => setKeys.has(matchKey(H, v)));
}

// ============================================================
// rep.int／rep_len（rep 本体は基礎層。いずれも実 R では名前を落とす）
// ============================================================
function parseCountElem(ctx, el, errMsg, state) {
  const H = ctx.H;
  if (H.isNA(el) || H.isNaNVal(el)) fail(ctx, errMsg);
  if (typeof el === "number") return el;
  if (typeof el === "boolean") return el ? 1 : 0;
  if (typeof el === "string") {
    const t = el.trim();
    const n = t === "" ? NaN : Number(t);
    if (Number.isNaN(n)) {
      state.coerced = true;
      fail(ctx, errMsg);
    }
    return n;
  }
  fail(ctx, errMsg);
}
function repIntHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "times"]);
  const x = b.req("x");
  const times = b.req("times");
  if (isDf(x)) fail(ctx, "rep.int はデータフレームに対応していません");
  if (x === null) fail(ctx, "unimplemented type 'NULL' in 'rep3'");
  const els = H.vec(x);
  if (times === null) fail(ctx, "invalid 'times' value");
  const tEls = H.vec(times);
  if (!tEls.length) fail(ctx, "invalid 'times' value");
  const state = {};
  const counts = tEls.map((el) => {
    const n = parseCountElem(ctx, el, "invalid 'times' value", state);
    const t = Math.trunc(n);
    if (!Number.isFinite(t) || t < 0) fail(ctx, "invalid 'times' value");
    return t;
  });
  // 監査裁定（ADV-B4-audit-r）：スカラー times は「ベクトル全体を times 回
  // 繰り返す」（実 R 4.3.3 実測 rep.int(c(1,2), 2) == c(1,2,1,2)）。
  // 要素ごとの回数になるのは times が x と同じ長さのベクトルのときだけ。
  // 従来実装はスカラーを要素ごと回数として扱い誤値を返していたため是正。
  if (counts.length === 1) {
    const total = els.length * counts[0];
    if (total > 10000) fail(ctx, "ベクトル長の上限です");
    const out = [];
    for (let j = 0; j < counts[0]; j++) out.push(...els);
    return out;
  }
  if (counts.length !== els.length) fail(ctx, "invalid 'times' value");
  const per = counts;
  const total = per.reduce((p, q) => p + q, 0);
  if (total > 10000) fail(ctx, "ベクトル長の上限です");
  const out = [];
  els.forEach((el, i) => {
    for (let j = 0; j < per[i]; j++) out.push(el);
  });
  return out;
}
function repLenHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "length.out"]);
  const x = b.req("x");
  const lo = b.req("length.out");
  if (isDf(x)) fail(ctx, "rep_len はデータフレームに対応していません");
  if (lo === null) fail(ctx, "invalid 'length.out' value");
  const loEls = H.vec(lo);
  if (loEls.length !== 1) fail(ctx, "invalid 'length.out' value");
  const state = {};
  const nRaw = parseCountElem(ctx, loEls[0], "invalid 'length.out' value", state);
  const n = Math.trunc(nRaw);
  if (!Number.isFinite(n) || n < 0) fail(ctx, "invalid 'length.out' value");
  if (x === null) {
    if (n === 0) return null;
    fail(ctx, "cannot replicate NULL to a non-zero length");
  }
  if (n > 10000) fail(ctx, "ベクトル長の上限です");
  const els = H.vec(x);
  if (!els.length) return Array.from({ length: n }, () => H.NA);
  return Array.from({ length: n }, (_, i) => els[i % els.length]);
}

// ============================================================
// replace（x[list] <- values の部分代入そのもの）／unname
// ============================================================
function replaceHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "list", "values"]);
  const x = b.req("x");
  const list = b.req("list");
  const values = b.req("values");
  if (isDf(x)) fail(ctx, "replace はデータフレームに対応していません（リスト部分代入のため）");
  if (isDf(list) || isDf(values))
    fail(ctx, "replace の list／values にデータフレームは指定できません");
  const valEls0 = values === null ? [] : H.vec(values);
  if (!valEls0.length) fail(ctx, "replacement has length zero");
  const xEls0 = x === null ? [] : H.vec(x).slice();
  // 型統一は x と values の合併に対する強制（部分代入の規則）。
  const joined = H.coerce([...xEls0, ...valEls0]);
  const xEls = joined.slice(0, xEls0.length);
  const valEls = joined.slice(xEls0.length);
  let names = H.namesOf(x) ? H.namesOf(x).slice() : null;
  const ensureNames = () => {
    if (!names) names = xEls.map(() => "");
    while (names.length < xEls.length) names.push("");
  };
  if (list === null) return H.withNames(xEls, names);
  const idx = H.vec(list);
  if (!idx.length) return H.withNames(xEls, names);
  // 添字の様式決定：文字列があれば名前添字、真偽のみなら論理添字、
  // それ以外は数値添字（論理値は c() の強制どおり 1／0 として扱う）。
  const hasStr = idx.some((e) => typeof e === "string");
  const hasNum = idx.some((e) => typeof e === "number" && !H.isNaNVal(e));
  let targets = []; // {pos（0始まり、拡張可）, name（新規追加時の名前）}
  if (hasStr) {
    const pending = new Map(); // 今回追加される名前 → 位置
    for (const e of idx) {
      if (H.isNA(e)) continue; // NA 添字は部分代入では黙って飛ばされる（実測）
      const key =
        typeof e === "string"
          ? e
          : typeof e === "number"
            ? H.formatRNum(e)
            : typeof e === "boolean"
              ? e
                ? "TRUE"
                : "FALSE"
              : String(e);
      const at = names ? names.indexOf(key) : -1;
      if (at >= 0) targets.push({ pos: at });
      else if (pending.has(key)) targets.push({ pos: pending.get(key) });
      else {
        const pos = xEls.length + pending.size;
        pending.set(key, pos);
        targets.push({ pos, name: key, append: true });
      }
    }
  } else if (!hasNum && idx.some((e) => typeof e === "boolean" || H.isNA(e))) {
    const n = Math.max(xEls.length, idx.length);
    for (let i = 0; i < n; i++) {
      const f = idx[i % idx.length];
      if (H.isNA(f) || H.isNaNVal(f)) continue;
      if (f === true) targets.push({ pos: i });
    }
  } else {
    const nums = idx.map((e) => {
      if (H.isNA(e) || H.isNaNVal(e)) return null;
      if (typeof e === "boolean") return e ? 1 : 0;
      if (typeof e === "number") return Math.trunc(e);
      return null;
    });
    const hasPos = nums.some((v) => v !== null && v > 0);
    const hasNeg = nums.some((v) => v !== null && v < 0);
    if (hasPos && hasNeg)
      fail(ctx, "only 0's may be mixed with negative subscripts");
    if (hasNeg) {
      const omit = new Set(nums.filter((v) => v !== null && v < 0).map((v) => -v));
      for (let i = 0; i < xEls.length; i++)
        if (!omit.has(i + 1)) targets.push({ pos: i });
    } else {
      for (const v of nums) {
        if (v === null || v === 0) continue;
        targets.push({ pos: v - 1 });
      }
    }
  }
  if (targets.length && targets.length % valEls.length !== 0)
    warn(ctx, "number of items to replace is not a multiple of replacement length");
  targets.forEach((t, i) => {
    const v = valEls[i % valEls.length];
    if (t.append) {
      ensureNames();
      while (xEls.length < t.pos) {
        xEls.push(H.NA);
        names.push("");
      }
      xEls.push(v);
      names.push(t.name);
    } else {
      while (xEls.length <= t.pos) {
        xEls.push(H.NA);
        if (names) names.push("");
      }
      xEls[t.pos] = v;
    }
  });
  if (names) while (names.length < xEls.length) names.push("");
  return H.withNames(xEls, names);
}

function unnameHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["obj", "force"]);
  const obj = b.req("obj");
  if (isDf(obj)) {
    const force =
      b.has("force") && asLogicalElem(H, H.vec(b.val("force"))[0]) === true;
    if (force) fail(ctx, "invalid 'dimnames' given for data frame");
    fail(
      ctx,
      "unname はデータフレームに対応していません（列名のないデータフレームはこのモデルで表せません）",
    );
  }
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.slice();
  return obj;
}

// ============================================================
// pretty（R 本体 src/appl/pretty.c の R_pretty を忠実に移植し、
// pretty.default ラッパの後処理まで再現する）
// ============================================================
const DBL_EPSILON = 2.220446049250313e-16;
const DBL_MIN = 2.2250738585072014e-308;
const DBL_MAX = 1.7976931348623157e308;
// C の %g（有効数字6桁）相当の簡易整形。警告文言用。
const fmtG = (v) => (v === 0 ? "0" : String(Number(v.toPrecision(6))));
function rPretty(ctx, lo0, up0, ndiv, minN, shrink, h, h5, fMin, epsCorrection) {
  let lo = lo0,
    up = up0;
  const lo_ = lo0,
    up_ = up0,
    dx = up_ - lo_;
  let cell, iSmall;
  if (dx === 0 && up_ === 0) {
    cell = 1;
    iSmall = true;
  } else {
    cell = Math.max(Math.abs(lo_), Math.abs(up_));
    let U = 1 + (h5 >= 1.5 * h + 0.5 ? 1 / (1 + h) : 1.5 / (1 + h5));
    U *= Math.max(1, ndiv) * DBL_EPSILON;
    iSmall = dx < cell * U * 3;
  }
  if (iSmall) {
    if (cell > 10) cell = 9 + cell / 10;
    cell *= shrink;
    if (minN > 1) cell /= minN;
  } else {
    cell = dx;
    if (Number.isFinite(dx)) {
      if (ndiv > 1) cell /= ndiv;
    } else {
      if (ndiv < 2)
        warn(ctx, `R_pretty(): infinite range; *ndiv=${ndiv}, should have ndiv >= 2`);
      else cell = up_ / ndiv - lo_ / ndiv;
    }
  }
  let subsmall = fMin * DBL_MIN;
  if (subsmall === 0) subsmall = DBL_MIN;
  if (cell < subsmall) {
    // R 4.3.3 では cell の正負によらず警告する（文言は "corrected to"）
    warn(ctx, `R_pretty(): very small range 'cell'=${fmtG(cell)}, corrected to ${fmtG(subsmall)}`);
    cell = subsmall;
  } else if (cell > DBL_MAX / 1.25) {
    warn(ctx, `R_pretty(): very large range 'cell'=${fmtG(cell)}, corrected to ${fmtG(DBL_MAX / 1.25)}`);
    cell = DBL_MAX / 1.25;
  }
  const base = Math.pow(10, Math.floor(Math.log10(cell)));
  let unit = base;
  {
    let U;
    if ((U = 2 * base) - cell < h * (cell - unit)) {
      unit = U;
      if ((U = 5 * base) - cell < h5 * (cell - unit)) {
        unit = U;
        if ((U = 10 * base) - cell < h * (cell - unit)) unit = U;
      }
    }
  }
  const RE = 1e-10; // rounding_eps
  let ns = Math.floor(lo_ / unit + RE),
    nu = Math.ceil(up_ / unit - RE);
  if (epsCorrection && (epsCorrection > 1 || !iSmall)) {
    // R 4.3.3 の pretty.c（trunk では符号の扱いが変更されている。
    // 4.3.3 では lo は符号によらず (1-E) 倍、up は (1+E) 倍、
    // 0 の場合は ∓DBL_MIN／±DBL_MIN になる）
    if (lo_ !== 0) lo *= 1 - DBL_EPSILON;
    else lo = -DBL_MIN;
    if (up_ !== 0) up *= 1 + DBL_EPSILON;
    else up = DBL_MIN;
  }
  while (ns * unit > lo + RE * unit) ns--;
  while (!Number.isFinite(ns * unit)) ns++;
  while (nu * unit < up - RE * unit) nu++;
  while (!Number.isFinite(nu * unit)) nu--;
  let k = Math.trunc(0.5 + nu - ns);
  let nOut;
  if (k < minN) {
    k = minN - k;
    if (lo_ === 0 && ns === 0 && up_ !== 0) nu += k;
    else if (up_ === 0 && nu === 0 && lo_ !== 0) ns -= k;
    else if (ns >= 0) {
      nu += Math.trunc(k / 2);
      ns -= Math.trunc(k / 2) + (k % 2);
    } else {
      ns -= Math.trunc(k / 2);
      nu += Math.trunc(k / 2) + (k % 2);
    }
    nOut = minN;
  } else nOut = k;
  if (ns * unit < lo) lo = ns * unit;
  if (nu * unit > up) up = nu * unit;
  return { l: lo, u: up, n: nOut };
}

function prettyHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(
    ctx,
    ["x", "n", "min.n", "shrink.sml", "high.u.bias", "u5.bias", "eps.correct", "f.min"],
    { dots: true },
  );
  const x = b.req("x");
  if (x === null) return null; // 実 R 4.3.3 実測：pretty(NULL) は NULL
  if (isDf(x)) fail(ctx, "'list' object cannot be coerced to type 'double'");
  // x <- x[is.finite(x <- as.numeric(x))]
  let coercedNA = false;
  const nums = [];
  for (const el of H.vec(x)) {
    let v;
    if (H.isNA(el)) v = NaN;
    else if (typeof el === "number") v = el;
    else if (typeof el === "boolean") v = el ? 1 : 0;
    else {
      const t = String(el).trim();
      v = t === "" ? NaN : Number(t);
      if (Number.isNaN(v) && t !== "NaN") coercedNA = true;
    }
    if (Number.isFinite(v)) nums.push(v);
  }
  if (coercedNA) warn(ctx, "NAs introduced by coercion");
  if (!nums.length) return [];
  // 引数の検証は .Internal(pretty)（do_pretty）の規則。n／min.n は
  // asInteger（切り捨て）、検証順は実測の文言どおり。
  const firstEl = (v) => {
    if (v === null || v === undefined) return undefined;
    const els = H.vec(v);
    return els.length ? els[0] : undefined;
  };
  const asIntArg = (v) => {
    const el = firstEl(v);
    if (el === undefined || H.isNA(el) || H.isNaNVal(el)) return NaN;
    if (typeof el === "number") return Math.trunc(el);
    if (typeof el === "boolean") return el ? 1 : 0;
    if (typeof el === "string") {
      const t = el.trim();
      return t === "" ? NaN : Math.trunc(Number(t));
    }
    return NaN;
  };
  const asNumArg = (v) => {
    const el = firstEl(v);
    if (el === undefined || H.isNA(el)) return NaN;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    if (typeof el === "string") {
      const t = el.trim();
      return t === "" ? NaN : Number(t);
    }
    return NaN;
  };
  const nRaw = b.has("n") ? b.val("n") : 5;
  // min.n の既定値は n %/% 3（ラッパの R コードで評価されるため、
  // n が文字列だと "non-numeric argument to binary operator" になる）。
  if (!b.has("min.n") && typeof firstEl(nRaw) === "string")
    fail(ctx, "non-numeric argument to binary operator");
  const n = b.has("n") ? asIntArg(nRaw) : 5;
  if (Number.isNaN(n) || n < 0) fail(ctx, "invalid 'n' argument");
  const minN = b.has("min.n") ? asIntArg(b.val("min.n")) : Math.trunc(n / 3);
  if (Number.isNaN(minN) || minN < 0 || minN > n)
    fail(ctx, "invalid 'min.n' argument");
  const shrink = b.has("shrink.sml") ? asNumArg(b.val("shrink.sml")) : 0.75;
  if (!Number.isFinite(shrink) || shrink <= 0)
    fail(ctx, "invalid 'shrink.sml' argument");
  const h = b.has("high.u.bias") ? asNumArg(b.val("high.u.bias")) : 1.5;
  if (!Number.isFinite(h) || h < 0) fail(ctx, "invalid 'high.u.bias' argument");
  const h5 = b.has("u5.bias") ? asNumArg(b.val("u5.bias")) : 0.5 + 1.5 * h;
  if (!Number.isFinite(h5) || h5 < 0) fail(ctx, "invalid 'u5.bias' argument");
  const eps = b.has("eps.correct") ? asIntArg(b.val("eps.correct")) : 0;
  if (!(eps === 0 || eps === 1 || eps === 2))
    fail(ctx, "'eps.correct' must be 0, 1, or 2");
  const fMin = b.has("f.min") ? asNumArg(b.val("f.min")) : 2 ** -20;
  const lo = Math.min(...nums),
    up = Math.max(...nums);
  const z = rPretty(ctx, lo, up, n, minN, shrink, h, h5, fMin, eps);
  // s <- seq.int(z$l, z$u, length.out = n + 1)
  // seq.c の生成規則：両端は from／to そのものに固定され、内側だけが
  // rfrom + i * rby（rby = (rto - rfrom) / (length.out - 1)）で作られる。
  // 素朴に l + i * step で末尾まで作ると末端が 1ulp ずれる（実測で確認）。
  let s;
  if (z.n === 0) s = [z.l];
  else {
    s = new Array(z.n + 1);
    s[0] = z.l;
    s[z.n] = z.u;
    if (z.n > 1) {
      const rby = (z.u - z.l) / z.n;
      for (let i = 1; i < z.n; i++) s[i] = z.l + i * rby;
    }
  }
  if (!eps && z.n) {
    const delta = z.u / z.n - z.l / z.n; // diff(range(l, u)/n)
    s = s.map((v) => (Math.abs(v) < 1e-14 * delta ? 0 : v));
  }
  return s;
}

// ============================================================
// zapsmall（R 4.3.3 の R ソースそのまま。参照宣言にある mFUN／min.d は
// R-devel の新引数で 4.3.3 には無く、unused argument で停止する＝申し送り）
// ============================================================
function zapsmallHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "digits"]);
  const x = b.req("x");
  // digits の解釈：length 0 は "invalid 'digits'"。文字列は
  // digits - log10(mx) の減算で "non-numeric argument to binary operator"。
  let digitsVec = null; // null = 既定（getOption("digits") = 7）
  if (b.has("digits")) {
    const dv = b.val("digits");
    if (dv === null) fail(ctx, "invalid 'digits'");
    const els = H.vec(dv);
    if (!els.length) fail(ctx, "invalid 'digits'");
    digitsVec = els.map((el) => {
      if (typeof el === "string")
        fail(ctx, "non-numeric argument to binary operator");
      if (H.isNA(el) || H.isNaNVal(el)) return NaN;
      if (typeof el === "boolean") return el ? 1 : 0;
      return el;
    });
  }
  const dig = digitsVec ?? [7];
  const zapVec = (els) => {
    // els: 数値化済み（NA は H.NA、NaN は NaN）
    if (els.every((e) => H.isNA(e) || H.isNaNVal(e))) return els.slice();
    const mx = Math.max(...els.filter((e) => !H.isNA(e) && !H.isNaNVal(e)).map(Math.abs));
    let eff; // 要素ごとの digits
    if (mx > 0) {
      const scalar = Math.max(0, ...dig.map((d) => d - Math.log10(mx)));
      eff = els.map(() => scalar);
    } else eff = els.map((_, i) => dig[i % dig.length]);
    return els.map((e, i) => {
      if (H.isNA(e)) return H.NA;
      if (H.isNaNVal(e)) return NaN;
      if (Number.isNaN(eff[i])) return H.NA;
      return roundCore(e, eff[i]);
    });
  };
  if (isDf(x)) {
    const cols = Object.entries(x.columns);
    for (const [, col] of cols)
      for (const el of col)
        if (typeof el === "string")
          fail(ctx, "non-numeric argument to mathematical function");
    const flat = [];
    for (const [, col] of cols)
      for (const el of col)
        flat.push(H.isNA(el) ? H.NA : typeof el === "boolean" ? (el ? 1 : 0) : el);
    const zapped = zapVec(flat);
    const outCols = {};
    let k = 0;
    for (const [name, col] of cols) {
      outCols[name] = zapped.slice(k, k + col.length);
      k += col.length;
    }
    return {
      kind: "data.frame",
      columns: outCols,
      ...(x.rowNames ? { rowNames: x.rowNames } : {}),
    };
  }
  if (x === null) return null;
  const els = H.vec(x).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "string")
      fail(ctx, "non-numeric argument to mathematical function");
    if (typeof el === "boolean") return el ? 1 : 0;
    return el;
  });
  return H.withNames(zapVec(els), H.namesOf(x));
}

// ============================================================
// sign（Math グループ総称関数。データフレームは列ごと、
// 文字列列は "non-numeric-alike variable(s) in data frame: ..."）
// ============================================================
function signHandler(ctx) {
  const H = ctx.H;
  if (ctx.args.length !== 1)
    fail(ctx, `${ctx.args.length} arguments passed to 'sign' which requires 1`);
  const b = bindArgs(ctx, ["x"]);
  const x = b.req("x");
  const signEl = (el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "string")
      fail(ctx, "non-numeric argument to mathematical function");
    const v = typeof el === "boolean" ? (el ? 1 : 0) : el;
    if (Number.isNaN(v)) return NaN;
    return v === 0 ? 0 : v > 0 ? 1 : -1;
  };
  if (isDf(x)) {
    const bad = Object.entries(x.columns)
      .filter(([, col]) => col.some((el) => typeof el === "string"))
      .map(([k]) => k);
    if (bad.length)
      fail(ctx, `non-numeric-alike variable(s) in data frame: ${bad.join(", ")}`);
    const outCols = {};
    for (const [k, col] of Object.entries(x.columns)) outCols[k] = col.map(signEl);
    return {
      kind: "data.frame",
      columns: outCols,
      ...(x.rowNames ? { rowNames: x.rowNames } : {}),
    };
  }
  const els = x === null ? [] : H.vec(x);
  return H.withNames(els.map(signEl), H.namesOf(x));
}

// ============================================================
// basename／dirname／file.path
// ============================================================
function pathArg(ctx, fname) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["path"]);
  const path = b.req("path");
  if (isDf(path) || path === null)
    fail(ctx, "a character vector argument expected");
  const els = H.vec(path);
  for (const el of els)
    if (!H.isNA(el) && typeof el !== "string")
      fail(ctx, "a character vector argument expected");
  return els;
}
function basenameHandler(ctx) {
  const H = ctx.H;
  const els = pathArg(ctx, "basename");
  return els.map((el) => {
    if (H.isNA(el)) return H.NA;
    const t = el.replace(/\/+$/, "");
    if (t === "") return "";
    const i = t.lastIndexOf("/");
    return i < 0 ? t : t.slice(i + 1);
  });
}
function dirnameHandler(ctx) {
  const H = ctx.H;
  const els = pathArg(ctx, "dirname");
  return els.map((el) => {
    if (H.isNA(el)) return H.NA;
    if (el === "") return "";
    const q = el.endsWith("/") ? el.slice(0, -1) : el;
    if (q === "") return "/";
    const i = q.lastIndexOf("/");
    if (i < 0) return ".";
    const head = q.slice(0, i).replace(/\/+$/, "");
    return head === "" ? "/" : head;
  });
}
function filePathHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["fsep"], { dots: true, nameOnly: ["fsep"] });
  const toStr = (el) => {
    if (H.isNA(el)) return "NA"; // 実測：file.path("a", NA) は "a/NA"
    if (typeof el === "string") return el;
    if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
    if (typeof el === "number") return H.formatRNum(el);
    return String(el);
  };
  let fsep = "/";
  if (b.has("fsep")) {
    const fv = b.val("fsep");
    if (fv !== null && fv !== undefined) {
      const els = H.vec(fv);
      if (els.length) fsep = toStr(els[0]);
    }
  }
  const comps = [];
  for (const d of b.dots) {
    if (isDf(d.value)) fail(ctx, "file.path はデータフレームに対応していません");
    if (d.value === null) return [];
    comps.push(H.vec(d.value).map(toStr));
  }
  if (!comps.length) return [];
  if (comps.some((c) => !c.length)) return [];
  const L = Math.max(...comps.map((c) => c.length));
  return Array.from({ length: L }, (_, i) =>
    comps.map((c) => c[i % c.length]).join(fsep),
  );
}

// ============================================================
// char.expand（R ソースそのまま：charmatch の規則。
// 一意な前方一致→その要素、曖昧→character(0)、無一致→nomatch 評価）
// ============================================================
function charExpandHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["input", "target", "nomatch"]);
  const input = b.req("input");
  const target = b.req("target");
  const inEls = input === null ? [] : isDf(input) ? [input] : H.vec(input);
  if (inEls.length !== 1) fail(ctx, "'input' must have length 1");
  const inEl = inEls[0];
  const tEls = target === null || isDf(target) ? null : H.vec(target);
  if (
    typeof inEl !== "string" ||
    tEls === null ||
    tEls.some((e) => !H.isNA(e) && typeof e !== "string")
  )
    fail(ctx, "'input' and 'target' must be character vectors");
  // charmatch：完全一致が一意ならそれ、無ければ前方一致で裁定。
  // 完全一致の重複・前方一致の複数は「曖昧」で 0 を返す。
  let matchIdx = -1; // -1 = 無一致（nomatch 行き）, -2 = 曖昧
  if (!H.isNA(inEl)) {
    const exact = [];
    tEls.forEach((t, i) => {
      if (!H.isNA(t) && t === inEl) exact.push(i);
    });
    if (exact.length === 1) matchIdx = exact[0];
    else if (exact.length > 1) matchIdx = -2;
    else {
      const pref = [];
      tEls.forEach((t, i) => {
        if (!H.isNA(t) && t.startsWith(inEl)) pref.push(i);
      });
      if (pref.length === 1) matchIdx = pref[0];
      else if (pref.length > 1) matchIdx = -2;
    }
  }
  if (matchIdx === -2) return []; // character(0)
  if (matchIdx < 0) {
    // 無一致：nomatch を評価する（既定は stop("no match")）。
    // 値が返る形（nomatch = NA 等）では target[NA] = NA_character_。
    if (!b.has("nomatch")) fail(ctx, "no match");
    return H.NA;
  }
  return [tEls[matchIdx]];
}

// ============================================================
// validUTF8／validEnc（.Internal：文字ベクトルのみ受理し、
// NA は TRUE を返す（実 R 4.3.3 実測）。モデル内の文字列は JS 文字列
// なので、孤立サロゲートの有無で UTF-8 符号化可能性を判定する）
// ============================================================
function isWellFormedStr(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = s.charCodeAt(i + 1);
      if (!(n >= 0xdc00 && n <= 0xdfff)) return false;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) return false;
  }
  return true;
}
function validHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x"]);
  const x = b.req("x");
  if (isDf(x) || x === null) fail(ctx, "invalid 'x' argument");
  const els = H.vec(x);
  return els.map((el) => {
    if (H.isNA(el)) return true;
    if (typeof el !== "string") fail(ctx, "invalid 'x' argument");
    return isWellFormedStr(el);
  });
}

// ============================================================
// 監査裁定で新規実装（ADV-B4-audit-r）：bitw 系／anyNA／
// digamma・trigamma・psigamma／match.arg。
// いずれも実 R 4.3.3 とのグリッド照合で意味論・精度を検証済み
// （報告書に方法と件数を記録）。anyMissing は base R に存在しない
// 関数名のため実装しない（項目側を未対応に裁定）。
// ============================================================
// ---- bitw 系（32ビット整数のビット演算。実 R の型規則：
// 数値（integer/double）同士のみ受理し、型が違えば
// "'a' and 'b' must have the same type"、logical／character は
// "unimplemented type '<型>' in '<関数>'" で停止する。
// 整数化は切り捨て＋範囲外（|x| > 2^31-1）は NA＋警告。
// 結果が -2^31（NA_integer_ のビットパターン）になる演算は NA。
// リサイクリングは警告なし（実 R 4.3.3 実測）。
// 値モデルの NA は型を持たないため、裸の NA は数値 NA として扱う
// （論理 NA と数値の組み合わせで実 R が型不一致エラーにする形は
// 再現できない。報告書に残存として記録）。
function bitwTag(ctx, v, fname) {
  const H = ctx.H;
  if (isDf(v)) fail(ctx, `unimplemented type 'list' in '${fname}'`);
  if (v === null) fail(ctx, `unimplemented type 'NULL' in '${fname}'`);
  if (!Array.isArray(v)) {
    if (H.isNA(v)) return { tag: "numeric", els: [v] };
    if (typeof v === "boolean") return { tag: "logical", els: [v] };
    if (typeof v === "string") return { tag: "character", els: [v] };
    return { tag: "numeric", els: [v] };
  }
  const els = H.vec(v);
  let tag = "numeric";
  if (els.length && els.every((e) => typeof e === "boolean")) tag = "logical";
  else if (els.length && els.every((e) => typeof e === "string")) tag = "character";
  else if (els.some((e) => typeof e === "string"))
    fail(ctx, `unimplemented type 'character' in '${fname}'`);
  else if (els.some((e) => typeof e === "boolean") && els.some((e) => typeof e === "number"))
    fail(ctx, "'a' and 'b' must have the same type");
  return { tag, els };
}
function bitwToInt(ctx, els, state) {
  const H = ctx.H;
  return els.map((el) => {
    if (H.isNA(el) || H.isNaNVal(el)) return H.NA;
    const t = Math.trunc(el);
    if (!Number.isFinite(t) || t > 2147483647 || t < -2147483647) {
      state.range = true;
      return H.NA;
    }
    return t;
  });
}
function bitwResult(v) {
  // -2^31 は NA_integer_ のビットパターンであり、値としては NA。
  return v === -2147483648 ? null : v;
}
function bitwBinary(fname, op) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["a", "b"]);
    const va = bitwTag(ctx, b.req("a"), fname);
    const vb = bitwTag(ctx, b.req("b"), fname);
    if (va.tag !== vb.tag) fail(ctx, "'a' and 'b' must have the same type");
    if (va.tag !== "numeric")
      fail(ctx, `unimplemented type '${va.tag}' in '${fname}'`);
    const state = { range: false };
    const a = bitwToInt(ctx, va.els, state);
    const c = bitwToInt(ctx, vb.els, state);
    if (state.range) warn(ctx, "NAs introduced by coercion to integer range");
    if (!a.length || !c.length) return [];
    const n = Math.max(a.length, c.length);
    const NA = H.NA;
    return Array.from({ length: n }, (_, i) => {
      const u = a[i % a.length], w = c[i % c.length];
      if (H.isNA(u) || H.isNA(w)) return NA;
      const r = bitwResult(op(u, w));
      return r === null ? NA : r;
    });
  };
}
function bitwNotHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["a"]);
  const va = bitwTag(ctx, b.req("a"), "bitwNot");
  if (va.tag !== "numeric")
    fail(ctx, `unimplemented type '${va.tag}' in 'bitwNot'`);
  const state = { range: false };
  const a = bitwToInt(ctx, va.els, state);
  if (state.range) warn(ctx, "NAs introduced by coercion to integer range");
  return a.map((u) => {
    if (H.isNA(u)) return H.NA;
    const r = bitwResult(~u);
    return r === null ? H.NA : r;
  });
}
function bitwShift(isLeft) {
  const fname = isLeft ? "bitwShiftL" : "bitwShiftR";
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["a", "n"]);
    const va = bitwTag(ctx, b.req("a"), fname);
    const vn = bitwTag(ctx, b.req("n"), fname);
    if (va.tag !== vn.tag) fail(ctx, "'a' and 'b' must have the same type");
    if (va.tag !== "numeric")
      fail(ctx, `unimplemented type '${va.tag}' in '${fname}'`);
    const state = { range: false };
    const a = bitwToInt(ctx, va.els, state);
    const ns = bitwToInt(ctx, vn.els, state);
    if (state.range) warn(ctx, "NAs introduced by coercion to integer range");
    if (!a.length || !ns.length) return [];
    const n = Math.max(a.length, ns.length);
    return Array.from({ length: n }, (_, i) => {
      const u = a[i % a.length], sh = ns[i % ns.length];
      if (H.isNA(u) || H.isNA(sh)) return H.NA;
      if (sh < 0 || sh > 31) return H.NA;
      if (isLeft) {
        const r = bitwResult(u << sh);
        return r === null ? H.NA : r;
      }
      // 右シフトは符号なし（実 R 実測：bitwShiftR(-1, 1) == 2^31-1）。
      return sh === 0 ? u : u >>> sh;
    });
  };
}
// ---- anyNA（x に NA／NaN が1つでもあるか。データフレームは全列を見る）
function anyNAHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "recursive"]);
  const x = b.req("x");
  if (isDf(x))
    return Object.values(x.columns).some((col) =>
      col.some((el) => H.isNA(el) || H.isNaNVal(el)),
    );
  if (x === null) return false;
  return H.vec(x).some((el) => H.isNA(el) || H.isNaNVal(el));
}
// ---- digamma／trigamma／psigamma（ポリガンマ関数）
// 実装：漸化式で引数を 12 以上へ移し、digamma は Bernoulli 数による
// 漸近展開、m>=1 は Hurwitz ゼータの Euler–Maclaurin 展開で評価する。
// 実 R 4.3.3 とのグリッド照合（m=0..6 × x 17点＋負値・境界）で
// 最大相対誤差 5.8e-15（報告書参照）。負の非整数は漸化式のまま
// （0 を跨がない）で正側へ移す。0・負の整数（極）では、
// deriv が奇数なら Inf、偶数（0含む）なら NaN＋警告（実 R 実測）。
const PSI_B = [1 / 6, -1 / 30, 1 / 42, -1 / 30, 5 / 66, -691 / 2730, 7 / 6, -3617 / 510];
function psiFactorial(m) {
  let r = 1;
  for (let i = 2; i <= m; i++) r *= i;
  return r;
}
function digammaCore(x) {
  let acc = 0, t = x;
  while (t < 12) { acc -= 1 / t; t += 1; }
  let v = Math.log(t) - 1 / (2 * t);
  let tpow = t * t;
  for (let j = 1; j <= 8; j++) { v -= PSI_B[j - 1] / (2 * j * tpow); tpow *= t * t; }
  return acc + v;
}
function polygammaCore(m, x) {
  if (m === 0) return digammaCore(x);
  const fm = psiFactorial(m);
  let shift = 0, t = x;
  while (t < 12) { shift += fm / Math.pow(t, m + 1); t += 1; }
  const s = m + 1;
  let z = Math.pow(t, 1 - s) / (s - 1) + Math.pow(t, -s) / 2;
  let poch = s;
  for (let j = 1; j <= 8; j++) {
    if (j > 1) poch *= (s + 2 * j - 3) * (s + 2 * j - 2);
    z += (PSI_B[j - 1] * poch / psiFactorial(2 * j)) * Math.pow(t, -s - 2 * j + 1);
  }
  const psiT = (m % 2 === 1 ? 1 : -1) * fm * z;
  return psiT - (m % 2 === 0 ? 1 : -1) * shift;
}
function psiOne(ctx, v, m, flags) {
  const H = ctx.H;
  if (H.isNA(v)) return H.NA;
  if (Number.isNaN(v)) return NaN;
  if (v === Infinity) return m === 0 ? Infinity : 0;
  if (v === -Infinity) { flags.nan = true; return NaN; }
  if (Number.isInteger(v) && v <= 0) {
    if (m % 2 === 1) return Infinity;
    flags.nan = true;
    return NaN;
  }
  return polygammaCore(m, v);
}
function psiNumericEls(ctx, v, fname) {
  const H = ctx.H;
  if (isDf(v)) fail(ctx, "データフレームはこの関数の対象外です");
  if (v === null) return [];
  return H.vec(v).map((el) => {
    if (H.isNA(el)) return el;
    if (typeof el === "string")
      fail(ctx, "non-numeric argument to mathematical function");
    if (typeof el === "boolean") return el ? 1 : 0;
    return el;
  });
}
function digammaLike(mFixed) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["x"]);
    const x = b.req("x");
    const els = psiNumericEls(ctx, x, ctx.name);
    const flags = { nan: false };
    const out = els.map((el) => psiOne(ctx, el, mFixed, flags));
    if (flags.nan) warn(ctx, "NaNが生成されました（NaNs produced）");
    return H.withNames(out, H.namesOf(x));
  };
}
function psigammaHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "deriv"]);
  const x = b.req("x");
  const els = psiNumericEls(ctx, x, "psigamma");
  let derivEls = [0];
  if (b.has("deriv")) {
    const dv = b.val("deriv");
    if (isDf(dv)) fail(ctx, "non-numeric argument to mathematical function");
    derivEls = (dv === null ? [] : H.vec(dv)).map((el) => {
      if (H.isNA(el)) return el;
      if (typeof el === "string")
        fail(ctx, "non-numeric argument to mathematical function");
      if (typeof el === "boolean") return el ? 1 : 0;
      return el;
    });
  }
  if (!els.length || !derivEls.length) return [];
  const n = Math.max(els.length, derivEls.length);
  const flags = { nan: false };
  let derivOver = null;
  const out = Array.from({ length: n }, (_, i) => {
    const xv = els[i % els.length], dv = derivEls[i % derivEls.length];
    if (H.isNA(dv)) return H.NA;
    if (Number.isNaN(dv)) { flags.nan = true; return NaN; }
    const m = Math.trunc(dv);
    if (m < 0) { flags.nan = true; return NaN; }
    // 実 R の psigamma は deriv の上限が 100（n_max）。超過は NaN＋警告
    // 「deriv = <値> > 100 (= n_max)」（R 4.3.3 実測）。
    if (m > 100) {
      if (derivOver === null) derivOver = m;
      flags.nan = true;
      return NaN;
    }
    return psiOne(ctx, xv, m, flags);
  });
  if (derivOver !== null) warn(ctx, `deriv = ${derivOver} > 100 (= n_max)`);
  if (flags.nan) warn(ctx, "NaNが生成されました（NaNs produced）");
  return H.withNames(out, H.namesOf(x));
}
// ---- match.arg（候補への前方一致。R 4.3.3 の R ソースと実測で裁定：
// arg=NULL は choices[1]、非文字列は "'arg' must be NULL or a character
// vector"、several.ok=FALSE で長さ>1 は choices と完全一致のときだけ
// 先頭を返し、それ以外は "'arg' must be of length 1"、一致なし・
// 曖昧・長さ0 は "'arg' should be one of ..." で停止する）
function matchArgHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["arg", "choices", "several.ok"]);
  const choicesRaw = b.req("choices");
  if (isDf(choicesRaw)) fail(ctx, "'choices' must be a character vector");
  const toChar = (el) => {
    if (H.isNA(el)) return el;
    if (typeof el === "string") return el;
    if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
    if (typeof el === "number") return H.formatRNum(el);
    return String(el);
  };
  const choices = (choicesRaw === null ? [] : H.vec(choicesRaw)).map(toChar);
  const severalOk = b.has("several.ok")
    ? (() => {
        const v = b.val("several.ok");
        const el = v === null ? undefined : H.vec(v)[0];
        if (el === undefined || H.isNA(el))
          fail(ctx, "missing value where TRUE/FALSE needed");
        if (typeof el === "boolean") return el;
        if (typeof el === "number") return el !== 0;
        fail(ctx, "argument is not interpretable as logical");
      })()
    : false;
  const argRaw = b.req("arg");
  if (argRaw === null) {
    if (!choices.length) fail(ctx, "'choices' must be of length >= 1");
    return [choices[0]];
  }
  if (isDf(argRaw)) fail(ctx, "'arg' must be NULL or a character vector");
  const argElsRaw = H.vec(argRaw);
  if (argElsRaw.some((el) => !H.isNA(el) && typeof el !== "string"))
    fail(ctx, "'arg' must be NULL or a character vector");
  const argEls = argElsRaw.map((el) => (H.isNA(el) ? el : el));
  const shouldBe = () =>
    fail(ctx, `'arg' should be one of ${choices.map((c) => (H.isNA(c) ? "NA" : `"${c}"`)).join(", ")}`);
  if (!argEls.length) shouldBe();
  if (!severalOk && argEls.length > 1) {
    const identical =
      argEls.length === choices.length &&
      argEls.every((el, i) => el === choices[i]);
    if (identical) return [argEls[0]];
    fail(ctx, "'arg' must be of length 1");
  }
  const matchOne = (el) => {
    if (H.isNA(el)) shouldBe();
    for (let j = 0; j < choices.length; j++)
      if (!H.isNA(choices[j]) && choices[j] === el) return choices[j];
    const cand = [];
    for (let j = 0; j < choices.length; j++)
      if (!H.isNA(choices[j]) && choices[j].length > el.length && choices[j].startsWith(el))
        cand.push(choices[j]);
    const uniq = [...new Set(cand)];
    if (uniq.length === 1) return uniq[0];
    shouldBe();
  };
  const picked = argEls.map(matchOne);
  return severalOk ? picked : [picked[0]];
}

// ============================================================
// summary（summary.default のうち値モデルで表せる範囲：
// 数値・論理・文字列ベクトルと NULL。データフレームの整形表と
// リスト要約は表せないため名指しで停止する）
// ============================================================
function quantileType7(sorted, p) {
  const n = sorted.length;
  const index = 1 + (n - 1) * p;
  const lo = Math.floor(index),
    hi = Math.ceil(index);
  const qs = sorted[lo - 1];
  if (index > lo && sorted[hi - 1] !== qs) {
    const h = index - lo;
    return (1 - h) * qs + h * sorted[hi - 1];
  }
  return qs;
}
function quantileGeneral(sorted, p, type) {
  // stats:::quantile.default の type 1〜6／8／9 の分岐をそのまま写す。
  const n = sorted.length;
  const EPS = 2.220446049250313e-16;
  if (type <= 3) {
    const nppm = type === 3 ? n * p - 0.5 : n * p;
    const j = Math.floor(nppm);
    let h;
    if (type === 1) h = nppm > j ? 1 : 0;
    else if (type === 2) h = ((nppm > j ? 1 : 0) + 1) / 2;
    else h = nppm !== j || ((j % 2) + 2) % 2 === 1 ? 1 : 0; // R の %% は床剰余
    // x <- c(x[1], x[1], x, x[n], x[n]) した 1 始まり添字で引く
    const X = (idx) => sorted[Math.min(n, Math.max(1, idx)) - 1];
    let qs = X(j); // X[j + 2]（ずらし分を引いた sorted 添字は j）
    if (h === 1) qs = X(j + 1);
    else if (h > 0 && h < 1 && X(j) !== X(j + 1)) qs = (1 - h) * X(j) + h * X(j + 1);
    return qs;
  }
  let a, bb;
  if (type === 4) { a = 0; bb = 1; }
  else if (type === 5) { a = 0.5; bb = 0.5; }
  else if (type === 6) { a = 0; bb = 0; }
  else if (type === 8) { a = 1 / 3; bb = 1 / 3; }
  else { a = 3 / 8; bb = 3 / 8; } // type 9
  const fuzz = 4 * EPS;
  const nppm = a + p * (n + 1 - a - bb);
  const j = Math.floor(nppm + fuzz);
  let h = nppm - j;
  if (Math.abs(h) < fuzz) h = 0;
  const X = (idx) => sorted[Math.min(n, Math.max(1, idx)) - 1];
  let qs = X(j);
  if (h === 1) qs = X(j + 1);
  else if (h > 0 && h < 1 && X(j) !== X(j + 1)) qs = (1 - h) * X(j) + h * X(j + 1);
  return qs;
}
function compensatedSum(nums) {
  let sum = 0,
    c = 0;
  for (const v of nums) {
    const t = sum + v;
    if (Number.isFinite(t)) {
      if (Math.abs(sum) >= Math.abs(v)) c += sum - t + v;
      else c += v - t + sum;
    }
    sum = t;
  }
  return sum + c;
}
function summaryHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["object", "digits", "quantile.type"], {
    dots: true,
    nameOnly: ["digits", "quantile.type"],
  });
  const object = b.req("object");
  if (isDf(object))
    fail(
      ctx,
      "summary はデータフレームに対応していません（列ごとの整形表はこのモデルで表せません）",
    );
  if (object === null)
    return H.withNames(["0", "NULL", "NULL"], ["Length", "Class", "Mode"]);
  const els = H.vec(object);
  const hasStr = els.some((e) => typeof e === "string");
  const hasNum = els.some((e) => typeof e === "number");
  if (hasStr && !els.every((e) => typeof e === "string" || H.isNA(e)))
    fail(ctx, "summary は混合型ベクトルに対応していません");
  if (hasStr)
    return H.withNames(
      [String(els.length), "character", "character"],
      ["Length", "Class", "Mode"],
    );
  if (!els.length || hasNum || els.some((e) => typeof e === "number")) {
    // ---- 数値ベクトル（summary.default の数値分岐）
    let qtype = 7;
    if (b.has("quantile.type")) {
      const qv = b.val("quantile.type");
      const el = qv === null ? undefined : H.vec(qv)[0];
      const qn =
        typeof el === "number" ? el : typeof el === "boolean" ? (el ? 1 : 0) : NaN;
      if (!Number.isInteger(qn) || qn < 1 || qn > 9)
        fail(ctx, "'quantile.type' must be an integer between 1 and 9");
      qtype = qn;
    }
    const numsAll = els.map((e) =>
      H.isNA(e) ? H.NA : typeof e === "boolean" ? (e ? 1 : 0) : e,
    );
    const nas = numsAll.filter((e) => H.isNA(e) || H.isNaNVal(e)).length;
    const vals = numsAll.filter((e) => !H.isNA(e) && !H.isNaNVal(e));
    const sorted = vals.slice().sort((p, q) => p - q);
    const probs = [0, 0.25, 0.5, 0.75, 1];
    let stats;
    if (!sorted.length) stats = [H.NA, H.NA, H.NA, NaN, H.NA, H.NA];
    else {
      const qs = probs.map((p) =>
        qtype === 7 ? quantileType7(sorted, p) : quantileGeneral(sorted, p, qtype),
      );
      const mean = compensatedSum(sorted) / sorted.length;
      stats = [qs[0], qs[1], qs[2], mean, qs[3], qs[4]];
    }
    if (b.has("digits")) {
      const dv = b.val("digits");
      const el = dv === null ? undefined : H.vec(dv)[0];
      const dn =
        el === undefined || H.isNA(el)
          ? NaN
          : typeof el === "number"
            ? el
            : typeof el === "boolean"
              ? el ? 1 : 0
              : typeof el === "string" && el.trim() !== "" && !Number.isNaN(Number(el))
                ? Number(el)
                : NaN;
      if (Number.isNaN(dn)) stats = stats.map((v) => (H.isNA(v) ? H.NA : NaN));
      else {
        const dc = Math.min(22, Math.max(1, Math.trunc(dn)));
        stats = stats.map((v) => (H.isNA(v) ? H.NA : signifCore(v, dc)));
      }
    }
    const names = ["Min.", "1st Qu.", "Median", "Mean", "3rd Qu.", "Max."];
    if (nas > 0) {
      stats = [...stats, nas];
      names.push("NA's");
    }
    return H.withNames(stats, names);
  }
  // ---- 論理ベクトル（table(object, exclude = NULL) の要約）
  const counts = { FALSE: 0, TRUE: 0, NA: 0 };
  for (const e of els) {
    if (H.isNA(e) || H.isNaNVal(e)) counts.NA++;
    else if (e === true) counts.TRUE++;
    else if (e === false) counts.FALSE++;
  }
  const vals = ["logical"];
  const names = ["Mode"];
  if (counts.FALSE > 0) {
    vals.push(String(counts.FALSE));
    names.push("FALSE");
  }
  if (counts.TRUE > 0) {
    vals.push(String(counts.TRUE));
    names.push("TRUE");
  }
  if (counts.NA > 0) {
    vals.push(String(counts.NA));
    names.push("NA's");
  }
  return H.withNames(vals, names);
}

// ============================================================
export const builtins = new Map([
  ["all", allAnyHandler(true)],
  ["any", allAnyHandler(false)],
  ["xor", xorHandler],
  ["isTRUE", isTrueFalseHandler(true)],
  ["isFALSE", isTrueFalseHandler(false)],
  ["is.finite", isFiniteFamily("finite")],
  ["is.infinite", isFiniteFamily("infinite")],
  ["is.nan", isFiniteFamily("nan")],
  ["union", unionHandler],
  ["intersect", intersectHandler],
  ["setdiff", setdiffHandler],
  ["setequal", setequalHandler],
  ["is.element", isElementHandler],
  ["rep.int", repIntHandler],
  ["rep_len", repLenHandler],
  ["replace", replaceHandler],
  ["unname", unnameHandler],
  ["pretty", prettyHandler],
  ["zapsmall", zapsmallHandler],
  ["sign", signHandler],
  ["basename", basenameHandler],
  ["dirname", dirnameHandler],
  ["file.path", filePathHandler],
  ["char.expand", charExpandHandler],
  ["validUTF8", validHandler],
  ["validEnc", validHandler],
  ["summary", summaryHandler],
  // 監査裁定で新規実装（ADV-B4-audit-r）
  ["bitwAnd", bitwBinary("bitwAnd", (a, b) => a & b)],
  ["bitwOr", bitwBinary("bitwOr", (a, b) => a | b)],
  ["bitwXor", bitwBinary("bitwXor", (a, b) => a ^ b)],
  ["bitwNot", bitwNotHandler],
  ["bitwShiftL", bitwShift(true)],
  ["bitwShiftR", bitwShift(false)],
  ["anyNA", anyNAHandler],
  ["digamma", digammaLike(0)],
  ["trigamma", digammaLike(1)],
  ["psigamma", psigammaHandler],
  ["match.arg", matchArgHandler],
]);
