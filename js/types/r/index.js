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
  // R26-N6：?Reserved に列挙される定数語は代入先にできない（実 R は
  // "invalid (do_set) left-hand side to assignment"）。TRUE／FALSE／NULL は
  // RG-181 で是正済みで、本バッチで NA 系・Inf・NaN まで拡張する。
  // T／F は予約語ではなく再代入可能な変数なので含めない。
  RESERVED_CONSTANTS = [
    "TRUE", "FALSE", "NULL",
    "NA", "NA_integer_", "NA_real_", "NA_complex_", "NA_character_",
    "Inf", "NaN",
  ],
  isNA = (v) => v?.kind === "NA",
  // RG-03: NULL (JS null) is a length-0 object in R, never a length-1 zero.
  vec = (v) => (v === null ? [] : Array.isArray(v) ? v : [v]),
  flat = (v) => vec(v).flat(),
  isNaNVal = (v) => typeof v === "number" && Number.isNaN(v),
  isMissing = (v) => isNA(v) || isNaNVal(v),
  // R28-N17：データフレームの行数の正本。実 R では行数は row.names 属性が
  // 保持し、dim.data.frame は .row_names_info（row.names の長さ）から行数を
  // 返す（公式ソース dataframe.R）。列が0本になっても行数が残るよう、
  // rowNames があればその長さを、無ければ最初の列の長さを正本とする。
  // 最後の列を削除する際は write 側で rowNames を実体化してから列を消す。
  dfNrow = (v) =>
    Array.isArray(v?.rowNames)
      ? v.rowNames.length
      : (Object.values(v?.columns ?? {})[0]?.length ?? 0),
  namesOf = (v) => (Array.isArray(v) && Array.isArray(v.names) ? v.names : null),
  withNames = (arr, names) => {
    // R29-N17：名前配列が渡されたらそのまま付ける。全て ""／NA の名前でも
    // 実 R では名前属性が残るため、「実質的な名前があるときだけ付ける」
    // 規約は廃止。名前属性自体が無い入力からは null を渡すこと（呼び出し
    // 側で namesOf(...) の有無を見て合成する）。
    if (names) arr.names = [...names];
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
        ? Object.keys(v.columns).length
          ? Object.entries(v.columns)
              .map(([k, x]) => k + ": " + show(x))
              .join("\n")
          : // R28-N17：0列のデータフレームは print.data.frame どおり
            // 「0 columns and N rows」の形で示す（従来は空文字列だった）。
            `data frame with 0 columns and ${dfNrow(v)} rows`
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
// R25-N24：仮想ファイルストアには2つの表現が混在する。種まきファイルは
// パース済みの data.frame オブジェクト、cat(file=) で書いたファイルは
// 生のテキスト文字列である。read.csv は後者も実 R（?read.table）どおり
// テキストとしてパースしなければならない（従来はオブジェクト前提で
// 文字列を無変換に返し、生文字列がそのまま値になっていた）。
// read.csv の既定値（公式 Usage）：header=TRUE、sep=","、quote="\"",
// dec="."、fill=TRUE、comment.char=""。列は type.convert 相当の変換で
// logical／integer／numeric／character のいずれかになり、引用された
// "42" も数値列になる。空フィールドは logical／数値列では NA、
// character 列では "" のまま。ヘッダー行のフィールド数がデータ行より
// 1つ少ない場合は先頭列が行名になる。入力が空ならエラー、ヘッダーの
// みなら0行のデータフレーム。
const csvCellText = (v) => {
  if (isNA(v) || v === null || v === undefined) return "NA";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number")
    return v === Infinity ? "Inf" : v === -Infinity ? "-Inf" : Number.isNaN(v) ? "NaN" : String(v);
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
};
// パース済み data.frame を CSV テキストへ戻す（cat の append が種まき
// ファイルへ追記する場合と、read.csv(header=FALSE) で種まきファイルを
// テキストとして読み直す場合に使う）。
const dfToCsvText = (df) => {
  const names = Object.keys(df.columns),
    n = dfNrow(df);
  let out = names.map(csvCellText).join(",") + "\n";
  for (let i = 0; i < n; i++)
    out += names.map((k) => csvCellText(df.columns[k][i])).join(",") + "\n";
  return out;
};
function parseCsvText(text, opts = {}) {
  const sep = typeof opts.sep === "string" && opts.sep ? opts.sep[0] : ",",
    quoteSet = new Set(typeof opts.quote === "string" ? opts.quote : '"'),
    dec = typeof opts.dec === "string" && opts.dec ? opts.dec : ".",
    fill = opts.fill !== false,
    header = opts.header !== false,
    naStrings = new Set(
      (Array.isArray(opts.naStrings) ? opts.naStrings : ["NA"]).map(String),
    ),
    checkNames = opts.checkNames !== false;
  let src = String(text);
  if (Number.isInteger(opts.skip) && opts.skip > 0)
    src = src.split("\n").slice(opts.skip).join("\n");
  // 区切り・引用符・改行（\n／\r\n／\r、引用符内の改行を含む）を解釈する。
  const records = [];
  let record = [],
    field = "",
    quoted = false,
    inQuotes = false,
    quoteChar = null,
    fieldTouched = false;
  const endField = () => {
    record.push({ value: field, quoted });
    field = "";
    quoted = false;
    fieldTouched = false;
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === quoteChar) {
        if (src[i + 1] === quoteChar) {
          field += quoteChar;
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (!fieldTouched && field === "" && quoteSet.has(ch)) {
      inQuotes = true;
      quoteChar = ch;
      quoted = true;
      fieldTouched = true;
    } else if (ch === sep) endField();
    else if (ch === "\n") endRecord();
    else if (ch === "\r") {
      if (src[i + 1] === "\n") i++;
      endRecord();
    } else {
      field += ch;
      fieldTouched = true;
    }
  }
  if (fieldTouched || field !== "" || record.length) endRecord();
  // blank.lines.skip=TRUE（既定）：空行は読み飛ばす。
  const rowsIn = records.filter(
    (r) => !(r.length === 1 && !r[0].quoted && r[0].value.trim() === ""),
  );
  if (!rowsIn.length) throw new Error("no lines available in input");
  let colNames,
    dataRows = rowsIn,
    rowNames = null;
  if (header) {
    const head = rowsIn[0];
    dataRows = rowsIn.slice(1);
    // ヘッダーがデータ行より1フィールド少ない場合は先頭列が行名。
    if (dataRows.length && dataRows[0].length === head.length + 1) {
      rowNames = dataRows.map((r) => r[0].value);
      dataRows = dataRows.map((r) => r.slice(1));
    }
    colNames = head.map((f) => f.value);
  } else {
    const width = Math.max(...rowsIn.map((r) => r.length));
    colNames = Array.from({ length: width }, (_, i) => "V" + (i + 1));
  }
  if (Array.isArray(opts.colNames) && opts.colNames.length)
    colNames = opts.colNames.map(String);
  const width = colNames.length;
  const limited =
    Number.isInteger(opts.nrows) && opts.nrows >= 0
      ? dataRows.slice(0, opts.nrows)
      : dataRows;
  const padded = limited.map((r, i) => {
    if (r.length > width)
      throw new Error(`line ${i + 1} did not have ${width} elements`);
    if (r.length < width) {
      if (!fill) throw new Error(`line ${i + 1} did not have ${width} elements`);
      return [...r, ...Array.from({ length: width - r.length }, () => ({ value: "", quoted: false }))];
    }
    return r;
  });
  const makeName = (name, seen) => {
    let out = name.replace(/[^\p{L}\p{N}._]/gu, ".");
    if (out === "") out = "X";
    if (/^[0-9]/.test(out) || /^\.[0-9]/.test(out)) out = "X" + out;
    if (checkNames) {
      let base = out,
        k = 1;
      while (seen.has(out)) out = base + "." + k++;
      seen.add(out);
    }
    return out;
  };
  const seen = new Set();
  const finalNames = colNames.map((n) => (checkNames ? makeName(n, seen) : n));
  const columns = {};
  for (let c = 0; c < width; c++) {
    const cells = padded.map((r) => r[c]),
      trimmed = cells.map((f) => f.value.trim()),
      isMiss = trimmed.map((t) => t === "" || naStrings.has(t)),
      present = trimmed.filter((_, i) => !isMiss[i]);
    const LOGICALS = {
      TRUE: true, T: true, True: true, true: true,
      FALSE: false, F: false, False: false, false: false,
    };
    const numericText = (t) => {
      const norm = dec === "." ? t : t.replaceAll(dec, ".");
      if (norm === "NaN") return NaN;
      if (norm === "Inf" || norm === "+Inf" || norm === "Infinity") return Infinity;
      if (norm === "-Inf" || norm === "-Infinity") return -Infinity;
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(norm)) return null;
      return Number(norm);
    };
    let kind = "character";
    if (!present.length) kind = "logical";
    else if (present.every((t) => Object.hasOwn(LOGICALS, t))) kind = "logical";
    else if (
      present.every(
        (t) =>
          /^[+-]?\d+$/.test(t) &&
          Number.isSafeInteger(Number(t)) &&
          Math.abs(Number(t)) <= 2147483647,
      )
    )
      kind = "integer";
    else if (present.every((t) => numericText(t) !== null)) kind = "numeric";
    columns[finalNames[c]] = cells.map((f, i) => {
      if (kind === "character") return naStrings.has(f.value) ? NA : f.value;
      if (isMiss[i]) return NA;
      if (kind === "logical") return LOGICALS[trimmed[i]];
      if (trimmed[i] === "NaN" && kind === "numeric") return NaN;
      return numericText(trimmed[i]);
    });
  }
  const df = { kind: "data.frame", columns };
  // row.names 引数（read.csv では ... 経由）：列番号／列名／ベクトル。
  if (opts.rowNames !== undefined && opts.rowNames !== null) {
    const rn = opts.rowNames;
    if (Array.isArray(rn)) rowNames = rn.map((v) => (isNA(v) || v === null ? "NA" : String(v)));
    else if (typeof rn === "number" || typeof rn === "string") {
      const key =
        typeof rn === "number" ? finalNames[rn - 1] : finalNames.includes(String(rn)) ? String(rn) : undefined;
      if (key !== undefined) {
        rowNames = columns[key].map((v) => (isNA(v) ? "NA" : String(v)));
        delete columns[key];
      }
    }
  }
  if (rowNames) df.rowNames = rowNames.map(String);
  return df;
}
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
    return withNames(out, srcNames ? outNames : null);
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
    return withNames(out, srcNames ? outNames : null);
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
  return withNames(out, srcNames ? outNames : null);
}
// R25-N14：添字代入の説明が対象を特定できるよう、添字式のラベルも
// 生成する（NX-N23 の裁定：添字代入の説明は対象を特定すること）。
// 空添字（x[]／df$a[] 等）は全要素の置換である旨をラベルに含める。
const exprLabel = (a) => {
  if (!a || typeof a !== "object") return "";
  switch (a.k) {
    case "literal":
      return typeof a.value === "string"
        ? `"${a.value}"`
        : (a.raw ?? String(a.value));
    case "var":
      return a.name;
    case "member":
    case "index":
      return targetName(a);
    case "call": {
      const t = exprLabel(a.target);
      if (!t) return "";
      const parts = (a.args || []).map((x) => exprLabel(x));
      if (parts.some((p) => p === "")) return "";
      return `${t}(${parts.join(", ")})`;
    }
    case "binary": {
      const l = exprLabel(a.a),
        r = exprLabel(a.b);
      return l && r ? `${l} ${a.op} ${r}` : "";
    }
    case "unary": {
      const x = exprLabel(a.arg);
      return x ? `${a.op}${x}` : "";
    }
    default:
      return "";
  }
};
const targetName = (a) => {
  if (a?.k === "var") return a.name;
  if (a?.k === "member") {
    const t = targetName(a.target);
    return t ? t + "." + a.name : "";
  }
  if (a?.k === "index") {
    const t = targetName(a.target);
    if (!t) return "";
    const empty =
      a.indexes.length === 0 || a.indexes.every((i) => i === null);
    if (empty) return `${t}[]（全要素）`;
    const parts = a.indexes.map((i) => (i === null ? "" : exprLabel(i)));
    if (parts.some((p) => p === "")) return "";
    return a.double
      ? `${t}[[${parts.join(", ")}]]`
      : `${t}[${parts.join(", ")}]`;
  }
  return "";
};
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
    const result = simulateScript(
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
            if (isUnknown(x)) return null;
            // R27-N25（読み取り側）：$ が有効なのは再帰的オブジェクト
            // （リスト類・データフレーム）と NULL だけ（?Extract）。
            // 原子ベクトルへの $ は実 R では読み取りも
            // "$ operator is invalid for atomic vectors" エラー。
            // 従来はデータフレーム以外が共有基盤のレコード参照へ落ち、
            // 存在しないフィールドの汎用文言や、書き込みで作られた
            // 幽霊フィールドの捏造値を返していた。
            if (x === null) return { handled: true, value: null };
            if (
              x?.kind !== "data.frame" &&
              (Array.isArray(x) ||
                isNA(x) ||
                typeof x !== "object")
            )
              api.fail("$ operator is invalid for atomic vectors", a);
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
            // R24-N8（読み取り形）：空添字 x[] は x 自体を返す（?Extract）。
            // パーサの indexes の null 項目は「添字なし」（x[,] 等）。
            // 従来は vec() 経由でスカラーや NULL の表現が変わり得たため、
            // 空添字は対象そのものを返す形に是正する。
            const emptySubRead =
              a.indexes.length === 0 || a.indexes.every((i) => i === null);
            if (!a.double && emptySubRead) {
              if (a.indexes.length > (x?.kind === "data.frame" ? 2 : 1))
                api.fail("incorrect number of dimensions", a);
              return { handled: true, value: structuredClone(x) };
            }
            if (!a.double && x?.kind !== "data.frame" && indexes.length > 1)
              api.fail("incorrect number of dimensions", a);
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
                    // R28-N17：列の選択では行数は不変。rowNames（行数の
                    // 正本）を引き継ぎ、0列選択でも行数が残るようにする。
                    ...(x.rowNames ? { rowNames: x.rowNames } : {}),
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
              // R28-N17：行の選択では rowNames も同じ添字で選択し、行数の
              // 正本が結果の行数と一致し続けるようにする。
              const subRowNames = x.rowNames
                ? [...subset(x.rowNames, indexes[0])]
                : undefined;
              return {
                handled: true,
                value:
                  colKeys.length === 1
                    ? cols[colKeys[0]]
                    : {
                        kind: "data.frame",
                        columns: cols,
                        ...(subRowNames ? { rowNames: subRowNames } : {}),
                      },
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
              // R27-N26：df$列 <- NULL は列の削除（?Extract：NULL の
              // 代入は対応する要素・列を削除する）。従来は長さ0の置換
              // ベクトルとして行数検証にかけられ、虚偽原因
              // "replacement has incompatible rows" で停止していた。
              // 存在しない列への NULL 代入は実 R でも無言の無操作。
              if (v === null) {
                // R28-N17：最後の列を消す前に行数を rowNames へ実体化する。
                // 実 R では行数は row.names 属性が保持するため、0列になって
                // も行数は残る。従来は行数を最初の列から導出していたため、
                // 唯一の列の削除で行数ごと失われていた。
                if (
                  Object.hasOwn(target.columns, a.name) &&
                  Object.keys(target.columns).length === 1 &&
                  !Array.isArray(target.rowNames)
                )
                  target.rowNames = Array.from(
                    { length: target.columns[a.name]?.length ?? 0 },
                    (_, i) => String(i + 1),
                  );
                delete target.columns[a.name];
                return true;
              }
              // R28-N17：行数は dfNrow（rowNames 優先）で数える。0列でも
              // 行数が残っていればそれが正本になり、行数不一致の列追加が
              // 通らなくなる。0行×0列のときだけ追加する列が行数を決める。
              let n = dfNrow(target) || vec(v).length,
                values = vec(v);
              if (!values.length || n % values.length)
                api.fail("replacement has incompatible rows", node);
              target.columns[a.name] = Array.from({ length: n }, (_, i) =>
                structuredClone(values[i % values.length]),
              );
              return true;
            }
            // R27-N25（書き込み側）：原子ベクトルへの $ 代入は実 R では
            // "$ operator is invalid for atomic vectors" エラー。従来は
            // 共有基盤のレコード書き込みへ落ち、ベクトルの内部表現に
            // 見えないフィールドを作って読み戻しで捏造値を返していた。
            // 未確定値・NULL・レコード（リスト相当）は従来経路に委ねる
            // （NULL への書き込みは共有基盤が名前を挙げて停止する）。
            if (
              !isUnknown(target) &&
              target !== null &&
              target !== undefined &&
              (Array.isArray(target) ||
                isNA(target) ||
                typeof target !== "object")
            )
              api.fail("$ operator is invalid for atomic vectors", node);
          }
          if (a.k === "index") {
            let target = api.read(a.target, s);
            // R24-N8：空添字への代入 x[] <- v は全要素への代入（?Extract
            // の代入意味論）。従来は添字が空のため idx が空ベクトルになり
            // 代入ループが空転して、エラーもなく黙って無効化されていた。
            const emptySubWrite =
              a.indexes.length === 0 || a.indexes.every((i) => i === null);
            if (emptySubWrite) {
              let values = vec(v);
              if (!values.length)
                api.fail("replacement has length zero", node);
              if (target?.kind === "data.frame") {
                if (a.indexes.length > 2)
                  api.fail("incorrect number of dimensions", node);
                for (const col of Object.values(target.columns))
                  for (let i = 0; i < col.length; i++)
                    col[i] = structuredClone(values[i % values.length]);
                return true;
              }
              if (a.indexes.length > 1)
                api.fail("incorrect number of dimensions", node);
              if (Array.isArray(target)) {
                for (let i = 0; i < target.length; i++)
                  target[i] = structuredClone(values[i % values.length]);
                return true;
              }
              if (
                target !== null &&
                target !== undefined &&
                (typeof target !== "object" || isNA(target)) &&
                a.target.k === "var"
              ) {
                // 長さ1ベクトル（スカラー表現）の全要素はその値自体。
                s.vars[a.target.name] = structuredClone(values[0]);
                return true;
              }
              api.fail("この添字代入は未対応です", node);
            }
            if (target?.kind === "data.frame")
              api.fail(
                "データフレームへの添字代入は未対応です。$で列を指定してください",
                node,
              );
            if (a.indexes.length > 1)
              api.fail("incorrect number of dimensions", node);
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
              const nrow = dfNrow(d);
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
                ...(d.rowNames ? { rowNames: d.rowNames } : {}),
              };
            };
            if (isDF(a) && isDF(b)) {
              const an = Object.keys(a.columns),
                bn = Object.keys(b.columns);
              const arows = dfNrow(a),
                brows = dfNrow(b);
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
                ...(a.rowNames ? { rowNames: a.rowNames } : {}),
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
          // R24-N26／N28：`...` を持たない関数の余分な引数は、実 R どおり
          // unused argument エラーとして名前・値を挙げて停止する
          // （R23-N4 の引数不足側と対称な規律）。公式 Usage の照合結果：
          //   `...` なし（厳格）：length(x)／is.na(x)／nrow(x)／ncol(x)／
          //     names(x)／seq_len(length.out)／sd(x, na.rm)／
          //     readline(prompt)／rnorm(n, mean, sd)／runif(n, min, max)／
          //     sample(x, size, replace, prob)／rep(x, times, length.out,
          //     each)（rep の名前付きは従来どおり case 側で名前を挙げる）
          //   `...` あり（従来どおり受理）：c／sum／mean(x, trim, na.rm,
          //     ...）／median(x, na.rm, ...）／as.numeric(x, ...）／
          //     as.character(x, ...）／print(x, ...）／cat(..., file, sep,
          //     fill, labels, append)／data.frame(..., row.names, ...)／
          //     read.csv(file, header, ..., ...)／seq（名前付きは case 側で
          //     名前を挙げて停止する従来規律を維持）
          const STRICT_FORMALS = {
            length: ["x"],
            "is.na": ["x"],
            nrow: ["x"],
            ncol: ["x"],
            names: ["x"],
            "seq_len": ["length.out"],
            sd: ["x", "na.rm"],
            readline: ["prompt"],
            rnorm: ["n", "mean", "sd"],
            runif: ["n", "min", "max"],
            sample: ["x", "size", "replace", "prob"],
          };
          if (Object.hasOwn(STRICT_FORMALS, name)) {
            const formals = STRICT_FORMALS[name];
            for (const k of Object.keys(named))
              if (!formals.includes(k))
                api.fail(`unused argument (${k} = ${show(named[k])})`, node);
            // sd の位置引数第2引数（na.rm）は従来の明示規則（名前付きで
            // 指定させる停止）が case 側にあるため、ここでは対象外。
            if (name !== "sd" && pos.length > formals.length)
              api.fail(`unused argument (${show(pos[formals.length])})`, node);
          }
          if (name === "rep" && pos.length > 4)
            api.fail(`unused argument (${show(pos[4])})`, node);
          // R26-N25：乱数系は値が未確定でも、決定的に不正な引数は実 R
          // どおり名前を挙げて停止する（?sample：size は非負、x が長さ1の
          // 数値なら正の整数で母集団は 1:x、replace=FALSE では size が
          // 母集団を超えられない。?Normal／?Uniform：n は観測数）。
          // 実装済みの乱数系は rnorm／runif／sample の3つのみで、
          // sample.int／rbinom／rpois 等は未実装として名指し停止する
          // 経路（default 節）にある。未確定の引数は判定できないため
          // 対象外とし、合法形（rnorm(0)、sample(1:3, 0)、replace=TRUE
          // での母集団超過）は従来どおり未確定値で受理する。
          // sd<0 や min>max は実 R ではエラー停止ではなく NaN＋警告の
          // 扱い（?Normal の "sd < 0" 記述）であり、prob の検証要否も
          // 公式ページだけでは確定できないため、いずれも現行維持とする。
          if (["rnorm", "runif", "sample"].includes(name)) {
            const scalarNum = (v) => {
              // 長さ1ベクトル（単項マイナスの結果など）はスカラーとして
              // 読み、長さ2以上は ?Normal 等の「長さが個数になる」扱いに
              // 倣って判定対象外とする。
              if (v === undefined || isUnknown(v)) return undefined;
              if (v?.kind === "data.frame") return undefined;
              const els = vec(v);
              return els.length === 1 ? els[0] : undefined;
            };
            const checkCount = (v, label, fn) => {
              const el = scalarNum(v);
              if (el === undefined) return undefined;
              if (
                isMissing(el) ||
                (typeof el === "number" && !Number.isFinite(el)) ||
                (typeof el === "number" && el < 0)
              )
                api.fail(
                  `${fn}の ${label} が不正です：${label} = ${show(el)}（${label}は0以上の数で指定してください）`,
                  node,
                );
              return typeof el === "number" ? el : undefined;
            };
            if (name === "rnorm" || name === "runif") {
              checkCount(named.n ?? pos[0], "n", name);
            } else {
              const xVal = named.x ?? pos[0];
              let pop;
              if (xVal !== undefined && !isUnknown(xVal)) {
                if (xVal?.kind === "data.frame")
                  pop = Object.keys(xVal.columns).length;
                else {
                  const els = vec(xVal);
                  // R27-N24：x が長さ0（空ベクトル・NULL）または長さ1の
                  // NA のときは、実 R では "invalid first argument" の
                  // 決定的エラー（?sample：母集団は長さ1以上の要素か
                  // 正の整数。size = 0 の明示がある長さ0だけは同ページの
                  // 記述により許される）。従来は検証が無く、未確定値で
                  // 黙って受理されていた（RG-201 の x 検証の取り残し）。
                  if (!els.length) {
                    const sizeGiven = named.size ?? pos[1];
                    if (!(sizeGiven !== undefined && !isUnknown(sizeGiven) && vec(sizeGiven)[0] === 0))
                      api.fail(
                        `sampleの x が不正です：x = ${show(xVal)}（母集団が空です：invalid first argument）`,
                        node,
                      );
                    pop = 0;
                  } else if (els.length === 1 && isNA(els[0]))
                    api.fail(
                      `sampleの x が不正です：x = ${show(els[0])}（x が NA です：invalid first argument）`,
                      node,
                    );
                  else if (els.length === 1 && typeof els[0] === "number") {
                    if (!Number.isFinite(els[0]) || els[0] < 1)
                      api.fail(
                        `sampleの x が不正です：x = ${show(els[0])}（長さ1の数値の x は正の整数で指定してください：invalid first argument）`,
                        node,
                      );
                    pop = Math.trunc(els[0]);
                  } else pop = els.length;
                }
              }
              const sizeRaw = named.size ?? pos[1];
              const sizeNum = checkCount(sizeRaw, "size", "sample");
              if (sizeNum !== undefined && pop !== undefined) {
                const replaceRaw = named.replace ?? pos[2];
                const replaceState =
                  replaceRaw === undefined || isUnknown(replaceRaw)
                    ? replaceRaw === undefined
                      ? false
                      : undefined
                    : typeof replaceRaw === "boolean"
                      ? replaceRaw
                      : typeof replaceRaw === "number" &&
                          !Number.isNaN(replaceRaw)
                        ? replaceRaw !== 0
                        : undefined;
                if (
                  replaceState === false &&
                  Math.trunc(sizeNum) > pop
                )
                  api.fail(
                    `sampleの size が不正です：size = ${show(sizeNum)} は母集団の大きさ ${pop} を超えています（replace = FALSE では母集団より大きい標本は取れません：cannot take a sample larger than the population when 'replace = FALSE'）`,
                    node,
                  );
              }
            }
          }
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
              // R29-N17：名前の供給源（引数名・要素の名前属性）が1つも
              // 無ければ名前属性自体が無い（names は NULL）。供給源が
              // ある場合は、値が全て ""／NA でも属性はそのまま付ける。
              const anyNameSource = args.some(
                (a, i) =>
                  vals[i] != null &&
                  (a.argName || namesOf(vals[i]) !== null),
              );
              return combined.length
                ? withNames(combined, anyNameSource ? rawNames : null)
                : null;
            }
            case "length":
              return x?.kind === "data.frame"
                ? Object.keys(x.columns).length
                : x === null
                  ? 0
                  : vec(x).length;
            case "is.na":
              // R24-N29：is.na は要素ごとの論理値を入力と同じ形状で返す
              // （?is.na：データフレームでは同じ形の論理値の表を返す）。
              // 従来は vec() がデータフレームを長さ1に潰し、NA セルを
              // 含む行まで結果から消えていた。
              if (x?.kind === "data.frame")
                return {
                  kind: "data.frame",
                  columns: Object.fromEntries(
                    Object.entries(x.columns).map(([k, col]) => [
                      k,
                      col.map((v) => isNA(v) || Number.isNaN(v)),
                    ]),
                  ),
                  ...(x.rowNames ? { rowNames: x.rowNames } : {}),
                };
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
              // R24-N28(b)：cat の仮引数（file／sep／fill／labels／append）
              // と同名の名前付き引数はデータではなくパラメータとして扱う。
              // それ以外の名前付き引数は `...` のデータとして順序どおり
              // 出力対象に含める。file が空文字列でない場合は画面ではなく
              // モデルのファイルへ書き出す（append=TRUE で追記）。
              const CAT_FORMALS = ["file", "sep", "fill", "labels", "append"];
              let text = args
                .flatMap((a, i) =>
                  a.argName && CAT_FORMALS.includes(a.argName)
                    ? []
                    : vec(vals[i]),
                )
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
              const fileArg = named.file;
              if (fileArg !== undefined) {
                const fname = vec(fileArg)[0];
                if (typeof fname !== "string")
                  api.fail("catの file は文字列で指定してください", node);
                if (fname !== "") {
                  s.model.files ??= {};
                  // R25-N24 兄弟表面：種まきファイル（パース済みの
                  // data.frame）への append は、その CSV テキスト表現へ
                  // 追記する形にする（従来は文字列でないことを理由に
                  // 既存内容を黙って捨てていた）。
                  const existing = s.model.files[fname];
                  const prev =
                    named.append === true
                      ? typeof existing === "string"
                        ? existing
                        : existing?.kind === "data.frame"
                          ? dfToCsvText(existing)
                          : ""
                      : "";
                  s.model.files[fname] = prev + text;
                  api.note(s, node, `ファイル ${fname} へ書き出します`);
                  return null;
                }
              }
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
              // R24-N28（同根）：sum の `...` に入る名前付き引数（na.rm
              // 以外）はパラメータではなく合計対象のデータ（実 R の引数
              // 照合どおり）。従来は pos だけを見て黙って捨てていた。
              let a =
                name === "sum"
                  ? args.flatMap((ag, i) =>
                      ag.argName === "na.rm" ? [] : vec(vals[i]),
                    )
                  : vec(x);
              if (name === "sum" && a.some(isUnknown))
                return unknown("sumの引数による");
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
              // R24-N28(a)：data.frame の仮引数（row.names／check.rows／
              // check.names／fix.empty.names／stringsAsFactors）と同名の
              // 名前付き引数は列ではなくパラメータとして扱う（公式
              // Usage：data.frame(..., row.names = NULL, check.rows =
              // FALSE, check.names = TRUE, fix.empty.names = TRUE,
              // stringsAsFactors = FALSE)）。row.names は行名として保持し、
              // 長さが行数と合わなければ実 R どおりエラーにする。
              const DF_FORMALS = [
                "row.names",
                "check.rows",
                "check.names",
                "fix.empty.names",
                "stringsAsFactors",
              ];
              let colCount = 0;
              let cols = Object.fromEntries(
                args
                  .filter(
                    (a) => !(a.argName && DF_FORMALS.includes(a.argName)),
                  )
                  .map((a) => {
                    const i = args.indexOf(a);
                    return [
                      a.argName || "V" + ++colCount,
                      vec(vals[i]),
                    ];
                  }),
              ),
                lens = Object.values(cols).map((x) => x.length),
                n = Math.max(0, ...lens);
              if (lens.some((l) => (l === 0 && n) || n % l))
                api.fail("arguments imply differing number of rows", node);
              const rowNames = named["row.names"];
              if (rowNames !== undefined && rowNames !== null) {
                const rn = vec(rowNames);
                // R28-N17：列が無い場合は行数を row.names 自体が決める
                // （実 R の data.frame(row.names = ...) は0列×N行を作る）。
                // 従来は行数を列の長さから導出するため、この形が虚偽の
                // 長さエラーになっていた。
                if (rn.length !== n && Object.keys(cols).length)
                  api.fail(
                    "row names supplied are of the wrong length",
                    node,
                  );
                return {
                  kind: "data.frame",
                  columns: Object.fromEntries(
                    Object.entries(cols).map(([k, v]) => [
                      k,
                      Array.from({ length: n }, (_, i) => v[i % v.length]),
                    ]),
                  ),
                  rowNames: rn,
                };
              }
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
              // R28-N17：行数は dfNrow（rowNames＝実 R の row.names 属性
              // 相当を優先）で数え、0列でも保持される。
              return x?.kind === "data.frame" ? dfNrow(x) : null;
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
              // R27-N21〜N23：seq.default の公式ソース（seq.R）の構造に
              // 沿って書き直す。従来は (1) length.out に整数を必須化し
              // 分数を虚偽原因で停止していた（公式 ?seq は seq／seq.int
              // では分数は切り上げと明記し、ソースも ceiling() 実装）、
              // (2) 省略形（seq() 等）が「to／length.out／along.with の
              // いずれかが必要」という独自前提で虚偽停止し、NULL 端点が
              // 既定値1への化けで誤値を返していた（ソースでは from／to
              // の既定値は各1で、長さ0の端点は長さエラー）、
              // (3) 全ての検証失敗が "wrong sign in by argument" に
              // 一律化されていた（ソースは検証項目ごとに別の stop を持つ）。
              // 引数の有無は「与えられたか」で判定する（NULL は値として
              // 与えられたものとして扱い、既定値へ化かさない）。
              const hasArg = (key, idx) =>
                  Object.hasOwn(named, key) || pos[idx] !== undefined,
                argVal = (key, idx) =>
                  Object.hasOwn(named, key) ? named[key] : pos[idx];
              const hasTo = hasArg("to", 1),
                hasBy = hasArg("by", 2);
              // R26-N24：引数が from ただ1つだけの形（?seq の第5の用法）。
              // 長さ1の数値なら 1:from（seq(0) でも c(1, 0)。S 互換として
              // ?seq が明記）、それ以外は 1:length(from)（長さ0なら空）。
              // 従来は seq_len 相当の長さ解釈に寄っており、seq(0) が空、
              // seq(-1) が c(1) になっていた。また単項マイナスの結果や
              // c(5) のような長さ1ベクトルは配列で運ばれるため、要素を
              // vec() で取り出してから判定しないと数値形を取り逃がす。
              const isSoleFrom =
                !hasTo &&
                !hasBy &&
                !hasArg("length.out", 3) &&
                !hasArg("along.with", 4) &&
                ((pos.length === 1 && !Object.keys(named).length) ||
                  (pos.length === 0 &&
                    Object.keys(named).length === 1 &&
                    named.from !== undefined));
              if (isSoleFrom) {
                const v = pos.length === 1 ? pos[0] : named.from;
                if (v === null) return [];
                const lf =
                  v?.kind === "data.frame"
                    ? Object.keys(v.columns).length
                    : vec(v).length;
                const el = lf === 1 ? vec(v)[0] : undefined;
                if (lf === 1 && typeof el === "number") {
                  if (!Number.isFinite(el))
                    api.fail("NA/NaN argument", node);
                  // アプリ自身のコロン演算子（1:el）と同じ意味論。
                  const by0 = el >= 1 ? 1 : -1,
                    cnt = Math.floor(Math.abs(el - 1)) + 1;
                  if (cnt > 10000) api.fail("ベクトル長の上限です", node);
                  return Array.from(
                    { length: cnt },
                    (_, i) => 1 + i * by0,
                  );
                }
                if (lf > 10000) api.fail("ベクトル長の上限です", node);
                return Array.from({ length: lf }, (_, i) => i + 1);
              }
              // 未確定の引数は判定できないため従来どおり未確定値にする
              // （位置引数の未確定は call() 冒頭の検査で先に処理される）。
              if (vals.some(isUnknown)) return unknown("seqの引数による");
              const rLength = (v) =>
                v === null
                  ? 0
                  : v?.kind === "data.frame"
                    ? Object.keys(v.columns).length
                    : vec(v).length;
              // length.out／along.with の決定（seq.R の順序：along.with が
              // 優先し、length.out は長さ検査の後に ceiling で切り上げる）。
              let lengthOut;
              if (hasArg("along.with", 4))
                lengthOut = rLength(argVal("along.with", 4));
              else if (hasArg("length.out", 3)) {
                const raw = argVal("length.out", 3),
                  els = raw === null ? [] : vec(raw);
                if (!els.length)
                  api.fail(
                    "seqの length.out は長さ1で指定してください（'length.out' must be of length 1）",
                    node,
                  );
                const el = els[0];
                // 整数・論理値はそのまま、それ以外は as.numeric の後に
                // ceiling（seq.R）。数値文字列も as.numeric で変換される。
                if (isNA(el)) lengthOut = NaN;
                else if (
                  typeof el === "boolean" ||
                  (typeof el === "number" && Number.isInteger(el))
                )
                  lengthOut = Number(el);
                else
                  lengthOut = Math.ceil(
                    typeof el === "number"
                      ? el
                      : typeof el === "string" && el.trim() !== ""
                        ? Number(el)
                        : NaN,
                  );
              }
              // from／to の検証（seq.R の順序：両端点の長さ検査→有限性検査。
              // 文字列は as.numeric で変換され、変換できないものは有限でない
              // ものとして扱われる）。
              const endpointEl = (key, idx, label) => {
                const raw = argVal(key, idx);
                if (rLength(raw) !== 1)
                  api.fail(
                    `seqの ${label} は長さ1で指定してください（'${label}' must be of length 1）`,
                    node,
                  );
                return vec(raw)[0];
              };
              const finiteVal = (el, label) => {
                const num = isNA(el)
                  ? NaN
                  : typeof el === "number"
                    ? el
                    : typeof el === "boolean"
                      ? el
                        ? 1
                        : 0
                      : typeof el === "string" && el.trim() !== ""
                        ? Number(el)
                        : NaN;
                if (!Number.isFinite(num))
                  api.fail(
                    `seqの ${label} は有限の数で指定してください（'${label}' must be a finite number）`,
                    node,
                  );
                return num;
              };
              const fromEl = hasArg("from", 0)
                  ? endpointEl("from", 0, "from")
                  : undefined,
                toEl = hasTo ? endpointEl("to", 1, "to") : undefined;
              const from = fromEl === undefined ? 1 : finiteVal(fromEl, "from"),
                to = toEl === undefined ? 1 : finiteVal(toEl, "to");
              // by の値（長さ・型の検証は使う経路側で行う。seq.R では
              // by の長さ検査は length.out の無い経路の中にある）。
              let by;
              if (hasBy) {
                const raw = argVal("by", 2),
                  el = raw === null ? undefined : vec(raw)[0];
                if (typeof el === "string")
                  api.fail(
                    "seqの by は数値で指定してください（non-numeric argument to binary operator）",
                    node,
                  );
                by = isNA(el)
                  ? NaN
                  : typeof el === "boolean"
                    ? el
                      ? 1
                      : 0
                    : typeof el === "number"
                      ? el
                      : NaN;
                if (lengthOut === undefined && rLength(raw) !== 1)
                  api.fail(
                    "seqの by は長さ1で指定してください（'by' must be of length 1）",
                    node,
                  );
              }
              if (lengthOut !== undefined) {
                if (!Number.isFinite(lengthOut) || lengthOut < 0)
                  api.fail(
                    "seqの length.out は0以上の数で指定してください（'length.out' must be a non-negative number）",
                    node,
                  );
                if (lengthOut > 10000) api.fail("ベクトル長の上限です", node);
                if (lengthOut === 0) return [];
                if (hasBy) {
                  // seq.R：from／to／by／length.out の全指定は過剰指定。
                  if (hasArg("from", 0) && hasTo)
                    api.fail("seqの引数が多すぎます（too many arguments）", node);
                  if (hasTo && !hasArg("from", 0))
                    return Array.from(
                      { length: lengthOut },
                      (_, i) => to - (lengthOut - 1 - i) * by,
                    );
                  return Array.from(
                    { length: lengthOut },
                    (_, i) => from + i * by,
                  );
                }
                if (!hasTo)
                  return Array.from(
                    { length: lengthOut },
                    (_, i) => from + i,
                  );
                // seq.R：length.out 指定で from が省略され to が与えられた
                // 場合は、from を to - (length.out - 1) で逆算する
                // （seq(to = 5, length.out = 3) は c(3, 4, 5)）。
                if (!hasArg("from", 0)) {
                  const start = to - (lengthOut - 1);
                  return Array.from(
                    { length: lengthOut },
                    (_, i) => start + i,
                  );
                }
                if (lengthOut === 1) return [from];
                const byVal = (to - from) / (lengthOut - 1);
                return Array.from(
                  { length: lengthOut },
                  (_, i) => from + i * byVal,
                );
              }
              if (!hasBy) {
                const step = to >= from ? 1 : -1,
                  n = Math.floor((to - from) / step) + 1;
                if (n > 10000) api.fail("ベクトル長の上限です", node);
                return Array.from({ length: n }, (_, i) => from + i * step);
              }
              const del = to - from;
              // seq.R：del == 0 かつ to == 0 のときは by の検証より先に to。
              if (del === 0 && to === 0) return [to];
              const ratio = del / by;
              if (!Number.isFinite(ratio)) {
                if (by === 0 && del === 0) return [from];
                api.fail(
                  "seqの by が不正です（invalid '(to - from)/by'）",
                  node,
                );
              }
              if (ratio < 0)
                api.fail(
                  "seqの by の符号が from から to への向きと合っていません（wrong sign in 'by' argument）",
                  node,
                );
              const n = Math.floor(ratio + 1e-10) + 1;
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
                // R29-N17：x に名前属性が無ければ結果にも付けない
                baseNames ? outPairs.map((p) => p[1]) : null,
              );
            }
            case "read.csv": {
              if (!Object.hasOwn(s.model.files || {}, x))
                api.fail("モデルにファイルがありません：" + x, node);
              // R25-N24：ファイルの表現で経路を分ける。文字列（cat で
              // 書いたテキスト、モデル JSON で文字列として与えた
              // ファイル）は ?read.table の read.csv 既定値でパースし、
              // パース済みオブジェクト（種まき）は従来どおり返す。
              // 仮引数は read.csv(file, header=TRUE, sep=",", quote="\"",
              // dec=".", fill=TRUE, comment.char="", ...) の順。
              const optScalar = (key, posIdx, fallback) => {
                const v = named[key] ?? (posIdx === null ? undefined : pos[posIdx]);
                const s = v === undefined ? undefined : vec(v)[0];
                return s === undefined || isNA(s) ? fallback : s;
              };
              const csvOpts = {
                header: optScalar("header", 1, true) !== false,
                sep: optScalar("sep", 2, ","),
                quote: optScalar("quote", 3, '"'),
                dec: optScalar("dec", 4, "."),
                fill: optScalar("fill", 5, true) !== false,
                naStrings:
                  named["na.strings"] === undefined
                    ? ["NA"]
                    : vec(named["na.strings"]).map(String),
                checkNames: optScalar("check.names", null, true) !== false,
                colNames:
                  named["col.names"] === undefined
                    ? undefined
                    : vec(named["col.names"]),
                rowNames: named["row.names"],
                skip: named.skip,
                nrows: named.nrows,
              };
              const stored = s.model.files[x];
              if (typeof stored === "string") {
                try {
                  return parseCsvText(stored, csvOpts);
                } catch (e) {
                  api.fail(e.message, node);
                }
              }
              if (stored?.kind === "data.frame" && csvOpts.header === false) {
                // 種まきファイルの header=FALSE は、見出し行をデータの
                // 1行目としてテキストとして読み直した結果にする。
                try {
                  return parseCsvText(dfToCsvText(stored), csvOpts);
                } catch (e) {
                  api.fail(e.message, node);
                }
              }
              const cloned = structuredClone(stored);
              if (cloned?.kind === "data.frame") {
                if (Array.isArray(csvOpts.colNames) && csvOpts.colNames.length) {
                  const keys = Object.keys(cloned.columns);
                  cloned.columns = Object.fromEntries(
                    keys.map((k, i) => [String(csvOpts.colNames[i] ?? k), cloned.columns[k]]),
                  );
                }
                if (csvOpts.rowNames !== undefined && csvOpts.rowNames !== null) {
                  const rn = csvOpts.rowNames,
                    keys = Object.keys(cloned.columns),
                    key =
                      typeof rn === "number"
                        ? keys[rn - 1]
                        : typeof rn === "string" && keys.includes(rn)
                          ? rn
                          : undefined;
                  if (Array.isArray(rn))
                    cloned.rowNames = rn.map(String);
                  else if (key !== undefined) {
                    cloned.rowNames = cloned.columns[key].map((v) =>
                      isNA(v) ? "NA" : String(v),
                    );
                    delete cloned.columns[key];
                  }
                }
              }
              return cloned;
            }
            default:
              api.fail("このR関数は説明に対応していません：" + name, node);
          }
        },
        // RG-04: assignment / bare-expression narration must use the same
        // R notation as print output and the final state (show), not the
        // shared JavaScript formatting. Compound assignments (+= etc.),
        // which are not R syntax, keep the shared narration.
        step(n, s, api) {
          if (n.k === "each") {
            // R26-N6 兄弟表面：for の反復変数も束縛であるため、予約定数を
            // 反復変数にすることは代入と同じく名指しで停止する
            // （従来は NA／TRUE 等が黙って再束縛されていた）。
            if (RESERVED_CONSTANTS.includes(n.name))
              api.fail(
                `代入先が不正です：${n.name} には代入できません`,
                n,
                "SyntaxError",
              );
            // R24-N27：R の for は対象をベクトルとして評価する（?Control／
            // R Language Definition）。NULL・長さ0では0回実行して継続し、
            // スカラーは長さ1ベクトルとして1回実行する。共有基盤の loop()
            // は配列以外を一律「未確定または配列でない」という事実と異なる
            // 理由で止めるため、R の意味論はこちらで実施する（反復の手順
            // 表記と上限は基盤の loop() に倣う）。データフレームは実 R
            // どおり列ごとに繰り返す。
            let coll = api.read(n.collection, s);
            if (isUnknown(coll))
              unsupported(
                "未確定の繰り返し対象（実行時に決まる値のため反復回数を確定できません）",
                n.line,
              );
            let values;
            if (coll === null) values = [];
            else if (coll?.kind === "data.frame")
              values = Object.values(coll.columns);
            else if (Array.isArray(coll)) values = coll;
            else if (isNA(coll) || typeof coll !== "object") values = [coll];
            else unsupported("リスト形式の繰り返し対象", n.line);
            let active = [s],
              done = [];
            for (let i = 0; active.length; i++) {
              let next = [];
              for (let st of active) {
                if (st.halt || st.signal) {
                  done.push(st);
                  continue;
                }
                if (i >= values.length) {
                  api.note(st, n, `${i}回実行してループを終了します`);
                  done.push(st);
                  continue;
                }
                if (i >= LIMITS.iterations) {
                  api.note(st, n, "ループ上限で説明を停止しました", "limit");
                  st.halt = true;
                  done.push(st);
                  continue;
                }
                st.vars[n.name] = structuredClone(values[i]);
                api.note(st, n, `繰り返し ${i + 1}回目`);
                st.loopDepth = (st.loopDepth || 0) + 1;
                (st.loopIterations ??= []).push(i + 1);
                for (let out of api.run(n.body, [st])) {
                  out.loopDepth--;
                  out.loopIterations.pop();
                  if (out.signal === "break") {
                    out.signal = null;
                    done.push(out);
                  } else if (out.halt || out.signal === "return")
                    done.push(out);
                  else {
                    out.signal = null;
                    next.push(out);
                  }
                }
              }
              active = next;
            }
            return [...done, ...active];
          }
          // R26-N6：予約定数への代入は、複合代入（+= 等、共有基盤側で
          // 処理される形）も含めてここで先に名指す。基盤側の R 分の
          // 列挙は TRUE／FALSE／NULL のみで、NA 系・Inf・NaN が届かない
          // ためである。->（右辺代入）と <<- はパーサ段階で「未対応」と
          // 名指し停止する形であり、黙った再束縛にはならない。
          if (
            n.k === "assign" &&
            n.target?.k === "var" &&
            RESERVED_CONSTANTS.includes(n.target.name)
          )
            api.fail(
              `代入先が不正です：${n.target.name} には代入できません`,
              n,
              "SyntaxError",
            );
          if (n.k === "assign" && !["+=", "-=", "*=", "/="].includes(n.op)) {
            // R25-N8（R 分）：この step は共有基盤の assign を迂回するため、
            // 基盤側の代入ターゲット検証（R24-N12）が届かず、右辺を先に
            // 読んで未定義名を誤って指していた（1 <- x 等）。また予約
            // リテラル（TRUE／FALSE／NULL）は var ノードとして運ばれ、
            // NULL <- 5 が黙って受理されていた。右辺の評価より前に、
            // 基盤と同じ形の検証をここで行う（T／F は R では再代入可能な
            // 変数なので対象に含めない）。
            // R26-N6 で対象を ?Reserved の定数全て（RESERVED_CONSTANTS）
            // へ拡張した。上の複合代入を含む検証と重なるが、文言・分類は
            // 同一である。
            // R28-N18：関数呼び出し形の代入先は、R では置換関数（replacement
            // function）の代入形であり一律に不正ではない。?names の Usage に
            // names(x) <- value が明記された names だけを実装し、それ以外の
            // 置換関数（colnames／rownames／length 等、読み取り自体が未対応の
            // ものを含む）は関数名を挙げて未対応と名指す。従来は全て
            // 「関数呼び出しの結果には代入できません」という虚偽原因で
            // 停止していた。names(x)[i] <- 値 の部分更新（?names の examples
            // が示す一般規則）も同じ経路で処理する。
            if (
              n.target?.k === "call" ||
              (n.target?.k === "index" && n.target.target?.k === "call")
            ) {
              const callNode = n.target.k === "call" ? n.target : n.target.target,
                fname =
                  callNode.target?.k === "var" ? callNode.target.name : null;
              if (fname !== "names")
                api.fail(
                  `代入先が不正です：${fname ? fname + "()" : "関数呼び出し"}への代入（置換関数 ${fname ? fname + "<-" : "…<-"}）は説明に対応していません`,
                  n,
                  "SyntaxError",
                );
              if ((callNode.args || []).length !== 1)
                api.fail("names への代入は names(対象) の形で指定してください", n, "SyntaxError");
              const inner = callNode.args[0];
              if (!["var", "member"].includes(inner?.k))
                api.fail(
                  "代入先が不正です：names() の引数は変数（またはデータフレームの列）で指定してください",
                  n,
                  "SyntaxError",
                );
              // 予約定数への再束縛は不可（NULL は値そのものが対象で、
              // names(NULL) <- NULL の無操作と長さエラーを下で裁定する）。
              if (
                inner.k === "var" &&
                inner.name !== "NULL" &&
                RESERVED_CONSTANTS.includes(inner.name)
              )
                api.fail(
                  `代入先が不正です：${inner.name} には代入できません`,
                  n,
                  "SyntaxError",
                );
              // 代入先の検証・読み取りは右辺より先（未定義名を先に名指す）。
              const obj = api.read(inner, s);
              if (isUnknown(obj))
                api.fail("未確定の値には名前を設定できません", n);
              const v = api.read(n.value, s);
              if (isUnknown(v))
                api.fail("未確定の名前は設定できません", n);
              // 部分更新 names(x)[i] <- 値 は、現在の名前へ添字代入した
              // 結果を names(x) <- 結果 として適用する（実 R の一般規則）。
              let effective = v;
              if (n.target.k === "index") {
                if (n.target.indexes.length !== 1 || n.target.indexes[0] === null)
                  api.fail("names() への部分代入は添字1つで指定してください", n, "SyntaxError");
                const idx = vec(api.read(n.target.indexes[0], s))[0];
                if (!Number.isInteger(idx) || idx < 1)
                  api.fail("subscript out of bounds", n);
                const cur =
                  obj?.kind === "data.frame"
                    ? Object.keys(obj.columns)
                    : (namesOf(obj) ?? Array.from(
                        { length: Array.isArray(obj) ? obj.length : obj === null ? 0 : 1 },
                        () => null,
                      ));
                const cand = [...cur];
                while (cand.length < idx) cand.push(null);
                const el0 = v === null ? null : vec(v)[0];
                cand[idx - 1] =
                  el0 === null || el0 === undefined || isNA(el0)
                    ? null
                    : typeof el0 === "boolean"
                      ? el0
                        ? "TRUE"
                        : "FALSE"
                      : String(el0);
                effective = cand;
              }
              const label = exprLabel(callNode) || "names(...)";
              if (obj?.kind === "data.frame") {
                if (effective === null)
                  api.fail(
                    "names() への代入でデータフレームの列名を全て外す形は説明に対応していません（このモデルでは列名が列の正本のため）",
                    n,
                    "SyntaxError",
                  );
                if (!Array.isArray(effective) && typeof effective === "object")
                  api.fail("names への代入の値が不正です", n);
                const vals = vec(effective),
                  ncol = Object.keys(obj.columns).length;
                if (vals.length > ncol)
                  api.fail(
                    `'names' attribute [${vals.length}] must be the same length as the vector [${ncol}]`,
                    n,
                  );
                // 公式ソース attrib.c の namesgets：value は as.character
                // で強制し、短い場合は NA で埋める。データフレームの NA の
                // 列名は本モデル（列名がキー）では表現できないため、R でも
                // 名前なしの同義プレースホルダとされる "" で表す。
                const newNames = Array.from({ length: ncol }, (_, i) => {
                  const el = vals[i];
                  if (el === undefined || el === null || isNA(el)) return "";
                  return typeof el === "string" ? el : String(el);
                });
                if (new Set(newNames).size !== newNames.length)
                  api.fail(
                    "重複した列名はこのモデルでは表現できません（実 R では重複した列名も許されますが、列名をキーとする表現のため名指しで停止します）",
                    n,
                  );
                const oldCols = obj.columns;
                obj.columns = Object.fromEntries(
                  Object.keys(oldCols).map((k, i) => [newNames[i], oldCols[k]]),
                );
                api.note(s, n, `${label} に ${show(v)} を代入します`);
                return [s];
              }
              if (obj === null) {
                // 実 R の特例：存在しない名前の除去（names(NULL) <- NULL）
                // だけは無操作で受理し、それ以外は長さ0との不一致で停止。
                if (effective === null) {
                  api.note(s, n, `${label} に ${show(v)} を代入します`);
                  return [s];
                }
                api.fail(
                  `'names' attribute [${vec(effective).length}] must be the same length as the vector [0]`,
                  n,
                );
              }
              // ベクトル（配列・スカラー・NA）。長さは要素数（スカラーは1）。
              const isArr = Array.isArray(obj),
                len = isArr ? obj.length : 1;
              if (effective === null) {
                if (isArr) delete obj.names;
                api.note(s, n, `${label} に ${show(v)} を代入します`);
                return [s];
              }
              const vals = vec(effective);
              if (vals.length > len)
                api.fail(
                  `'names' attribute [${vals.length}] must be the same length as the vector [${len}]`,
                  n,
                );
              // namesgets どおり as.character で強制し、短い value は
              // NA（本モデルの名前なし表現 null）で埋める。
              const newNames = Array.from({ length: len }, (_, i) => {
                const el = vals[i];
                if (el === undefined || el === null || isNA(el)) return null;
                return typeof el === "string"
                  ? el
                  : typeof el === "boolean"
                    ? el
                      ? "TRUE"
                      : "FALSE"
                    : String(el);
              });
              if (isArr) {
                // R29-N17：namesgets（attrib.c）は value をそのまま属性に
                // 付ける。全て "" や NA でも名前属性は残る（NULL になるのは
                // value が NULL のときだけ＝上の effective === null 分岐）。
                // 「実質的な名前が1つでもあるときだけ属性を持つ」という
                // センチネル規約は実 R に無い。
                obj.names = newNames;
                // member（df$列）の場合は列の配列そのものへ付けた名前が
                // データフレーム側からも見える（参照を共有するため）。
                api.note(s, n, `${label} に ${show(v)} を代入します`);
                return [s];
              }
              // スカラー・NA は長さ1ベクトルとして包んで名前を持たせる。
              // NA のセンチネル自体は共有物なので絶対に変更しない。
              const wrapped = [obj];
              wrapped.names = newNames; // R29-N17：スカラー側も同規則（上記参照）
              if (inner.k === "var") s.vars[inner.name] = wrapped;
              else api.write(inner, wrapped, s, n);
              api.note(s, n, `${label} に ${show(v)} を代入します`);
              return [s];
            }
            if (!["var", "index", "member"].includes(n.target?.k)) {
              const form =
                {
                  literal: "リテラル",
                  call: "関数呼び出しの結果",
                  binary: "演算の結果",
                  array: "配列リテラル",
                  record: "オブジェクトリテラル",
                  post: "++ / -- の結果",
                  unary: "単項演算の結果",
                  cond: "条件式の結果",
                  nullish: "条件式の結果",
                }[n.target?.k] || "この式";
              api.fail(
                `代入先が不正です：${form}には代入できません`,
                n,
                "SyntaxError",
              );
            }
            const v = api.read(n.value, s);
            api.write(n.target, v, s, n);
            // R27-N26：df$列 <- NULL の手順文は、効果（列の削除）に
            // 合わせる（「NULL を代入します」だけでは削除が見えない）。
            if (
              n.target?.k === "member" &&
              v === null &&
              api.read(n.target.target, s)?.kind === "data.frame"
            )
              api.note(
                s,
                n,
                `${targetName(n.target) || "対象"} に NULL を代入して列を削除します`,
              );
            else
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
    // R27-N10（R 分）：最終状態（paths[].vars）は JSON として直列化される
    // 表示面であり、非有限数（Inf／-Inf／NaN）が null に化けて、出力・
    // groups の "c(Inf)" 表示と矛盾していた（UI.Vision の RG-208 と同型）。
    // 実行完了後のスナップショットに限り、非有限数を R の出力表示と
    // 一致する文字列（"Inf"／"-Inf"／"NaN"）へ置き換える。実行中の
    // 数値としての働きと groups（実行中に確定済み）は変えない。
    for (let p of result.paths || [])
      if (p.vars) p.vars = rFiniteSafeSnapshot(p.vars);
    return result;
  },
};

// R27-N10：非有限数を R 表記の文字列へ置き換えた表示用スナップショット。
// ベクトル（配列）・データフレーム列などの入れ子も対象とする。未確定値と
// NA はそのまま保持し、循環は元の参照を保つ。
function rFiniteSafeSnapshot(v, seen = new Map()) {
  if (typeof v === "number")
    return Number.isFinite(v)
      ? v
      : v === Infinity
        ? "Inf"
        : v === -Infinity
          ? "-Inf"
          : "NaN";
  if (!v || typeof v !== "object") return v;
  if (isUnknown(v) || isNA(v)) return v;
  if (seen.has(v)) return seen.get(v);
  let out = Array.isArray(v) ? [] : {};
  seen.set(v, out);
  if (Array.isArray(v)) {
    for (let x of v) out.push(rFiniteSafeSnapshot(x, seen));
    // ベクトルの名前属性（.names）は要素ではないため、明示的に引き継ぐ。
    if (v.names) out.names = [...v.names];
  } else
    for (let [k, x] of Object.entries(v))
      out[k] = rFiniteSafeSnapshot(x, seen);
  return out;
}

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
