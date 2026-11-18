import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { referenceAdvanced } from "../js/types/r/reference-advanced-part2.js";
import { names } from "../js/types/r/names-advanced-part2.js";
import { definition } from "../js/types/r/index.js";

// ADV-B4 Rデータ班2（トピック M〜Z）テスト。
// 担当境界：棚卸し inventory-r.md のトピックのうち、トピック名の頭文字が
// M〜Z（大小文字不問）のもの全224件。記号・数字始まりのトピックは棚卸しに
// 存在しない（全436件が英字始まり）ため、境界の曖昧さは生じていない。
// 除外リストは「関数名ではない見出し」（ドキュメントトピック名・別名見出し・
// 環境変数名・クラス文書見出し・リテラル記法等）で、報告書に理由を明記した。
const EXCLUDED = new Set(["matmult\u0000matmult", "Memory\u0000Memory", "Memory-limits\u0000Memory-limits", "name\u0000name", "name\u0000symbol", "NumericConstants\u0000NumericConstants", "NumericConstants\u00000x1", "NumericConstants\u00001i", "NumericConstants\u00001L", "options\u0000MC_CORES", "options\u0000option", "options\u0000R_C_BOUNDS_CHECK", "options\u0000R_DEFAULT_DEVICE", "options\u0000R_INTERACTIVE_DEVICE", "options\u0000R_KEEP_PKG_SOURCE", "Paren\u0000Paren", "path.expand\u0000tilde expansion", "pipeOp\u0000pipeOp", "Primitive\u0000primitive", "Quotes\u0000backquote", "Quotes\u0000backtick", "Quotes\u0000Quotes", "Quotes\u0000r\"", "Quotes\u0000r'", "Quotes\u0000\"", "Quotes\u0000'", "Quotes\u0000`", "Random\u0000Random", "Random\u0000RNG", "Random-user\u0000Random.user", "RdUtils\u0000Rd2pdf", "RdUtils\u0000RD2PDF_INPUTENC", "RdUtils\u0000Rdconv", "reg.finalizer\u0000finalizer", "regex\u0000regex", "regex\u0000regexp", "regex\u0000regular expression", "Reserved\u0000Reserved", "Reserved\u0000reserved", "Rhome\u0000R_HOME", "sets\u0000intersection", "Signals\u0000Signals", "Special\u0000Special", "srcfile\u0000srcfile-class", "srcfile\u0000srcfilealias-class", "srcfile\u0000srcfilecopy-class", "srcfile\u0000srcref-class", "StackOverflows\u0000CStackOverflowError", "StackOverflows\u0000expressionStackOverflowError", "StackOverflows\u0000nodeStackOverflowError", "StackOverflows\u0000protectStackOverflowError", "StackOverflows\u0000stackOverflowError", "StackOverflows\u0000StackOverflows", "Startup\u0000Renviron", "Startup\u0000Rprofile", "Startup\u0000Rprofile.site", "Startup\u0000R_DEFAULT_PACKAGES", "Startup\u0000R_ENVIRON", "Startup\u0000R_ENVIRON_USER", "Startup\u0000R_PROFILE", "Startup\u0000R_PROFILE_USER", "Startup\u0000Startup", "Startup\u0000.First", "Startup\u0000.First.sys", "Startup\u0000.OptRequireMethods", "Startup\u0000.Renviron", "Startup\u0000.Rprofile", "Syntax\u0000Syntax", "Sys.localeconv\u0000localeconv", "tilde\u0000tilde", "timezones\u0000time zone", "timezones\u0000time zones", "timezones\u0000timezone", "timezones\u0000timezones", "timezones\u0000TZ", "timezones\u0000TZDIR", "Trig\u0000arccos", "Trig\u0000arcsin", "Trig\u0000arctan", "Trig\u0000Trig", "typeof\u0000type", "UseMethod\u0000S3Methods", "utf8Conversion\u0000code point", "utf8Conversion\u0000Unicode", "UTF8filepaths\u0000file path encoding", "UTF8filepaths\u0000UTF-8 file path", "vector\u0000atomic"]);
const TOPICS = new Set(["MathFun", "Memory", "Memory-limits", "NA", "NULL", "NumericConstants", "Ops.Date", "Paren", "Platform", "Primitive", "Quotes", "Random", "Random-user", "RdUtils", "Recall", "Reserved", "Rhome", "Round", "S3method", "Signals", "Special", "StackOverflows", "Startup", "Syntax", "Sys.getenv", "Sys.getpid", "Sys.glob", "Sys.info", "Sys.localeconv", "Sys.readlink", "Sys.setFileTime", "Sys.setenv", "Sys.sleep", "Sys.time", "Sys.which", "Tailcall", "Trig", "UTF8filepaths", "UseMethod", "Vectorize", "Version", "make.names", "make.unique", "mapply", "marginSums", "mat.or.vec", "match", "match.arg", "match.call", "match.fun", "matmult", "matrix", "maxCol", "mean", "memCompress", "memlimits", "memory.profile", "merge", "message", "missing", "mode", "mtfrm", "name", "names", "nargs", "nchar", "nlevels", "noquote", "norm", "normalizePath", "notyet", "nrow", "ns-dblcolon", "ns-hooks", "ns-load", "ns-topenv", "numeric", "numeric_version", "octmode", "on.exit", "options", "order", "outer", "parse", "paste", "path.expand", "pcre_config", "pipeOp", "plot", "pmatch", "polyroot", "pos.to.env", "pretty", "print", "print.dataframe", "print.default", "prmatrix", "proc.time", "prod", "proportions", "pushBack", "qr", "qraux", "quit", "range", "rank", "rapply", "raw", "rawConnection", "rawConversion", "readBin", "readChar", "readLines", "readRDS", "readRenviron", "readline", "reg.finalizer", "regex", "regmatches", "rep", "replace", "rev", "rle", "rm", "round.POSIXt", "row", "row.names", "rowsum", "sQuote", "sample", "save", "scale", "scan", "search", "seek", "seq", "seq.Date", "seq.POSIXt", "sequence", "serialize", "setTimeLimit", "sets", "shQuote", "showConnections", "sign", "sink", "slice.index", "slotOp", "socketSelect", "solve", "sort", "sort_by", "source", "split", "sprintf", "srcfile", "standardGeneric", "startsWith", "stop", "stopifnot", "strptime", "strrep", "strsplit", "strtoi", "strtrim", "structure", "strwrap", "subset", "substitute", "substr", "sum", "summary", "svd", "sweep", "switch", "sys.parent", "sys.source", "system", "system.file", "system.time", "system2", "t", "table", "tabulate", "tapply", "taskCallback", "taskCallbackManager", "taskCallbackNames", "tempfile", "textconnections", "tilde", "timezones", "toString", "trace", "traceback", "tracemem", "transform", "trimws", "try", "typeof", "unique", "units", "unlink", "unlist", "unname", "use", "userhooks", "utf8Conversion", "validUTF8", "vector", "warning", "warnings", "weekday.POSIXt", "which", "which.min", "with", "withVisible", "write", "writeLines", "xtfrm", "zMachine", "zapsmall", "zpackages", "zutils"]);
const CATEGORIES = new Set([
  "ベクトル", "集計", "データフレーム", "欠損値", "型変換", "型判定", "入出力",
  "制御", "乱数", "演算子", "添字", "定数",
  "文字列", "行列・配列", "数学", "適用関数", "リスト", "日付と時刻", "環境",
  "言語オブジェクト", "システム", "ファイル", "パッケージ", "エラー処理", "その他",
]);
const baseNames = new Set(definition.reference.map((r) => r.name));
const unesc = (s) => s.replace(/\\\|/g, "|").replace(/\\`/g, "`");

test("adv-b4 r-data2: 件数（名前422・項目467・status内訳）", () => {
  // 名前は統合時に「実在する関数名」だけへキュレーションし 478→420 件に
  // なった（定数・変数・運算子等を除外。advanced-interface.md 適合）。
  // 監査裁定（ADV-B4-audit-r）で更新：項目はハンドラのみ存在した
  // sort.int／seq.int／rep.int の3件を追加し 464→467 件。名前は
  // 実在しない anyMissing を除き、上記3件を加えて 420→422 件。
  // status は監査裁定の確定内訳（対応111・未対応356・未検証0）。
  assert.equal(names.length, 422);
  assert.equal(new Set(names).size, 422, "名前一覧に重複なし");
  assert.equal(referenceAdvanced.length, 467);
  const count = (s) => referenceAdvanced.filter((r) => r.status === s).length;
  assert.equal(count("supported"), 111);
  assert.equal(count("unsupported"), 356);
  assert.equal(count("unverified"), 0);
});

test("adv-b4 r-data2: スキーマ検証（契約の正規形・status・理由の畳み込み）", () => {
  // 項目形式はモード機構の確定契約（advanced-interface.md 第4章）に合わせ、
  // supported／reason／topic フィールドは廃止した（topic の対応は棚卸しと
  // 報告書に残る）。未対応／未検証の理由は description へ畳み込んである。
  const ALLOWED = new Set(["name", "category", "syntax", "description", "example", "caution", "status", "returns", "source"]);
  const seen = new Set();
  for (const r of referenceAdvanced) {
    for (const f of ["name", "category", "syntax", "description", "example", "caution"])
      assert.equal(typeof r[f], "string", `${r.name}.${f} は文字列`);
    for (const k of Object.keys(r)) assert.ok(ALLOWED.has(k), `${r.name}: 契約外フィールド ${k}`);
    assert.ok(r.name.length > 0 && r.syntax.length > 0 && r.description.length > 0 && r.example.length > 0, r.name);
    assert.ok(CATEGORIES.has(r.category), `${r.name}.category=${r.category}`);
    assert.ok(["supported", "unsupported", "unverified"].includes(r.status), `${r.name}.status`);
    if (r.status === "unsupported") assert.ok(r.description.includes("【未対応の理由】"), `${r.name}: 理由が description に無い`);
    if (r.status === "unverified") assert.ok(r.description.includes("【未検証の理由】"), `${r.name}: 理由が description に無い`);
    assert.ok(!seen.has(r.name), `${r.name} の項目が重複`);
    seen.add(r.name);
    assert.ok(!baseNames.has(r.name), `${r.name} は基礎リファレンスと重複させない`);
  }
});

// 項目名のうち、関数名の形状をしながら関数ではないため names へ入れない
// もの（定数・変数・文書トピック名・クラス名等）の固定リスト。
// anyMissing は監査裁定（ADV-B4-audit-r）で追加：base R（4.3.3／R-devel）に
// 実在しない関数名のため、項目は未対応として残し names には入れない。
const NONFUNCTION2 = new Set(["NA_character_", "NA_complex_", "NA_integer_", "NA_real_", "NotYetImplemented", "NotYetUsed", ".Last.lib", ".onAttach", ".onDetach", ".onLoad", ".onUnload", "octmode", ".Options", ".Platform", ".Last", ".Last.sys", ".Random.seed", ".rangeNum", "shell", "Exec", "Tailcall", ".sys.timezone", ".Traceback", ".unlist", "use", ".Class", ".Generic", ".Method", ".userHooksEnv", "R.version.string", "version", "last.warning", ".Machine", "anyMissing"]);
const functionShaped = (n) => /^[A-Za-z.][A-Za-z0-9._]*$/.test(n) && !n.startsWith("..") && n !== "...";

test("adv-b4 r-data2: names は関数名だけ。項目名は names ∪ 非関数固定リストで覆われる", () => {
  const ns = new Set(names);
  for (const n of names) {
    assert.ok(functionShaped(n), `names の形状が関数名でない: ${n}`);
    assert.ok(!NONFUNCTION2.has(n), `names に非関数が混入: ${n}`);
  }
  for (const r of referenceAdvanced) {
    if (!functionShaped(r.name) || NONFUNCTION2.has(r.name)) continue;
    assert.ok(ns.has(r.name), `${r.name} が names に無い`);
  }
});

test("adv-b4 r-data2: 棚卸し実物からの機械抽出と網羅照合（漏れ・重複なし）", (t) => {
  const here = dirname(fileURLToPath(import.meta.url));
  const invPath = join(here, "..", "..", "..", "advanced-inventory", "inventory-r.md");
  // 棚卸しはリポジトリ外（監査ワークスペース）にのみ存在する。解決できない
  // 環境では理由明示でスキップする（従来は無言で return していたため、
  // 未実施が合格に見えていた。修正バッチ21／RG-684）。
  if (!existsSync(invPath)) return t.skip("棚卸しファイル（advanced-inventory/inventory-r.md）が配置されていない環境のため実物照合をスキップ");
  const text = readFileSync(invPath, "utf8");
  const headings = []; // [topic, name]
  for (const line of text.split("\n")) {
    const m = line.match(/^\| ([^|]+) \| https:\/\/\S+ \| [^|]+ \| [^|]+ \| (.*) \|$/);
    if (!m) continue;
    const topic = m[1].trim();
    if (!/^[A-Za-z]/.test(topic) || topic[0].toUpperCase() < "M") continue;
    const tm = m[2].match(/対象: (.*?)(?: ／|$)/);
    if (!tm) continue;
    for (const raw of tm[1].split(",")) headings.push([topic, unesc(raw.trim())]);
  }
  assert.equal(headings.length, 567, "担当トピックの見出し総数");
  const nameSet = new Set(names);
  // 定数 NA／NULL は基礎リファレンスに定数として存在し、FUNCTION_NAMES へ
  // 入れると定数評価が壊れるため names から除く（網羅は基礎側で担保）。
  const OMIT = new Set(["NA", "NULL"]);
  let omittedCount = 0;
  const itemNames = new Map();
  for (const r of referenceAdvanced) itemNames.set(r.name, (itemNames.get(r.name) || 0) + 1);
  let excludedCount = 0;
  for (const [topic, name] of headings) {
    if (EXCLUDED.has(topic + "\u0000" + name)) { excludedCount++; continue; }
    if (OMIT.has(name)) { omittedCount++; continue; }
    // 網羅は「names ∪ 高度項目 ∪ 基礎」で担保する。names は関数名だけに
    // キュレーションしたため、運算子・定数等の見出しは項目側で覆う。
    assert.ok(nameSet.has(name) || itemNames.has(name) || baseNames.has(name), `${topic}:${name} がカタログのどこにも無い`);
    if (baseNames.has(name))
      assert.ok(!itemNames.has(name), `${name} は基礎にあるため項目を作らない`);
    else
      assert.equal(itemNames.get(name), 1, `${topic}:${name} の項目はちょうど1件`);
  }
  assert.equal(excludedCount, EXCLUDED.size, "除外リストの全件が棚卸しに実在する");
  assert.equal(omittedCount, 2, "定数 NA／NULL の2件だけを names から除く");
  // キュレーションで names から外した見出しは58件（運算子・定数・変数等）。
  // 監査裁定（ADV-B4-audit-r）で names が net +2 件（anyMissing 除外 −1、
  // sort.int／seq.int／rep.int 追加 +3）になったため、外した見出しは56件。
  assert.equal(headings.length - excludedCount - omittedCount - nameSet.size, 56, "キュレーションで names から外した見出しは56件");
});
