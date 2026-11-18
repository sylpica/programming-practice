// 高度モード B4：R 高度関数グループ「データ・型・適用」（高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 意味論は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3 の実測で裁定した
// （報告書 docs/audit/ADV-B4-r-eng3.md に根拠と再裁定の一覧を記録）。
// 値モデルの硬い制約：リスト型なし・因子なし・行列型なし・関数値なし・
// 行名属性はデータフレームのみ・複素数/raw なし。忠実に表せない形は
// 登録せず、呼べる形でも表せない経路は api.fail で名指し停止する。
import { advancedNames } from "./names-advanced.js";

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}

// ---- 引数照合（SPEC 第4章：完全名→部分一致→位置。nameOnly は `...` の
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

// ---- 値モデルの型タグ（報告書の型対応表が正本）
// "NULL" | "logical" | "double" | "character" | "list"（データフレーム）
function typeTag(ctx, v) {
  const H = ctx.H;
  if (v === null || v === undefined) return "NULL";
  if (isDf(v)) return "list";
  if (H.isNA(v)) return "logical";
  const els = H.vec(v);
  if (!els.length) return "double"; // 長さ0ベクトルは型を持てないモデルの規約
  if (els.some((e) => typeof e === "string")) return "character";
  if (els.some((e) => typeof e === "number")) return "double";
  return "logical";
}
const tagOf = typeTag;

// 要素の表示文字列（名前・キー用。NA は null を返し呼び出し側で扱う）
function elemKey(ctx, el) {
  const H = ctx.H;
  if (H.isNA(el)) return null;
  if (typeof el === "boolean") return el ? "TRUE" : "FALSE";
  if (typeof el === "number")
    return Number.isNaN(el) ? "NaN" : H.formatRNum(el);
  return String(el);
}
// match 系の照合キー（NA と NaN は別物。基礎層 %in% と同じ規則）
function matchKey(ctx, el, asText) {
  const H = ctx.H;
  if (H.isNA(el)) return "\u0000NA";
  if (H.isNaNVal(el)) return "\u0000NaN";
  if (asText) return elemKey(ctx, el);
  return typeof el === "boolean" ? Number(el) : el;
}

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
function asCount(ctx, v, label = "length") {
  const H = ctx.H;
  const els = v === null || v === undefined ? [] : H.vec(v);
  const el = els[0];
  if (
    els.length !== 1 ||
    typeof el !== "number" ||
    Number.isNaN(el) ||
    el < 0 ||
    !Number.isFinite(el)
  )
    fail(ctx, `invalid '${label}' argument`);
  if (el > 10000) fail(ctx, "ベクトル長の上限です");
  return Math.trunc(el);
}
// 数値ベクトル化（logical は数値化、character はエラー）
function numEls(ctx, v, msg = "non-numeric argument to mathematical function") {
  const H = ctx.H;
  if (isDf(v)) fail(ctx, msg);
  if (v === null) return [];
  return H.vec(v).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    fail(ctx, msg);
  });
}
function recycleTo(ctx, els, n, what = "ベクトル") {
  if (n === 0) return [];
  if (!els.length) fail(ctx, `${what}の長さが0です`);
  if (n % els.length !== 0)
    warn(
      ctx,
      "longer object length is not a multiple of shorter object length",
    );
  return Array.from({ length: n }, (_, i) => els[i % els.length]);
}
function effRowNames(ctx, df) {
  if (Array.isArray(df.rowNames)) return [...df.rowNames];
  return Array.from({ length: ctx.H.dfNrow(df) }, (_, i) => String(i + 1));
}
// AST の簡易 deparse（cbind／expand.grid の列名推定用）
function deparse(node) {
  if (!node || typeof node !== "object") return null;
  switch (node.k) {
    case "var":
      return node.name;
    case "literal":
      return node.raw ?? String(node.value);
    case "binary": {
      const a = deparse(node.a),
        b = deparse(node.b);
      return a && b ? `${a}${node.op}${b}` : null;
    }
    case "unary": {
      const a = deparse(node.arg);
      return a ? `${node.op}${a}` : null;
    }
    case "call": {
      const t = node.target?.k === "var" ? node.target.name : null;
      if (!t) return null;
      const parts = (node.args || []).map(deparse);
      return parts.every((p) => p !== null) ? `${t}(${parts.join(", ")})` : null;
    }
    case "member": {
      const t = deparse(node.target);
      return t ? `${t}$${node.name}` : null;
    }
    default:
      return null;
  }
}

// ================= 型判定・型情報 =================
function typePred(check) {
  return (ctx) => {
    const b = bindArgs(ctx, ["x"]);
    return check(ctx, b.req("x"));
  };
}
const typeofFn = (ctx) => {
  const b = bindArgs(ctx, ["x"]);
  const t = tagOf(ctx, b.req("x"));
  return t;
};
const modeFn = (ctx) => {
  const b = bindArgs(ctx, ["x"]);
  const t = tagOf(ctx, b.req("x"));
  return t === "double" ? "numeric" : t;
};
const storageModeFn = (ctx) => {
  const b = bindArgs(ctx, ["x"]);
  return tagOf(ctx, b.req("x"));
};
const classFn = (ctx) => {
  const b = bindArgs(ctx, ["x"]);
  const v = b.req("x");
  if (isDf(v)) return "data.frame";
  const t = tagOf(ctx, v);
  return t === "double" ? "numeric" : t;
};

// ================= 型変換・コンストラクタ =================
function toCharEls(ctx, els) {
  const H = ctx.H;
  return els.map((el) =>
    H.isNA(el)
      ? H.NA
      : typeof el === "boolean"
        ? el
          ? "TRUE"
          : "FALSE"
        : typeof el === "number"
          ? H.formatRNum(el)
          : String(el),
  );
}
// as.double／as.single の本体（基礎層 as.numeric と同じ変換規則、名前は除去）
function asDoubleImpl(ctx) {
  const H = ctx.H;
  if (!ctx.vals.length) return [];
  const b = bindArgs(ctx, ["x"], { dots: true });
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "'list' object cannot be coerced to type 'double'");
  let coerced = false;
  const out = H.vec(x).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    const t = String(el).trim();
    if (t === "") {
      coerced = true;
      return H.NA;
    }
    const n = Number(t);
    if (Number.isNaN(n) && t !== "NaN") {
      coerced = true;
      return H.NA;
    }
    return n;
  });
  if (coerced) warn(ctx, "NAs introduced by coercion");
  return out;
}
function asIntegerImpl(ctx) {
  const H = ctx.H;
  if (!ctx.vals.length) return [];
  const b = bindArgs(ctx, ["x"], { dots: true });
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "'list' object cannot be coerced to type 'integer'");
  let coerced = false,
    rangeWarn = false;
  const out = H.vec(x).map((el) => {
    if (H.isNA(el)) return H.NA;
    let n;
    if (typeof el === "boolean") n = el ? 1 : 0;
    else if (typeof el === "number") {
      if (Number.isNaN(el)) return H.NA;
      n = el;
    } else {
      const t = String(el).trim();
      if (t === "") {
        coerced = true;
        return H.NA;
      }
      n = Number(t);
      if (Number.isNaN(n)) {
        coerced = true;
        return H.NA;
      }
    }
    if (!Number.isFinite(n) || Math.abs(Math.trunc(n)) > 2147483647) {
      rangeWarn = true;
      return H.NA;
    }
    return Math.trunc(n);
  });
  if (rangeWarn) warn(ctx, "NAs introduced by coercion to integer range");
  if (coerced) warn(ctx, "NAs introduced by coercion");
  return out;
}
function asLogicalImpl(ctx) {
  const H = ctx.H;
  if (!ctx.vals.length) return [];
  const b = bindArgs(ctx, ["x"], { dots: true });
  const x = b.req("x");
  if (isDf(x))
    fail(
      ctx,
      "as.logical: データフレーム入力は値モデルで忠実に表せないため未対応です",
    );
  const TRUE_SET = new Set(["TRUE", "True", "true", "T"]);
  const FALSE_SET = new Set(["FALSE", "False", "false", "F"]);
  return H.vec(x).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "boolean") return el;
    if (typeof el === "number") return Number.isNaN(el) ? H.NA : el !== 0;
    if (TRUE_SET.has(el)) return true;
    if (FALSE_SET.has(el)) return false;
    return H.NA;
  });
}
function ctor(kind) {
  return (ctx) => {
    const b = bindArgs(ctx, ["length"]);
    const n = b.has("length") ? asCount(ctx, b.val("length")) : 0;
    const fill =
      kind === "character" ? "" : kind === "logical" ? false : 0;
    return Array.from({ length: n }, () => fill);
  };
}

// ================= ベクトル・データフレーム操作 =================
function appendFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "values", "after"]);
  const x = b.req("x"),
    values = b.req("values");
  if (isDf(x) || isDf(values))
    fail(ctx, "append: データフレームはリストとして扱われるため未対応です");
  const xEls = x === null ? [] : H.vec(x);
  const vEls = values === null ? [] : H.vec(values);
  let after = xEls.length;
  if (b.has("after")) {
    const aEls = H.vec(b.val("after"));
    const a = aEls[0];
    if (typeof a !== "number" || Number.isNaN(a) || H.isNA(a))
      fail(ctx, "append: 'after' が不正です");
    after = Math.max(0, Math.min(xEls.length, Math.trunc(a)));
  }
  const combined = H.coerce([
    ...xEls.slice(0, after),
    ...vEls,
    ...xEls.slice(after),
  ]);
  const xn = H.namesOf(x),
    vn = H.namesOf(values);
  if (xn || vn) {
    const names = [
      ...Array.from({ length: after }, (_, i) => xn?.[i] ?? ""),
      ...Array.from({ length: vEls.length }, (_, i) => vn?.[i] ?? ""),
      ...Array.from(
        { length: xEls.length - after },
        (_, i) => xn?.[after + i] ?? "",
      ),
    ];
    return H.withNames(combined, names);
  }
  return combined;
}
function lengthsFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "use.names"]);
  const x = b.req("x");
  const useNames = b.has("use.names")
    ? asLogicalScalar(ctx, b.val("use.names"))
    : true;
  if (isDf(x)) {
    const keys = Object.keys(x.columns);
    const out = keys.map((k) => x.columns[k].length);
    return useNames ? H.withNames(out, keys) : out;
  }
  if (x === null) return [];
  const els = H.vec(x);
  const out = els.map(() => 1);
  const nm = H.namesOf(x);
  return useNames && nm ? H.withNames(out, [...nm]) : out;
}
function nrowFn(kind) {
  return (ctx) => {
    const b = bindArgs(ctx, ["x"]);
    const x = b.req("x");
    if (kind === "NROW") {
      if (isDf(x)) return ctx.H.dfNrow(x);
      if (x === null) return 0;
      return ctx.H.vec(x).length;
    }
    if (isDf(x)) return Object.keys(x.columns).length;
    if (x === null) return 0;
    return 1;
  };
}
function dimFn(ctx) {
  const b = bindArgs(ctx, ["x"]);
  const x = b.req("x");
  if (isDf(x)) return [ctx.H.dfNrow(x), Object.keys(x.columns).length];
  return null;
}
function colnamesFn(ctx) {
  const b = bindArgs(ctx, ["x", "do.NULL", "prefix"], { dots: true });
  const x = b.req("x");
  if (isDf(x)) return Object.keys(x.columns);
  return null;
}
function rownamesFn(ctx) {
  const b = bindArgs(ctx, ["x", "do.NULL", "prefix"], { dots: true });
  const x = b.req("x");
  if (isDf(x)) return effRowNames(ctx, x);
  return null;
}
function getElementFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["object", "name"]);
  const object = b.req("object"),
    nameV = b.req("name");
  const nm = H.vec(nameV)[0];
  if (typeof nm !== "string" && typeof nm !== "number")
    fail(ctx, "subscript out of bounds");
  if (isDf(object)) {
    if (typeof nm === "string" && Object.hasOwn(object.columns, nm))
      return object.columns[nm];
    if (typeof nm === "number") {
      const col = Object.values(object.columns)[Math.trunc(nm) - 1];
      if (col !== undefined) return col;
    }
    return null; // 実 R 4.3.3 実測：getElement(df, "zz") は NULL
  }
  if (object === null) fail(ctx, "subscript out of bounds");
  const els = H.vec(object);
  if (typeof nm === "string") {
    const at = H.namesOf(object)?.indexOf(nm) ?? -1;
    if (at < 0) fail(ctx, "subscript out of bounds");
    return els[at];
  }
  const pos = Math.trunc(nm);
  if (pos < 1 || pos > els.length) fail(ctx, "subscript out of bounds");
  return els[pos - 1];
}
function ifelseFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["test", "yes", "no"]);
  const test = b.req("test"),
    yes = b.req("yes"),
    no = b.req("no");
  if (isDf(test) || isDf(yes) || isDf(no))
    fail(ctx, "ifelse: データフレーム入力は未対応です");
  const tEls = test === null ? [] : H.vec(test);
  const n = tEls.length;
  if (!n) return [];
  const yEls = yes === null ? [] : H.vec(yes);
  const nEls = no === null ? [] : H.vec(no);
  if (!yEls.length || !nEls.length)
    fail(ctx, "ifelse: 'yes'／'no' の長さが0です");
  const yr = recycleTo(ctx, yEls, n, "'yes'"),
    nr = recycleTo(ctx, nEls, n, "'no'");
  const coerced = H.coerce([...yr, ...nr]);
  const cy = coerced.slice(0, n),
    cn = coerced.slice(n);
  const out = tEls.map((t, i) => {
    if (H.isNA(t) || H.isNaNVal(t)) return H.NA;
    if (typeof t === "string")
      fail(ctx, "argument is not interpretable as logical");
    return t ? cy[i] : cn[i];
  });
  const tn = H.namesOf(test);
  return tn ? H.withNames(out, [...tn]) : out;
}
function isUnsortedFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "na.rm", "strictly"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "is.unsorted: データフレームは未対応です");
  const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : false;
  const strictly = b.has("strictly")
    ? asLogicalScalar(ctx, b.val("strictly"))
    : false;
  let els = x === null ? [] : [...H.vec(x)];
  if (els.some((e) => H.isMissing(e))) {
    if (!naRm) return H.NA;
    els = els.filter((e) => !H.isMissing(e));
  }
  for (let i = 1; i < els.length; i++) {
    const a = els[i - 1],
      c = els[i];
    const cmp =
      typeof a === "string" || typeof c === "string"
        ? String(a) < String(c)
          ? -1
          : String(a) > String(c)
            ? 1
            : 0
        : Number(a) - Number(c);
    if (strictly ? cmp >= 0 : cmp > 0) return true;
  }
  return false;
}
function cbindFn(ctx) {
  const H = ctx.H;
  const parts = [];
  ctx.args.forEach((a, i) => {
    if (a.argName === "deparse.level") return;
    parts.push({ name: a.argName ?? null, value: ctx.vals[i], node: a });
  });
  const data = parts.filter((p) => p.value !== null);
  if (!data.length) return null;
  if (!data.some((p) => isDf(p.value)))
    fail(
      ctx,
      "cbind: ベクトル同士の結合は行列を返すため未対応です（データフレームを含む形のみ対応）",
    );
  const dfs = data.filter((p) => isDf(p.value));
  const n = Math.max(...dfs.map((d) => H.dfNrow(d.value)));
  for (const d of dfs)
    if (H.dfNrow(d.value) !== n)
      fail(
        ctx,
        `arguments imply differing number of rows: ${[...new Set(dfs.map((d) => H.dfNrow(d.value)))].join(", ")}`,
      );
  const columns = {};
  const usedNames = new Set();
  const putCol = (name, col) => {
    let nm = name;
    if (usedNames.has(nm)) {
      let k = 1;
      while (usedNames.has(`${name}.${k}`)) k++;
      nm = `${name}.${k}`;
    }
    usedNames.add(nm);
    columns[nm] = col;
  };
  for (const p of data) {
    if (isDf(p.value)) {
      for (const [k, col] of Object.entries(p.value.columns))
        putCol(k, [...col]);
    } else {
      const els = H.vec(p.value);
      if (els.length !== n && els.length !== 1)
        fail(
          ctx,
          `arguments imply differing number of rows: ${n}, ${els.length}`,
        );
      const colName = p.name ?? deparse(p.node);
      if (!colName)
        fail(ctx, "cbind: ベクトル引数の列名を決められない形は未対応です");
      putCol(
        colName,
        Array.from({ length: n }, (_, i) => els[i % els.length]),
      );
    }
  }
  const out = { kind: "data.frame", columns };
  const withRows = dfs.find((d) => Array.isArray(d.value.rowNames));
  if (withRows) out.rowNames = [...withRows.value.rowNames];
  return out;
}
function rbindFn(ctx) {
  const H = ctx.H;
  const parts = [];
  ctx.args.forEach((a, i) => {
    if (a.argName === "deparse.level") return;
    parts.push({ value: ctx.vals[i] });
  });
  const data = parts.filter((p) => p.value !== null);
  if (!data.length) return null;
  if (!data.every((p) => isDf(p.value)))
    fail(
      ctx,
      "rbind: ベクトルを含む結合は行列を返すため未対応です（データフレーム同士のみ対応）",
    );
  const firstKeys = Object.keys(data[0].value.columns);
  for (const p of data) {
    const keys = Object.keys(p.value.columns);
    if (
      keys.length !== firstKeys.length ||
      !firstKeys.every((k) => keys.includes(k))
    )
      fail(ctx, "numbers of columns of arguments do not match");
  }
  const columns = {};
  for (const k of firstKeys)
    columns[k] = data.flatMap((p) => [...p.value.columns[k]]);
  const out = { kind: "data.frame", columns };
  if (data.some((p) => Array.isArray(p.value.rowNames)))
    out.rowNames = data.flatMap((p) => effRowNames(ctx, p.value));
  return out;
}
function mergeFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, [
    "x", "y", "by", "by.x", "by.y", "all", "all.x", "all.y", "sort",
    "suffixes", "incomparables",
  ]);
  const x = b.req("x"),
    y = b.req("y");
  if (!isDf(x) || !isDf(y))
    fail(ctx, "merge: データフレーム同士の結合のみ対応しています");
  if (b.has("incomparables"))
    fail(ctx, "merge: incomparables 引数は未対応です");
  const boolArg = (n, dflt) =>
    b.has(n) ? asLogicalScalar(ctx, b.val(n)) : dflt;
  const all = boolArg("all", false);
  const allX = all || boolArg("all.x", false);
  const allY = all || boolArg("all.y", false);
  const sort = boolArg("sort", true);
  let suffixes = [".x", ".y"];
  if (b.has("suffixes")) {
    const s = H.vec(b.val("suffixes")).map(String);
    if (s.length >= 2) suffixes = [s[0], s[1]];
  }
  const xKeys = Object.keys(x.columns),
    yKeys = Object.keys(y.columns);
  const nameList = (v) => H.vec(v).map((e) => String(e));
  let byX, byY;
  if (b.has("by.x") || b.has("by.y")) {
    if (!b.has("by.x") || !b.has("by.y"))
      fail(ctx, "'by' must specify a uniquely valid column");
    byX = nameList(b.val("by.x"));
    byY = nameList(b.val("by.y"));
  } else if (b.has("by")) {
    byX = byY = nameList(b.val("by"));
  } else {
    byX = byY = xKeys.filter((k) => yKeys.includes(k));
  }
  if (
    !byX.length ||
    byX.length !== byY.length ||
    !byX.every((k) => xKeys.includes(k)) ||
    !byY.every((k) => yKeys.includes(k))
  )
    fail(ctx, "'by' must specify a uniquely valid column");
  const nx = H.dfNrow(x),
    ny = H.dfNrow(y);
  // by 列は共通型へ変換してから照合する（match の規則：NA は NA に一致）
  const byColsX = byX.map((k, j) => {
    const combined = H.coerce([...x.columns[k], ...y.columns[byY[j]]]);
    return { xPart: combined.slice(0, nx), yPart: combined.slice(nx) };
  });
  const keyOf = (cols, i) =>
    cols.map((c) => matchKey(ctx, c[i], false)).join("\u0001");
  const yIndex = new Map();
  for (let j = 0; j < ny; j++) {
    const k = keyOf(byColsX.map((c) => c.yPart), j);
    if (!yIndex.has(k)) yIndex.set(k, []);
    yIndex.get(k).push(j);
  }
  const pairs = []; // [xi|null, yi|null]
  const yUsed = new Set();
  for (let i = 0; i < nx; i++) {
    const k = keyOf(byColsX.map((c) => c.xPart), i);
    const matches = yIndex.get(k) ?? [];
    if (matches.length) {
      for (const j of matches) {
        pairs.push([i, j]);
        yUsed.add(j);
      }
    } else if (allX) pairs.push([i, null]);
  }
  if (allY)
    for (let j = 0; j < ny; j++) if (!yUsed.has(j)) pairs.push([null, j]);
  if (pairs.length > 10000) fail(ctx, "ベクトル長の上限です");
  if (sort) {
    const cmpVal = (a, c) => {
      if (H.isMissing(a) && H.isMissing(c)) return 0;
      if (H.isMissing(a)) return 1;
      if (H.isMissing(c)) return -1;
      if (typeof a === "string" || typeof c === "string")
        return String(a) < String(c) ? -1 : String(a) > String(c) ? 1 : 0;
      return Number(a) - Number(c);
    };
    pairs.sort((p, q) => {
      for (let j = 0; j < byX.length; j++) {
        const pv = p[0] !== null ? byColsX[j].xPart[p[0]] : byColsX[j].yPart[p[1]];
        const qv = q[0] !== null ? byColsX[j].xPart[q[0]] : byColsX[j].yPart[q[1]];
        const c = cmpVal(pv, qv);
        if (c) return c;
      }
      return 0;
    });
  }
  const xRest = xKeys.filter((k) => !byX.includes(k));
  const yRest = yKeys.filter((k) => !byY.includes(k));
  const columns = {};
  byX.forEach((k, j) => {
    columns[k] = pairs.map(([i, jj]) =>
      i !== null ? byColsX[j].xPart[i] : byColsX[j].yPart[jj],
    );
  });
  for (const k of xRest) {
    const nm = yRest.includes(k) ? k + suffixes[0] : k;
    columns[nm] = pairs.map(([i]) => (i !== null ? x.columns[k][i] : H.NA));
  }
  for (const k of yRest) {
    const nm = xRest.includes(k) ? k + suffixes[1] : k;
    columns[nm] = pairs.map(([, jj]) => (jj !== null ? y.columns[k][jj] : H.NA));
  }
  return { kind: "data.frame", columns };
}
function expandGridFn(ctx) {
  const H = ctx.H;
  const argsList = [];
  let stringsAsFactors = true;
  ctx.args.forEach((a, i) => {
    if (a.argName === "KEEP.OUT.ATTRS") return;
    if (a.argName === "stringsAsFactors") {
      stringsAsFactors = asLogicalScalar(ctx, ctx.vals[i]);
      return;
    }
    argsList.push({ name: a.argName ?? null, value: ctx.vals[i], node: a });
  });
  if (!argsList.length) return { kind: "data.frame", columns: {} };
  const cols = argsList.map((p, idx) => {
    if (isDf(p.value))
      fail(ctx, "expand.grid: データフレーム引数は未対応です");
    const els = p.value === null ? [] : H.vec(p.value);
    const name = p.name ?? deparse(p.node) ?? `Var${idx + 1}`;
    return { name, els, names: H.namesOf(p.value) };
  });
  if (cols.some((c) => typeof c.els[0] === "string") && stringsAsFactors)
    fail(
      ctx,
      "expand.grid: 文字列列は因子になるため未対応です（stringsAsFactors = FALSE を指定してください）",
    );
  const total = cols.reduce((acc, c) => acc * Math.max(c.els.length, 0), 1);
  if (total > 10000) fail(ctx, "ベクトル長の上限です");
  const columns = {};
  let cycle = 1;
  for (const c of cols) {
    const out = [];
    if (c.els.length) {
      for (let r = 0; r < total; r++)
        out.push(c.els[Math.floor(r / cycle) % c.els.length]);
    }
    columns[c.name] = out;
    cycle *= Math.max(c.els.length, 1);
  }
  return { kind: "data.frame", columns };
}

// ---- colSums／rowSums 系 ----
function sumEls(ctx, els, naRm) {
  const H = ctx.H;
  let s = 0,
    sawNA = false;
  for (const el of els) {
    if (H.isMissing(el)) {
      if (!naRm) return H.NA;
      sawNA = true;
      continue;
    }
    s += el;
  }
  return s;
}
function meanEls(ctx, els, naRm) {
  const H = ctx.H;
  const kept = naRm ? els.filter((e) => !H.isMissing(e)) : els;
  if (!naRm && els.some((e) => H.isMissing(e))) return H.NA;
  if (!kept.length) return NaN;
  return kept.reduce((a, c) => a + c, 0) / kept.length;
}
function checkNumericDf(ctx, df) {
  for (const col of Object.values(df.columns))
    for (const el of col)
      if (typeof el === "string") fail(ctx, "'x' must be numeric");
}
function colRowSumsFn(isCol, isMean) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["x", "na.rm", "dims"]);
    const x = b.req("x");
    if (!isDf(x))
      fail(ctx, "'x' must be an array of at least two dimensions");
    if (b.has("dims")) {
      const d = H.vec(b.val("dims"))[0];
      if (d !== 1)
        fail(ctx, "colSums系: dims が1でない形は配列を返すため未対応です");
    }
    const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : false;
    checkNumericDf(ctx, x);
    const calc = isMean ? meanEls : sumEls;
    if (isCol) {
      const keys = Object.keys(x.columns);
      const out = keys.map((k) =>
        calc(ctx, numEls(ctx, x.columns[k], "'x' must be numeric"), naRm),
      );
      return H.withNames(out, keys);
    }
    const n = H.dfNrow(x);
    const cols = Object.values(x.columns).map((c) =>
      numEls(ctx, c, "'x' must be numeric"),
    );
    const out = Array.from({ length: n }, (_, i) =>
      calc(ctx, cols.map((c) => c[i]), naRm),
    );
    return H.withNames(out, effRowNames(ctx, x));
  };
}
// 監査裁定（ADV-B4-audit-r）：.colSums／.rowSums／.colMeans／.rowMeans の
// ハンドラは除去した。ドット始まり識別子は共有パーサが受理せず到達不能で、
// 項目側も未対応（パーサ理由の開示）に裁定したため。
// ---- sweep／scale ----
const SWEEP_OPS = {
  "-": (a, c) => a - c,
  "+": (a, c) => a + c,
  "*": (a, c) => a * c,
  "/": (a, c) => a / c,
};
function sweepFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "MARGIN", "STATS", "FUN", "check.margin"], {
    dots: true,
  });
  const x = b.req("x");
  if (!isDf(x))
    fail(
      ctx,
      "sweep: ベクトルには次元がないため未対応です（データフレームのみ対応）",
    );
  const marginEls = H.vec(b.req("MARGIN"));
  const margin = marginEls[0];
  if (marginEls.length !== 1 || (margin !== 1 && margin !== 2))
    fail(ctx, "sweep: MARGIN は長さ1の 1 または 2 で指定してください");
  const funV = b.has("FUN") ? H.vec(b.val("FUN"))[0] : "-";
  if (typeof funV !== "string" || !Object.hasOwn(SWEEP_OPS, funV))
    fail(
      ctx,
      "sweep: FUN として使えるのは四則演算子の文字列（\"-\"／\"+\"／\"*\"／\"/\"）のみです",
    );
  const op = SWEEP_OPS[funV];
  const stats = numEls(ctx, b.req("STATS"), "non-numeric argument to binary operator");
  const keys = Object.keys(x.columns),
    n = H.dfNrow(x);
  const extent = margin === 2 ? keys.length : n;
  if (!stats.length) fail(ctx, "sweep: STATS の長さが0です");
  if (extent % stats.length !== 0 && stats.length % extent !== 0)
    warn(ctx, "STATS does not recycle exactly across MARGIN");
  const statAt = (i) => stats[i % stats.length];
  const columns = {};
  keys.forEach((k, j) => {
    columns[k] = numEls(ctx, x.columns[k], "non-numeric argument to binary operator").map(
      (el, i) => {
        const st = margin === 2 ? statAt(j) : statAt(i);
        if (H.isMissing(el) || H.isMissing(st)) return H.NA;
        return op(el, st);
      },
    );
  });
  const out = { kind: "data.frame", columns };
  if (Array.isArray(x.rowNames)) out.rowNames = [...x.rowNames];
  return out;
}
function scaleOne(ctx, els, center, scaleArg) {
  const H = ctx.H;
  const nums = numEls(ctx, els, "'x' must be numeric");
  const n = nums.length;
  if (!n) return [];
  let centerVals;
  if (center === false) centerVals = nums.map(() => 0);
  else if (center === true) {
    const m = nums.some((e) => H.isMissing(e))
      ? H.NA
      : nums.reduce((a, c) => a + c, 0) / n;
    centerVals = nums.map(() => m);
  } else {
    const cv = numEls(ctx, center, "'x' must be numeric");
    centerVals = recycleTo(ctx, cv, n, "'center'");
  }
  const centered = nums.map((e, i) =>
    H.isMissing(e) || H.isMissing(centerVals[i]) ? H.NA : e - centerVals[i],
  );
  let factors;
  if (scaleArg === false) factors = nums.map(() => 1);
  else if (scaleArg === true) {
    let f;
    if (centered.some((e) => H.isMissing(e))) f = NaN;
    else {
      const ss = centered.reduce((a, c) => a + c * c, 0);
      f = Math.sqrt(ss / Math.max(1, n - 1));
    }
    factors = nums.map(() => f);
  } else {
    const sv = numEls(ctx, scaleArg, "'x' must be numeric");
    factors = recycleTo(ctx, sv, n, "'scale'");
  }
  return centered.map((e, i) => {
    if (H.isNA(e)) return H.NA;
    const f = factors[i];
    if (H.isNA(f)) return H.NA;
    return e / f;
  });
}
function scaleFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "center", "scale"]);
  const x = b.req("x");
  const center = b.has("center") ? b.val("center") : true;
  const scaleArg = b.has("scale") ? b.val("scale") : true;
  const centerNorm =
    center === null
      ? true
      : Array.isArray(center) || typeof center !== "boolean"
        ? center
        : center;
  const centerBool =
    typeof centerNorm === "boolean"
      ? centerNorm
      : centerNorm;
  if (isDf(x)) {
    checkNumericDf(ctx, x);
    const columns = {};
    for (const [k, col] of Object.entries(x.columns))
      columns[k] = scaleOne(ctx, col, centerBool, scaleArg);
    const out = { kind: "data.frame", columns };
    if (Array.isArray(x.rowNames)) out.rowNames = [...x.rowNames];
    return out;
  }
  if (x === null) return [];
  const out = scaleOne(ctx, H.vec(x), centerBool, scaleArg);
  const nm = H.namesOf(x);
  return nm ? H.withNames(out, [...nm]) : out;
}
// ---- rowsum／tabulate／proportions ----
function rowsumFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "group", "reorder", "na.rm"], { dots: true });
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "rowsum: データフレーム入力は未対応です");
  const nums = numEls(ctx, x, "'x' must be numeric");
  const g = b.req("group");
  if (isDf(g)) fail(ctx, "rowsum: group にデータフレームは使えません");
  const gEls = g === null ? [] : H.vec(g);
  if (gEls.length !== nums.length) fail(ctx, "arguments must have same length");
  const reorder = b.has("reorder")
    ? asLogicalScalar(ctx, b.val("reorder"))
    : true;
  const naRm = b.has("na.rm") ? asLogicalScalar(ctx, b.val("na.rm")) : false;
  const order = [];
  const buckets = new Map();
  gEls.forEach((gv, i) => {
    const key = H.isMissing(gv) ? "\u0000MISSING" : matchKey(ctx, gv, false);
    if (!buckets.has(key)) {
      buckets.set(key, { label: gv, vals: [] });
      order.push(key);
    }
    buckets.get(key).vals.push(nums[i]);
  });
  let keys = order;
  if (buckets.has("\u0000MISSING"))
    warn(ctx, "missing values for 'group'");
  if (reorder) {
    keys = [...order].sort((a, c) => {
      if (a === "\u0000MISSING") return 1;
      if (c === "\u0000MISSING") return -1;
      const la = buckets.get(a).label,
        lc = buckets.get(c).label;
      if (typeof la === "string" || typeof lc === "string")
        return String(la) < String(lc) ? -1 : String(la) > String(lc) ? 1 : 0;
      return Number(la) - Number(lc);
    });
  }
  const out = keys.map((k) => sumEls(ctx, buckets.get(k).vals, naRm));
  const names = keys.map((k) =>
    k === "\u0000MISSING" ? null : elemKey(ctx, buckets.get(k).label),
  );
  return H.withNames(out, names);
}
function tabulateFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["bin", "nbins"]);
  const bin = b.req("bin");
  if (isDf(bin)) fail(ctx, "'bin' must be numeric or a factor");
  const els = bin === null ? [] : H.vec(bin);
  if (els.some((e) => typeof e === "string"))
    fail(ctx, "'bin' must be numeric or a factor");
  let nbins;
  if (b.has("nbins")) nbins = asCount(ctx, b.val("nbins"), "nbins");
  else {
    const nums = els.filter((e) => typeof e === "number" && !H.isMissing(e));
    nbins = nums.length ? Math.max(1, Math.trunc(Math.max(...nums))) : 0;
  }
  const out = Array.from({ length: nbins }, () => 0);
  for (const e of els) {
    if (typeof e !== "number" || H.isMissing(e)) continue;
    const t = Math.trunc(e);
    if (t >= 1 && t <= nbins) out[t - 1]++;
  }
  return out;
}
function proportionsFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "margin"]);
  const x = b.req("x");
  if (isDf(x))
    fail(ctx, "proportions: データフレーム入力は行列を返すため未対応です");
  if (b.has("margin") && b.val("margin") !== null) {
    const m = H.vec(b.val("margin"))[0];
    if (m !== 1)
      fail(ctx, "proportions: margin が1でない形は未対応です");
  }
  const nums = numEls(ctx, x, "'x' must be numeric");
  const total = nums.some((e) => H.isMissing(e))
    ? H.NA
    : nums.reduce((a, c) => a + c, 0);
  const out = nums.map((e) => (H.isMissing(e) || H.isNA(total) ? H.NA : e / total));
  const nm = H.namesOf(x);
  return nm ? H.withNames(out, [...nm]) : out;
}
function unlistFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "recursive", "use.names"]);
  const x = b.req("x");
  const useNames = b.has("use.names")
    ? asLogicalScalar(ctx, b.val("use.names"))
    : true;
  if (isDf(x)) {
    const vals = [],
      names = [];
    for (const [k, col] of Object.entries(x.columns))
      col.forEach((el, i) => {
        vals.push(el);
        names.push(k + (i + 1));
      });
    const coerced = H.coerce(vals);
    return useNames ? H.withNames(coerced, names) : coerced;
  }
  if (x === null) return null;
  const els = H.vec(x);
  const nm = H.namesOf(x);
  return useNames && nm ? H.withNames([...els], [...nm]) : [...els];
}

// ================= 適用・グループ化 =================
// 文字列 FUN（match.fun の文字指定）で使える集計の内部実装。
// bare な関数名は基礎層の read フックが「関数名を値として使う形」で
// 名指し停止するため、ここへ届くのは文字列指定のみ。
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
  if (fun === "is.na") {
    if (els.length !== 1) fail(ctx, "sapply系: is.na の結果がスカラーになりません");
    return H.isNA(els[0]) || H.isNaNVal(els[0]);
  }
  if (fun === "typeof") return tagOf(ctx, elsRaw);
  if (fun === "mode") {
    const t = tagOf(ctx, elsRaw);
    return t === "double" ? "numeric" : t;
  }
  if (fun === "class") {
    if (isDf(elsRaw)) return "data.frame";
    const t = tagOf(ctx, elsRaw);
    return t === "double" ? "numeric" : t;
  }
  if (fun === "is.numeric") return tagOf(ctx, elsRaw) === "double";
  if (fun === "is.character") return tagOf(ctx, elsRaw) === "character";
  if (fun === "is.logical") return tagOf(ctx, elsRaw) === "logical";
  if (fun === "abs" || fun === "sqrt") {
    if (els.length !== 1) fail(ctx, "sapply系: 結果がスカラーになりません");
    const nums = aggNums(ctx, els);
    if (H.isNA(nums[0])) return H.NA;
    if (fun === "abs") return Math.abs(nums[0]);
    if (nums[0] < 0) {
      warn(ctx, "NaNs produced");
      return NaN;
    }
    return Math.sqrt(nums[0]);
  }
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
      return kept.length ? Math.min(...kept) : Infinity;
    case "max":
      if (hasMiss && !naRm) return H.NA;
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
const AGGREGATORS = new Set([
  "sum", "mean", "median", "min", "max", "length", "sd",
  "is.na", "typeof", "mode", "class", "is.numeric", "is.character",
  "is.logical", "abs", "sqrt",
]);
function funString(ctx, b, dotsNaRm) {
  if (!b.has("FUN"))
    fail(
      ctx,
      "FUN が指定されていません（FUN = NULL の形はリストを返すため未対応です）",
    );
  const fv = ctx.H.vec(b.val("FUN"))[0];
  if (typeof fv !== "string")
    fail(
      ctx,
      "FUN は関数値では渡せません。文字列で集計名を指定してください（例: \"sum\"）",
    );
  if (!AGGREGATORS.has(fv))
    fail(
      ctx,
      `FUN として使えるのは文字列で指定した単純な集計のみです："${fv}"`,
    );
  return fv;
}
function dotsNaRm(ctx, dotList, fun) {
  let naRm = false;
  for (const d of dotList) {
    if (d.name === "na.rm") {
      if (fun === "length")
        fail(ctx, `unused argument (na.rm = ${ctx.H.show(d.value)})`);
      naRm = asLogicalScalar(ctx, d.value);
    } else
      fail(
        ctx,
        `unused argument (${d.name ? d.name + " = " : ""}${ctx.H.show(d.value)})`,
      );
  }
  return naRm;
}
function tapplyFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["X", "INDEX", "FUN", "default", "simplify"], {
    dots: true,
    nameOnly: ["default", "simplify"],
  });
  const X = b.req("X");
  if (isDf(X)) fail(ctx, "tapply: X にデータフレームは使えません");
  const xEls = X === null ? [] : H.vec(X);
  const INDEX = b.req("INDEX");
  let idxEls;
  if (isDf(INDEX)) {
    const keys = Object.keys(INDEX.columns);
    if (keys.length !== 1)
      fail(
        ctx,
        "tapply: 複数のグループ化列は配列（array）を返すため未対応です",
      );
    idxEls = INDEX.columns[keys[0]];
  } else idxEls = INDEX === null ? [] : H.vec(INDEX);
  if (idxEls.length !== xEls.length)
    fail(ctx, "arguments must have same length");
  if (b.has("simplify") && !asLogicalScalar(ctx, b.val("simplify")))
    fail(ctx, "tapply: simplify = FALSE はリストを返すため未対応です");
  const fun = funString(ctx, b, null);
  const naRm = dotsNaRm(ctx, b.dots, fun);
  const buckets = new Map();
  idxEls.forEach((gv, i) => {
    if (H.isMissing(gv)) return; // NA の添字の要素は実 R でも落ちる
    const key = matchKey(ctx, gv, false);
    if (!buckets.has(key)) buckets.set(key, { label: gv, vals: [] });
    buckets.get(key).vals.push(xEls[i]);
  });
  const keys = [...buckets.keys()].sort((a, c) => {
    const la = buckets.get(a).label,
      lc = buckets.get(c).label;
    if (typeof la === "string" || typeof lc === "string")
      return String(la) < String(lc) ? -1 : String(la) > String(lc) ? 1 : 0;
    return Number(la) - Number(lc);
  });
  const out = keys.map((k) => aggApply(ctx, fun, buckets.get(k).vals, naRm));
  const names = keys.map((k) => elemKey(ctx, buckets.get(k).label));
  return H.withNames(out, names);
}
function sapplyLike(ctx, isVapply) {
  const H = ctx.H;
  const formals = isVapply
    ? ["X", "FUN", "FUN.VALUE", "USE.NAMES"]
    : ["X", "FUN", "simplify", "USE.NAMES"];
  const b = bindArgs(ctx, formals, {
    dots: true,
    nameOnly: isVapply ? ["USE.NAMES"] : ["simplify", "USE.NAMES"],
  });
  const X = b.req("X");
  if (!isVapply && b.has("simplify")) {
    const sv = b.val("simplify");
    const sEls = H.vec(sv);
    const ok =
      sv === null
        ? false
        : sEls.length === 1 &&
          (sEls[0] === true || sEls[0] === "array");
    if (!ok)
      fail(ctx, "sapply: simplify = FALSE はリストを返すため未対応です");
  }
  const fun = funString(ctx, b, null);
  const naRm = dotsNaRm(ctx, b.dots, fun);
  const useNames = b.has("USE.NAMES")
    ? asLogicalScalar(ctx, b.val("USE.NAMES"))
    : true;
  let template = null;
  if (isVapply) {
    template = b.req("FUN.VALUE");
    if (
      template === null ||
      isDf(template) ||
      H.vec(template).length !== 1
    )
      fail(
        ctx,
        "vapply: FUN.VALUE の長さが1でない形は配列を返すため未対応です",
      );
  }
  const items = []; // {target, name}
  if (isDf(X)) {
    for (const [k, col] of Object.entries(X.columns))
      items.push({ target: col, name: k });
  } else if (X === null) {
    // 長さ0の結果
  } else {
    const els = H.vec(X);
    const nm = H.namesOf(X);
    els.forEach((el, i) => {
      let name = null;
      if (useNames) {
        if (nm && nm[i] != null && nm[i] !== "") name = nm[i];
        else if (typeof el === "string") name = el;
      }
      items.push({ target: el, name });
    });
  }
  if (isDf(X) && !useNames) items.forEach((it) => (it.name = null));
  const results = items.map((it) => aggApply(ctx, fun, it.target, naRm));
  if (isVapply && template !== null) {
    const tTag = tagOf(ctx, template);
    results.forEach((r, i) => {
      const rTag = tagOf(ctx, r);
      const typeOk =
        tTag === rTag || (tTag === "logical" && rTag === "logical");
      if (!typeOk)
        fail(
          ctx,
          `values must be type '${tTag === "double" ? "double" : tTag}', but FUN(X[[${i + 1}]]) result is type '${rTag === "double" ? "double" : rTag}'`,
        );
    });
  }
  if (!results.length) return [];
  const coerced = H.coerce(results);
  const names = items.map((it) => it.name);
  return names.some((n) => n !== null)
    ? H.withNames(coerced, names)
    : coerced;
}
function mapplyFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["FUN", "MoreArgs", "SIMPLIFY", "USE.NAMES"], {
    dots: true,
    nameOnly: ["MoreArgs", "SIMPLIFY", "USE.NAMES"],
  });
  const funV = H.vec(b.req("FUN"))[0];
  if (typeof funV !== "string")
    fail(ctx, "mapply: FUN は文字列で指定してください");
  if (b.has("MoreArgs") && b.val("MoreArgs") !== null)
    fail(ctx, "mapply: MoreArgs はリストを渡すため未対応です（NULL のみ対応）");
  if (b.has("SIMPLIFY") && !asLogicalScalar(ctx, b.val("SIMPLIFY")))
    fail(ctx, "mapply: SIMPLIFY = FALSE はリストを返すため未対応です");
  const useNames = b.has("USE.NAMES")
    ? asLogicalScalar(ctx, b.val("USE.NAMES"))
    : true;
  const dataArgs = b.dots;
  if (!dataArgs.length) return [];
  const argVecs = dataArgs.map((d) => {
    if (isDf(d.value))
      fail(ctx, "mapply: データフレーム引数は未対応です");
    return d.value === null ? [] : H.vec(d.value);
  });
  const n = Math.max(...argVecs.map((v) => v.length));
  if (!n) return [];
  const recycled = argVecs.map((v) => recycleTo(ctx, v, n));
  const BINOPS = {
    "+": (a, c) => a + c,
    "-": (a, c) => a - c,
    "*": (a, c) => a * c,
    "/": (a, c) => a / c,
    "^": (a, c) => a ** c,
    "%%": (a, c) => a - Math.floor(a / c) * c,
    "%/%": (a, c) => Math.floor(a / c),
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    const els = recycled.map((v) => v[i]);
    if (Object.hasOwn(BINOPS, funV)) {
      if (els.length !== 2)
        fail(ctx, `mapply: 演算子 "${funV}" には引数が2つ必要です`);
      const nums = aggNums(ctx, els);
      out.push(
        H.isMissing(nums[0]) || H.isMissing(nums[1])
          ? H.NA
          : BINOPS[funV](nums[0], nums[1]),
      );
    } else if (["sum", "min", "max", "length", "mean"].includes(funV)) {
      out.push(aggApply(ctx, funV, els, false));
    } else
      fail(
        ctx,
        `mapply: FUN として使えるのは二項演算子と比較的単純な集計のみです："${funV}"`,
      );
  }
  const coerced = H.coerce(out);
  if (useNames && dataArgs.length) {
    const first = dataArgs[0];
    const nm = H.namesOf(first.value);
    const firstEls = argVecs[0];
    const names = Array.from({ length: n }, (_, i) => {
      const el = firstEls[i % Math.max(firstEls.length, 1)];
      if (nm && nm[i % nm.length] != null && nm[i % nm.length] !== "")
        return nm[i % nm.length];
      if (typeof el === "string") return el;
      return null;
    });
    if (names.some((x) => x !== null)) return H.withNames(coerced, names);
  }
  return coerced;
}
function applyFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["X", "MARGIN", "FUN", "simplify"], {
    dots: true,
    nameOnly: ["simplify"],
  });
  const X = b.req("X");
  if (!isDf(X)) fail(ctx, "dim(X) must have a positive length");
  const mEls = H.vec(b.req("MARGIN"));
  const margin = mEls[0];
  if (mEls.length !== 1 || (margin !== 1 && margin !== 2))
    fail(ctx, "apply: MARGIN は長さ1の 1 または 2 で指定してください");
  if (b.has("simplify") && !asLogicalScalar(ctx, b.val("simplify")))
    fail(ctx, "apply: simplify = FALSE はリストを返すため未対応です");
  const fun = funString(ctx, b, null);
  const naRm = dotsNaRm(ctx, b.dots, fun);
  const keys = Object.keys(X.columns);
  if (margin === 2) {
    const out = keys.map((k) => aggApply(ctx, fun, X.columns[k], naRm));
    return H.withNames(out, keys);
  }
  const n = H.dfNrow(X);
  const out = Array.from({ length: n }, (_, i) =>
    aggApply(ctx, fun, keys.map((k) => X.columns[k][i]), naRm),
  );
  if (Array.isArray(X.rowNames)) return H.withNames(out, [...X.rowNames]);
  return out;
}
function tableFn(ctx) {
  const H = ctx.H;
  let useNA = null,
    excludeGiven = false,
    excludeVal = undefined;
  const dataArgs = [];
  ctx.args.forEach((a, i) => {
    const v = ctx.vals[i];
    if (a.argName === "useNA") {
      useNA = H.vec(v)[0];
      return;
    }
    if (a.argName === "exclude") {
      excludeGiven = true;
      excludeVal = v;
      return;
    }
    if (a.argName === "dnn" || a.argName === "deparse.level") return;
    dataArgs.push(v);
  });
  if (!dataArgs.length)
    fail(ctx, "table: 数える対象がありません（nothing to tabulate）");
  if (dataArgs.length > 1)
    fail(
      ctx,
      "table: 複数ベクトルの分割表は表（行列）を返すため未対応です（1ベクトルのみ対応）",
    );
  let x = dataArgs[0];
  if (isDf(x)) {
    const keys = Object.keys(x.columns);
    if (keys.length !== 1)
      fail(ctx, "table: 複数列のデータフレームは未対応です");
    x = x.columns[keys[0]];
  }
  const els = x === null ? [] : H.vec(x);
  // NA と NaN は別水準（実 R 4.3.3 実測：水準の並びは通常水準→NaN→NA）。
  // "always" は NA 水準を常に（0件でも）出すが NaN 水準は実在時のみ。
  const hasNA = els.some((e) => H.isNA(e));
  const hasNaN = els.some((e) => H.isNaNVal(e));
  let showNA = false,
    showNaN = false;
  if (useNA === "always") {
    showNA = true;
    showNaN = hasNaN;
  } else if (useNA === "ifany") {
    showNA = hasNA;
    showNaN = hasNaN;
  } else if (useNA !== null && useNA !== "no")
    fail(ctx, `table: useNA が不正です："${String(useNA)}"`);
  if (useNA === null && excludeGiven) {
    if (excludeVal === null) {
      showNA = hasNA;
      showNaN = hasNaN;
    } else {
      const exEls = H.vec(excludeVal);
      const asText = [...els, ...exEls].some((e) => typeof e === "string");
      const exKeys = new Set(exEls.map((e) => matchKey(ctx, e, asText)));
      const kept = els.filter((e) => !exKeys.has(matchKey(ctx, e, asText)));
      return countTable(ctx, kept, {
        showNA: kept.some((e) => H.isNA(e)),
        showNaN: kept.some((e) => H.isNaNVal(e)),
      });
    }
  }
  return countTable(ctx, els, { showNA, showNaN });
}
function countTable(ctx, els, { showNA, showNaN }) {
  const H = ctx.H;
  const asText = els.some((e) => typeof e === "string");
  const counts = new Map();
  let naCount = 0,
    nanCount = 0;
  for (const el of els) {
    if (H.isNA(el)) {
      naCount++;
      continue;
    }
    if (H.isNaNVal(el)) {
      nanCount++;
      continue;
    }
    const key = matchKey(ctx, el, asText);
    if (!counts.has(key)) counts.set(key, { label: el, n: 0 });
    counts.get(key).n++;
  }
  const entries = [...counts.values()].sort((a, c) => {
    if (typeof a.label === "string" || typeof c.label === "string")
      return String(a.label) < String(c.label)
        ? -1
        : String(a.label) > String(c.label)
          ? 1
          : 0;
    return Number(a.label) - Number(c.label);
  });
  const out = entries.map((e) => e.n);
  const names = entries.map((e) => elemKey(ctx, e.label));
  if (showNaN) {
    out.push(nanCount);
    names.push("NaN");
  }
  if (showNA) {
    out.push(naCount);
    names.push(null);
  }
  if (!out.length) return [];
  return H.withNames(out, names);
}

// ================= 環境アクセス（シミュレータ状態への写像） =================
// 調査結論（報告書に詳述）：ハンドラの ctx.s がシミュレーション状態で、
// s.vars への読み書きは後続の評価（api.read の変数解決）と最終状態の
// 両方に一貫して反映される。したがって既定引数の範囲では assign／get／
// get0／exists／ls／objects を忠実に写像できる。envir／pos 等の環境
// 引数が指定された形は写像できないため名指し停止する。
const BASE_FUNCTION_NAMES = new Set(
  "c sum mean median sd length seq seq_len rep data.frame nrow ncol names is.na as.numeric as.character print cat readline read.csv rnorm runif sample sqrt abs log log10 log2 exp sin cos tan asin acos atan atan2 round floor ceiling trunc min max range sort rev order unique paste paste0 sprintf substr nchar toupper tolower sapply lapply apply mapply tapply vapply replicate list factor matrix array dim rownames colnames head tail summary plot".split(
    " ",
  ),
);
for (const n of advancedNames) BASE_FUNCTION_NAMES.add(n);
const RESERVED_NAMES = new Set([
  "TRUE", "FALSE", "NULL", "NA", "NA_integer_", "NA_real_", "NA_complex_",
  "NA_character_", "Inf", "NaN",
]);
function baseObject(ctx, name) {
  const H = ctx.H;
  switch (name) {
    case "TRUE":
    case "T":
      return { found: true, tag: "logical", value: true };
    case "FALSE":
    case "F":
      return { found: true, tag: "logical", value: false };
    case "NA":
    case "NA_integer_":
    case "NA_real_":
    case "NA_character_":
      return { found: true, tag: "logical", value: H.NA };
    case "NULL":
      return { found: true, tag: "NULL", value: null };
    case "Inf":
      return { found: true, tag: "double", value: Infinity };
    case "NaN":
      return { found: true, tag: "double", value: NaN };
    case "pi":
      return { found: true, tag: "double", value: Math.PI };
    case "letters":
      return {
        found: true,
        tag: "character",
        value: Array.from({ length: 26 }, (_, i) =>
          String.fromCharCode(97 + i),
        ),
      };
    case "LETTERS":
      return {
        found: true,
        tag: "character",
        value: Array.from({ length: 26 }, (_, i) =>
          String.fromCharCode(65 + i),
        ),
      };
    case "month.abb":
      return {
        found: true,
        tag: "character",
        value: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      };
    case "month.name":
      return {
        found: true,
        tag: "character",
        value: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      };
    default:
      return { found: false };
  }
}
function envNameArg(ctx, b) {
  const H = ctx.H;
  const v = b.req("x");
  const els = v === null ? [] : H.vec(v);
  if (els.length !== 1 || typeof els[0] !== "string")
    fail(ctx, "invalid first argument");
  return els[0];
}
function envGuard(ctx, b) {
  for (const k of ["envir", "pos", "where", "frame", "parent"])
    if (b.has(k))
      fail(ctx, `環境引数 ${k} はシミュレータに写像できないため未対応です`);
}
function lookupName(ctx, name, inherits = true) {
  const vars = ctx.s?.vars ?? {};
  if (Object.hasOwn(vars, name))
    return { found: true, tag: tagOf(ctx, vars[name]), value: vars[name], isVar: true };
  // 監査裁定（ADV-B4-audit-r）：inherits = FALSE のときは現在の環境だけを
  // 探し、組み込み定数・関数名は見つからないものとする（実 R 4.3.3 実測：
  // exists("pi", inherits = FALSE) == FALSE、get は object not found）。
  // 従来は inherits を無視して常に親（base）まで探し、誤った TRUE／値を
  // 返していたため是正した。
  if (!inherits) return { found: false };
  const base = baseObject(ctx, name);
  if (base.found) return base;
  if (BASE_FUNCTION_NAMES.has(name)) return { found: true, tag: "function" };
  return { found: false };
}
function existsFn(ctx) {
  const b = bindArgs(ctx, ["x", "where", "envir", "frame", "mode", "inherits"], {
    dots: true,
  });
  envGuard(ctx, b);
  const name = envNameArg(ctx, b);
  const mode = b.has("mode") ? String(ctx.H.vec(b.val("mode"))[0]) : "any";
  const inherits = b.has("inherits")
    ? asLogicalScalar(ctx, b.val("inherits"))
    : true;
  const hit = lookupName(ctx, name, inherits);
  if (!hit.found) return false;
  if (mode === "any") return true;
  if (mode === "function") return hit.tag === "function";
  if (hit.tag === "function") return false;
  const want =
    mode === "numeric" || mode === "integer" || mode === "double"
      ? "double"
      : mode;
  return hit.tag === want;
}
function getLike(ctx, isGet0) {
  const formals = isGet0
    ? ["x", "envir", "mode", "inherits", "ifnotfound", "pos"]
    : ["x", "pos", "envir", "mode", "inherits"];
  const b = bindArgs(ctx, formals, { dots: true });
  envGuard(ctx, b);
  const name = envNameArg(ctx, b);
  const mode = b.has("mode") ? String(ctx.H.vec(b.val("mode"))[0]) : "any";
  const inherits = b.has("inherits")
    ? asLogicalScalar(ctx, b.val("inherits"))
    : true;
  const hit = lookupName(ctx, name, inherits);
  const modeOk =
    hit.found &&
    (mode === "any" ||
      (mode === "function" && hit.tag === "function") ||
      (hit.tag !== "function" &&
        hit.tag ===
          (mode === "numeric" || mode === "integer" || mode === "double"
            ? "double"
            : mode)));
  if (!modeOk) {
    if (isGet0) return b.has("ifnotfound") ? b.val("ifnotfound") : null;
    fail(ctx, `object '${name}' not found`);
  }
  if (hit.tag === "function")
    fail(ctx, `get: 関数 "${name}" は関数オブジェクトとして返せないため未対応です`);
  return structuredClone(hit.value);
}
function assignFn(ctx) {
  const b = bindArgs(
    ctx,
    ["x", "value", "pos", "envir", "inherits", "immediate"],
    { dots: true },
  );
  envGuard(ctx, b);
  if (b.has("inherits") && asLogicalScalar(ctx, b.val("inherits")))
    fail(ctx, "assign: inherits = TRUE は親環境への代入になるため未対応です");
  const name = envNameArg(ctx, b);
  if (RESERVED_NAMES.has(name))
    fail(ctx, "invalid (do_set) left-hand side to assignment");
  const value = b.req("value");
  if (!ctx.s || typeof ctx.s !== "object" || !ctx.s.vars)
    fail(ctx, "assign: シミュレータの変数環境にアクセスできません");
  ctx.s.vars[name] = structuredClone(value);
  return value;
}
function lsFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(
    ctx,
    ["name", "pos", "envir", "all.names", "pattern", "sorted"],
    { dots: true },
  );
  envGuard(ctx, b);
  const allNames = b.has("all.names")
    ? asLogicalScalar(ctx, b.val("all.names"))
    : false;
  const sorted = b.has("sorted") ? asLogicalScalar(ctx, b.val("sorted")) : true;
  let names = Object.keys(ctx.s?.vars ?? {});
  if (!allNames) names = names.filter((n) => !n.startsWith("."));
  if (b.has("pattern")) {
    const pat = String(H.vec(b.val("pattern"))[0]);
    let re;
    try {
      re = new RegExp(pat);
    } catch {
      fail(ctx, `invalid regular expression '${pat}'`);
    }
    names = names.filter((n) => re.test(n));
  }
  if (sorted) names.sort();
  return names;
}
// ================= その他の型変換 =================
function strtoiFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "base"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "strtoi: データフレーム入力は未対応です");
  let base = 0;
  if (b.has("base")) {
    const bv = H.vec(b.val("base"))[0];
    if (typeof bv !== "number" || Number.isNaN(bv))
      fail(ctx, "strtoi: 'base' が不正です");
    base = Math.trunc(bv);
    if (base !== 0 && (base < 2 || base > 36))
      fail(ctx, "strtoi: 'base' は 0 または 2〜36 で指定してください");
  }
  const strs = toCharEls(ctx, H.vec(x));
  return strs.map((s) => {
    if (H.isNA(s)) return H.NA;
    // 監査裁定（ADV-B4-audit-r）：実 R 4.3.3 の strtoi は先行空白だけを
    // 読み飛ばし、末尾の空白・余分な文字があると NA になる
    // （strtoi(" 42")==42、strtoi("42 ")==NA を実測）。両端 trim は誤り。
    let t = String(s).replace(/^\s+/, "");
    let sign = 1;
    if (t.startsWith("+")) t = t.slice(1);
    else if (t.startsWith("-")) {
      sign = -1;
      t = t.slice(1);
    }
    let bse = base;
    if (bse === 0) {
      if (/^0[xX]/.test(t)) {
        bse = 16;
        t = t.slice(2);
      } else if (t.length > 1 && t.startsWith("0")) bse = 8;
      else bse = 10;
    } else if (bse === 16 && /^0[xX]/.test(t)) t = t.slice(2);
    if (!t) return H.NA;
    const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
    let val = 0;
    for (const ch of t.toLowerCase()) {
      const d = digits.indexOf(ch);
      if (d < 0 || d >= bse) return H.NA;
      val = val * bse + d;
      if (val > 2147483647) return H.NA;
    }
    return sign * val;
  });
}
function vectorFn(ctx) {
  const b = bindArgs(ctx, ["mode", "length"]);
  const mode = b.has("mode")
    ? String(ctx.H.vec(b.val("mode"))[0])
    : "logical";
  const n = b.has("length") ? asCount(ctx, b.val("length")) : 0;
  const fillFor = {
    logical: false,
    numeric: 0,
    double: 0,
    integer: 0,
    single: 0,
    character: "",
  };
  if (!Object.hasOwn(fillFor, mode)) {
    if (["list", "raw", "complex", "expression", "pairlist"].includes(mode))
      fail(
        ctx,
        `vector: mode = "${mode}" は値モデルに無い型のため未対応です`,
      );
    fail(ctx, `vector: cannot make a vector of mode '${mode}'.`);
  }
  return Array.from({ length: n }, () => fillFor[mode]);
}
function asVectorFn(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "mode"]);
  const x = b.req("x");
  const mode = b.has("mode") ? String(H.vec(b.val("mode"))[0]) : "any";
  if (mode === "any") {
    if (isDf(x))
      fail(ctx, "as.vector: データフレームはリストとして返るため未対応です");
    if (x === null) return null;
    return [...H.vec(x)]; // 名前属性は取り除かれる
  }
  if (isDf(x))
    fail(ctx, "as.vector: データフレームはリストとして返るため未対応です");
  const fakeCtx = { ...ctx, vals: [x], args: [{ argName: "x" }] };
  switch (mode) {
    case "double":
    case "numeric":
      return asDoubleImpl(fakeCtx);
    case "integer":
      return asIntegerImpl(fakeCtx);
    case "logical":
      return asLogicalImpl(fakeCtx);
    case "character": {
      if (x === null) return [];
      return toCharEls(ctx, H.vec(x)).map((e) => e);
    }
    default:
      fail(ctx, `as.vector: mode = "${mode}" は値モデルに無い型のため未対応です`);
  }
}
function asNullFn(ctx) {
  const b = bindArgs(ctx, ["x"], { dots: true });
  b.req("x");
  return null;
}

// ================= 登録 =================
export const builtins = new Map([
  // 型判定・型情報
  ["typeof", typeofFn],
  ["mode", modeFn],
  ["storage.mode", storageModeFn],
  ["class", classFn],
  ["is.numeric", typePred((c, v) => tagOf(c, v) === "double")],
  ["is.double", typePred((c, v) => tagOf(c, v) === "double")],
  ["is.integer", typePred(() => false)], // モデルに integer 型は無い
  ["is.character", typePred((c, v) => tagOf(c, v) === "character")],
  ["is.logical", typePred((c, v) => tagOf(c, v) === "logical")],
  ["is.list", typePred((c, v) => tagOf(c, v) === "list")],
  ["is.data.frame", typePred((c, v) => isDf(v))],
  ["is.vector", typePred((c, v) => ["logical", "double", "character"].includes(tagOf(c, v)))],
  ["is.atomic", typePred((c, v) => tagOf(c, v) !== "list")],
  ["is.recursive", typePred((c, v) => tagOf(c, v) === "list")],
  ["is.null", typePred((c, v) => v === null)],
  ["is.array", typePred(() => false)], // dim 属性を持つ値はモデルに無い
  ["is.matrix", typePred(() => false)],
  ["is.factor", typePred(() => false)], // 因子はモデルに無い
  ["is.ordered", typePred(() => false)],
  // 型変換・コンストラクタ
  ["numeric", ctor("numeric")],
  ["double", ctor("numeric")],
  ["single", ctor("numeric")],
  ["integer", ctor("numeric")],
  ["character", ctor("character")],
  ["logical", ctor("logical")],
  ["vector", vectorFn],
  ["as.double", asDoubleImpl],
  ["as.single", asDoubleImpl],
  ["as.integer", asIntegerImpl],
  ["as.logical", asLogicalImpl],
  ["as.null", asNullFn],
  ["as.vector", asVectorFn],
  ["strtoi", strtoiFn],
  // ベクトル・データフレーム操作
  ["append", appendFn],
  ["lengths", lengthsFn],
  ["NROW", nrowFn("NROW")],
  ["NCOL", nrowFn("NCOL")],
  ["dim", dimFn],
  ["colnames", colnamesFn],
  ["rownames", rownamesFn],
  ["getElement", getElementFn],
  ["drop", (ctx) => bindArgs(ctx, ["x"]).req("x")],
  ["identity", (ctx) => bindArgs(ctx, ["x"]).req("x")],
  ["levels", (ctx) => (bindArgs(ctx, ["x"]).req("x"), null)],
  ["ifelse", ifelseFn],
  ["is.unsorted", isUnsortedFn],
  ["cbind", cbindFn],
  ["rbind", rbindFn],
  ["merge", mergeFn],
  ["expand.grid", expandGridFn],
  ["colSums", colRowSumsFn(true, false)],
  ["rowSums", colRowSumsFn(false, false)],
  ["colMeans", colRowSumsFn(true, true)],
  ["rowMeans", colRowSumsFn(false, true)],
  ["sweep", sweepFn],
  ["scale", scaleFn],
  ["rowsum", rowsumFn],
  ["tabulate", tabulateFn],
  ["proportions", proportionsFn],
  ["prop.table", proportionsFn],
  ["unlist", unlistFn],
  // 適用・グループ化
  ["tapply", tapplyFn],
  ["table", tableFn],
  ["sapply", (ctx) => sapplyLike(ctx, false)],
  ["vapply", (ctx) => sapplyLike(ctx, true)],
  ["mapply", mapplyFn],
  ["apply", applyFn],
  // 環境アクセス
  ["assign", assignFn],
  ["get", (ctx) => getLike(ctx, false)],
  ["get0", (ctx) => getLike(ctx, true)],
  ["exists", existsFn],
  ["ls", lsFn],
  ["objects", lsFn],
]);
