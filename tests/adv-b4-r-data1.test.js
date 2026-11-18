import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { referenceAdvanced } from "../js/types/r/reference-advanced-part1.js";
import { names } from "../js/types/r/names-advanced-part1.js";
import { definition } from "../js/types/r/index.js";

// 高度モード B4・Rデータ班1（トピック A〜L）。
// 一次情報：R 公式ヘルプ（R-devel, base）全212トピックを取得して照合。
// example は実 R 4.3.3（/usr/bin/Rscript）の parse() で全件検証済み（報告書参照）。
//
// 統合時の契約適合（コーディネーター）：
// - 項目形式はモード機構の確定契約（advanced-interface.md 第4章）に合わせ、
//   supported／reason／topic フィールドを廃止した。状態は status のみ、
//   未対応／未検証の理由は description へ畳み込んだ。topic の対応は
//   棚卸しファイルと報告書に残る（本テストでは項目名の実在で担保する）。
// - names は FUNCTION_NAMES へ統合されるため「実在する関数名」だけに
//   キュレーションした（定数・変数・運算子等を除外。値の読みを遮蔽する
//   実測バグの是正）。項目名のうち names に入らないものは、形状規則で
//   落ちるもの（運算子・ブラケットメソッド等）と下記 NONFUNCTION の
//   固定リストだけであることを本テストで固定する。

const baseNames = new Set(definition.reference.map((r) => r.name));

// 棚卸し備考欄の列挙のうち、関数名ではないため名前一覧へ入れなかったもの
// （概念・文書トークン、環境変数名、クラス名、グループ名）。topic:name 形式。
const EXCLUDED = new Set([
  "agrep:fuzzy matching",
  "Arithmetic:Arithmetic",
  "autoload:Autoloads",
  "base-package:base-package",
  "base-package:base",
  "Bessel:Bessel",
  "Bessel:bessel",
  "Colon:colon",
  "Comparison:collation",
  "Comparison:Comparison",
  "connections:connection",
  "connections:connections",
  "Control:Control",
  "Control:else",
  "Control:in",
  "Dates:Date",
  "Dates:Dates",
  "DateTimeClasses:date-time",
  "DateTimeClasses:POSIXct",
  "DateTimeClasses:POSIXlt",
  "DateTimeClasses:POSIXt",
  "delayedAssign:promise",
  "delayedAssign:promises",
  "difftime:time interval",
  "dots:dots",
  "environment:enclosure",
  "EnvVar:DISPLAY",
  "EnvVar:EDITOR",
  "EnvVar:environment variables",
  "EnvVar:GSC",
  "EnvVar:HOME",
  "EnvVar:LANGUAGE",
  "EnvVar:MAKEINDEX",
  "EnvVar:PAGER",
  "EnvVar:R_BATCH",
  "EnvVar:R_BROWSER",
  "EnvVar:R_COMPLETION",
  "EnvVar:R_DOC_DIR",
  "EnvVar:R_GSCMD",
  "EnvVar:R_HISTFILE",
  "EnvVar:R_HISTSIZE",
  "EnvVar:R_INCLUDE_DIR",
  "EnvVar:R_PAPERSIZE",
  "EnvVar:R_PCRE_JIT_STACK_MAXSIZE",
  "EnvVar:R_PDFVIEWER",
  "EnvVar:R_PLATFORM",
  "EnvVar:R_PRINTCMD",
  "EnvVar:R_RD4PDF",
  "EnvVar:R_SHARE_DIR",
  "EnvVar:R_SUPPORT_OLD_TARS",
  "EnvVar:R_TEXI2DVICMD",
  "EnvVar:R_TIDYCMD",
  "EnvVar:R_UNZIPCMD",
  "EnvVar:R_USER",
  "EnvVar:R_ZIPCMD",
  "EnvVar:TMPDIR",
  "Extract:Extract",
  "Extract:Subscript",
  "function:closure",
  "gctorture:R_GCTORTURE",
  "gctorture:R_GCTORTURE_INHIBIT_RELEASE",
  "gctorture:R_GCTORTURE_WAIT",
  "groupGeneric:Complex",
  "groupGeneric:group generic",
  "groupGeneric:groupGeneric",
  "groupGeneric:Math",
  "groupGeneric:matrixOps",
  "groupGeneric:Ops",
  "groupGeneric:S3groupGeneric",
  "groupGeneric:Summary",
  "groupGeneric:.Group",
  "icuSetCollate:R_ICU_LOCALE",
  "InternalMethods:internal generic",
  "InternalMethods:InternalGenerics",
  "InternalMethods:InternalMethods",
  "InternalMethods:.internalGenerics",
  "InternalMethods:.S3PrimitiveGenerics",
  "is.finite:finite",
  "is.finite:infinite",
  "is.language:language",
  "is.language:language object",
  "is.language:language objects",
  "libPaths:R_LIBS",
  "libPaths:R_LIBS_SITE",
  "libPaths:R_LIBS_USER",
  "locales:locales",
  "Logic:Logic",
  "LongVectors:long vector",
  "LongVectors:Long vectors",
  "LongVectors:long vectors"
]);

function inventoryNamesAL() {
  // 棚卸しファイルの相対位置はツリー構成で異なる（B4 作業ツリーでは
  // ../../../、統合正本ツリーでは ../../）。統合第2弾で両対応にした
  // （照合内容そのものは不変）。
  const candidates = [
    new URL("../../../advanced-inventory/inventory-r.md", import.meta.url),
    new URL("../../advanced-inventory/inventory-r.md", import.meta.url),
  ];
  const url = candidates.find((u) => fs.existsSync(u));
  // 棚卸しはリポジトリ外（監査ワークスペース）にのみ存在する。素の
  // チェックアウト（CI 等）では候補が全て不在になるため、その場合は
  // null を返し、呼び出し側のテストが理由明示でスキップする（データが
  // ある環境では従来どおり全件実行し、アサーションは不変。
  // 修正バッチ21／RG-684）。
  if (!url) return null;
  const raw = fs.readFileSync(url, "utf8");
  const out = new Map(); // topic -> names[]
  for (const line of raw.split("\n")) {
    if (!line.includes("stat.ethz.ch")) continue;
    const cells = line.replace(/\\\|/g, "\u0001").split("|").map((c) => c.trim().replace(/\u0001/g, "|"));
    const topic = cells[1];
    if (!topic || !/^[A-L]/i.test(topic)) continue;
    const m = cells[5]?.match(/対象:\s*(.+)/);
    if (!m) continue;
    const namesInTopic = m[1].split("／")[0].split(",").map((s) => s.trim()).filter(Boolean);
    out.set(topic, namesInTopic);
  }
  return out;
}

// 項目名のうち、関数名の形状をしながら関数ではないため names へ入れない
// もの（定数・変数・データセット・文書トピック名・クラス名）の固定リスト。
// 監査裁定（ADV-B4-audit-r）で NONFUNCTION を更新：
// - grepv を除外（R-devel の grep ヘルプで実在する関数と確認し、
//   names へ復帰させたため）
// - AsIs（クラス名）／Math.POSIXlt／summary.difftime（R 4.3.3 の base に
//   メソッド実体が無い）を追加し、names から除外した。
const NONFUNCTION = new Set(["assignOps", ".conflicts.OK", ".Autoloaded", ".AutoloadEnv", "bindenv", "condition", "conditions", "messageCondition", "clipboard", "zstdfile", "Constants", "LETTERS", "letters", "month.abb", "pi", "copyright", "copyrights", "DateTimeClasses", ".leap.seconds", "declare", "Defunct", "defunct", "Deprecated", "deprecated", ".Device", ".Devices", "R_MAX_NUM_DLLS", ".BaseNamespaceEnv", ".GlobalEnv", "files", "umask", "Foreign", "DLLInfo", "DLLInfoList", "NativeSymbol", "NativeSymbolInfo", "RegisteredNativeSymbol", "hexmode", "S4", ".Last.value", ".Library", ".Library.site", ".noGenerics", "LC_ALL", "LC_COLLATE", "LC_CTYPE", "LC_MEASUREMENT", "LC_MESSAGES", "LC_MONETARY", "LC_NUMERIC", "LC_PAPER", "LC_TIME", ".LC.categories", "AsIs", "Math.POSIXlt", "summary.difftime"]);
const functionShaped = (n) => /^[A-Za-z.][A-Za-z0-9._]*$/.test(n) && !n.startsWith("..") && n !== "...";

test("スキーマ：契約の正規形（status 必須・追加フィールドなし）と理由の畳み込み", () => {
  assert.ok(referenceAdvanced.length > 0);
  const ALLOWED = new Set(["name", "category", "syntax", "description", "example", "caution", "status", "returns", "source"]);
  for (const r of referenceAdvanced) {
    for (const k of ["name", "category", "syntax", "description", "example", "caution", "status"])
      assert.ok(k in r, `${r.name}: ${k} が無い`);
    for (const k of Object.keys(r)) assert.ok(ALLOWED.has(k), `${r.name}: 契約外フィールド ${k}`);
    assert.ok(["supported", "unsupported", "unverified"].includes(r.status), r.name);
    if (r.status === "unsupported") assert.ok(r.description.includes("【未対応の理由】"), `${r.name}: 理由が description に無い`);
    if (r.status === "unverified") assert.ok(r.description.includes("【未検証の理由】"), `${r.name}: 理由が description に無い`);
    assert.ok(r.syntax.length > 0 && r.description.length > 0 && r.example.length > 0, r.name);
  }
});

test("項目名は重複せず、基礎リファレンスと重ならない", () => {
  const seen = new Set();
  for (const r of referenceAdvanced) {
    assert.ok(!seen.has(r.name), `重複: ${r.name}`);
    seen.add(r.name);
    assert.ok(!baseNames.has(r.name), `基礎と重複: ${r.name}`);
  }
});

test("names は関数名だけ（重複なし）。項目名は names ∪ 非関数固定リストで覆われる", () => {
  assert.equal(new Set(names).size, names.length);
  const ns = new Set(names);
  for (const n of names) {
    assert.ok(functionShaped(n), `names の形状が関数名でない: ${n}`);
    assert.ok(!NONFUNCTION.has(n), `names に非関数が混入: ${n}`);
  }
  for (const r of referenceAdvanced) {
    if (!functionShaped(r.name) || NONFUNCTION.has(r.name)) continue;
    assert.ok(ns.has(r.name), `names に無い: ${r.name}`);
  }
});

test("網羅：棚卸し A〜L の関数名が 基礎 ∪ names ∪ 高度項目 に漏れなく現れる", (t) => {
  const inv = inventoryNamesAL();
  if (inv === null) return t.skip("棚卸しファイル（advanced-inventory/inventory-r.md）が配置されていない環境のため実物照合をスキップ");
  assert.ok(inv.size >= 200, `トピック数が想定より少ない: ${inv.size}`);
  const covered = new Set([...baseNames, ...names, ...referenceAdvanced.map((r) => r.name)]);
  const missing = [];
  for (const [topic, ns] of inv)
    for (const n of ns)
      if (!covered.has(n) && !EXCLUDED.has(`${topic}:${n}`)) missing.push(`${topic}:${n}`);
  assert.deepEqual(missing, []);
});

test("項目名の実在：全項目名が棚卸し A〜L トピックの対象名に現れる", (t) => {
  const inv = inventoryNamesAL();
  if (inv === null) return t.skip("棚卸しファイル（advanced-inventory/inventory-r.md）が配置されていない環境のため実物照合をスキップ");
  const all = new Set();
  for (const ns of inv.values()) for (const n of ns) all.add(n);
  for (const r of referenceAdvanced) assert.ok(all.has(r.name), `棚卸しに無い項目名: ${r.name}`);
});
