import {
  LIMITS,
  isUnknown,
  unknown,
  formatValue,
} from "../../core/contract.js";
import { shellRuntime } from "../shell/runtime.js";
import {
  fail,
  ciGet,
  ciKey,
  ciSet,
  windowsPath,
  initFiles,
  fsEntry,
  listFiles,
  fileDisplay,
  writeFile,
  makeDirectory,
  removeEntry,
  copyEntry,
  sourceError,
  inputValue,
} from "../shell/model.js";
import { parsePS, PSParser } from "./parser.js";
const object = (properties, type = "PSCustomObject") =>
  type === "Hashtable"
    ? hash(Object.entries(properties))
    : { kind: "ps-object", psType: type, properties };
const modelValue = (v) =>
  isUnknown(v)
    ? v
    : Array.isArray(v)
      ? v.map(modelValue)
      : v && typeof v === "object"
        ? hash(Object.entries(v).map(([k, x]) => [k, modelValue(x)]))
        : v;
const hash = (entries) => ({
  kind: "ps-object",
  psType: "Hashtable",
  entries: new Map(entries),
});
const hashKey = (v, k) =>
  typeof k === "string"
    ? [...v.entries.keys()].find(
        (x) => typeof x === "string" && x.toLowerCase() === k.toLowerCase(),
      )
    : v.entries.has(k)
      ? k
      : undefined;
const isObject = (v) => v?.kind === "ps-object";
const enumerate = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const scalar = (values) =>
  values.length === 0 ? null : values.length === 1 ? values[0] : values;
function numberText(v, n = { line: 1 }, display = false) {
  if (!Number.isFinite(v)) fail("未確認：非有限数の文字列化", n.line, "未確認");
  if (Math.abs(v) >= 1e15) {
    if (display) return String(v);
    fail("未確認：大きな整数と浮動小数点の文字列化", n.line, "未確認");
  }
  const rounded = Number(v.toPrecision(15));
  if (rounded !== 0 && Math.abs(rounded) < 1e-4) {
    const [mantissa, exponent] = rounded.toExponential(14).split("e");
    return (
      mantissa.replace(/\.?0+$/, "") +
      "E" +
      (Number(exponent) < 0 ? "-" : "+") +
      String(Math.abs(Number(exponent))).padStart(2, "0")
    );
  }
  return String(rounded);
}
export function psFormat(v) {
  if (isUnknown(v)) return formatValue(v);
  if (v == null) return "$null";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return numberText(v, { line: 1 }, true);
  if (isObject(v))
    return (
      v.psType === "Hashtable" ? [...v.entries] : Object.entries(v.properties)
    )
      .map(([k, x]) => `${k} : ${psFormat(x)}`)
      .join("\n");
  if (Array.isArray(v)) return "@(" + v.map(psFormat).join(", ") + ")";
  return String(v);
}
function truth(v) {
  if (isUnknown(v)) return v;
  if (Array.isArray(v))
    return v.length === 0 ? false : v.length === 1 ? truth(v[0]) : true;
  return v !== null && v !== undefined && v !== false && v !== 0 && v !== "";
}
function numeric(v, node) {
  if (isUnknown(v)) return v;
  if (typeof v === "number") return v;
  if (v === null) return 0;
  if (typeof v === "boolean") return Number(v);
  if (
    typeof v === "string" &&
    /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim())
  )
    return Number(v);
  fail("数値へ変換できません：" + psFormat(v), node.line, "RuntimeException");
}
function text(v, node) {
  if (isUnknown(v)) return v;
  if (v == null) return "";
  if (typeof v === "number") return numberText(v, node);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (Array.isArray(v)) {
    if (v.some(isUnknown)) return unknown("配列を展開した文字列");
    return v.map((x) => text(x, node)).join(" ");
  }
  if (isObject(v)) {
    if (v.psType === "Hashtable") return "System.Collections.Hashtable";
    fail(
      "未対応：オブジェクトの文字列化。プロパティを部分式で指定してください",
      node.line,
    );
  }
  return String(v);
}
function property(v, key, node) {
  if (isUnknown(v))
    return unknown("実行時に決まるプロパティ " + key, v.id + ":" + key);
  key = String(key);
  const lower = key.toLowerCase();
  if (isObject(v)) {
    if (v.psType === "Hashtable") {
      const k = hashKey(v, key);
      if (k !== undefined) return v.entries.get(k);
      if (lower === "count") return v.entries.size;
      if (lower === "keys") return [...v.entries.keys()];
      if (lower === "values") return [...v.entries.values()];
      if (lower === "length") return 1;
      return null;
    }
    const k = ciKey(v.properties, key);
    if (k !== undefined) return v.properties[k];
    if (lower === "count" || lower === "length") return 1;
    return /Info$/.test(v.psType) ? unknown("モデルに未指定の " + key) : null;
  }
  if (lower === "count") return v == null ? 0 : Array.isArray(v) ? v.length : 1;
  if (lower === "length")
    return v == null
      ? 0
      : typeof v === "string" || Array.isArray(v)
        ? v.length
        : 1;
  if (Array.isArray(v))
    return v.flatMap((x) => enumerate(property(x, key, node)));
  return null;
}
function info(e) {
  const name = e.path.split("\\").at(-1),
    dot = name.lastIndexOf(".");
  return object(
    {
      Name: name,
      FullName: e.path,
      PSIsContainer: e.type === "directory",
      ...(e.type === "file"
        ? {
            Length:
              e.length ??
              (typeof e.content === "string"
                ? new TextEncoder().encode(e.content).length
                : unknown("モデルに未指定のサイズ", e.path + ":length")),
          }
        : {}),
      Extension: dot > 0 ? name.slice(dot) : "",
    },
    e.type === "directory" ? "DirectoryInfo" : "FileInfo",
  );
}
const alias = {
  echo: "Write-Output",
  gci: "Get-ChildItem",
  ls: "Get-ChildItem",
  dir: "Get-ChildItem",
  where: "Where-Object",
  "?": "Where-Object",
  foreach: "ForEach-Object",
  "%": "ForEach-Object",
  select: "Select-Object",
  sort: "Sort-Object",
  measure: "Measure-Object",
  cd: "Set-Location",
  pwd: "Get-Location",
  cat: "Get-Content",
  gc: "Get-Content",
  sc: "Set-Content",
  ac: "Add-Content",
  ni: "New-Item",
  ri: "Remove-Item",
  rm: "Remove-Item",
  ren: "Rename-Item",
  cp: "Copy-Item",
  mv: "Move-Item",
};
export function simulatePowerShell(source, model, limits) {
  try {
    if (
      typeof source !== "string" ||
      source.length > Math.min(LIMITS.source, limits?.source || LIMITS.source)
    )
      fail("PowerShellコードは100000文字以内で指定してください", 1, "limit");
    const nodes = parsePS(source);
    function note(s, n, message, refs = []) {
      s._api.note(s, { ...n, refs }, message);
    }
    function emit(s, values, n, api) {
      s.ps.streams.at(-1).push(...values);
      if (s.ps.streams.length === 1)
        for (const v of values)
          if (v !== null && v !== undefined)
            s.outputs.push({
              channel: "pipeline",
              text: psFormat(v),
              line: n.line,
            });
    }
    function cap(states, n, api) {
      if (states.length > api.limits.paths) {
        api.stop(states[0], n, "パス数の上限");
        return states.slice(0, api.limits.paths);
      }
      return states;
    }
    function get(s, name) {
      const lower = name.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
      if (lower === "null") return null;
      if (["_", "psitem"].includes(lower)) return s.ps.items.at(-1) ?? null;
      if (lower === "?") return s.ps.success;
      if (lower === "lastexitcode") return s.model.lastExitCode ?? null;
      return ciGet(s.vars, name) ?? null;
    }
    function set(s, target, v, n, api) {
      (s.pendingRefs ??= []).push("変数");
      if (target.k === "var") {
        if (
          [
            "true",
            "false",
            "null",
            "?",
            "_",
            "psitem",
            "lastexitcode",
            "ofs",
            "erroractionpreference",
            "outputencoding",
            "psdefaultparametervalues",
          ].includes(target.name.toLowerCase())
        )
          fail("未対応：自動変数への代入", n.line);
        ciSet(s.vars, target.name, v);
        return;
      }
      const host = read(target.target, s, api),
        key = target.k === "member" ? target.name : read(target.index, s, api);
      if (isUnknown(host) || isUnknown(key))
        fail("未確認：代入先が確定していません", n.line, "未確認");
      if (isObject(host) && host.psType === "Hashtable") {
        const existing = hashKey(host, key);
        host.entries.set(existing === undefined ? key : existing, v);
        return;
      }
      if (isObject(host)) {
        if (host.psType !== "PSCustomObject")
          fail("未対応：" + host.psType + "のプロパティ書き込み", n.line);
        if (
          host.psType !== "Hashtable" &&
          ciKey(host.properties, key) === undefined
        )
          fail("プロパティがありません：" + key, n.line, "RuntimeException");
        ciSet(host.properties, String(key), v);
        return;
      }
      if (
        Array.isArray(host) &&
        Number.isInteger(key) &&
        key >= 0 &&
        key < host.length
      ) {
        host[key] = v;
        return;
      }
      fail("この添字・プロパティへ代入できません", n.line, "RuntimeException");
    }
    function binary(op, a, b, s, n, api) {
      if (["-and", "-or"].includes(op)) {
        const x = truth(a),
          y = truth(b);
        if (isUnknown(x) || isUnknown(y))
          return {
            ...unknown("論理条件"),
            op: op === "-and" ? "&&" : "||",
            a: x,
            b: y,
          };
        return op === "-and" ? x && y : x || y;
      }
      if (op === "..") {
        a = numeric(a, n);
        b = numeric(b, n);
        if (isUnknown(a) || isUnknown(b))
          fail("未確認：範囲の端点", n.line, "未確認");
        if (
          !Number.isInteger(a) ||
          !Number.isInteger(b) ||
          Math.abs(b - a) > 10000
        )
          fail("未対応：整数範囲のモデル上限", n.line);
        return Array.from(
          { length: Math.abs(b - a) + 1 },
          (_, i) => a + (b >= a ? i : -i),
        );
      }
      if (
        /^-(?:c|i)?(?:eq|ne|gt|ge|lt|le|like|notlike|match|notmatch)$/.test(op)
      ) {
        const sensitive = /^-c/.test(op),
          base = op.replace(/^-[ci]?/, "");
        if (Array.isArray(a))
          return a.filter((x) => {
            const v = truth(binary(op, x, b, s, n, api));
            if (isUnknown(v))
              fail(
                "未確認：配列要素の比較結果が確定していません",
                n.line,
                "未確認",
              );
            return v === true;
          });
        if (isUnknown(a) || isUnknown(b)) {
          if (a?.compound || b?.compound)
            fail("未確認：複合文字列の未確定比較", n.line, "未確認");
          if (["eq", "ne"].includes(base)) {
            if (
              isUnknown(a) &&
              a.valueType === "string" &&
              typeof b !== "string" &&
              b !== null
            )
              b = text(b, n);
            if (
              isUnknown(b) &&
              b.valueType === "string" &&
              typeof a !== "string" &&
              a !== null
            )
              a = text(a, n);
            for (const v of [a, b].filter(isUnknown)) {
              if (v.valueType === "string") {
                s.ps.comparisonModes ??= {};
                const root = v.rootId || v.id,
                  mode = sensitive ? "sensitive" : "folded";
                if (
                  s.ps.comparisonModes[root] &&
                  s.ps.comparisonModes[root] !== mode
                )
                  fail(
                    "未確認：大文字小文字を区別する比較と区別しない比較の組み合わせ",
                    n.line,
                    "未確認",
                  );
                s.ps.comparisonModes[root] = mode;
              }
            }
            if (!sensitive) {
              if (isUnknown(a) && a.valueType === "string")
                a = { ...a, id: a.id + ":folded" };
              else if (typeof a === "string") a = a.toLowerCase();
              if (isUnknown(b) && b.valueType === "string")
                b = { ...b, id: b.id + ":folded" };
              else if (typeof b === "string") b = b.toLowerCase();
            }
            return {
              ...unknown("実行時の値による比較"),
              op: base === "eq" ? "=" : "<>",
              a,
              b,
            };
          }
          if (
            ["gt", "ge", "lt", "le"].includes(base) &&
            !(
              (a?.valueType && a.valueType !== "number") ||
              (b?.valueType && b.valueType !== "number")
            )
          )
            return {
              ...unknown("実行時の数値比較"),
              op: { gt: ">", ge: ">=", lt: "<", le: "<=" }[base],
              a,
              b,
            };
          fail("未確認：未確定値に対する " + op + " の比較", n.line, "未確認");
        }
        if (["like", "notlike", "match", "notmatch"].includes(base)) {
          const input = text(a, n),
            pattern = text(b, n);
          let re;
          if (base.endsWith("like")) {
            if (/[\[\]`]/.test(pattern))
              fail("未対応：-likeの文字クラス／エスケープ", n.line);
            re = new RegExp(
              "^" +
                pattern
                  .split("")
                  .map((c) =>
                    c === "*"
                      ? ".*"
                      : c === "?"
                        ? "."
                        : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  )
                  .join("") +
                "$",
              sensitive ? "" : "i",
            );
          } else {
            if (
              /\(\?|\\[pPAZzGK]|[^\x00-\x7f]/.test(pattern) ||
              (/\\[dw]/.test(pattern) && /[^\x00-\x7f]/.test(input))
            )
              fail("未対応：.NET固有または非ASCIIの正規表現", n.line);
            try {
              re = new RegExp(pattern, sensitive ? "" : "i");
            } catch {
              fail("正規表現が不正です", n.line, "RuntimeException");
            }
          }
          const match = re.exec(input);
          if (base === "match" && match)
            ciSet(s.vars, "Matches", hash(match.map((v, i) => [i, v])));
          return base.startsWith("not") ? !match : !!match;
        }
        if (Array.isArray(b)) fail("未対応：右辺が配列の比較", n.line);
        let x = a,
          y = b;
        if (x === null || y === null)
          return base === "eq"
            ? x === y
            : base === "ne"
              ? x !== y
              : base === "ge" || base === "le"
                ? x === y
                : false;
        if (typeof x === "string") {
          y = text(y, n);
          if (!sensitive) {
            x = x.toLowerCase();
            y = y.toLowerCase();
          }
        } else if (typeof x === "number") {
          try {
            y = numeric(y, n);
          } catch (e) {
            if (base === "eq" || base === "ne") return base === "ne";
            throw e;
          }
        } else if (typeof x === "boolean") y = truth(y);
        return base === "eq"
          ? x === y
          : base === "ne"
            ? x !== y
            : base === "gt"
              ? x > y
              : base === "ge"
                ? x >= y
                : base === "lt"
                  ? x < y
                  : x <= y;
      }
      if (isUnknown(a) || isUnknown(b)) {
        if (op === "+" && a?.valueType === "string")
          return {
            ...unknown(
              "実行時の文字列連結",
              a.id + ":concat:" + String(b?.id || b),
            ),
            valueType: "string",
            compound: true,
          };
        if ([a, b].some((v) => isUnknown(v) && v.valueType !== "number"))
          fail("未確認：型変換を伴う未確定値の算術", n.line, "未確認");
        return {
          ...unknown("実行時の値による演算"),
          op,
          a,
          b,
          valueType: "number",
        };
      }
      if (op === "+" && Array.isArray(a))
        return [...a, ...(Array.isArray(b) ? b : [b])];
      if (op === "+" && typeof a === "string") return a + text(b, n);
      a = numeric(a, n);
      b = numeric(b, n);
      if ((op === "/" || op === "%") && b === 0)
        fail("0による除算です", n.line, "RuntimeException");
      const v =
        op === "+"
          ? a + b
          : op === "-"
            ? a - b
            : op === "*"
              ? a * b
              : op === "/"
                ? a / b
                : op === "%"
                  ? a % b
                  : undefined;
      if (v === undefined) fail("未対応の演算子：" + op, n.line);
      if (
        !Number.isFinite(v) ||
        (Number.isInteger(v) && !Number.isSafeInteger(v))
      )
        fail("未確認：PowerShell演算のモデル数値範囲外", n.line, "未確認");
      return v;
    }
    function capture(body, s, api) {
      s.ps.streams.push([]);
      const out = exec(body, [s], api);
      return out.map((st) => ({ s: st, values: st.ps.streams.pop() }));
    }
    function only(pipe, s, api, n) {
      const values = pipeline(pipe, s, api);
      if (values.length !== 1 || values[0].s !== s)
        fail(
          "未対応：この式位置にある入力候補／分岐を含むパイプライン",
          n.line,
        );
      return Object.hasOwn(values[0], "expressionValue")
        ? values[0].expressionValue
        : values[0].values.length
          ? scalar(values[0].values)
          : undefined;
    }
    function read(a, s, api) {
      api.check();
      const ref = {
        var: "変数",
        string: "文字列",
        array: "配列",
        "array-pipelines": "配列",
        hashtable: "ハッシュテーブル",
      }[a.k];
      if (ref) (s.pendingRefs ??= []).push(ref);
      if (a.k === "binary" && a.op.startsWith("-"))
        (s.pendingRefs ??= []).push("比較演算子");
      if (a.k === "literal") return a.value;
      if (a.k === "var") return get(s, a.name);
      if (a.k === "string") {
        if (a.quote === "'") return a.value;
        let result = "",
          i = 0,
          unknownParts = [];
        while (i < a.value.length) {
          const c = a.value[i];
          if (c === "`") {
            const e = a.value[++i];
            result +=
              {
                n: "\n",
                r: "\r",
                t: "\t",
                0: "\0",
                a: "\x07",
                b: "\b",
                f: "\f",
                v: "\v",
              }[e] ??
              e ??
              "";
            i++;
            continue;
          }
          if (c === "$" && a.value[i + 1] === "(") {
            let end = i + 2,
              depth = 1,
              quote = null;
            for (; end < a.value.length && depth; end++) {
              const ch = a.value[end];
              if (ch === "`") {
                end++;
                continue;
              }
              if (quote) {
                if (ch === quote) quote = null;
              } else if (ch === '"' || ch === "'") quote = ch;
              else if (ch === "(") depth++;
              else if (ch === ")") depth--;
            }
            if (depth)
              fail("文字列の部分式が閉じられていません", a.line, "SyntaxError");
            const parts = capture(
              parsePS(a.value.slice(i + 2, end - 1), a.line),
              s,
              api,
            );
            if (parts.length !== 1 || parts[0].s !== s)
              fail("未対応：文字列部分式内の分岐", a.line);
            const v = text(scalar(parts[0].values), a);
            if (isUnknown(v)) {
              unknownParts.push(v);
              result += "?";
            } else result += v;
            i = end;
            continue;
          }
          if (c === "$") {
            const m = a.value
              .slice(i)
              .match(/^\$(?:\{([^}]+)\}|([\p{L}_][\p{L}\p{N}_]*|\?))/u);
            if (m) {
              const v = text(get(s, m[1] || m[2]), a);
              if (isUnknown(v)) {
                unknownParts.push(v);
                result += "?";
              } else result += v;
              i += m[0].length;
              continue;
            }
          }
          result += c;
          i++;
        }
        if (unknownParts.length) {
          if (
            unknownParts.length === 1 &&
            /^\$[\p{L}_][\p{L}\p{N}_]*$/u.test(a.value)
          )
            return unknownParts[0];
          return {
            ...unknown(
              "実行時に展開する文字列",
              a.value + ":" + unknownParts.map((v) => v.id).join(":"),
            ),
            valueType: "string",
            compound: true,
          };
        }
        return result;
      }
      if (a.k === "array") return a.values.map((v) => read(v, s, api));
      if (a.k === "array-pipelines")
        return a.values.flatMap((p) => enumerate(only(p, s, api, a)));
      if (a.k === "subexpression") return only(a.pipe, s, api, a);
      if (a.k === "hashtable") {
        const h = hash([]),
          seen = new Set();
        for (const [key, p] of a.entries) {
          if (seen.has(String(key).toLowerCase()))
            fail(
              "ハッシュテーブルのキーが重複しています：" + key,
              a.line,
              "SyntaxError",
            );
          seen.add(String(key).toLowerCase());
          h.entries.set(key, only(p, s, api, a));
        }
        return h;
      }
      if (a.k === "cast") {
        const v = read(a.arg, s, api),
          type = a.type.toLowerCase();
        if (type === "pscustomobject" && isObject(v))
          return object(
            v.psType === "Hashtable"
              ? Object.fromEntries(v.entries)
              : { ...v.properties },
          );
        if (type === "string") return text(v, a);
        if (type === "bool" || type === "boolean") return truth(v);
        if (type === "int" || type === "int32") {
          if (isUnknown(v))
            fail("未確認：int変換の入力が確定していません", a.line, "未確認");
          const num = numeric(v, a),
            rounded = Math.round(num);
          if (
            rounded < -2147483648 ||
            rounded > 2147483647 ||
            !Number.isInteger(num)
          )
            fail("未対応：int変換の丸め／範囲外", a.line);
          return rounded;
        }
        if (type === "double") return numeric(v, a);
        fail("未対応の型変換：[" + a.type + "]", a.line);
      }
      if (a.k === "member") return property(read(a.target, s, api), a.name, a);
      if (a.k === "index") {
        const v = read(a.target, s, api),
          i = read(a.index, s, api);
        if (isUnknown(v) || isUnknown(i))
          fail("未確認：添字が確定していません", a.line, "未確認");
        if (isObject(v) && v.psType === "Hashtable")
          return v.entries.get(hashKey(v, i)) ?? null;
        if (Array.isArray(v) || typeof v === "string") {
          if (!Number.isInteger(i))
            fail("整数の添字が必要です", a.line, "RuntimeException");
          return v[i < 0 ? v.length + i : i] ?? null;
        }
        if (v === null)
          fail("null配列には添字を指定できません", a.line, "RuntimeException");
        fail("未対応の添字対象です", a.line);
      }
      if (a.k === "unary") {
        const v = read(a.arg, s, api);
        if (["!", "-not"].includes(a.op))
          return isUnknown(v)
            ? { ...unknown("条件の否定"), op: "!", a: truth(v) }
            : !truth(v);
        if (isUnknown(v)) return { ...unknown("単項演算"), op: a.op, a: v };
        return a.op === "-" ? -numeric(v, a) : numeric(v, a);
      }
      if (a.k === "post") {
        const v = read(a.target, s, api);
        if (isUnknown(v))
          fail("未確認：未確定値のインクリメント", a.line, "未確認");
        set(
          s,
          a.target,
          binary(a.op === "++" ? "+" : "-", v, 1, s, a, api),
          a,
          api,
        );
        return v;
      }
      if (a.k === "binary") {
        const x = read(a.a, s, api);
        if (["-and", "-or"].includes(a.op) && isUnknown(truth(x))) {
          const effects = (node) =>
            node &&
            typeof node === "object" &&
            (node.k === "post" ||
              node.k === "command" ||
              Object.values(node).some((v) =>
                Array.isArray(v) ? v.some(effects) : effects(v),
              ));
          if (effects(a.b))
            fail("未確認：未確定の短絡評価にある副作用", a.line, "未確認");
        }
        if (a.op === "-and" && truth(x) === false) return false;
        if (a.op === "-or" && truth(x) === true) return true;
        return binary(a.op, x, read(a.b, s, api), s, a, api);
      }
      fail("未対応：PowerShell式 " + a.k, a.line);
    }
    function command(c, s, api, input, hasInput = false) {
      const canonical =
          alias[c.name.toLowerCase()] ||
          [
            "Write-Output",
            "Write-Host",
            "Read-Host",
            "Get-ChildItem",
            "Where-Object",
            "ForEach-Object",
            "Select-Object",
            "Sort-Object",
            "Measure-Object",
            "Get-Location",
            "Set-Location",
            "Test-Path",
            "Get-Content",
            "Set-Content",
            "Add-Content",
            "New-Item",
            "Remove-Item",
            "Rename-Item",
            "Copy-Item",
            "Move-Item",
          ].find((x) => x.toLowerCase() === c.name.toLowerCase()) ||
          c.name,
        name = canonical.toLowerCase(),
        args = c.args.map((a) => (a.k === "block" ? a : read(a, s, api))),
        params = Object.fromEntries(
          Object.entries(c.params).map(([k, v]) => [k, read(v, s, api)]),
        );
      const p = (name, pos, def) =>
        Object.hasOwn(params, name) ? params[name] : (args[pos] ?? def);
      const known = {
        "write-output": ["inputobject"],
        "write-host": ["object", "separator"],
        "read-host": ["prompt"],
        "get-childitem": ["path", "filter", "recurse", "file", "directory"],
        "where-object": ["filterscript"],
        "foreach-object": ["process"],
        "select-object": [
          "property",
          "first",
          "last",
          "skip",
          "expandproperty",
        ],
        "sort-object": ["property", "descending"],
        "measure-object": ["property", "sum", "average", "maximum", "minimum"],
        "get-location": [],
        "set-location": ["path"],
        "test-path": ["path", "pathtype"],
        "get-content": ["path", "raw"],
        "set-content": ["path", "value", "nonewline"],
        "add-content": ["path", "value", "nonewline"],
        "new-item": ["path", "itemtype", "value", "force"],
        "remove-item": ["path", "recurse", "force"],
        "rename-item": ["path", "newname"],
        "copy-item": ["path", "destination", "force"],
        "move-item": ["path", "destination", "force"],
      };
      const fn = ciGet(s.ps.functions, canonical);
      if (!fn && !Object.hasOwn(known, name))
        fail("未対応のPowerShellコマンドレット／関数：" + c.name, c.line);
      if (!fn)
        for (const key of Object.keys(params))
          if (!known[name].includes(key))
            fail("未対応のパラメーター：" + canonical + " -" + key, c.line);
      const maxArgs = {
        "get-location": 0,
        "set-location": 1,
        "test-path": 1,
        "get-content": 1,
        "set-content": 2,
        "add-content": 2,
        "new-item": 1,
        "remove-item": 1,
        "rename-item": 2,
        "copy-item": 2,
        "move-item": 2,
        "get-childitem": 1,
        "where-object": 1,
        "foreach-object": 1,
        "select-object": 1,
        "sort-object": 1,
        "measure-object": 1,
        "read-host": 1,
      };
      if (!fn && maxArgs[name] !== undefined && args.length > maxArgs[name])
        fail("未対応：" + canonical + "の追加の位置引数", c.line);
      const refs = fn
        ? fn.params.length
          ? ["function", "param"]
          : ["function"]
        : [
            Object.keys(alias).includes(c.name.toLowerCase())
              ? alias[c.name.toLowerCase()]
              : canonical,
          ];
      api.note(s, { ...c, refs }, c.name + " を評価します");
      if (fn) {
        if (s.ps.calls.length >= api.limits.depth) {
          api.stop(s, c, "関数呼び出しの深さ上限");
          return [{ s, values: [] }];
        }
        s.ps.calls.push({
          vars: s.vars,
          signal: s.ps.signal,
          functions: s.ps.functions,
        });
        s.vars = { ...s.vars };
        s.ps.functions = { ...s.ps.functions };
        for (let i = 0; i < fn.params.length; i++) {
          const param = fn.params[i];
          let v = Object.hasOwn(params, param.name.toLowerCase())
            ? params[param.name.toLowerCase()]
            : Object.hasOwn(args, i)
              ? args[i]
              : param.value
                ? read(param.value, s, api)
                : null;
          if (param.type === "bool")
            fail("未対応：bool型の関数パラメーター変換", c.line);
          if (param.type)
            v = read(
              {
                k: "cast",
                type: param.type,
                arg: { k: "literal", value: v, line: c.line },
                line: c.line,
              },
              s,
              api,
            );
          ciSet(s.vars, param.name, v);
        }
        for (const key of Object.keys(params))
          if (!fn.params.some((x) => x.name.toLowerCase() === key))
            fail(
              "関数のパラメーターがありません：" + key,
              c.line,
              "RuntimeException",
            );
        ciSet(s.vars, "args", args.slice(fn.params.length));
        return capture(fn.body, s, api).map((r) => {
          const frame = r.s.ps.calls.pop();
          r.s.vars = frame.vars;
          r.s.ps.signal = frame.signal;
          r.s.ps.functions = frame.functions;
          return r;
        });
      }
      if (name === "write-output") {
        if (!args.length && !Object.hasOwn(params, "inputobject")) {
          if (!hasInput)
            fail(
              "Write-OutputにはInputObjectが必要です",
              c.line,
              "ParameterBindingException",
            );
          return [{ s, values: input }];
        }
        return [
          {
            s,
            values: enumerate(p("inputobject", 0, null)).concat(
              args.slice(1).flatMap(enumerate),
            ),
          },
        ];
      }
      if (name === "write-host") {
        if (!args.length && !Object.hasOwn(params, "object") && hasInput) {
          for (const value of input)
            s.outputs.push({
              channel: "Write-Host",
              text: psFormat(value),
              line: c.line,
            });
          return [{ s, values: [] }];
        }
        const separator = p("separator", 100, " "),
          values = Object.hasOwn(params, "object")
            ? enumerate(params.object)
            : args;
        const parts = values.map((v) => text(v, c));
        s.outputs.push({
          channel: "Write-Host",
          text: parts.some(isUnknown)
            ? formatValue(unknown("実行時の画面出力"))
            : parts.join(separator),
          line: c.line,
        });
        return [{ s, values: [] }];
      }
      if (name === "read-host") {
        const prompt = p("prompt", 0, "Read-Host");
        if (isUnknown(prompt))
          fail("未確認：Read-Hostのプロンプト", c.line, "未確認");
        const candidates = inputValue(
          s,
          String(prompt),
          api,
          c,
          String(prompt) + " の入力",
        );
        if (!candidates.length)
          fail("入力候補は1つ以上必要です", c.line, "モデルエラー");
        if (candidates.length > api.limits.paths)
          api.stop(s, c, "入力候補のパス数上限");
        return candidates.slice(0, api.limits.paths).map((v) => ({
          s: structuredClone(s),
          values: [isUnknown(v) ? { ...v, valueType: "string" } : String(v)],
        }));
      }
      if (["where-object", "foreach-object"].includes(name)) {
        const block = p(
          name === "where-object" ? "filterscript" : "process",
          0,
        );
        if (block?.k !== "block")
          fail("未対応：" + canonical + "はスクリプトブロック形式のみ", c.line);
        let states = [s];
        s.ps.pipes.at(-1).result = [];
        for (let i = 0; i < input.length; i++) {
          const next = [];
          for (const st of states) {
            const f = st.ps.pipes.at(-1);
            st.ps.items.push(f.items[i]);
            for (const r of capture(block.body, st, api)) {
              r.s.ps.items.pop();
              if (name === "foreach-object") {
                r.s.ps.pipes.at(-1).result.push(...r.values);
                next.push(r.s);
              } else
                for (const branch of api.choose(
                  r.s,
                  truth(scalar(r.values)),
                  c,
                )) {
                  if (branch.yes) {
                    const frame = branch.s.ps.pipes.at(-1);
                    frame.result.push(frame.items[i]);
                  }
                  next.push(branch.s);
                }
            }
          }
          states = cap(next, c, api);
        }
        return states.map((st) => ({
          s: st,
          values: st.ps.pipes.at(-1).result,
        }));
      }
      if (name === "select-object") {
        let values = input.filter((v) => v !== null && v !== undefined);
        const skip = Number(p("skip", 100, 0)),
          first = p("first", 100, null),
          last = p("last", 100, null);
        for (const n of [skip, first, last].filter((v) => v !== null))
          if (!Number.isInteger(Number(n)) || Number(n) < 0)
            fail(
              "Select-Objectの件数は0以上の整数が必要です",
              c.line,
              "RuntimeException",
            );
        values = values.slice(skip);
        if (first !== null) values = values.slice(0, Number(first));
        if (last !== null)
          values = Number(last) === 0 ? [] : values.slice(-Number(last));
        const expand = p("expandproperty", 100, null);
        if (expand !== null)
          return [
            {
              s,
              values: values.flatMap((v) => enumerate(property(v, expand, c))),
            },
          ];
        const keys = p("property", 0, null);
        return [
          {
            s,
            values:
              keys === null
                ? values
                : values.map((v) =>
                    object(
                      Object.fromEntries(
                        enumerate(keys).map((key) => [
                          String(key),
                          property(v, key, c),
                        ]),
                      ),
                    ),
                  ),
          },
        ];
      }
      if (name === "sort-object") {
        const keys = enumerate(p("property", 0, null)),
          descending = !!p("descending", 100, false);
        const values = input.filter((v) => v !== null && v !== undefined);
        const collator = new Intl.Collator("en-US", { sensitivity: "base" });
        values.sort((a, b) => {
          for (const key of keys.length ? keys : [null]) {
            const x = key === null ? a : property(a, key, c),
              y = key === null ? b : property(b, key, c);
            if (isUnknown(x) || isUnknown(y))
              fail(
                "未確認：Sort-Objectの値が確定していません",
                c.line,
                "未確認",
              );
            const diff =
              typeof x === "number" && typeof y === "number"
                ? x - y
                : collator.compare(text(x, c), text(y, c));
            if (diff) return descending ? -diff : diff;
          }
          return 0;
        });
        return [{ s, values }];
      }
      if (name === "measure-object") {
        const key = p("property", 0, null),
          measured = input
            .map((v) => (key === null ? v : property(v, key, c)))
            .filter((v) => v !== null && v !== undefined),
          props = {
            Count: measured.length,
            Average: null,
            Sum: null,
            Maximum: null,
            Minimum: null,
            StandardDeviation: null,
            Property: key ?? null,
          };
        const active = ["sum", "average", "maximum", "minimum"].filter(
          (k) => params[k],
        );
        if (active.length) {
          const nums = measured.map((v) => numeric(v, c));
          if (nums.some(isUnknown))
            fail(
              "未確認：Measure-Objectの集計値が確定していません",
              c.line,
              "未確認",
            );
          if (params.sum) props.Sum = nums.reduce((a, b) => a + b, 0);
          if (params.average)
            props.Average = nums.length
              ? nums.reduce((a, b) => a + b, 0) / nums.length
              : null;
          if (params.maximum)
            props.Maximum = nums.length ? Math.max(...nums) : null;
          if (params.minimum)
            props.Minimum = nums.length ? Math.min(...nums) : null;
        }
        return [{ s, values: [object(props, "GenericMeasureInfo")] }];
      }
      if (name === "get-location")
        return [{ s, values: [object({ Path: s.model.cwd }, "PathInfo")] }];
      if (name === "set-location") {
        const target = windowsPath(
            p("path", 0, s.model.cwd),
            s.model.cwd,
            c.line,
          ),
          entry = fsEntry(s, target, c.line);
        if (isUnknown(entry)) fail("未確認：移動先", c.line, "未確認");
        if (!entry || entry.type !== "directory")
          fail(
            "モデルに移動先フォルダがありません：" + target,
            c.line,
            "ItemNotFoundException",
          );
        s.model.cwd = target;
        return [{ s, values: [] }];
      }
      if (name === "get-childitem") {
        const path = p("path", 0, s.model.cwd);
        if (isUnknown(path)) fail("未確認：列挙パス", c.line, "未確認");
        const entry = fsEntry(s, path, c.line),
          pattern = String(path),
          hasPattern = /[*?]/.test(pattern);
        let values;
        if (entry?.type === "file") values = [entry];
        else {
          if (!entry && !hasPattern)
            fail(
              "モデルにパスがありません：" + path,
              c.line,
              "ItemNotFoundException",
            );
          const folder = entry?.type === "directory" ? entry.path : s.model.cwd,
            filter = p("filter", 100, hasPattern ? pattern : "*");
          values = listFiles(
            { ...s, model: { ...s.model, cwd: folder } },
            filter,
            c.line,
          );
          if (p("recurse", 100, false) && entry?.type === "directory") {
            values = s.model.files.filter((e) =>
              e.path.toLowerCase().startsWith(folder.toLowerCase() + "\\"),
            );
            if (filter !== "*") {
              const re = new RegExp(
                "^" +
                  String(filter)
                    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                    .replaceAll("*", ".*")
                    .replaceAll("?", ".") +
                  "$",
                "i",
              );
              values = values.filter((e) => re.test(e.path.split("\\").at(-1)));
            }
          }
        }
        if (p("file", 100, false))
          values = values.filter((e) => e.type === "file");
        if (p("directory", 100, false))
          values = values.filter((e) => e.type === "directory");
        return [{ s, values: values.map(info) }];
      }
      if (name === "test-path") {
        const path = p("path", 0, null);
        if (isUnknown(path))
          return [
            { s, values: [unknown("実行時のパスの存在", path.id + ":exists")] },
          ];
        if (path === null || path === undefined)
          fail(
            "Test-Pathにはnull以外のパスが必要です",
            c.line,
            "ParameterBindingException",
          );
        if (String(path).trim() === "") return [{ s, values: [false] }];
        const e = /[*?]/.test(String(path))
            ? listFiles(s, path, c.line)[0]
            : fsEntry(s, path, c.line),
          kind = String(p("pathtype", 100, "any")).toLowerCase();
        if (!["any", "leaf", "container"].includes(kind))
          fail("未対応：Test-Path -PathType", c.line);
        return [
          {
            s,
            values: [
              !!e &&
                (kind === "any" ||
                  (kind === "leaf" && e.type === "file") ||
                  (kind === "container" && e.type === "directory")),
            ],
          },
        ];
      }
      if (name === "get-content") {
        const e = fsEntry(s, p("path", 0, null), c.line);
        if (!e || e.type !== "file")
          fail("モデルにファイルがありません", c.line, "ItemNotFoundException");
        if (e.content === undefined || isUnknown(e.content))
          fail("未確認：ファイル内容がモデルにありません", c.line, "未確認");
        const raw = !!p("raw", 100, false);
        return [
          {
            s,
            values: raw
              ? [e.content]
              : e.content
                  .replace(/\r\n/g, "\n")
                  .split("\n")
                  .filter((v, i, a) => i < a.length - 1 || v !== ""),
          },
        ];
      }
      if (name === "set-content" || name === "add-content") {
        const values = enumerate(p("value", 1, input));
        const strings = values.map((v) => text(v, c));
        if (strings.some(isUnknown))
          fail("未確認：書き込む文字列", c.line, "未確認");
        const noNewline = !!p("nonewline", 100, false),
          content = noNewline
            ? strings.join("")
            : strings.map((v) => v + "\r\n").join("");
        writeFile(
          s,
          p("path", 0, null),
          content,
          c.line,
          name === "add-content",
        );
        return [{ s, values: [] }];
      }
      if (name === "new-item") {
        const path = p("path", 0, null),
          type = String(p("itemtype", 100, "file")).toLowerCase(),
          force = !!p("force", 100, false);
        let e = fsEntry(s, path, c.line);
        if (type === "directory") {
          if (e && !force)
            fail("モデルにパスが既に存在します", c.line, "IOException");
          if (!e) makeDirectory(s, path, c.line);
          e = fsEntry(s, path, c.line);
          if (e.type !== "directory")
            fail(
              "モデルの既存パスはフォルダではありません",
              c.line,
              "IOException",
            );
        } else if (type === "file") {
          if (e && !force)
            fail("モデルにパスが既に存在します", c.line, "IOException");
          e = writeFile(s, path, text(p("value", 100, ""), c), c.line);
        } else fail("未対応のNew-Item -ItemType：" + type, c.line);
        return [{ s, values: [info(e)] }];
      }
      if (name === "remove-item") {
        const path = p("path", 0, null);
        if (typeof path === "string" && /[*?]/.test(path)) {
          for (const e of [...listFiles(s, path, c.line)])
            removeEntry(s, e.path, c.line, !!p("recurse", 100, false));
        } else removeEntry(s, path, c.line, !!p("recurse", 100, false));
        return [{ s, values: [] }];
      }
      if (name === "rename-item") {
        const from = windowsPath(p("path", 0, null), s.model.cwd, c.line),
          leaf = text(p("newname", 1, null), c);
        if (isUnknown(leaf) || /[\\/:*?]/.test(leaf))
          fail("未対応：Rename-Itemの新しい名前", c.line);
        copyEntry(
          s,
          from,
          from.slice(0, from.lastIndexOf("\\") + 1) + leaf,
          c.line,
          true,
          false,
        );
        return [{ s, values: [] }];
      }
      if (name === "copy-item" || name === "move-item") {
        copyEntry(
          s,
          p("path", 0, null),
          p("destination", 1, null),
          c.line,
          name === "move-item",
          name === "copy-item" || !!p("force", 100, false),
        );
        return [{ s, values: [] }];
      }
      fail("未対応のコマンド：" + c.name, c.line);
    }
    function pipeline(p, s, api) {
      api.check();
      const pure = new Set([
        "write-output",
        "get-childitem",
        "where-object",
        "foreach-object",
        "select-object",
        "sort-object",
        "measure-object",
        "get-location",
        "get-content",
        "test-path",
      ]);
      const effects = (n) =>
        n &&
        typeof n === "object" &&
        (n.k === "assign" ||
          n.k === "post" ||
          (n.k === "command" &&
            !pure.has((alias[n.name.toLowerCase()] || n.name).toLowerCase())) ||
          Object.values(n).some((v) =>
            Array.isArray(v) ? v.some(effects) : effects(v),
          ));
      for (let i = 1; i < p.stages.length; i++) {
        const stage = p.stages[i];
        if (
          stage.k === "command" &&
          (alias[stage.name.toLowerCase()] || stage.name).toLowerCase() ===
            "select-object" &&
          Object.hasOwn(stage.params, "first") &&
          p.stages.slice(0, i).some(effects)
        )
          fail(
            "未対応：Select-Object -Firstによる上流の副作用の途中停止",
            stage.line,
          );
      }

      if (p.stages.length > 1)
        api.note(
          s,
          { line: p.line, refs: ["パイプライン"] },
          "オブジェクトをパイプラインで渡します",
        );
      let states = [{ s, values: [] }];
      for (let i = 0; i < p.stages.length; i++) {
        const stage = p.stages[i],
          next = [];
        for (const r of states) {
          r.s.ps.pipes.push({ items: r.values, result: [] });
          let values;
          if (stage.k === "expression") {
            if (i)
              fail(
                "式はパイプラインの先頭にだけ指定できます",
                stage.line,
                "SyntaxError",
              );
            const expressionValue = read(stage.value, r.s, api);
            values = [
              { s: r.s, values: enumerate(expressionValue), expressionValue },
            ];
          } else
            values = command(stage, r.s, api, r.s.ps.pipes.at(-1).items, i > 0);
          for (const v of values) {
            v.s.ps.pipes.pop();
            v.s.ps.lastPipeline = v.values;
            v.s.ps.success = true;
            next.push(v);
          }
        }
        states = cap(next, p, api);
      }
      return states;
    }
    function loop(n, s, api) {
      let active = [s],
        done = [],
        iterations = 0;
      if (n.init) active = exec([n.init], active, api);
      if (n.k === "foreach") {
        const evaluated = [];
        for (const st of active)
          for (const r of pipeline(n.collection, st, api)) {
            const items =
              r.values.length === 1 &&
              r.values[0] === null &&
              !(
                Object.hasOwn(r, "expressionValue") &&
                Array.isArray(r.expressionValue)
              )
                ? []
                : r.values;
            r.s.ps.loops.push({ items, index: 0 });
            evaluated.push(r.s);
          }
        active = evaluated;
      } else for (const st of active) st.ps.loops.push({ index: 0 });
      while (active.length) {
        const next = [];
        for (const st of active) {
          if (st.halt || st.ps.signal) {
            done.push(st);
            continue;
          }
          const f = st.ps.loops.at(-1);
          let choices;
          if (n.k === "foreach")
            choices = [{ s: st, yes: f.index < f.items.length }];
          else if (n.k === "do" && f.index === 0)
            choices = [{ s: st, yes: true }];
          else {
            const result = pipeline(n.test, st, api);
            choices = result.flatMap((r) =>
              api.choose(r.s, truth(scalar(r.values)), n),
            );
          }
          for (const branch of choices) {
            const current = branch.s,
              frame = current.ps.loops.at(-1);
            if (!branch.yes) {
              done.push(current);
              continue;
            }
            if (frame.index >= api.limits.iterations) {
              api.stop(current, n, "ループ回数の上限");
              done.push(current);
              continue;
            }
            if (n.k === "foreach")
              ciSet(current.vars, n.name, frame.items[frame.index]);
            frame.index++;
            api.note(
              current,
              { ...n, refs: [n.k === "do" ? "do-while" : n.k] },
              "繰り返し " + frame.index + " 回目",
            );
            for (const out of exec(n.body, [current], api)) {
              if (out.ps.signal === "break") {
                out.ps.signal = null;
                done.push(out);
              } else if (out.halt || out.ps.signal === "return") done.push(out);
              else {
                out.ps.signal = null;
                next.push(...(n.update ? exec([n.update], [out], api) : [out]));
              }
            }
          }
        }
        active = cap(next, n, api);
        done = cap(done, n, api);
        if (++iterations > api.limits.iterations + 1) break;
      }
      for (const st of done) st.ps.loops.pop();
      return done;
    }
    function statement(n, s, api) {
      api.check();
      if (n.k === "function") {
        ciSet(s.ps.functions, n.name, n);
        api.note(
          s,
          { ...n, refs: ["function"] },
          "関数 " + n.name + " を定義します",
        );
        return [s];
      }
      if (n.k === "param") fail("paramは関数の先頭でだけ対応します", n.line);
      if (n.k === "pipeline")
        return pipeline(n.pipe, s, api).map((r) => {
          if (!n.suppress) emit(r.s, r.values, n, api);
          api.note(
            r.s,
            n,
            n.suppress
              ? "変数を増減します"
              : "パイプラインの値：" +
                  (r.values.length
                    ? r.values.map(psFormat).join(" / ")
                    : "（出力なし）"),
          );
          return r.s;
        });
      if (n.k === "assign")
        return pipeline(n.value, s, api).map((r) => {
          let v = Object.hasOwn(r, "expressionValue")
            ? r.expressionValue
            : scalar(r.values);
          if (v === undefined) v = null;
          if (n.op !== "=")
            v = binary(n.op[0], read(n.target, r.s, api), v, r.s, n, api);
          set(r.s, n.target, v, n, api);
          api.note(r.s, n, "代入します：" + psFormat(v));
          return r.s;
        });
      if (n.k === "if") {
        n = { ...n, refs: ["if"] };
        const out = [];
        for (const r of pipeline(n.test, s, api))
          for (const branch of api.choose(r.s, truth(scalar(r.values)), n))
            out.push(...exec(branch.yes ? n.body : n.other, [branch.s], api));
        return cap(out, n, api);
      }
      if (["for", "foreach", "while", "do"].includes(n.k))
        return loop(n, s, api);
      if (n.k === "switch") {
        n = { ...n, refs: ["switch"] };
        api.note(s, n, "switchの条件を順に判定します");
        const output = [];
        for (const r of pipeline(n.test, s, api)) {
          r.s.ps.switches.push({ items: r.values });
          let active = [r.s],
            finished = [];
          for (let index = 0; index < r.values.length; index++) {
            for (const st of active) {
              const frame = st.ps.switches.at(-1);
              frame.matched = false;
              st.ps.items.push(frame.items[index]);
            }
            for (const cs of n.cases.filter((x) => !x.isDefault)) {
              const next = [];
              for (const st of active) {
                if (st.halt || st.ps.signal) {
                  next.push(st);
                  continue;
                }
                const item = st.ps.switches.at(-1).items[index],
                  test = binary(
                    "-eq",
                    isUnknown(item) ? item : text(item, n),
                    text(cs.value, n),
                    st,
                    n,
                    api,
                  );
                for (const branch of api.choose(st, test, n)) {
                  if (branch.yes) {
                    branch.s.ps.switches.at(-1).matched = true;
                    next.push(...exec(cs.body, [branch.s], api));
                  } else next.push(branch.s);
                }
              }
              active = cap(next, n, api);
            }
            const next = [];
            for (const st of active) {
              const frame = st.ps.switches.at(-1),
                def = n.cases.find((x) => x.isDefault),
                results =
                  !frame.matched && !st.ps.signal && def
                    ? exec(def.body, [st], api)
                    : [st];
              for (const v of results) {
                v.ps.items.pop();
                if (v.ps.signal === "break") {
                  v.ps.signal = null;
                  finished.push(v);
                } else if (v.halt || v.ps.signal === "return") finished.push(v);
                else {
                  v.ps.signal = null;
                  next.push(v);
                }
              }
            }
            active = next;
          }
          for (const st of [...finished, ...active]) {
            st.ps.switches.pop();
            output.push(st);
          }
        }
        return cap(output, n, api);
      }
      if (n.k === "return") {
        if (n.value)
          return pipeline(n.value, s, api).map((r) => {
            emit(r.s, r.values, n, api);
            api.note(
              r.s,
              { ...n, refs: ["return"] },
              "値を出力して現在の処理から戻ります",
            );
            r.s.ps.signal = "return";
            return r.s;
          });
        api.note(s, { ...n, refs: ["return"] }, "現在の処理から戻ります");
        s.ps.signal = "return";
        return [s];
      }
      if (n.k === "break" || n.k === "continue") {
        if (!s.ps.loops.length && !s.ps.switches.length)
          fail(
            n.k + "はループまたはswitchの中で使用してください",
            n.line,
            "RuntimeException",
          );
        api.note(s, { ...n, refs: [n.k] }, n.k + "で制御を移します");
        s.ps.signal = n.k;
        return [s];
      }
      fail("未対応のPowerShell文：" + n.k, n.line);
    }
    function exec(list, states, api) {
      if (++sDepth > api.limits.depth) {
        for (const s of states)
          api.stop(s, list[0] || { line: 1 }, "制御構造の深さ上限");
        sDepth--;
        return states;
      }
      for (const n of list) {
        const next = [];
        for (const s of states) {
          if (s.halt || s.ps.signal) {
            next.push(s);
            continue;
          }
          try {
            next.push(...statement(n, s, api));
          } catch (e) {
            s.error = {
              line: e.line || n.line,
              message: e.message,
              category: e.category || "RuntimeException",
            };
            s.ps.success = false;
            s.halt = true;
            api.note(s, { ...n, refs: [] }, e.message, "error");
            next.push(s);
          }
        }
        states = cap(next, n, api);
      }
      sDepth--;
      return states;
    }
    let sDepth = 0;
    return shellRuntime(
      [{ k: "ps-program", body: nodes, line: 1 }],
      model,
      (s) => {
        initFiles(s);
        s.vars = Object.fromEntries(
          Object.entries(s.vars).map(([k, v]) => [k, modelValue(v)]),
        );
        s.ps = {
          functions: {},
          calls: [],
          streams: [[]],
          items: [],
          loops: [],
          switches: [],
          pipes: [],
          lastPipeline: [],
          success: true,
          signal: null,
        };
      },
      (n, s, api) => exec(n.body, [s], api),
      (s) => [
        {
          title: "変数",
          entries: Object.entries(s.vars).map(([k, v]) => [
            "$" + k,
            psFormat(v),
          ]),
        },
        {
          title: "最後に評価したパイプライン",
          entries: [
            [
              "値",
              s.ps.lastPipeline.length
                ? s.ps.lastPipeline.map(psFormat).join("\n\n")
                : "（出力なし）",
            ],
          ],
        },
        {
          title: "モデルの終了状態",
          entries: [
            ["現在フォルダ", s.model.cwd],
            ["$?", psFormat(s.ps.success)],
            ["$LASTEXITCODE", psFormat(s.model.lastExitCode ?? null)],
            ["仮想ファイル一覧", fileDisplay(s.model.files)],
          ],
        },
      ],
      limits,
    );
  } catch (e) {
    return sourceError(e);
  }
}
