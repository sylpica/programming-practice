// 高度モード（ブロックB6）: <stdio.h> のバッファ系書式関数
// （sprintf / snprintf / sscanf）の意味論ハンドラ（C班3）。
// 書式処理は H.formatPrintf（printf と共有）を用い、受理範囲は
// printf と一致する（%d %i %s %f %c %u %% のみ）。
// handlers は名前→関数 (args, values, s, api, node, H) =>
// 値 | LIBRARY_UNHANDLED。
//
// sscanf の対応範囲（裁定メモ）: 変換は %d %i %f %s %c %u %%、
// 抑止（*）、%s／%c への幅指定のみ。それ以外（長さ修飾子、%n、
// 幅付き数値変換など）は「未対応」で停止する。戻り値は代入した
// 項目数で、最初の変換前に入力が尽きた場合は -1（EOF）。

const WS = " \t\n\v\f\r";
const isSpace = (c) => c !== undefined && WS.includes(c);

function needMinArgs(name, args, n, api, node) {
  if (args.length < n)
    api.fail(
      `${name} は引数を${n}つ以上取ります（${args.length}個は渡せません）`,
      node,
      "CompileError",
    );
}
function numArg(v, name, api, node) {
  if (typeof v === "boolean") return Number(v);
  if (typeof v !== "number")
    api.fail(`${name} の引数は数値でなければなりません`, node, "CompileError");
  return v;
}
function digitVal(ch) {
  const c = ch.toLowerCase();
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "a" && c <= "z") return c.charCodeAt(0) - 87;
  return -1;
}

// 宛先ポインタから char 配列のメモリオブジェクトを得る。
function destMem(ptrValue, s, api, node, H, fname) {
  if (!H.isPtr(ptrValue))
    api.fail(
      `${fname} の宛先は char 配列へのポインタが必要です`,
      node,
      "未定義動作",
    );
  const mem = H.deref(ptrValue, s, api, node);
  if (mem.type !== "char")
    api.fail(`${fname} の宛先は char 配列が必要です`, node, "未定義動作");
  return mem;
}

function writeText(mem, offset, text, count) {
  for (let i = 0; i < count; i++) mem.values[offset + i] = text.charCodeAt(i);
}

/* ---------------- sprintf / snprintf ---------------- */

function sprintfImpl(args, values, s, api, node, H) {
  needMinArgs("sprintf", args, 2, api, node);
  const dest = values[0];
  if (H.isUnknown(dest)) return dest;
  const text = H.formatPrintf(values[1], args.slice(1), values.slice(1), s, api, node);
  const mem = destMem(dest, s, api, node, H, "sprintf");
  const remaining = mem.values.length - dest.offset;
  if (text.length + 1 > remaining)
    api.fail(
      "sprintf の書き込みが宛先の配列を超えています",
      node,
      "未定義動作",
    );
  writeText(mem, dest.offset, text, text.length);
  mem.values[dest.offset + text.length] = 0;
  return text.length;
}

function snprintfImpl(args, values, s, api, node, H) {
  needMinArgs("snprintf", args, 3, api, node);
  const dest = values[0];
  if (H.isUnknown(dest)) return dest;
  const size = Math.trunc(numArg(values[1], "snprintf", api, node));
  if (size < 0)
    api.fail("snprintf のサイズが不正です", node, "未定義動作");
  const text = H.formatPrintf(values[2], args.slice(2), values.slice(2), s, api, node);
  if (size === 0) return text.length; // 書き込みなし（宛先 NULL でも可）
  const mem = destMem(dest, s, api, node, H, "snprintf");
  const remaining = mem.values.length - dest.offset;
  const count = Math.min(text.length, size - 1);
  if (count + 1 > remaining)
    api.fail(
      "snprintf の書き込みが宛先の配列を超えています",
      node,
      "未定義動作",
    );
  writeText(mem, dest.offset, text, count);
  mem.values[dest.offset + count] = 0;
  return text.length;
}

/* ---------------- sscanf ---------------- */

// 代入先（&変数 / 配列名 / ポインタ）を解決して書き込む。
function assignTarget(args, values, ai, s, api, node, H) {
  const argNode = args[ai];
  const v = values[ai];
  let storage = null;
  if (argNode?.k === "unary" && argNode.op === "&")
    storage = H.targetPointer(argNode.arg, s, api, node);
  else if (H.isPtr(v)) storage = v;
  else
    api.fail(
      "sscanf の代入先として扱えない形です（&変数 または配列名で渡してください）",
      node,
      "未対応",
    );
  const mem = H.deref(storage, s, api, node);
  return { storage, mem };
}

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
  if (s.references && mem)
    for (const [id, m] of Object.entries(s.model.memory))
      if (m === mem)
        for (const [nm, alias] of Object.entries(s.references))
          if (alias.object === id && alias.offset === offset) s.vars[nm] = value;
}

// 整数値（BigInt）を要素型に合わせて変換して書き込む。
function storeInt(mem, offset, big, s, api, node, H) {
  const bits = H.width(mem.type, s);
  const unsigned = String(mem.type).startsWith("unsigned");
  let out;
  if (unsigned) {
    const mod = 1n << BigInt(bits);
    out = ((big % mod) + mod) % mod;
  } else {
    const min = -(1n << BigInt(bits - 1)),
      max = (1n << BigInt(bits - 1)) - 1n;
    out = big < min ? min : big > max ? max : big;
  }
  if (out > BigInt(Number.MAX_SAFE_INTEGER) || out < BigInt(Number.MIN_SAFE_INTEGER))
    api.fail("この64ビット整数は安全に計算できる範囲外です", node, "未確認");
  const num = Number(out);
  mem.values[offset] = num;
  syncScalarMirror(s, mem, offset, num);
}

function sscanfImpl(args, values, s, api, node, H) {
  needMinArgs("sscanf", args, 2, api, node);
  const srcVal = values[0];
  if (H.isUnknown(srcVal)) return srcVal;
  let text;
  if (typeof srcVal === "string") text = srcVal;
  else if (H.isPtr(srcVal)) text = H.cString(srcVal, s, api, node);
  else api.fail("sscanf の第1引数には文字列へのポインタが必要です", node, "未定義動作");
  const fmtVal = values[1];
  if (H.isUnknown(fmtVal)) return fmtVal;
  let fmt;
  if (typeof fmtVal === "string") fmt = fmtVal;
  else if (H.isPtr(fmtVal)) fmt = H.cString(fmtVal, s, api, node);
  else api.fail("sscanf の書式には文字列が必要です", node, "未定義動作");

  const n = text.length;
  let pos = 0;
  let assigned = 0;
  let anyConversion = false; // 抑止つきも含む「変換の完了」（記録用）
  let ai = 2; // 次の代入先引数の位置
  // EOF（入力不足）で止まった場合の戻り値: 代入がまだ無い場合は -1。
  // 抑止つき変換やリテラル一致が済んでいても、代入が無ければ -1 に
  // なる（gcc 13.3.0 実測: sscanf("5", "%*d%d", &x) は -1）。
  const eofResult = () => (assigned === 0 ? -1 : assigned);
  const skipWs = () => {
    while (pos < n && isSpace(text[pos])) pos++;
  };

  let fi = 0;
  while (fi < fmt.length) {
    const fc = fmt[fi];
    if (isSpace(fc)) {
      while (fi < fmt.length && isSpace(fmt[fi])) fi++;
      skipWs();
      continue;
    }
    if (fc !== "%") {
      // リテラル文字は一致を要求する（空白は読み飛ばさない）。
      if (pos >= n) return eofResult();
      if (text[pos] !== fc) return assigned;
      pos++;
      fi++;
      continue;
    }
    fi++; // '%' の次へ
    if (fmt[fi] === "%") {
      // %%: 空白は読み飛ばさず、'%' そのものの一致を要求する。
      fi++;
      if (pos >= n) return eofResult();
      if (text[pos] !== "%") return assigned;
      pos++;
      continue;
    }
    let suppress = false;
    if (fmt[fi] === "*") {
      suppress = true;
      fi++;
    }
    let width = null;
    if (fmt[fi] >= "0" && fmt[fi] <= "9") {
      let w = "";
      while (fmt[fi] >= "0" && fmt[fi] <= "9") w += fmt[fi++];
      width = parseInt(w, 10);
    }
    if (fmt[fi] === undefined)
      api.fail("sscanf の書式が '%' で終わっています", node, "未対応");
    if ("hljztL".includes(fmt[fi]))
      api.fail(
        "sscanf の長さ修飾子はモデルで扱えません",
        node,
        "未対応",
      );
    const spec = fmt[fi++];
    if (!"difscu".includes(spec))
      api.fail(`sscanf の変換指定 %${spec} はモデルで扱えません`, node, "未対応");
    if (width !== null && !["s", "c"].includes(spec))
      api.fail(
        "sscanf の幅指定は %s と %c のみモデルで扱えます",
        node,
        "未対応",
      );

    // 代入先は、変換が成功して実際に書き込む時点で初めて解決する
    // （入力不足・照合失敗のときに代入先へ触れないため。実物の
    // scanf も代入は変換成功時にだけ行う）。抑止の場合は引数を
    // 消費しない。
    let targetAi = -1;
    if (!suppress) {
      if (ai >= args.length)
        api.fail("sscanf の書式と引数の数が一致しません", node);
      targetAi = ai++;
    }
    const resolveTarget = () =>
      assignTarget(args, values, targetAi, s, api, node, H);

    if (spec === "d" || spec === "i" || spec === "u") {
      skipWs();
      if (pos >= n) return eofResult();
      let j = pos;
      let neg = false;
      if (text[j] === "+" || text[j] === "-") {
        neg = text[j] === "-";
        j++;
      }
      let base = 10;
      if (spec === "i") {
        if (
          text[j] === "0" &&
          (text[j + 1] === "x" || text[j + 1] === "X") &&
          digitVal(text[j + 2] ?? "") >= 0 &&
          digitVal(text[j + 2] ?? "") < 16
        )
          base = 16;
        else if (text[j] === "0") base = 8;
      }
      if (
        base === 16 &&
        text[j] === "0" &&
        (text[j + 1] === "x" || text[j + 1] === "X") &&
        digitVal(text[j + 2] ?? "") >= 0 &&
        digitVal(text[j + 2] ?? "") < 16
      )
        j += 2;
      let val = 0n,
        any = false;
      while (j < n) {
        const d = digitVal(text[j]);
        if (d < 0 || d >= base) break;
        val = val * BigInt(base) + BigInt(d);
        any = true;
        j++;
      }
      if (!any) return assigned; // 照合失敗
      pos = j;
      if (neg) val = -val;
      anyConversion = true;
      if (!suppress) {
        const target = resolveTarget();
        storeInt(target.mem, target.storage.offset, val, s, api, node, H);
        assigned++;
      }
      continue;
    }

    if (spec === "f") {
      skipWs();
      if (pos >= n) return eofResult();
      const rest = text.slice(pos);
      let m = null,
        value = 0;
      if ((m = /^[+-]?infinity/i.exec(rest))) value = m[0].startsWith("-") ? -Infinity : Infinity;
      else if ((m = /^[+-]?inf/i.exec(rest))) value = m[0].startsWith("-") ? -Infinity : Infinity;
      else if ((m = /^[+-]?nan(?:\([0-9A-Za-z_]*\))?/i.exec(rest))) value = NaN;
      else if (
        (m = /^[+-]?0[xX](?:[0-9a-fA-F]+(?:\.[0-9a-fA-F]*)?|\.[0-9a-fA-F]+)(?:[pP][+-]?\d+)?/.exec(rest))
      ) {
        const negF = m[0].startsWith("-");
        const body = m[0].replace(/^[+-]/, "");
        let mant = body,
          exp = 0;
        const pAt = mant.search(/[pP]/);
        if (pAt >= 0) {
          exp = parseInt(mant.slice(pAt + 1), 10);
          mant = mant.slice(0, pAt);
        }
        mant = mant.slice(2);
        const dot = mant.indexOf(".");
        const ip = dot >= 0 ? mant.slice(0, dot) : mant;
        const fp = dot >= 0 ? mant.slice(dot + 1) : "";
        const big = BigInt("0x" + ((ip + fp) || "0"));
        const scale = exp - 4 * fp.length;
        value = (scale >= 0 ? Number(big) * 2 ** scale : Number(big) / 2 ** -scale) * (negF ? -1 : 1);
      } else if ((m = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)))
        value = Number(m[0]);
      if (!m) return assigned; // 照合失敗
      pos += m[0].length;
      anyConversion = true;
      if (!suppress) {
        const target = resolveTarget();
        const out = target.mem.type === "float" ? Math.fround(value) : value;
        target.mem.values[target.storage.offset] = out;
        syncScalarMirror(s, target.mem, target.storage.offset, out);
        assigned++;
      }
      continue;
    }

    if (spec === "s") {
      skipWs();
      if (pos >= n) return eofResult();
      let j = pos;
      const limit = width === null ? n : Math.min(n, pos + width);
      while (j < limit && !isSpace(text[j])) j++;
      const word = text.slice(pos, j);
      pos = j;
      anyConversion = true;
      if (!suppress) {
        const { storage, mem } = resolveTarget();
        if (mem.type !== "char")
          api.fail("sscanf の %s の代入先は char 配列が必要です", node, "未定義動作");
        if (word.length + 1 > mem.values.length - storage.offset)
          api.fail(
            "sscanf の %s の書き込みが代入先の配列を超えています",
            node,
            "未定義動作",
          );
        for (let k = 0; k < word.length; k++)
          mem.values[storage.offset + k] = word.charCodeAt(k);
        mem.values[storage.offset + word.length] = 0;
        assigned++;
      }
      continue;
    }

    if (spec === "c") {
      // %c は空白を読み飛ばさない。幅の既定は1。終端文字は付けない。
      const w = width === null ? 1 : width;
      if (pos >= n) return eofResult();
      const count = Math.min(w, n - pos);
      const chunk = text.slice(pos, pos + count);
      pos += count;
      anyConversion = true;
      if (!suppress) {
        const { storage, mem } = resolveTarget();
        if (mem.type !== "char")
          api.fail("sscanf の %c の代入先は char 型が必要です", node, "未定義動作");
        if (count > mem.values.length - storage.offset)
          api.fail(
            "sscanf の %c の書き込みが代入先の範囲を超えています",
            node,
            "未定義動作",
          );
        for (let k = 0; k < count; k++)
          mem.values[storage.offset + k] = chunk.charCodeAt(k);
        if (mem.values.length === 1 && storage.offset === 0)
          syncScalarMirror(s, mem, 0, mem.values[0]);
        assigned++;
      }
      continue;
    }
  }
  return assigned;
}

export const handlers = {
  sprintf: sprintfImpl,
  snprintf: snprintfImpl,
  sscanf: sscanfImpl,
};

export const returnTypes = {
  sprintf: "int",
  snprintf: "int",
  sscanf: "int",
};
