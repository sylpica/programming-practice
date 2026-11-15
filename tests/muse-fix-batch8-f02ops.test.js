// 修正バッチ8・F-02 再発防止（R29-N3 の構造的根治）。
// 背景: バッチ7で PowerShell 三項演算子が実装されたのにリファレンス
// 項目が無く、関数名ベースの機械照合（F-02 方向2）では検出できなかった。
// 本テストは、パーサ／エンジンが実装している演算子・文法要素を
// parser.js の演算子表等から機械的に列挙し、各要素がリファレンス項目の
// 検索対象文（name／category／description／syntax の小文字連結。アプリの
// 検索述語そのもの）に到達するか、明示した除外リスト（未実装で名指し
// 停止する要素）に載っているかを機械検証する。以後、実装済みなのに
// 項目が無い要素が増えると本テストが失敗する。
// 対象は PowerShell（最低限の成立範囲）。他種への一般化は、種類ごとに
// 演算子表の抽出器と別名表を用意すれば同じ枠組みで可能。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { definition } from "../js/types/powershell/index.js";

const parserSource = fs.readFileSync(
  new URL("../js/types/powershell/parser.js", import.meta.url),
  "utf8",
);
const engineSource = fs.readFileSync(
  new URL("../js/types/powershell/engine.js", import.meta.url),
  "utf8",
);

// --- 機械抽出: 優先順位表 prec のキー ---
function extractPrecKeys(src) {
  const m = src.match(/const prec = \{([\s\S]*?)\};/);
  assert.ok(m, "prec 表が見つからない");
  return [...m[1].matchAll(/"([^"]+)"\s*:/g)].map((x) => x[1]);
}
// --- 機械抽出: 比較・包含演算子の生成ループ（base × -, -c, -i） ---
function extractComparisonOps(src) {
  const m = src.match(/for \(const base of \[([\s\S]*?)\]\)/);
  assert.ok(m, "比較演算子の生成リストが見つからない");
  const bases = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  return bases.flatMap((b) => ["-", "-c", "-i"].map((p) => p + b));
}
// --- 機械抽出: 代入演算子表（statement の受理表） ---
function extractAssignOps(src) {
  const m = src.match(/\["=", "\+=", "-=", "\*=", "\/="(?:, "%=")?\]/);
  assert.ok(m, "代入演算子表が見つからない");
  return [...m[0].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}
// --- 機械抽出: 文法要素（式の分岐として実装されているもの） ---
function extractGrammarElements(src) {
  const els = [];
  if (/k: "ternary"/.test(src)) els.push("?:");
  if (/"\$\("/.test(src)) els.push("$()");
  if (/"@\("/.test(src)) els.push("@()");
  if (/"@\{"/.test(src)) els.push("@{}");
  if (/k: "subexpression"/.test(src)) els.push("()");
  if (/k: "assign-expr"/.test(src)) els.push("代入式");
  if (/"-not"/.test(src)) els.push("-not");
  if (/k: "post"/.test(src) && /k: "pre"/.test(src)) els.push("++");
  return els;
}

const implemented = [
  ...new Set([
    ...extractPrecKeys(parserSource),
    ...extractComparisonOps(parserSource),
    ...extractAssignOps(parserSource),
    ...extractGrammarElements(parserSource),
    // 字句表に現れる基本要素（パイプライン・範囲は prec／字句から）
    "|",
  ]),
];

// 要素 → リファレンス検索で到達するための別名（いずれかが、ある項目の
// name+category+description+syntax に含まれればカバーとみなす）。
const ALIASES = {
  "+": ["算術"],
  "-": ["算術"],
  "*": ["算術"],
  "/": ["算術"],
  "%": ["算術", "剰余"],
  "..": ["1..3", "範囲"],
  "=": ["代入"],
  "+=": ["+="],
  "-=": ["-="],
  "*=": ["*="],
  "/=": ["/="],
  "%=": ["%="],
  "++": ["++", "インクリメント"],
  "-and": ["-and"],
  "-or": ["-or"],
  "-not": ["-not"],
  "|": ["パイプライン", "|"],
  "?:": ["三項", "条件演算子", "? :"],
  "$()": ["$(式)", "部分式"],
  "@()": ["@("],
  "@{}": ["@{", "ハッシュ"],
  "()": ["$(式)", "部分式", "括弧"],
  "代入式": ["代入"],
};
// 比較・包含演算子は項目の syntax 列挙で到達する（綴りそのもの）。
for (const op of extractComparisonOps(parserSource))
  ALIASES[op] = [op.toLowerCase()];

// 除外リスト: 実装はしているが項目化の対象外とするもの（理由つき）。
// - -f: 未対応として名指し停止する書式演算子であり、項目化しない
//   （F-02 の「宣言された範囲外」。停止文言は engine 側で名指す）。
const EXCLUSIONS = new Map([
  ["-f", "未実装（未対応：書式演算子 -f と名指し停止）"],
]);

const searchable = definition.reference.map((r) =>
  (r.name + " " + r.category + " " + r.description + " " + r.syntax).toLowerCase(),
);
const coveredBy = (el) => {
  const aliases = ALIASES[el];
  assert.ok(aliases, `別名表に無い実装要素: ${el}（別名か除外へ追加すること）`);
  return aliases.some((a) =>
    searchable.some((text) => text.includes(a.toLowerCase())),
  );
};

test("batch8-f02ops every implemented PowerShell operator/grammar element is covered by a reference item or explicitly excluded", () => {
  assert.ok(implemented.length >= 40, "抽出件数が想定より少ない: " + implemented.length);
  const missing = implemented.filter(
    (el) => !EXCLUSIONS.has(el) && !coveredBy(el),
  );
  assert.deepEqual(
    missing,
    [],
    "実装済みなのにリファレンス項目で到達できない要素: " + missing.join(", "),
  );
  // 除外は実装集合の中にだけ置く（幽霊除外の防止）
  for (const el of EXCLUSIONS.keys())
    assert.ok(implemented.includes(el), "除外要素が実装集合に無い: " + el);
});

test("batch8-f02ops ternary operator has its own reachable reference item (R29-N3)", () => {
  const item = definition.reference.find((r) => r.name === "三項演算子");
  assert.ok(item, "三項演算子の項目が存在しない");
  assert.equal(item.supported, true);
  // アプリの検索述語（クエリの全トークンが項目文に含まれる）で到達できる
  const text = (
    item.name + " " + item.category + " " + item.description + " " + item.syntax
  ).toLowerCase();
  for (const q of ["三項", "条件演算子", "?:"])
    assert.ok(
      q.toLowerCase().split(/\s+/).every((t) => text.includes(t)),
      "検索クエリで到達できない: " + q,
    );
  // 使用例が完走する（ゴーストでないこと）
  const r = definition.simulate(item.example, structuredClone(definition.model.defaults));
  const errs = [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
  assert.deepEqual(errs, [], JSON.stringify(errs));
});

test("batch8-f02ops engine still names unimplemented operators instead of covering them silently", () => {
  // 除外リストの -f は、名指し停止のままであることを固定する
  assert.match(engineSource, /未対応：書式演算子 -f/);
});
