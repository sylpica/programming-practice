// 高度モード B4：R 高度関数グループ「数値・数学・集計」（高度差分）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 意味論は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3 の実測で裁定した
// （報告書 docs/audit/ADV-B4-r-eng1.md に根拠を記録）。
// 値モデルに無い型（因子・行列・リスト）を返す関数は登録しない。

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
  // 完全名の重複は実 R どおり multiple matched で停止する。
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
  const result = new Map(); // formal -> {present, value}
  const dotList = []; // {name, value}
  if (hasPartial && hasPositional) {
    // 実 R の照合順（完全名→部分一致→位置）を手作業で再現する。
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
    // nameOnly 仮引数は名前でのみ埋まる。
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

// ---- スカラー引数の解釈（基礎層 parseNaRm13 と同じ規則）
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
function asScalarNum(ctx, v, label) {
  const els = v === null || v === undefined ? [] : ctx.H.vec(v);
  if (els.length !== 1)
    fail(ctx, `'${label}' must be of length 1`);
  const el = els[0];
  if (ctx.H.isNA(el)) return NaN;
  if (typeof el === "number") return el;
  if (typeof el === "boolean") return el ? 1 : 0;
  if (typeof el === "string" && el.trim() !== "" && !Number.isNaN(Number(el)))
    return Number(el);
  fail(ctx, `'${label}' must be a finite number`);
}

// 数値ベクトル化：logical は数値化、character は数学関数ではエラー（実 R の
// "non-numeric argument to mathematical function"）。coerceStrings=true の
// 系（cum 系・which.min 等）は as.numeric 相当の変換＋警告にする。
function numVec(ctx, v, { coerceStrings = false, dfMsg } = {}) {
  const H = ctx.H;
  if (isDf(v)) fail(ctx, dfMsg ?? "データフレームはこの関数の対象外です");
  if (v === null) return { els: [], coercedNA: false };
  let coercedNA = false;
  const els = H.vec(v).map((el) => {
    if (H.isNA(el)) return H.NA;
    if (typeof el === "number") return el;
    if (typeof el === "boolean") return el ? 1 : 0;
    if (typeof el === "string") {
      if (!coerceStrings)
        fail(ctx, "non-numeric argument to mathematical function");
      const t = el.trim();
      const n = t === "" ? NaN : Number(t);
      if (Number.isNaN(n) && t !== "NaN") {
        coercedNA = true;
        return H.NA;
      }
      return n;
    }
    fail(ctx, "non-numeric argument to mathematical function");
  });
  return { els, coercedNA };
}

// 2引数のリサイクリング（基礎層の二項演算と同じ警告文言）。
function recycle2(ctx, a, b) {
  const H = ctx.H;
  const n = Math.max(a.length, b.length);
  if (!a.length || !b.length) return { n: 0, av: [], bv: [] };
  if (n % Math.min(a.length, b.length) !== 0)
    warn(
      ctx,
      "長いオブジェクトの長さが短いオブジェクトの長さの倍数になっていません（longer object length is not a multiple of shorter object length）",
    );
  return {
    n,
    av: Array.from({ length: n }, (_, i) => a[i % a.length]),
    bv: Array.from({ length: n }, (_, i) => b[i % b.length]),
  };
}
function recycleNames(H, a, b, n) {
  if (a.length === n && H.namesOf(a)) return H.namesOf(a);
  if (b.length === n && H.namesOf(b)) return H.namesOf(b);
  return null;
}

// ---- 丸めの核：R 本体 fround.c（R 4.x）のアルゴリズムを double 演算で
// そのまま再現する。digits の整数化は floor(digits + 0.5)、本体は
// x*10^dig の floor／ceil を x との距離で比べ、同点では i10 が奇数の
// ときだけ切り上げる（IEC 60559 の偶数丸め）。実 R 4.3.3 実測と一致：
// round(0.15,1)=0.1、round(2.675,2)=2.67、round(0.05,1)=0、
// round(0.65,1)=0.7、round(123.65,1)=123.7。
function rint(v) {
  if (!Number.isFinite(v)) return v;
  const f = Math.floor(v);
  const d = v - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}
function logbOf(v) {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, Math.abs(v));
  const expBits = (buf.getUint32(0) >>> 20) & 0x7ff;
  if (expBits === 0) return Math.floor(Math.log2(Math.abs(v)));
  return expBits - 1023;
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
  const l10x = 0.3010299956639812 * (0.5 + logbOf(x)); // M_LOG10_2 * (0.5 + logb(x))
  if (l10x + dig > 15) return v; // DBL_DIG
  let pow10;
  let x10;
  let i10;
  let xd;
  let xu;
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
// signif は実 R 4.3.3 実測で round と異なり10進表示（15有効桁）に対する
// 偶数丸めになる（signif(0.15,1)=0.2、signif(0.25,1)=0.2）。
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
      else up = head[d - 1] % 2 === 1; // ちょうど半分は偶数へ
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

// ---- gamma 系（Lanczos 近似 g=7。反射公式で負域を扱う。
// 整数・半整数は実 R と一致しやすいよう直接経路で計算する：gamma(5)=24、
// gamma(0.5)=sqrt(pi)、gamma(-0.5)=-2*sqrt(pi) が double まで一致する）
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
function lgammaAbs(v) {
  // log|gamma(v)|。v は非整数（整数の極は呼び出し側で処理）。
  if (Number.isInteger(v) && v >= 1) {
    if (v <= 171) {
      let p = 1;
      for (let i = 2; i < v; i++) p *= i;
      return Math.log(p);
    }
    let s = 0;
    for (let i = 2; i < v; i++) s += Math.log(i);
    return s;
  }
  if (Number.isInteger(v - 0.5)) {
    // 半整数：gamma(0.5) = sqrt(pi) から漸化（符号は絶対値側で落とす）。
    let s = 0.5 * Math.log(Math.PI);
    let cur = 0.5;
    if (v > 0.5) {
      while (cur < v) {
        s += Math.log(cur);
        cur += 1;
      }
    } else {
      while (cur > v) {
        cur -= 1;
        s -= Math.log(Math.abs(cur));
      }
    }
    return s;
  }
  if (v < 0.5)
    return (
      Math.log(Math.PI) -
      Math.log(Math.abs(Math.sin(Math.PI * v))) -
      lgammaAbs(1 - v)
    );
  const z = v - 1;
  let x = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
const isNegIntOrZero = (v) => Number.isInteger(v) && v <= 0;
function gammaSign(v) {
  // gamma(v) の符号（v>0 は正、v<0 は sin(pi v) の符号、極では 0）
  if (isNegIntOrZero(v)) return 0;
  if (v > 0) return 1;
  return Math.sign(Math.sin(Math.PI * v));
}
function gammaOne(v, flags) {
  if (Number.isNaN(v)) return NaN;
  if (isNegIntOrZero(v)) {
    flags.nan = true;
    return NaN;
  }
  if (v === Infinity) return Infinity;
  if (v === -Infinity) return NaN;
  if (Number.isInteger(v) && v >= 1) {
    if (v >= 172) {
      flags.range = true;
      return Infinity;
    }
    let p = 1;
    for (let i = 2; i < v; i++) p *= i;
    return p;
  }
  if (Number.isInteger(v - 0.5)) {
    // 半整数：sqrt(pi) を種に漸化する。
    let p = Math.sqrt(Math.PI);
    let cur = 0.5;
    if (v > 0.5) {
      while (cur < v) {
        p *= cur;
        cur += 1;
      }
    } else {
      while (cur > v) {
        cur -= 1;
        p /= cur;
      }
    }
    return p;
  }
  const lg = lgammaAbs(v);
  if (lg > 709.78) {
    flags.range = true;
    return Infinity;
  }
  return gammaSign(v) * Math.exp(lg);
}
function lgammaOne(v) {
  if (Number.isNaN(v)) return NaN;
  if (isNegIntOrZero(v)) return Infinity;
  if (v === Infinity) return Infinity;
  if (v === -Infinity) return NaN;
  return lgammaAbs(v);
}

// ---- 要素ごとの1引数数学関数
function math1(fn, warnText) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["x"]);
    const x = b.req("x");
    if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
    const { els } = numVec(ctx, x);
    let produced = false;
    const out = els.map((el) => {
      if (H.isNA(el)) return H.NA;
      const r = fn(el);
      if (Number.isNaN(r) && !Number.isNaN(el)) produced = true;
      return r;
    });
    if (produced) warn(ctx, warnText ?? "NaNが生成されました（NaNs produced）");
    return H.withNames(out, H.namesOf(x));
  };
}
const gammaHandler = (useLog) => (ctx) => {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
  const { els } = numVec(ctx, x);
  const flags = { nan: false, range: false };
  const out = els.map((el) => {
    if (H.isNA(el)) return H.NA;
    return useLog ? lgammaOne(el) : gammaOne(el, flags);
  });
  if (flags.nan) warn(ctx, "NaNが生成されました（NaNs produced）");
  if (flags.range)
    warn(ctx, "値が範囲外です（value out of range in 'gammafn'）");
  return H.withNames(out, H.namesOf(x));
};

// ---- 2引数でリサイクルする要素関数
function math2(formals, fn, warnText) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, formals);
    const va = b.req(formals[0]);
    const vb = b.req(formals[1]);
    if (isDf(va) || isDf(vb))
      fail(ctx, "データフレームはこの関数の対象外です");
    const a = numVec(ctx, va).els;
    const c = numVec(ctx, vb).els;
    const { n, av, bv } = recycle2(ctx, a, c);
    let produced = false;
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = av[i];
      const w = bv[i];
      if (H.isNA(u) || H.isNA(w)) {
        out.push(H.NA);
        continue;
      }
      const r = fn(u, w);
      if (Number.isNaN(r) && !Number.isNaN(u) && !Number.isNaN(w))
        produced = true;
      out.push(r);
    }
    if (produced) warn(ctx, warnText ?? "NaNが生成されました（NaNs produced）");
    return H.withNames(out, recycleNames(H, va, vb, n));
  };
}

function logCore(v, base) {
  if (base === 2) return Math.log2(v);
  if (base === 10) return Math.log10(v);
  if (base === Math.E) return Math.log(v);
  return Math.log(v) / Math.log(base);
}
function logHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "base"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
  const a = numVec(ctx, x).els;
  const baseRaw = b.has("base") ? b.val("base") : Math.E;
  if (isDf(baseRaw)) fail(ctx, "non-numeric argument to mathematical function");
  const bases = numVec(ctx, baseRaw).els;
  const { n, av, bv } = recycle2(ctx, a, bases);
  let produced = false;
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = av[i];
    const w = bv[i];
    if (H.isNA(u) || H.isNA(w)) {
      out.push(H.NA);
      continue;
    }
    const r = logCore(u, w);
    if (Number.isNaN(r) && !Number.isNaN(u)) produced = true;
    out.push(r);
  }
  if (produced) warn(ctx, "NaNが生成されました（NaNs produced）");
  return H.withNames(out, recycleNames(H, x, baseRaw, n));
}

// ---- Round 系
function digitsVec(ctx, b, def) {
  if (!b.has("digits")) return null;
  const raw = b.val("digits");
  if (raw === null) fail(ctx, "invalid digits");
  const els = ctx.H.vec(raw);
  if (!els.length) fail(ctx, "invalid digits");
  return els.map((el) => {
    if (ctx.H.isNA(el) || ctx.H.isNaNVal(el)) return NaN;
    if (typeof el === "string")
      fail(ctx, "non-numeric argument to mathematical function");
    // 整数化は roundCore 側（fround の floor(digits + 0.5)）で行う。
    return Number(el);
  });
}
function roundHandler(signifMode) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["x", "digits"]);
    const x = b.req("x");
    if (isDf(x)) fail(ctx, "non-numeric argument to mathematical function");
    const { els } = numVec(ctx, x);
    let digs = digitsVec(ctx, b, signifMode ? 6 : 0);
    if (!digs) digs = [signifMode ? 6 : 0];
    const out = els.map((el, i) => {
      if (H.isNA(el)) return H.NA;
      const d = digs[i % digs.length];
      if (Number.isNaN(d)) return H.NA;
      if (signifMode) {
        const dc = Math.min(22, Math.max(1, Math.trunc(d)));
        return signifCore(el, dc);
      }
      return roundCore(el, d);
    });
    return H.withNames(out, H.namesOf(x));
  };
}
function floorCeilHandler(name, fn) {
  return (ctx) => {
    const H = ctx.H;
    // 実 R 4.3.3 実測：floor(1.5, 2) は
    // "2 arguments passed to 'floor' which requires 1" で停止する。
    if (ctx.args.length > 1)
      fail(
        ctx,
        `${ctx.args.length} arguments passed to '${name}' which requires 1`,
      );
    const b = bindArgs(ctx, ["x"]);
    const x = b.req("x");
    if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
    const { els } = numVec(ctx, x);
    const out = els.map((el) => (H.isNA(el) ? H.NA : fn(el)));
    return H.withNames(out, H.namesOf(x));
  };
}

// ---- Special 系（beta／choose は2引数）
function betaOne(u, w, flags, useLog) {
  if (Number.isNaN(u) || Number.isNaN(w)) return NaN;
  const pole = (v) => isNegIntOrZero(v);
  if (pole(u) || pole(w) || pole(u + w)) {
    if ((u === 0 && w > 0 && !pole(w)) || (w === 0 && u > 0 && !pole(u)))
      return useLog ? Infinity : Infinity;
    flags.nan = true;
    return NaN;
  }
  const lg = lgammaAbs(u) + lgammaAbs(w) - lgammaAbs(u + w);
  if (useLog) return lg;
  const s = gammaSign(u) * gammaSign(w) * gammaSign(u + w);
  if (lg > 709.78) return s > 0 ? Infinity : -Infinity;
  return s * Math.exp(lg);
}
function chooseOne(u, w, flags, useLog) {
  if (Number.isNaN(u) || Number.isNaN(w)) return NaN;
  let k = w;
  if (!Number.isInteger(k)) {
    const rk = rint(k);
    warn(
      flags.ctx,
      `'k' (${k.toFixed(2)}) must be integer, rounded to ${rk}`,
    );
    k = rk;
  }
  if (k < 0) return useLog ? -Infinity : 0;
  if (Number.isInteger(u)) {
    if (u >= 0 && k > u) return useLog ? -Infinity : 0;
    // 整数 n に対する積形式（負の n の一般化二項係数もこの形で一致する）。
    let p = 1;
    for (let i = 1; i <= k; i++) {
      p *= (u - i + 1) / i;
      if (!Number.isFinite(p) && !useLog) break;
    }
    if (useLog) {
      if (p === 0) return -Infinity;
      if (!Number.isFinite(p)) {
        let s = 0;
        for (let i = 1; i <= k; i++) s += Math.log(Math.abs((u - i + 1) / i));
        return s;
      }
      return Math.log(Math.abs(p));
    }
    return p;
  }
  // 非整数 n は gamma 形式（実 R 4.3.3 実測 choose(2.5,3)=0.3125 と一致）。
  const lc = lgammaAbs(u + 1) - lgammaAbs(k + 1) - lgammaAbs(u - k + 1);
  if (useLog) return lc;
  const s = gammaSign(u + 1) * gammaSign(k + 1) * gammaSign(u - k + 1);
  return s * Math.exp(lc);
}
function special2(kind) {
  return (ctx) => {
    const H = ctx.H;
    const formals = kind === "beta" || kind === "lbeta" ? ["a", "b"] : ["n", "k"];
    const b = bindArgs(ctx, formals);
    const va = b.req(formals[0]);
    const vb = b.req(formals[1]);
    if (isDf(va) || isDf(vb))
      fail(ctx, "データフレームはこの関数の対象外です");
    const a = numVec(ctx, va).els;
    const c = numVec(ctx, vb).els;
    const { n, av, bv } = recycle2(ctx, a, c);
    const flags = { nan: false, ctx };
    const useLog = kind === "lbeta" || kind === "lchoose";
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = av[i];
      const w = bv[i];
      if (H.isNA(u) || H.isNA(w)) {
        out.push(H.NA);
        continue;
      }
      out.push(
        kind === "beta" || kind === "lbeta"
          ? betaOne(u, w, flags, useLog)
          : chooseOne(u, w, flags, useLog),
      );
    }
    if (flags.nan) warn(ctx, "NaNが生成されました（NaNs produced）");
    return H.withNames(out, recycleNames(H, va, vb, n));
  };
}

// ---- Summary 系
function dotsValues(ctx, b) {
  // `...` の各引数を要素へ展開する（NULL は要素なし）。
  const out = [];
  for (const d of b.dots) {
    if (d.value === null) continue;
    if (isDf(d.value))
      fail(ctx, "データフレームはこの関数の対象外です");
    out.push(...ctx.H.vec(d.value));
  }
  return out;
}
function summaryExtreme(kind) {
  // min／max：実 R 4.3.3 実測（NA があれば NA、無ければ NaN があれば NaN、
  // 空集合は min=Inf／max=-Inf＋警告、character は辞書順、logical は数値）。
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, [], { dots: true, nameOnly: ["na.rm"] });
    const naRm = b.has("na.rm") ? asLogical(ctx, b.val("na.rm"), "na.rm") : false;
    const raw = dotsValues(ctx, b);
    const els = H.coerce(raw.slice());
    const isChar = els.some((v) => typeof v === "string");
    let pool = els;
    if (!naRm) {
      if (pool.some((v) => H.isNA(v))) return H.NA;
      if (!isChar && pool.some((v) => H.isNaNVal(v))) return NaN;
    } else pool = pool.filter((v) => !H.isNA(v) && !H.isNaNVal(v));
    if (!pool.length) {
      if (isChar || raw.some((v) => typeof v === "string")) {
        warn(
          ctx,
          `非欠損の引数がありません。NAを返します（no non-missing arguments, returning NA）`,
        );
        return H.NA;
      }
      warn(
        ctx,
        kind === "min"
          ? "非欠損の引数がありません。Infを返します（no non-missing arguments to min; returning Inf）"
          : "非欠損の引数がありません。-Infを返します（no non-missing arguments to max; returning -Inf）",
      );
      return kind === "min" ? Infinity : -Infinity;
    }
    if (isChar) {
      const strs = pool.map((v) => String(v));
      return kind === "min"
        ? strs.reduce((p, q) => (q < p ? q : p))
        : strs.reduce((p, q) => (q > p ? q : p));
    }
    const nums = pool.map((v) => Number(v));
    return kind === "min" ? Math.min(...nums) : Math.max(...nums);
  };
}
function rangeHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, [], {
    dots: true,
    nameOnly: ["na.rm", "finite"],
  });
  const naRm = b.has("na.rm") ? asLogical(ctx, b.val("na.rm"), "na.rm") : false;
  const finite = b.has("finite")
    ? asLogical(ctx, b.val("finite"), "finite")
    : false;
  const raw = dotsValues(ctx, b);
  const els = H.coerce(raw.slice());
  const isChar = els.some((v) => typeof v === "string");
  if (isChar) {
    if (els.some((v) => H.isNA(v))) return [H.NA, H.NA];
    const strs = els.map((v) => String(v));
    if (!strs.length) return [H.NA, H.NA];
    return [
      strs.reduce((p, q) => (q < p ? q : p)),
      strs.reduce((p, q) => (q > p ? q : p)),
    ];
  }
  let pool = els.map((v) => (H.isNA(v) ? H.NA : Number(v)));
  if (!naRm) {
    if (pool.some((v) => H.isNA(v))) return [H.NA, H.NA];
    if (pool.some((v) => H.isNaNVal(v))) return [NaN, NaN];
  } else pool = pool.filter((v) => !H.isNA(v) && !H.isNaNVal(v));
  if (finite) pool = pool.filter((v) => Number.isFinite(v));
  if (!pool.length) {
    warn(
      ctx,
      "非欠損の引数がありません。Infを返します（no non-missing arguments to min; returning Inf）",
    );
    warn(
      ctx,
      "非欠損の引数がありません。-Infを返します（no non-missing arguments to max; returning -Inf）",
    );
    return [Infinity, -Infinity];
  }
  return [Math.min(...pool), Math.max(...pool)];
}
function prodHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, [], { dots: true, nameOnly: ["na.rm"] });
  const naRm = b.has("na.rm") ? asLogical(ctx, b.val("na.rm"), "na.rm") : false;
  const raw = dotsValues(ctx, b);
  if (raw.some((v) => typeof v === "string"))
    fail(ctx, "invalid 'type' (character) of argument");
  let pool = raw;
  if (!naRm) {
    if (pool.some((v) => H.isNA(v))) return H.NA;
    if (pool.some((v) => H.isNaNVal(v))) return NaN;
  } else pool = pool.filter((v) => !H.isNA(v) && !H.isNaNVal(v));
  let p = 1;
  for (const v of pool) p *= Number(v);
  return p;
}
function cumHandler(kind) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["x"]);
    const x = b.req("x");
    if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
    const { els, coercedNA } = numVec(ctx, x, { coerceStrings: true });
    if (coercedNA)
      warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
    const out = [];
    let state = kind === "cumsum" || kind === "cumprod" ? null : null;
    let acc = kind === "cumprod" ? 1 : kind === "cumsum" ? 0 : null;
    let missing = null; // null | "NA" | "NaN"（一度欠損したら以降は欠損）
    for (const el of els) {
      if (H.isNA(el)) missing = "NA";
      else if (H.isNaNVal(el) && missing !== "NA") missing = "NaN";
      if (missing === "NA") {
        out.push(H.NA);
        continue;
      }
      if (missing === "NaN") {
        out.push(NaN);
        continue;
      }
      if (kind === "cumsum") acc += el;
      else if (kind === "cumprod") acc *= el;
      else if (kind === "cummax") acc = acc === null ? el : Math.max(acc, el);
      else acc = acc === null ? el : Math.min(acc, el);
      out.push(acc);
    }
    return H.withNames(out, H.namesOf(x));
  };
}
function diffHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "lag", "differences"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
  const rawEls = x === null ? [] : H.vec(x);
  if (rawEls.some((v) => typeof v === "string"))
    fail(ctx, "non-numeric argument to binary operator");
  const { els } = numVec(ctx, x);
  const lag = b.has("lag") ? asScalarNum(ctx, b.val("lag"), "lag") : 1;
  const differences = b.has("differences")
    ? asScalarNum(ctx, b.val("differences"), "differences")
    : 1;
  if (!Number.isInteger(lag) || lag < 1)
    fail(ctx, "'lag' must be a non-negative integer");
  if (!Number.isInteger(differences) || differences < 1)
    fail(ctx, "'differences' must be a non-negative integer");
  let cur = els;
  let names = H.namesOf(x);
  for (let d = 0; d < differences; d++) {
    const nxt = [];
    for (let i = lag; i < cur.length; i++) {
      const u = cur[i];
      const w = cur[i - lag];
      nxt.push(H.isNA(u) || H.isNA(w) ? H.NA : u - w);
    }
    cur = nxt;
    if (names) names = names.slice(lag);
  }
  return H.withNames(cur, names);
}
function pExtreme(kind) {
  // pmax／pmin（.int は名前属性を落とす）。実 R 4.3.3 実測：character も可、
  // 名前は第1引数から、na.rm=TRUE でも全て欠損なら NA。
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, [], { dots: true, nameOnly: ["na.rm"] });
    const naRm = b.has("na.rm") ? asLogical(ctx, b.val("na.rm"), "na.rm") : false;
    const vecs = [];
    for (const d of b.dots) {
      if (d.value === null) {
        vecs.push([]);
        continue;
      }
      if (isDf(d.value)) fail(ctx, "データフレームはこの関数の対象外です");
      vecs.push(H.vec(d.value));
    }
    if (!vecs.length) return [];
    const n = Math.max(...vecs.map((v) => v.length));
    if (vecs.some((v) => !v.length)) return [];
    for (const v of vecs)
      if (n % v.length !== 0)
        warn(
          ctx,
          "長いオブジェクトの長さが短いオブジェクトの長さの倍数になっていません（longer object length is not a multiple of shorter object length）",
        );
    const flatAll = vecs.flat();
    const isChar = flatAll.some((v) => typeof v === "string");
    const conv = (v) =>
      H.isNA(v)
        ? H.NA
        : isChar
          ? typeof v === "string"
            ? v
            : typeof v === "boolean"
              ? v
                ? "TRUE"
                : "FALSE"
              : H.formatRNum(v)
          : Number(v);
    const out = [];
    for (let i = 0; i < n; i++) {
      const col = vecs.map((v) => conv(v[i % v.length]));
      if (!naRm) {
        if (col.some((v) => H.isNA(v))) {
          out.push(H.NA);
          continue;
        }
        if (!isChar && col.some((v) => H.isNaNVal(v))) {
          out.push(NaN);
          continue;
        }
      }
      const pool = naRm
        ? col.filter((v) => !H.isNA(v) && !H.isNaNVal(v))
        : col;
      if (!pool.length) {
        out.push(col.some((v) => H.isNA(v)) ? H.NA : NaN);
        continue;
      }
      out.push(
        pool.reduce((p, q) =>
          kind.startsWith("pmax") ? (q > p ? q : p) : q < p ? q : p,
        ),
      );
    }
    if (kind.endsWith(".int")) return out;
    const first = b.dots.find((d) => d.value !== null)?.value;
    const fn = first !== undefined ? H.namesOf(first) : null;
    if (fn)
      return H.withNames(
        out,
        Array.from({ length: n }, (_, i) => fn[i % fn.length]),
      );
    return out;
  };
}

// ---- sort／order／rank／rev
function coerceForSort(H, els) {
  return H.coerce(els.slice());
}
function cmpVal(u, w) {
  if (typeof u === "string" && typeof w === "string")
    return u < w ? -1 : u > w ? 1 : 0;
  const a = Number(u);
  const c = Number(w);
  return a < c ? -1 : a > c ? 1 : 0;
}
function parseNaLast(ctx, v, def) {
  if (v === undefined) return def;
  if (v === null) fail(ctx, "argument is of length zero");
  const el = ctx.H.vec(v)[0];
  if (ctx.H.isNA(el)) return null; // NA は「除去」
  return asLogical(ctx, v, "na.last");
}
function sortCore(ctx, x, decreasing, naLast) {
  const H = ctx.H;
  // CONV-A4是正：sort(NULL)／sort.int(NULL) は実 R では NULL を返す
  // （実 R 4.3.3 実測。NULL を空ベクトルに潰すと is.null が FALSE に
  // なり、print も c() と表示されて実 R と食い違う）。
  if (x === null) return null;
  if (isDf(x)) fail(ctx, "cannot xtfrm data frames");
  const raw = H.vec(x);
  const els = coerceForSort(H, raw);
  const names = H.namesOf(x);
  const items = els.map((el, i) => ({ el, name: names ? names[i] : null }));
  const missing = items.filter((it) => H.isMissing(it.el));
  const present = items.filter((it) => !H.isMissing(it.el));
  present.sort((p, q) => {
    const c = cmpVal(p.el, q.el);
    return decreasing ? -c : c;
  });
  const ordered =
    naLast === null
      ? present
      : naLast
        ? [...present, ...missing]
        : [...missing, ...present];
  const out = ordered.map((it) => it.el);
  if (names) return H.withNames(out, ordered.map((it) => it.name));
  return out;
}
function sortHandler(ctx) {
  const b = bindArgs(ctx, ["x", "decreasing"], { dots: true });
  const x = b.req("x");
  const decreasing = b.has("decreasing")
    ? asLogical(ctx, b.val("decreasing"), "decreasing")
    : false;
  let naLast = null; // sort の既定は na.last = NA（除去）
  for (const d of b.dots) {
    if (d.name === "na.last") naLast = parseNaLast(ctx, d.value, null);
    else if (d.name === "method") {
      const mv = ctx.H.vec(d.value)[0];
      if (typeof mv !== "string" || !mv || !["auto", "shell", "quick", "radix"].some((m) => m.startsWith(mv)))
        fail(ctx, "invalid 'method' argument");
    } else if (d.name === null)
      fail(ctx, `unused argument (${ctx.H.show(d.value)})`);
    else fail(ctx, `unused argument (${d.name} = ${ctx.H.show(d.value)})`);
  }
  return sortCore(ctx, x, decreasing, naLast);
}
function sortIntHandler(ctx) {
  const b = bindArgs(ctx, [
    "x",
    "partial",
    "na.last",
    "decreasing",
    "method",
    "index.return",
  ]);
  const x = b.req("x");
  if (b.has("partial") && b.val("partial") !== null)
    fail(
      ctx,
      "sort.int の partial（部分ソート）は説明に対応していません",
    );
  if (
    b.has("index.return") &&
    asLogical(ctx, b.val("index.return"), "index.return")
  )
    fail(
      ctx,
      "sort.int の index.return = TRUE はリストを返すため説明に対応していません",
    );
  if (b.has("method")) {
    const mv = ctx.H.vec(b.val("method"))[0];
    if (
      typeof mv !== "string" ||
      !mv ||
      !["auto", "shell", "quick", "radix"].some((m) => m.startsWith(mv))
    )
      fail(ctx, "invalid 'method' argument");
  }
  const decreasing = b.has("decreasing")
    ? asLogical(ctx, b.val("decreasing"), "decreasing")
    : false;
  const naLast = b.has("na.last")
    ? parseNaLast(ctx, b.val("na.last"), null)
    : null;
  return sortCore(ctx, x, decreasing, naLast);
}
function orderCore(ctx, keysRaw, decreasingArr, naLast) {
  const H = ctx.H;
  const keys = keysRaw.map((k) => coerceForSort(H, k));
  const n = keys.length ? keys[0].length : 0;
  const idx = Array.from({ length: n }, (_, i) => i);
  const isMiss = (i) => keys.some((k) => H.isMissing(k[i]));
  const present = idx.filter((i) => !isMiss(i));
  const missing = idx.filter((i) => isMiss(i));
  present.sort((i, j) => {
    for (let k = 0; k < keys.length; k++) {
      const c = cmpVal(keys[k][i], keys[k][j]);
      if (c !== 0) return decreasingArr[k] ? -c : c;
    }
    return 0;
  });
  const ordered =
    naLast === null
      ? present
      : naLast
        ? [...present, ...missing]
        : [...missing, ...present];
  return ordered.map((i) => i + 1);
}
function parseDecreasing(ctx, b, nKeys) {
  if (!b.has("decreasing")) return Array(nKeys).fill(false);
  const raw = b.val("decreasing");
  const els = raw === null ? [] : ctx.H.vec(raw);
  if (!els.length) fail(ctx, "argument is of length zero");
  return Array.from({ length: nKeys }, (_, i) =>
    asLogical(ctx, els[i % els.length], "decreasing"),
  );
}
function orderHandler(isSortList) {
  return (ctx) => {
    const H = ctx.H;
    const b = isSortList
      ? bindArgs(ctx, ["x", "partial", "na.last", "decreasing", "method"])
      : bindArgs(ctx, [], { dots: true, nameOnly: ["na.last", "decreasing", "method"] });
    let keysRaw;
    let naLastRaw;
    let decB = b;
    if (isSortList) {
      if (b.has("partial") && b.val("partial") !== null)
        fail(ctx, "sort.list の partial（部分ソート）は説明に対応していません");
      const x = b.req("x");
      if (isDf(x)) fail(ctx, "cannot xtfrm data frames");
      // CONV-A4是正：sort.list(NULL) は実 R ではエラー
      // （"argument 1 is not a vector"、実 R 4.3.3 実測）。
      if (x === null) fail(ctx, "argument 1 is not a vector");
      keysRaw = [H.vec(x)];
      naLastRaw = b.has("na.last") ? b.val("na.last") : undefined;
    } else {
      keysRaw = b.dots
        .filter((d) => d.name === null || !["na.last", "decreasing", "method"].includes(d.name))
        .map((d, i) => {
          // CONV-A4是正：order のデータ引数が NULL の場合は実 R では
          // エラー（"argument N is not a vector"、N はデータ引数の
          // 位置。実 R 4.3.3 実測）。空ベクトルとして扱うと
          // order(NULL) が無言で空を返し、混在時は誤った
          // "argument lengths differ" になっていた。
          if (d.value === null) fail(ctx, `argument ${i + 1} is not a vector`);
          if (isDf(d.value)) fail(ctx, "cannot xtfrm data frames");
          return H.vec(d.value);
        });
      // 名前付きのデータ引数もキーになる（order(a = ...) の名前は無視される）。
      naLastRaw = b.has("na.last") ? b.val("na.last") : undefined;
    }
    if (b.has("method")) {
      const mv = H.vec(b.val("method"))[0];
      // A4-R是正：method の候補は関数で異なる（実 R 4.3.3 実測＋公式
      // ?sort.list／?order）。sort.list は "quick" を含む4候補
      // （auto／shell／quick／radix）で、order は "quick" を含まない
      // 3候補（order(..., method="quick") は実 R でもエラー）。
      // 従来は共有ハンドラが3候補に統一していたため、sort.list の
      // method="quick"（公式ヘルプの example の形）が誤って止まっていた。
      const choices = isSortList
        ? ["auto", "shell", "quick", "radix"]
        : ["auto", "shell", "radix"];
      if (
        typeof mv !== "string" ||
        !mv ||
        !choices.some((m) => m.startsWith(mv))
      )
        fail(ctx, "invalid 'method' argument");
    }
    const lens = keysRaw.map((k) => k.length);
    if (lens.length && !lens.every((l) => l === lens[0]))
      fail(ctx, "argument lengths differ");
    const naLast =
      naLastRaw === undefined
        ? true
        : parseNaLast(ctx, naLastRaw, true);
    const decreasingArr = parseDecreasing(ctx, decB, Math.max(keysRaw.length, 1));
    // CONV-A4是正：order() はデータ引数が無い場合、実 R では NULL を
    // 返す（実 R 4.3.3 実測。空ベクトルではない）。
    if (!keysRaw.length) return null;
    return orderCore(ctx, keysRaw, decreasingArr, naLast);
  };
}
function rankHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "na.last", "ties.method"]);
  const x = b.req("x");
  if (isDf(x)) fail(ctx, "cannot xtfrm data frames");
  const raw = x === null ? [] : H.vec(x);
  const els = coerceForSort(H, raw);
  const names = H.namesOf(x);
  let ties = "average";
  if (b.has("ties.method")) {
    const tv = H.vec(b.val("ties.method"))[0];
    const choices = ["average", "first", "last", "random", "max", "min"];
    if (typeof tv !== "string" || !choices.some((c) => c.startsWith(tv)))
      fail(ctx, "invalid 'ties.method' argument");
    ties = choices.find((c) => c.startsWith(tv));
    if (ties === "random")
      fail(
        ctx,
        "rank の ties.method = \"random\" は乱数を使うため説明に対応していません",
      );
  }
  let naMode = "true";
  if (b.has("na.last")) {
    const nv = b.val("na.last");
    if (nv !== null && H.vec(nv).length === 1 && H.isNA(H.vec(nv)[0]))
      naMode = "na";
    else if (
      nv !== null &&
      typeof H.vec(nv)[0] === "string" &&
      H.vec(nv)[0] === "keep"
    )
      naMode = "keep";
    else naMode = asLogical(ctx, nv, "na.last") ? "true" : "false";
  }
  const missIdx = [];
  const presIdx = [];
  els.forEach((el, i) => (H.isMissing(el) ? missIdx : presIdx).push(i));
  const sorted = [...presIdx].sort((i, j) => cmpVal(els[i], els[j]));
  const ranks = new Array(els.length).fill(null);
  let p = 0;
  while (p < sorted.length) {
    let q = p;
    while (q + 1 < sorted.length && cmpVal(els[sorted[q + 1]], els[sorted[p]]) === 0)
      q++;
    const group = sorted.slice(p, q + 1);
    if (ties === "average") {
      const avg = (p + 1 + (q + 1)) / 2;
      group.forEach((i) => (ranks[i] = avg));
    } else if (ties === "max") group.forEach((i) => (ranks[i] = q + 1));
    else if (ties === "min") group.forEach((i) => (ranks[i] = p + 1));
    else if (ties === "first")
      group.forEach((idx, j) => (ranks[idx] = p + 1 + j));
    else group.forEach((idx, j) => (ranks[idx] = q + 1 - j)); // last
    p = q + 1;
  }
  const nPres = presIdx.length;
  if (naMode === "false")
    presIdx.forEach((i) => (ranks[i] += missIdx.length));
  if (naMode === "true")
    missIdx.forEach((idx, j) => (ranks[idx] = nPres + j + 1));
  if (naMode === "false")
    missIdx.forEach((idx, j) => (ranks[idx] = j + 1));
  if (naMode === "keep") missIdx.forEach((idx) => (ranks[idx] = H.NA));
  if (naMode === "na") {
    const keepIdx = presIdx;
    const out = keepIdx.map((i) => ranks[i]);
    if (names) return H.withNames(out, keepIdx.map((i) => names[i]));
    return out;
  }
  const out = ranks.map((r) => (r === null ? H.NA : r));
  if (names) return H.withNames(out, names.slice());
  return out;
}
function revHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x"]);
  const x = b.req("x");
  if (isDf(x))
    fail(ctx, "rev はデータフレーム（リスト）に対応していません");
  if (x === null) return null;
  const els = H.vec(x).slice().reverse();
  const names = H.namesOf(x);
  if (names) return H.withNames(els, names.slice().reverse());
  return els;
}

// ---- unique／duplicated（照合キーは基礎層 %in% と同じ規則：NA と NaN は別物）
function matchKey(H, v) {
  if (H.isNA(v)) return " NA";
  if (H.isNaNVal(v)) return " NaN";
  if (typeof v === "string") return "s:" + v;
  if (typeof v === "boolean") return "b:" + v;
  return "n:" + v;
}
function incompSet(ctx, b, els) {
  const H = ctx.H;
  if (!b.has("incomparables")) return null;
  const raw = b.val("incomparables");
  if (raw === false) return null;
  if (isDf(raw))
    fail(ctx, "incomparables にデータフレームは指定できません");
  const incEls = raw === null ? [] : H.vec(raw);
  const joined = H.coerce([...els, ...incEls]);
  return new Set(joined.slice(els.length).map((v) => matchKey(H, v)));
}
function dupFlags(ctx, b, x, fromLast) {
  const H = ctx.H;
  if (isDf(x))
    fail(ctx, "データフレームの行単位の重複判定は説明に対応していません");
  const raw = x === null ? [] : H.vec(x);
  const els = H.coerce(raw.slice());
  const inc = incompSet(ctx, b, els);
  const keys = els.map((v) => matchKey(H, v));
  const flags = new Array(els.length).fill(false);
  const seen = new Set();
  const order = fromLast
    ? [...els.keys()].reverse()
    : [...els.keys()];
  for (const i of order) {
    if (inc && inc.has(keys[i])) continue;
    if (seen.has(keys[i])) flags[i] = true;
    else seen.add(keys[i]);
  }
  return { flags, els, raw };
}
function uniqueHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "incomparables"], { dots: true });
  const x = b.req("x");
  const { flags, raw } = dupFlags(ctx, b, x, false);
  const names = H.namesOf(x);
  const out = [];
  const outNames = [];
  raw.forEach((el, i) => {
    if (!flags[i]) {
      out.push(el);
      outNames.push(names ? names[i] : null);
    }
  });
  if (names) return H.withNames(out, outNames);
  return out;
}
function duplicatedHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "incomparables", "fromLast"], { dots: true });
  const x = b.req("x");
  const fromLast = b.has("fromLast")
    ? asLogical(ctx, b.val("fromLast"), "fromLast")
    : false;
  const { flags } = dupFlags(ctx, b, x, fromLast);
  const names = H.namesOf(x);
  if (names) return H.withNames(flags, names.slice());
  return flags;
}
function anyDuplicatedHandler(ctx) {
  const b = bindArgs(ctx, ["x", "incomparables", "fromLast"], { dots: true });
  const x = b.req("x");
  const fromLast = b.has("fromLast")
    ? asLogical(ctx, b.val("fromLast"), "fromLast")
    : false;
  const { flags } = dupFlags(ctx, b, x, fromLast);
  if (!fromLast) {
    const i = flags.indexOf(true);
    return i < 0 ? 0 : i + 1;
  }
  for (let i = flags.length - 1; i >= 0; i--) if (flags[i]) return i + 1;
  return 0;
}

// ---- which 系
function whichHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "arr.ind", "useNames"]);
  const x = b.req("x");
  if (
    b.has("arr.ind") &&
    asLogical(ctx, b.val("arr.ind"), "arr.ind")
  )
    fail(
      ctx,
      "which の arr.ind = TRUE は行列の添字を返すため説明に対応していません",
    );
  if (isDf(x)) fail(ctx, "argument to 'which' is not logical");
  const els = x === null ? [] : H.vec(x);
  const names = H.namesOf(x);
  const out = [];
  const outNames = [];
  els.forEach((el, i) => {
    if (H.isNA(el)) return;
    if (typeof el !== "boolean")
      fail(ctx, "argument to 'which' is not logical");
    if (el) {
      out.push(i + 1);
      outNames.push(names ? names[i] : null);
    }
  });
  // 実 R 4.3.3 実測：useNames=FALSE でも名前は引き継がれた。
  if (names) return H.withNames(out, outNames);
  return out;
}
function whichExtreme(kind) {
  return (ctx) => {
    const H = ctx.H;
    const b = bindArgs(ctx, ["x"]);
    const x = b.req("x");
    if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
    const { els, coercedNA } = numVec(ctx, x, { coerceStrings: true });
    if (coercedNA)
      warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
    let best = -1;
    els.forEach((el, i) => {
      if (H.isNA(el) || H.isNaNVal(el)) return;
      if (
        best < 0 ||
        (kind === "min" ? el < els[best] : el > els[best])
      )
        best = i;
    });
    if (best < 0) return [];
    const names = H.namesOf(x);
    if (names) return H.withNames([best + 1], [names[best]]);
    return best + 1;
  };
}

// ---- match（%in% と同じ照合規則。演算子 %in% は基礎層で実装済み）
function matchHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "table", "nomatch", "incomparables"]);
  const x = b.req("x");
  const table = b.req("table");
  if (isDf(x) || isDf(table))
    fail(ctx, "match はデータフレームに対応していません");
  const xEls = x === null ? [] : H.vec(x);
  const tEls = table === null ? [] : H.vec(table);
  let nomatch = H.NA;
  if (b.has("nomatch")) {
    const nv = b.val("nomatch");
    const els = nv === null ? [] : H.vec(nv);
    if (els.length) nomatch = els[0];
  }
  let inc = null;
  if (b.has("incomparables") && b.val("incomparables") !== null) {
    const incEls = H.vec(b.val("incomparables"));
    const joined = H.coerce([...xEls, ...tEls, ...incEls]);
    inc = new Set(
      joined.slice(xEls.length + tEls.length).map((v) => matchKey(H, v)),
    );
    const jx = joined.slice(0, xEls.length);
    const jt = joined.slice(xEls.length, xEls.length + tEls.length);
    return matchCore(H, jx, jt, nomatch, inc);
  }
  const joined = H.coerce([...xEls, ...tEls]);
  return matchCore(
    H,
    joined.slice(0, xEls.length),
    joined.slice(xEls.length),
    nomatch,
    inc,
  );
}
function matchCore(H, xEls, tEls, nomatch, inc) {
  const tableMap = new Map();
  tEls.forEach((v, i) => {
    const k = matchKey(H, v);
    if (inc && inc.has(k)) return;
    if (!tableMap.has(k)) tableMap.set(k, i + 1);
  });
  return xEls.map((v) => {
    const k = matchKey(H, v);
    if (inc && inc.has(k)) return nomatch;
    return tableMap.has(k) ? tableMap.get(k) : nomatch;
  });
}

// ---- findInterval
function findIntervalHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, [
    "x",
    "vec",
    "rightmost.closed",
    "all.inside",
    "left.open",
    "checkSorted",
    "checkNA",
  ]);
  const xRaw = b.req("x");
  const vecRaw = b.req("vec");
  if (isDf(xRaw) || isDf(vecRaw))
    fail(ctx, "findInterval はデータフレームに対応していません");
  const xc = numVec(ctx, xRaw, { coerceStrings: true });
  const vc = numVec(ctx, vecRaw, { coerceStrings: true });
  if (xc.coercedNA || vc.coercedNA)
    warn(ctx, "変換によりNAが生成されました（NAs introduced by coercion）");
  const xs = xc.els;
  const vs = vc.els;
  const rightmost = b.has("rightmost.closed")
    ? asLogical(ctx, b.val("rightmost.closed"), "rightmost.closed")
    : false;
  const allInside = b.has("all.inside")
    ? asLogical(ctx, b.val("all.inside"), "all.inside")
    : false;
  const leftOpen = b.has("left.open")
    ? asLogical(ctx, b.val("left.open"), "left.open")
    : false;
  const checkSorted = b.has("checkSorted")
    ? asLogical(ctx, b.val("checkSorted"), "checkSorted")
    : true;
  if (checkSorted) {
    if (vs.some((v) => H.isNA(v) || H.isNaNVal(v)))
      fail(ctx, "'vec' must be sorted non-decreasingly and not contain NAs");
    for (let i = 1; i < vs.length; i++)
      if (vs[i] < vs[i - 1])
        fail(ctx, "'vec' must be sorted non-decreasingly and not contain NAs");
  }
  if (allInside && vs.length < 2)
    fail(
      ctx,
      "findInterval の all.inside = TRUE は区間が1つ以上ある vec でのみ使えます",
    );
  const N = vs.length;
  const out = xs.map((v) => {
    if (H.isNA(v) || H.isNaNVal(v)) return H.NA;
    let idx;
    if (!leftOpen) {
      idx = vs.filter((t) => t <= v).length;
      if (rightmost && N >= 1 && v === vs[N - 1]) idx = N - 1;
    } else {
      idx = vs.filter((t) => t < v).length;
      if (rightmost && N >= 1 && v === vs[0]) idx = Math.max(idx, 1);
    }
    if (allInside) idx = Math.min(Math.max(idx, 1), N - 1);
    return idx;
  });
  const names = H.namesOf(xRaw);
  if (names) return H.withNames(out, names.slice());
  return out;
}

// ---- seq 系
function seqAlongHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x"]);
  const x = b.req("x");
  const n =
    x === null
      ? 0
      : isDf(x)
        ? Object.keys(x.columns).length
        : H.vec(x).length;
  return Array.from({ length: n }, (_, i) => i + 1);
}
function sequenceHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["nvec", "from", "by"]);
  const nvec = b.req("nvec");
  if (isDf(nvec)) fail(ctx, "sequence はデータフレームに対応していません");
  const lens = (nvec === null ? [] : H.vec(nvec)).map((el) => {
    if (H.isNA(el) || H.isNaNVal(el) || typeof el === "string")
      fail(ctx, "'lengths' must be a vector of non-negative integers");
    const t = Math.trunc(Number(el));
    if (t < 0)
      fail(ctx, "'lengths' must be a vector of non-negative integers");
    return t;
  });
  const fromEls = b.has("from")
    ? numVec(ctx, b.val("from")).els
    : [1];
  const byEls = b.has("by") ? numVec(ctx, b.val("by")).els : [1];
  const out = [];
  lens.forEach((len, i) => {
    const f = fromEls.length ? fromEls[i % fromEls.length] : 1;
    const step = byEls.length ? byEls[i % byEls.length] : 1;
    for (let j = 0; j < len; j++) out.push(f + j * step);
  });
  return out;
}
function seqIntHandler(ctx) {
  const H = ctx.H;
  const b = bindArgs(ctx, ["from", "to", "by", "length.out", "along.with"], {
    dots: true,
  });
  // seq.int の `...` は実 R でも受理されるため、余分な引数は無視せず
  // 名指しで止める（黙って捨てない）。
  if (b.dots.length) {
    const d = b.dots[0];
    fail(
      ctx,
      d.name
        ? `unused argument (${d.name} = ${H.show(d.value)})`
        : `unused argument (${H.show(d.value)})`,
    );
  }
  const scalar = (entry, label) => {
    const raw = entry;
    const els = raw === null ? [] : H.vec(raw);
    if (els.length !== 1)
      fail(ctx, `'${label}' must be of length 1`);
    const el = els[0];
    if (H.isNA(el) || H.isNaNVal(el))
      fail(ctx, `'${label}' must be a finite number`);
    if (typeof el === "string")
      fail(ctx, "non-numeric argument to mathematical function");
    const num = Number(el);
    if (!Number.isFinite(num)) fail(ctx, `'${label}' must be a finite number`);
    return num;
  };
  const hasFrom = b.has("from");
  const hasTo = b.has("to");
  const hasBy = b.has("by");
  const hasLen = b.has("length.out");
  const hasAlong = b.has("along.with");
  // 引数が from ただ1つの形（実 R 4.3.3 実測 seq.int(5) = 1:5）。
  if (hasFrom && !hasTo && !hasBy && !hasLen && !hasAlong) {
    const v = b.val("from");
    if (v === null) return [];
    const lf = isDf(v) ? Object.keys(v.columns).length : H.vec(v).length;
    if (lf === 1) {
      const el = H.vec(v)[0];
      if (typeof el === "number" && Number.isFinite(el)) {
        const step = el >= 1 ? 1 : -1;
        const cnt = Math.floor(Math.abs(el - 1)) + 1;
        if (cnt > 10000) fail(ctx, "ベクトル長の上限です");
        return Array.from({ length: cnt }, (_, i) => 1 + i * step);
      }
      if (typeof el === "number") fail(ctx, "NA/NaN argument");
    }
    if (lf > 10000) fail(ctx, "ベクトル長の上限です");
    return Array.from({ length: lf }, (_, i) => i + 1);
  }
  let lengthOut;
  if (hasAlong) {
    const aw = b.val("along.with");
    lengthOut =
      aw === null ? 0 : isDf(aw) ? Object.keys(aw.columns).length : H.vec(aw).length;
  } else if (hasLen) {
    const raw = scalar(b.val("length.out"), "length.out");
    lengthOut = Math.ceil(raw);
    if (lengthOut < 0)
      fail(ctx, "'length.out' must be a non-negative number");
  }
  const from = hasFrom ? scalar(b.val("from"), "from") : 1;
  const to = hasTo ? scalar(b.val("to"), "to") : 1;
  const by = hasBy ? scalar(b.val("by"), "by") : undefined;
  if (lengthOut !== undefined) {
    if (lengthOut > 10000) fail(ctx, "ベクトル長の上限です");
    if (lengthOut === 0) return [];
    if (by !== undefined) {
      if (hasFrom && hasTo) fail(ctx, "too many arguments");
      if (hasTo && !hasFrom)
        return Array.from(
          { length: lengthOut },
          (_, i) => to - (lengthOut - 1 - i) * by,
        );
      return Array.from({ length: lengthOut }, (_, i) => from + i * by);
    }
    if (!hasTo)
      return Array.from({ length: lengthOut }, (_, i) => from + i);
    if (!hasFrom) {
      const start = to - (lengthOut - 1);
      return Array.from({ length: lengthOut }, (_, i) => start + i);
    }
    if (lengthOut === 1) return [from];
    const step = (to - from) / (lengthOut - 1);
    return Array.from({ length: lengthOut }, (_, i) => from + i * step);
  }
  if (by === undefined) {
    const step = to >= from ? 1 : -1;
    const n = Math.floor((to - from) / step) + 1;
    if (n > 10000) fail(ctx, "ベクトル長の上限です");
    return Array.from({ length: n }, (_, i) => from + i * step);
  }
  const del = to - from;
  if (del === 0 && to === 0) return [to];
  const ratio = del / by;
  if (!Number.isFinite(ratio)) {
    if (by === 0 && del === 0) return [from];
    fail(ctx, "invalid '(to - from)/by'");
  }
  if (ratio < 0) fail(ctx, "wrong sign in 'by' argument");
  const n = Math.floor(ratio + 1e-10) + 1;
  if (n > 10000) fail(ctx, "ベクトル長の上限です");
  return Array.from({ length: n }, (_, i) => from + i * by);
}

// ---- 登録
export const builtins = new Map([
  // MathFun／Trig／Hyperbolic／Log トピック
  ["abs", math1(Math.abs)],
  ["sqrt", math1(Math.sqrt)],
  ["sin", math1(Math.sin)],
  ["cos", math1(Math.cos)],
  ["tan", math1(Math.tan)],
  ["asin", math1(Math.asin)],
  ["acos", math1(Math.acos)],
  ["atan", math1(Math.atan)],
  ["sinh", math1(Math.sinh)],
  ["cosh", math1(Math.cosh)],
  ["tanh", math1(Math.tanh)],
  ["asinh", math1(Math.asinh)],
  ["acosh", math1(Math.acosh)],
  ["atanh", math1(Math.atanh)],
  ["exp", math1(Math.exp)],
  ["expm1", math1(Math.expm1)],
  ["log1p", math1(Math.log1p)],
  ["log10", math1(Math.log10)],
  ["log2", math1(Math.log2)],
  [
    "sinpi",
    math1((v) =>
      Number.isInteger(v) ? 0 : Math.sin(Math.PI * v),
    ),
  ],
  [
    "cospi",
    math1((v) =>
      Number.isInteger(v) ? (Math.abs(v) % 2 === 1 ? -1 : 1) : Math.cos(Math.PI * v),
    ),
  ],
  [
    "tanpi",
    math1((v) => {
      if (Number.isInteger(v)) return 0;
      if (Number.isInteger(v - 0.5))
        return Math.sin(Math.PI * v) > 0 ? Infinity : -Infinity;
      return Math.tan(Math.PI * v);
    }),
  ],
  ["gamma", gammaHandler(false)],
  ["lgamma", gammaHandler(true)],
  [
    "factorial",
    (ctx) => {
      const H = ctx.H;
      const b = bindArgs(ctx, ["x"]);
      const x = b.req("x");
      if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
      const { els } = numVec(ctx, x);
      const flags = { nan: false, range: false };
      const out = els.map((el) =>
        H.isNA(el) ? H.NA : gammaOne(el + 1, flags),
      );
      if (flags.nan) warn(ctx, "NaNが生成されました（NaNs produced）");
      if (flags.range)
        warn(ctx, "値が範囲外です（value out of range in 'gammafn'）");
      return H.withNames(out, H.namesOf(x));
    },
  ],
  [
    "lfactorial",
    (ctx) => {
      const H = ctx.H;
      const b = bindArgs(ctx, ["x"]);
      const x = b.req("x");
      if (isDf(x)) fail(ctx, "データフレームはこの関数の対象外です");
      const { els } = numVec(ctx, x);
      const out = els.map((el) => (H.isNA(el) ? H.NA : lgammaOne(el + 1)));
      return H.withNames(out, H.namesOf(x));
    },
  ],
  ["log", logHandler],
  ["logb", logHandler],
  ["atan2", math2(["y", "x"], Math.atan2)],
  // Round トピック
  ["round", roundHandler(false)],
  ["signif", roundHandler(true)],
  [
    "trunc",
    (ctx) => {
      const H = ctx.H;
      const b = bindArgs(ctx, ["x"], { dots: true });
      const x = b.req("x");
      if (isDf(x)) fail(ctx, "non-numeric argument to mathematical function");
      const { els } = numVec(ctx, x);
      return H.withNames(
        els.map((el) => (H.isNA(el) ? H.NA : Math.trunc(el))),
        H.namesOf(x),
      );
    },
  ],
  ["ceiling", floorCeilHandler("ceiling", Math.ceil)],
  ["floor", floorCeilHandler("floor", Math.floor)],
  // Special トピック
  ["beta", special2("beta")],
  ["lbeta", special2("lbeta")],
  ["choose", special2("choose")],
  ["lchoose", special2("lchoose")],
  // Summary／Extremes トピック
  ["prod", prodHandler],
  ["cumsum", cumHandler("cumsum")],
  ["cumprod", cumHandler("cumprod")],
  ["cummax", cumHandler("cummax")],
  ["cummin", cumHandler("cummin")],
  ["diff", diffHandler],
  ["range", rangeHandler],
  ["min", summaryExtreme("min")],
  ["max", summaryExtreme("max")],
  ["pmax", pExtreme("pmax")],
  ["pmin", pExtreme("pmin")],
  ["pmax.int", pExtreme("pmax.int")],
  ["pmin.int", pExtreme("pmin.int")],
  // sort トピック
  ["sort", sortHandler],
  ["sort.int", sortIntHandler],
  ["sort.list", orderHandler(true)],
  ["rev", revHandler],
  ["order", orderHandler(false)],
  ["rank", rankHandler],
  // unique トピック
  ["unique", uniqueHandler],
  ["duplicated", duplicatedHandler],
  ["anyDuplicated", anyDuplicatedHandler],
  // which／match／findInterval／seq 系
  ["which", whichHandler],
  ["which.min", whichExtreme("min")],
  ["which.max", whichExtreme("max")],
  ["match", matchHandler],
  ["findInterval", findIntervalHandler],
  ["seq.int", seqIntHandler],
  ["seq_along", seqAlongHandler],
  ["sequence", sequenceHandler],
]);
