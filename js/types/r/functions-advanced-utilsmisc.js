// 高度モード B4S：R 高度関数グループ「その他ユーティリティ」（utils umisc 班）。
// ハンドラ契約は docs/audit/ADV-B4-SPEC.md 第4章。
// 本班で実装するのは formatUL／formatOL のみ。意味論は公式ヘルプ
// （stat.ethz.ch R-manual R-devel の format トピック）と実 R 4.3.3 の
// ソース（utils の formatUL／formatOL／.format_rl_table）および実測で
// 裁定した（報告書 docs/audit/ADV-B4S-umisc.md に根拠を記録）。
// 実装は .format_rl_table の再現：ラベルを右寄せ整形し、各項目を
// strwrap 相当の折り返し（幅＝width－ラベル幅－1）にかけ、継続行を
// ラベル幅だけ字下げする。width の既定値は strwrap の前例（eng2）に
// 倣い 0.9 * getOption("width") = 72（オプション width の既定 80）と
// する。label が長さ 0 の経路は実 R の内部表現依存の結果を再現でき
// ないため名指しで停止する。
// bindArgs／charVec／numVec／displayWidth 等のヘルパは
// functions-advanced-char.js（eng2）からの複製（BRIEF §5 で許可）。

const isDf = (v) => v?.kind === "data.frame";

function fail(ctx, msg) {
  ctx.api.fail(msg, ctx.node);
}
function warn(ctx, text) {
  if (typeof ctx.api.note === "function")
    ctx.api.note(ctx.s, ctx.node, text, "warning");
}
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
// ---- strwrap の核（eng2 の strwrapHandler のアルゴリズムを、
// prefix／initial が空・indent／exdent が 0 の単一要素用に転用）。
// 段落（空行区切り）ごとに単語境界で折り返し、行の配列を返す。
function wrapElement(el, width) {
  const paras = el.split(/\n[ \t\n]*\n/);
  let yi = [];
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
      yi.push("", "");
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
    const maxLength = width;
    while (lens.length) {
      let k = Math.max(lens.filter((v) => v <= maxLength).length, 1);
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
    const s = [];
    for (let bi = 0; bi < upperBlockIndex.length; bi++) {
      s.push(words.slice(lowerBlockIndex[bi] - 1, upperBlockIndex[bi]).join(" "));
    }
    yi.push(...s, "");
  }
  if (yi.length) return yi.slice(0, -1);
  return [""];
}

// format(labels, justify = "right") 相当：文字数（コードポイント数）で
// そろえた右寄せ。実 R の format は文字数基準で桁をそろえる。
function formatRight(labels) {
  const w = Math.max(...labels.map((s) => [...s].length));
  return labels.map((s) => " ".repeat(w - [...s].length) + s);
}

// utils:::.format_rl_table(labels, x, offset, width, sep = " ") の再現。
function formatRlTable(ctx, labels, xs, offset, width) {
  const formatted = formatRight(labels);
  const delta = displayWidth(formatted[0]) + offset;
  const wrapped = xs.map((x) => wrapElement(x, width - delta - 1));
  const total = wrapped.reduce((a, w) => a + w.length, 0);
  const prefix = new Array(total).fill(" ".repeat(delta));
  // 先頭行位置へのラベル代入（実 R の `[<-` のリサイクリング規則）。
  if (xs.length % formatted.length !== 0)
    warn(ctx, "number of items to replace is not a multiple of replacement length");
  let pos = 0;
  const starts = wrapped.map((w) => {
    const p = pos;
    pos += w.length;
    return p;
  });
  starts.forEach((p, i) => {
    prefix[p] = " ".repeat(offset) + formatted[i % formatted.length];
  });
  const out = [];
  let j = 0;
  for (const w of wrapped) for (const line of w) out.push(prefix[j++] + " " + line);
  return out;
}

// offset 引数（strrep(" ", offset) の規則：負・NA は "invalid 'times' value"）。
function asOffset(ctx, b) {
  if (!b.has("offset")) return 0;
  const nv = numVec(ctx, b.val("offset"));
  const el = nv.els[0];
  if (!nv.els.length || ctx.H.isNA(el) || typeof el !== "number" || Number.isNaN(el) || Math.trunc(el) < 0)
    fail(ctx, "invalid 'times' value");
  return Math.trunc(el);
}
// width 引数（既定は 0.9 * getOption("width") = 72。eng2 strwrap の前例）。
function asWidth(ctx, b) {
  if (!b.has("width")) return 72;
  const nv = numVec(ctx, b.val("width"));
  const el = nv.els[0];
  if (!nv.els.length || ctx.H.isNA(el) || typeof el !== "number" || Number.isNaN(el))
    fail(ctx, "invalid 'width' argument");
  return el;
}

const formatULHandler = (ctx) => {
  const b = bindArgs(ctx, ["x", "label", "offset", "width"]);
  const xv = charVec(ctx, b.req("x"), { naToString: true });
  if (!xv.els.length) return [];
  let labels = ["*"];
  if (b.has("label")) {
    const lv = charVec(ctx, b.val("label"), { naToString: true });
    if (!lv.els.length)
      fail(ctx, "label が長さ 0 の場合の formatUL の整形は未対応です");
    labels = lv.els.map((el) => (ctx.H.isNA(el) ? "NA" : el));
  }
  const offset = asOffset(ctx, b);
  const width = asWidth(ctx, b);
  return formatRlTable(ctx, labels, xv.els.map((el) => (ctx.H.isNA(el) ? "NA" : el)), offset, width);
};

// ローマ数字（as.roman 相当：1..3899、範囲外・NA は NA）。
function toRoman(v) {
  if (!Number.isInteger(v) || v < 1 || v > 3899) return null;
  const table = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  let n = v;
  for (const [val, sym] of table) while (n >= val) { out += sym; n -= val; }
  return out;
}

const formatOLHandler = (ctx) => {
  const H = ctx.H;
  const b = bindArgs(ctx, ["x", "type", "offset", "start", "width"]);
  const xv = charVec(ctx, b.req("x"), { naToString: true });
  if (!xv.els.length) return [];
  const xs = xv.els.map((el) => (H.isNA(el) ? "NA" : el));
  // type（match.arg 相当：完全一致→一意な前方一致）。
  let type = "arabic";
  if (b.has("type")) {
    const tv = charVec(ctx, b.val("type"));
    const el = tv.els[0];
    if (!tv.els.length || typeof el !== "string" || H.isNA(el))
      fail(ctx, "'arg' must be NULL or a character vector");
    type = el;
  }
  const TOKENS = ["1", "A", "a", "I", "i"];
  const FULL = ["arabic", "Alph", "alph", "Roman", "roman"];
  const CHOICES = [...TOKENS, ...FULL];
  let token;
  if (TOKENS.includes(type)) token = type;
  else if (FULL.includes(type)) token = TOKENS[FULL.indexOf(type)];
  else {
    const cand = CHOICES.filter((c) => c.startsWith(type));
    if (cand.length === 1) token = TOKENS.includes(cand[0]) ? cand[0] : TOKENS[FULL.indexOf(cand[0])];
    else fail(ctx, `'arg' should be one of ${CHOICES.map((c) => `“${c}”`).join(", ")}`);
  }
  // start（seq.int(start[1L], length.out = length(x)) 相当）。
  let start = 1;
  if (b.has("start")) {
    const nv = numVec(ctx, b.val("start"));
    if (!nv.els.length) fail(ctx, "invalid 'start' argument");
    start = nv.els[0];
  }
  const len = xs.length;
  const labelsNum = Array.from({ length: len }, (_, i) => {
    if (H.isNA(start)) return H.NA;
    return start + i;
  });
  const upper = labelsNum[len - 1];
  let labels;
  if (token === "A" || token === "a") {
    if (!H.isNA(upper) && upper > 26)
      fail(ctx, "too many list items (at most up to 26)");
    const letters = token === "A" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "abcdefghijklmnopqrstuvwxyz";
    // LETTERS[labels] の添字規則（0 は脱落、正は選択（範囲外は NA）、
    // 負は除外、混在はエラー）を再現する。
    const idx = labelsNum.map((v) => (H.isNA(v) ? null : Math.trunc(v)));
    if (idx.some((v) => v !== null && v < 0) && idx.some((v) => v !== null && v > 0))
      fail(ctx, "only 0's may be mixed with negative subscripts");
    if (idx.some((v) => v !== null && v < 0)) {
      const excl = new Set(idx.filter((v) => v !== null && v < 0).map((v) => -v));
      labels = [...letters].filter((_, i) => !excl.has(i + 1));
    } else {
      labels = [];
      for (const v of idx) {
        if (v === null) labels.push(null);
        else if (v === 0) continue;
        else labels.push(v >= 1 && v <= 26 ? letters[v - 1] : null);
      }
    }
  } else if (token === "I" || token === "i") {
    if (!H.isNA(upper) && upper > 3899)
      fail(ctx, "too many list items (at most up to 3899)");
    labels = labelsNum.map((v) => {
      if (H.isNA(v)) return null;
      const r = toRoman(v);
      return r === null ? null : token === "i" ? r.toLowerCase() : r;
    });
  } else {
    labels = labelsNum.map((v) => (H.isNA(v) ? null : H.formatRNum(v)));
  }
  const labelStrs = labels.map((s) => (s === null ? "NA" : s) + ".");
  const offset = asOffset(ctx, b);
  const width = asWidth(ctx, b);
  return formatRlTable(ctx, labelStrs, xs, offset, width);
};

export const builtins = new Map([
  ["formatUL", formatULHandler],
  ["formatOL", formatOLHandler],
]);
