import { additionalTemplates } from "./additional-templates.js";
import {
  simulateScript,
  scanScript,
  PracticeError,
  baseBinary,
  unsupported,
} from "../../core/script.js";
import { rows } from "../../core/data.js";
import { unknown, isUnknown, formatModelValue as formatValue } from "../../core/contract.js";
const NA = { kind: "NA" },
  isNA = (v) => v?.kind === "NA",
  vec = (v) => (Array.isArray(v) ? v : [v]),
  flat = (v) => vec(v).flat();
const show = (v) =>
  isNA(v)
    ? "NA"
    : Array.isArray(v)
      ? "c(" + v.map(show).join(", ") + ")"
      : v?.kind === "data.frame"
        ? Object.entries(v.columns)
            .map(([k, x]) => k + ": " + show(x))
            .join("\n")
        : typeof v === "boolean"
          ? v
            ? "TRUE"
            : "FALSE"
          : typeof v === "string"
            ? JSON.stringify(v)
            : formatValue(v);
const reference = rows([
  [
    "c",
    "ベクトル",
    "c(1, 2, 3)",
    "値をまとめ、共通の型へ変換したベクトルを作ります。",
    "x <- c(10, 20, 30)",
    "型階層：logical → numeric → character。このモデルは複素数・rawを扱いません。",
  ],
  [
    "sum",
    "集計",
    "sum(x, na.rm = FALSE)",
    "ベクトルの合計を返します。",
    "sum(c(1, 2, 3))",
    "NAを除くにはna.rm=TRUE。",
  ],
  [
    "mean",
    "集計",
    "mean(x, na.rm = FALSE)",
    "算術平均を求めます。",
    "mean(c(1, 2, 3))",
  ],
  [
    "median",
    "集計",
    "median(x, na.rm = FALSE)",
    "中央値を返します。",
    "median(c(2, 9, 3))",
  ],
  [
    "sd",
    "集計",
    "sd(x, na.rm = FALSE)",
    "標本標準偏差を返します。",
    "sd(c(1, 2, 3))",
    "分母はn-1。要素が1個以下ならNAです。",
  ],
  ["length", "ベクトル", "length(x)", "要素数を返します。", "length(c(1, 2))"],
  [
    "seq",
    "ベクトル",
    "seq(from, to, by)",
    "等差数列を作ります。",
    "seq(1, 5, 2)",
  ],
  [
    "seq_len",
    "ベクトル",
    "seq_len(n)",
    "1からnまでの整数列。0なら空ベクトルです。",
    "seq_len(3)",
  ],
  [
    "rep",
    "ベクトル",
    "rep(x, times)",
    "ベクトルを繰り返します。",
    "rep(c(1,2), 2)",
  ],
  [
    "data.frame",
    "データフレーム",
    'data.frame(name = c("A","B"), score = c(3,5))',
    "同じ行数の列を持つ表を作ります。",
    "df <- data.frame(x = c(1,2), y = c(3,4))",
    "列長は整数倍ならリサイクルします。因子・行名の詳細は未対応。",
  ],
  [
    "nrow",
    "データフレーム",
    "nrow(df)",
    "データフレームの行数です。",
    "nrow(df)",
  ],
  [
    "ncol",
    "データフレーム",
    "ncol(df)",
    "データフレームの列数です。",
    "ncol(df)",
  ],
  ["names", "データフレーム", "names(df)", "列名を返します。", "names(df)"],
  [
    "is.na",
    "欠損値",
    "is.na(x)",
    "欠損値を要素ごとに調べます。",
    "is.na(c(1, NA))",
  ],
  [
    "as.numeric",
    "型変換",
    "as.numeric(x)",
    "数値へ変換します。変換不能な文字列はNAです。",
    'as.numeric(c("1","x"))',
  ],
  [
    "as.character",
    "型変換",
    "as.character(x)",
    "文字列へ変換します。",
    "as.character(c(1,2))",
  ],
  [
    "print",
    "入出力",
    "print(x)",
    "値を出力します。画面では学習用の値表記（c(...)等）で示し、Rコンソールの整形は再現しません。",
    "print(mean(x))",
  ],
  [
    "cat",
    "入出力",
    'cat(..., sep = " ")',
    "値を連結して出力します。",
    'cat("平均", mean(x), "\n")',
  ],
  [
    "readline",
    "入出力",
    "readline(prompt)",
    "入力は実行時に決まる文字列として扱います。",
    'x <- readline("入力: ")',
  ],
  [
    "read.csv",
    "入出力",
    'read.csv("model.csv")',
    "モデルのデータフレームを読み込みます。",
    'df <- read.csv("model.csv")',
    "モデルに存在しない実ファイルを読みません。",
  ],
  [
    "if",
    "制御",
    "if (条件) { … } else { … }",
    "長さ1でNAでない条件を評価します。",
    'if (mean(x) > 5) { print("大") }',
    "長さ2以上の条件はエラー。",
  ],
  [
    "for",
    "制御",
    "for (i in ベクトル) { … }",
    "ベクトルを最初に評価して、各要素で繰り返します。",
    "for (i in 1:3) { print(i) }",
  ],
  [
    "while",
    "制御",
    "while (条件) { … }",
    "条件が成立する間繰り返します。",
    "while (x < 3) { x <- x + 1 }",
  ],
]);
for (const r of reference) {
  if (["nrow","ncol","names"].includes(r.name)) r.example = "df <- data.frame(x=c(1,2),y=c(3,4))\n" + r.example;
  if (["print","cat","if"].includes(r.name)) r.example = "x <- c(2,4,6)\n" + r.example;
  if (r.name === "while") r.example = "x <- 0\n" + r.example;
}
function coerce(values) {
  if (values.some((v) => typeof v === "string"))
    return values.map((v) =>
      isNA(v)
        ? NA
        : typeof v === "boolean"
          ? v
            ? "TRUE"
            : "FALSE"
          : String(v),
    );
  if (values.some((v) => typeof v === "number"))
    return values.map((v) => (isNA(v) ? NA : Number(v)));
  return values;
}
function truth(v, line) {
  let a = vec(v);
  if (a.length !== 1)
    throw new PracticeError(
      a.length ? "the condition has length > 1" : "argument is of length zero",
      line,
    );
  if (isNA(a[0]) || Number.isNaN(a[0]))
    throw new PracticeError("missing value where TRUE/FALSE needed", line);
  if (typeof a[0] === "string")
    throw new PracticeError("argument is not interpretable as logical", line);
  return Boolean(a[0]);
}
function subset(values, index) {
  if (index === undefined) return structuredClone(values);
  if (index === null) return [];
  let indexes = vec(index).map((v) =>
    typeof v === "number" ? Math.trunc(v) : v,
  );
  if (indexes.every((v) => typeof v === "boolean" || isNA(v))) {
    return Array.from({ length: Math.max(values.length, indexes.length) }, (_, i) => values[i] ?? NA).flatMap((v, i) =>
      isNA(indexes[i % indexes.length])
        ? [NA]
        : indexes[i % indexes.length]
          ? [v]
          : [],
    );
  }
  if (indexes.some(isNA) && indexes.some((v) => typeof v === "number" && v < 0))
    throw new PracticeError("only 0 may be mixed with negative subscripts");
  let positives = indexes.some((v) => typeof v === "number" && v > 0),
    negatives = indexes.some((v) => typeof v === "number" && v < 0);
  if (positives && negatives)
    throw new PracticeError("only 0 may be mixed with negative subscripts");
  if (negatives) {
    let omit = new Set(indexes.map((v) => -Math.trunc(v)));
    return values.filter((_, i) => !omit.has(i + 1));
  }
  return indexes
    .filter((v) => v !== 0)
    .map((v) => (isNA(v) ? NA : (values[Math.trunc(v) - 1] ?? NA)));
}
export const definition = {
  id: "r",
  name: "R",
  extensions: [".R", ".r", ".txt"],
  syntax: { name: "R base", caseSensitive: true, lineComment: "#" },
  reference,
  templates: [
    {
      id: "r-vectors",
      title: "ベクトルと欠損値の集計",
      code: "x <- c(10, 20, NA, 40)\nprint(mean(x))\nprint(mean(x, na.rm = TRUE))\nprint(x * 2)\nprint(is.na(x))",
      intro:
        "NAは実行時の未確定値とは異なる欠損値です。meanのna.rmで扱いを比べます。",
      refs: ["c", "mean", "is.na", "print"],
    },
    {
      id: "r-frame",
      title: "データフレームを更新する",
      code: 'df <- data.frame(name = c("A", "B", "C"), score = c(50, 80, 95))\ndf$bonus <- df$score + 5\nprint(df)\nprint(mean(df$bonus))\nprint(df[1, ])',
      intro:
        "data.frameの列を$で参照し、ベクトル演算で新しい列を追加します。添字は1始まりです。",
      refs: ["data.frame", "mean", "print"],
    },
    {
      id: "r-loop",
      title: "分岐と繰り返し",
      code: 'total <- 0\nfor (i in 1:5) {\n    total <- total + i\n}\nif (total > 10) {\n    print("大きい")\n} else {\n    print("小さい")\n}\nprint(total)',
      intro:
        "forは開始時点のベクトルを順番に処理します。最後にiは5のまま残ります。",
      refs: ["for", "if", "print"],
    },
  ],
  glossary: [
    ["ベクトル", "同じ基本型の値を順に並べたオブジェクトです。"],
    ["データフレーム", "同じ行数の列をまとめた表です。"],
    ["NA", "欠損値。FALSEでも実行時の未知値でもありません。"],
    ["リサイクル", "長さの短いベクトルを繰り返して演算に用いる規則です。"],
  ],
  model: {
    kind: "json",
    title: "モデルオブジェクト",
    hint: "variablesにベクトル・データフレームの初期値、filesにCSVを表すモデルデータを指定できます。",
    defaults: {
      variables: {},
      files: {
        "model.csv": {
          kind: "data.frame",
          columns: { x: [1, 2, 3], y: [4, 5, 6] },
        },
      },
    },
  },
  semantics: {
    description:
      "base Rの数値・logical・characterベクトル、NA、データフレーム、1始まりの添字、リサイクルをモデル化します。",
    support:
      "因子、S3/S4、パッケージ、行名、複素数・raw、integer型の演算上限、ユーザー関数等は未対応です。乱数とreadlineは未確定値として扱います。",
    sources: [
      {
        title: "R公式 Arithmetic",
        url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/Arithmetic.html",
      },
      {
        title: "R公式 添字",
        url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/Extract.html",
      },
      {
        title: "R公式 制御フロー",
        url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/Control.html",
      },
    ],
  },
  scan: (code) => scanScript(code, reference, "r"),
  async simulate(code, model, limits) {
    return simulateScript(
      code,
      model,
      {
        dialect: "r",
        constants: {TRUE:true,FALSE:false,NULL:null,T:true,F:false},
        copyOnAssign: true,
        truth,
        literal(v, a) {
          if (a.raw?.endsWith("L"))
            unsupported(
              "integer型リテラル（数値型を使用してください）",
              a.line,
            );
          return v;
        },
        read(a, s, api) {
          if (a.k === "unary" && ["-", "+", "!"].includes(a.op)) {
            let x = api.read(a.arg, s);
            if (isUnknown(x)) return { handled: true, value: x };
            return {
              handled: true,
              value: vec(x).map((v) =>
                isNA(v)
                  ? NA
                  : a.op === "!"
                    ? !Boolean(v)
                    : a.op === "-"
                      ? -Number(v)
                      : Number(v),
              ),
            };
          }
          if (a.k === "var" && a.name === "NA")
            return { handled: true, value: NA };
          if (a.k === "var" && a.name === "NaN")
            return { handled: true, value: NaN };
          if (a.k === "var" && a.name === "Inf")
            return { handled: true, value: Infinity };
          if (a.k === "member") {
            let x = api.read(a.target, s);
            if (x?.kind === "data.frame") {
              if (!Object.hasOwn(x.columns, a.name))
                return { handled: true, value: null };
              return { handled: true, value: x.columns[a.name] };
            }
          }
          if (a.k === "index") {
            let x = api.read(a.target, s),
              indexes = a.indexes.map((i) => (i ? api.read(i, s) : undefined));
            if (isUnknown(x) || indexes.some(isUnknown))
              return { handled: true, value: unknown("実行時の添字による") };
            if (x?.kind === "data.frame") {
              if (indexes.length === 1) {
                let cols =
                  indexes[0] === undefined
                    ? Object.keys(x.columns)
                    : indexes[0] === null ? [] : vec(indexes[0]).map((i) =>
                        typeof i === "string"
                          ? i
                          : Object.keys(x.columns)[i - 1],
                      );
                return {
                  handled: true,
                  value: {
                    kind: "data.frame",
                    columns: Object.fromEntries(
                      cols.map((k) => {
                        if (!Object.hasOwn(x.columns, k))
                          api.fail("undefined columns selected", a);
                        return [k, x.columns[k]];
                      }),
                    ),
                  },
                };
              }
              let colKeys =
                indexes[1] === undefined
                  ? Object.keys(x.columns)
                  : indexes[1] === null ? [] : vec(indexes[1]).map((i) =>
                      typeof i === "string" ? i : Object.keys(x.columns)[i - 1],
                    );
              let cols = Object.fromEntries(
                colKeys.map((k) => {
                  if (!x.columns[k]) api.fail("undefined columns selected", a);
                  return [k, subset(x.columns[k], indexes[0])];
                }),
              );
              return {
                handled: true,
                value:
                  colKeys.length === 1
                    ? cols[colKeys[0]]
                    : { kind: "data.frame", columns: cols },
              };
            }
            if (a.double) {
              let i = Number(vec(indexes[0])[0]);
              if (!Number.isInteger(i) || i < 1 || i > vec(x).length)
                api.fail("subscript out of bounds", a);
              return { handled: true, value: vec(x)[i - 1] };
            }
            return { handled: true, value: subset(vec(x), indexes[0]) };
          }
          return null;
        },
        write(a, v, s, api, node) {
          if (a.k === "member") {
            let target = api.read(a.target, s);
            if (target?.kind === "data.frame") {
              let n = Object.values(target.columns)[0]?.length || vec(v).length,
                values = vec(v);
              if (!values.length || n % values.length)
                api.fail("replacement has incompatible rows", node);
              target.columns[a.name] = Array.from({ length: n }, (_, i) =>
                structuredClone(values[i % values.length]),
              );
              return true;
            }
          }
          if (a.k === "index") {
            let target = api.read(a.target, s);
            if (target?.kind === "data.frame")
              api.fail(
                "データフレームへの添字代入は未対応です。$で列を指定してください",
                node,
              );
            let idx = vec(api.read(a.indexes[0], s));
            if (
              !Array.isArray(target) ||
              idx.some((i) => !Number.isInteger(i) || i < 1)
            )
              api.fail("この添字代入は未対応です", node);
            let values = vec(v);
            if (!values.length) api.fail("replacement has length zero", node);
            idx.forEach((index, j) => {
              while (target.length < index) target.push(NA);
              target[index - 1] = values[j % values.length];
            });
            return true;
          }
          return false;
        },
        binary(op, a, b, node, s, api) {
          if (isUnknown(a) || isUnknown(b)) return baseBinary(op, a, b, "r");
          if (op === ":") {
            let from = Number(vec(a)[0]),
              to = Number(vec(b)[0]);
            if (!Number.isFinite(from) || !Number.isFinite(to))
              api.fail("NA/NaN argument", node);
            let length = Math.floor(Math.abs(to - from)) + 1;
            if (length > 10000) api.fail("ベクトル長の上限です", node);
            return Array.from(
              { length },
              (_, i) => from + (to >= from ? i : -i),
            );
          }
          if (op === "&&" || op === "||")
            return baseBinary(op, truth(a, node.line), truth(b, node.line));
          let x = vec(a),
            y = vec(b);
          if (!x.length || !y.length) return [];
          let length = Math.max(x.length, y.length);
          if (length % Math.min(x.length, y.length))
            api.note(
              s,
              node,
              "長いベクトルの長さが短いベクトルの長さの整数倍ではありません",
              "warning",
            );
          let out = Array.from({ length }, (_, i) => {
            let u = x[i % x.length],
              v = y[i % y.length];
            if (op === "^" && (u === 1 || v === 0)) return 1;
            if (
              op === "&" &&
              (u === false || v === false || u === 0 || v === 0)
            )
              return false;
            if (
              op === "|" &&
              ((!isNA(u) && Boolean(u)) || (!isNA(v) && Boolean(v)))
            )
              return true;
            if (isNA(u) || isNA(v)) return NA;
            if (["+", "-", "*", "/", "^", "%%", "%/%"].includes(op)) {
              if (typeof u === "string" || typeof v === "string")
                api.fail("non-numeric argument to binary operator", node);
              return baseBinary(op, Number(u), Number(v), "r");
            }
            if (op === "&") return Boolean(u && v);
            if (op === "|") return Boolean(u || v);
            if (typeof u === "string" || typeof v === "string") {
              u = typeof u === "boolean" ? (u ? "TRUE" : "FALSE") : String(u);
              v = typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v);
            }
            return baseBinary(op, u, v, "r");
          });
          return out;
        },
        call(name, args, s, api, node) {
          let vals = args.map((a) => api.read(a, s)),
            named = Object.fromEntries(
              args.flatMap((a, i) => (a.argName ? [[a.argName, vals[i]]] : [])),
            ),
            pos = vals.filter((_, i) => !args[i].argName);
          if (["readline", "rnorm", "runif", "sample"].includes(name))
            return api.freshUnknown(name + "の実行時の値", s);
          if (pos.some(isUnknown)) return unknown(name + "の引数による");
          let x = pos[0] ?? named.x ?? vals[0];
          switch (name) {
            case "c":
              return coerce(pos.flatMap((v) => (v === null ? [] : vec(v))));
            case "length":
              return x?.kind === "data.frame"
                ? Object.keys(x.columns).length
                : x === null
                  ? 0
                  : vec(x).length;
            case "is.na":
              return vec(x).map((v) => isNA(v) || Number.isNaN(v));
            case "as.numeric": {
              const result = vec(x).map((v) =>
                isNA(v)
                  ? NA
                  : typeof v === "string" && v.trim() === ""
                    ? NA
                    : Number.isNaN(Number(v))
                      ? NA
                      : Number(v),
              );
              if (result.some((v, i) => isNA(v) && !isNA(vec(x)[i]) && !Number.isNaN(vec(x)[i]))) api.note(s, node, "変換によりNAが生成されました（NAs introduced by coercion）", "warning");
              return result;
            }
            case "as.character":
              return vec(x).map((v) =>
                isNA(v)
                  ? NA
                  : typeof v === "boolean"
                    ? v
                      ? "TRUE"
                      : "FALSE"
                    : String(v),
              );
            case "print":
              s.outputs.push({
                channel: "print",
                text: show(x),
                line: node.line,
              });
              api.note(s, node, "出力します：" + show(x));
              return x;
            case "cat": {
              let text = pos
                .flatMap(vec)
                .map((v) => (isNA(v) ? "NA" : String(v)))
                .join(named.sep ?? " ");
              s.outputs.push({ channel: "cat", text, line: node.line });
              return null;
            }
            case "sum":
            case "mean":
            case "median":
            case "sd": {
              if (name !== "sum" && pos.length > 1)
                api.fail(
                  "この関数は第2引数以降を名前付きで指定してください",
                  node,
                );
              let a = name === "sum" ? pos.flatMap(vec) : vec(x);
              if (named["na.rm"] === true)
                a = a.filter((v) => !isNA(v) && !Number.isNaN(v));
              if (name === "mean" && a.some(v => typeof v === "string")) {
                api.note(s, node, "引数は数値でも論理値でもありません。NAを返します（argument is not numeric or logical: returning NA）", "warning");
                return NA;
              }
              if (a.some(isNA)) return NA;
              if (
                a.some((v) => typeof v !== "number" && typeof v !== "boolean")
              )
                api.fail("invalid type of argument", node);
              let nums = a.map(Number),
                sum = nums.reduce((a, b) => a + b, 0);
              if (name === "sum") return sum;
              if (name === "mean") {
                const trim = named.trim ?? 0;
                if (typeof trim !== "number" || !Number.isFinite(trim)) api.fail("trimは有限の数値で指定してください", node);
                if (trim > 0 && nums.length) {
                  const sorted = [...nums].sort((a,b) => a-b);
                  if (trim >= 0.5) { const m = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[m] : (sorted[m-1]+sorted[m])/2; }
                  const cut = Math.floor(nums.length * trim), remaining = sorted.slice(cut, nums.length-cut);
                  return remaining.reduce((a,b) => a+b,0)/remaining.length;
                }
                return nums.length ? sum / nums.length : NaN;
              }
              if (name === "median") {
                if (!nums.length) return NA;
                nums.sort((a, b) => a - b);
                let m = Math.floor(nums.length / 2);
                return nums.length % 2 ? nums[m] : (nums[m - 1] + nums[m]) / 2;
              }
              if (nums.length < 2) return NA;
              return Math.sqrt(
                nums.reduce((v, x) => v + (x - sum / nums.length) ** 2, 0) /
                  (nums.length - 1),
              );
            }
            case "data.frame": {
              let cols = Object.fromEntries(
                  args.map((a, i) => [
                    a.argName || "V" + (i + 1),
                    vec(vals[i]),
                  ]),
                ),
                lens = Object.values(cols).map((x) => x.length),
                n = Math.max(0, ...lens);
              if (lens.some((l) => (l === 0 && n) || n % l))
                api.fail("arguments imply differing number of rows", node);
              return {
                kind: "data.frame",
                columns: Object.fromEntries(
                  Object.entries(cols).map(([k, v]) => [
                    k,
                    Array.from({ length: n }, (_, i) => v[i % v.length]),
                  ]),
                ),
              };
            }
            case "nrow":
              return x?.kind === "data.frame"
                ? Object.values(x.columns)[0]?.length || 0
                : null;
            case "ncol":
              return x?.kind === "data.frame"
                ? Object.keys(x.columns).length
                : null;
            case "names":
              return x?.kind === "data.frame" ? Object.keys(x.columns) : null;
            case "seq_len": {
              let n = Number(x);
              if (!Number.isInteger(n) || n < 0 || n > 10000)
                api.fail("invalid length", node);
              return Array.from({ length: n }, (_, i) => i + 1);
            }
            case "seq": {
              let from = Number(named.from ?? pos[0]),
                to = Number(named.to ?? pos[1]),
                by =
                  named.by === undefined && pos[2] === undefined
                    ? to >= from
                      ? 1
                      : -1
                    : Number(named.by ?? pos[2]);
              if (
                !by ||
                ![from, to, by].every(Number.isFinite) ||
                (to - from) * by < 0
              )
                api.fail("wrong sign in by argument", node);
              let n = Math.floor((to - from) / by) + 1;
              if (n > 10000) api.fail("ベクトル長の上限です", node);
              return Array.from({ length: n }, (_, i) => from + i * by);
            }
            case "rep": {
              let n = Number(named.times ?? pos[1]);
              if (!Number.isInteger(n) || n < 0 || n * vec(x).length > 10000)
                api.fail("invalid times", node);
              return Array.from({ length: n }, () => vec(x)).flat();
            }
            case "read.csv":
              if (!Object.hasOwn(s.model.files || {}, x))
                api.fail("モデルにファイルがありません：" + x, node);
              return structuredClone(s.model.files[x]);
            default:
              api.fail("このR関数は説明に対応していません：" + name, node);
          }
        },
        groups: (p) => [
          {
            title: "ベクトル・データフレーム・変数",
            entries: Object.entries(p.vars).map(([k, v]) => [k, show(v)]),
          },
        ],
      },
      limits,
    );
  },
};

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
