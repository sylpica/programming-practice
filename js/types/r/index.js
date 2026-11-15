import { additionalTemplates } from "./additional-templates.js";
import {
  simulateScript,
  scanScript,
  tokenize,
  PracticeError,
  baseBinary,
  unsupported,
} from "../../core/script.js";
import { rows } from "../../core/data.js";
import { unknown, isUnknown, LIMITS, formatModelValue as formatValue } from "../../core/contract.js";
// R15-N15 / RG-14: names that really are R functions. Used only when the name
// is not bound as a variable, to stop honestly instead of "undefined name".
const FUNCTION_NAMES = new Set(
  "c sum mean median sd length seq seq_len rep data.frame nrow ncol names is.na as.numeric as.character print cat readline read.csv rnorm runif sample sqrt abs log log10 log2 exp sin cos tan asin acos atan atan2 round floor ceiling trunc min max range sort rev order unique paste paste0 sprintf substr nchar toupper tolower sapply lapply apply mapply tapply vapply replicate list factor matrix array dim rownames colnames head tail summary plot".split(" "),
);
const NA = { kind: "NA" },
  isNA = (v) => v?.kind === "NA",
  // RG-03: NULL (JS null) is a length-0 object in R, never a length-1 zero.
  vec = (v) => (v === null ? [] : Array.isArray(v) ? v : [v]),
  flat = (v) => vec(v).flat(),
  isNaNVal = (v) => typeof v === "number" && Number.isNaN(v),
  isMissing = (v) => isNA(v) || isNaNVal(v),
  namesOf = (v) => (Array.isArray(v) && Array.isArray(v.names) ? v.names : null),
  withNames = (arr, names) => {
    if (names && names.some((n) => n !== null && n !== undefined && n !== ""))
      arr.names = [...names];
    return arr;
  };
const show = (v) =>
  isNA(v)
    ? "NA"
    : v === null
      ? "NULL"
      : Array.isArray(v)
        ? "c(" +
          v
            .map((el, i) => {
              const nm = v.names?.[i];
              return (nm ? nm + " = " : "") + show(el);
            })
            .join(", ") +
          ")"
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
            : typeof v === "number"
              ? v === Infinity
                ? "Inf"
                : v === -Infinity
                  ? "-Inf"
                  : Number.isNaN(v)
                    ? "NaN"
                    : String(v)
              : formatValue(v);
const reference = rows([
  [
    "c",
    "ベクトル",
    "c(1, 2, 3)",
    "値をまとめ、共通の型へ変換したベクトルを作ります。",
    "x <- c(10, 20, 30)",
    "型階層：logical → numeric → characterです。このモデルは複素数・rawを扱いません。",
  ],
  [
    "sum",
    "集計",
    "sum(x, na.rm = FALSE)",
    "ベクトルの合計を返します。",
    "sum(c(1, 2, 3))",
    "NAを除くにはna.rm=TRUEを指定します。",
  ],
  [
    "mean",
    "集計",
    "mean(x, trim = 0, na.rm = FALSE)",
    "算術平均を求めます。trimは両端から切り取る割合で、0.5以上のときは中央値です。",
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
    "分母はn-1です。要素が1個以下ならNAです。",
  ],
  [
    "length",
    "ベクトル",
    "length(x)",
    "要素数を返します。データフレームでは列数を返します（行数はnrowで返します）。",
    "length(c(1, 2))",
  ],
  [
    "seq",
    "ベクトル",
    "seq(from, to, by, length.out, along.with)",
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
    "rep(x, times, length.out, each)",
    "ベクトルを繰り返します。",
    "rep(c(1,2), 2)",
  ],
  [
    "data.frame",
    "データフレーム",
    'data.frame(name = c("A","B"), score = c(3,5))',
    "同じ行数の列を持つ表を作ります。データフレームへの演算は列ごとの要素演算として行われますが、四則演算ができるのは数値列（numeric／logical）のみで、文字列などの列を含むデータフレームへの四則演算はエラーになります。比較も列の型の組み合わせに制約があります。",
    "df <- data.frame(x = c(1,2), y = c(3,4))",
    "列長は整数倍ならリサイクルします。因子・行名の詳細は未対応です。",
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
  [
    "names",
    "データフレーム",
    "names(x)",
    "データフレームでは列名を、名前付きベクトルでは要素名を返します。名前がなければNULLです。",
    "v <- c(a = 1, b = 2)\nnames(v)",
  ],
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
    "if (条件) { … } else { … }／値 <- if (条件) 式 else 式",
    "長さ1でNAでない条件を評価します。文としてだけでなく、選択した式の値を返す式としても使えます（elseがなく条件が不成立ならNULL）。",
    'if (mean(x) > 5) { print("大") }',
    "長さ2以上の条件はエラーです。",
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
  [
    "rnorm",
    "乱数",
    "rnorm(n, mean = 0, sd = 1)",
    "正規分布に従う乱数を返します。このモデルでは値は実行時に決まる未確定値として扱い、数値は作りません。",
    "x <- rnorm(3)",
    "再現のための種（set.seed）は未対応です。",
  ],
  [
    "runif",
    "乱数",
    "runif(n, min = 0, max = 1)",
    "一様分布に従う乱数を返します。このモデルでは値は実行時に決まる未確定値として扱い、数値は作りません。",
    "x <- runif(3)",
    "再現のための種（set.seed）は未対応です。",
  ],
  [
    "sample",
    "乱数",
    "sample(x, size, replace = FALSE, prob = NULL)",
    "ベクトルから要素を無作為に抽出します。このモデルでは抽出結果は実行時に決まる未確定値として扱い、どの要素が選ばれたかは示しません。",
    "sample(c(1, 2, 3), 2)",
    "結果は未確定値です。再現のための種（set.seed）は未対応です。",
  ],
  [
    "%in%",
    "演算子",
    "x %in% table",
    "左辺の各要素が右辺に含まれるかを要素ごとに判定します。欠損値同士は一致とみなされ、結果にNAは含まれません。",
    "c(1, 3) %in% c(1, 2)",
  ],
  [
    "$",
    "データフレーム",
    "df$列名",
    "データフレームの列を名前で取り出します。名前の部分一致も行われ、接頭辞として一意に定まる略名でも列が取り出せます。部分一致でも見つからない列はNULLです。代入（df$列 <- 値）で列の追加や置換もできます（代入では部分一致は行われません）。",
    "df <- data.frame(x = c(1, 2))\ndf$x",
  ],
  [
    "[",
    "添字",
    "x[添字]",
    "ベクトルやデータフレームの一部を取り出します。添字は1始まりで、正の添字は選択、負の添字は除外、論理添字はTRUEの位置の選択、文字列添字は名前による選択です。",
    "x <- c(10, 20, 30)\nx[2]",
  ],
  [
    "[[",
    "添字",
    "x[[添字]]",
    "単一の要素を取り出します。データフレームでは1列をベクトルとして取り出します。[ と違い、結果は部分集合ではなく要素そのものです。",
    "x <- c(10, 20, 30)\nx[[2]]",
  ],
  [
    "NA",
    "欠損値",
    "NA",
    "欠損を表す長さ1の論理値です。原則として演算や比較に使うと結果もNAになりますが、例外もあります（NA | TRUE は TRUE、NA & FALSE は FALSE、NA ^ 0 は 1 になります）。欠損かどうかはis.naで調べます。",
    "x <- c(1, NA)",
  ],
  [
    "NULL",
    "定数",
    "NULL",
    "長さ0の空のオブジェクトです。c()の引数に渡しても要素は追加されません。",
    "length(NULL)",
  ],
  [
    "break",
    "制御",
    "break",
    "最も内側のループ（for／while／repeat）を直ちに終了します。",
    "for (i in 1:5) { if (i > 2) { break } }",
  ],
  [
    "next",
    "制御",
    "next",
    "ループの現在の繰り返しを飛ばし、次の要素・回へ進みます。",
    "for (i in 1:3) { if (i == 2) { next } }",
  ],
  [
    "repeat",
    "制御",
    "repeat { … }",
    "条件なしに繰り返します。通常は本体の中でbreakを使って終了します。",
    "x <- 0\nrepeat { x <- x + 1; if (x >= 3) { break } }",
  ],
  [
    ":",
    "演算子",
    "from:to",
    "開始値から終了値まで1ずつ増減する列を作ります。seq_lenやseqの基本形です。",
    "1:3",
  ],
  [
    "%%",
    "演算子",
    "x %% y",
    "除算の余り（剰余）を返します。結果の符号は除数yに一致します。",
    "7 %% 3",
  ],
  [
    "%/%",
    "演算子",
    "x %/% y",
    "floor除算（負の無限大方向へ丸めた商）を返します。例えば -7 %/% 3 は -2 ではなく -3 です。",
    "7 %/% 3",
  ],
  [
    "NaN",
    "定数",
    "NaN",
    "0/0のような不定な数値計算の結果を表す値です。is.na(NaN)はTRUEですが、NaN同士の比較はNAになります。",
    "x <- NaN",
  ],
  [
    "Inf",
    "定数",
    "Inf",
    "正の無限大です。1/0の結果などで現れます。負の無限大は-Infです。",
    "x <- Inf",
  ],
  [
    "TRUE",
    "定数",
    "TRUE",
    "真を表す長さ1の論理値です。予約語のため代入できません。",
    "c(TRUE, FALSE)",
  ],
  [
    "FALSE",
    "定数",
    "FALSE",
    "偽を表す長さ1の論理値です。予約語のため代入できません。",
    "c(TRUE, FALSE)",
  ],
  [
    "T",
    "定数",
    "T",
    "TRUEの別名です。予約語ではないため代入で上書きできます。",
    "x <- T",
    "代入で意味が変わるため、通常はTRUEを使ってください。",
  ],
  [
    "F",
    "定数",
    "F",
    "FALSEの別名です。予約語ではないため代入で上書きできます。",
    "x <- F",
    "代入で意味が変わるため、通常はFALSEを使ってください。",
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
  // R-01: if / while / if式の条件は長さ1の論理値でなければならない
  // （?Control）。数値・文字列は論理値へ黙って強制せず、実 R どおり
  // "argument is not interpretable as logical" で停止する。
  let a = vec(v);
  if (a.length !== 1)
    throw new PracticeError(
      a.length ? "the condition has length > 1" : "argument is of length zero",
      line,
    );
  if (isNA(a[0]) || Number.isNaN(a[0]))
    throw new PracticeError("missing value where TRUE/FALSE needed", line);
  if (typeof a[0] !== "boolean")
    throw new PracticeError("argument is not interpretable as logical", line);
  return a[0];
}
// ?Logic: ! / & / | / && / || では数値が論理値へ強制される（0=FALSE、
// それ以外=TRUE）。条件（truth）とは扱いが異なるため、&& / || 専用の
// 強制を使う。戻り値は true / false / NA のいずれか。
function logicOperand(v, line) {
  let a = vec(v);
  if (a.length !== 1)
    throw new PracticeError(
      a.length ? "the condition has length > 1" : "argument is of length zero",
      line,
    );
  if (isMissing(a[0])) return NA;
  if (typeof a[0] === "string")
    throw new PracticeError("argument is not interpretable as logical", line);
  return Boolean(a[0]);
}
function subset(values, index) {
  if (index === undefined) return structuredClone(values);
  if (index === null) return [];
  const srcNames = namesOf(values);
  let indexes = vec(index).map((v) =>
    typeof v === "number" ? Math.trunc(v) : v,
  );
  // RG-38: character subscripts select by element name.
  if (indexes.some((v) => typeof v === "string")) {
    const out = [],
      outNames = [];
    for (const idx of indexes) {
      if (isNA(idx)) {
        out.push(NA);
        outNames.push(null);
      } else if (typeof idx === "string") {
        const at = srcNames ? srcNames.indexOf(idx) : -1;
        out.push(at >= 0 ? values[at] : NA);
        outNames.push(idx);
      } else if (typeof idx === "number" && idx > 0) {
        out.push(values[idx - 1] ?? NA);
        outNames.push(srcNames?.[idx - 1] ?? null);
      } else if (idx !== 0) {
        throw new PracticeError("only 0 may be mixed with negative subscripts");
      }
    }
    return withNames(out, outNames);
  }
  if (indexes.every((v) => typeof v === "boolean" || isNA(v))) {
    const out = [],
      outNames = [];
    const total = Math.max(values.length, indexes.length);
    for (let i = 0; i < total; i++) {
      const flag = indexes[i % indexes.length];
      if (isNA(flag)) {
        out.push(NA);
        outNames.push(srcNames?.[i] ?? null);
      } else if (flag) {
        out.push(values[i] ?? NA);
        outNames.push(srcNames?.[i] ?? null);
      }
    }
    return withNames(out, outNames);
  }
  if (indexes.some(isNA) && indexes.some((v) => typeof v === "number" && v < 0))
    throw new PracticeError("only 0 may be mixed with negative subscripts");
  let positives = indexes.some((v) => typeof v === "number" && v > 0),
    negatives = indexes.some((v) => typeof v === "number" && v < 0);
  if (positives && negatives)
    throw new PracticeError("only 0 may be mixed with negative subscripts");
  if (negatives) {
    let omit = new Set(indexes.map((v) => -Math.trunc(v)));
    const out = [],
      outNames = [];
    values.forEach((v, i) => {
      if (!omit.has(i + 1)) {
        out.push(v);
        outNames.push(srcNames?.[i] ?? null);
      }
    });
    return withNames(out, outNames);
  }
  const out = [],
    outNames = [];
  for (const v of indexes) {
    if (v === 0) continue;
    if (isNA(v)) {
      out.push(NA);
      outNames.push(null);
    } else {
      out.push(values[Math.trunc(v) - 1] ?? NA);
      outNames.push(srcNames?.[Math.trunc(v) - 1] ?? null);
    }
  }
  return withNames(out, outNames);
}
const targetName = (a) =>
  a?.k === "var"
    ? a.name
    : a?.k === "member"
      ? targetName(a.target) + "." + a.name
      : "";
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
    ["NA", "欠損値。FALSEでも実行時の未確定値でもありません。"],
    ["リサイクル", "長さの短いベクトルを繰り返して演算に用いる規則です。"],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
    ],
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
      "因子、S3/S4、パッケージ、行名、複素数・raw、integer型の演算上限、ユーザ関数等は未対応です。乱数とreadlineは未確定値として扱います。",
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
    // RG-14: the shared parser cannot represent `function` expressions and
    // otherwise reports false causes (a parameter NameError, or a missing
    // ")"). Detect the keyword on R tokens and stop honestly, naming it.
    try {
      const ft = tokenize(code, "r").find(
        (t) => t.k === "id" && t.v === "function",
      );
      if (ft)
        return {
          paths: [],
          error: {
            line: ft.line,
            message:
              "この構文は説明に対応していません：ユーザ関数定義（function）",
            category: "未対応",
          },
          truncated: false,
          limits: { ...LIMITS, ...limits },
        };
    } catch {
      // Tokenizer errors are reported by simulateScript itself.
    }
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
          // RG-14: a function definition is unsupported, by that name.
          if (a.k === "call" && a.target?.k === "var" && a.target.name === "function")
            unsupported("ユーザ関数定義（function）", a.line);
          if (
            a.k === "var" &&
            FUNCTION_NAMES.has(a.name) &&
            !Object.hasOwn(s.vars, a.name)
          )
            unsupported(
              `関数名 ${a.name} を値として使う形（apply系の関数名引数など）`,
              a.line,
            );
          if (a.k === "unary" && ["-", "+", "!"].includes(a.op)) {
            let x = api.read(a.arg, s);
            if (isUnknown(x)) return { handled: true, value: x };
            if (vec(x).some((v) => typeof v === "string"))
              api.fail(
                a.op === "!"
                  ? "invalid argument type"
                  : "non-numeric argument to unary operator",
                a,
              );
            return {
              handled: true,
              value: withNames(
                vec(x).map((v) =>
                  isNA(v) || (a.op === "!" && isNaNVal(v))
                    ? NA
                    : a.op === "!"
                      ? !Boolean(v)
                      : a.op === "-"
                        ? -Number(v)
                        : Number(v),
                ),
                namesOf(x),
              ),
            };
          }
          if (a.k === "binary" && (a.op === "&&" || a.op === "||")) {
            // R-01 兄弟表面の分離：&& / || は ?Logic により数値を論理値へ
            // 強制する（条件の truth とは別扱い）。共有基盤の短絡評価は
            // semantics.truth（条件用）を使うため、ここで先に評価する。
            // 左辺が未確定なら従来経路（基盤側）に委ねる。
            let x = api.read(a.a, s);
            if (isUnknown(x)) return null;
            const lx = logicOperand(x, a.line);
            if (a.op === "&&" && lx === false)
              return { handled: true, value: false };
            if (a.op === "||" && lx === true)
              return { handled: true, value: true };
            let y = api.read(a.b, s);
            if (isUnknown(y))
              return { handled: true, value: unknown("論理演算の結果による") };
            const ly = logicOperand(y, a.line);
            if (a.op === "&&") {
              if (lx === false || ly === false)
                return { handled: true, value: false };
              if (isNA(lx) || isNA(ly)) return { handled: true, value: NA };
              return { handled: true, value: true };
            }
            if (lx === true || ly === true)
              return { handled: true, value: true };
            if (isNA(lx) || isNA(ly)) return { handled: true, value: NA };
            return { handled: true, value: false };
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
              if (Object.hasOwn(x.columns, a.name))
                return { handled: true, value: x.columns[a.name] };
              // R-02 / RA-42：$ は部分一致を行う（?Extract：x$name は
              // x[["name", exact = FALSE]] と等価）。完全一致が無く、
              // 接頭辞として一意に定まる列が1つだけある場合にその列を
              // 返す。候補が複数ある場合と無い場合は NULL。
              // 代入側（$<-）では部分一致を行わない（write 側は完全一致）。
              if (a.name) {
                const matches = Object.keys(x.columns).filter((k) =>
                  k.startsWith(a.name),
                );
                if (matches.length === 1)
                  return { handled: true, value: x.columns[matches[0]] };
              }
              return { handled: true, value: null };
            }
          }
          if (a.k === "index") {
            let x = api.read(a.target, s),
              indexes = a.indexes.map((i) => (i ? api.read(i, s) : undefined));
            if (isUnknown(x) || indexes.some(isUnknown))
              return { handled: true, value: unknown("実行時の添字による") };
            if (x?.kind === "data.frame") {
              // RG-47: [[ selects a single column as a vector, not a data.frame.
              if (a.double) {
                if (indexes.length !== 1)
                  api.fail("subscript out of bounds", a);
                const key0 = vec(indexes[0])[0];
                const key =
                  typeof key0 === "string"
                    ? key0
                    : typeof key0 === "number" &&
                        Number.isInteger(key0)
                      ? Object.keys(x.columns)[key0 - 1]
                      : undefined;
                if (key === undefined || !Object.hasOwn(x.columns, key))
                  api.fail("subscript out of bounds", a);
                return { handled: true, value: x.columns[key] };
              }
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
              const first = vec(indexes[0])[0];
              if (typeof first === "string") {
                const at = namesOf(x) ? namesOf(x).indexOf(first) : -1;
                if (at < 0) api.fail("subscript out of bounds", a);
                return { handled: true, value: vec(x)[at] };
              }
              let i = Number(first);
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
          // RG-70（R19-N6）：データフレームへの二項演算は列ごとの要素演算として
          // 評価する。レコード（リスト相当）への演算は実 R どおりエラーにし、
          // 数値化できない値を NaN／単一 FALSE に合成しない。
          const isDF = (v) => v?.kind === "data.frame";
          const isRec = (v) =>
            v !== null &&
            typeof v === "object" &&
            !Array.isArray(v) &&
            v.kind !== "data.frame" &&
            !isNA(v);
          if (isDF(a) || isDF(b) || isRec(a) || isRec(b)) {
            if (isRec(a) || isRec(b))
              api.fail("non-numeric argument to binary operator", node);
            if (
              ![
                "+", "-", "*", "/", "^", "%%", "%/%",
                "==", "!=", "<", ">", "<=", ">=", "&", "|",
              ].includes(op)
            )
              api.fail(`この演算はデータフレームには対応していません：${op}`, node);
            const self = this;
            const applyCols = (d, other, flip) => {
              const nrow = vec(Object.values(d.columns)[0] ?? []).length;
              if (
                Array.isArray(other) &&
                other.length !== 1 &&
                other.length !== nrow &&
                nrow % other.length !== 0
              )
                api.fail(
                  "データフレームに対するベクトルの長さが合いません（列の長さと同じか、1つだけ指定してください）",
                  node,
                );
              return {
                kind: "data.frame",
                columns: Object.fromEntries(
                  Object.entries(d.columns).map(([name, col]) => [
                    name,
                    flip
                      ? self.binary(op, other, col, node, s, api)
                      : self.binary(op, col, other, node, s, api),
                  ]),
                ),
              };
            };
            if (isDF(a) && isDF(b)) {
              const an = Object.keys(a.columns),
                bn = Object.keys(b.columns);
              const arows = vec(a.columns[an[0]] ?? []).length,
                brows = vec(b.columns[bn[0]] ?? []).length;
              if (an.length !== bn.length || arows !== brows)
                api.fail("only defined for equally-sized data frames", node);
              return {
                kind: "data.frame",
                columns: Object.fromEntries(
                  an.map((name, i) => [
                    name,
                    self.binary(op, a.columns[name], b.columns[bn[i]], node, s, api),
                  ]),
                ),
              };
            }
            return isDF(a) ? applyCols(a, b, false) : applyCols(b, a, true);
          }
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
          if (op === "&&" || op === "||") {
            // 通常は read 側で評価済み。直接呼ばれた場合も ?Logic の
            // 強制（数値→論理）で評価し、条件用の truth は使わない。
            const lx = logicOperand(a, node.line),
              ly = logicOperand(b, node.line);
            if (op === "&&") {
              if (lx === false || ly === false) return false;
              if (isNA(lx) || isNA(ly)) return NA;
              return true;
            }
            if (lx === true || ly === true) return true;
            if (isNA(lx) || isNA(ly)) return NA;
            return false;
          }
          let x = vec(a),
            y = vec(b);
          // RG-14: %in% is a match against the whole right-hand table,
          // never NA and never a numeric-only type error.
          if (op === "%in%") {
            if (!x.length) return [];
            const asText = [...x, ...y].some((v) => typeof v === "string");
            const key = (v) => {
              if (isMissing(v)) return "\u0000missing";
              if (asText)
                return typeof v === "boolean"
                  ? v
                    ? "TRUE"
                    : "FALSE"
                  : String(v);
              return typeof v === "boolean" ? Number(v) : v;
            };
            const table = y.map(key);
            return withNames(
              x.map((u) => table.includes(key(u))),
              namesOf(a),
            );
          }
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
            // RG-14: type checks come before every shortcut (NA propagation,
            // ^ identities), exactly as real R rejects character operands.
            if (
              ["+", "-", "*", "/", "^", "%%", "%/%"].includes(op) &&
              (typeof u === "string" || typeof v === "string")
            )
              api.fail("non-numeric argument to binary operator", node);
            if (
              (op === "&" || op === "|") &&
              (typeof u === "string" || typeof v === "string")
            )
              api.fail(
                "operations are possible only for numeric, logical or complex types",
                node,
              );
            if (op === "^" && (u === 1 || v === 0)) return 1;
            // RG-45: NaN is treated as missing for comparisons and logic.
            if (
              (op === "&" || op === "|") &&
              (isMissing(u) || isMissing(v)) &&
              typeof u !== "string" &&
              typeof v !== "string"
            ) {
              const tri = (w) =>
                isMissing(w) ? null : w === false || w === 0 ? false : Boolean(w);
              const tu = tri(u),
                tv = tri(v);
              if (op === "&") {
                if (tu === false || tv === false) return false;
                if (tu === null || tv === null) return NA;
                return true;
              }
              if (tu === true || tv === true) return true;
              if (tu === null || tv === null) return NA;
              return false;
            }
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
            if (
              ["==", "!=", "<", ">", "<=", ">="].includes(op) &&
              (isMissing(u) || isMissing(v))
            )
              return NA;
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
          const resultNames =
            x.length === length && namesOf(a)
              ? namesOf(a)
              : y.length === length && namesOf(b)
                ? namesOf(b)
                : null;
          return withNames(out, resultNames);
        },
        call(name, args, s, api, node) {
          let vals = args.map((a) => api.read(a, s)),
            named = Object.fromEntries(
              args.flatMap((a, i) => (a.argName ? [[a.argName, vals[i]]] : [])),
            ),
            pos = vals.filter((_, i) => !args[i].argName);
          // R23-N4：必須引数（既定値のない第1引数）を欠いた呼び出しは、
          // 実 R どおり "argument "x" is missing, with no default" で
          // 停止する。欠落を undefined のまま流すと formatValue の
          // 「未設定」表示や長さ1ベクトル化で値が捏造されてしまう。
          // 対象は各関数の公式 Usage で第1引数に既定値がないもの。
          // c / cat / data.frame / sum は ... が空でも正しく、
          // readline は prompt に既定値があるため対象外。
          const REQUIRED_FIRST = {
            print: "x", length: "x", "is.na": "x", "as.numeric": "x",
            "as.character": "x", nrow: "x", ncol: "x", names: "x",
            rep: "x", mean: "x", median: "x", sd: "x",
            seq_len: "length.out", "read.csv": "file",
            rnorm: "n", runif: "n", sample: "x",
          };
          if (
            Object.hasOwn(REQUIRED_FIRST, name) &&
            !pos.length &&
            !Object.hasOwn(named, REQUIRED_FIRST[name])
          )
            api.fail(
              `argument "${REQUIRED_FIRST[name]}" is missing, with no default`,
              node,
            );
          if (["readline", "rnorm", "runif", "sample"].includes(name))
            return api.freshUnknown(name + "の実行時の値", s);
          // RG-80（R21-N4）: 出力系（print／cat）は未知値でも行自体を消さない。
          // 未知の部分はプレースホルダで示し、行が存在すること自体は伝える。
          if (pos.some(isUnknown) && !["print", "cat"].includes(name))
            return unknown(name + "の引数による");
          let x = pos[0] ?? named.x ?? vals[0];
          switch (name) {
            case "c": {
              // RG-03: NULL contributes no elements; c() / c(NULL) is NULL itself.
              // RG-38: named arguments become element names, in argument order.
              if (vals.some(isUnknown)) return unknown("cの引数による");
              const rawValues = [],
                rawNames = [];
              args.forEach((a, i) => {
                const v = vals[i];
                if (v === null) return;
                if (v?.kind === "data.frame")
                  api.fail("c()ではデータフレームをベクトル化できません", node);
                const elems = vec(v),
                  existing = namesOf(v);
                elems.forEach((el, j) => {
                  rawValues.push(el);
                  if (a.argName) {
                    rawNames.push(
                      elems.length === 1
                        ? a.argName
                        : existing?.[j]
                          ? a.argName + existing[j]
                          : a.argName + (j + 1),
                    );
                  } else rawNames.push(existing?.[j] ?? null);
                });
              });
              const combined = coerce(rawValues);
              return combined.length
                ? withNames(combined, rawNames)
                : null;
            }
            case "length":
              return x?.kind === "data.frame"
                ? Object.keys(x.columns).length
                : x === null
                  ? 0
                  : vec(x).length;
            case "is.na":
              return withNames(
                vec(x).map((v) => isNA(v) || Number.isNaN(v)),
                namesOf(x),
              );
            case "as.numeric": {
              const result = withNames(
                vec(x).map((v) =>
                  isNA(v)
                    ? NA
                    : typeof v === "string" && v.trim() === ""
                      ? NA
                      : Number.isNaN(Number(v))
                        ? NA
                        : Number(v),
                ),
                namesOf(x),
              );
              if (result.some((v, i) => isNA(v) && !isNA(vec(x)[i]) && !Number.isNaN(vec(x)[i]))) api.note(s, node, "変換によりNAが生成されました（NAs introduced by coercion）", "warning");
              return result;
            }
            case "as.character":
              return withNames(
                vec(x).map((v) =>
                  isNA(v)
                    ? NA
                    : typeof v === "boolean"
                      ? v
                        ? "TRUE"
                        : "FALSE"
                      : typeof v === "number" && !Number.isFinite(v)
                        ? v === Infinity
                          ? "Inf"
                          : v === -Infinity
                            ? "-Inf"
                            : "NaN"
                        : String(v),
                ),
                namesOf(x),
              );
            case "print": {
              // RG-80: 値全体が未知でも出力行は出す（値は実行時に決まる旨を示す）。
              const text = isUnknown(x) ? "（実行時に決まる値）" : show(x);
              s.outputs.push({
                channel: "print",
                text,
                line: node.line,
              });
              api.note(s, node, "出力します：" + text);
              return x;
            }
            case "cat": {
              let text = pos
                .flatMap(vec)
                .map((v) =>
                  isUnknown(v)
                    ? "（実行時に決まる値）"
                    : isNA(v)
                    ? "NA"
                    : typeof v === "boolean"
                      ? v
                        ? "TRUE"
                        : "FALSE"
                      : typeof v === "number" && !Number.isFinite(v)
                        ? v === Infinity
                          ? "Inf"
                          : v === -Infinity
                            ? "-Inf"
                            : "NaN"
                        : String(v),
                )
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
              if (x?.kind === "data.frame") return Object.keys(x.columns);
              return namesOf(x)
                ? namesOf(x).map((n) => (n === null || n === undefined ? NA : n))
                : null;
            case "seq_len": {
              let n = Number(x);
              if (!Number.isInteger(n) || n < 0 || n > 10000)
                api.fail("invalid length", node);
              return Array.from({ length: n }, (_, i) => i + 1);
            }
            case "seq": {
              // RG-15: length.out / along.with are implemented, and any other
              // named argument is refused by name instead of being dropped.
              for (const k of Object.keys(named))
                if (!["from", "to", "by", "length.out", "along.with"].includes(k))
                  api.fail(`seqの引数 ${k} は説明に対応していません`, node);
              const hasTo = named.to !== undefined || pos[1] !== undefined,
                hasBy = named.by !== undefined || pos[2] !== undefined;
              let lengthOut = named["length.out"] ?? pos[3];
              const alongWith = named["along.with"] ?? pos[4];
              if (alongWith !== undefined)
                lengthOut = alongWith === null ? 0 : vec(alongWith).length;
              let from = Number(named.from ?? pos[0] ?? 1);
              if (
                !hasTo &&
                !hasBy &&
                lengthOut === undefined &&
                named.from === undefined &&
                pos.length === 1 &&
                !Array.isArray(pos[0])
              ) {
                // seq(n) is seq(1, n) in real R.
                const n0 = Number(pos[0]);
                if (!Number.isFinite(n0)) api.fail("NA/NaN argument", node);
                if (n0 === 0) return [];
                const by0 = n0 >= 1 ? 1 : -1,
                  cnt = Math.floor(Math.abs(n0 - 1)) + 1;
                if (cnt > 10000) api.fail("ベクトル長の上限です", node);
                return Array.from({ length: cnt }, (_, i) => 1 + i * by0);
              }
              if (Array.isArray(pos[0]) && !hasTo && lengthOut === undefined && named.from === undefined)
                return Array.from({ length: pos[0].length }, (_, i) => i + 1);
              if (lengthOut !== undefined) {
                const lo = Number(vec(lengthOut)[0]);
                if (!Number.isInteger(lo) || lo < 0)
                  api.fail("length.outは0以上の整数で指定してください", node);
                if (lo > 10000) api.fail("ベクトル長の上限です", node);
                if (lo === 0) return [];
                let byVal;
                if (hasBy) byVal = Number(named.by ?? pos[2]);
                else if (hasTo)
                  byVal = lo === 1 ? 0 : (Number(named.to ?? pos[1]) - from) / (lo - 1);
                else byVal = 1;
                if (!Number.isFinite(from) || !Number.isFinite(byVal))
                  api.fail("NA/NaN argument", node);
                return Array.from({ length: lo }, (_, i) => from + i * byVal);
              }
              if (!hasTo)
                api.fail(
                  "seqには to、length.out、along.with のいずれかが必要です",
                  node,
                );
              let to = Number(named.to ?? pos[1]),
                by = hasBy
                  ? Number(named.by ?? pos[2])
                  : to >= from
                    ? 1
                    : -1;
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
              // RG-15: each / length.out / vector times are implemented;
              // unknown named arguments are refused by name.
              for (const k of Object.keys(named))
                if (!["x", "times", "length.out", "each"].includes(k))
                  api.fail(`repの引数 ${k} は説明に対応していません`, node);
              const base = vec(x),
                baseNames = namesOf(x),
                countArg = (raw, label) => {
                  const n = Number(vec(raw)[0]);
                  if (!Number.isInteger(n) || n < 0)
                    api.fail(`${label}は0以上の整数で指定してください`, node);
                  return n;
                };
              const eachRaw = named.each ?? pos[3];
              const each = eachRaw === undefined ? 1 : countArg(eachRaw, "each");
              let pairs = [];
              base.forEach((v, i) => {
                for (let j = 0; j < each; j++)
                  pairs.push([v, baseNames?.[i] ?? null]);
              });
              const timesRaw = named.times ?? pos[1];
              let outPairs = pairs;
              if (timesRaw !== undefined) {
                if (Array.isArray(timesRaw) && timesRaw.length !== 1) {
                  if (timesRaw.length !== base.length)
                    api.fail(
                      "repの times（ベクトル）の長さが x の長さと一致しません",
                      node,
                    );
                  if (each !== 1)
                    api.fail(
                      "repの times（ベクトル）と each の併用は説明に対応していません",
                      node,
                    );
                  outPairs = [];
                  base.forEach((v, i) => {
                    const cnt = timesRaw[i];
                    if (!Number.isInteger(cnt) || cnt < 0)
                      api.fail("timesは0以上の整数で指定してください", node);
                    for (let j = 0; j < cnt; j++)
                      outPairs.push([v, baseNames?.[i] ?? null]);
                  });
                } else {
                  const n = countArg(timesRaw, "times");
                  outPairs = [];
                  for (let j = 0; j < n; j++) outPairs.push(...pairs);
                }
              }
              const lengthOutRaw = named["length.out"] ?? pos[2];
              if (lengthOutRaw !== undefined) {
                const lo = countArg(lengthOutRaw, "length.out");
                if (lo > 10000) api.fail("ベクトル長の上限です", node);
                if (!outPairs.length) return [];
                outPairs = Array.from(
                  { length: lo },
                  (_, i) => outPairs[i % outPairs.length],
                );
              }
              if (outPairs.length > 10000)
                api.fail("ベクトル長の上限です", node);
              return withNames(
                outPairs.map((p) => p[0]),
                outPairs.map((p) => p[1]),
              );
            }
            case "read.csv":
              if (!Object.hasOwn(s.model.files || {}, x))
                api.fail("モデルにファイルがありません：" + x, node);
              return structuredClone(s.model.files[x]);
            default:
              api.fail("このR関数は説明に対応していません：" + name, node);
          }
        },
        // RG-04: assignment / bare-expression narration must use the same
        // R notation as print output and the final state (show), not the
        // shared JavaScript formatting. Compound assignments (+= etc.),
        // which are not R syntax, keep the shared narration.
        step(n, s, api) {
          if (n.k === "assign" && !["+=", "-=", "*=", "/="].includes(n.op)) {
            const v = api.read(n.value, s);
            api.write(n.target, v, s, n);
            api.note(
              s,
              n,
              `${targetName(n.target) || "対象"} に ${show(v)} を代入します`,
            );
            return [s];
          }
          if (n.k === "expression" && n.value.k !== "post") {
            const before = s.trace.length;
            const v = api.read(n.value, s);
            if (s.trace.length === before)
              api.note(
                s,
                n,
                v == null
                  ? "処理を実行します（表示する戻り値はありません）"
                  : `式を評価します：${show(v)}`,
              );
            return [s];
          }
          return undefined;
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
